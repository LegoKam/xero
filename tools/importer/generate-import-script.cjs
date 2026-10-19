/* eslint-disable */
/**
 * Generates tools/importer/import-<template>.js for a template in page-templates.json.
 * Imports one parser per template block and every transformer, embeds the template
 * object as PAGE_TEMPLATE, and reuses the shared orchestration code (transformer
 * runner, block finder, onLoad __NEXT_DATA__ stash, transform) from the reference
 * script import-small-businesses.js.
 *
 * Usage (from project root): node tools/importer/generate-import-script.cjs <template> [<template>...]
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'tools', 'importer');
const reference = fs.readFileSync(path.join(dir, 'import-small-businesses.js'), 'utf8');
const tail = reference.slice(reference.indexOf('\nconst transformers = ['));
const { templates } = JSON.parse(fs.readFileSync(path.join(dir, 'page-templates.json'), 'utf8'));
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

process.argv.slice(2).forEach((name) => {
  const template = templates.find((t) => t.name === name);
  if (!template) throw new Error(`template not found: ${name}`);
  const blocks = template.blocks.map((b) => b.name);
  blocks.forEach((b) => {
    if (!fs.existsSync(path.join(dir, 'parsers', `${b}.js`))) throw new Error(`missing parser ${b}`);
  });
  const transformerFiles = fs.readdirSync(path.join(dir, 'transformers')).filter((f) => f.endsWith('.js')).sort();
  const imports = [
    ...blocks.map((b) => `import ${camel(b)}Parser from './parsers/${b}.js';`),
    ...transformerFiles.map((f) => `import ${camel(f.replace('.js', ''))}Transformer from './transformers/${f}';`),
  ].join('\n');
  const transformersLine = `\nconst transformers = [${transformerFiles.map((f) => `${camel(f.replace('.js', ''))}Transformer`).join(', ')}];`;
  const body = tail.replace(/\nconst transformers = \[[^\]]*\];/, transformersLine);
  const src = `/* eslint-disable */
/* global WebImporter */

${imports}

const PAGE_TEMPLATE = ${JSON.stringify(template, null, 2)};

const parsers = {
${blocks.map((b) => `  '${b}': ${camel(b)}Parser,`).join('\n')}
};
${body}`;
  fs.writeFileSync(path.join(dir, `import-${name}.js`), src);
  console.log(`wrote import-${name}.js (${blocks.length} parsers, ${transformerFiles.length} transformers)`);
});
