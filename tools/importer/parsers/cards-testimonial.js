/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-testimonial.
 * Source: [class^="TestimonialCards__RowWrapper"] > Row > Col > TestimonialCards__FlexRow
 *   > TestimonialCards__CardCol > TestimonialCard__CardWrapper. Each card:
 *   TestimonialCard__ReviewSiteWrapper (LogoWrapper img + site name <p>),
 *   star-rating svg (<title> "5.0 out of 5 stars"), TestimonialCard__Quote div,
 *   reviewer name <p>.
 * Block structure (2 columns, cards convention): one row per card ->
 *   [logo image + site name paragraph | rating paragraph, quote paragraph(s), **name**, optional extra paragraphs].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function para(document, text, bold) {
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

/** Rating text from the star svg (<title>, aria-label or aria-labelledby). */
function ratingText(card) {
  const svgs = [...card.querySelectorAll('svg')];
  for (const svg of svgs) {
    const title = svg.querySelector('title');
    let label = clean(title && title.textContent) || clean(svg.getAttribute('aria-label'));
    if (!label) {
      const ref = svg.getAttribute('aria-labelledby');
      const refEl = ref && card.ownerDocument.getElementById(ref);
      label = clean(refEl && refEl.textContent);
    }
    if (/\d+(\.\d+)?\s*(out of|of|\/)\s*\d+/i.test(label)) return label;
  }
  return '';
}

/** Quote paragraphs: keep authored <p>s inside the quote div, otherwise one paragraph of its text. */
function quoteParagraphs(document, quoteEl) {
  if (!quoteEl) return [];
  const ps = [...quoteEl.querySelectorAll('p')].filter((p) => clean(p.textContent));
  if (ps.length) return ps.map((p) => para(document, clean(p.textContent)));
  const text = clean(quoteEl.textContent);
  return text ? [para(document, text)] : [];
}

export default function parse(element, { document }) {
  const cells = [];

  let cards = [...element.querySelectorAll('[class^="TestimonialCard__CardWrapper"]')];
  if (!cards.length) cards = [...element.querySelectorAll('[class^="TestimonialCards__CardCol"]')];

  cards.forEach((card) => {
    // Cell 1: review-site logo + site name
    const sourceCell = [];
    const site = card.querySelector('[class^="TestimonialCard__ReviewSiteWrapper"]');
    const srcImg = (site || card).querySelector('img');
    if (srcImg && srcImg.getAttribute('src') && !srcImg.getAttribute('src').startsWith('data:')) {
      const img = document.createElement('img');
      img.src = srcImg.getAttribute('src');
      img.alt = clean(srcImg.getAttribute('alt'));
      sourceCell.push(img);
    }
    const siteName = site ? clean([...site.querySelectorAll('p')].map((p) => p.textContent).join(' ')) : '';
    if (siteName) sourceCell.push(para(document, siteName));

    // Cell 2: rating, quote, reviewer name, optional business/role
    const body = [];
    const rating = ratingText(card);
    if (rating) body.push(para(document, rating));

    const quoteEl = card.querySelector('[class^="TestimonialCard__Quote"]');
    body.push(...quoteParagraphs(document, quoteEl));

    const people = [...card.querySelectorAll('p')]
      .filter((p) => !(site && site.contains(p)) && !(quoteEl && quoteEl.contains(p)))
      .map((p) => clean(p.textContent))
      .filter(Boolean);
    people.forEach((text, i) => body.push(para(document, text, i === 0)));

    if (sourceCell.length || body.length) cells.push([sourceCell.length ? sourceCell : '', body]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-testimonial', cells });
  element.replaceWith(block);
}
