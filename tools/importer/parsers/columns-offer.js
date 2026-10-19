/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-offer.
 * Source: Row__Element with Col > Box > SinglePlanHighlight__CopyWrapper (text + CTAs)
 * and Col > SinglePlanHighlight__PlanWrapper (offer card).
 * Block structure: one row, two cells ->
 *   [H2 + paragraph + CTA links | label + price paragraph ($0) + note + tick list].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function textParagraph(document, text, bold = false) {
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

export default function parse(element, { document }) {
  const copy = element.querySelector('[class^="SinglePlanHighlight__CopyWrapper"]');
  const plan = element.querySelector('[class^="SinglePlanHighlight__PlanWrapper"]');

  // Left column: heading, intro paragraph, CTA links.
  // The "Any plan" span in the copy wrapper is a screen-reader aria-describedby target; skip it.
  const textCell = [];
  if (copy) {
    const heading = copy.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading && clean(heading.textContent)) textCell.push(heading);

    copy.querySelectorAll(':scope > p').forEach((p) => {
      if (p.textContent.trim()) textCell.push(p);
    });

    copy.querySelectorAll('a[href]').forEach((a) => {
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
      textCell.push(p);
    });
  }

  // Right column: offer card.
  const cardCell = [];
  if (plan) {
    const label = plan.querySelector('h1, h2, h3, h4, h5, h6');
    if (label && clean(label.textContent)) cardCell.push(textParagraph(document, clean(label.textContent)));

    plan.querySelectorAll('p').forEach((p) => {
      const text = clean(p.textContent);
      if (!text) return;
      // Price paragraph ("$0") is a stat, kept bold so the block can style it large.
      const isPrice = /PriceDetails/.test(p.className) || !!p.querySelector('strong');
      cardCell.push(isPrice
        ? textParagraph(document, text.replace(/\s+/g, ''), true)
        : textParagraph(document, text));
    });

    const srcList = plan.querySelector('ul, ol');
    if (srcList) {
      const list = document.createElement('ul');
      srcList.querySelectorAll(':scope > li').forEach((li) => {
        const text = clean(li.textContent);
        if (!text) return;
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });
      if (list.children.length) cardCell.push(list);
    }
  }

  const cells = [[textCell, cardCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-offer', cells });
  element.replaceWith(block);
}
