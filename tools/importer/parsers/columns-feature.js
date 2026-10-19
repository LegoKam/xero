/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature.
 * Source: Row__Element containing Col > Box > Highlight__CopyWrapper (text) + Col (illustration),
 * or the HighlightProofPoints variant: Col > Box > HighlightProofPoints__CopyWrapper (text) +
 * Col > figure.HighlightProofPoints__Figure (img + usually empty figcaption, not migrated).
 * Block structure: one row, two cells -> [text | image], or [image | text] when the source
 * shows the image on the left (copyPosition "right" in __NEXT_DATA__, or reversed DOM/style).
 * Text cell, in source order: heading, paragraphs, tick list (icon titles stripped),
 * sub-feature blocks (h3 + text), standalone links, ButtonGroup CTAs (primary in <strong>),
 * and popover triggers (IconButton) rendered as their label plus the popover content
 * (from a DOM modal or __NEXT_DATA__ popovers[]) when available.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildImage(document, scope) {
  const srcImg = scope && scope.querySelector('img');
  if (!srcImg) return null;
  let src = srcImg.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) return null;
  // Content illustrations served as SVG would otherwise be turned into :icon: tokens.
  if (/\.svg$/i.test(src)) src += '?format=svg';
  const labelled = srcImg.closest('[aria-label]');
  const img = document.createElement('img');
  img.src = src;
  img.alt = (srcImg.getAttribute('alt') || '').trim()
    || (labelled ? labelled.getAttribute('aria-label').trim() : '');
  return img;
}

/* ---------- __NEXT_DATA__ helpers ---------- */

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

/** Component data whose heading matches the block heading. */
function findComponent(objects, headingText) {
  const key = clean(headingText).toLowerCase();
  if (!key) return null;
  return objects.find((o) => typeof o.heading === 'string' && stripTags(o.heading) === key
    && ('copyPosition' in o || 'popovers' in o)) || null;
}

function popoverList(component) {
  if (!component || !Array.isArray(component.popovers)) return [];
  return component.popovers.map((p) => (p && p.popover ? p.popover : p)).filter(Boolean);
}

function findPopover(objects, component, label) {
  const key = clean(label).toLowerCase();
  const match = (p) => clean(p.button).toLowerCase() === key;
  const own = popoverList(component).find(match);
  if (own) return own;
  for (const o of objects) {
    const hit = popoverList(o).find(match);
    if (hit) return hit;
  }
  return null;
}

/* ---------- content builders ---------- */

function para(document, text) {
  const p = document.createElement('p');
  p.textContent = text;
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

/** Heading copy without decorative (aria-hidden / svg) accessories. */
function cleanHeading(heading) {
  heading.querySelectorAll('[aria-hidden="true"], svg').forEach((n) => n.remove());
  return heading;
}

/** List item text without the tick icon's hidden svg <title> ("Included"). */
function itemText(li) {
  const span = li.querySelector('[class^="Typography__Span"]');
  if (span) return clean(span.textContent);
  const copy = li.cloneNode(true);
  copy.querySelectorAll('svg, title').forEach((s) => s.remove());
  return clean(copy.textContent);
}

function buildList(document, srcList) {
  const list = document.createElement(srcList.tagName === 'OL' ? 'ol' : 'ul');
  srcList.querySelectorAll(':scope > li').forEach((li) => {
    const text = itemText(li);
    if (!text) return;
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  });
  return list.children.length ? list : null;
}

function buildButtonGroup(document, group) {
  const links = [...group.querySelectorAll('a[href]')];
  let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ''));
  if (!primary && group.tagName === 'UL') [primary] = links;
  return links
    .map((a) => linkPara(document, a.getAttribute('href'), a.textContent, a === primary))
    .filter(Boolean);
}

/** Popover content from a body-level modal whose heading/label matches the trigger. */
function domPopover(document, label) {
  const key = clean(label).toLowerCase();
  const modals = [...document.querySelectorAll('[class*="Modal__Element"], [class*="Modal__Background"], [role="dialog"]')];
  return modals.find((m) => {
    const text = clean(m.textContent).toLowerCase();
    return text && (m.getAttribute('aria-label') || '').toLowerCase() === key;
  }) || null;
}

