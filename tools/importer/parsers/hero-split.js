/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-split.
 * Source: main header[class*="Region__Element"] (Xero hero region).
 * Block structure (1 column): row 1 = image, row 2 = H1 + subheading + CTA.
 */
export default function parse(element, { document }) {
  const cells = [];

  const image = element.querySelector('img');
  if (image) cells.push([image]);

  const contentCell = [];
  const heading = element.querySelector('h1, h2');
  if (heading) contentCell.push(heading);

  const copyWrapper = element.querySelector('[class*="CopyWrapper"]') || element;
  copyWrapper.querySelectorAll('p').forEach((p) => {
    if (p.textContent.trim()) contentCell.push(p);
  });

  copyWrapper.querySelectorAll('[class*="ButtonGroup__Element"] a[href], a[class*="Button__Element"]').forEach((a) => {
    if (contentCell.some((n) => n.contains && n.contains(a))) return;
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = a.textContent.trim();
    const wrap = document.createElement('p');
    wrap.append(link);
    if (!contentCell.some((n) => n.querySelector && n.querySelector(`a[href="${link.getAttribute('href')}"]`))) {
      contentCell.push(wrap);
    }
  });

  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-split', cells });
  element.replaceWith(block);
}
