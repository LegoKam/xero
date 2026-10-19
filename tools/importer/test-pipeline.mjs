#!/usr/bin/env node
/* eslint-disable no-console, import/no-dynamic-require, no-await-in-loop */
/**
 * End-to-end importer harness over the cached AU snapshots.
 *
 * For every page of every template in tools/importer/page-templates.json it
 * mirrors the generated import script (import-small-businesses.js) inside a
 * jsdom window that has the real helix-importer bundle loaded:
 *   onLoad stash of __NEXT_DATA__ -> WebImporter.html2md (importer preprocess:
 *   script/hr/comment/span removal, empty inline elements dropped) -> transform:
 *   cleanup + sections beforeTransform -> parsers in the template's blocks[]
 *   order on matched elements -> cleanup + sections afterTransform -> markdown.
 * Each page runs in its own worker process (jsdom windows are not reclaimed
 * reliably), several in parallel.
 *
 * Reports per parser: invocations, errors, empty block tables (no content row),
 * and detached matches (element no longer in the document when its turn came).
 *
 * Usage (from project root):
 *   node tools/importer/test-pipeline.mjs                       # all templates
 *   node tools/importer/test-pipeline.mjs -t small-businesses   # one template (repeatable)
 *   node tools/importer/test-pipeline.mjs --exclude small-businesses
 *   node tools/importer/test-pipeline.mjs -p au/pricing-plans   # page path (repeatable, trailing * = prefix)
 *   node tools/importer/test-pipeline.mjs -b tabs-pricing --dump   # print that block's output html
 *   node tools/importer/test-pipeline.mjs -p au/advisors --md     # print markdown
 *   node tools/importer/test-pipeline.mjs --out /tmp/pipeline     # write <page>.md / .html files
 *   node tools/importer/test-pipeline.mjs --json result.json -j 8 # machine-readable, 8 workers
 * Exit code: 1 when a parser threw or a page failed to convert.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..', '..');
const IMPORTER = path.join(ROOT, 'tools/importer');
const SNAPSHOTS = process.env.BD_SNAPSHOT_DIR || path.join(IMPORTER, 'bd-snapshots');
const EXCAT = path.join(process.env.HOME || '/home/node', '.excat-marketplaces/excat-marketplace/excat');
const RESULT_MARK = '@@PIPELINE_RESULT@@';

/* ------------------------------------------------------------------ args */
const args = process.argv.slice(2);
const opt = {
  templates: [], exclude: [], pages: [], blocks: [], dump: false, md: false, out: null, json: null,
  quiet: false, jobs: Math.max(1, Math.min(8, os.cpus().length - 1)), worker: null,
};
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '-t' || a === '--template') opt.templates.push(args[i += 1]);
  else if (a === '--exclude') opt.exclude.push(args[i += 1]);
  else if (a === '-p' || a === '--page') opt.pages.push(args[i += 1]);
  else if (a === '-b' || a === '--block') opt.blocks.push(args[i += 1]);
  else if (a === '-j' || a === '--jobs') opt.jobs = Math.max(1, parseInt(args[i += 1], 10) || 1);
  else if (a === '--dump') opt.dump = true;
  else if (a === '--md') opt.md = true;
  else if (a === '-q' || a === '--quiet') opt.quiet = true;
  else if (a === '--out') opt.out = path.resolve(args[i += 1]);
  else if (a === '--json') opt.json = path.resolve(args[i += 1]);
  else if (a === '--worker') opt.worker = { template: args[i += 1], url: args[i += 1] };
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(SELF, 'utf8').split('*/')[0]);
    process.exit(0);
  }
}

const templates = JSON.parse(fs.readFileSync(path.join(IMPORTER, 'page-templates.json'), 'utf8')).templates;
const parserNames = [...new Set(templates.flatMap((t) => (t.blocks || []).map((b) => b.name)))];
const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
const relOf = (url) => new URL(url).pathname.replace(/^\/|\/$/g, '') || 'index';

function snapshotFor(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '') || '/index';
  return path.join(SNAPSHOTS, u.host, `${p}.html`);
}

/* ================================================================ worker */

function loadJsdom() {
  const candidates = [
    process.env.JSDOM_PATH,
    'jsdom',
    path.join(EXCAT, 'skills/excat-content-import/scripts/node_modules/jsdom'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* next */ }
  }
  throw new Error('jsdom not found; set JSDOM_PATH');
}

function importerBundle() {
  const candidates = [
    process.env.HELIX_IMPORTER_JS,
    path.join(EXCAT, 'hooks/import-validator/static/inject/helix-importer.js'),
    path.join(EXCAT, 'skills/excat-content-import/scripts/static/inject/helix-importer.js'),
  ].filter(Boolean);
  const hit = candidates.find((c) => fs.existsSync(c));
  if (!hit) throw new Error('helix-importer.js bundle not found; set HELIX_IMPORTER_JS');
  return fs.readFileSync(hit, 'utf8');
}

