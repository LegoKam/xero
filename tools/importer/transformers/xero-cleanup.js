/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Xero AU site cleanup.
 * Removes non-authorable content (header, footer, nav, cookie banners, spacing elements).
 * Selectors from captured DOM of https://www.xero.com/au/
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Remove cookie/consent banners and overlays (from captured DOM)
    WebImporter.DOMUtils.remove(element, [
      '#CybotCookiebotDialog',
      '[class*="CookieConsent"]',
      '[class*="cookie-banner"]',
      '[class*="gdpr"]',
    ]);

    // Remove overflow:hidden that blocks scrolling
    if (element.style && element.style.overflow === 'hidden') {
      element.style.overflow = 'scroll';
    }
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove header (TopBar + Navigation from captured DOM)
    WebImporter.DOMUtils.remove(element, [
      'header',
      '[class*="TopBar__Element"]',
      '[class*="Nav__NavContainer"]',
      '[class*="NavBar__Element"]',
    ]);

    // Remove footer (from captured DOM)
    WebImporter.DOMUtils.remove(element, [
      'footer',
      '[class*="Footer__"]',
    ]);

    // Remove Xero spacing wrappers that add no content
    const spacingElements = element.querySelectorAll('[class*="Spacing__Vertical"], [class*="Spacing__Horizontal"]');
    spacingElements.forEach((el) => {
      if (el.children.length === 0 || el.textContent.trim() === '') {
        el.remove();
      }
    });

    // Remove noscript, link, and empty iframes
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'link',
      'iframe',
    ]);

    // Remove visually hidden elements (screen reader only, not authorable content)
    WebImporter.DOMUtils.remove(element, [
      '[class*="VisuallyHidden"]',
    ]);

    // Clean data attributes from all elements
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-track');
      el.removeAttribute('data-analytics');
      el.removeAttribute('onclick');
    });
  }
}
