#!/usr/bin/env node
/* eslint-disable no-console, global-require, import/no-dynamic-require */
/**
 * Verify the block mappings in tools/importer/page-templates.json against the
 * cached AU snapshots (tools/importer/bd-snapshots/<host>/<path>.html).
 *
 * For every page of every checked template it reports:
 *   - match counts per block (blocks[] instances, in importer order)
 *   - (a) MULTI   elements matched by more than one block
 *   - (b) NESTED  block matches nested inside another block's match
 *                 (allowed: video inside hero-split, see ALLOWED_NESTING)
 *   - (c) UNMAPPED top-level regions (main > div.xero-react) holding content
 *                 components that no block matches (layout primitives, inline
 *                 decorations and intentionally-default/cleanup components are
 *                 excluded, see IGNORE_* below)
 *   - sections[] selectors that match no region on a page (info)
 * plus per-block / per-instance totals across all pages.
 *
 * Usage (from project root):
 *   node tools/importer/verify-mapping.cjs                 # all templates with blocks
 *   node tools/importer/verify-mapping.cjs -t legal -t about
 *   node tools/importer/verify-mapping.cjs --exclude small-businesses
 *   node tools/importer/verify-mapping.cjs --quiet         # summary + issues only
 *   node tools/importer/verify-mapping.cjs --json out.json # machine-readable result
 *   node tools/importer/verify-mapping.cjs --file other-page-templates.json
 * Exit code: 0 when clean, 1 when MULTI / NESTED / UNMAPPED issues remain.
 * jsdom: resolved from the project, $JSDOM_PATH, or the excat content-import skill.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
let TEMPLATES_FILE = path.join(ROOT, 'tools/importer/page-templates.json');
const SNAPSHOT_DIR = process.env.BD_SNAPSHOT_DIR || path.join(ROOT, 'tools/importer/bd-snapshots');

function loadJsdom() {
  const candidates = [
    process.env.JSDOM_PATH,
    'jsdom',
    path.join(process.env.HOME || '', '.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules/jsdom'),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) { /* try next */ }
  }
  console.error('jsdom not found; set JSDOM_PATH to a jsdom package directory');
  process.exit(2);
  return null;
}
const { JSDOM, VirtualConsole } = loadJsdom();

/* ------------------------------------------------------------------ config */

const REGION_SELECTOR = 'main > div.xero-react';

/** [outer block, inner block] pairs that may nest (inner is parsed first). */
const ALLOWED_NESTING = [['hero-split', 'video']];

/** Layout primitives and inline decorations: never a content component. */
const IGNORE_COMPONENTS = new Set([
  'Region', 'Grid', 'Row', 'Col', 'Box', 'Spacing', 'Typography', 'Heading', 'Link',
  'Underlined', 'Button', 'ButtonGroup', 'Img', 'Image', 'Picture', 'Svg', 'Icon',
  'List', 'ListItem', 'Responsive', 'Divider', 'Arrow', 'TextArrow', 'Caption',
  'Highlighter', 'ZigZag', 'HalfSpark', 'Pill', 'IconButton', 'util', 'Text',
  'Label', 'TextInput', 'Select', 'Checkbox', 'Price', 'CardBorder',
]);
/**
 * Component parts that are inline decorations, or plain wrappers around default
 * content (a heading / promo pill paragraph) next to a mapped block.
 */
const IGNORE_PARTS = new Set([
  'Highlight__Wrapper', 'Highlight__Inner',
  'PlansTable__CenteredHeading', // h2 "Compare features across plans" -> default content
  'PlansCompact__PromoPillWrapper', 'PlanStackV2__PromoPillWrapper', // promo pill <p> -> default content
]);
/** Component elements with no text and no media are decorative (spacers, arrows). */
const MEDIA = 'img, picture, video, iframe, svg[role="img"]:not([aria-hidden="true"])';
function isDecorative(el) {
  return !el.textContent.trim() && !el.matches(MEDIA) && !el.querySelector(MEDIA);
}

