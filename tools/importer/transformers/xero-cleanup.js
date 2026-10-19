/* eslint-disable */
/* global WebImporter */

/**
 * Xero cleanup transformer.
 * Removes non-authorable site chrome (global header/nav incl. promo bar,
 * global footer, OneTrust cookie consent, modals, tracking iframes).
 *
 * NOTE: the hero section inside <main> uses a <header class="Region__Element...">
 * which is authorable content - only headers OUTSIDE <main> are removed.
 */
export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // OneTrust cookie banner / preference centre
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '[class*="onetrust"]',
    ]);

    // Modals / overlays rendered at body level
    WebImporter.DOMUtils.remove(element, [
      '[class*="Modal__Background"]',
      '[class*="Modal__Element"]',
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

    // Next.js route announcer, tracking iframes
    WebImporter.DOMUtils.remove(element, [
      'next-route-announcer',
      '#__next-route-announcer__',
      'iframe',
    ]);
  }

  if (hookName === 'afterTransform') {
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
      'source',
    ]);

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
