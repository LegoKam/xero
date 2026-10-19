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
 *   title / aria-label; other cells keep their text.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** "Included" / "Excluded" from a tick/cross icon, else the cell's text. */
function cellValue(cell) {
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
  return clean(copy.textContent);
}

/** Row label: keep links if present, otherwise plain text. */
function labelValue(document, cell) {
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

export default function parse(element, { document }) {
  const cells = [];
  const table = element.querySelector('table');
  const rows = table ? [...table.querySelectorAll('tr')] : [];

  let width = 0;
  rows.forEach((tr) => {
    width = Math.max(width, tr.querySelectorAll(':scope > th, :scope > td').length);
  });

  rows.forEach((tr, rowIndex) => {
    const srcCells = [...tr.querySelectorAll(':scope > th, :scope > td')];
    if (!srcCells.length) return;
    const isHead = !!tr.closest('thead') || (rowIndex === 0 && !tr.closest('tbody'));
    const row = srcCells.map((cell, i) => {
      if (isHead) return i === 0 && !clean(cell.textContent) ? '' : clean(cell.textContent);
      return i === 0 ? labelValue(document, cell) : cellValue(cell);
    });
    // Pad short rows so the block table stays rectangular.
    while (row.length < width) row.push('');
    if (row.some((c) => c)) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-comparison', cells });
  element.replaceWith(block);
}
