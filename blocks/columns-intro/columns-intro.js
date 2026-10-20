/**
 * Two-column intro (xero.com StepsHeading): heading cell | body text cell.
 *
 * Optional popover: in the body cell, a plain-text paragraph (trigger label)
 * immediately followed by a paragraph containing only <strong> (popover title)
 * turns everything from the title onwards into a modal panel opened by the label.
 */

let modalCount = 0;

/**
 * Finds the popover trigger paragraph in a body cell.
 * @param {Element} cell The body cell
 * @returns {number} index of the trigger paragraph or -1
 */
function findPopoverIndex(cell) {
  const kids = [...cell.children];
  return kids.findIndex((el, i) => {
    const next = kids[i + 1];
    if (el.tagName !== 'P' || el.children.length || !el.textContent.trim()) return false;
    if (!next || next.tagName !== 'P' || next.children.length !== 1) return false;
    const strong = next.firstElementChild;
    return strong.tagName === 'STRONG' && strong.textContent.trim() === next.textContent.trim();
  });
}

/**
 * Builds the trigger button and modal dialog for a body cell.
 * @param {Element} block The block element
 * @param {Element} cell The body cell
 */
function buildPopover(block, cell) {
  const idx = findPopoverIndex(cell);
  if (idx < 0) return;

  const kids = [...cell.children];
  const triggerP = kids[idx];
  const titleP = kids[idx + 1];
  const rest = kids.slice(idx + 2);

  modalCount += 1;
  const titleId = `columns-intro-modal-title-${modalCount}`;

  const dialog = document.createElement('dialog');
  dialog.className = 'columns-intro-modal';
  dialog.setAttribute('aria-labelledby', titleId);

  const panel = document.createElement('div');
  panel.className = 'columns-intro-modal-panel';

  const bar = document.createElement('div');
  bar.className = 'columns-intro-modal-bar';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'columns-intro-modal-close';
  close.innerHTML = '<span class="columns-intro-icon" aria-hidden="true"></span><span class="columns-intro-label">Close</span>';
  bar.append(close);

  const content = document.createElement('div');
  content.className = 'columns-intro-modal-content';
  const title = document.createElement('h3');
  title.id = titleId;
  title.textContent = titleP.textContent.trim();
  content.append(title, ...rest);
  titleP.remove();

  // standalone link at the end of the popover is a call-to-action button in the source
  content.querySelectorAll(':scope > p').forEach((p) => {
    const a = p.querySelector(':scope > a:only-child');
    if (a && p.textContent.trim() === a.textContent.trim()) {
      p.classList.add('button-wrapper');
      a.classList.add('button', 'accent');
    }
  });

  panel.append(bar, content);
  dialog.append(panel);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'columns-intro-popover-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span class="columns-intro-icon" aria-hidden="true"></span><span class="columns-intro-label"></span>';
  trigger.querySelector('.columns-intro-label').textContent = triggerP.textContent.trim();
  triggerP.classList.add('columns-intro-popover');
  triggerP.replaceChildren(trigger);

  trigger.addEventListener('click', () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    close.focus();
  });
  close.addEventListener('click', () => dialog.close());
  // click on the backdrop (outside the panel) closes
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });

  block.append(dialog);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-intro-row');
    const [headingCell, bodyCell, ...rest] = row.children;
    if (headingCell) headingCell.classList.add('columns-intro-heading');
    if (bodyCell) bodyCell.classList.add('columns-intro-body');
    rest.forEach((cell) => cell.classList.add('columns-intro-body'));
  });
  block.querySelectorAll('.columns-intro-body').forEach((cell) => buildPopover(block, cell));
}
