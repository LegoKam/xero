/* eslint-disable */
/* global WebImporter */

/**
 * Xero sections transformer.
 * beforeTransform: insert <hr> section breaks (and temporary markers for
 * styled sections) while the source section elements still exist.
 * afterTransform: append Section Metadata blocks for styled sections.
 */
const MARKER = 'data-excat-section-id';

function resolveSections(element, sections) {
  // Resolve each section to a distinct element; selectors can overlap, so an
  // element already claimed by an earlier section is skipped.
  const claimed = new Set();
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

export default function transform(hookName, element, payload) {
  const sections = payload && payload.template && payload.template.sections;
  if (!sections || sections.length < 2) return;
  const document = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    const resolved = resolveSections(element, sections);
    for (let i = resolved.length - 1; i >= 0; i -= 1) {
      const { section, el } = resolved[i];
      if (el) {
        if (i > 0) {
          const hr = document.createElement('hr');
          if (section.style) hr.setAttribute(MARKER, section.id);
          el.before(hr);
        } else if (section.style) {
          // Temporary marker for a styled first section; removed in afterTransform
          const hr = document.createElement('hr');
          hr.setAttribute(MARKER, section.id);
          hr.setAttribute('data-excat-first', 'true');
          el.before(hr);
        }
      }
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
      if (marker && section.style) {
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        // Place metadata at the end of the section: before the next <hr> or at end of parent
        let cursor = marker.nextElementSibling;
        let last = marker;
        while (cursor && cursor.tagName !== 'HR') {
          last = cursor;
          cursor = cursor.nextElementSibling;
        }
        last.after(meta);
        if (marker.getAttribute('data-excat-first') === 'true') {
          marker.remove();
        } else {
          marker.removeAttribute(MARKER);
        }
      }
    }
    // Safety: clear any leftover markers
    element.querySelectorAll(`hr[${MARKER}]`).forEach((hr) => {
      if (hr.getAttribute('data-excat-first') === 'true') hr.remove();
      else hr.removeAttribute(MARKER);
    });
  }
}
