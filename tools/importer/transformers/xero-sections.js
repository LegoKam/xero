/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Xero AU section breaks and section-metadata.
 * Processes sections from payload.template.sections to insert <hr> breaks
 * and section-metadata blocks with styles.
 * Runs in afterTransform only (after block parsing).
 * Section selectors from captured DOM of https://www.xero.com/au/
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const { template } = payload || {};
    if (!template || !template.sections || template.sections.length < 2) return;

    const { document } = element.ownerDocument ? { document: element.ownerDocument } : { document: element.getRootNode() };
    const sections = template.sections;

    // Process sections in reverse order so DOM insertions don't shift positions
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const selectorList = Array.isArray(section.selector) ? section.selector : [section.selector];

      let sectionEl = null;
      for (const sel of selectorList) {
        sectionEl = element.querySelector(sel);
        if (sectionEl) break;
      }
      if (!sectionEl) continue;

      // Add section-metadata block if section has a style
      if (section.style) {
        const sectionMetadataBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [['style', section.style]],
        });
        sectionEl.append(sectionMetadataBlock);
      }

      // Add <hr> before each section (except the first) to create section breaks
      if (i > 0) {
        const hr = document.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
