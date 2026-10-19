/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-intro.
 * Source: Row__Element with Col > h2 + StepsHeading__ArrowWrapper (decorative arrow) and
 * Col > h3 + p (+ optional IconButton popover trigger, e.g. "Inventory" on manufacturing).
 * Block structure: one row, two cells -> [H2 | sub-heading, paragraph(s), links].
 * The IconButton is a popover trigger (not eyebrow text): it is kept as its label plus the
 * popover content from __NEXT_DATA__ popovers[] (heading, description, proof points, CTA).
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function nextDataObjects(document) {
  const script = document.querySelector('#__NEXT_DATA__');
  if (!script) return [];
  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch (e) {
    return [];
  }
  const objects = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    objects.push(node);
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  walk(data);
  return objects;
}

function stripTags(html) {
  return clean(String(html || '').replace(/<[^>]*>/g, ' ')).toLowerCase();
}

function popoverList(o) {
  if (!o || !Array.isArray(o.popovers)) return [];
  return o.popovers.map((p) => (p && p.popover ? p.popover : p)).filter(Boolean);
}

function findPopover(objects, headingText, label) {
  const key = clean(label).toLowerCase();
  const match = (p) => clean(p.button).toLowerCase() === key;
  const hk = clean(headingText).toLowerCase();
  const component = objects.find((o) => typeof o.heading === 'string' && stripTags(o.heading) === hk && Array.isArray(o.popovers));
  const own = popoverList(component).find(match);
  if (own) return own;
  for (const o of objects) {
    const hit = popoverList(o).find(match);
    if (hit) return hit;
  }
  return null;
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

function linkPara(document, href, text, primary) {
  if (!href || !clean(text)) return null;
  const link = document.createElement('a');
  link.href = href;
  link.textContent = clean(text);
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

function buildPopover(document, objects, headingText, trigger) {
  const label = clean(trigger.textContent);
  if (!label) return [];
  const nodes = [para(document, label)];
  const data = findPopover(objects, headingText, label);
  if (!data) return nodes;
  if (clean(data.heading)) nodes.push(para(document, clean(data.heading), true));
  if (clean(data.description)) nodes.push(para(document, clean(data.description)));
  const points = (data.proofPoints || []).filter((pp) => pp && (clean(pp.headline) || clean(pp.shortCopy)));
  if (points.length) {
    const list = document.createElement('ul');
    points.forEach((pp) => {
      const li = document.createElement('li');
      if (clean(pp.headline)) {
        const strong = document.createElement('strong');
        strong.textContent = clean(pp.headline);
        li.append(strong);
        if (clean(pp.shortCopy)) li.append(document.createTextNode(` ${clean(pp.shortCopy)}`));
      } else {
        li.textContent = clean(pp.shortCopy);
      }
      list.append(li);
    });
    nodes.push(list);
  }
  const cta = linkPara(document, data.ctaHref, data.ctaText, false);
  if (cta) nodes.push(cta);
  return nodes;
}

function collect(document, root, ctx, out) {
  [...root.children].forEach((child) => {
    const tag = child.tagName;
    const cls = typeof child.className === 'string' ? child.className : '';
    if (/StepsHeading__ArrowWrapper/.test(cls) || tag === 'svg' || tag === 'SVG') return;
    if (/^H[1-6]$/.test(tag) || tag === 'P' || tag === 'UL' || tag === 'OL') {
      if (clean(child.textContent)) out.push(child);
    } else if (/IconButton__Wrapper/.test(cls)) {
      out.push(...buildPopover(document, ctx.objects, ctx.heading, child));
    } else if (/ButtonGroup__Element/.test(cls)) {
      const links = [...child.querySelectorAll('a[href]')];
      let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ''));
      if (!primary && tag === 'UL') [primary] = links;
      links.forEach((a) => {
        const p = linkPara(document, a.getAttribute('href'), a.textContent, a === primary);
        if (p) out.push(p);
      });
    } else if (tag === 'A' && child.getAttribute('href')) {
      const p = linkPara(document, child.getAttribute('href'), child.textContent, /Button__Element/.test(cls));
      if (p) out.push(p);
    } else if (child.querySelector && child.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, a[href], [class^="IconButton__Wrapper"]')) {
      collect(document, child, ctx, out);
    }
  });
}

export default function parse(element, { document }) {
  const cols = [...element.querySelectorAll(':scope > [class*="Col__Element"]')];
  const headingCol = cols.find((c) => c.querySelector('[class^="StepsHeading__ArrowWrapper"]')) || cols[0] || element;
  const bodyCols = cols.filter((c) => c !== headingCol);

  const h2 = headingCol.querySelector('h1, h2, h3');
  const headingText = h2 ? clean(h2.textContent) : '';
  const ctx = { objects: nextDataObjects(document), heading: headingText };

  // Cell 1: heading (plus any other copy in the heading column, e.g. eyebrow text).
  const headingCell = [];
  collect(document, headingCol, ctx, headingCell);

  // Cell 2: sub-heading, paragraph(s), links, popover content.
  const bodyCell = [];
  bodyCols.forEach((col) => collect(document, col, ctx, bodyCell));

  const cells = [[headingCell, bodyCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-intro', cells });
  element.replaceWith(block);
}
