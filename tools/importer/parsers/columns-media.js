/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-media. Base: columns.
 * Source: https://www.xero.com/au/
 *
 * Used in two sections:
 * 1. Awards Ribbon (#content-1585018489) - grid of award badge images
 *    Source: [class*='ImageBanner__ImagesContainer'] with multiple img elements
 * 2. JAX AI Feature (#content-431188245) - text + checklist left, image right
 *    Source: [class*='Highlight__CopyWrapper'] with h2, p, ul, link + image
 *
 * Block library target structure (columns):
 * Each row has N columns (cells side by side).
 * Cell can contain text, images, or other inline elements.
 *
 * For columns-media variant:
 * - Awards: row of images in columns (4 per row, 2 rows)
 * - JAX: col1 = text content (h2 + p + list + CTA), col2 = image
 */
export default function parse(element, { document }) {
  const cells = [];

  // Detect which instance: Awards (ImageBanner) or JAX (Highlight/CopyWrapper)
  const imageBanner = element.querySelector('[class*="ImageBanner__ImagesContainer"]');
  const copyWrapper = element.querySelector('[class*="Highlight__CopyWrapper"], [class*="CopyWrapper"]');

  if (imageBanner) {
    // Awards Ribbon: Extract all award badge images
    const images = Array.from(imageBanner.querySelectorAll('img'));

    // Split images into rows of 4 to match the 2-row grid layout
    const rowSize = 4;
    for (let i = 0; i < images.length; i += rowSize) {
      const rowImages = images.slice(i, i + rowSize);
      cells.push(rowImages);
    }
  } else if (copyWrapper) {
    // JAX AI Feature: Text content on left, image on right
    const heading = element.querySelector('h2, [class*="Heading__Element"]');
    const description = element.querySelector('p[class*="Typography__Paragraph"], p[class*="Typography"]');
    const checklist = element.querySelector('ul[class*="List__Element"], ul');
    const ctaLink = element.querySelector('a[class*="Link__Element"], a[href*="/ai-in-accounting"]');
    const image = element.querySelector('[class*="ImageWrapper"] img, [class*="Picture__"] img, img[class*="Image__"]');

    // Column 1: Text content
    const textCol = [];
    if (heading) textCol.push(heading);
    if (description) textCol.push(description);
    if (checklist) textCol.push(checklist);
    if (ctaLink) textCol.push(ctaLink);

    // Column 2: Image
    const imageCol = [];
    if (image) imageCol.push(image);

    cells.push([textCol, imageCol]);
  } else {
    // Fallback: try to extract any heading + image pair
    const heading = element.querySelector('h2, h3');
    const image = element.querySelector('img');
    const textCol = [];
    const imageCol = [];
    if (heading) textCol.push(heading);
    if (image) imageCol.push(image);
    if (textCol.length > 0 || imageCol.length > 0) {
      cells.push([textCol, imageCol]);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
