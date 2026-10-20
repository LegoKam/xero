const INCLUDED = ['included', 'yes', 'true', '✓', '✔'];
const EXCLUDED = ['excluded', 'no', 'false', '✕', '✗', '×', '-'];

const SVG_NS = 'http://www.w3.org/2000/svg';

// hand-drawn tick / cross paths used by the source site
const ICONS = {
  included: {
    viewBox: '0 0 18 18',
    paths: ['M3 10.5C4.33115 11.5286 5.37037 12.7132 6.59722 13.8333C7.27501 14.4522 7.40203 14.5441 7.65278 13.7083C8.83956 9.7524 12.3985 6.0745 15 3'],
  },
  excluded: {
    viewBox: '0 0 13 14',
    paths: [
      'M11.4739 10.2986C8.55526 7.82887 5.808 5.40056 3.27449 2.56351',
      'M10.8211 2.48512C8.15425 4.93082 6.03815 8.27626 3.11095 10.3703',
    ],
  },
  chevron: {
    viewBox: '0 0 7 6',
    paths: ['M2.5 0.75L4.75 3L2.5 5.25'],
  },
};

let uid = 0;

function createIcon(name) {
  const { viewBox, paths } = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

/**
 * Replaces an Included/Excluded cell value with an icon, keeping accessible text.
 * @param {Element} cell The table cell
 * @returns {boolean} true when the cell was converted to an icon
 */
function decorateStatus(cell) {
  const value = cell.textContent.trim().toLowerCase();
  let status = null;
  if (INCLUDED.includes(value)) status = 'included';
  else if (EXCLUDED.includes(value)) status = 'excluded';
  if (!status) return false;

  const icon = document.createElement('span');
  icon.className = `table-comparison-icon table-comparison-${status}`;
  icon.append(createIcon(status));
  const label = document.createElement('span');
  label.className = 'table-comparison-label';
  label.textContent = status === 'included' ? 'Included' : 'Excluded';
  cell.replaceChildren(icon, label);
  cell.classList.add('table-comparison-status');
  return true;
}

/**
 * Value cell authored as two paragraphs: main value + secondary note.
 * @param {Element} cell The table cell
 */
function decorateNote(cell) {
  const paras = [...cell.children].filter((el) => el.tagName === 'P');
  if (paras.length === 2 && paras.length === cell.children.length) {
    paras[1].classList.add('table-comparison-note');
  }
}

/**
 * Row label authored as label paragraph followed by description paragraph(s):
 * keep the label, move the description into a toggleable tooltip.
 * @param {Element} cell The row header cell
 */
function decorateTooltip(cell) {
  const paras = [...cell.children].filter((el) => el.tagName === 'P');
  if (paras.length < 2) return;
  const [labelPara, ...descParas] = paras;

  uid += 1;
  const id = `table-comparison-tip-${uid}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'table-comparison-info';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  const text = document.createElement('span');
  text.className = 'table-comparison-info-text';
  text.append(...labelPara.childNodes);
  const mark = document.createElement('span');
  mark.className = 'table-comparison-info-icon';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'i';
  button.append(text, mark);

  const tip = document.createElement('div');
  tip.className = 'table-comparison-tooltip';
  tip.id = id;
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  tip.append(...descParas);

  labelPara.replaceWith(button);
  button.after(tip);
}

function closeTooltips(block, except) {
  block.querySelectorAll('.table-comparison-info[aria-expanded="true"]').forEach((btn) => {
    if (btn === except) return;
    btn.setAttribute('aria-expanded', 'false');
    const tip = block.querySelector(`#${btn.getAttribute('aria-controls')}`);
    if (tip) tip.hidden = true;
  });
}

function createNavButton(direction, scroller) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `table-comparison-nav table-comparison-${direction}`;
  button.setAttribute('aria-label', direction === 'next' ? 'Scroll table right' : 'Scroll table left');
  button.setAttribute('aria-controls', scroller.id);
  button.dataset.direction = direction;
  button.hidden = true;
  button.append(createIcon('chevron'));
  return button;
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
  let columns = 0;

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    const cols = [...row.children];
    columns = Math.max(columns, cols.length);
    cols.forEach((col, colIndex) => {
      const isHeader = rowIndex === 0;
      const isLabel = colIndex === 0;
      const isCorner = isHeader && isLabel && !col.textContent.trim();
      let cell;
      if (isCorner) {
        cell = document.createElement('td');
        cell.className = 'table-comparison-corner';
      } else {
        cell = document.createElement(isHeader || isLabel ? 'th' : 'td');
        if (isHeader) cell.setAttribute('scope', 'col');
        else if (isLabel) cell.setAttribute('scope', 'row');
      }
      cell.append(...col.childNodes);
      if (!isHeader && isLabel) decorateTooltip(cell);
      if (!isHeader && !isLabel && !decorateStatus(cell)) decorateNote(cell);
      tr.append(cell);
    });
    (rowIndex === 0 ? thead : tbody).append(tr);
  });

  table.append(thead, tbody);
  block.style.setProperty('--table-comparison-columns', columns);

  const scroller = document.createElement('div');
  scroller.className = 'table-comparison-scroller';
  uid += 1;
  scroller.id = `table-comparison-scroller-${uid}`;
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  const heading = block.closest('.section')?.querySelector('h2, h3');
  scroller.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Comparison table');
  scroller.append(table);

  const prev = createNavButton('prev', scroller);
  const next = createNavButton('next', scroller);

  block.replaceChildren(scroller, prev, next);

  const updateNav = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const pos = Math.abs(scroller.scrollLeft);
    prev.hidden = pos <= 1;
    next.hidden = max <= 1 || pos >= max - 1;
    block.classList.toggle('is-scrolled', pos > 1);
  };

  scroller.addEventListener('scroll', updateNav, { passive: true });
  new ResizeObserver(updateNav).observe(scroller);
  updateNav();

  block.addEventListener('click', (e) => {
    const nav = e.target.closest('.table-comparison-nav');
    if (nav) {
      const labelCol = table.querySelector('tbody th, thead td, thead th');
      const valueCol = table.querySelector('tbody td, thead th:not(:first-child)');
      const step = valueCol ? valueCol.offsetWidth : scroller.clientWidth / 2;
      const visible = scroller.clientWidth - (labelCol ? labelCol.offsetWidth : 0);
      const distance = Math.max(step, Math.floor(visible / step) * step);
      scroller.scrollBy({ left: nav.dataset.direction === 'next' ? distance : -distance, behavior: 'smooth' });
      return;
    }

    const info = e.target.closest('.table-comparison-info');
    if (info) {
      const open = info.getAttribute('aria-expanded') !== 'true';
      closeTooltips(block, info);
      info.setAttribute('aria-expanded', String(open));
      const tip = block.querySelector(`#${info.getAttribute('aria-controls')}`);
      if (tip) tip.hidden = !open;
      return;
    }

    if (!e.target.closest('.table-comparison-tooltip')) closeTooltips(block);
  });

  block.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = block.querySelector('.table-comparison-info[aria-expanded="true"]');
    if (!open) return;
    closeTooltips(block);
    open.focus();
  });
}
