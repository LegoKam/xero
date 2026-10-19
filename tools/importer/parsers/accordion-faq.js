/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq.
 * Source: dl[class^="Accordion__Element"] > dt.AccordionItem__Term (button > title span)
 *   + dd.AccordionItem__Detail. Each dd renders the answer twice (mobile + desktop
 *   Responsive__Wrapper copies); only the first copy is used.
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

  element.querySelectorAll(':scope > dt').forEach((dt) => {
    const titleEl = dt.querySelector('[class^="AccordionItem__Title"] [class^="Typography__Span"]')
      || dt.querySelector('[class^="AccordionItem__Title"]')
      || dt;
    const question = clean(titleEl.textContent);

    // Pair dt with its dd: prefer aria-controls, fall back to the next sibling dd.
    const btn = dt.querySelector('[aria-controls]');
    let dd = null;
    const controls = btn && btn.getAttribute('aria-controls');
    if (controls) {
      dd = [...element.querySelectorAll(':scope > dd')].find((d) => d.id === controls) || null;
    }
    if (!dd) {
      let n = dt.nextElementSibling;
      while (n && n.tagName !== 'DD' && n.tagName !== 'DT') n = n.nextElementSibling;
      if (n && n.tagName === 'DD') dd = n;
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
