import { decorateIcons } from '../../scripts/aem.js';

// a link to this hash opens the cookie consent preference centre when one is present
const CONSENT_HASH = '#manage-cookies';
const PANEL_ID = 'footer-selector-panel';
const HEADING_ID = 'footer-selector-heading';
const PANEL_TRANSITION_MS = 300;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/* ---------------------------------------------------------------- fragment */

/**
 * Fetches the footer fragment (metadata-independent): /content first (local preview),
 * then the site root (DA/EDS production).
 * @returns {Promise<Element[]>} top-level section elements
 */
async function fetchFooterSections() {
  let resp = await fetch('/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return [];
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // relative image paths are relative to the fragment, not to the current page
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), resp.url).href);
  });
  return [...doc.body.children].filter((node) => node.tagName === 'DIV');
}

/* ----------------------------------------------------------------- helpers */

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.filter(Boolean).forEach((child) => node.append(child));
  return node;
}

function icon(name) {
  const span = el('span', `icon icon-${name}`);
  span.setAttribute('aria-hidden', 'true');
  return span;
}

const isHeading = (node) => node.matches(HEADINGS);
const isList = (node) => node.matches('ul, ol');
const listItems = (list) => [...list.children].filter((li) => li.tagName === 'LI');
/** a paragraph whose only content is images */
const isMediaParagraph = (node) => node.tagName === 'P'
  && node.querySelector('img') && !node.textContent.trim();

/**
 * Assigns a role to each fragment section based on its content.
 * - selector: heading + list where one entry is not a link (the current option)
 * - icons: list of links that only contain images
 * - groups: headings each followed by a list of links
 * - notice: anything else (copyright paragraph + inline link list)
 * @param {Element[]} sections
 */
function classifySections(sections) {
  const roles = {
    groups: [], notice: [], selector: [], icons: [],
  };
  sections.forEach((section) => {
    const children = [...section.children];
    const lists = children.filter(isList);
    const hasHeading = children.some(isHeading);
    const isSelector = hasHeading && lists.some((list) => listItems(list)
      .some((li) => !li.querySelector('a')));
    const isIcons = lists.length > 0 && lists.every((list) => listItems(list)
      .every((li) => li.querySelector('a img') && !li.textContent.trim()));
    const isGroups = children.some((node, i) => isHeading(node)
      && children[i + 1] && isList(children[i + 1]));
    if (isSelector) roles.selector.push(section);
    else if (isIcons) roles.icons.push(section);
    else if (isGroups) roles.groups.push(section);
    else roles.notice.push(section);
  });
  return roles;
}

/* ------------------------------------------------------------------ builders */

/** link list: keeps authored anchors, adds a class to the list */
function buildLinkList(list, className) {
  const ul = el('ul', className);
  listItems(list).forEach((li) => ul.append(el('li', null, [...li.childNodes])));
  return ul;
}

/**
 * Headings followed by link lists become columns; headings without a list
 * become a visually hidden label for the footer.
 */
function buildGroups(section) {
  const labels = [];
  const grid = el('div', 'footer-groups');
  const children = [...section.children];
  children.forEach((node, i) => {
    if (!isHeading(node)) return;
    const next = children[i + 1];
    if (next && isList(next)) {
      grid.append(el('div', 'footer-group', [node, buildLinkList(next, 'footer-group-links')]));
    } else {
      node.classList.add('footer-sr-only');
      labels.push(node);
    }
  });
  return { labels, grid };
}

/** copyright / notice text plus an inline row of legal links */
function buildNotice(section) {
  const wrapper = el('div', 'footer-notice');
  [...section.children].forEach((node) => {
    if (isList(node)) {
      wrapper.append(buildLinkList(node, 'footer-legal-links'));
    } else {
      node.classList.add('footer-notice-text');
      wrapper.append(node);
    }
  });
  return wrapper;
}

/** row of icon-only links; the image alt text is the accessible name */
function buildIconLinks(section) {
  const wrapper = el('div', 'footer-icons');
  section.querySelectorAll('ul, ol').forEach((list) => {
    const ul = buildLinkList(list, 'footer-icon-links');
    ul.querySelectorAll('a').forEach((link) => {
      const img = link.querySelector('img');
      if (img && img.alt && !link.getAttribute('aria-label')) link.setAttribute('aria-label', img.alt);
      if (img) img.setAttribute('alt', '');
    });
    wrapper.append(ul);
  });
  return wrapper;
}

/**
 * Splits a selector section into its parts:
 * before the heading = trigger (prefix paragraphs + last paragraph as the toggle label),
 * heading + media paragraph = panel title, text paragraphs = intro,
 * list = options (a non-link entry is the current one), paragraph after the list = close label.
 */
function parseSelector(section) {
  const parts = {
    prefix: [],
    toggleLabel: null,
    heading: null,
    media: [],
    intro: [],
    options: null,
    closeLabel: null,
  };
  [...section.children].forEach((node) => {
    if (!parts.heading) {
      if (isHeading(node)) parts.heading = node;
      else parts.prefix.push(node);
    } else if (isList(node) && !parts.options) {
      parts.options = node;
    } else if (parts.options) {
      parts.closeLabel = parts.closeLabel || node.textContent.trim();
    } else if (isMediaParagraph(node)) {
      parts.media.push(...node.querySelectorAll('img'));
    } else {
      parts.intro.push(node);
    }
  });
  parts.toggleLabel = parts.prefix.pop() || null;
  return parts;
}