/** Block tables in the output: name from the header cell, content rows after it. */
function analyseBlocks(root) {
  return [...root.querySelectorAll('table')].filter((t) => !t.parentElement.closest('table')).map((t) => {
    const rows = [...t.querySelectorAll(':scope > tbody > tr, :scope > tr, :scope > thead > tr')];
    const name = clean(rows[0] ? rows[0].textContent : '').toLowerCase().replace(/\s+/g, '-');
    const body = rows.slice(1);
    const filled = body.filter((r) => clean(r.textContent) || r.querySelector('img, a[href], picture'));
    return {
      name, rows: body.length, filled: filled.length, el: t,
    };
  });
}

async function runWorker({ template: templateName, url }) {
  const template = templates.find((t) => t.name === templateName);
  const rel = relOf(url);
  const out = {
    url, rel, template: templateName, matches: {}, calls: {}, errors: [], detached: [], blocks: [],
    failures: [], dumps: [], consoleErrors: [], md: null, mdLength: 0,
  };
  const file = snapshotFor(url);
  if (!fs.existsSync(file)) {
    out.failures.push(`snapshot missing: ${file}`);
    return out;
  }

  const parsers = {};
  for (const b of template.blocks || []) {
    const pf = path.join(IMPORTER, 'parsers', `${b.name}.js`);
    if (!parsers[b.name] && fs.existsSync(pf)) parsers[b.name] = (await import(pathToFileURL(pf).href)).default;
  }
  const cleanup = (await import(pathToFileURL(path.join(IMPORTER, 'transformers/xero-cleanup.js')).href)).default;
  const sections = (await import(pathToFileURL(path.join(IMPORTER, 'transformers/xero-sections.js')).href)).default;

  const { JSDOM, VirtualConsole } = loadJsdom();
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const { window } = dom;
  window.eval(importerBundle());
  const { WebImporter } = window;
  globalThis.WebImporter = WebImporter;
  const { document } = window;

  // onLoad: stash __NEXT_DATA__ (scripts are stripped by the importer preprocess)
  const data = document.getElementById('__NEXT_DATA__');
  if (data && !document.getElementById('xero-next-data-stash')) {
    const stash = document.createElement('div');
    stash.id = 'xero-next-data-stash';
    stash.setAttribute('data-json', data.textContent);
    document.body.append(stash);
  }

  const transformer = {
    transform: ({ document: doc, params }) => {
      const main = doc.body;
      const payload = { document: doc, url, params, template };
      const run = (hook) => [cleanup, sections].forEach((fn) => {
        try { fn(hook, main, payload); } catch (e) { out.failures.push(`transformer ${hook}: ${e.stack}`); }
      });
      run('beforeTransform');

      const found = [];
      (template.blocks || []).forEach((b) => (b.instances || []).forEach((sel) => {
        doc.querySelectorAll(sel).forEach((el) => found.push({ name: b.name, sel, el }));
      }));
      found.forEach(({ name, sel, el }) => {
        out.matches[name] = (out.matches[name] || 0) + 1;
        if (!el.parentNode) return;
        if (!el.isConnected) { out.detached.push({ name, sel }); return; }
        const parser = parsers[name];
        if (!parser) return;
        out.calls[name] = (out.calls[name] || 0) + 1;
        try {
          parser(el, { document: doc, url, params });
        } catch (e) {
          out.errors.push({ name, message: e.message, stack: (e.stack || '').split('\n').slice(1, 3).join(' | ') });
        }
      });

      run('afterTransform');
      try {
        main.appendChild(doc.createElement('hr'));
        WebImporter.rules.createMetadata(main, doc);
        WebImporter.rules.transformBackgroundImages(main, doc);
        WebImporter.rules.adjustImageUrls(main, url, url);
      } catch (e) { /* best effort */ }

      analyseBlocks(main).forEach((b) => {
        out.blocks.push({ name: b.name, rows: b.rows, filled: b.filled });
        if (opt.dump && (!opt.blocks.length || opt.blocks.includes(b.name))) {
          out.dumps.push(`----- ${rel} :: ${b.name} (${b.filled}/${b.rows} rows)\n${b.el.outerHTML}`);
        }
      });
      return [{ element: main, path: `/${rel}` }];
    },
  };

  const origErr = console.error;
  const origWarn = console.warn;
  console.error = (...a) => out.consoleErrors.push(a.join(' '));
  console.warn = () => {};
  try {
    const res = await WebImporter.html2md(url, document, transformer, { toDocx: false, toMd: true }, { originalURL: url });
    const result = Array.isArray(res) ? res[0] : res;
    out.mdLength = result && result.md ? result.md.length : 0;
    if (!out.mdLength) out.failures.push('empty markdown');
    if (opt.md) out.md = result.md;
    if (opt.out) {
      const base = path.join(opt.out, rel);
      fs.mkdirSync(path.dirname(base), { recursive: true });
      fs.writeFileSync(`${base}.md`, (result && result.md) || '');
      fs.writeFileSync(`${base}.html`, (result && result.html) || '');
    }
  } catch (e) {
    out.failures.push(e.stack);
  } finally {
    console.error = origErr;
    console.warn = origWarn;
  }
  return out;
}

