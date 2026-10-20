import { toClassName } from '../../scripts/aem.js';

// desktop navigation applies from 1024px (source breakpoint); below that a mobile menu is planned
const isDesktop = window.matchMedia('(min-width: 1024px)');

const OPEN_DELAY = 120; // hover-intent before a panel opens
const CLOSE_DELAY = 80; // grace period when the pointer leaves trigger + panel
const CLICK_GRACE = 400; // a click right after a hover-open confirms instead of closing
const MIN_PANEL_TRACKS = 3; // panels always lay out on at least this many grid tracks
const WIDE_PANEL_TRACKS = 4; // panels with this many tracks drop the callout on narrow desktops
const DISMISS_STORAGE_KEY = 'nav-banner-dismissed';
const NEW_TAB_TEXT = '(opens in a new tab)';
const DISMISS_LABEL = 'Dismiss offer banner';
const NAV_LABEL = 'Main navigation';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

const state = {
  open: null,
  openTimer: null,
  closeTimer: null,
  hoverOpenedAt: 0,
};

/* ---------------------------------------------------------------- fragment */

/**
 * Fetches the nav fragment (metadata-independent): /content first (local preview),
 * then the site root (DA/EDS production).
 * @returns {Promise<Element[]|null>} top-level section elements
 */
async function fetchNavSections() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // relative image paths are relative to the fragment, not to the current page
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), resp.url).href);
  });
  return [...doc.body.children].filter((node) => node.tagName === 'DIV');
}

/**
 * Assigns a role to each fragment section based on its content.
 * @param {Element[]} sections
 */
function classifySections(sections) {
  const roles = {};
  sections.forEach((section) => {
    const first = section.firstElementChild;
    if (!roles.banner && first && /^H[1-6]$/.test(first.tagName)) {
      roles.banner = section;
    } else if (!roles.brand && section.querySelector('a img') && !section.querySelector('li')) {
      roles.brand = section;
    } else if (!roles.sections && section.querySelector(':scope > ul > li')) {
      roles.sections = section;
    } else if (!roles.tools && section.querySelector('a')) {
      roles.tools = section;
    }
  });
  return roles;
}

/* ----------------------------------------------------------------- helpers */

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.filter(Boolean).forEach((child) => node.append(child));
  return node;
}

/** paragraph with the same inline content as a heading (keeps the page heading outline clean) */
function headingToParagraph(heading, className) {
  const p = el('p', className);
  p.append(...heading.childNodes);
  return p;
}

function isExternal(link) {
  try {
    return new URL(link.href, window.location.href).origin !== window.location.origin;
  } catch (e) {
    return false;
  }
}

/**
 * Removes an authored new-tab hint, i.e. a trailing "(…)" in an external link's text,
 * so it can be rendered for screen readers only.
 * @returns {string|null} the hint text
 */
function takeNewTabHint(link) {
  if (!isExternal(link)) return null;
  const last = link.lastChild;
  if (!last || last.nodeType !== Node.TEXT_NODE) return null;
  const match = last.textContent.match(/\s*(\([^()]+\))\s*$/);
  if (!match) return null;
  last.textContent = last.textContent.slice(0, match.index);
  return match[1];
}

/** opens external links in a new tab with the external-link icon and a screen reader hint */
function decorateExternalLink(link, hintText) {
  if (!isExternal(link)) return;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.classList.add('nav-link-external');
  const icon = el('span', 'nav-external-icon');
  icon.setAttribute('aria-hidden', 'true');
  const hint = el('span', 'nav-sr-only');
  hint.textContent = ` ${hintText || NEW_TAB_TEXT}`;
  link.append(icon, hint);
}

/** wraps the link label in a span that carries the hover underline */
function underlineLabel(link, labelNodes) {
  const label = el('span', 'nav-underline');
  label.append(...labelNodes);
  link.prepend(label);
}

/**
 * Turns an authored link into a button-style link.
 * <strong><a> = primary, <em><a> = secondary, anything else = default.
 */
function toButtonLink(link) {
  const parent = link.parentElement;
  let variant = 'default';
  if (parent && parent.tagName === 'STRONG') variant = 'primary';
  if (parent && parent.tagName === 'EM') variant = 'secondary';
  link.className = `nav-btn nav-btn-${variant}`;
  return link;
}

