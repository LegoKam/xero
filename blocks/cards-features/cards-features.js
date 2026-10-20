import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Is the element a bold-only title paragraph (`<p><strong>Title</strong></p>`)?
 * @param {Element} el
 * @returns {boolean}
 */
function isBoldTitle(el) {
  if (!el || el.tagName !== 'P' || el.children.length !== 1) return false;
  const strong = el.firstElementChild;
  return ['STRONG', 'B'].includes(strong.tagName)
    && !strong.querySelector('a')
    && strong.textContent.trim() === el.textContent.trim();
}

/**
 * Decide whether the decorative tick icon is shown.
 * Explicit variants win: `cards-features (ticks)` / `cards-features (no-ticks)`.
 * Otherwise auto-detect the source pattern: up to 3 items, every title a bold
 * paragraph, no links (linked titles and "Explore ..." link rows have no icon).
 * @param {Element} block
 * @param {Element[]} items
 * @returns {boolean}
 */
function hasTicks(block, items) {
  if (block.classList.contains('no-ticks')) return false;
  if (block.classList.contains('ticks')) return true;
  return items.length > 0
    && items.length <= 3
    && items.every((li) => {
      const body = li.querySelector('.cards-features-card-body');
      return body && isBoldTitle(body.firstElementChild) && !li.querySelector('a');
    });
}

/**
 * Feature items: optional tick icon (CSS), bold or linked title, description, optional link.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('picture, img')) {
        div.remove();
      } else if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-features-card-image';
      } else {
        div.className = 'cards-features-card-body';
        const first = div.firstElementChild;
        if (first && (isBoldTitle(first) || /^H[1-6]$/.test(first.tagName))) {
          first.classList.add('cards-features-card-title');
        }
      }
    });
    if (li.children.length) ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(
    createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
  ));
  const items = [...ul.children];
  if (hasTicks(block, items)) block.classList.add('ticks');
  if (items.length && items.length % 4 === 0) block.classList.add('cards-features-cols-4');
  block.replaceChildren(ul);
}