/**
 * Subtrees that are intentionally not mapped to a block (default content, or
 * removed / handled by the cleanup transformer). Components inside are ignored.
 */
const IGNORE_SUBTREES = [
  { selector: '[class^="Hero__HeroWrapper"]', reason: 'centered Hero -> default content' },
  { selector: '[class^="LongForm__"]', reason: 'LongForm rich text -> default content' },
  { selector: '[class^="ProgressiveForm__"], [class^="InlineForm__"], form', reason: 'form (not migrated as block)' },
  { selector: '[class^="G2StarRatingWidget__"]', reason: 'G2 widget (cleanup)' },
  { selector: '[class^="Breadcrumbs__"], [class^="Crumb__"]', reason: 'breadcrumbs (cleanup)' },
  { selector: '[class^="SecondaryNavigation__"]', reason: 'secondary navigation (cleanup)' },
  { selector: '[class^="TopBar__"]', reason: 'top bar (cleanup)' },
  { selector: '[class^="Trustpilot__"]', reason: 'Trustpilot widget (cleanup)' },
  { selector: '[class^="AnchorButton__"]', reason: 'in-page anchor button, e.g. "Back to top" (cleanup)' },
  {
    selector: '[class^="Responsive__Wrapper"]:has([class^="PlanStackV2__"])',
    reason: 'adaptive small-viewport duplicate of the desktop plans (PlanStackV2) - cleanup must remove',
  },
];

/** Raw tags that signal block-worthy content when left outside every block. */
const SIGNIFICANT_TAGS = 'table, dl, blockquote, iframe, video';

/* ------------------------------------------------------------------- args */

const args = process.argv.slice(2);
const opt = { only: [], exclude: [], quiet: false, json: null };
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '-t' || a === '--template') { opt.only.push(args[i + 1]); i += 1; } else if (a === '--exclude') { opt.exclude.push(args[i + 1]); i += 1; } else if (a === '-q' || a === '--quiet') opt.quiet = true;
  else if (a === '--json') { opt.json = args[i + 1]; i += 1; } else if (a === '--file') { TEMPLATES_FILE = path.resolve(args[i + 1]); i += 1; } else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    process.exit(0);
  }
}

/* ---------------------------------------------------------------- helpers */

function snapshotFile(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/\/$/, '').replace(/\.html?$/, '') || '/index';
  return path.join(SNAPSHOT_DIR, u.hostname, `${p}.html`);
}

function componentOf(el) {
  const first = (el.getAttribute('class') || '').trim().split(/\s+/)[0] || '';
  const m = first.match(/^([A-Za-z][A-Za-z0-9]*)__([A-Za-z0-9]+)/);
  if (!m) return null;
  return { name: m[1], part: `${m[1]}__${m[2]}` };
}