/* ------------------------------------------------------------------ banner */

function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function bannerId(section) {
  return toClassName(section.textContent).slice(0, 80);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

/**
 * Builds a live countdown (role=timer) that ticks every second.
 * @param {Date} end end timestamp
 * @param {string[]} labels unit labels (days, hours, minutes, seconds)
 * @param {Function} onEnd called once the end time is reached
 */
function buildCountdown(end, labels, onEnd) {
  const timer = el('div', 'nav-countdown');
  timer.setAttribute('role', 'timer');
  const values = labels.map((label) => {
    const unit = el('dl', 'nav-countdown-unit');
    unit.setAttribute('role', 'presentation');
    const value = el('dt', 'nav-countdown-value');
    const name = el('dd', 'nav-countdown-label');
    name.textContent = label;
    unit.append(value, name);
    timer.append(unit);
    return value;
  });

  let interval;
  const tick = () => {
    const remaining = Math.max(0, end.getTime() - Date.now());
    const total = Math.floor(remaining / 1000);
    const parts = [
      Math.floor(total / 86400),
      Math.floor((total % 86400) / 3600),
      Math.floor((total % 3600) / 60),
      total % 60,
    ];
    values.forEach((value, i) => { value.textContent = pad(parts[i]); });
    timer.setAttribute('aria-label', labels.map((label, i) => `${parts[i]} ${label}`).join(', '));
    if (remaining <= 0) {
      clearInterval(interval);
      onEnd();
    }
  };
  tick();
  interval = setInterval(tick, 1000);
  return timer;
}

/**
 * Builds the promo banner: copy + CTA on the left, countdown on the right, dismiss button.
 * @param {Element} section banner section from the fragment
 * @param {Function} onRemove called after the banner is removed from the page
 * @returns {Element|null}
 */
function buildBanner(section, onRemove) {
  const id = bannerId(section);
  if (readDismissed()[id]) return null;

  const banner = el('div', 'nav-banner');
  const copy = el('div', 'nav-banner-copy');
  let end = null;
  let labels = [];

  [...section.children].forEach((child) => {
    const text = child.textContent.trim();
    if (/^H[1-6]$/.test(child.tagName)) {
      copy.append(headingToParagraph(child, 'nav-banner-heading'));
    } else if (child.tagName === 'P' && ISO_DATE.test(text)) {
      end = new Date(text);
    } else if (child.tagName === 'UL' || child.tagName === 'OL') {
      labels = [...child.children].map((li) => li.textContent.trim());
    } else if (child.tagName === 'P' && child.querySelector('a')) {
      const cta = el('p', 'nav-banner-cta');
      cta.append(...[...child.querySelectorAll('a')].map(toButtonLink));
      copy.append(cta);
    } else if (text) {
      child.classList.add('nav-banner-text');
      copy.append(child);
    }
  });

  if (end && !Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) return null;

  const remove = () => {
    banner.remove();
    onRemove();
  };

  const inner = el('div', 'nav-banner-inner', [copy]);
  if (end && !Number.isNaN(end.getTime()) && labels.length) {
    inner.append(buildCountdown(end, labels, remove));
  }

  const close = el('button', 'nav-banner-close');
  close.type = 'button';
  close.setAttribute('aria-label', DISMISS_LABEL);
  close.append(el('span', 'nav-banner-close-icon'));
  close.addEventListener('click', () => {
    const dismissed = readDismissed();
    dismissed[id] = true;
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(dismissed));
    } catch (e) {
      // storage unavailable: dismiss for this page view only
    }
    remove();
  });

  banner.append(inner, close);
  return banner;
}

/* ------------------------------------------------------------------ panels */

/**
 * Splits dropdown content into groups, each starting at a heading.
 * @param {Element[]} nodes child elements following the trigger label
 */
function groupByHeading(nodes) {
  const groups = [];
  let current = null;
  nodes.forEach((node) => {
    if (/^H[1-6]$/.test(node.tagName)) {
      current = { heading: node, nodes: [] };
      groups.push(current);
    } else {
      if (!current) {
        current = { heading: null, nodes: [] };
        groups.push(current);
      }
      current.nodes.push(node);
    }
  });
  return groups;
}

