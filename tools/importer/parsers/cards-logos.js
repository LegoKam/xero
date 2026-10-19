/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-logos.
 * Source: [class^="ImageBanner__ImagesContainer"] (award badge strip).
 * Block structure (2 columns): one row per logo -> [image | empty].
 * SVG badges are wrapped in div[role="img"][aria-label] with an empty img alt;
 * the aria-label is copied onto a rebuilt img so the badge keeps its alt text.
 */
export default function parse(element, { document }) {
  const cells = [];

  const items = element.querySelectorAll(':scope > [class^="ImageBanner__ImageWrapper"]');
  items.forEach((item) => {
    const srcImg = item.querySelector('img');
    if (!srcImg) return;
    const labelled = item.querySelector('[aria-label]');
    const alt = (srcImg.getAttribute('alt') || '').trim()
      || (labelled ? labelled.getAttribute('aria-label').trim() : '');
    const img = document.createElement('img');
    // Badges are content images, not icons: the default convertIcons rule turns any
    // src ending in ".svg" into a :name: icon token, so add a query to keep it an image.
    let src = srcImg.getAttribute('src') || '';
    if (/\.svg$/i.test(src)) src += '?format=svg';
    img.src = src;
    img.alt = alt;
    cells.push([img, '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-logos', cells });
  element.replaceWith(block);
}
