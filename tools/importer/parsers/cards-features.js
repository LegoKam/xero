/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-features.
 * Source: ul.Row__Element > li.Col > Box > BoxSet__Content > BoxItem__Element (tick + title + text).
 * Block structure (1 column): one row per feature -> [bold title paragraph + description].
 * The tick icon is decorative (added by block CSS) and is not migrated.
 */
export default function parse(element, { document }) {
  const cells = [];

  element.querySelectorAll('[class^="BoxItem__Element"]').forEach((item) => {
    const contentCell = [];

    const heading = item.querySelector('h1, h2, h3, h4, h5, h6');
    const title = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';
    if (title) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = title;
      p.append(strong);
      contentCell.push(p);
    }

    item.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim()) contentCell.push(p);
    });

    if (contentCell.length) cells.push([contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-features', cells });
  element.replaceWith(block);
}
