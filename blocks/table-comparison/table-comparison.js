const INCLUDED = ['included', 'yes', 'true', '✓', '✔'];
const EXCLUDED = ['excluded', 'no', 'false', '✕', '✗', '×', '-'];

/**
 * Replaces an Included/Excluded cell value with an icon, keeping accessible text.
 * @param {Element} cell The table cell
 */
function decorateStatus(cell) {
  const value = cell.textContent.trim().toLowerCase();
  let status = null;
  if (INCLUDED.includes(value)) status = 'included';
  else if (EXCLUDED.includes(value)) status = 'excluded';
  if (!status) return;

  const icon = document.createElement('span');
  icon.className = `table-comparison-icon table-comparison-${status}`;
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'table-comparison-label';
  label.textContent = status === 'included' ? 'Included' : 'Excluded';
  cell.replaceChildren(icon, label);
  cell.classList.add('table-comparison-status');
}

/**
 * Comparison table: first row is the header (empty corner cell, then column names);
 * each following row is a feature label followed by per-column values.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((col, colIndex) => {
      const isHeader = rowIndex === 0;
      const cell = document.createElement(isHeader || colIndex === 0 ? 'th' : 'td');
      if (isHeader) cell.setAttribute('scope', 'col');
      else if (colIndex === 0) cell.setAttribute('scope', 'row');
      cell.append(...col.childNodes);
      if (!isHeader && colIndex > 0) decorateStatus(cell);
      tr.append(cell);
    });
    (rowIndex === 0 ? thead : tbody).append(tr);
  });

  table.append(thead, tbody);

  const scroller = document.createElement('div');
  scroller.className = 'table-comparison-scroller';
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  const caption = block.closest('.section')?.querySelector('h2, h3');
  scroller.setAttribute('aria-label', caption ? caption.textContent.trim() : 'Comparison table');
  scroller.append(table);

  block.replaceChildren(scroller);
}
