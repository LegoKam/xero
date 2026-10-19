/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-industry.
 * Sources:
 *  - [class^="PostCardList__Element"] > ul.Row > li.Col > Box > PostCard__Card
 *    (heading with link, optional label span, optional image - glossary cards have none).
 *  - ul.Row > li > ContentCardList__CardWrapper > ContentCard__Element (no heading:
 *    title = link in ContentCard__CardTitleWrapper, optional description paragraph, image).
 * Block structure (2 columns): one row per card -> [image or empty | optional label paragraph,
 *   linked H3 title, description]. The empty image cell is removed by cards-industry.js.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildImage(document, srcImg) {
  if (!srcImg || !srcImg.getAttribute('src') || srcImg.getAttribute('src').startsWith('data:')) return '';
  const img = document.createElement('img');
  img.src = srcImg.getAttribute('src');
  img.alt = (srcImg.getAttribute('alt') || '').trim();
  return img;
}

function linkedHeading(document, title, srcLink) {
  const h3 = document.createElement('h3');
  if (srcLink) {
    const link = document.createElement('a');
    link.href = srcLink.getAttribute('href');
    link.textContent = title;
    h3.append(link);
  } else {
    h3.textContent = title;
  }
  return h3;
}

/** ContentCard: title link in CardTitleWrapper, optional description paragraph, image. */
function parseContentCard(document, card) {
  const img = buildImage(document, card.querySelector('[class^="ContentCard__ImageWrapper"] img, img'));
  const contentCell = [];
  const titleWrap = card.querySelector('[class^="ContentCard__CardTitleWrapper"]') || card;
  const heading = titleWrap.querySelector('h1, h2, h3, h4, h5, h6');
  const srcLink = (heading && heading.querySelector('a[href]')) || titleWrap.querySelector('a[href]');
  const title = clean((heading || srcLink || {}).textContent);
  if (title) contentCell.push(linkedHeading(document, title, srcLink));
  card.querySelectorAll('p').forEach((p) => {
    if (clean(p.textContent) && !p.contains(srcLink)) contentCell.push(p);
  });
  return (img || contentCell.length) ? [img, contentCell] : null;
}

export default function parse(element, { document }) {
  const cells = [];

  // Both card kinds, in document order.
  const cards = [...element.querySelectorAll('[class^="PostCard__Card"], [class^="ContentCard__Element"]')]
    .filter((c, i, all) => !all.some((o) => o !== c && o.contains(c)));

  cards.forEach((card) => {
    if (/^ContentCard__Element/.test(card.className)) {
      const row = parseContentCard(document, card);
      if (row) cells.push(row);
      return;
    }

    const img = buildImage(document, card.querySelector('[class^="PostCard__ImageContainer"] img, img'));

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
      if (title) contentCell.push(linkedHeading(document, title, srcLink));
    }

    card.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim()) contentCell.push(p);
    });

    if (img || contentCell.length) cells.push([img, contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-industry', cells });
  element.replaceWith(block);
}
