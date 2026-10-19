/* eslint-disable */
/* global WebImporter */

import videoParser from './parsers/video.js';
import heroSplitParser from './parsers/hero-split.js';
import cardsLogosParser from './parsers/cards-logos.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsFeaturesParser from './parsers/cards-features.js';
import tabsPricingParser from './parsers/tabs-pricing.js';
import cardsIndustryParser from './parsers/cards-industry.js';
import cardsPromoParser from './parsers/cards-promo.js';
import columnsOfferParser from './parsers/columns-offer.js';
import cardsFootnotesParser from './parsers/cards-footnotes.js';
import columnsIntroParser from './parsers/columns-intro.js';
import quoteTestimonialParser from './parsers/quote-testimonial.js';
import tableComparisonParser from './parsers/table-comparison.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import xeroCleanupTransformer from './transformers/xero-cleanup.js';
import xeroSectionsTransformer from './transformers/xero-sections.js';

const PAGE_TEMPLATE = {
  "name": "small-businesses",
  "urls": [
    "https://www.xero.com/au/",
    "https://www.xero.com/au/accountant-bookkeeper-guides/",
    "https://www.xero.com/au/accountants-bookkeepers/",
    "https://www.xero.com/au/accountants-bookkeepers/bookkeepers/",
    "https://www.xero.com/au/campaign/talk-to-sales/",
    "https://www.xero.com/au/guides/",
    "https://www.xero.com/au/integrators/",
    "https://www.xero.com/au/partner-programme/",
    "https://www.xero.com/au/resources/",
    "https://www.xero.com/au/small-businesses/landlords/",
    "https://www.xero.com/au/small-businesses/manufacturing/",
    "https://www.xero.com/au/small-businesses/self-employed/",
    "https://www.xero.com/au/small-businesses/xero-for-self-employed/",
    "https://www.xero.com/au/small-businesses/xero-for-small-business/"
  ],
  "representativeUrl": "https://www.xero.com/au/",
  "description": "To be named in naming step",
  "blocks": [
    {
      "name": "video",
      "instances": [
        "[class^=\"Video__Element\"]"
      ]
    },
    {
      "name": "hero-split",
      "instances": [
        "main header[class*=\"Region__Element\"]"
      ]
    },
    {
      "name": "cards-logos",
      "instances": [
        "[class^=\"ImageBanner__ImagesContainer\"]"
      ]
    },
    {
      "name": "columns-feature",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"Highlight__CopyWrapper\"])"
      ]
    },
    {
      "name": "cards-features",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"BoxSet__Content\"] > [class^=\"BoxItem__Element\"])"
      ]
    },
    {
      "name": "tabs-pricing",
      "instances": [
        "[class^=\"FinTabSet__Wrapper\"]"
      ]
    },
    {
      "name": "cards-industry",
      "instances": [
        "[class^=\"PostCardList__Element\"]"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class^=\"Block__Element\"])"
      ]
    },
    {
      "name": "columns-offer",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class*=\"Box\"] > [class^=\"SinglePlanHighlight__CopyWrapper\"])"
      ]
    },
    {
      "name": "cards-footnotes",
      "instances": [
        "main [class*=\"Col__Element\"]:has(> div:not([class]) > p[class*=\"Typography__Paragraph\"]):not([class^=\"AccordionItem__\"] *)"
      ]
    },
    {
      "name": "columns-intro",
      "instances": [
        "[class*=\"Row__Element\"]:has(> [class*=\"Col__Element\"] > [class^=\"StepsHeading__ArrowWrapper\"])"
      ]
    },
    {
      "name": "quote-testimonial",
      "instances": [
        "[class^=\"Region__Background\"] > [class^=\"Grid__Element\"]:has([class^=\"CustomerStory\"])"
      ]
    },
    {
      "name": "table-comparison",
      "instances": [
        "[class^=\"Table__Wrapper\"]:has(table[class^=\"Table__Element\"])"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "dl[class^=\"Accordion__Element\"]:not([class^=\"FinTabSet__Wrapper\"] *, [class^=\"PlanCard__\"] *)"
      ]
    }
  ],
  "urlPattern": "/*",
  "sections": [
    {
      "id": "section-1",
      "name": "Hero",
      "selector": [
        "main > div.xero-react:has(> header[class*=\"Region__Element\"])"
      ],
      "style": null,
      "blocks": [
        "hero-split"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Awards",
      "selector": [
        "main > div.xero-react:has([class^=\"ImageBanner__ImagesContainer\"])"
      ],
      "style": "centered",
      "blocks": [
        "cards-logos"
      ],
      "defaultContent": [
        "[class*=\"Col__Element\"] > h2[class*=\"Heading__Element\"]",
        "[class*=\"Col__Element\"] > p[class*=\"Typography__Paragraph\"]"
      ]
    },
    {
      "id": "section-3",
      "name": "JAX AI feature",
      "selector": [
        "main > div.xero-react:has([class^=\"Highlight__CopyWrapper\"])"
      ],
      "style": null,
      "blocks": [
        "columns-feature"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "One platform, too easy",
      "selector": [
        "main > div.xero-react:has([class^=\"BoxSet__Content\"])"
      ],
      "style": null,
      "blocks": [
        "cards-features"
      ],
      "defaultContent": [
        "[class*=\"Col__Element\"] > h2[class*=\"Heading__Element\"]",
        "[class*=\"Col__Element\"] > p[class*=\"Typography__Paragraph\"]"
      ]
    },
    {
      "id": "section-5",
      "name": "Plans to suit your business",
      "selector": [
        "main > div.xero-react:has([class^=\"FinTabSet__Wrapper\"])"
      ],
      "style": null,
      "blocks": [
        "tabs-pricing"
      ],
      "defaultContent": [
        "[class*=\"Col__Element\"] > h2[class*=\"Heading__Element\"]"
      ]
    },
    {
      "id": "section-6",
      "name": "However you work, Xero works",
      "selector": [
        "main > div.xero-react:has([class^=\"PostCardList__Element\"])"
      ],
      "style": null,
      "blocks": [
        "cards-industry"
      ],
      "defaultContent": [
        "[class*=\"Col__Element\"] > h2[class*=\"Heading__Element\"]",
        "[class*=\"Col__Element\"] > p[class*=\"Typography__Paragraph\"]"
      ]
    },
    {
      "id": "section-7",
      "name": "Apps / Accountants / Get paid / Affiliates",
      "selector": [
        "main > div.xero-react:has([class^=\"Block__Element\"])"
      ],
      "style": null,
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": []
    },
    {
      "id": "section-8",
      "name": "Your first month, on us",
      "selector": [
        "main > div.xero-react:has([class^=\"SinglePlanHighlight__CopyWrapper\"])"
      ],
      "style": null,
      "blocks": [
        "columns-offer"
      ],
      "defaultContent": []
    },
    {
      "id": "section-9",
      "name": "Footnotes / sources",
      "selector": [
        "main > div.xero-react:has([class*=\"Col__Element\"] > div > p[class*=\"Typography__Paragraph\"])"
      ],
      "style": null,
      "blocks": [
        "cards-footnotes"
      ],
      "defaultContent": []
    }
  ]
};

const parsers = {
  'video': videoParser,
  'hero-split': heroSplitParser,
  'cards-logos': cardsLogosParser,
  'columns-feature': columnsFeatureParser,
  'cards-features': cardsFeaturesParser,
  'tabs-pricing': tabsPricingParser,
  'cards-industry': cardsIndustryParser,
  'cards-promo': cardsPromoParser,
  'columns-offer': columnsOfferParser,
  'cards-footnotes': cardsFootnotesParser,
  'columns-intro': columnsIntroParser,
  'quote-testimonial': quoteTestimonialParser,
  'table-comparison': tableComparisonParser,
  'accordion-faq': accordionFaqParser,
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
