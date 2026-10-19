import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Checks whether a cell holds only an image.
 * @param {Element} cell
 * @returns {boolean}
 */
function isImageOnly(cell) {
  return !!cell.querySelector('picture') && !cell.textContent.trim();
}

/**
 * Customer testimonial: rows are image (optional) | quote text | attribution
 * (name, business, optional link). Rows are identified by content so the image
 * row may be omitted.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children]
    .map((row) => row.firstElementChild)
    .filter((cell) => cell && (cell.textContent.trim() || cell.querySelector('picture')));

  const imageCell = cells.find(isImageOnly);
  const textCells = cells.filter((cell) => cell !== imageCell);
  const [quoteCell, attributionCell] = textCells;

  const figure = document.createElement('figure');
  figure.className = 'quote-testimonial-figure';

  if (imageCell) {
    const media = document.createElement('div');
    media.className = 'quote-testimonial-image';
    const img = imageCell.querySelector('img');
    if (img) {
      media.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
    figure.append(media);
  }

  const body = document.createElement('div');
  body.className = 'quote-testimonial-body';

  if (quoteCell) {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'quote-testimonial-quote';
    blockquote.append(...quoteCell.childNodes);
    body.append(blockquote);
  }

  if (attributionCell) {
    const caption = document.createElement('figcaption');
    caption.className = 'quote-testimonial-attribution';
    caption.append(...attributionCell.childNodes);
    body.append(caption);
  }

  figure.append(body);
  block.replaceChildren(figure);
}
