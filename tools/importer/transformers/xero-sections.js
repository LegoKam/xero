/* eslint-disable */
/* global WebImporter */

/**
 * Xero sections transformer.
 *
 * Every top-level content region (`main > div.xero-react`) is its own section.
 * beforeTransform: insert an <hr> section break before every non-first region
 *   that still has content (regions emptied by cleanup are skipped). Regions
 *   that match a template sections[] entry with a style get their break marked
 *   with the style; a styled first region gets a temporary marker <hr>.
 * afterTransform: drop breaks that would open empty sections (content removed
 *   by parsers/cleanup), append Section Metadata for styled sections, and
 *   remove temporary markers.
 *
 * Generic: works for any template; no-op when the page has fewer than 2 regions.
 */
const REGION_SELECTOR = 'main > div.xero-react';
const BREAK = 'data-excat-break';
const STYLE = 'data-excat-section-style';
const FIRST = 'data-excat-first';
const CONTENT_SELECTOR = 'img, picture, video, iframe, table, embed, object';

function hasContent(node) {
  if (!node) return false;
  if (node.nodeType === 3) return node.textContent.trim().length > 0;
  if (node.nodeType !== 1) return false;
  if (node.tagName === 'HR') return false;
  if (node.textContent.trim().length > 0) return true;
  if (node.matches(CONTENT_SELECTOR)) return true;
  return !!node.querySelector(CONTENT_SELECTOR);
}

function safeMatch(region, sel) {
  try {
    return region.matches(sel) || !!region.querySelector(sel);
  } catch (e) {
    return false;
  }
}

/** First sections[] entry (in template order) whose selector matches the region. */
function sectionFor(region, sections) {
  return sections.find((section) => {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    return selectors.some((sel) => sel && safeMatch(region, sel));
  }) || null;
}

/** Sibling nodes following `hr` up to (not including) the next section break hr. */
function segmentAfter(hr) {
  const nodes = [];
  let n = hr.nextSibling;
  while (n && !(n.nodeType === 1 && n.tagName === 'HR' && n.hasAttribute(BREAK))) {
    nodes.push(n);
    n = n.nextSibling;
  }
  return nodes;
}

export default function transform(hookName, element, payload) {
  const document = element.ownerDocument;
  const sections = (payload && payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    const regions = [...element.querySelectorAll(REGION_SELECTOR)];
    if (regions.length < 2) return;

    const live = regions.filter((r) => hasContent(r));
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const region = live[i];
      const section = sectionFor(region, sections);
      const style = section && section.style;
      if (i > 0) {
        const hr = document.createElement('hr');
        hr.setAttribute(BREAK, 'true');
        if (style) hr.setAttribute(STYLE, style);
        region.before(hr);
      } else if (style) {
        // Temporary marker for a styled first section; removed in afterTransform
        const hr = document.createElement('hr');
        hr.setAttribute(BREAK, 'true');
        hr.setAttribute(FIRST, 'true');
        hr.setAttribute(STYLE, style);
        region.before(hr);
      }
    }
  }

  if (hookName === 'afterTransform') {
    let breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];
    if (!breaks.length) return;

    // 1. Drop breaks whose section ended up empty (keep a styled first marker
    //    only if its section still has content).
    for (let i = breaks.length - 1; i >= 0; i -= 1) {
      const hr = breaks[i];
      if (!segmentAfter(hr).some(hasContent)) hr.remove();
    }
    breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];

    // 2. A break with no content before it would open an empty first
    //    section: turn it into a first-section marker (removed in step 4,
    //    its style is still applied in step 3).
    const firstBreak = breaks[0];
    if (firstBreak && !firstBreak.hasAttribute(FIRST)) {
      let n = firstBreak.previousSibling;
      let before = false;
      while (n && !before) {
        before = hasContent(n);
        n = n.previousSibling;
      }
      if (!before) firstBreak.setAttribute(FIRST, 'true');
    }

    // 3. Section Metadata at the end of each styled section.
    breaks = [...element.querySelectorAll(`hr[${BREAK}]`)];
    for (let i = breaks.length - 1; i >= 0; i -= 1) {
      const hr = breaks[i];
      const style = hr.getAttribute(STYLE);
      if (style) {
        const seg = segmentAfter(hr);
        const last = seg.length ? seg[seg.length - 1] : hr;
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style },
        });
        last.after(meta);
      }
    }

    // 4. Remove temporary markers / attributes.
    element.querySelectorAll(`hr[${BREAK}]`).forEach((hr) => {
      if (hr.getAttribute(FIRST) === 'true') {
        hr.remove();
      } else {
        hr.removeAttribute(BREAK);
        hr.removeAttribute(STYLE);
      }
    });
  }
}