/** list item with an image: icon + bold title link + description */
function buildIconItem(li) {
  const img = li.querySelector('img');
  const link = li.querySelector('a');
  const item = el('li', 'nav-icon-item');
  const icon = el('span', 'nav-icon-item-icon', [img]);
  icon.setAttribute('aria-hidden', 'true');
  img.alt = '';
  img.loading = 'lazy';

  const body = el('div', 'nav-icon-item-body');
  if (link) {
    const hint = takeNewTabHint(link);
    const labelNodes = [...link.childNodes];
    const strong = link.querySelector('strong');
    link.textContent = '';
    underlineLabel(link, strong ? [...strong.childNodes] : labelNodes);
    link.className = 'nav-panel-link nav-icon-item-title';
    decorateExternalLink(link, hint);
    body.append(link);
  }
  const description = [...li.childNodes]
    .filter((node) => node !== img && node !== link && !(node.contains && node.contains(link)))
    .map((node) => node.textContent)
    .join('')
    .trim();
  if (description) {
    const desc = el('p', 'nav-icon-item-description');
    desc.textContent = description;
    body.append(desc);
  }
  item.append(icon, body);
  return item;
}

function buildLinkItem(li) {
  const item = el('li', 'nav-panel-item');
  const link = li.querySelector('a');
  if (!link) {
    item.append(...li.childNodes);
    return item;
  }
  const hint = takeNewTabHint(link);
  underlineLabel(link, [...link.childNodes]);
  link.className = 'nav-panel-link';
  decorateExternalLink(link, hint);
  item.append(link);
  return item;
}

function buildColumnList(list) {
  const items = [...list.children];
  const hasIcons = items.some((li) => li.querySelector('img'));
  const ul = el('ul', hasIcons ? 'nav-panel-list nav-panel-list-icons' : 'nav-panel-list');
  items.forEach((li) => ul.append(li.querySelector('img') ? buildIconItem(li) : buildLinkItem(li)));
  return ul;
}

/** heading + one or more lists: each list is one column, the section spans one track per list */
function buildLinkSection(group, lists) {
  const section = el('div', 'nav-panel-section');
  if (group.heading) section.append(headingToParagraph(group.heading, 'nav-panel-heading'));
  const columns = el('div', 'nav-panel-columns');
  lists.forEach((list) => columns.append(buildColumnList(list)));
  section.append(columns);
  section.style.setProperty('--nav-section-span', lists.length);
  return { node: section, span: lists.length };
}

/** heading + paragraphs without a list: callout card with a full-width CTA */
function buildCallout(group) {
  const card = el('div', 'nav-callout');
  if (group.heading) card.append(headingToParagraph(group.heading, 'nav-callout-title'));
  group.nodes.forEach((node) => {
    const links = [...node.querySelectorAll('a')];
    if (links.length) {
      const cta = el('p', 'nav-callout-cta');
      links.forEach((link) => {
        const hint = takeNewTabHint(link);
        link.className = 'nav-btn nav-btn-accent';
        decorateExternalLink(link, hint);
        cta.append(link);
      });
      card.append(cta);
    } else if (node.textContent.trim()) {
      node.classList.add('nav-callout-text');
      card.append(node);
    }
  });
  return card;
}

/**
 * Builds a full-width dropdown panel from the content of a dropdown list item.
 * @param {Element[]} nodes authored content after the trigger label
 * @param {string} id panel id
 */
function buildPanel(nodes, id) {
  const panel = el('div', 'nav-panel');
  panel.id = id;
  const inner = el('div', 'nav-panel-inner');
  const grid = el('div', 'nav-panel-sections');
  const cards = [];
  let tracks = 0;

  groupByHeading(nodes).forEach((group) => {
    const lists = group.nodes.filter((node) => node.tagName === 'UL' || node.tagName === 'OL');
    if (lists.length) {
      const { node, span } = buildLinkSection(group, lists);
      tracks += span;
      grid.append(node);
    } else if (group.heading) {
      cards.push(buildCallout(group));
    } else {
      const intro = el('div', 'nav-panel-intro', group.nodes);
      grid.append(intro);
    }
  });

  const trackCount = Math.max(MIN_PANEL_TRACKS, tracks);
  grid.style.setProperty('--nav-panel-tracks', trackCount);
  if (trackCount >= WIDE_PANEL_TRACKS) panel.classList.add('nav-panel-wide');
  inner.append(grid);
  if (cards.length) inner.append(el('div', 'nav-panel-aside', cards));
  panel.append(inner);
  return panel;
}