if (opt.worker) {
  const res = await runWorker(opt.worker);
  process.stdout.write(`\n${RESULT_MARK}${JSON.stringify(res)}\n`);
  process.exit(0);
}

/* ================================================================ driver */

const jobs = [];
templates.forEach((t) => {
  if (opt.templates.length && !opt.templates.includes(t.name)) return;
  if (opt.exclude.includes(t.name)) return;
  (t.urls || []).forEach((url) => {
    const rel = relOf(url);
    if (opt.pages.length && !opt.pages.some((p) => {
      const q = p.replace(/^\/|\/$/g, '');
      return q.endsWith('*') ? rel.startsWith(q.slice(0, -1)) : rel === q;
    })) return;
    jobs.push({ template: t.name, url });
  });
});

const passArgs = [];
if (opt.dump) passArgs.push('--dump');
if (opt.md) passArgs.push('--md');
opt.blocks.forEach((b) => passArgs.push('-b', b));
if (opt.out) passArgs.push('--out', opt.out);

function spawnWorker(job) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--no-warnings', '--max-old-space-size=4096', SELF, '--worker', job.template, job.url, ...passArgs], { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      const idx = stdout.lastIndexOf(RESULT_MARK);
      if (idx < 0) {
        resolve({
          url: job.url, rel: relOf(job.url), template: job.template, failures: [`worker exit ${code}: ${stderr.slice(-800)}`], errors: [], detached: [], blocks: [], calls: {}, matches: {}, dumps: [], consoleErrors: [],
        });
        return;
      }
      resolve(JSON.parse(stdout.slice(idx + RESULT_MARK.length)));
    });
  });
}

const results = new Array(jobs.length);
let next = 0;
await Promise.all(Array.from({ length: Math.min(opt.jobs, jobs.length) }, async () => {
  while (next < jobs.length) {
    const i = next;
    next += 1;
    results[i] = await spawnWorker(jobs[i]);
  }
}));

const stats = {};
const stat = (n) => {
  if (!stats[n]) {
    stats[n] = {
      calls: 0, errors: [], empty: [], detached: [], rows: 0, pages: new Set(),
    };
  }
  return stats[n];
};
const failures = [];
results.forEach((r) => {
  r.failures.forEach((f) => failures.push(`${r.rel}: ${f}`));
  Object.entries(r.calls).forEach(([n, c]) => { stat(n).calls += c; stat(n).pages.add(r.rel); });
  r.errors.forEach((e) => stat(e.name).errors.push(`${r.rel}: ${e.message} (${e.stack})`));
  r.detached.forEach((d) => stat(d.name).detached.push(`${r.rel}`));
  r.blocks.forEach((b) => {
    if (!parserNames.includes(b.name)) return;
    const s = stat(b.name);
    s.rows += b.filled;
    if (!b.filled) s.empty.push(r.rel);
  });
  r.dumps.forEach((d) => console.log(`\n${d}`));
  if (r.md) console.log(`\n===== ${r.rel}.md\n${r.md}`);
});

const names = Object.keys(stats).sort((a, b) => parserNames.indexOf(a) - parserNames.indexOf(b));
console.log(`\n=== pages: ${results.length}, page failures: ${failures.length}`);
failures.forEach((f) => console.log(`  FAIL ${f}`));
console.log('\n=== per parser            pages  calls  errors  empty  detached  filled-rows');
names.forEach((n) => {
  const s = stats[n];
  console.log(`  ${n.padEnd(22)} ${String(s.pages.size).padStart(5)} ${String(s.calls).padStart(6)} ${String(s.errors.length).padStart(7)} ${String(s.empty.length).padStart(6)} ${String(s.detached.length).padStart(9)} ${String(s.rows).padStart(12)}`);
});
names.forEach((n) => {
  const s = stats[n];
  if (s.errors.length) { console.log(`\n  ${n} errors:`); s.errors.forEach((e) => console.log(`    ${e}`)); }
  if (s.empty.length) console.log(`\n  ${n} empty block tables: ${s.empty.join(', ')}`);
  if (s.detached.length && !opt.quiet) console.log(`\n  ${n} detached matches: ${s.detached.join(', ')}`);
});
const withConsole = results.filter((r) => r.consoleErrors && r.consoleErrors.length);
if (withConsole.length && !opt.quiet) {
  console.log('\n=== console errors during import');
  withConsole.forEach((r) => console.log(`  ${r.rel}: ${r.consoleErrors.join(' | ').slice(0, 400)}`));
}
if (opt.json) {
  const serial = Object.fromEntries(names.map((n) => [n, { ...stats[n], pages: [...stats[n].pages] }]));
  fs.writeFileSync(opt.json, JSON.stringify({ stats: serial, failures, results }, null, 2));
}
const errorCount = names.reduce((n, k) => n + stats[k].errors.length, 0);
process.exit(errorCount || failures.length ? 1 : 0);
