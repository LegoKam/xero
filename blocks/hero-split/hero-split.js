import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns true when a paragraph holds nothing but a single link (a CTA).
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkParagraph(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Groups trailing link-only paragraphs into an actions row. The first link becomes
 * the primary button (unless the author already formatted it); the rest stay text links.
 * @param {Element} content
 */
function decorateActions(content) {
  const ctas = [...content.children].filter(isLinkParagraph);
  if (!ctas.length) return;
  const actions = document.createElement('div');
  actions.className = 'hero-split-actions';
  ctas[0].before(actions);
  ctas.forEach((p, i) => {
    const a = p.querySelector('a');
    if (!a.classList.contains('button')) {
      if (i === 0) {
        p.className = 'button-wrapper';
        a.className = 'button primary';
      } else {
        p.classList.add('hero-split-link');
      }
    }
    actions.append(p);
  });
}

/**
 * Pulls a video block (and its caption paragraph) that authors place right after
 * a text-only hero into the hero's media column, so copy and video sit side by side.
 * @param {Element} block
 * @returns {Element|null} media column
 */
function adoptSiblingVideo(block) {
  const wrapper = block.parentElement;
  const next = wrapper?.nextElementSibling;
  if (!next || !next.classList.contains('video-wrapper')) return null;

  const media = document.createElement('div');
  media.className = 'hero-split-media hero-split-video';
  media.append(next);

  const after = wrapper.nextElementSibling;
  if (after?.classList.contains('default-content-wrapper')
    && after.children.length === 1 && after.firstElementChild.tagName === 'P') {
    const caption = after.firstElementChild;
    caption.classList.add('hero-split-caption');
    const arrow = document.createElement('span');
    arrow.className = 'hero-split-caption-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M50 50C36 46 22 34 20 8"/><path d="M13 15l7-8 7 8"/></svg>';
    caption.prepend(arrow);
    media.append(caption);
    after.remove();
  }
  return media;
}

/**
 * Hero with the media beside the copy (not behind it).
 * Accepts either two rows (image row + text row) or one row with two cells.
 * A text-only hero adopts an immediately following video block as its media.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children].flatMap((row) => [...row.children]);
  const imageCell = cells.find((cell) => cell.querySelector('picture')
    && !cell.querySelector('h1, h2, h3, h4, h5, h6'));
  const contentCells = cells.filter((cell) => cell !== imageCell && cell.textContent.trim());

  const content = document.createElement('div');
  content.className = 'hero-split-content';
  contentCells.forEach((cell) => content.append(...cell.childNodes));
  // drop whitespace-only text nodes between elements
  [...content.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) n.remove();
  });
  decorateActions(content);

  const nodes = [content];
  let media = null;
  if (imageCell) {
    media = document.createElement('div');
    media.className = 'hero-split-media hero-split-image';
    const img = imageCell.querySelector('picture > img');
    // createOptimizedPicture rewrites to a same-origin path, so only use it for local media
    if (img && new URL(img.src, window.location.href).origin === window.location.origin) {
      media.append(createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '1200' },
        { width: '750' },
      ]));
    } else {
      if (img) {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      }
      media.append(...imageCell.childNodes);
    }
  } else {
    media = adoptSiblingVideo(block);
  }

  if (media) {
    nodes.push(media);
    block.classList.add(media.classList.contains('hero-split-video') ? 'with-video' : 'with-image');
  } else {
    block.classList.add('no-media');
  }

  block.replaceChildren(...nodes);
}
