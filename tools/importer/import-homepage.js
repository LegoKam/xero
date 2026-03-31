/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS - Import all parsers needed for the homepage template
import heroSplitParser from './parsers/hero-split.js';
import columnsMediaParser from './parsers/columns-media.js';
import cardsGridParser from './parsers/cards-grid.js';

// TRANSFORMER IMPORTS - Import all transformers found in tools/importer/transformers/
import cleanupTransformer from './transformers/xero-cleanup.js';
import sectionsTransformer from './transformers/xero-sections.js';

// PARSER REGISTRY - Map parser names to functions
const parsers = {
  'hero-split': heroSplitParser,
  'columns-media': columnsMediaParser,
  'cards-grid': cardsGridParser,
};

// TRANSFORMER REGISTRY - Array of transformer functions
// Cleanup runs first, sections transformer runs after (adds <hr> and section-metadata)
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json (homepage)
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Main marketing homepage with hero, awards ribbon, JAX AI feature, feature highlights, pricing carousel, business-type cards, content tiles, and free-trial CTA band.',
  urls: ['https://www.xero.com/au/'],
  blocks: [
    {
      name: 'hero-split',
      instances: ['#content--2109965610'],
    },
    {
      name: 'columns-media',
      instances: ["[class*='ImageBanner__ImagesContainer']", "#content-431188245 [class*='Highlight__CopyWrapper']"],
    },
    {
      name: 'cards-grid',
      instances: ["#content--337345242 [class*='BoxItem__Element']", "[class*='PlansCompactV2__PlanRow']", "#content-677870770 [class*='PostCard__Card']", "#content-2084693112 [class*='Block__Element']"],
    },
  ],
  sections: [
    {
      id: 'section-1-hero',
      name: 'Hero',
      selector: '#content--2109965610',
      style: 'dark-blue',
      blocks: ['hero-split'],
      defaultContent: [],
    },
    {
      id: 'section-2-awards',
      name: 'Awards Ribbon',
      selector: '#content-1585018489',
      style: null,
      blocks: ['columns-media'],
      defaultContent: ['#content-1585018489 h2', '#content-1585018489 > section > div > div > div > div > p'],
    },
    {
      id: 'section-3-jax-ai',
      name: 'JAX AI Feature',
      selector: '#content-431188245',
      style: null,
      blocks: ['columns-media'],
      defaultContent: [],
    },
    {
      id: 'section-4-features',
      name: 'Feature Highlights',
      selector: '#content--337345242',
      style: null,
      blocks: ['cards-grid'],
      defaultContent: ['#content--337345242 h2#run-your-business-but-better', '#content--337345242 > section > div > div > div > div > div > div > div > p'],
    },
    {
      id: 'section-5-pricing',
      name: 'Pricing Plans',
      selector: '#content--669239732',
      style: 'accent',
      blocks: ['cards-grid'],
      defaultContent: [],
    },
    {
      id: 'section-6-business-types',
      name: 'Business Type Cards',
      selector: '#content-677870770',
      style: null,
      blocks: ['cards-grid'],
      defaultContent: ['#content-677870770 h2#see-how-xero-works-for-your-business', '#content-677870770 > section > div > div > div > div > p'],
    },
    {
      id: 'section-7-content-tiles',
      name: 'Content Tiles',
      selector: '#content-2084693112',
      style: null,
      blocks: ['cards-grid'],
      defaultContent: [],
    },
    {
      id: 'section-8-cta',
      name: 'CTA Banner',
      selector: '#content-427774869',
      style: 'highlight',
      blocks: [],
      defaultContent: ['#content-427774869 h2#start-using-xero-for-free', '#content-427774869 p', '#content-427774869 ul'],
    },
    {
      id: 'section-9-disclaimer',
      name: 'Disclaimer',
      selector: '#content-1176262756',
      style: 'light',
      blocks: [],
      defaultContent: ['#content-1176262756 p'],
    },
  ],
};

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  /**
   * Main transformation function (one input / multiple outputs pattern)
   */
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
