var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/hero-split.js
  function parse(element, { document }) {
    const heading = element.querySelector('h1, h2, [class*="Heading__Element"]');
    const description = element.querySelector('p[class*="Typography__Paragraph"], p[class*="Typography"]');
    const ctaLink = element.querySelector('a[class*="Button__Element"], a[href*="/pricing"], a[href*="/signup"]');
    const heroImage = element.querySelector('img[class*="CoverImage"], img[class*="LeftAligned"], [class*="ImageCol"] img, [class*="ImageWrapper"] img');
    const cells = [];
    if (heroImage) {
      cells.push([heroImage]);
    }
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (description) contentCell.push(description);
    if (ctaLink) contentCell.push(ctaLink);
    if (contentCell.length > 0) {
      cells.push(contentCell);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-split", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media.js
  function parse2(element, { document }) {
    const cells = [];
    const imageBanner = element.querySelector('[class*="ImageBanner__ImagesContainer"]');
    const copyWrapper = element.querySelector('[class*="Highlight__CopyWrapper"], [class*="CopyWrapper"]');
    if (imageBanner) {
      const images = Array.from(imageBanner.querySelectorAll("img"));
      const rowSize = 4;
      for (let i = 0; i < images.length; i += rowSize) {
        const rowImages = images.slice(i, i + rowSize);
        cells.push(rowImages);
      }
    } else if (copyWrapper) {
      const heading = element.querySelector('h2, [class*="Heading__Element"]');
      const description = element.querySelector('p[class*="Typography__Paragraph"], p[class*="Typography"]');
      const checklist = element.querySelector('ul[class*="List__Element"], ul');
      const ctaLink = element.querySelector('a[class*="Link__Element"], a[href*="/ai-in-accounting"]');
      const image = element.querySelector('[class*="ImageWrapper"] img, [class*="Picture__"] img, img[class*="Image__"]');
      const textCol = [];
      if (heading) textCol.push(heading);
      if (description) textCol.push(description);
      if (checklist) textCol.push(checklist);
      if (ctaLink) textCol.push(ctaLink);
      const imageCol = [];
      if (image) imageCol.push(image);
      cells.push([textCol, imageCol]);
    } else {
      const heading = element.querySelector("h2, h3");
      const image = element.querySelector("img");
      const textCol = [];
      const imageCol = [];
      if (heading) textCol.push(heading);
      if (image) imageCol.push(image);
      if (textCol.length > 0 || imageCol.length > 0) {
        cells.push([textCol, imageCol]);
      }
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-grid.js
  function parse3(element, { document }) {
    const cells = [];
    const boxItems = element.querySelectorAll('[class*="BoxItem__Element"], [class*="BoxItem"]');
    const planCards = element.querySelectorAll('[class*="PlanCard__Element"], [class*="PlanCard"]');
    const postCards = element.querySelectorAll('[class*="PostCard__Card"], [class*="PostCard"]');
    const blockTiles = element.querySelectorAll('[class*="Block__Element-sc"]');
    if (boxItems.length > 0) {
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
      planCards.forEach((card) => {
        const planName = card.querySelector('h3, [class*="Heading__Element"]');
        const paragraphs = Array.from(card.querySelectorAll('p[class*="Typography"], p'));
        const ctaLinks = Array.from(card.querySelectorAll('a[class*="Button__Element"], a[class*="Link__Element"], a[href]'));
        const badge = card.querySelector('[class*="Badge"], [class*="Ribbon"], [class*="Tag"]');
        const textCell = [];
        if (badge) textCell.push(badge);
        if (planName) textCell.push(planName);
        paragraphs.forEach((p) => textCell.push(p));
        ctaLinks.forEach((cta) => textCell.push(cta));
        cells.push([textCell]);
      });
    } else if (postCards.length > 0) {
      postCards.forEach((card) => {
        const image = card.querySelector("img, picture img");
        const heading = card.querySelector('h3, h2, [class*="Heading"]');
        const headingLink = card.querySelector('a[class*="Link"], h3 a, h2 a');
        const desc = card.querySelector('p[class*="Typography"], p');
        const imageCell = [];
        if (image) imageCell.push(image);
        const textCell = [];
        if (headingLink && heading) {
          textCell.push(headingLink.closest("h3, h2") || heading);
        } else if (heading) {
          textCell.push(heading);
        }
        if (desc) textCell.push(desc);
        cells.push([imageCell, textCell]);
      });
    } else if (blockTiles.length > 0) {
      blockTiles.forEach((tile) => {
        const heading = tile.querySelector('h2, h3, [class*="Heading"]');
        const desc = tile.querySelector('p[class*="Typography"], p');
        const ctaLink = tile.querySelector('a[class*="Link__Element"], a[class*="Button"], a[href]');
        const image = tile.querySelector("img, picture img");
        const imageCell = [];
        if (image) imageCell.push(image);
        const textCell = [];
        if (heading) textCell.push(heading);
        if (desc) textCell.push(desc);
        if (ctaLink) textCell.push(ctaLink);
        cells.push([imageCell, textCell]);
      });
    } else {
      const items = element.querySelectorAll('li, [class*="Card"], [class*="Item"]');
      if (items.length > 0) {
        items.forEach((item) => {
          const image = item.querySelector("img");
          const heading = item.querySelector("h2, h3, h4");
          const desc = item.querySelector("p");
          const link = item.querySelector("a[href]");
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
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-grid", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/xero-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#CybotCookiebotDialog",
        '[class*="CookieConsent"]',
        '[class*="cookie-banner"]',
        '[class*="gdpr"]'
      ]);
      if (element.style && element.style.overflow === "hidden") {
        element.style.overflow = "scroll";
      }
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        '[class*="TopBar__Element"]',
        '[class*="Nav__NavContainer"]',
        '[class*="NavBar__Element"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        "footer",
        '[class*="Footer__"]'
      ]);
      const spacingElements = element.querySelectorAll('[class*="Spacing__Vertical"], [class*="Spacing__Horizontal"]');
      spacingElements.forEach((el) => {
        if (el.children.length === 0 || el.textContent.trim() === "") {
          el.remove();
        }
      });
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "iframe"
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[class*="VisuallyHidden"]'
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("data-track");
        el.removeAttribute("data-analytics");
        el.removeAttribute("onclick");
      });
    }
  }

  // tools/importer/transformers/xero-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const { template } = payload || {};
      if (!template || !template.sections || template.sections.length < 2) return;
      const { document } = element.ownerDocument ? { document: element.ownerDocument } : { document: element.getRootNode() };
      const sections = template.sections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const selectorList = Array.isArray(section.selector) ? section.selector : [section.selector];
        let sectionEl = null;
        for (const sel of selectorList) {
          sectionEl = element.querySelector(sel);
          if (sectionEl) break;
        }
        if (!sectionEl) continue;
        if (section.style) {
          const sectionMetadataBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: [["style", section.style]]
          });
          sectionEl.append(sectionMetadataBlock);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          sectionEl.before(hr);
        }
      }
    }
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "hero-split": parse,
    "columns-media": parse2,
    "cards-grid": parse3
  };
  var transformers = [
    transform,
    transform2
  ];
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Main marketing homepage with hero, awards ribbon, JAX AI feature, feature highlights, pricing carousel, business-type cards, content tiles, and free-trial CTA band.",
    urls: ["https://www.xero.com/au/"],
    blocks: [
      {
        name: "hero-split",
        instances: ["#content--2109965610"]
      },
      {
        name: "columns-media",
        instances: ["[class*='ImageBanner__ImagesContainer']", "#content-431188245 [class*='Highlight__CopyWrapper']"]
      },
      {
        name: "cards-grid",
        instances: ["#content--337345242 [class*='BoxItem__Element']", "[class*='PlansCompactV2__PlanRow']", "#content-677870770 [class*='PostCard__Card']", "#content-2084693112 [class*='Block__Element']"]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero",
        selector: "#content--2109965610",
        style: "dark-blue",
        blocks: ["hero-split"],
        defaultContent: []
      },
      {
        id: "section-2-awards",
        name: "Awards Ribbon",
        selector: "#content-1585018489",
        style: null,
        blocks: ["columns-media"],
        defaultContent: ["#content-1585018489 h2", "#content-1585018489 > section > div > div > div > div > p"]
      },
      {
        id: "section-3-jax-ai",
        name: "JAX AI Feature",
        selector: "#content-431188245",
        style: null,
        blocks: ["columns-media"],
        defaultContent: []
      },
      {
        id: "section-4-features",
        name: "Feature Highlights",
        selector: "#content--337345242",
        style: null,
        blocks: ["cards-grid"],
        defaultContent: ["#content--337345242 h2#run-your-business-but-better", "#content--337345242 > section > div > div > div > div > div > div > div > p"]
      },
      {
        id: "section-5-pricing",
        name: "Pricing Plans",
        selector: "#content--669239732",
        style: "accent",
        blocks: ["cards-grid"],
        defaultContent: []
      },
      {
        id: "section-6-business-types",
        name: "Business Type Cards",
        selector: "#content-677870770",
        style: null,
        blocks: ["cards-grid"],
        defaultContent: ["#content-677870770 h2#see-how-xero-works-for-your-business", "#content-677870770 > section > div > div > div > div > p"]
      },
      {
        id: "section-7-content-tiles",
        name: "Content Tiles",
        selector: "#content-2084693112",
        style: null,
        blocks: ["cards-grid"],
        defaultContent: []
      },
      {
        id: "section-8-cta",
        name: "CTA Banner",
        selector: "#content-427774869",
        style: "highlight",
        blocks: [],
        defaultContent: ["#content-427774869 h2#start-using-xero-for-free", "#content-427774869 p", "#content-427774869 ul"]
      },
      {
        id: "section-9-disclaimer",
        name: "Disclaimer",
        selector: "#content-1176262756",
        style: "light",
        blocks: [],
        defaultContent: ["#content-1176262756 p"]
      }
    ]
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    /**
     * Main transformation function (one input / multiple outputs pattern)
     */
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
