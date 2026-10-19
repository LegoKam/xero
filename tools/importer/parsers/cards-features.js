/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-features.
 * Source: Row__Element > Col > Box > BoxSet__Content > BoxItem__Element. Two shapes:
 *  - homepage: ul.Row > li.Col, item = tick icon + h2 title + p description;
 *  - manufacturing / guides: div.Row > div.Col, item = h2 (often linked) + p (+ link p).
 * Block structure (1 column): one row per feature -> [title + description (+ link)].
 * Unlinked titles become a bold paragraph (block contract). Linked titles keep their
 * heading element and link (a bold linked paragraph would be decorated as a button).
 * The tick icon is decorative (added by block CSS) and is not migrated.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];

  element.querySelectorAll('[class^="BoxItem__Element"]').forEach((item) => {
    const contentCell = [];

    const heading = item.querySelector('h1, h2, h3, h4, h5, h6');
    const title = heading ? clean(heading.textContent) : '';
    if (title) {
      const srcLink = heading.querySelector('a[href]');
      if (srcLink) {
        const h = document.createElement(heading.tagName.toLowerCase());
        const link = document.createElement('a');
        link.href = srcLink.getAttribute('href');
        link.textContent = title;
        h.append(link);
        contentCell.push(h);
      } else {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = title;
        p.append(strong);
        contentCell.push(p);
      }
    }

    item.querySelectorAll('p').forEach((p) => {
      if (clean(p.textContent)) contentCell.push(p);
    });

    if (contentCell.length) cells.push([contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-features', cells });
  element.replaceWith(block);
}
