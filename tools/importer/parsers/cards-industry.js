/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-industry.
 * Source: [class^="PostCardList__Element"] > ul.Row > li.Col > Box > PostCard__Card.
 * Block structure (2 columns): one row per card -> [image | optional label paragraph, linked H3 title, description].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];

  element.querySelectorAll('[class^="PostCard__Card"]').forEach((card) => {
    const srcImg = card.querySelector('[class^="PostCard__ImageContainer"] img, img');
    let img = '';
    if (srcImg && srcImg.getAttribute('src') && !srcImg.getAttribute('src').startsWith('data:')) {
      img = document.createElement('img');
      img.src = srcImg.getAttribute('src');
      img.alt = (srcImg.getAttribute('alt') || '').trim();
    }

    const contentCell = [];

    // Category label above the title (e.g. "App"); empty on most card lists.
    const labelEl = card.querySelector(':scope > [class^="Typography__Span"]');
    const label = labelEl ? clean(labelEl.textContent) : '';
    if (label) {
      const p = document.createElement('p');
      p.textContent = label;
      contentCell.push(p);
    }

    const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      const title = clean(heading.textContent);
      const srcLink = heading.querySelector('a[href]') || card.querySelector('a[href]');
      const h3 = document.createElement('h3');
      if (srcLink) {
        const link = document.createElement('a');
        link.href = srcLink.getAttribute('href');
        link.textContent = title;
        h3.append(link);
      } else {
        h3.textContent = title;
      }
      if (title) contentCell.push(h3);
    }

    card.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim()) contentCell.push(p);
    });

    if (img || contentCell.length) cells.push([img, contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-industry', cells });
  element.replaceWith(block);
}