/* ------------------------------------------------------- open/close logic */

function setOverlay(block, visible) {
  block.classList.toggle('nav-is-open', visible);
  document.body.style.overflow = visible ? 'hidden' : '';
}

function updateNavBottom(block) {
  const bar = block.querySelector('.nav-bar');
  if (!bar) return;
  block.style.setProperty('--nav-bottom', `${Math.max(0, bar.getBoundingClientRect().bottom)}px`);
}

function closeDrop(block, drop, { instant = false, restoreFocus = false } = {}) {
  if (!drop) return;
  const trigger = drop.querySelector('.nav-trigger');
  drop.classList.toggle('is-instant', instant);
  drop.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  if (state.open === drop) {
    state.open = null;
    setOverlay(block, false);
  }
  if (restoreFocus) trigger.focus();
}

function openDrop(block, drop, { instant = false } = {}) {
  clearTimeout(state.openTimer);
  clearTimeout(state.closeTimer);
  if (state.open === drop) return;
  const switching = !!state.open;
  if (state.open) closeDrop(block, state.open, { instant: true });
  updateNavBottom(block);
  const showInstantly = instant || switching;
  drop.classList.toggle('is-instant', showInstantly);
  drop.classList.add('is-open');
  drop.querySelector('.nav-trigger').setAttribute('aria-expanded', 'true');
  state.open = drop;
  setOverlay(block, true);
  if (showInstantly) {
    // re-enable transitions once the panel has painted so it can animate out later
    requestAnimationFrame(() => requestAnimationFrame(() => drop.classList.remove('is-instant')));
  }
}

function closeAll(block, options) {
  clearTimeout(state.openTimer);
  clearTimeout(state.closeTimer);
  if (state.open) closeDrop(block, state.open, options);
}

/**
 * Wires hover-intent, click toggle and keyboard handling for a dropdown.
 * @param {Element} block header block
 * @param {Element} drop dropdown list item containing trigger and panel
 */
function bindDropdown(block, drop) {
  const trigger = drop.querySelector('.nav-trigger');
  const panel = drop.querySelector('.nav-panel');

  drop.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;
    clearTimeout(state.closeTimer);
    clearTimeout(state.openTimer);
    if (state.open === drop) return;
    if (state.open) {
      // another panel is already open: switch immediately
      openDrop(block, drop);
      state.hoverOpenedAt = Date.now();
      return;
    }
    state.openTimer = setTimeout(() => {
      openDrop(block, drop);
      state.hoverOpenedAt = Date.now();
    }, OPEN_DELAY);
  });

  drop.addEventListener('mouseleave', () => {
    if (!isDesktop.matches) return;
    clearTimeout(state.openTimer);
    if (state.open !== drop) return;
    state.closeTimer = setTimeout(() => closeDrop(block, drop), CLOSE_DELAY);
  });

  trigger.addEventListener('click', () => {
    clearTimeout(state.openTimer);
    if (state.open === drop) {
      if (Date.now() - state.hoverOpenedAt < CLICK_GRACE) return;
      closeDrop(block, drop);
    } else {
      openDrop(block, drop);
      state.hoverOpenedAt = 0;
    }
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    openDrop(block, drop, { instant: true });
    state.hoverOpenedAt = 0;
    const first = panel.querySelector('a, button');
    if (first) first.focus();
  });

  drop.addEventListener('focusout', (e) => {
    if (state.open === drop && e.relatedTarget && !drop.contains(e.relatedTarget)) {
      closeDrop(block, drop);
    }
  });
}

/* --------------------------------------------------------------- nav bar */

