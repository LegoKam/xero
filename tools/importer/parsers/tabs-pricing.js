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

/** List item text without the tick icon's hidden svg <title> ("Included"). */
function itemText(li) {
  const span = li.querySelector('[class^="Typography__Span"]');
  if (span) return clean(span.textContent);
  const copy = li.cloneNode(true);
  copy.querySelectorAll('svg, title').forEach((s) => s.remove());
  return clean(copy.textContent);
}

/** The plans component (planCollections) from the Next.js page data. */
function findPlanCollections(document, labels) {
  const script = document.querySelector('#__NEXT_DATA__');
  if (!script) return null;
  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch (e) {
    return null;
  }
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (Array.isArray(node.planCollections)) found.push(node.planCollections);
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  walk(data);
  if (!found.length) return null;
  const wanted = labels.map((l) => l.toLowerCase());
  return found.find((pc) => pc.some((c) => wanted.includes(clean(c.collectionLabel).toLowerCase())))
    || found[0];
}

function para(document, text, bold) {
  const p = document.createElement('p');
  if (bold) {
    const strong = document.createElement('strong');
    strong.textContent = text;
    p.append(strong);
  } else {
    p.textContent = text;
  }
  return p;
}

function linkPara(document, cta, primary) {
  if (!cta || !cta.href || !clean(cta.text)) return null;
  const link = document.createElement('a');
  link.href = cta.href;
  link.textContent = clean(cta.text);
  const p = document.createElement('p');
  if (primary) {
    const strong = document.createElement('strong');
    strong.append(link);
    p.append(strong);
  } else {
    p.append(link);
  }
  return p;
}

/** Same structure as buildPlan(), from a __NEXT_DATA__ plan object. */
function buildPlanFromData(document, plan) {
  const nodes = [];
  if (clean(plan.heading)) {
    const h3 = document.createElement('h3');
    h3.textContent = clean(plan.heading);
    nodes.push(h3);
  }
  const symbol = (plan.currency && plan.currency.symbol) || '$';
  const discount = plan.discount && plan.discount.price ? plan.discount : null;
  const amount = discount ? discount.price : plan.price;
  if (amount) nodes.push(para(document, clean(`${symbol}${amount} ${plan.priceDescription || ''}`), true));
  if (discount) {
    if (clean(discount.savingsPeriodText)) nodes.push(para(document, clean(discount.savingsPeriodText)));
    if (clean(discount.savingsText)) nodes.push(para(document, clean(discount.savingsText)));
  }
  if (clean(plan.description)) nodes.push(para(document, clean(plan.description)));
  const points = (plan.points && plan.points.length)
    ? plan.points
    : (plan.detailedPoints || []).map((d) => d && d.text);
  const items = points.map(clean).filter(Boolean);
  if (items.length) {
    if (clean(plan.pointsTitle)) nodes.push(para(document, clean(plan.pointsTitle)));
    const list = document.createElement('ul');
    items.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      list.append(li);
    });
    nodes.push(list);
  }
  const ctas = [plan.firstCta, plan.secondCta].filter((c) => c && c.href);
  ctas.forEach((c, i) => {
    const p = linkPara(document, c, i === 0);
    if (p) nodes.push(p);
  });
  const learn = linkPara(document, plan.link, false);
  if (learn) nodes.push(learn);
  return nodes;
}

/** Panel content for a non-rendered tab: the collection's initial category, first tier of each plan. */
function buildCollectionPanel(document, collection) {
  if (!collection || !Array.isArray(collection.tabs) || !collection.tabs.length) return [];
  const tab = collection.tabs[collection.initialTabIndex || 0] || collection.tabs[0];
  const nodes = [];
  (tab.plans || []).forEach((group) => {
    const plan = Array.isArray(group) ? group[0] : group;
    if (plan) nodes.push(...buildPlanFromData(document, plan));
  });
  return nodes;
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
      const text = itemText(li);
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

    // Inactive tabs are not rendered in the DOM; rebuild them from __NEXT_DATA__.
    const labelTexts = labels.map((l) => clean(l.textContent));
    const collections = findPlanCollections(document, labelTexts) || [];

    labels.forEach((label, i) => {
      const text = labelTexts[i];
      if (!text) return;
      let content = '';
      if (i === activeIndex) {
        content = panelContent;
      } else {
        const collection = collections.find((c) => clean(c.collectionLabel).toLowerCase() === text.toLowerCase())
          || (collections.length === labels.length ? collections[i] : null);
        const nodes = buildCollectionPanel(document, collection);
        if (nodes.length) content = nodes;
      }
      cells.push([text, content]);
    });
  } else if (panelContent.length) {
    cells.push(['Plans', panelContent]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-pricing', cells });
  element.replaceWith(block);
}
