import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Image-only grid of logos or award badges. One row per logo.
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
        div.className = 'cards-logos-card-image';
      } else {
        div.className = 'cards-logos-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(
    createOptimizedPicture(img.src, img.alt, false, [{ width: '300' }]),
  ));
  block.replaceChildren(ul);
}