function buildSelectorTrigger(parts) {
  const trigger = el('div', 'footer-selector');
  parts.prefix.forEach((p) => {
    p.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        const label = el('span', 'footer-selector-label');
        label.textContent = child.textContent.trim();
        trigger.append(label);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'IMG') child.classList.add('footer-selector-media');
        trigger.append(child.cloneNode(true));
      }
    });
  });

  const button = el('button', 'footer-selector-toggle');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'dialog');
  if (parts.heading) button.setAttribute('aria-label', parts.heading.textContent.trim());
  const text = el('span', 'footer-selector-toggle-text');
  text.textContent = parts.toggleLabel ? parts.toggleLabel.textContent.trim() : '';
  button.append(icon('selector-toggle'), text);
  trigger.append(button);
  return { trigger, button };
}

function buildSelectorOptions(list) {
  const ul = el('ul', 'footer-selector-options');
  listItems(list).forEach((li) => {
    const link = li.querySelector('a');
    let option;
    if (link) {
      option = link;
    } else {
      // non-link entry = the current option
      option = el('span');
      option.textContent = li.textContent.trim();
      option.setAttribute('aria-current', 'true');
    }
    option.classList.add('footer-selector-option');
    ul.append(el('li', null, [option]));
  });
  return ul;
}

function buildSelectorPanel(parts) {
  const close = el('button', 'footer-selector-close');
  close.type = 'button';
  const closeText = el('span', 'footer-selector-close-text');
  closeText.textContent = parts.closeLabel || '';
  close.append(icon('selector-close'), closeText);

  const title = el('div', 'footer-selector-title');
  if (parts.heading) {
    const heading = el('h2', 'footer-selector-heading');
    heading.id = HEADING_ID;
    heading.append(...parts.heading.childNodes);
    title.append(heading);
  }
  parts.media.forEach((img) => {
    img.classList.add('footer-selector-media');
    title.append(img);
  });

  parts.intro.forEach((p) => p.classList.add('footer-selector-intro'));

  const panel = el('div', 'footer-selector-panel', [
    close,
    title,
    ...parts.intro,
    parts.options && buildSelectorOptions(parts.options),
  ]);
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  if (parts.heading) panel.setAttribute('aria-labelledby', HEADING_ID);

  const backdrop = el('div', 'footer-selector-backdrop', [panel]);
  decorateIcons(backdrop);
  return { backdrop, panel, close };
}

/* ------------------------------------------------------------- interaction */

function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  document.body.style.overflow = locked ? 'hidden' : '';
}

/**
 * The panel is only attached to the document while it is open
 * (mounted on open, removed after the close transition).
 * @param {Element} host element the open panel is attached to
 */
function bindSelector(host, { button }, { backdrop, panel, close }) {
  let closeTimer;

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // eslint-disable-next-line no-use-before-define
      closePanel();
      return;
    }
    if (e.key !== 'Tab') return;
    // keep keyboard focus inside the open dialog
    const focusables = [...panel.querySelectorAll(FOCUSABLE)];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  function closePanel() {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    button.setAttribute('aria-expanded', 'false');
    backdrop.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    lockScroll(false);
    closeTimer = setTimeout(() => {
      backdrop.remove();
      button.removeAttribute('aria-controls');
    }, PANEL_TRANSITION_MS);
    button.focus();
  }

  function openPanel() {
    clearTimeout(closeTimer);
    if (!backdrop.isConnected) host.append(backdrop);
    // force a reflow so the slide-up transition runs from the closed state
    backdrop.getBoundingClientRect();
    backdrop.classList.add('is-open');
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    document.addEventListener('keydown', onKeydown);
    close.focus();
  }

  button.addEventListener('click', () => {
    if (button.getAttribute('aria-expanded') === 'true') closePanel();
    else openPanel();
  });
  close.addEventListener('click', closePanel);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePanel();
  });
}

/**
 * Consent links become buttons that open the consent manager's preference centre;
 * without a consent manager on the page they behave like the authored link.
 */
function buildConsentControls(block) {
  block.querySelectorAll(`a[href$="${CONSENT_HASH}"]`).forEach((link) => {
    const href = link.getAttribute('href');
    const button = el('button', 'footer-consent-toggle', [...link.childNodes]);
    button.type = 'button';
    button.addEventListener('click', () => {
      if (window.OneTrust && typeof window.OneTrust.ToggleInfoDisplay === 'function') {
        window.OneTrust.ToggleInfoDisplay();
      } else {
        window.location.assign(href);
      }
    });
    link.replaceWith(button);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const sections = await fetchFooterSections();
  const roles = classifySections(sections);

  const inner = el('div', 'footer-inner');
  roles.groups.forEach((section) => {
    const { labels, grid } = buildGroups(section);
    inner.prepend(...labels);
    inner.append(grid);
  });

  const start = el('div', 'footer-bottom-start', roles.notice.map(buildNotice));
  const end = el('div', 'footer-bottom-end');
  roles.selector.forEach((section) => {
    const parts = parseSelector(section);
    const trigger = buildSelectorTrigger(parts);
    const panel = buildSelectorPanel(parts);
    bindSelector(block, trigger, panel);
    end.append(trigger.trigger);
  });
  roles.icons.forEach((section) => end.append(buildIconLinks(section)));

  if (start.children.length || end.children.length) {
    if (inner.children.length) inner.append(el('hr', 'footer-divider'));
    inner.append(el('div', 'footer-bottom', [start, end]));
  }

  block.textContent = '';
  block.append(inner);
  decorateIcons(block);
  buildConsentControls(block);
}
