/* eslint-disable */
/* global WebImporter */

import videoParser from './parsers/video.js';
import quoteTestimonialParser from './parsers/quote-testimonial.js';
import cardsTestimonialParser from './parsers/cards-testimonial.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import tableComparisonParser from './parsers/table-comparison.js';
import tabsPricingParser from './parsers/tabs-pricing.js';
import cardsDirectoryParser from './parsers/cards-directory.js';
import cardsIndustryParser from './parsers/cards-industry.js';
import cardsLogosParser from './parsers/cards-logos.js';
import cardsPromoParser from './parsers/cards-promo.js';
import columnsIntroParser from './parsers/columns-intro.js';
import cardsFeaturesParser from './parsers/cards-features.js';
import heroSplitParser from './parsers/hero-split.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import xeroCleanupTransformer from './transformers/xero-cleanup.js';
import xeroSectionsTransformer from './transformers/xero-sections.js';

const PAGE_TEMPLATE = {
  "name": "resources",
  "urls": [
    "https://www.xero.com/au/resources/small-business-insights/",
    "https://www.xero.com/au/syft-from-xero/",
    "https://www.xero.com/au/xero-tax/"
  ],
  "representativeUrl": "https://www.xero.com/au/resources/small-business-insights/",
  "description": "To be named in naming step",
  "blocks": [
    {
      "name": "video",
      "instances": [
        "[class^=\"Video__Element\"]"
      ]
    },
    {
      "name": "quote-testimonial",
      "instances": [
        "[class^=\"Region__Background\"] > [class^=\"Grid__Element\"]:has([class^=\"CustomerStory\"])",
        "[class^=\"Region__Background\"] > [class^=\"Grid__Element\"]:has([class^=\"BlockQuote__Quote\"])"
      ]
    },
    {
      "name": "cards-testimonial",
      "instances": [
        "[class^=\"TestimonialCards__RowWrapper\"]"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "dl[class^=\"Accordion__Element\"]:not([class^=\"FinTabSet__Wrapper\"] *, [class^=\"PlanCard__\"] *)",
        "div[class^=\"Accordion__Element\"]:not([class^=\"FinTabSet__Wrapper\"] *, [class^=\"PlanCard__\"] *)"
      ]
    },
    {
      "name": "table-comparison",
      "instances": [
        "[class^=\"Table__Wrapper\"]:has(table[class^=\"Table__Element\"])"
      ]
    },
    {
      "name": "tabs-pricing",
      "instances": [
        "[class^=\"FinTabSet__Wrapper\"]:not([class^=\"Responsive__Wrapper\"]:has([class^=\"PlanStackV2__\"]) *)",
        "[class^=\"PlansCompactV2__NavigationWrapper\"]"
      ]
    },
    {
      "name": "cards-directory",
      "instances": [
        "ul[class^=\"DetailCardList__List\"]"
      ]
    },
    {
      "name": "cards-industry",
      "instances": [
        "[class^=\"PostCardList__Element\"]",
        "ul[class*=\"Row__Element\"]:has(> li > [class^=\"ContentCardList__CardWrapper\"])"
      ]
    },
    {
      "name": "cards-logos",
      "instances": [
        "[class^=\"ImageBanner__ImagesContainer\"]"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class^=\"Block__Element\"])"
      ]
    },
    {
      "name": "columns-intro",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class^=\"StepsHeading__ArrowWrapper\"])"
      ]
    },
    {
      "name": "cards-features",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"BoxSet__Content\"] > [class^=\"BoxItem__Element\"])"
      ]
    },
    {
      "name": "hero-split",
      "instances": [
        "main header[class*=\"Region__Element\"]:has(img):not(:has([class^=\"Hero__HeroWrapper\"], [class^=\"LeftAlignedProofPoints__CopyWrapper\"]))",
        "main header[class*=\"Region__Element\"] [class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] [class^=\"LeftAlignedProofPoints__CopyWrapper\"])"
      ]
    },
    {
      "name": "columns-feature",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"Highlight__CopyWrapper\"])",
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"HighlightProofPoints__CopyWrapper\"])"
      ]
    }
  ],
  "urlPattern": "/au/*",
  "sections": []
};

const parsers = {
  'video': videoParser,
  'quote-testimonial': quoteTestimonialParser,
  'cards-testimonial': cardsTestimonialParser,
  'accordion-faq': accordionFaqParser,
  'table-comparison': tableComparisonParser,
  'tabs-pricing': tabsPricingParser,
  'cards-directory': cardsDirectoryParser,
  'cards-industry': cardsIndustryParser,
  'cards-logos': cardsLogosParser,
  'cards-promo': cardsPromoParser,
  'columns-intro': columnsIntroParser,
  'cards-features': cardsFeaturesParser,
  'hero-split': heroSplitParser,
  'columns-feature': columnsFeatureParser,
};

const transformers = [xeroCleanupTransformer, xeroSectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  // html2md strips <script> tags before transform; stash the Next.js page data
  // (pricing plans, video IDs, popovers) so the cleanup transformer can restore it.
  onLoad: async ({ document }) => {
    const data = document.getElementById('__NEXT_DATA__');
    if (!data || document.getElementById('xero-next-data-stash')) return;
    const stash = document.createElement('div');
    stash.id = 'xero-next-data-stash';
    stash.setAttribute('data-json', data.textContent);
    document.body.append(stash);
  },

  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    // Locale root (e.g. /au/) maps to the locale folder index document
    let docPath = rawPath === '' ? '/index' : rawPath;
    if (/^\/[a-z]{2}$/.test(docPath)) docPath = `${docPath}/index`;
    const path = WebImporter.FileUtils.sanitizePath(docPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
