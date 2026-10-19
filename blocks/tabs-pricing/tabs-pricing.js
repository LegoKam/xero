import { toClassName } from '../../scripts/aem.js';

/**
 * Checks whether a paragraph contains only bold text (used for plan prices).
 * @param {Element} el
 * @returns {boolean}
 */
function isBoldOnly(el) {
  return el.tagName === 'P'
    && el.children.length === 1
    && el.firstElementChild.tagName === 'STRONG'
    && el.textContent.trim() === el.firstElementChild.textContent.trim();
}

/**
 * Splits a tab panel into plan cards, one per H3.
 * Content before the first H3 is kept as the panel intro.
 * @param {Element} panel The tab panel content element
 */
function buildPlans(panel) {
  const headings = [...panel.querySelectorAll(':scope > h3')];
  if (!headings.length) return;

  const intro = document.createElement('div');
  intro.className = 'tabs-pricing-intro';
  const plans = document.createElement('ul');
  plans.className = 'tabs-pricing-plans';

  let current = null;
  [...panel.children].forEach((el) => {
    if (el.tagName === 'H3') {
      current = document.createElement('li');
      current.className = 'tabs-pricing-plan';
      plans.append(current);
    }
    if (current) {
      if (!current.querySelector('.tabs-pricing-price') && isBoldOnly(el)) {
        el.classList.add('tabs-pricing-price');
      }
      current.append(el);
    } else {
      intro.append(el);
    }
  });

  const nodes = [];
  if (intro.children.length) nodes.push(intro);
  nodes.push(plans);
  panel.replaceChildren(...nodes);
}

/**
 * Pricing tabs: one row per tab (label | panel content).
 * The first tab with panel content is selected by default.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-pricing-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children].filter((row) => row.children[0]);
  const contentIndex = rows.findIndex((row) => {
    const panel = row.children[1];
    return panel && (panel.textContent.trim() || panel.querySelector('picture'));
  });
  const selectedIndex = contentIndex >= 0 ? contentIndex : 0;
  const buttons = [];
  const panels = [];

  const select = (index, focus = false) => {
    buttons.forEach((btn, i) => {
      btn.setAttribute('aria-selected', i === index);
      btn.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => panel.setAttribute('aria-hidden', i !== index));
    if (focus) buttons[index].focus();
  };

  rows.forEach((row, i) => {
    const label = row.children[0];
    const id = `${toClassName(label.textContent) || 'tab'}-${i}`;

    row.className = 'tabs-pricing-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `tab-${id}`);

    const button = document.createElement('button');
    button.className = 'tabs-pricing-tab';
    button.id = `tab-${id}`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', row.id);
    button.innerHTML = label.innerHTML;
    button.addEventListener('click', () => select(i));
    tablist.append(button);
    label.remove();

    const content = row.firstElementChild;
    if (content) {
      content.classList.add('tabs-pricing-panel-content');
      buildPlans(content);
    }

    buttons.push(button);
    panels.push(row);
  });

  tablist.addEventListener('keydown', (e) => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next !== null) {
      e.preventDefault();
      select(next, true);
    }
  });

  block.prepend(tablist);
  if (buttons.length) select(selectedIndex);
}
