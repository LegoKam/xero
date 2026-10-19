/* eslint-disable */
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

  // tools/importer/import-small-businesses.js
  var import_small_businesses_exports = {};
  __export(import_small_businesses_exports, {
    default: () => import_small_businesses_default
  });

  // tools/importer/parsers/hero-split.js
  function parse(element, { document }) {
    const cells = [];
    const image = element.querySelector("img");
    if (image) cells.push([image]);
    const contentCell = [];
    const heading = element.querySelector("h1, h2");
    if (heading) contentCell.push(heading);
    const copyWrapper = element.querySelector('[class*="CopyWrapper"]') || element;
    copyWrapper.querySelectorAll("p").forEach((p) => {
      if (p.textContent.trim()) contentCell.push(p);
    });
    copyWrapper.querySelectorAll('[class*="ButtonGroup__Element"] a[href], a[class*="Button__Element"]').forEach((a) => {
      if (contentCell.some((n) => n.contains && n.contains(a))) return;
      const link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = a.textContent.trim();
      const wrap = document.createElement("p");
      wrap.append(link);
      if (!contentCell.some((n) => n.querySelector && n.querySelector(`a[href="${link.getAttribute("href")}"]`))) {
        contentCell.push(wrap);
      }
    });
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-split", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-logos.js
  function parse2(element, { document }) {
    const cells = [];
    const items = element.querySelectorAll(':scope > [class^="ImageBanner__ImageWrapper"]');
    items.forEach((item) => {
      const srcImg = item.querySelector("img");
      if (!srcImg) return;
      const labelled = item.querySelector("[aria-label]");
      const alt = (srcImg.getAttribute("alt") || "").trim() || (labelled ? labelled.getAttribute("aria-label").trim() : "");
      const img = document.createElement("img");
      let src = srcImg.getAttribute("src") || "";
      if (/\.svg$/i.test(src)) src += "?format=svg";
      img.src = src;
      img.alt = alt;
      cells.push([img, ""]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-logos", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-feature.js
  function buildImage(document, scope) {
    const srcImg = scope && scope.querySelector("img");
    if (!srcImg) return null;
    let src = srcImg.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return null;
    if (/\.svg$/i.test(src)) src += "?format=svg";
    const labelled = srcImg.closest("[aria-label]");
    const img = document.createElement("img");
    img.src = src;
    img.alt = (srcImg.getAttribute("alt") || "").trim() || (labelled ? labelled.getAttribute("aria-label").trim() : "");
    return img;
  }
  function parse3(element, { document }) {
    const cols = element.querySelectorAll(':scope > [class*="Col__Element"]');
    const copy = element.querySelector('[class^="Highlight__CopyWrapper"]');
    const imageCol = [...cols].find((c) => !c.querySelector('[class^="Highlight__CopyWrapper"]'));
    const textCell = [];
    if (copy) {
      const heading = copy.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) textCell.push(heading);
      copy.querySelectorAll(":scope > p").forEach((p) => {
        if (p.textContent.trim()) textCell.push(p);
      });
      const srcList = copy.querySelector("ul, ol");
      if (srcList) {
        const list = document.createElement("ul");
        srcList.querySelectorAll(":scope > li").forEach((li) => {
          const text = li.textContent.replace(/\s+/g, " ").trim();
          if (!text) return;
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        });
        if (list.children.length) textCell.push(list);
      }
      copy.querySelectorAll(":scope > a[href]").forEach((a) => {
        const text = a.textContent.replace(/\s+/g, " ").trim();
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        p.append(link);
        textCell.push(p);
      });
    }
    const img = buildImage(document, imageCol);
    const cells = [[textCell, img || ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-features.js
  function parse4(element, { document }) {
    const cells = [];
    element.querySelectorAll('[class^="BoxItem__Element"]').forEach((item) => {
      const contentCell = [];
      const heading = item.querySelector("h1, h2, h3, h4, h5, h6");
      const title = heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
      if (title) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = title;
        p.append(strong);
        contentCell.push(p);
      }
      item.querySelectorAll("p").forEach((p) => {
        if (p.textContent.trim()) contentCell.push(p);
      });
      if (contentCell.length) cells.push([contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-features", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs-pricing.js
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildPlan(document, card) {
    const nodes = [];
    const h3src = card.querySelector("h3");
    if (h3src) {
      const selected = h3src.querySelector("select option:checked, select option[selected]");
      const name = selected ? clean(selected.textContent) : clean(h3src.textContent);
      const h3 = document.createElement("h3");
      h3.textContent = name;
      nodes.push(h3);
    }
    const priceRow = card.querySelector('[class^="PlanCard__PriceRow"]');
    if (priceRow) {
      const price = clean(priceRow.textContent);
      if (price) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = price;
        p.append(strong);
        nodes.push(p);
      }
    }
    const top = card.querySelector('[class^="PlanCard__Top"]') || card;
    top.querySelectorAll("p").forEach((srcP) => {
      if (srcP.closest("dl")) return;
      const text = clean(srcP.textContent);
      if (!text) return;
      const p = document.createElement("p");
      p.textContent = text;
      nodes.push(p);
    });
    const dl = top.querySelector("dl");
    if (dl) {
      const term = dl.querySelector("dt");
      const label = term ? clean(term.textContent) : "";
      if (label) {
        const p = document.createElement("p");
        p.textContent = label;
        nodes.push(p);
      }
      const list = document.createElement("ul");
      dl.querySelectorAll("li").forEach((li) => {
        const text = clean(li.textContent);
        if (!text) return;
        const item = document.createElement("li");
        item.textContent = text;
        list.append(item);
      });
      if (list.children.length) nodes.push(list);
    }
    const ctas = card.querySelector('[class^="PlanCard__CtasSection"]');
    if (ctas) {
      ctas.querySelectorAll("a[href]").forEach((a) => {
        const text = clean(a.textContent);
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        if (/Button__Element/.test(a.className)) {
          const strong = document.createElement("strong");
          strong.append(link);
          p.append(strong);
        } else {
          p.append(link);
        }
        nodes.push(p);
      });
    }
    return nodes;
  }
  function parse5(element, { document }) {
    const cells = [];
    const toggle = element.querySelector('[class^="FinTabSet__ToggleWrapper"]');
    const labels = toggle ? [...toggle.querySelectorAll("label")] : [];
    const panel = element.querySelector(':scope > div:not([class^="FinTabSet__ToggleWrapper"]) > [role="tabpanel"]') || element.querySelector('[role="tabpanel"]');
    const panelContent = [];
    if (panel) {
      panel.querySelectorAll('[class^="PlanCard__Element"]').forEach((card) => {
        panelContent.push(...buildPlan(document, card));
      });
    }
    if (labels.length) {
      let activeIndex = labels.findIndex((label) => {
        const input = label.previousElementSibling || label.parentElement.querySelector("input");
        return input && panel && input.getAttribute("aria-controls") === panel.id;
      });
      if (activeIndex < 0) {
        activeIndex = labels.findIndex((label) => {
          const input = label.parentElement.querySelector("input");
          return input && (input.checked || input.hasAttribute("checked"));
        });
      }
      if (activeIndex < 0) activeIndex = 0;
      labels.forEach((label, i) => {
        const text = clean(label.textContent);
        if (!text) return;
        cells.push([text, i === activeIndex ? panelContent : ""]);
      });
    } else if (panelContent.length) {
      cells.push(["Plans", panelContent]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "tabs-pricing", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-industry.js
  function clean2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse6(element, { document }) {
    const cells = [];
    element.querySelectorAll('[class^="PostCard__Card"]').forEach((card) => {
      const srcImg = card.querySelector('[class^="PostCard__ImageContainer"] img, img');
      let img = "";
      if (srcImg && srcImg.getAttribute("src") && !srcImg.getAttribute("src").startsWith("data:")) {
        img = document.createElement("img");
        img.src = srcImg.getAttribute("src");
        img.alt = (srcImg.getAttribute("alt") || "").trim();
      }
      const contentCell = [];
      const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) {
        const title = clean2(heading.textContent);
        const srcLink = heading.querySelector("a[href]") || card.querySelector("a[href]");
        const h3 = document.createElement("h3");
        if (srcLink) {
          const link = document.createElement("a");
          link.href = srcLink.getAttribute("href");
          link.textContent = title;
          h3.append(link);
        } else {
          h3.textContent = title;
        }
        if (title) contentCell.push(h3);
      }
      card.querySelectorAll("p").forEach((p) => {
        if (p.textContent.trim()) contentCell.push(p);
      });
      if (img || contentCell.length) cells.push([img, contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-industry", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-promo.js
  function clean3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildImage2(document, scope) {
    const srcImg = scope.querySelector("img");
    if (!srcImg) return "";
    let src = srcImg.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return "";
    if (/\.svg$/i.test(src)) src += "?format=svg";
    let alt = (srcImg.getAttribute("alt") || "").trim();
    if (!alt) {
      const labelled = srcImg.closest("[aria-label]");
      const label = labelled ? labelled.getAttribute("aria-label").trim() : "";
      if (label && /\s/.test(label)) alt = label;
    }
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    return img;
  }
  function parse7(element, { document }) {
    const cells = [];
    element.querySelectorAll(':scope > [class*="Col__Element"] > [class^="Block__Element"]').forEach((promo) => {
      const contentCell = [];
      const heading = promo.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && clean3(heading.textContent)) contentCell.push(heading);
      promo.querySelectorAll("p").forEach((p) => {
        if (p.textContent.trim()) contentCell.push(p);
      });
      promo.querySelectorAll('[class^="Block__ButtonWrapper"] a[href]').forEach((a) => {
        const text = clean3(a.textContent);
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        p.append(link);
        contentCell.push(p);
      });
      const imageScope = promo.querySelector('[class^="Block__ImageWrapper"]') || promo;
      const img = buildImage2(document, imageScope);
      if (img || contentCell.length) cells.push([img, contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-offer.js
  function clean4(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function textParagraph(document, text, bold = false) {
    const p = document.createElement("p");
    if (bold) {
      const strong = document.createElement("strong");
      strong.textContent = text;
      p.append(strong);
    } else {
      p.textContent = text;
    }
    return p;
  }
  function parse8(element, { document }) {
    const copy = element.querySelector('[class^="SinglePlanHighlight__CopyWrapper"]');
    const plan = element.querySelector('[class^="SinglePlanHighlight__PlanWrapper"]');
    const textCell = [];
    if (copy) {
      const heading = copy.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && clean4(heading.textContent)) textCell.push(heading);
      copy.querySelectorAll(":scope > p").forEach((p) => {
        if (p.textContent.trim()) textCell.push(p);
      });
      copy.querySelectorAll("a[href]").forEach((a) => {
        const text = clean4(a.textContent);
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        if (/Button__Element/.test(a.className)) {
          const strong = document.createElement("strong");
          strong.append(link);
          p.append(strong);
        } else {
          p.append(link);
        }
        textCell.push(p);
      });
    }
    const cardCell = [];
    if (plan) {
      const label = plan.querySelector("h1, h2, h3, h4, h5, h6");
      if (label && clean4(label.textContent)) cardCell.push(textParagraph(document, clean4(label.textContent)));
      plan.querySelectorAll("p").forEach((p) => {
        const text = clean4(p.textContent);
        if (!text) return;
        const isPrice = /PriceDetails/.test(p.className) || !!p.querySelector("strong");
        cardCell.push(isPrice ? textParagraph(document, text.replace(/\s+/g, ""), true) : textParagraph(document, text));
      });
      const srcList = plan.querySelector("ul, ol");
      if (srcList) {
        const list = document.createElement("ul");
        srcList.querySelectorAll(":scope > li").forEach((li) => {
          const text = clean4(li.textContent);
          if (!text) return;
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        });
        if (list.children.length) cardCell.push(list);
      }
    }
    const cells = [[textCell, cardCell]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-offer", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-footnotes.js
  function clean5(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse9(element, { document }) {
    const cells = [];
    element.querySelectorAll(":scope > div").forEach((item) => {
      const contentCell = [];
      item.querySelectorAll("p").forEach((p) => {
        if (clean5(p.textContent)) contentCell.push(p);
      });
      item.querySelectorAll("a[href]").forEach((a) => {
        if (a.closest("p")) return;
        const text = clean5(a.textContent);
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        p.append(link);
        contentCell.push(p);
      });
      if (contentCell.length) cells.push([contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-footnotes", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/xero-cleanup.js
  function transform(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        '[class*="onetrust"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[class*="Modal__Background"]',
        '[class*="Modal__Element"]'
      ]);
      element.querySelectorAll("header").forEach((h) => {
        if (!h.closest("main")) h.remove();
      });
      element.querySelectorAll("nav").forEach((n) => {
        if (!n.closest("main")) n.remove();
      });
      element.querySelectorAll("footer").forEach((f) => {
        if (f.closest("main")) return;
        const wrapper = f.closest("div.xero-react");
        if (wrapper && !wrapper.closest("main")) wrapper.remove();
        else f.remove();
      });
      WebImporter.DOMUtils.remove(element, [
        "next-route-announcer",
        "#__next-route-announcer__",
        "iframe"
      ]);
    }
    if (hookName === "afterTransform") {
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "link",
        "iframe",
        "source"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach((attr) => {
          const n = attr.name;
          if (n.startsWith("data-ga") || n.startsWith("data-track") || n.startsWith("data-analytics") || n === "onclick" || n === "data-nscript") {
            el.removeAttribute(n);
          }
        });
      });
    }
  }

  // tools/importer/transformers/xero-sections.js
  var MARKER = "data-excat-section-id";
  function resolveSections(element, sections) {
    const claimed = /* @__PURE__ */ new Set();
    return sections.map((section) => {
      const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
      let found = null;
      selectors.some((sel) => {
        if (!sel) return false;
        let matches = [];
        try {
          matches = [...element.querySelectorAll(sel)];
        } catch (e) {
          return false;
        }
        found = matches.find((m) => !claimed.has(m)) || null;
        return !!found;
      });
      if (found) claimed.add(found);
      return { section, el: found };
    });
  }
  function transform2(hookName, element, payload) {
    const sections = payload && payload.template && payload.template.sections;
    if (!sections || sections.length < 2) return;
    const document = element.ownerDocument;
    if (hookName === "beforeTransform") {
      const resolved = resolveSections(element, sections);
      for (let i = resolved.length - 1; i >= 0; i -= 1) {
        const { section, el } = resolved[i];
        if (el) {
          if (i > 0) {
            const hr = document.createElement("hr");
            if (section.style) hr.setAttribute(MARKER, section.id);
            el.before(hr);
          } else if (section.style) {
            const hr = document.createElement("hr");
            hr.setAttribute(MARKER, section.id);
            hr.setAttribute("data-excat-first", "true");
            el.before(hr);
          }
        }
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
        if (marker && section.style) {
          const meta = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          let cursor = marker.nextElementSibling;
          let last = marker;
          while (cursor && cursor.tagName !== "HR") {
            last = cursor;
            cursor = cursor.nextElementSibling;
          }
          last.after(meta);
          if (marker.getAttribute("data-excat-first") === "true") {
            marker.remove();
          } else {
            marker.removeAttribute(MARKER);
          }
        }
      }
      element.querySelectorAll(`hr[${MARKER}]`).forEach((hr) => {
        if (hr.getAttribute("data-excat-first") === "true") hr.remove();
        else hr.removeAttribute(MARKER);
      });
    }
  }

  // tools/importer/import-small-businesses.js
  var PAGE_TEMPLATE = {
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
        "name": "hero-split",
        "instances": [
          'main header[class*="Region__Element"]'
        ]
      },
      {
        "name": "cards-logos",
        "instances": [
          '[class^="ImageBanner__ImagesContainer"]'
        ]
      },
      {
        "name": "columns-feature",
        "instances": [
          '[class*="Row__Element"]:has(> [class*="Col__Element"] > [class*="Box"] > [class^="Highlight__CopyWrapper"])'
        ]
      },
      {
        "name": "cards-features",
        "instances": [
          '[class*="Row__Element"]:has(> li > [class*="Box"] > [class^="BoxSet__Content"] > [class^="BoxItem__Element"])'
        ]
      },
      {
        "name": "tabs-pricing",
        "instances": [
          '[class^="FinTabSet__Wrapper"]'
        ]
      },
      {
        "name": "cards-industry",
        "instances": [
          '[class^="PostCardList__Element"]'
        ]
      },
      {
        "name": "cards-promo",
        "instances": [
          '[class*="Row__Element"]:has(> [class*="Col__Element"] > [class^="Block__Element"])'
        ]
      },
      {
        "name": "columns-offer",
        "instances": [
          '[class*="Row__Element"]:has(> [class*="Col__Element"] > [class*="Box"] > [class^="SinglePlanHighlight__CopyWrapper"])'
        ]
      },
      {
        "name": "cards-footnotes",
        "instances": [
          'main [class*="Col__Element"]:has(> div > p[class*="Typography__Paragraph"])'
        ]
      }
    ],
    "urlPattern": "/*",
    "sections": [
      {
        "id": "section-1",
        "name": "Hero",
        "selector": [
          'main > div.xero-react:has(> header[class*="Region__Element"])'
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
          'main > div.xero-react:has([class^="ImageBanner__ImagesContainer"])'
        ],
        "style": "centered",
        "blocks": [
          "cards-logos"
        ],
        "defaultContent": [
          '[class*="Col__Element"] > h2[class*="Heading__Element"]',
          '[class*="Col__Element"] > p[class*="Typography__Paragraph"]'
        ]
      },
      {
        "id": "section-3",
        "name": "JAX AI feature",
        "selector": [
          'main > div.xero-react:has([class^="Highlight__CopyWrapper"])'
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
          'main > div.xero-react:has([class^="BoxSet__Content"])'
        ],
        "style": null,
        "blocks": [
          "cards-features"
        ],
        "defaultContent": [
          '[class*="Col__Element"] > h2[class*="Heading__Element"]',
          '[class*="Col__Element"] > p[class*="Typography__Paragraph"]'
        ]
      },
      {
        "id": "section-5",
        "name": "Plans to suit your business",
        "selector": [
          'main > div.xero-react:has([class^="FinTabSet__Wrapper"])'
        ],
        "style": null,
        "blocks": [
          "tabs-pricing"
        ],
        "defaultContent": [
          '[class*="Col__Element"] > h2[class*="Heading__Element"]'
        ]
      },
      {
        "id": "section-6",
        "name": "However you work, Xero works",
        "selector": [
          'main > div.xero-react:has([class^="PostCardList__Element"])'
        ],
        "style": null,
        "blocks": [
          "cards-industry"
        ],
        "defaultContent": [
          '[class*="Col__Element"] > h2[class*="Heading__Element"]',
          '[class*="Col__Element"] > p[class*="Typography__Paragraph"]'
        ]
      },
      {
        "id": "section-7",
        "name": "Apps / Accountants / Get paid / Affiliates",
        "selector": [
          'main > div.xero-react:has([class^="Block__Element"])'
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
          'main > div.xero-react:has([class^="SinglePlanHighlight__CopyWrapper"])'
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
          'main > div.xero-react:has([class*="Col__Element"] > div > p[class*="Typography__Paragraph"])'
        ],
        "style": null,
        "blocks": [
          "cards-footnotes"
        ],
        "defaultContent": []
      }
    ]
  };
  var parsers = {
    "hero-split": parse,
    "cards-logos": parse2,
    "columns-feature": parse3,
    "cards-features": parse4,
    "tabs-pricing": parse5,
    "cards-industry": parse6,
    "cards-promo": parse7,
    "columns-offer": parse8,
    "cards-footnotes": parse9
  };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
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
  var import_small_businesses_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      let docPath = rawPath === "" ? "/index" : rawPath;
      if (/^\/[a-z]{2}$/.test(docPath)) docPath = `${docPath}/index`;
      const path = WebImporter.FileUtils.sanitizePath(docPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_small_businesses_exports);
})();
