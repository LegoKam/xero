/* eslint-disable */
/* global WebImporter */

/**
 * Xero cleanup transformer.
 * Removes non-authorable site chrome (global header/nav incl. promo bar,
 * global footer, breadcrumbs (Breadcrumbs__ / Crumb__), OneTrust cookie
 * consent, Trustpilot and G2 widgets, investor SecondaryNavigation, "Back to
 * top" anchor buttons, the mobile PlanStackV2 pricing duplicate, forms,
 * modals, tracking pixels/iframes), keeps the TopBar notice text without its
 * chrome, unwraps Highlight__ heading decorations to plain <em>/<strong>, and
 * converts standalone CTA button groups into paragraphs of links.
 *
 * NOTE: the hero section inside <main> uses a <header class="Region__Element...">
 * which is authorable content - only headers OUTSIDE <main> are removed.
 * NOTE: <script id="__NEXT_DATA__"> (restored from the onLoad stash) and
 * body-level modals are kept until afterTransform because parsers read them
 * (pricing tabs, video IDs, popovers).
 */
const REGION_SELECTOR = 'main > div.xero-react';
const NEXT_DATA_STASH_ID = 'xero-next-data-stash';
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

/**
 * Remove `el`, then any ancestors it leaves without authorable content (e.g. a
 * Col / Row that only held a form), and finally the region if it is emptied.
 */
function removeAndPrune(el) {
  const region = el.closest(REGION_SELECTOR);
  let parent = el.parentElement;
  el.remove();
  while (parent && parent !== region && parent.tagName !== 'MAIN' && !hasContent(parent)) {
    const next = parent.parentElement;
    parent.remove();
    parent = next;
  }
  if (region && region.parentNode && !hasContent(region)) region.remove();
}

/** Replace `el` with its child nodes. */
function unwrap(el) {
  el.replaceWith(...el.childNodes);
}

const TOP_TEXT = /^back to (the )?top$/i;
const TOP_HREF = /^#(top|page-top|main|main-content|__next)?$/i;

/** AnchorButton whose links are all in-page "back to top" jumps. */
function isBackToTop(el) {
  const links = [...el.querySelectorAll('a[href]')];
  if (!links.length) return false;
  return links.every((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href.startsWith('#')) return false;
    const text = a.textContent.replace(/\s+/g, ' ').trim();
    return TOP_TEXT.test(text) || TOP_HREF.test(href);
  });
}

/**
 * Highlight__Wrapper (<em>/<strong> with an aria-hidden svg accessory such as
 * ZigZag / HalfSpark / Highlighter / Oval and a Highlight__Inner span) ->
 * a plain <em>/<strong> holding just the text.
 */
function unwrapHighlight(wrapper, document) {
  wrapper.querySelectorAll('[aria-hidden="true"], svg').forEach((n) => n.remove());
  wrapper.querySelectorAll('[class^="Highlight__Inner"]').forEach(unwrap);
  const tag = wrapper.tagName === 'STRONG' || wrapper.tagName === 'B' ? 'strong' : 'em';
  const clean = document.createElement(tag);
  clean.append(...wrapper.childNodes);
  if (clean.textContent.trim()) wrapper.replaceWith(clean);
  else wrapper.remove();
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
    // The importer strips <script> tags before transform; the import script's
    // onLoad hook stashes the __NEXT_DATA__ JSON in a data attribute so it can
    // be restored here for parsers (pricing tabs, video IDs, popovers).
    const stash = document.getElementById(NEXT_DATA_STASH_ID);
    if (stash && !document.getElementById('__NEXT_DATA__')) {
      const script = document.createElement('script');
      script.id = '__NEXT_DATA__';
      script.type = 'application/json';
      script.textContent = stash.getAttribute('data-json') || '';
      element.append(script);
    }
    if (stash) stash.remove();

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

    // Breadcrumbs built from Crumb__ items without a Breadcrumbs__ trail:
    // remove the containing nav (or list) and the region if emptied
    outermost(element, 'main [class^="Crumb__"]').forEach((crumb) => {
      if (!crumb.parentNode) return;
      const nav = crumb.closest('nav');
      const list = crumb.closest('ol, ul');
      let target = crumb;
      if (nav && nav.closest(REGION_SELECTOR) !== nav) target = nav;
      else if (list) target = list;
      removeWithRegion(target, false);
    });

    // Trustpilot widget: remove it, and its region if only an orphan heading remains
    outermost(element, '[class^="Trustpilot__Wrapper"]').forEach((tp) => {
      if (tp.parentNode) removeWithRegion(tp, true);
    });

    // G2 star-rating widget (third-party image badge)
    outermost(element, '[class^="G2StarRatingWidget__"]').forEach((g2) => {
      if (g2.parentNode) removeAndPrune(g2);
    });

    // Small-viewport duplicate of the pricing plans (PlanStackV2); the desktop
    // PlansCompact copy is the one mapped to tabs-pricing
    outermost(element, 'main [class^="Responsive__Wrapper"]:has([class^="PlanStackV2__"])').forEach((rw) => {
      if (rw.parentNode) removeAndPrune(rw);
    });

    // Investor pages "Explore other investor pages" secondary navigation
    outermost(element, 'main [class^="SecondaryNavigation__"]').forEach((sn) => {
      if (!sn.parentNode) return;
      const nav = sn.closest('nav');
      const target = nav && nav.closest('main') && nav.closest(REGION_SELECTOR) !== nav ? nav : sn;
      removeAndPrune(target);
    });

    // TopBar (legal/privacy notice banner): keep the notice text + link, drop
    // the dismiss button and grid chrome
    outermost(element, 'main [class^="TopBar__Element"]').forEach((tb) => {
      if (!tb.parentNode) return;
      tb.querySelectorAll('button, [class^="IconButton__"]').forEach((b) => b.remove());
      tb.querySelectorAll('[class^="TopBar__ChildWrapper"]').forEach((w) => {
        w.before(' ');
        unwrap(w);
      });
      const paras = [...tb.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
        .filter((p) => p.textContent.trim());
      if (paras.length) tb.replaceWith(...paras);
      else removeWithRegion(tb, false);
    });

    // In-page "Back to top" anchor buttons
    outermost(element, 'main [class^="AnchorButton__"]').forEach((ab) => {
      if (ab.parentNode && isBackToTop(ab)) removeAndPrune(ab);
    });

    // Forms cannot be migrated (no backend): drop the <form> (fields, labels,
    // consent text, submit) and any column it leaves empty; headings / intro
    // copy outside the form stay as default content
    outermost(element, 'main form').forEach((form) => {
      if (form.parentNode) removeAndPrune(form);
    });
    outermost(element, 'main [class^="ProgressiveForm__"], main [class^="InlineForm__"]').forEach((fw) => {
      if (!fw.parentNode) return;
      fw.querySelectorAll('input, select, textarea, button, label, fieldset').forEach((c) => c.remove());
      if (!hasContent(fw)) removeAndPrune(fw);
    });

    // Inline highlight decorations in headings/copy -> plain <em>/<strong>
    element.querySelectorAll('main [class^="Highlight__Wrapper"]').forEach((hw) => {
      if (hw.parentNode) unwrapHighlight(hw, document);
    });
    element.querySelectorAll('main [class^="ZigZag__"], main [class^="HalfSpark__"], main [class^="Highlighter__Accessory"]').forEach((acc) => {
      if (acc.parentNode && !acc.textContent.trim()) acc.remove();
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