function buildBrand(section) {
  const brand = el('div', 'nav-brand');
  const link = section.querySelector('a');
  if (link) {
    link.className = 'nav-brand-link';
    const img = link.querySelector('img');
    const textNodes = [...link.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNodes.length) {
      // authored link text names the link (like the source's SVG <title>): keep it for
      // assistive tech only and make the image decorative so the name is not read twice
      const label = el('span', 'nav-sr-only');
      label.append(...textNodes);
      link.append(label);
      if (img) img.alt = '';
    } else if (img && !link.getAttribute('aria-label')) {
      link.setAttribute('aria-label', img.alt);
    }
    brand.append(link);
  }
  return brand;
}

/**
 * Builds the main nav list: plain links stay links, items with nested content
 * become <button> triggers with a full-width panel.
 */
function buildNavList(section, block) {
  const list = el('ul', 'nav-sections');
  const source = section.querySelector(':scope > ul');
  if (!source) return list;

  [...source.children].forEach((li) => {
    const item = el('li', 'nav-item');
    const children = [...li.children];
    const hasPanel = children.some((child) => /^(H[1-6]|UL|OL)$/.test(child.tagName));

    if (!hasPanel) {
      const link = li.querySelector('a');
      if (link) {
        link.className = 'nav-link';
        item.append(link);
      } else {
        item.append(...li.childNodes);
      }
      list.append(item);
      return;
    }

    const labelNode = children[0] && children[0].tagName === 'P' ? children[0] : null;
    const label = labelNode
      ? labelNode.textContent.trim()
      : [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent).join('').trim();
    const id = `nav-panel-${toClassName(label)}`;

    const trigger = el('button', 'nav-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.append(label);
    const caret = el('span', 'nav-caret');
    caret.setAttribute('aria-hidden', 'true');
    trigger.append(caret);

    item.classList.add('nav-drop');
    item.append(trigger, buildPanel(labelNode ? children.slice(1) : children, id));
    bindDropdown(block, item);
    list.append(item);
  });
  return list;
}

function buildTools(section) {
  const tools = el('div', 'nav-tools');
  section.querySelectorAll('a').forEach((link) => tools.append(toButtonLink(link)));
  return tools;
}

/* ------------------------------------------------------------ sticky nav */

/**
 * Fixes the nav bar to the top once the page scrolls past everything above it.
 * The in-flow placeholder keeps the bar's height so content does not jump.
 */
function bindSticky(block, placeholder, bar) {
  let ticking = false;
  const update = () => {
    ticking = false;
    placeholder.style.minHeight = `${bar.offsetHeight}px`;
    bar.classList.toggle('is-fixed', placeholder.getBoundingClientRect().top <= 0);
    updateNavBottom(block);
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
  return requestUpdate;
}

/* ------------------------------------------------------- viewport modes */

/**
 * Applies desktop or mobile behaviour. Mobile menu (hamburger) will hook in here.
 * @param {Element} block
 * @param {boolean} desktop
 */
function applyViewportMode(block, desktop) {
  closeAll(block, { instant: true });
  block.classList.toggle('is-desktop', desktop);
  block.classList.toggle('is-mobile', !desktop);
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const sections = await fetchNavSections();
  if (!sections) return;
  const roles = classifySections(sections);

  block.textContent = '';
  let refreshLayout = () => {};

  if (roles.banner) {
    const banner = buildBanner(roles.banner, () => refreshLayout());
    if (banner) block.append(banner);
  }

  // full-width bar (background, sticky) around the gutter-inset <nav> content box
  const nav = el('nav', 'nav-bar-content');
  nav.id = 'nav';
  nav.setAttribute('aria-label', NAV_LABEL);
  if (roles.brand) nav.append(buildBrand(roles.brand));
  if (roles.sections) nav.append(buildNavList(roles.sections, block));
  if (roles.tools) nav.append(buildTools(roles.tools));

  const bar = el('div', 'nav-bar', [nav]);
  const placeholder = el('div', 'nav-bar-placeholder', [bar]);
  const overlay = el('div', 'nav-overlay');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.addEventListener('click', () => closeAll(block));
  block.append(placeholder, overlay);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) closeAll(block, { restoreFocus: true });
  });

  refreshLayout = bindSticky(block, placeholder, bar);
  applyViewportMode(block, isDesktop.matches);
  isDesktop.addEventListener('change', (e) => {
    applyViewportMode(block, e.matches);
    refreshLayout();
  });
}
