/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-grid. Base: cards.
 * Source: https://www.xero.com/au/
 *
 * Used in four sections:
 * 1. Feature Highlights (#content--337345242) - icon + heading + description
 *    Source: [class*='BoxItem__Element'] items with icon SVG, h2, p
 * 2. Pricing Plans (#content--669239732) - plan cards with h3, prices, CTAs
 *    Source: [class*='PlansCompactV2__PlanRow'] with PlanCard elements
 * 3. Business Type Cards (#content-677870770) - image + linked heading + description
 *    Source: [class*='PostCard__Card'] with img, h3 link, p
 * 4. Content Tiles (#content-2084693112) - heading + description + CTA + image
 *    Source: [class*='Block__Element'] tiles with h2, p, link, img
 *
 * Block library target structure (cards):
 * 2 columns per row: col1 = image/icon, col2 = text content (heading + description + CTA)
 * Each row = one card
 */
export default function parse(element, { document }) {
  const cells = [];

  // Detect which card instance based on DOM structure
  const boxItems = element.querySelectorAll('[class*="BoxItem__Element"], [class*="BoxItem"]');
  const planCards = element.querySelectorAll('[class*="PlanCard__Element"], [class*="PlanCard"]');
  const postCards = element.querySelectorAll('[class*="PostCard__Card"], [class*="PostCard"]');
  const blockTiles = element.querySelectorAll('[class*="Block__Element-sc"]');

  if (boxItems.length > 0) {
    // Feature Highlights: icon + heading + description per card
    boxItems.forEach((item) => {
      const icon = item.querySelector('img, svg, [class*="IconWrapper"] img');
      const heading = item.querySelector('h2, h3, [class*="Heading__Element"]');
      const desc = item.querySelector('p[class*="Typography"], p');

      const imageCell = [];
      if (icon) imageCell.push(icon);

      const textCell = [];
      if (heading) textCell.push(heading);
      if (desc) textCell.push(desc);

      cells.push([imageCell, textCell]);
    });
  } else if (planCards.length > 0) {
    // Pricing Plans: plan name + price + description + CTAs per card
    planCards.forEach((card) => {
      const planName = card.querySelector('h3, [class*="Heading__Element"]');
      const paragraphs = Array.from(card.querySelectorAll('p[class*="Typography"], p'));
      const ctaLinks = Array.from(card.querySelectorAll('a[class*="Button__Element"], a[class*="Link__Element"], a[href]'));
      const badge = card.querySelector('[class*="Badge"], [class*="Ribbon"], [class*="Tag"]');

      // For pricing cards, no image column - use single column with all content
      const textCell = [];
      if (badge) textCell.push(badge);
      if (planName) textCell.push(planName);
      paragraphs.forEach((p) => textCell.push(p));
      ctaLinks.forEach((cta) => textCell.push(cta));

      cells.push([textCell]);
    });
  } else if (postCards.length > 0) {
    // Business Type Cards: image + linked heading + description
    postCards.forEach((card) => {
      const image = card.querySelector('img, picture img');
      const heading = card.querySelector('h3, h2, [class*="Heading"]');
      const headingLink = card.querySelector('a[class*="Link"], h3 a, h2 a');
      const desc = card.querySelector('p[class*="Typography"], p');

      const imageCell = [];
      if (image) imageCell.push(image);

      const textCell = [];
      if (headingLink && heading) {
        // Wrap heading text in the link
        textCell.push(headingLink.closest('h3, h2') || heading);
      } else if (heading) {
        textCell.push(heading);
      }
      if (desc) textCell.push(desc);

      cells.push([imageCell, textCell]);
    });
  } else if (blockTiles.length > 0) {
    // Content Tiles: heading + description + CTA + image per tile
    blockTiles.forEach((tile) => {
      const heading = tile.querySelector('h2, h3, [class*="Heading"]');
      const desc = tile.querySelector('p[class*="Typography"], p');
      const ctaLink = tile.querySelector('a[class*="Link__Element"], a[class*="Button"], a[href]');
      const image = tile.querySelector('img, picture img');

      const imageCell = [];
      if (image) imageCell.push(image);

      const textCell = [];
      if (heading) textCell.push(heading);
      if (desc) textCell.push(desc);
      if (ctaLink) textCell.push(ctaLink);

      cells.push([imageCell, textCell]);
    });
  } else {
    // Fallback: generic card extraction
    const items = element.querySelectorAll('li, [class*="Card"], [class*="Item"]');
    if (items.length > 0) {
      items.forEach((item) => {
        const image = item.querySelector('img');
        const heading = item.querySelector('h2, h3, h4');
        const desc = item.querySelector('p');
        const link = item.querySelector('a[href]');

        const imageCell = [];
        if (image) imageCell.push(image);

        const textCell = [];
        if (heading) textCell.push(heading);
        if (desc) textCell.push(desc);
        if (link) textCell.push(link);

        cells.push([imageCell, textCell]);
      });
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-grid', cells });
  element.replaceWith(block);
}
