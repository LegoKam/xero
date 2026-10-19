import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Hero with the image beside the text (not behind it).
 * Accepts either two rows (image row + text row) or one row with two cells.
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

  const nodes = [content];
  if (imageCell) {
    const media = document.createElement('div');
    media.className = 'hero-split-image';
    const img = imageCell.querySelector('picture > img');
    if (img) {
      media.append(createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '1200' },
        { width: '750' },
      ]));
    } else {
      media.append(...imageCell.childNodes);
    }
    nodes.push(media);
  }

  block.replaceChildren(...nodes);
}
