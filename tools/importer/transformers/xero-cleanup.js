/* eslint-disable */
/* global WebImporter */

/**
 * Xero cleanup transformer.
 * Removes non-authorable site chrome (global header/nav incl. promo bar,
 * global footer, breadcrumbs, OneTrust cookie consent, Trustpilot widget,
 * modals, tracking pixels/iframes) and converts standalone CTA button groups
 * into paragraphs of links.
 *
 * NOTE: the hero section inside <main> uses a <header class="Region__Element...">
 * which is authorable content - only headers OUTSIDE <main> are removed.
 * NOTE: <script id="__NEXT_DATA__"> and body-level modals are kept until
 * afterTransform because parsers read them (pricing tabs, video IDs, popovers).
 */
const REGION_SELECTOR = 'main > div.xero-react';
const CONTENT_SELECTOR = 'img, picture, video, iframe, table, embed, object';

const TRACKING_HOSTS = [
  'trkn.us',
  'bat.bing.com',
  'rlcdn.com',
  'podscribe.com',
  'facebook.com/tr',
  'facebook.net',
  'doubleclick.net',
  '//t.co/',
  'analytics.twitter.com',
  'ads-twitter.com',
  'px.ads.linkedin.com',
  'linkedin.com/px',
  'snap.licdn.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googleadservices.com',
  'adservice.google',
  'demdex.net',
  'everesttech.net',
  'adsrvr.org',
  'quantserve.com',
  'scorecardresearch.com',
  'tiktok.com/i18n/pixel',
  'reddit.com/rp.gif',
  'pinterest.com/v3',
  'ct.pinterest.com',
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
    el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      text = text.replace(h.textContent, '');
    });
  }
  if (text.trim().length > 0) return true;
  return !!el.querySelector(CONTENT_SELECTOR);
}

/**
 * Remove `el`; if its top-level content region is left with no authorable
 * content (optionally ignoring orphan headings), drop the whole region.
 */
function removeWithRegion(el, ignoreHeadings) {
  const region = el.closest(REGION_SELECTOR);
  el.remove();
  if (region && region.parentNode && !hasContent(region, ignoreHeadings)) region.remove();
}

/** Outermost elements matching `selector` (skip ones nested in another match). */
function outermost(root, selector) {
  return [...root.querySelectorAll(selector)]
    .filter((el) => !el.parentElement || !el.parentElement.closest(selector));
}

function blockElements(element, payload) {
  const blocks = (payload && payload.template && payload.template.blocks) || [];
  const els = [];
  blocks.forEach((b) => {
    (b.instances || []).forEach((sel) => {
      try {
        element.querySelectorAll(sel).forEach((e) => els.push(e));
      } catch (e) { /* invalid selector - ignore */ }
    });
  });
  return els;
}

/**
 * ButtonGroup (ul list or single-item div) -> one <p> per link. The primary
 * (Button__Element) link - or the first link of a list group - is wrapped in
 * <strong> so EDS decorates it as a primary button.
 */
function convertButtonGroup(ul, document) {
  const links = [...ul.querySelectorAll('a[href]')];
  if (!links.length) return;
  let primary = links.find((a) => /(^|\s)Button__Element/.test(a.className || ''));
  if (!primary && ul.tagName === 'UL') [primary] = links;
  const frag = document.createDocumentFragment();
  links.forEach((a) => {
    const text = a.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    const p = document.createElement('p');
    if (a === primary) {
      const strong = document.createElement('strong');
      strong.append(link);
      p.append(strong);
    } else {
      p.append(link);
    }
    frag.append(p);
  });
  ul.replaceWith(frag);
}

export default function transform(hookName, element, payload) {
  const document = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // OneTrust cookie banner / preference centre
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '[class*="onetrust"]',
    ]);

    // Global header (promo bar + navigation) - outside <main> only
    element.querySelectorAll('header').forEach((h) => {
      if (!h.closest('main')) h.remove();
    });
    element.querySelectorAll('nav').forEach((n) => {
      if (!n.closest('main')) n.remove();
    });

    // Global footer - remove its xero-react wrapper too (sits outside <main>)
    element.querySelectorAll('footer').forEach((f) => {
      if (f.closest('main')) return;
      const wrapper = f.closest('div.xero-react');
      if (wrapper && !wrapper.closest('main')) wrapper.remove();
      else f.remove();
    });

    // Breadcrumbs: remove the breadcrumb nav (or trail) and the region if emptied
    outermost(element, '[class^="Breadcrumbs__"]').forEach((bc) => {
      if (!bc.parentNode) return;
      const nav = bc.closest('nav');
      const target = nav && nav.closest(REGION_SELECTOR) !== nav ? nav : bc;
      removeWithRegion(target, false);
    });

    // Trustpilot widget: remove it, and its region if only an orphan heading remains
    outermost(element, '[class^="Trustpilot__Wrapper"]').forEach((tp) => {
      if (tp.parentNode) removeWithRegion(tp, true);
    });

    // Tracking pixels / beacons (import root is document.body)
    element.querySelectorAll(':scope > img').forEach((img) => img.remove());
    WebImporter.DOMUtils.remove(element, ['[id^="batBeacon"]', '#db_lr_pixel_ad', '#podscribe-request']);
    element.querySelectorAll('img').forEach((img) => {
      if (isTrackingSrc(img.getAttribute('src'))) img.remove();
    });

    // Next.js route announcer, tracking iframes
    WebImporter.DOMUtils.remove(element, [
      'next-route-announcer',
      '#__next-route-announcer__',
      'iframe',
    ]);

    // Standalone CTA button groups -> paragraphs of links (block-matched ones
    // are left to their parsers)
    const blocks = blockElements(element, payload);
    outermost(element, 'main ul[class^="ButtonGroup__Element"], main div[class^="ButtonGroup__Element"]').forEach((ul) => {
      if (!ul.parentNode) return;
      if (blocks.some((b) => b === ul || b.contains(ul))) return;
      convertButtonGroup(ul, document);
    });
  }

  if (hookName === 'afterTransform') {
    // Modals / overlays rendered at body level (kept until now so parsers can
    // read popover content)
    WebImporter.DOMUtils.remove(element, [
      '[class*="Modal__Background"]',
      '[class*="Modal__Element"]',
    ]);

    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
      'source',
      'cs-native-frame-holder',
    ]);

    // Any tracking pixel that survived (e.g. injected inside content)
    element.querySelectorAll('img').forEach((img) => {
      if (isTrackingSrc(img.getAttribute('src'))) img.remove();
    });

    // Strip tracking / framework attributes
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const n = attr.name;
        if (
          n.startsWith('data-ga')
          || n.startsWith('data-track')
          || n.startsWith('data-analytics')
          || n === 'onclick'
          || n === 'data-nscript'
        ) {
          el.removeAttribute(n);
        }
      });
    });
  }
}
