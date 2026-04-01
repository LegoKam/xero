/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-split. Base: hero.
 * Source: https://www.xero.com/au/ (section #content--2109965610)
 *
 * Source DOM structure (from captured cleaned.html):
 * - h1.Heading__Element (heading)
 * - p.Typography__Paragraph (description)
 * - a.Button__Element (CTA link with span.Button__Backplate text)
 * - img.LeftAligned__CoverImage (hero image)
 *
 * Block library target structure (hero):
 * Row 1: Background image (optional)
 * Row 2: Title + Subheading + CTA
 *
 * For hero-split variant: image in row 1, text content in row 2
 */
export default function parse(element, { document }) {
  // Extract heading (h1 from captured DOM)
  const heading = element.querySelector('h1, h2, [class*="Heading__Element"]');

  // Extract description paragraph (from captured DOM)
  const description = element.querySelector('p[class*="Typography__Paragraph"], p[class*="Typography"]');

  // Extract CTA button/link (from captured DOM)
  const ctaLink = element.querySelector('a[class*="Button__Element"], a[href*="/pricing"], a[href*="/signup"]');

  // Extract hero image (from captured DOM: img.LeftAligned__CoverImage)
  const heroImage = element.querySelector('img[class*="CoverImage"], img[class*="LeftAligned"], [class*="ImageCol"] img, [class*="ImageWrapper"] img');

  // Build cells to match hero block library structure
  const cells = [];

  // Row 1: Image (background/hero image)
  if (heroImage) {
    cells.push([heroImage]);
  }

  // Row 2: Content (heading + description + CTA)
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (description) contentCell.push(description);
  if (ctaLink) contentCell.push(ctaLink);
  if (contentCell.length > 0) {
    cells.push(contentCell);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-split', cells });
  element.replaceWith(block);
}
