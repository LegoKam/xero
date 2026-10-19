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
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-small-businesses.js
  var import_small_businesses_exports = {};
  __export(import_small_businesses_exports, {
    default: () => import_small_businesses_default
  });

  // tools/importer/parsers/video.js
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  var VIDEO_URL_RE = /(youtube\.com|youtu\.be|vimeo\.com|wistia\.(com|net)|brightcove|bcove\.video|\.mp4(\?|#|$))/i;
  function readNextData(document) {
    const script = document.querySelector("#__NEXT_DATA__");
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (e) {
      return null;
    }
  }
  function isVideoComponent(node) {
    return /video/i.test(node["@type"] || "") && !/video-browser|videos-list/i.test(node["@type"] || "");
  }
  function collectVideoEntries(document) {
    if (document.__xeroVideoEntries) return document.__xeroVideoEntries;
    const data = readNextData(document);
    const found = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const hasId = typeof node.videoId === "string" && node.videoId;
      const hasUrl = ["videoUrl", "embedUrl", "videoSrc"].some((k) => typeof node[k] === "string" && node[k]);
      if (hasId || isVideoComponent(node) || hasUrl) {
        found.push({ node, ordered: !!hasId || isVideoComponent(node) });
      }
      Object.keys(node).forEach((k) => walk(node[k]));
    };
    if (data) walk(data);
    document.__xeroVideoEntries = found;
    return found;
  }
  function srcKey(src) {
    const file = (src || "").split("?")[0].split("#")[0];
    return file.replace(/\.[0-9]+(\.[a-z0-9]+)$/i, "$1").replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  }
  function entryPoster(node) {
    const img = node.image || node.poster || node.thumbnail;
    if (img && typeof img === "object") return img.src || img.url || "";
    if (typeof img === "string") return img;
    return node.imageSrc || "";
  }
  function absolute(url) {
    if (/^\/\//.test(url)) return `https:${url}`;
    if (/^\//.test(url)) return `https://www.xero.com${url}`;
    return url;
  }
  function toVideoUrl(value, provider) {
    const v = clean(value);
    if (!v) return "";
    if (/^(https?:)?\/\//i.test(v) || /^\/.+\.mp4(\?|#|$)/i.test(v)) {
      return VIDEO_URL_RE.test(v) ? absolute(v) : "";
    }
    const p = (provider || "").toLowerCase();
    if (/youtube/.test(p)) return `https://www.youtube.com/watch?v=${v}`;
    if (/vimeo/.test(p)) return `https://vimeo.com/${v}`;
    if (/^\d{6,}$/.test(v)) return `https://vimeo.com/${v}`;
    if (/^[A-Za-z0-9_-]{11}$/.test(v) && /[A-Z_-]/.test(v)) return `https://www.youtube.com/watch?v=${v}`;
    if (/^[A-Za-z0-9]+$/.test(v)) return `https://fast.wistia.net/embed/iframe/${v}`;
    return "";
  }
  function entryUrl(node) {
    const provider = node.videoType || node.provider || node.platform || node.source || "";
    const candidates = [node.videoUrl, node.embedUrl, node.url, node.videoSrc, node.videoId];
    if (isVideoComponent(node)) candidates.push(node.id);
    for (const c of candidates) {
      if (typeof c !== "string" || !c) continue;
      const url = toVideoUrl(c, provider);
      if (url) return url;
    }
    return "";
  }
  function domVideoUrl(element) {
    const iframe = element.querySelector("iframe[src]");
    if (iframe && VIDEO_URL_RE.test(iframe.getAttribute("src"))) return absolute(iframe.getAttribute("src"));
    const source = element.querySelector("video[src], video source[src]");
    if (source) return absolute(source.getAttribute("src"));
    const holder = element.querySelector("[data-video-id], [data-wistia-id], [data-youtube-id], [data-vimeo-id]") || (element.matches("[data-video-id], [data-wistia-id]") ? element : null);
    if (holder) {
      if (holder.dataset.youtubeId) return toVideoUrl(holder.dataset.youtubeId, "youtube");
      if (holder.dataset.vimeoId) return toVideoUrl(holder.dataset.vimeoId, "vimeo");
      return toVideoUrl(holder.dataset.wistiaId || holder.dataset.videoId);
    }
    return "";
  }
  function findEntry(document, posterSrc, captionText) {
    const entries = collectVideoEntries(document);
    if (!document.__xeroVideoUsed) document.__xeroVideoUsed = /* @__PURE__ */ new Set();
    const used = document.__xeroVideoUsed;
    const free = entries.filter((e) => !used.has(e.node));
    const key = srcKey(posterSrc);
    const base = key.split("/").pop();
    let hit = key && free.find((e) => {
      const k = srcKey(entryPoster(e.node));
      return k && (k === key || k.split("/").pop() === base);
    });
    if (!hit && captionText) {
      hit = free.find((e) => e.ordered && [e.node.captionText, e.node.caption].some((c) => typeof c === "string" && clean(c) === captionText));
    }
    if (!hit) hit = free.find((e) => e.ordered && (!key || !entryPoster(e.node)));
    if (!hit) return null;
    used.add(hit.node);
    return hit.node;
  }
  function parse(element, { document }) {
    const figure = element.closest("figure");
    const figcaption = figure ? figure.querySelector("figcaption") : null;
    const captionText = figcaption ? clean(figcaption.textContent) : "";
    const content = [];
    const srcImg = element.querySelector("img");
    const posterSrc = srcImg ? srcImg.getAttribute("src") || "" : "";
    const entry = findEntry(document, posterSrc, captionText);
    if (posterSrc && !posterSrc.startsWith("data:")) {
      const img = document.createElement("img");
      img.src = posterSrc;
      img.alt = clean(srcImg.getAttribute("alt")) || captionText || (entry && typeof entry.heading === "string" ? clean(entry.heading.replace(/[*[\]]/g, "")) : "");
      content.push(img);
    }
    const href = domVideoUrl(element) || (entry ? entryUrl(entry) : "");
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = href;
      content.push(link);
    }
    const cells = [[content]];
    const block = WebImporter.Blocks.createBlock(document, { name: "video", cells });
    element.replaceWith(block);
    if (figure && figure.parentNode) {
      const holder = block.parentElement && block.parentElement !== figure ? block.parentElement : document.createElement("div");
      if (!holder.contains(block)) holder.append(block);
      if (captionText) {
        const p = document.createElement("p");
        p.textContent = captionText;
        block.after(p);
      }
      if (holder !== figure) figure.replaceWith(holder);
    }
  }

  // tools/importer/parsers/hero-split.js
  function isVideoBlock(node) {
    if (!node || node.tagName !== "TABLE") return false;
    const firstCell = node.querySelector("tr > th, tr > td");
    return !!firstCell && /^\s*video\b/i.test(firstCell.textContent || "");
  }
  var clean2 = (t) => (t || "").replace(/\s+/g, " ").trim();
  var FOREIGN = [
    '[class*="ProofPoint"]',
    '[class*="Rating"]',
    '[class*="Award"]',
    '[class*="Badge"]',
    '[class*="Logo"]',
    '[class*="Card"]',
    '[class*="Caption__"]',
    '[class*="OverlayButton"]',
    '[class*="Video__"]',
    "figcaption"
  ].join(", ");
  var EYEBROW = '[class*="Eyebrow"], [class*="Overline"], [class*="Kicker"], [class*="Label"], [class*="Tag__"]';
  var precedes = (a, b) => !!(a.compareDocumentPosition(b) & 4);
  function parse2(element, { document }) {
    const keep = [];
    element.querySelectorAll("table").forEach((t) => {
      if (!isVideoBlock(t)) return;
      const holder = t.parentElement;
      const holderOnlyVideo = holder && holder !== element && [...holder.children].every((c) => c === t || c.tagName === "P");
      keep.push(holderOnlyVideo ? holder : t);
    });
    const rawVideo = [...element.querySelectorAll("figure")].filter((f) => f.querySelector('[class^="Video__Element"]'));
    const foreign = [...element.querySelectorAll(FOREIGN)].filter((c) => !c.querySelector("h1"));
    const skip = [...keep, ...rawVideo, ...element.querySelectorAll('[class^="Video__Element"]'), ...foreign];
    const skipped = (n) => skip.some((s) => s === n || s.contains(n));
    const cells = [];
    const images = [...element.querySelectorAll("img")].filter((img) => !skipped(img));
    const badgeLike = (img) => /\b(logo|badge|award|rating|stars?)\b/i.test(img.getAttribute("alt") || "");
    const image = images.find((img) => !badgeLike(img)) || images[0];
    if (image) cells.push([image]);
    const contentCell = [];
    const headings = [...element.querySelectorAll("h1, h2")].filter((h) => !skipped(h));
    const heading = headings.find((h) => h.tagName === "H1") || headings[0];
    const copyWrapper = element.querySelector('[class*="CopyWrapper"]') || heading && heading.closest('[class*="Col__Element"]') || element;
    if (heading) {
      const eyebrows = [...copyWrapper.querySelectorAll(`${EYEBROW}, h2, h3, h4, h5, h6, p`)].filter((n) => {
        if (n === heading || heading.contains(n) || n.contains(heading) || skipped(n)) return false;
        if (!precedes(n, heading) || !clean2(n.textContent)) return false;
        if (n.closest('a, button, [class*="ButtonGroup"]')) return false;
        return !n.parentElement.closest(`${EYEBROW}, h2, h3, h4, h5, h6, p`);
      });
      eyebrows.forEach((n) => {
        const p = document.createElement("p");
        p.textContent = clean2(n.textContent);
        contentCell.push(p);
      });
      contentCell.push(heading);
    }
    copyWrapper.querySelectorAll("p").forEach((p) => {
      if (skipped(p)) return;
      if (heading && precedes(p, heading)) return;
      if (contentCell.some((n) => n === p || n.contains && n.contains(p))) return;
      if (p.textContent.trim()) contentCell.push(p);
    });
    copyWrapper.querySelectorAll("ul, ol").forEach((list) => {
      if (skipped(list) || /ButtonGroup/.test(list.className || "")) return;
      if (list.parentElement.closest("ul, ol")) return;
      const items = [...list.querySelectorAll(":scope > li")].map((li) => {
        const copy = li.cloneNode(true);
        copy.querySelectorAll('svg, title, [class*="Icon"]').forEach((n) => n.remove());
        return clean2(copy.textContent);
      }).filter(Boolean);
      if (!items.length) return;
      const out = document.createElement(list.tagName.toLowerCase());
      items.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        out.append(li);
      });
      contentCell.push(out);
    });
    copyWrapper.querySelectorAll('[class*="ButtonGroup__Element"] a[href], a[class*="Button__Element"]').forEach((a) => {
      if (skipped(a)) return;
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
    keep.forEach((n) => n.remove());
    element.replaceWith(block);
    if (keep.length) block.after(...keep);
  }

  // tools/importer/parsers/cards-logos.js
  function parse3(element, { document }) {
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
  function clean3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
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
  function nextDataObjects(document) {
    const script = document.querySelector("#__NEXT_DATA__");
    if (!script) return [];
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return [];
    }
    const objects = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      objects.push(node);
      Object.keys(node).forEach((k) => walk(node[k]));
    };
    walk(data);
    return objects;
  }
  function stripTags(html) {
    return clean3(String(html || "").replace(/<[^>]*>/g, " ")).toLowerCase();
  }
  function findComponent(objects, headingText) {
    const key = clean3(headingText).toLowerCase();
    if (!key) return null;
    return objects.find((o) => typeof o.heading === "string" && stripTags(o.heading) === key && ("copyPosition" in o || "popovers" in o)) || null;
  }
  function popoverList(component) {
    if (!component || !Array.isArray(component.popovers)) return [];
    return component.popovers.map((p) => p && p.popover ? p.popover : p).filter(Boolean);
  }
  function findPopover(objects, component, label) {
    const key = clean3(label).toLowerCase();
    const match = (p) => clean3(p.button).toLowerCase() === key;
    const own = popoverList(component).find(match);
    if (own) return own;
    for (const o of objects) {
      const hit = popoverList(o).find(match);
      if (hit) return hit;
    }
    return null;
  }
  function para(document, text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  function linkPara(document, href, text, primary) {
    if (!href || !clean3(text)) return null;
    const link = document.createElement("a");
    link.href = href;
    link.textContent = clean3(text);
    const p = document.createElement("p");
    if (primary) {
      const strong = document.createElement("strong");
      strong.append(link);
      p.append(strong);
    } else {
      p.append(link);
    }
    return p;
  }
  function cleanHeading(heading) {
    heading.querySelectorAll('[aria-hidden="true"], svg').forEach((n) => n.remove());
    return heading;
  }
  function itemText(li) {
    const span = li.querySelector('[class^="Typography__Span"]');
    if (span) return clean3(span.textContent);
    const copy = li.cloneNode(true);
    copy.querySelectorAll("svg, title").forEach((s) => s.remove());
    return clean3(copy.textContent);
  }
  function buildList(document, srcList) {
    const list = document.createElement(srcList.tagName === "OL" ? "ol" : "ul");
    srcList.querySelectorAll(":scope > li").forEach((li) => {
      const text = itemText(li);
      if (!text) return;
      const item = document.createElement("li");
      item.textContent = text;
      list.append(item);
    });
    return list.children.length ? list : null;
  }
  function buildButtonGroup(document, group) {
    const links = [...group.querySelectorAll("a[href]")];
    let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ""));
    if (!primary && group.tagName === "UL") [primary] = links;
    return links.map((a) => linkPara(document, a.getAttribute("href"), a.textContent, a === primary)).filter(Boolean);
  }
  function domPopover(document, label) {
    const key = clean3(label).toLowerCase();
    const modals = [...document.querySelectorAll('[class*="Modal__Element"], [class*="Modal__Background"], [role="dialog"]')];
    return modals.find((m) => {
      const text = clean3(m.textContent).toLowerCase();
      return text && (m.getAttribute("aria-label") || "").toLowerCase() === key;
    }) || null;
  }
  function buildPopover(document, ctx, trigger) {
    const label = clean3(trigger.textContent);
    if (!label) return [];
    const nodes = [para(document, label)];
    const modal = domPopover(document, label);
    if (modal) {
      modal.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol").forEach((n) => {
        if (n.closest("ul, ol") && !/^(UL|OL)$/.test(n.tagName)) return;
        if (/^(UL|OL)$/.test(n.tagName)) {
          const list = buildList(document, n);
          if (list) nodes.push(list);
        } else if (clean3(n.textContent)) {
          nodes.push(/^H/.test(n.tagName) ? para(document, clean3(n.textContent)) : n);
        }
      });
      modal.querySelectorAll("a[href]").forEach((a) => {
        const p = linkPara(document, a.getAttribute("href"), a.textContent, false);
        if (p) nodes.push(p);
      });
      return nodes;
    }
    const data = findPopover(ctx.objects, ctx.component, label);
    if (data) {
      if (clean3(data.heading)) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = clean3(data.heading);
        p.append(strong);
        nodes.push(p);
      }
      if (clean3(data.description)) nodes.push(para(document, clean3(data.description)));
      const points = (data.proofPoints || []).filter((pp) => pp && (clean3(pp.headline) || clean3(pp.shortCopy)));
      if (points.length) {
        const list = document.createElement("ul");
        points.forEach((pp) => {
          const li = document.createElement("li");
          if (clean3(pp.headline)) {
            const strong = document.createElement("strong");
            strong.textContent = clean3(pp.headline);
            li.append(strong);
            if (clean3(pp.shortCopy)) li.append(document.createTextNode(` ${clean3(pp.shortCopy)}`));
          } else {
            li.textContent = clean3(pp.shortCopy);
          }
          list.append(li);
        });
        nodes.push(list);
      }
      const cta = linkPara(document, data.ctaHref, data.ctaText, false);
      if (cta) nodes.push(cta);
    }
    return nodes;
  }
  function collectText(document, root, ctx, out) {
    [...root.children].forEach((child) => {
      const tag = child.tagName;
      const cls = typeof child.className === "string" ? child.className : "";
      if (/^H[1-6]$/.test(tag)) {
        if (clean3(child.textContent)) out.push(cleanHeading(child));
      } else if (tag === "P") {
        if (clean3(child.textContent)) out.push(child);
      } else if (tag === "UL" || tag === "OL") {
        if (/ButtonGroup__Element/.test(cls)) {
          out.push(...buildButtonGroup(document, child));
        } else {
          const list = buildList(document, child);
          if (list) out.push(list);
        }
      } else if (/ButtonGroup__Element/.test(cls)) {
        out.push(...buildButtonGroup(document, child));
      } else if (/IconButton__Wrapper/.test(cls)) {
        out.push(...buildPopover(document, ctx, child));
      } else if (tag === "A" && child.getAttribute("href")) {
        const p = linkPara(document, child.getAttribute("href"), child.textContent, /Button__Element/.test(cls));
        if (p) out.push(p);
      } else if (child.querySelector && child.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, a[href], [class^="IconButton__Wrapper"]')) {
        collectText(document, child, ctx, out);
      }
    });
  }
  function imageFirst(element, cols, textCol, imageCol, component) {
    if (!textCol || !imageCol) return false;
    if (component && typeof component.copyPosition === "string") {
      return component.copyPosition.toLowerCase() === "right";
    }
    const style = (element.getAttribute("style") || "").replace(/\s+/g, "");
    if (/flex-direction:row-reverse/i.test(style) || /row-?reverse|reverse/i.test(element.className || "")) {
      return cols.indexOf(imageCol) < cols.indexOf(textCol) ? false : true;
    }
    const order = (el) => {
      const m = (el.getAttribute("style") || "").match(/order:\s*(-?\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };
    const ot = order(textCol);
    const oi = order(imageCol);
    if (ot !== null || oi !== null) return (oi || 0) < (ot || 0);
    return cols.indexOf(imageCol) < cols.indexOf(textCol);
  }
  var COPY_SELECTOR = '[class^="Highlight__CopyWrapper"], [class^="HighlightProofPoints__CopyWrapper"]';
  function parse4(element, { document }) {
    const cols = [...element.querySelectorAll(':scope > [class*="Col__Element"]')];
    const copy = element.querySelector(COPY_SELECTOR);
    const textCol = cols.find((c) => c.querySelector(COPY_SELECTOR)) || null;
    const imageCol = cols.find((c) => c !== textCol && c.querySelector('[class^="HighlightProofPoints__Figure"] img')) || cols.find((c) => c !== textCol && c.querySelector("img")) || cols.find((c) => c !== textCol) || null;
    const headingEl = copy && copy.querySelector("h1, h2, h3, h4, h5, h6");
    const objects = nextDataObjects(document);
    const component = headingEl ? findComponent(objects, headingEl.textContent) : null;
    const ctx = { objects, component };
    const textCell = [];
    if (copy) collectText(document, copy, ctx, textCell);
    const img = buildImage(document, imageCol);
    const reversed = img && imageFirst(element, cols, textCol, imageCol, component);
    const cells = [reversed ? [img, textCell] : [textCell, img || ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-features.js
  function clean4(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse5(element, { document }) {
    const cells = [];
    element.querySelectorAll('[class^="BoxItem__Element"]').forEach((item) => {
      const contentCell = [];
      const heading = item.querySelector("h1, h2, h3, h4, h5, h6");
      const title = heading ? clean4(heading.textContent) : "";
      if (title) {
        const srcLink = heading.querySelector("a[href]");
        if (srcLink) {
          const h = document.createElement(heading.tagName.toLowerCase());
          const link = document.createElement("a");
          link.href = srcLink.getAttribute("href");
          link.textContent = title;
          h.append(link);
          contentCell.push(h);
        } else {
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = title;
          p.append(strong);
          contentCell.push(p);
        }
      }
      item.querySelectorAll("p").forEach((p) => {
        if (clean4(p.textContent)) contentCell.push(p);
      });
      if (contentCell.length) cells.push([contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-features", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs-pricing.js
  function clean5(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function itemText2(li) {
    const span = li.querySelector('[class^="Typography__Span"]');
    if (span) return clean5(span.textContent);
    const copy = li.cloneNode(true);
    copy.querySelectorAll("svg, title").forEach((s) => s.remove());
    return clean5(copy.textContent);
  }
  function findPlanCollections(document, labels) {
    const script = document.querySelector("#__NEXT_DATA__");
    if (!script) return null;
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return null;
    }
    const found = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (Array.isArray(node.planCollections)) found.push(node.planCollections);
      Object.keys(node).forEach((k) => walk(node[k]));
    };
    walk(data);
    if (!found.length) return null;
    const wanted = labels.map((l) => l.toLowerCase());
    return found.find((pc) => pc.some((c) => wanted.includes(clean5(c.collectionLabel).toLowerCase()))) || found[0];
  }
  function para2(document, text, bold) {
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
  function linkPara2(document, cta, primary) {
    if (!cta || !cta.href || !clean5(cta.text)) return null;
    const link = document.createElement("a");
    link.href = cta.href;
    link.textContent = clean5(cta.text);
    const p = document.createElement("p");
    if (primary) {
      const strong = document.createElement("strong");
      strong.append(link);
      p.append(strong);
    } else {
      p.append(link);
    }
    return p;
  }
  function buildPlanFromData(document, plan) {
    const nodes = [];
    if (clean5(plan.heading)) {
      const h3 = document.createElement("h3");
      h3.textContent = clean5(plan.heading);
      nodes.push(h3);
    }
    const symbol = plan.currency && plan.currency.symbol || "$";
    const discount = plan.discount && plan.discount.price ? plan.discount : null;
    const amount = discount ? discount.price : plan.price;
    if (amount) nodes.push(para2(document, clean5(`${symbol}${amount} ${plan.priceDescription || ""}`), true));
    if (discount) {
      if (clean5(discount.savingsPeriodText)) nodes.push(para2(document, clean5(discount.savingsPeriodText)));
      if (clean5(discount.savingsText)) nodes.push(para2(document, clean5(discount.savingsText)));
    }
    if (clean5(plan.description)) nodes.push(para2(document, clean5(plan.description)));
    const points = plan.points && plan.points.length ? plan.points : (plan.detailedPoints || []).map((d) => d && d.text);
    const items = points.map(clean5).filter(Boolean);
    if (items.length) {
      if (clean5(plan.pointsTitle)) nodes.push(para2(document, clean5(plan.pointsTitle)));
      const list = document.createElement("ul");
      items.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        list.append(li);
      });
      nodes.push(list);
    }
    const ctas = [plan.firstCta, plan.secondCta].filter((c) => c && c.href);
    ctas.forEach((c, i) => {
      const p = linkPara2(document, c, i === 0);
      if (p) nodes.push(p);
    });
    const learn = linkPara2(document, plan.link, false);
    if (learn) nodes.push(learn);
    return nodes;
  }
  function buildCollectionPanel(document, collection) {
    if (!collection || !Array.isArray(collection.tabs) || !collection.tabs.length) return [];
    const tab = collection.tabs[collection.initialTabIndex || 0] || collection.tabs[0];
    const nodes = [];
    (tab.plans || []).forEach((group) => {
      const plan = Array.isArray(group) ? group[0] : group;
      if (plan) nodes.push(...buildPlanFromData(document, plan));
    });
    return nodes;
  }
  function buildPlan(document, card) {
    const nodes = [];
    const h3src = card.querySelector("h3");
    if (h3src) {
      const selected = h3src.querySelector("select option:checked, select option[selected]");
      const name = selected ? clean5(selected.textContent) : clean5(h3src.textContent);
      const h3 = document.createElement("h3");
      h3.textContent = name;
      nodes.push(h3);
    }
    const priceRow = card.querySelector('[class^="PlanCard__PriceRow"]');
    if (priceRow) {
      const price = clean5(priceRow.textContent);
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
      const text = clean5(srcP.textContent);
      if (!text) return;
      const p = document.createElement("p");
      p.textContent = text;
      nodes.push(p);
    });
    const dl = top.querySelector("dl");
    if (dl) {
      const term = dl.querySelector("dt");
      const label = term ? clean5(term.textContent) : "";
      if (label) {
        const p = document.createElement("p");
        p.textContent = label;
        nodes.push(p);
      }
      const list = document.createElement("ul");
      dl.querySelectorAll("li").forEach((li) => {
        const text = itemText2(li);
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
        const text = clean5(a.textContent);
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
  function precedingHeading(element) {
    const scope = element.closest('section, [class^="Region__Element"]') || element.ownerDocument.body;
    if (!scope) return "";
    const heads = [...scope.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter((h) => !element.contains(h) && h.compareDocumentPosition(element) & 4);
    for (let i = heads.length - 1; i >= 0; i -= 1) {
      const text = clean5(heads[i].textContent);
      if (text) return text;
    }
    return "";
  }
  function parse6(element, { document }) {
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
      const labelTexts = labels.map((l) => clean5(l.textContent));
      const collections = findPlanCollections(document, labelTexts) || [];
      labels.forEach((label, i) => {
        const text = labelTexts[i];
        if (!text) return;
        let content = "";
        if (i === activeIndex) {
          content = panelContent;
        } else {
          const collection = collections.find((c) => clean5(c.collectionLabel).toLowerCase() === text.toLowerCase()) || (collections.length === labels.length ? collections[i] : null);
          const nodes = buildCollectionPanel(document, collection);
          if (nodes.length) content = nodes;
        }
        cells.push([text, content]);
      });
    } else if (panelContent.length) {
      cells.push(["Plans", panelContent]);
    } else {
      const cardContent = [];
      element.querySelectorAll('[class^="PlanCard__Element"]').forEach((card) => {
        cardContent.push(...buildPlan(document, card));
      });
      if (cardContent.length) cells.push([precedingHeading(element) || "Plans", cardContent]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "tabs-pricing", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-industry.js
  function clean6(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildImage2(document, srcImg) {
    if (!srcImg || !srcImg.getAttribute("src") || srcImg.getAttribute("src").startsWith("data:")) return "";
    const img = document.createElement("img");
    img.src = srcImg.getAttribute("src");
    img.alt = (srcImg.getAttribute("alt") || "").trim();
    return img;
  }
  function linkedHeading(document, title, srcLink) {
    const h3 = document.createElement("h3");
    if (srcLink) {
      const link = document.createElement("a");
      link.href = srcLink.getAttribute("href");
      link.textContent = title;
      h3.append(link);
    } else {
      h3.textContent = title;
    }
    return h3;
  }
  function parseContentCard(document, card) {
    const img = buildImage2(document, card.querySelector('[class^="ContentCard__ImageWrapper"] img, img'));
    const contentCell = [];
    const titleWrap = card.querySelector('[class^="ContentCard__CardTitleWrapper"]') || card;
    const heading = titleWrap.querySelector("h1, h2, h3, h4, h5, h6");
    const srcLink = heading && heading.querySelector("a[href]") || titleWrap.querySelector("a[href]");
    const title = clean6((heading || srcLink || {}).textContent);
    if (title) contentCell.push(linkedHeading(document, title, srcLink));
    card.querySelectorAll("p").forEach((p) => {
      if (clean6(p.textContent) && !p.contains(srcLink)) contentCell.push(p);
    });
    return img || contentCell.length ? [img, contentCell] : null;
  }
  function parse7(element, { document }) {
    const cells = [];
    const cards = [...element.querySelectorAll('[class^="PostCard__Card"], [class^="ContentCard__Element"]')].filter((c, i, all) => !all.some((o) => o !== c && o.contains(c)));
    cards.forEach((card) => {
      if (/^ContentCard__Element/.test(card.className)) {
        const row = parseContentCard(document, card);
        if (row) cells.push(row);
        return;
      }
      const img = buildImage2(document, card.querySelector('[class^="PostCard__ImageContainer"] img, img'));
      const contentCell = [];
      const labelEl = card.querySelector(':scope > [class^="Typography__Span"]');
      const label = labelEl ? clean6(labelEl.textContent) : "";
      if (label) {
        const p = document.createElement("p");
        p.textContent = label;
        contentCell.push(p);
      }
      const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) {
        const title = clean6(heading.textContent);
        const srcLink = heading.querySelector("a[href]") || card.querySelector("a[href]");
        if (title) contentCell.push(linkedHeading(document, title, srcLink));
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
  function clean7(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildImage3(document, scope) {
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
  function parse8(element, { document }) {
    const cells = [];
    element.querySelectorAll(':scope > [class*="Col__Element"] > [class^="Block__Element"]').forEach((promo) => {
      const contentCell = [];
      const heading = promo.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && clean7(heading.textContent)) contentCell.push(heading);
      promo.querySelectorAll("p").forEach((p) => {
        if (p.textContent.trim()) contentCell.push(p);
      });
      promo.querySelectorAll('[class^="Block__ButtonWrapper"] a[href]').forEach((a) => {
        const text = clean7(a.textContent);
        if (!text) return;
        const link = document.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = text;
        const p = document.createElement("p");
        p.append(link);
        contentCell.push(p);
      });
      const imageScope = promo.querySelector('[class^="Block__ImageWrapper"]') || promo;
      const img = buildImage3(document, imageScope);
      if (img || contentCell.length) cells.push([img, contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-offer.js
  function clean8(text) {
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
  function parse9(element, { document }) {
    const copy = element.querySelector('[class^="SinglePlanHighlight__CopyWrapper"]');
    const plan = element.querySelector('[class^="SinglePlanHighlight__PlanWrapper"]');
    const textCell = [];
    if (copy) {
      const heading = copy.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading && clean8(heading.textContent)) textCell.push(heading);
      copy.querySelectorAll(":scope > p").forEach((p) => {
        if (p.textContent.trim()) textCell.push(p);
      });
      copy.querySelectorAll("a[href]").forEach((a) => {
        const text = clean8(a.textContent);
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
      if (label && clean8(label.textContent)) cardCell.push(textParagraph(document, clean8(label.textContent)));
      plan.querySelectorAll("p").forEach((p) => {
        const text = clean8(p.textContent);
        if (!text) return;
        const isPrice = /PriceDetails/.test(p.className) || !!p.querySelector("strong");
        cardCell.push(isPrice ? textParagraph(document, text.replace(/\s+/g, ""), true) : textParagraph(document, text));
      });
      const srcList = plan.querySelector("ul, ol");
      if (srcList) {
        const list = document.createElement("ul");
        srcList.querySelectorAll(":scope > li").forEach((li) => {
          const span = li.querySelector('[class^="Typography__Span"]');
          const copy2 = li.cloneNode(true);
          copy2.querySelectorAll("svg, title").forEach((s) => s.remove());
          const text = clean8(span ? span.textContent : copy2.textContent);
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
  function clean9(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse10(element, { document }) {
    const cells = [];
    element.querySelectorAll(":scope > div").forEach((item) => {
      const contentCell = [];
      item.querySelectorAll("p").forEach((p) => {
        if (clean9(p.textContent)) contentCell.push(p);
      });
      item.querySelectorAll("a[href]").forEach((a) => {
        if (a.closest("p")) return;
        const text = clean9(a.textContent);
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

  // tools/importer/parsers/columns-intro.js
  function clean10(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function nextDataObjects2(document) {
    const script = document.querySelector("#__NEXT_DATA__");
    if (!script) return [];
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return [];
    }
    const objects = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      objects.push(node);
      Object.keys(node).forEach((k) => walk(node[k]));
    };
    walk(data);
    return objects;
  }
  function stripTags2(html) {
    return clean10(String(html || "").replace(/<[^>]*>/g, " ")).toLowerCase();
  }
  function popoverList2(o) {
    if (!o || !Array.isArray(o.popovers)) return [];
    return o.popovers.map((p) => p && p.popover ? p.popover : p).filter(Boolean);
  }
  function findPopover2(objects, headingText, label) {
    const key = clean10(label).toLowerCase();
    const match = (p) => clean10(p.button).toLowerCase() === key;
    const hk = clean10(headingText).toLowerCase();
    const component = objects.find((o) => typeof o.heading === "string" && stripTags2(o.heading) === hk && Array.isArray(o.popovers));
    const own = popoverList2(component).find(match);
    if (own) return own;
    for (const o of objects) {
      const hit = popoverList2(o).find(match);
      if (hit) return hit;
    }
    return null;
  }
  function para3(document, text, bold) {
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
  function linkPara3(document, href, text, primary) {
    if (!href || !clean10(text)) return null;
    const link = document.createElement("a");
    link.href = href;
    link.textContent = clean10(text);
    const p = document.createElement("p");
    if (primary) {
      const strong = document.createElement("strong");
      strong.append(link);
      p.append(strong);
    } else {
      p.append(link);
    }
    return p;
  }
  function buildPopover2(document, objects, headingText, trigger) {
    const label = clean10(trigger.textContent);
    if (!label) return [];
    const nodes = [para3(document, label)];
    const data = findPopover2(objects, headingText, label);
    if (!data) return nodes;
    if (clean10(data.heading)) nodes.push(para3(document, clean10(data.heading), true));
    if (clean10(data.description)) nodes.push(para3(document, clean10(data.description)));
    const points = (data.proofPoints || []).filter((pp) => pp && (clean10(pp.headline) || clean10(pp.shortCopy)));
    if (points.length) {
      const list = document.createElement("ul");
      points.forEach((pp) => {
        const li = document.createElement("li");
        if (clean10(pp.headline)) {
          const strong = document.createElement("strong");
          strong.textContent = clean10(pp.headline);
          li.append(strong);
          if (clean10(pp.shortCopy)) li.append(document.createTextNode(` ${clean10(pp.shortCopy)}`));
        } else {
          li.textContent = clean10(pp.shortCopy);
        }
        list.append(li);
      });
      nodes.push(list);
    }
    const cta = linkPara3(document, data.ctaHref, data.ctaText, false);
    if (cta) nodes.push(cta);
    return nodes;
  }
  function collect(document, root, ctx, out) {
    [...root.children].forEach((child) => {
      const tag = child.tagName;
      const cls = typeof child.className === "string" ? child.className : "";
      if (/StepsHeading__ArrowWrapper/.test(cls) || tag === "svg" || tag === "SVG") return;
      if (/^H[1-6]$/.test(tag) || tag === "P" || tag === "UL" || tag === "OL") {
        if (clean10(child.textContent)) out.push(child);
      } else if (/IconButton__Wrapper/.test(cls)) {
        out.push(...buildPopover2(document, ctx.objects, ctx.heading, child));
      } else if (/ButtonGroup__Element/.test(cls)) {
        const links = [...child.querySelectorAll("a[href]")];
        let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ""));
        if (!primary && tag === "UL") [primary] = links;
        links.forEach((a) => {
          const p = linkPara3(document, a.getAttribute("href"), a.textContent, a === primary);
          if (p) out.push(p);
        });
      } else if (tag === "A" && child.getAttribute("href")) {
        const p = linkPara3(document, child.getAttribute("href"), child.textContent, /Button__Element/.test(cls));
        if (p) out.push(p);
      } else if (child.querySelector && child.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, a[href], [class^="IconButton__Wrapper"]')) {
        collect(document, child, ctx, out);
      }
    });
  }
  function parse11(element, { document }) {
    const cols = [...element.querySelectorAll(':scope > [class*="Col__Element"]')];
    const headingCol = cols.find((c) => c.querySelector('[class^="StepsHeading__ArrowWrapper"]')) || cols[0] || element;
    const bodyCols = cols.filter((c) => c !== headingCol);
    const h2 = headingCol.querySelector("h1, h2, h3");
    const headingText = h2 ? clean10(h2.textContent) : "";
    const ctx = { objects: nextDataObjects2(document), heading: headingText };
    const headingCell = [];
    collect(document, headingCol, ctx, headingCell);
    const bodyCell = [];
    bodyCols.forEach((col) => collect(document, col, ctx, bodyCell));
    const cells = [[headingCell, bodyCell]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-intro", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/quote-testimonial.js
  function clean11(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function textParagraph2(document, text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  function buildQuote(document, quoteEl) {
    const p = document.createElement("p");
    const walk = (node, target) => {
      node.childNodes.forEach((c) => {
        if (c.nodeType === 3) {
          target.append(document.createTextNode(c.textContent));
        } else if (c.nodeType === 1) {
          if (c.getAttribute("aria-hidden") === "true" || c.tagName === "svg" || c.tagName === "SVG") return;
          if (c.tagName === "EM" || c.tagName === "STRONG" || c.tagName === "B" || c.tagName === "I") {
            const em = document.createElement(c.tagName === "STRONG" || c.tagName === "B" ? "strong" : "em");
            walk(c, em);
            if (clean11(em.textContent)) {
              target.append(document.createTextNode(" "));
              target.append(em);
              target.append(document.createTextNode(" "));
            }
          } else {
            walk(c, target);
          }
        }
      });
    };
    walk(quoteEl, p);
    p.normalize();
    p.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent = n.textContent.replace(/\s+/g, " ");
    });
    if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, "");
    if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, "");
    return clean11(p.textContent) ? p : null;
  }
  function parse12(element, { document }) {
    const cells = [];
    const srcImg = element.querySelector('[class^="Caption__ChildrenWrapper"] img, [class^="FigureCaption__FigureContent"] img, figure img, img');
    if (srcImg && srcImg.getAttribute("src") && !srcImg.getAttribute("src").startsWith("data:")) {
      const img = document.createElement("img");
      img.src = srcImg.getAttribute("src");
      img.alt = clean11(srcImg.getAttribute("alt"));
      cells.push([img]);
    }
    const quoteEl = [
      'q[class^="CustomerStory__Quote"]',
      '[class^="CustomerStoryV2__Quote"]',
      "blockquote h2",
      '[class^="BlockQuote__Quote"] p',
      '[class^="BlockQuote__Quote"]',
      "q",
      "h2",
      "h3",
      "blockquote p"
    ].map((s) => element.querySelector(s)).find(Boolean);
    const quote = quoteEl ? buildQuote(document, quoteEl) : null;
    if (quote) cells.push([quote]);
    const attribution = [];
    const seen = /* @__PURE__ */ new Set();
    const addText = (text) => {
      const t = clean11(text);
      if (!t || seen.has(t)) return;
      seen.add(t);
      attribution.push(textParagraph2(document, t));
    };
    const footer = element.querySelector('[class^="CustomerStoryV2__Attribution"], blockquote footer');
    if (footer) {
      const parts = [...footer.querySelectorAll('p, cite, span[class^="Typography__Span"]')];
      if (parts.length) parts.forEach((p) => addText(p.textContent));
      else addText(footer.textContent);
    }
    const caption = element.querySelector("figcaption");
    if (caption) {
      const parts = [...caption.querySelectorAll('p, [class^="Typography__Span"]')];
      if (parts.length) parts.forEach((p) => addText(p.textContent));
      else addText(caption.textContent);
    }
    element.querySelectorAll("p").forEach((p) => {
      if (quoteEl && quoteEl.contains(p) || footer && footer.contains(p) || caption && caption.contains(p) || p.closest("blockquote")) return;
      if (p.querySelector("a") && clean11(p.textContent) === clean11(p.querySelector("a").textContent)) return;
      addText(p.textContent);
    });
    element.querySelectorAll("a[href]").forEach((a) => {
      const text = clean11(a.textContent);
      if (!text || seen.has(text)) return;
      seen.add(text);
      const link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = text;
      const p = document.createElement("p");
      p.append(link);
      attribution.push(p);
    });
    if (attribution.length) cells.push([attribution]);
    const block = WebImporter.Blocks.createBlock(document, { name: "quote-testimonial", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/table-comparison.js
  var MAX_TOOLTIP_LENGTH = 200;
  function clean12(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  var BLOCK_TAGS = /* @__PURE__ */ new Set(["P", "DIV", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "DL", "DT", "DD"]);
  function textBlocks(node) {
    const blocks = [];
    let buffer = "";
    const flush = () => {
      const text = clean12(buffer);
      if (text) blocks.push(text);
      buffer = "";
    };
    const walk = (n) => {
      n.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          buffer += child.textContent;
        } else if (child.nodeType === 1) {
          const tag = child.tagName.toUpperCase();
          if (tag === "SVG" || tag === "TITLE") return;
          if (BLOCK_TAGS.has(tag)) {
            flush();
            walk(child);
            flush();
          } else {
            walk(child);
          }
        }
      });
    };
    walk(node);
    flush();
    return blocks;
  }
  function para4(document, text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  function cellValue(document, cell) {
    const svg = cell.querySelector("svg");
    if (svg) {
      const title = svg.querySelector("title");
      let label = clean12(title && title.textContent) || clean12(svg.getAttribute("aria-label"));
      if (!label) {
        const ref = svg.getAttribute("aria-labelledby");
        const refEl = ref && cell.ownerDocument.getElementById(ref);
        label = clean12(refEl && refEl.textContent);
      }
      if (/^(included|tick|yes|check)/i.test(label)) return "Included";
      if (/^(excluded|cross|no|not included)/i.test(label)) return "Excluded";
      if (label) return label;
    }
    const copy = cell.cloneNode(true);
    copy.querySelectorAll("svg").forEach((s) => s.remove());
    const blocks = textBlocks(copy);
    if (blocks.length > 1) return blocks.map((t) => para4(document, t));
    return clean12(copy.textContent);
  }
  function findTooltips(document) {
    const map = /* @__PURE__ */ new Map();
    const script = document.querySelector("#__NEXT_DATA__");
    if (!script) return map;
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return map;
    }
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const pop = node.popover;
      if (pop && typeof pop === "object" && typeof pop.button === "string") {
        const key = clean12(pop.button).toLowerCase();
        if (key && !map.has(key)) map.set(key, clean12(pop.description));
      }
      Object.keys(node).forEach((k) => walk(node[k]));
    };
    walk(data);
    return map;
  }
  function labelValue(document, cell, tooltips) {
    const button = cell.querySelector("button");
    if (button) {
      const textEl = button.querySelector('[class^="IconButton__ChildrenWrapper"]') || button;
      const copy = textEl.cloneNode(true);
      copy.querySelectorAll("svg").forEach((s) => s.remove());
      const text2 = clean12(copy.textContent);
      if (text2) {
        const tip = tooltips().get(text2.toLowerCase());
        if (tip && tip.length < MAX_TOOLTIP_LENGTH) return [para4(document, text2), para4(document, tip)];
        return text2;
      }
    }
    const link = cell.querySelector("a[href]");
    const text = clean12(cell.textContent);
    if (link && text) {
      const a = document.createElement("a");
      a.href = link.getAttribute("href");
      a.textContent = text;
      return a;
    }
    return text;
  }
  function headingValue(cell) {
    const copy = cell.cloneNode(true);
    copy.querySelectorAll("a, button, svg").forEach((n) => n.remove());
    const blocks = textBlocks(copy).filter((t, i, all) => all.indexOf(t) === i);
    return blocks.join(" ");
  }
  function parse13(element, { document }) {
    const cells = [];
    const table = element.querySelector("table");
    const rows = table ? [...table.querySelectorAll("tr")] : [];
    let tooltipMap = null;
    const tooltips = () => {
      if (!tooltipMap) tooltipMap = findTooltips(document);
      return tooltipMap;
    };
    let width = 0;
    rows.forEach((tr) => {
      width = Math.max(width, tr.querySelectorAll(":scope > th, :scope > td").length);
    });
    const cellsOf = (tr) => [...tr.querySelectorAll(":scope > th, :scope > td")];
    const isHeadRow = (tr, rowIndex) => !!tr.closest("thead") || rowIndex === 0 && !tr.closest("tbody");
    const headRows = rows.filter((tr, i) => isHeadRow(tr, i) && cellsOf(tr).length);
    let headerRow = null;
    if (headRows.length > 1) {
      let best = -1;
      headRows.forEach((tr) => {
        const named = cellsOf(tr).filter((c) => headingValue(c)).length;
        if (named >= best) {
          best = named;
          headerRow = tr;
        }
      });
    }
    rows.forEach((tr, rowIndex) => {
      const srcCells = cellsOf(tr);
      if (!srcCells.length) return;
      const isHead = isHeadRow(tr, rowIndex);
      let row;
      if (isHead && headerRow) {
        if (tr !== headerRow) return;
        row = srcCells.map((cell) => headingValue(cell));
      } else {
        row = srcCells.map((cell, i) => {
          if (isHead) return i === 0 && !clean12(cell.textContent) ? "" : clean12(cell.textContent);
          return i === 0 ? labelValue(document, cell, tooltips) : cellValue(document, cell);
        });
      }
      while (row.length < width) row.push("");
      if (row.some((c) => Array.isArray(c) ? c.length : c)) cells.push(row);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "table-comparison", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion-faq.js
  function clean13(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function linkParagraph(document, a) {
    const text = clean13(a.textContent);
    if (!text) return null;
    const link = document.createElement("a");
    link.href = a.getAttribute("href");
    link.textContent = text;
    const p = document.createElement("p");
    p.append(link);
    return p;
  }
  function buildAnswer(document, content) {
    const nodes = [];
    const seenText = /* @__PURE__ */ new Set();
    const walk = (parent) => {
      [...parent.children].forEach((child) => {
        const tag = child.tagName;
        if (/^(P|UL|OL|H[1-6]|TABLE|BLOCKQUOTE)$/.test(tag)) {
          const text = clean13(child.textContent);
          if (!text || seenText.has(text)) return;
          seenText.add(text);
          nodes.push(child);
        } else if (tag === "A" && child.getAttribute("href")) {
          const p = linkParagraph(document, child);
          if (p) nodes.push(p);
        } else if (child.querySelector && child.querySelector("a[href], p, ul, ol, h1, h2, h3, h4, h5, h6")) {
          walk(child);
        } else {
          const text = clean13(child.textContent);
          if (text && !seenText.has(text) && !/^(SVG|BUTTON)$/i.test(tag)) {
            seenText.add(text);
            const p = document.createElement("p");
            p.textContent = text;
            nodes.push(p);
          }
        }
      });
    };
    walk(content);
    return nodes;
  }
  function parse14(element, { document }) {
    const cells = [];
    const isTerm = (n) => n.tagName === "DT" || /^AccordionItem__Term/.test(n.className || "");
    const isDetail = (n) => n.tagName === "DD" || /^AccordionItem__Detail/.test(n.className || "");
    const kids = [...element.children];
    const terms = kids.some(isTerm) ? kids.filter(isTerm) : [...element.querySelectorAll(':scope > * > dt, :scope > * > [class^="AccordionItem__Term"]')];
    const details = [...element.querySelectorAll('dd, [class^="AccordionItem__Detail"]')].filter((d, i, all) => !all.some((o) => o !== d && o.contains(d)));
    terms.forEach((dt) => {
      const titleEl = dt.querySelector('[class^="AccordionItem__Title"] [class^="Typography__Span"]') || dt.querySelector('[class^="AccordionItem__Title"] b, [class^="AccordionItem__Title"] strong') || dt.querySelector('[class^="AccordionItem__Title"]') || dt;
      const question = clean13(titleEl.textContent);
      const btn = dt.querySelector("[aria-controls]");
      let dd = null;
      const controls = btn && btn.getAttribute("aria-controls");
      if (controls) {
        dd = details.find((d) => d.id === controls) || null;
      }
      if (!dd) {
        let n = dt.nextElementSibling;
        while (n && !isDetail(n) && !isTerm(n)) n = n.nextElementSibling;
        if (n && isDetail(n)) dd = n;
      }
      let answer = [];
      if (dd) {
        const content = dd.querySelector('[class^="AccordionItem__Content"]') || dd.querySelector('[class^="Responsive__Wrapper"]') || dd;
        answer = buildAnswer(document, content);
      }
      if (question || answer.length) cells.push([question, answer]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion-faq", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/xero-cleanup.js
  var SVG_RASTER_MAP = {
    "https://www.xero.com/content/dam/xero/pilot-images/core-page-assets/features/features-tiles/1-1/claim-expenses.1788841017567.svg": "https://content.da.live/legokam/xero/media/svg-raster/claim-expenses.1788841017567.png",
    "https://www.xero.com/content/dam/xero/pilot-images/core-page-assets/features/features-tiles/16-9/claim-expenses.1788841004140.svg": "https://content.da.live/legokam/xero/media/svg-raster/claim-expenses.1788841004140.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/expenses/expenses_photograph-receipts.1646877469870.svg": "https://content.da.live/legokam/xero/media/svg-raster/expenses_photograph-receipts.1646877469870.png",
    "https://www.xero.com/content/dam/xero/pilot-images/product-pages/xero-tax/tax_returns.1646877528364.svg": "https://content.da.live/legokam/xero/media/svg-raster/tax_returns.1646877528364.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/inventory/inventory_add-items-to-invoices.1646877464423.svg": "https://content.da.live/legokam/xero/media/svg-raster/inventory_add-items-to-invoices.1646877464423.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/expenses/expenses_use-our-app.1646877469276.svg": "https://content.da.live/legokam/xero/media/svg-raster/expenses_use-our-app.1646877469276.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/expenses/expenses_monitor-spending.1646877466834.svg": "https://content.da.live/legokam/xero/media/svg-raster/expenses_monitor-spending.1646877466834.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/invoicing/invoicing_customise-your-invoices.1646877462358.svg": "https://content.da.live/legokam/xero/media/svg-raster/invoicing_customise-your-invoices.1646877462358.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/bank-reconciliation/bank-reconciliation_dashboard.1646877466055.svg": "https://content.da.live/legokam/xero/media/svg-raster/bank-reconciliation_dashboard.1646877466055.png",
    "https://www.xero.com/content/dam/xero/pilot-images/product-pages/xero-cashbook-ledger/cashbook-ledger_bank-transactions.1646877529631.svg": "https://content.da.live/legokam/xero/media/svg-raster/cashbook-ledger_bank-transactions.1646877529631.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/invoicing/invoicing_send-from-phone.1646877461215.svg": "https://content.da.live/legokam/xero/media/svg-raster/invoicing_send-from-phone.1646877461215.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/purchase-orders/purchase-orders_convert-orders-into-bills.1646877468965.svg": "https://content.da.live/legokam/xero/media/svg-raster/purchase-orders_convert-orders-into-bills.1646877468965.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/purchase-orders/purchase-orders_customise.1646877469911.svg": "https://content.da.live/legokam/xero/media/svg-raster/purchase-orders_customise.1646877469911.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/quotes/quotes_click-to-accept.1646877474398.svg": "https://content.da.live/legokam/xero/media/svg-raster/quotes_click-to-accept.1646877474398.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/inventory/inventory_track-stocked-items.1646877459996.svg": "https://content.da.live/legokam/xero/media/svg-raster/inventory_track-stocked-items.1646877459996.png",
    "https://www.xero.com/content/dam/xero/pilot-images/audience/ecommerce/audience-ecommerce-pay-bills-on-time-every-time.1646877656494.svg": "https://content.da.live/legokam/xero/media/svg-raster/audience-ecommerce-pay-bills-on-time-every-time.1646877656494.png",
    "https://www.xero.com/content/dam/xero/pilot-images/audience/farming/audience-farming-automate-everyday-tasks.1646877643351.svg": "https://content.da.live/legokam/xero/media/svg-raster/audience-farming-automate-everyday-tasks.1646877643351.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/quotes/quotes_convert-to-invoice.1646877476536.svg": "https://content.da.live/legokam/xero/media/svg-raster/quotes_convert-to-invoice.1646877476536.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/quotes/quotes_create-online.1646877478613.svg": "https://content.da.live/legokam/xero/media/svg-raster/quotes_create-online.1646877478613.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/inventory/inventory_track-sales.1646877466396.svg": "https://content.da.live/legokam/xero/media/svg-raster/inventory_track-sales.1646877466396.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/expenses/expenses_reimburse-expenses-promptly.1646877461100.svg": "https://content.da.live/legokam/xero/media/svg-raster/expenses_reimburse-expenses-promptly.1646877461100.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/purchase-orders/purchase-orders_create-orders-online.1646877470320.svg": "https://content.da.live/legokam/xero/media/svg-raster/purchase-orders_create-orders-online.1646877470320.png",
    "https://www.xero.com/content/dam/xero/pilot-images/features/bank-reconciliation/bank-reconciliation_suggest-matches.1646877460618.svg": "https://content.da.live/legokam/xero/media/svg-raster/bank-reconciliation_suggest-matches.1646877460618.png",
    "https://www.xero.com/content/dam/xero/pilot-images/core-page-assets/jax-hero-homepage.1785468700971.svg": "https://content.da.live/legokam/xero/media/svg-raster/jax-hero-homepage.1785468700971.png",
    "https://www.xero.com/content/dam/xero/pilot-images/core-page-assets/features/features-tiles/1-1/bank-reconciliation.1788841017170.svg": "https://content.da.live/legokam/xero/media/svg-raster/bank-reconciliation.1788841017170.png",
    "https://www.xero.com/content/dam/xero/pilot-images/core-page-assets/au/au-home-7-1.1785293388650.svg": "https://content.da.live/legokam/xero/media/svg-raster/au-home-7-1.1785293388650.png"
  };
  var REGION_SELECTOR = "main > div.xero-react";
  var NEXT_DATA_STASH_ID = "xero-next-data-stash";
  var CONTENT_SELECTOR = "img, picture, video, iframe, table, embed, object";
  var TRACKING_HOSTS = [
    "trkn.us",
    "bat.bing.com",
    "rlcdn.com",
    "podscribe.com",
    "facebook.com/tr",
    "facebook.net",
    "doubleclick.net",
    "//t.co/",
    "analytics.twitter.com",
    "ads-twitter.com",
    "px.ads.linkedin.com",
    "linkedin.com/px",
    "snap.licdn.com",
    "google-analytics.com",
    "googletagmanager.com",
    "googleadservices.com",
    "adservice.google",
    "demdex.net",
    "everesttech.net",
    "adsrvr.org",
    "quantserve.com",
    "scorecardresearch.com",
    "tiktok.com/i18n/pixel",
    "reddit.com/rp.gif",
    "pinterest.com/v3",
    "ct.pinterest.com"
  ];
  function isTrackingSrc(src) {
    if (!src) return false;
    const s = src.toLowerCase();
    return TRACKING_HOSTS.some((h) => s.includes(h));
  }
  function hasContent(el, ignoreHeadings) {
    if (!el) return false;
    let text = el.textContent;
    if (ignoreHeadings) {
      el.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
        text = text.replace(h.textContent, "");
      });
    }
    if (text.trim().length > 0) return true;
    return !!el.querySelector(CONTENT_SELECTOR);
  }
  function removeWithRegion(el, ignoreHeadings) {
    const region = el.closest(REGION_SELECTOR);
    el.remove();
    if (region && region.parentNode && !hasContent(region, ignoreHeadings)) region.remove();
  }
  function outermost(root, selector) {
    return [...root.querySelectorAll(selector)].filter((el) => !el.parentElement || !el.parentElement.closest(selector));
  }
  function removeAndPrune(el) {
    const region = el.closest(REGION_SELECTOR);
    let parent = el.parentElement;
    el.remove();
    while (parent && parent !== region && parent.tagName !== "MAIN" && !hasContent(parent)) {
      const next = parent.parentElement;
      parent.remove();
      parent = next;
    }
    if (region && region.parentNode && !hasContent(region)) region.remove();
  }
  function unwrap(el) {
    el.replaceWith(...el.childNodes);
  }
  var TOP_TEXT = /^back to (the )?top$/i;
  var TOP_HREF = /^#(top|page-top|main|main-content|__next)?$/i;
  function isBackToTop(el) {
    const links = [...el.querySelectorAll("a[href]")];
    if (!links.length) return false;
    return links.every((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href.startsWith("#")) return false;
      const text = a.textContent.replace(/\s+/g, " ").trim();
      return TOP_TEXT.test(text) || TOP_HREF.test(href);
    });
  }
  function unwrapHighlight(wrapper, document) {
    wrapper.querySelectorAll('[aria-hidden="true"], svg').forEach((n) => n.remove());
    wrapper.querySelectorAll('[class^="Highlight__Inner"]').forEach(unwrap);
    const tag = wrapper.tagName === "STRONG" || wrapper.tagName === "B" ? "strong" : "em";
    const clean14 = document.createElement(tag);
    clean14.append(...wrapper.childNodes);
    if (clean14.textContent.trim()) wrapper.replaceWith(clean14);
    else wrapper.remove();
  }
  function blockElements(element, payload) {
    const blocks = payload && payload.template && payload.template.blocks || [];
    const els = [];
    blocks.forEach((b) => {
      (b.instances || []).forEach((sel) => {
        try {
          element.querySelectorAll(sel).forEach((e) => els.push(e));
        } catch (e) {
        }
      });
    });
    return els;
  }
  function convertButtonGroup(ul, document) {
    const links = [...ul.querySelectorAll("a[href]")];
    if (!links.length) return;
    let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ""));
    if (!primary && ul.tagName === "UL") [primary] = links;
    const frag = document.createDocumentFragment();
    links.forEach((a) => {
      const text = a.textContent.replace(/\s+/g, " ").trim();
      if (!text) return;
      const link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = text;
      const p = document.createElement("p");
      if (a === primary) {
        const strong = document.createElement("strong");
        strong.append(link);
        p.append(strong);
      } else {
        p.append(link);
      }
      frag.append(p);
    });
    ul.replaceWith(frag);
  }
  function transform(hookName, element, payload) {
    const document = element.ownerDocument;
    if (hookName === "beforeTransform") {
      const stash = document.getElementById(NEXT_DATA_STASH_ID);
      if (stash && !document.getElementById("__NEXT_DATA__")) {
        const script = document.createElement("script");
        script.id = "__NEXT_DATA__";
        script.type = "application/json";
        script.textContent = stash.getAttribute("data-json") || "";
        element.append(script);
      }
      if (stash) stash.remove();
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        '[class*="onetrust"]'
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
      outermost(element, '[class^="Breadcrumbs__"]').forEach((bc) => {
        if (!bc.parentNode) return;
        const nav = bc.closest("nav");
        const target = nav && nav.closest(REGION_SELECTOR) !== nav ? nav : bc;
        removeWithRegion(target, false);
      });
      outermost(element, 'main [class^="Crumb__"]').forEach((crumb) => {
        if (!crumb.parentNode) return;
        const nav = crumb.closest("nav");
        const list = crumb.closest("ol, ul");
        let target = crumb;
        if (nav && nav.closest(REGION_SELECTOR) !== nav) target = nav;
        else if (list) target = list;
        removeWithRegion(target, false);
      });
      outermost(element, '[class^="Trustpilot__Wrapper"]').forEach((tp) => {
        if (tp.parentNode) removeWithRegion(tp, true);
      });
      outermost(element, '[class^="G2StarRatingWidget__"]').forEach((g2) => {
        if (g2.parentNode) removeAndPrune(g2);
      });
      outermost(element, 'main [class^="Responsive__Wrapper"]:has([class^="PlanStackV2__"])').forEach((rw) => {
        if (rw.parentNode) removeAndPrune(rw);
      });
      outermost(element, 'main [class^="SecondaryNavigation__"]').forEach((sn) => {
        if (!sn.parentNode) return;
        const nav = sn.closest("nav");
        const target = nav && nav.closest("main") && nav.closest(REGION_SELECTOR) !== nav ? nav : sn;
        removeAndPrune(target);
      });
      outermost(element, 'main [class^="TopBar__Element"]').forEach((tb) => {
        if (!tb.parentNode) return;
        tb.querySelectorAll('button, [class^="IconButton__"]').forEach((b) => b.remove());
        tb.querySelectorAll('[class^="TopBar__ChildWrapper"]').forEach((w) => {
          w.before(" ");
          unwrap(w);
        });
        const paras = [...tb.querySelectorAll("p, h1, h2, h3, h4, h5, h6")].filter((p) => p.textContent.trim());
        if (paras.length) tb.replaceWith(...paras);
        else removeWithRegion(tb, false);
      });
      outermost(element, 'main [class^="AnchorButton__"]').forEach((ab) => {
        if (ab.parentNode && isBackToTop(ab)) removeAndPrune(ab);
      });
      outermost(element, "main form").forEach((form) => {
        if (form.parentNode) removeAndPrune(form);
      });
      outermost(element, 'main [class^="ProgressiveForm__"], main [class^="InlineForm__"]').forEach((fw) => {
        if (!fw.parentNode) return;
        fw.querySelectorAll("input, select, textarea, button, label, fieldset").forEach((c) => c.remove());
        if (!hasContent(fw)) removeAndPrune(fw);
      });
      element.querySelectorAll('main [class^="Highlight__Wrapper"]').forEach((hw) => {
        if (hw.parentNode) unwrapHighlight(hw, document);
      });
      element.querySelectorAll('main [class^="ZigZag__"], main [class^="HalfSpark__"], main [class^="Highlighter__Accessory"]').forEach((acc) => {
        if (acc.parentNode && !acc.textContent.trim()) acc.remove();
      });
      element.querySelectorAll(":scope > img").forEach((img) => img.remove());
      WebImporter.DOMUtils.remove(element, ['[id^="batBeacon"]', "#db_lr_pixel_ad", "#podscribe-request"]);
      element.querySelectorAll("img").forEach((img) => {
        if (isTrackingSrc(img.getAttribute("src"))) img.remove();
      });
      WebImporter.DOMUtils.remove(element, [
        "next-route-announcer",
        "#__next-route-announcer__",
        "iframe"
      ]);
      const blocks = blockElements(element, payload);
      outermost(element, 'main ul[class^="ButtonGroup__Element"], main div[class^="ButtonGroup__Element"]').forEach((ul) => {
        if (!ul.parentNode) return;
        if (blocks.some((b) => b === ul || b.contains(ul))) return;
        convertButtonGroup(ul, document);
      });
    }
    if (hookName === "afterTransform") {
      WebImporter.DOMUtils.remove(element, [
        '[class*="Modal__Background"]',
        '[class*="Modal__Element"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "link",
        "iframe",
        "source",
        "cs-native-frame-holder"
      ]);
      element.querySelectorAll("img").forEach((img) => {
        if (isTrackingSrc(img.getAttribute("src"))) img.remove();
      });
      element.querySelectorAll('img[src*=".svg"]').forEach((img) => {
        let key = img.getAttribute("src").split("?")[0];
        if (key.startsWith("/")) key = `https://www.xero.com${key}`;
        if (SVG_RASTER_MAP[key]) img.setAttribute("src", SVG_RASTER_MAP[key]);
      });
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
  var REGION_SELECTOR2 = "main > div.xero-react";
  var BREAK = "data-excat-break";
  var STYLE = "data-excat-section-style";
  var FIRST = "data-excat-first";
  var CONTENT_SELECTOR2 = "img, picture, video, iframe, table, embed, object";
  function hasContent2(node) {
    if (!node) return false;
    if (node.nodeType === 3) return node.textContent.trim().length > 0;
    if (node.nodeType !== 1) return false;
    if (node.tagName === "HR") return false;
    if (node.textContent.trim().length > 0) return true;
    if (node.matches(CONTENT_SELECTOR2)) return true;
    return !!node.querySelector(CONTENT_SELECTOR2);
  }
  function safeMatch(region, sel) {
    try {
      return region.matches(sel) || !!region.querySelector(sel);
    } catch (e) {
      return false;
    }
  }
  function sectionFor(region, sections) {
    return sections.find((section) => {
      const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
      return selectors.some((sel) => sel && safeMatch(region, sel));
    }) || null;
  }
  function segmentAfter(hr) {
    const nodes = [];
    let n = hr.nextSibling;
    while (n && !(n.nodeType === 1 && n.tagName === "HR" && n.hasAttribute(BREAK))) {
      nodes.push(n);
      n = n.nextSibling;
    }
    return nodes;
  }
  function transform2(hookName, element, payload) {
    const document = element.ownerDocument;
    const sections = payload && payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      const regions = [...element.querySelectorAll(REGION_SELECTOR2)];
      if (regions.length < 2) return;
      const live = regions.filter((r) => hasContent2(r));
      for (let i = live.length - 1; i >= 0; i -= 1) {
        const region = live[i];
        const section = sectionFor(region, sections);
        const style = section && section.style;
        if (i > 0) {
          const hr = document.createElement("hr");
          hr.setAttribute(BREAK, "true");
          if (style) hr.setAttribute(STYLE, style);
          region.before(hr);
        } else if (style) {
          const hr = document.createElement("hr");
          hr.setAttribute(BREAK, "true");
          hr.setAttribute(FIRST, "true");
          hr.setAttribute(STYLE, style);
          region.before(hr);
        }
      }
    }
    if (hookName === "afterTransform") {
      let breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];
      if (!breaks.length) return;
      for (let i = breaks.length - 1; i >= 0; i -= 1) {
        const hr = breaks[i];
        if (!segmentAfter(hr).some(hasContent2)) hr.remove();
      }
      breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];
      const firstBreak = breaks[0];
      if (firstBreak && !firstBreak.hasAttribute(FIRST)) {
        let n = firstBreak.previousSibling;
        let before = false;
        while (n && !before) {
          before = hasContent2(n);
          n = n.previousSibling;
        }
        if (!before) firstBreak.setAttribute(FIRST, "true");
      }
      breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];
      for (let i = breaks.length - 1; i >= 0; i -= 1) {
        const hr = breaks[i];
        const style = hr.getAttribute(STYLE);
        if (style) {
          const seg = segmentAfter(hr);
          const last = seg.length ? seg[seg.length - 1] : hr;
          const meta = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style }
          });
          last.after(meta);
        }
      }
      element.querySelectorAll(`hr[${BREAK}]`).forEach((hr) => {
        if (hr.getAttribute(FIRST) === "true") {
          hr.remove();
        } else {
          hr.removeAttribute(BREAK);
          hr.removeAttribute(STYLE);
        }
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
        "name": "video",
        "instances": [
          '[class^="Video__Element"]'
        ]
      },
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
          '[class*="Row__Element"]:has(> [class*="Col__Element"] > [class*="Box"] > [class^="BoxSet__Content"] > [class^="BoxItem__Element"])'
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
          'main [class*="Col__Element"]:has(> div:not([class]) > p[class*="Typography__Paragraph"]):not([class^="AccordionItem__"] *)'
        ]
      },
      {
        "name": "columns-intro",
        "instances": [
          '[class*="Row__Element"]:has(> [class*="Col__Element"] > [class^="StepsHeading__ArrowWrapper"])'
        ]
      },
      {
        "name": "quote-testimonial",
        "instances": [
          '[class^="Region__Background"] > [class^="Grid__Element"]:has([class^="CustomerStory"])'
        ]
      },
      {
        "name": "table-comparison",
        "instances": [
          '[class^="Table__Wrapper"]:has(table[class^="Table__Element"])'
        ]
      },
      {
        "name": "accordion-faq",
        "instances": [
          'dl[class^="Accordion__Element"]:not([class^="FinTabSet__Wrapper"] *, [class^="PlanCard__"] *)'
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
    "video": parse,
    "hero-split": parse2,
    "cards-logos": parse3,
    "columns-feature": parse4,
    "cards-features": parse5,
    "tabs-pricing": parse6,
    "cards-industry": parse7,
    "cards-promo": parse8,
    "columns-offer": parse9,
    "cards-footnotes": parse10,
    "columns-intro": parse11,
    "quote-testimonial": parse12,
    "table-comparison": parse13,
    "accordion-faq": parse14
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
    // html2md strips <script> tags before transform; stash the Next.js page data
    // (pricing plans, video IDs, popovers) so the cleanup transformer can restore it.
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      const data = document.getElementById("__NEXT_DATA__");
      if (!data || document.getElementById("xero-next-data-stash")) return;
      const stash = document.createElement("div");
      stash.id = "xero-next-data-stash";
      stash.setAttribute("data-json", data.textContent);
      document.body.append(stash);
    }),
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
