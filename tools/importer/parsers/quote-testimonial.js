/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quote-testimonial.
 * Source: Region__Background > Grid__Element containing a customer story. Two shapes:
 *  - CustomerStory (manufacturing, bookkeepers): h2 > q.CustomerStory__Quote, then
 *    CustomerStory__AnnotationWrapper > figure.Caption__Figure (figcaption p + img).
 *  - CustomerStoryV2 (partner-programme): FigureCaption__Wrapper (caption span + img)
 *    and blockquote.CustomerStoryV2__Blockquote (h2 quote + footer attribution).
 * Block structure (1 column): row 1 = image (optional), row 2 = quote text,
 *   row 3 = attribution (name / business caption paragraphs + optional link).
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function textParagraph(document, text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

/** Quote paragraph preserving inline emphasis (the "highlight" oval is decorative). */
function buildQuote(document, quoteEl) {
  const p = document.createElement('p');
  const walk = (node, target) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) {
        target.append(document.createTextNode(c.textContent));
      } else if (c.nodeType === 1) {
        if (c.getAttribute('aria-hidden') === 'true' || c.tagName === 'svg' || c.tagName === 'SVG') return;
        if (c.tagName === 'EM' || c.tagName === 'STRONG' || c.tagName === 'B' || c.tagName === 'I') {
          const em = document.createElement(c.tagName === 'STRONG' || c.tagName === 'B' ? 'strong' : 'em');
          walk(c, em);
          if (clean(em.textContent)) {
            target.append(document.createTextNode(' '));
            target.append(em);
            target.append(document.createTextNode(' '));
          }
        } else {
          walk(c, target);
        }
      }
    });
  };
  walk(quoteEl, p);
  // Normalise whitespace in text nodes without losing the inline elements.
  p.normalize();
  p.childNodes.forEach((n) => {
    if (n.nodeType === 3) n.textContent = n.textContent.replace(/\s+/g, ' ');
  });
  if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, '');
  if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, '');
  return clean(p.textContent) ? p : null;
}

export default function parse(element, { document }) {
  const cells = [];

  // Image
  const srcImg = element.querySelector('[class^="Caption__ChildrenWrapper"] img, [class^="FigureCaption__FigureContent"] img, figure img, img');
  if (srcImg && srcImg.getAttribute('src') && !srcImg.getAttribute('src').startsWith('data:')) {
    const img = document.createElement('img');
    img.src = srcImg.getAttribute('src');
    img.alt = clean(srcImg.getAttribute('alt'));
    cells.push([img]);
  }

  // Quote
  // Ordered fallbacks (a comma list would return the outer blockquote first).
  const quoteEl = ['q[class^="CustomerStory__Quote"]', '[class^="CustomerStoryV2__Quote"]', 'blockquote h2', 'q', 'h2', 'h3']
    .map((s) => element.querySelector(s))
    .find(Boolean);
  const quote = quoteEl ? buildQuote(document, quoteEl) : null;
  if (quote) cells.push([quote]);

  // Attribution: name (V2 footer) + caption text + optional story link
  const attribution = [];
  const seen = new Set();
  const addText = (text) => {
    const t = clean(text);
    if (!t || seen.has(t)) return;
    seen.add(t);
    attribution.push(textParagraph(document, t));
  };

  const footer = element.querySelector('[class^="CustomerStoryV2__Attribution"], blockquote footer');
  if (footer) {
    const parts = [...footer.querySelectorAll('p, cite, span[class^="Typography__Span"]')];
    if (parts.length) parts.forEach((p) => addText(p.textContent));
    else addText(footer.textContent);
  }

  const caption = element.querySelector('figcaption');
  if (caption) {
    const parts = [...caption.querySelectorAll('p, [class^="Typography__Span"]')];
    if (parts.length) parts.forEach((p) => addText(p.textContent));
    else addText(caption.textContent);
  }

  element.querySelectorAll('a[href]').forEach((a) => {
    const text = clean(a.textContent);
    if (!text || seen.has(text)) return;
    seen.add(text);
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    p.append(link);
    attribution.push(p);
  });

  if (attribution.length) cells.push([attribution]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'quote-testimonial', cells });
  element.replaceWith(block);
}
