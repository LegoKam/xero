/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq.
 * Source: dl[class^="Accordion__Element"] > dt.AccordionItem__Term (button > title span)
 *   + dd.AccordionItem__Detail, or the div variant div[class^="Accordion__Element"] >
 *   div.AccordionItem__Term (heading > button > title) + div.AccordionItem__Detail.
 *   AccordionV3 answers sit in AccordionItem__Content > AccordionV3__RteContent.
 *   Each detail renders the answer twice (mobile + desktop Responsive__Wrapper copies);
 *   only the first copy is used.
 * Block structure (2 columns): one row per item -> [question text | answer rich text].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function linkParagraph(document, a) {
  const text = clean(a.textContent);
  if (!text) return null;
  const link = document.createElement('a');
  link.href = a.getAttribute('href');
  link.textContent = text;
  const p = document.createElement('p');
  p.append(link);
  return p;
}

/** Rich-text answer nodes (paragraphs, lists, headings, standalone links) from one content copy. */
function buildAnswer(document, content) {
  const nodes = [];
  const seenText = new Set();
  const walk = (parent) => {
    [...parent.children].forEach((child) => {
      const tag = child.tagName;
      if (/^(P|UL|OL|H[1-6]|TABLE|BLOCKQUOTE)$/.test(tag)) {
        const text = clean(child.textContent);
        if (!text || seenText.has(text)) return;
        seenText.add(text);
        nodes.push(child);
      } else if (tag === 'A' && child.getAttribute('href')) {
        const p = linkParagraph(document, child);
        if (p) nodes.push(p);
      } else if (child.querySelector && child.querySelector('a[href], p, ul, ol, h1, h2, h3, h4, h5, h6')) {
        walk(child);
      } else {
        const text = clean(child.textContent);
        if (text && !seenText.has(text) && !/^(SVG|BUTTON)$/i.test(tag)) {
          seenText.add(text);
          const p = document.createElement('p');
          p.textContent = text;
          nodes.push(p);
        }
      }
    });
  };
  walk(content);
  return nodes;
}

export default function parse(element, { document }) {
  const cells = [];

  const isTerm = (n) => n.tagName === 'DT' || /^AccordionItem__Term/.test(n.className || '');
  const isDetail = (n) => n.tagName === 'DD' || /^AccordionItem__Detail/.test(n.className || '');
  const kids = [...element.children];
  // Tolerate one wrapper level per item (term + detail inside a per-item div).
  const terms = kids.some(isTerm)
    ? kids.filter(isTerm)
    : [...element.querySelectorAll(':scope > * > dt, :scope > * > [class^="AccordionItem__Term"]')];
  const details = [...element.querySelectorAll('dd, [class^="AccordionItem__Detail"]')]
    .filter((d, i, all) => !all.some((o) => o !== d && o.contains(d)));

  terms.forEach((dt) => {
    const titleEl = dt.querySelector('[class^="AccordionItem__Title"] [class^="Typography__Span"]')
      || dt.querySelector('[class^="AccordionItem__Title"] b, [class^="AccordionItem__Title"] strong')
      || dt.querySelector('[class^="AccordionItem__Title"]')
      || dt;
    const question = clean(titleEl.textContent);

    // Pair term with its detail: prefer aria-controls, fall back to the next sibling detail.
    const btn = dt.querySelector('[aria-controls]');
    let dd = null;
    const controls = btn && btn.getAttribute('aria-controls');
    if (controls) {
      dd = details.find((d) => d.id === controls) || null;
    }
    if (!dd) {
      let n = dt.nextElementSibling;
      while (n && !isDetail(n) && !isTerm(n)) n = n.nextElementSibling;
      if (n && isDetail(n)) dd = n;
    }

    let answer = [];
    if (dd) {
      // Mobile/desktop duplicates: take the first content copy only.
      const content = dd.querySelector('[class^="AccordionItem__Content"]')
        || dd.querySelector('[class^="Responsive__Wrapper"]')
        || dd;
      answer = buildAnswer(document, content);
    }

    if (question || answer.length) cells.push([question, answer]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