function label(el) {
  const c = componentOf(el);
  const h = el.querySelector('h1, h2, h3');
  const text = (h ? h.textContent : el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  return `<${el.tagName.toLowerCase()}${c ? ` ${c.part}` : ''}> "${text}"`;
}

function safeAll(doc, selector) {
  try {
    return { els: [...doc.querySelectorAll(selector)] };
  } catch (e) {
    return { els: [], error: e.message };
  }
}

/* ------------------------------------------------------------------- main */

const pt = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
const templates = pt.templates.filter((t) => (t.blocks || []).length
  && (!opt.only.length || opt.only.includes(t.name))
  && !opt.exclude.includes(t.name));

const totals = {}; // block -> count
const instanceTotals = {}; // block\u0000selector -> count
const issues = { multi: [], nested: [], unmapped: [], errors: [], sections: [] };
const ignoredSummary = {}; // reason -> count
const pages = [];
const virtualConsole = VirtualConsole ? new VirtualConsole() : undefined;

templates.forEach((t) => {
  t.blocks.forEach((b) => {
    totals[b.name] = totals[b.name] || 0;
    b.instances.forEach((s) => { instanceTotals[`${b.name}\u0000${s}`] = instanceTotals[`${b.name}\u0000${s}`] || 0; });
  });
  if (!opt.quiet) console.log(`\n=== template ${t.name} (${t.urls.length} urls, ${t.blocks.length} blocks)`);

  t.urls.forEach((url) => {
    const file = snapshotFile(url);
    const pagePath = new URL(url).pathname;
    if (!fs.existsSync(file)) {
      issues.errors.push({ template: t.name, page: pagePath, error: `snapshot missing: ${path.relative(ROOT, file)}` });
      if (!opt.quiet) console.log(`  ${pagePath}  !! snapshot missing`);
      return;
    }
    const doc = new JSDOM(fs.readFileSync(file, 'utf8'), { virtualConsole }).window.document;

    // Block matches, in importer order.
    const matched = new Map(); // element -> [{ block, selector }]
    const counts = {};
    t.blocks.forEach((b) => {
      b.instances.forEach((selector) => {
        const { els, error } = safeAll(doc, selector);
        if (error) issues.errors.push({ template: t.name, page: pagePath, error: `${b.name}: invalid selector ${selector}: ${error}` });
        els.forEach((el) => {
          if (!matched.has(el)) matched.set(el, []);
          const list = matched.get(el);
          if (list.some((m) => m.block === b.name)) return; // same block via two selectors
          list.push({ block: b.name, selector });
          counts[b.name] = (counts[b.name] || 0) + 1;
          totals[b.name] += 1;
          instanceTotals[`${b.name}\u0000${selector}`] += 1;
        });
      });
    });

    const pageIssues = [];
    // (a) one element, several blocks
    matched.forEach((list, el) => {
      if (list.length > 1) {
        const it = { template: t.name, page: pagePath, element: label(el), blocks: list.map((m) => m.block) };
        issues.multi.push(it);
        pageIssues.push(`MULTI ${it.blocks.join('+')} ${it.element}`);
      }
    });
    // (b) nested matches
    const matchedEls = [...matched.keys()];
    matchedEls.forEach((el) => {
      let a = el.parentElement;
      while (a) {
        if (matched.has(a)) {
          const outer = matched.get(a)[0].block;
          const inner = matched.get(el)[0].block;
          const allowed = ALLOWED_NESTING.some(([o, i]) => o === outer && i === inner);
          if (!allowed) {
            const it = { template: t.name, page: pagePath, outer, inner, element: label(el) };
            issues.nested.push(it);
            pageIssues.push(`NESTED ${inner} inside ${outer} ${it.element}`);
          }
          break;
        }
        a = a.parentElement;
      }
    });
    // (c) regions with unmapped content components
    const inBlock = (el) => matchedEls.some((m) => m === el || m.contains(el));
    const ignoredRoots = [];
    IGNORE_SUBTREES.forEach(({ selector, reason }) => {
      safeAll(doc, selector).els.forEach((el) => ignoredRoots.push({ el, reason }));
    });
    const ignoredBy = (el) => ignoredRoots.find((r) => r.el === el || r.el.contains(el));
    const regions = [...doc.querySelectorAll(REGION_SELECTOR)];
    const regionReport = [];
    regions.forEach((region, idx) => {
      const unmapped = new Map(); // component -> count
      const ignored = new Set();
      [...region.querySelectorAll('[class]')].forEach((el) => {
        const c = componentOf(el);
        if (!c || IGNORE_COMPONENTS.has(c.name) || IGNORE_PARTS.has(c.part)) return;
        if (inBlock(el) || isDecorative(el)) return;
        const ig = ignoredBy(el);
        if (ig) { ignored.add(ig.reason); return; }
        unmapped.set(c.name, (unmapped.get(c.name) || 0) + 1);
      });
      [...region.querySelectorAll(SIGNIFICANT_TAGS)].forEach((el) => {
        if (inBlock(el)) return;
        const ig = ignoredBy(el);
        if (ig) { ignored.add(ig.reason); return; }
        const k = `<${el.tagName.toLowerCase()}>`;
        unmapped.set(k, (unmapped.get(k) || 0) + 1);
      });
      ignored.forEach((r) => { ignoredSummary[r] = (ignoredSummary[r] || 0) + 1; });
      const blocksHere = [...new Set(matchedEls.filter((m) => region.contains(m)).map((m) => matched.get(m)[0].block))];
      regionReport.push({ region: idx + 1, blocks: blocksHere, unmapped: Object.fromEntries(unmapped), ignored: [...ignored] });
      if (unmapped.size) {
        const h = region.querySelector('h1, h2, h3');
        const it = {
          template: t.name,
          page: pagePath,
          region: idx + 1,
          heading: (h ? h.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 60),
          components: Object.fromEntries(unmapped),
        };
        issues.unmapped.push(it);
        pageIssues.push(`UNMAPPED r${idx + 1} {${[...unmapped.keys()].join(', ')}} "${it.heading}"`);
      }
    });
    // sections[] selectors (info)
    (t.sections || []).forEach((s) => {
      const sels = Array.isArray(s.selector) ? s.selector : [s.selector];
      const hit = regions.some((r) => sels.some((sel) => {
        try { return r.matches(sel) || !!r.querySelector(sel); } catch (e) { return false; }
      }));
      if (!hit && pagePath === new URL(t.urls[0]).pathname) issues.sections.push({ template: t.name, page: pagePath, section: s.id });
    });

    pages.push({ template: t.name, page: pagePath, regions: regions.length, counts, issues: pageIssues, regionReport });
    if (!opt.quiet) {
      const c = Object.entries(counts).map(([k, v]) => `${k}x${v}`).join(' ');
      console.log(`  ${pagePath}  [${regions.length} regions]  ${c || '(no blocks)'}`);
      pageIssues.forEach((i) => console.log(`      !! ${i}`));
    }
  });
});

/* ---------------------------------------------------------------- summary */

console.log('\n=== per-block totals');
Object.entries(totals).forEach(([b, n]) => console.log(`  ${String(n).padStart(5)}  ${b}`));
console.log('\n=== per-instance totals');
Object.entries(instanceTotals).forEach(([k, n]) => {
  const [b, s] = k.split('\u0000');
  console.log(`  ${String(n).padStart(5)}  ${b}  ${s}`);
});
console.log('\n=== intentionally unmapped (regions affected)');
Object.entries(ignoredSummary).forEach(([r, n]) => console.log(`  ${String(n).padStart(5)}  ${r}`));

console.log(`\n=== issues: multi=${issues.multi.length} nested=${issues.nested.length} unmapped=${issues.unmapped.length} errors=${issues.errors.length} sections=${issues.sections.length}`);
issues.multi.forEach((i) => console.log(`  MULTI    ${i.page}  ${i.blocks.join('+')}  ${i.element}`));
issues.nested.forEach((i) => console.log(`  NESTED   ${i.page}  ${i.inner} in ${i.outer}  ${i.element}`));
issues.unmapped.forEach((i) => console.log(`  UNMAPPED ${i.page} r${i.region}  ${JSON.stringify(i.components)}  "${i.heading}"`));
issues.errors.forEach((i) => console.log(`  ERROR    ${i.page}  ${i.error}`));
issues.sections.forEach((i) => console.log(`  SECTION  ${i.template} ${i.section} matches no region on ${i.page}`));

if (opt.json) {
  fs.writeFileSync(opt.json, JSON.stringify({
    totals, instanceTotals, ignoredSummary, issues, pages,
  }, null, 2));
  console.log(`\nwrote ${opt.json}`);
}

process.exit(issues.multi.length || issues.nested.length || issues.unmapped.length || issues.errors.length ? 1 : 0);
