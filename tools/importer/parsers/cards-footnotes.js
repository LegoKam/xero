/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-footnotes.
 * Source: main Col__Element whose direct div children each hold one footnote paragraph,
 * plus a trailing div with the Canstar source link.
 * Block structure (1 column, cards no-images): one row per footnote; final row = source link.
 * The empty H2 and empty spacer paragraph in source are not migrated.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];

  element.querySelectorAll(':scope > div').forEach((item) => {
    const contentCell = [];

    item.querySelectorAll('p').forEach((p) => {
      if (clean(p.textContent)) contentCell.push(p);
    });

    item.querySelectorAll('a[href]').forEach((a) => {
      if (a.closest('p')) return;
      const text = clean(a.textContent);
      if (!text) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      contentCell.push(p);
    });

    if (contentCell.length) cells.push([contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-footnotes', cells });
  element.replaceWith(block);
}