function buildPopover(document, ctx, trigger) {
  const label = clean(trigger.textContent);
  if (!label) return [];
  const nodes = [para(document, label)];

  const modal = domPopover(document, label);
  if (modal) {
    modal.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol').forEach((n) => {
      if (n.closest('ul, ol') && !/^(UL|OL)$/.test(n.tagName)) return;
      if (/^(UL|OL)$/.test(n.tagName)) {
        const list = buildList(document, n);
        if (list) nodes.push(list);
      } else if (clean(n.textContent)) {
        nodes.push(/^H/.test(n.tagName) ? para(document, clean(n.textContent)) : n);
      }
    });
    modal.querySelectorAll('a[href]').forEach((a) => {
      const p = linkPara(document, a.getAttribute('href'), a.textContent, false);
      if (p) nodes.push(p);
    });
    return nodes;
  }

  const data = findPopover(ctx.objects, ctx.component, label);
  if (data) {
    if (clean(data.heading)) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = clean(data.heading);
      p.append(strong);
      nodes.push(p);
    }
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
  }
  return nodes;
}

/** Walk the copy wrapper in document order and collect the text-cell nodes. */
function collectText(document, root, ctx, out) {
  [...root.children].forEach((child) => {
    const tag = child.tagName;
    const cls = typeof child.className === 'string' ? child.className : '';
    if (/^H[1-6]$/.test(tag)) {
      if (clean(child.textContent)) out.push(cleanHeading(child));
    } else if (tag === 'P') {
      if (clean(child.textContent)) out.push(child);
    } else if (tag === 'UL' || tag === 'OL') {
      if (/ButtonGroup__Element/.test(cls)) {
        out.push(...buildButtonGroup(document, child));
      } else {
        const list = buildList(document, child);
        if (list) out.push(list);
      }
    } else if (/ButtonGroup__Element/.test(cls)) {
      out.push(...buildButtonGroup(document, child));
    } else if (/IconButton__Wrapper/.test(cls)) {
      out.push(...buildPopover(document, ctx, child));
    } else if (tag === 'A' && child.getAttribute('href')) {
      const p = linkPara(document, child.getAttribute('href'), child.textContent, /Button__Element/.test(cls));
      if (p) out.push(p);
    } else if (child.querySelector && child.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, a[href], [class^="IconButton__Wrapper"]')) {
      // Sub-feature blocks (div > h3 + p), Link__Wrapper spans, other wrappers.
      collectText(document, child, ctx, out);
    }
  });
}

/** True when the source renders the image column before (left of) the copy column. */
function imageFirst(element, cols, textCol, imageCol, component) {
  if (!textCol || !imageCol) return false;
  if (component && typeof component.copyPosition === 'string') {
    return component.copyPosition.toLowerCase() === 'right';
  }
  const style = (element.getAttribute('style') || '').replace(/\s+/g, '');
  if (/flex-direction:row-reverse/i.test(style) || /row-?reverse|reverse/i.test(element.className || '')) {
    return cols.indexOf(imageCol) < cols.indexOf(textCol) ? false : true;
  }
  const order = (el) => {
    const m = (el.getAttribute('style') || '').match(/order:\s*(-?\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };
  const ot = order(textCol);
  const oi = order(imageCol);
  if (ot !== null || oi !== null) return (oi || 0) < (ot || 0);
  return cols.indexOf(imageCol) < cols.indexOf(textCol);
}

const COPY_SELECTOR = '[class^="Highlight__CopyWrapper"], [class^="HighlightProofPoints__CopyWrapper"]';

export default function parse(element, { document }) {
  const cols = [...element.querySelectorAll(':scope > [class*="Col__Element"]')];
  const copy = element.querySelector(COPY_SELECTOR);
  const textCol = cols.find((c) => c.querySelector(COPY_SELECTOR)) || null;
  const imageCol = cols.find((c) => c !== textCol && c.querySelector('[class^="HighlightProofPoints__Figure"] img'))
    || cols.find((c) => c !== textCol && c.querySelector('img'))
    || cols.find((c) => c !== textCol) || null;

  const headingEl = copy && copy.querySelector('h1, h2, h3, h4, h5, h6');
  const objects = nextDataObjects(document);
  const component = headingEl ? findComponent(objects, headingEl.textContent) : null;
  const ctx = { objects, component };

  const textCell = [];
  if (copy) collectText(document, copy, ctx, textCell);

  const img = buildImage(document, imageCol);
  const reversed = img && imageFirst(element, cols, textCol, imageCol, component);
  const cells = [reversed ? [img, textCell] : [textCell, img || '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-feature', cells });
  element.replaceWith(block);
}
