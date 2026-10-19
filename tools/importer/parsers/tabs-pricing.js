/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-pricing.
 * Source: [class^="FinTabSet__Wrapper"] (plan category toggle + pricing panel).
 * Block structure (2 columns): one row per tab -> [tab label | panel content].
 * Panel content: per plan an H3 name, bold price paragraph, notes, description,
 * "Includes" list, then Buy now (strong = primary button) and Learn more links.
 * Only the selected category's panel is rendered in source; other tabs get an empty panel.
 * The inner "Buy now / Get one month free" radio toggle is UI chrome and is not migrated.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildPlan(document, card) {
  const nodes = [];

  const h3src = card.querySelector('h3');
  if (h3src) {
    // Ultimate plan heading embeds a tier <select>; keep only the selected tier name.
    const selected = h3src.querySelector('select option:checked, select option[selected]');
    const name = selected ? clean(selected.textContent) : clean(h3src.textContent);
    const h3 = document.createElement('h3');
    h3.textContent = name;
    nodes.push(h3);
  }

  const priceRow = card.querySelector('[class^="PlanCard__PriceRow"]');
  if (priceRow) {
    const price = clean(priceRow.textContent);
    if (price) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = price;
      p.append(strong);
      nodes.push(p);
    }
  }

  const top = card.querySelector('[class^="PlanCard__Top"]') || card;
  top.querySelectorAll('p').forEach((srcP) => {
    if (srcP.closest('dl')) return;
    const text = clean(srcP.textContent);
    if (!text) return;
    const p = document.createElement('p');
    p.textContent = text;
    nodes.push(p);
  });

  const dl = top.querySelector('dl');
  if (dl) {
    const term = dl.querySelector('dt');
    const label = term ? clean(term.textContent) : '';
    if (label) {
      const p = document.createElement('p');
      p.textContent = label;
      nodes.push(p);
    }
    const list = document.createElement('ul');
    dl.querySelectorAll('li').forEach((li) => {
      const text = clean(li.textContent);
      if (!text) return;
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    });
    if (list.children.length) nodes.push(list);
  }

  const ctas = card.querySelector('[class^="PlanCard__CtasSection"]');
  if (ctas) {
    ctas.querySelectorAll('a[href]').forEach((a) => {
      const text = clean(a.textContent);
      if (!text) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      if (/Button__Element/.test(a.className)) {
        const strong = document.createElement('strong');
        strong.append(link);
        p.append(strong);
      } else {
        p.append(link);
      }
      nodes.push(p);
    });
  }

  return nodes;
}

export default function parse(element, { document }) {
  const cells = [];

  const toggle = element.querySelector('[class^="FinTabSet__ToggleWrapper"]');
  const labels = toggle ? [...toggle.querySelectorAll('label')] : [];
  const panel = element.querySelector(':scope > div:not([class^="FinTabSet__ToggleWrapper"]) > [role="tabpanel"]')
    || element.querySelector('[role="tabpanel"]');

  const panelContent = [];
  if (panel) {
    panel.querySelectorAll('[class^="PlanCard__Element"]').forEach((card) => {
      panelContent.push(...buildPlan(document, card));
    });
  }

  if (labels.length) {
    // Select the tab whose radio controls the rendered panel; fall back to the checked radio.
    let activeIndex = labels.findIndex((label) => {
      const input = label.previousElementSibling
        || label.parentElement.querySelector('input');
      return input && panel && input.getAttribute('aria-controls') === panel.id;
    });
    if (activeIndex < 0) {
      activeIndex = labels.findIndex((label) => {
        const input = label.parentElement.querySelector('input');
        return input && (input.checked || input.hasAttribute('checked'));
      });
    }
    if (activeIndex < 0) activeIndex = 0;

    labels.forEach((label, i) => {
      const text = clean(label.textContent);
      if (!text) return;
      cells.push([text, i === activeIndex ? panelContent : '']);
    });
  } else if (panelContent.length) {
    cells.push(['Plans', panelContent]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-pricing', cells });
  element.replaceWith(block);
}
