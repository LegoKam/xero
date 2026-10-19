/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-comparison.
 * Source: [class^="Table__Wrapper"] > Table__Scroller > table.Table__Element
 *   (thead: blank cell + tier names; tbody rows: th label + td tick/cross icons).
 * Table__NavigationButtonsGroup (scroll arrows) and shadow wrappers are UI chrome
 * and are not migrated.
 * Block structure: header row [empty | tier names...], then one row per benefit:
 *   [label | Included/Excluded per tier]. Icon cells are mapped from the svg
 *   title / aria-label; other cells keep their text (one paragraph per text block).
 *
 * PlansTable variant (au/pricing-plans "Compare features across plans"):
 *   - thead has two rows: a promo pill row ("Forecast with clarity", rendered twice
 *     for mobile/desktop) and a plan name + "Buy now" row. Only the plan-name row is
 *     kept, as the header, with plan names only (pill and Buy now links are dropped;
 *     Buy now is already in the tabs-pricing plan cards above).
 *   - Row labels are tooltip buttons (optionally preceded by a "New" pill): the label
 *     is the button text; the tooltip description (from the __NEXT_DATA__ popover with
 *     the same button text) is added as a second paragraph when shorter than 200 chars.
 *   - Group header rows (a single label cell) -> label in first cell, other cells empty.
 */
const MAX_TOOLTIP_LENGTH = 200;

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR', 'DL', 'DT', 'DD']);

/** Text blocks of a node: runs of inline text separated by block-level elements. */
function textBlocks(node) {
  const blocks = [];
  let buffer = '';
  const flush = () => {
    const text = clean(buffer);
    if (text) blocks.push(text);
    buffer = '';
  };
  const walk = (n) => {
    n.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        buffer += child.textContent;
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toUpperCase();
        if (tag === 'SVG' || tag === 'TITLE') return;
        if (BLOCK_TAGS.has(tag)) {
          flush();
          walk(child);
          flush();
        } else {
          walk(child);
        }
      }
    });
  };
  walk(node);
  flush();
  return blocks;
}

function para(document, text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

/** "Included" / "Excluded" from a tick/cross icon, else the cell's text. */
function cellValue(document, cell) {
  const svg = cell.querySelector('svg');
  if (svg) {
    const title = svg.querySelector('title');
    let label = clean(title && title.textContent) || clean(svg.getAttribute('aria-label'));
    if (!label) {
      const ref = svg.getAttribute('aria-labelledby');
      const refEl = ref && cell.ownerDocument.getElementById(ref);
      label = clean(refEl && refEl.textContent);
    }
    if (/^(included|tick|yes|check)/i.test(label)) return 'Included';
    if (/^(excluded|cross|no|not included)/i.test(label)) return 'Excluded';
    if (label) return label;
  }
  const copy = cell.cloneNode(true);
  copy.querySelectorAll('svg').forEach((s) => s.remove());
  // Several text blocks (e.g. "For 5 users" + "$5 per additional user", or one plan
  // name per <p>) -> one paragraph each instead of run-together text.
  const blocks = textBlocks(copy);
  if (blocks.length > 1) return blocks.map((t) => para(document, t));
  return clean(copy.textContent);
}

/** Tooltip popovers from __NEXT_DATA__: button text (lowercase) -> description. */
function findTooltips(document) {
  const map = new Map();
  const script = document.querySelector('#__NEXT_DATA__');
  if (!script) return map;
  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch (e) {
    return map;
  }
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const pop = node.popover;
    if (pop && typeof pop === 'object' && typeof pop.button === 'string') {
      const key = clean(pop.button).toLowerCase();
      if (key && !map.has(key)) map.set(key, clean(pop.description));
    }
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  walk(data);
  return map;
}

/** Row label: keep links if present, otherwise plain text. */
function labelValue(document, cell, tooltips) {
  const button = cell.querySelector('button');
  if (button) {
    // Tooltip button label: the visible text only (no icon, no "New" pill).
    const textEl = button.querySelector('[class^="IconButton__ChildrenWrapper"]') || button;
    const copy = textEl.cloneNode(true);
    copy.querySelectorAll('svg').forEach((s) => s.remove());
    const text = clean(copy.textContent);
    if (text) {
      const tip = tooltips().get(text.toLowerCase());
      if (tip && tip.length < MAX_TOOLTIP_LENGTH) return [para(document, text), para(document, tip)];
      return text;
    }
  }
  const link = cell.querySelector('a[href]');
  const text = clean(cell.textContent);
  if (link && text) {
    const a = document.createElement('a');
    a.href = link.getAttribute('href');
    a.textContent = text;
    return a;
  }
  return text;
}

/** Header cell text for multi-row heads: drop links/buttons, collapse duplicated (responsive) copies. */
function headingValue(cell) {
  const copy = cell.cloneNode(true);
  copy.querySelectorAll('a, button, svg').forEach((n) => n.remove());
  const blocks = textBlocks(copy).filter((t, i, all) => all.indexOf(t) === i);
  return blocks.join(' ');
}

export default function parse(element, { document }) {
  const cells = [];
  const table = element.querySelector('table');
  const rows = table ? [...table.querySelectorAll('tr')] : [];

  let tooltipMap = null;
  const tooltips = () => {
    if (!tooltipMap) tooltipMap = findTooltips(document);
    return tooltipMap;
  };

  let width = 0;
  rows.forEach((tr) => {
    width = Math.max(width, tr.querySelectorAll(':scope > th, :scope > td').length);
  });

  const cellsOf = (tr) => [...tr.querySelectorAll(':scope > th, :scope > td')];
  const isHeadRow = (tr, rowIndex) => !!tr.closest('thead') || (rowIndex === 0 && !tr.closest('tbody'));
  const headRows = rows.filter((tr, i) => isHeadRow(tr, i) && cellsOf(tr).length);

  // Multi-row head (PlansTable): keep only the row naming the most columns (plan names).
  let headerRow = null;
  if (headRows.length > 1) {
    let best = -1;
    headRows.forEach((tr) => {
      const named = cellsOf(tr).filter((c) => headingValue(c)).length;
      if (named >= best) {
        best = named;
        headerRow = tr;
      }
    });
  }

  rows.forEach((tr, rowIndex) => {
    const srcCells = cellsOf(tr);
    if (!srcCells.length) return;
    const isHead = isHeadRow(tr, rowIndex);
    let row;
    if (isHead && headerRow) {
      if (tr !== headerRow) return; // promo pill rows
      row = srcCells.map((cell) => headingValue(cell));
    } else {
      row = srcCells.map((cell, i) => {
        if (isHead) return i === 0 && !clean(cell.textContent) ? '' : clean(cell.textContent);
        return i === 0 ? labelValue(document, cell, tooltips) : cellValue(document, cell);
      });
    }
    // Pad short rows (incl. single-cell group header rows) so the table stays rectangular.
    while (row.length < width) row.push('');
    if (row.some((c) => (Array.isArray(c) ? c.length : c))) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-comparison', cells });
  element.replaceWith(block);
}
