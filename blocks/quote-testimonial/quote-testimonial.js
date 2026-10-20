import { createOptimizedPicture } from '../../scripts/aem.js';

const LAYOUTS = ['stacked', 'split', 'text'];

/**
 * Checks whether a cell holds only an image.
 * @param {Element} cell
 * @returns {boolean}
 */
function isImageOnly(cell) {
  return !!cell.querySelector('picture') && !cell.textContent.trim();
}

/**
 * Splits a cell into block-level children, wrapping loose inline content in <p>.
 * @param {Element} cell
 * @returns {Element[]}
 */
function toParagraphs(cell) {
  const blocks = [];
  let loose = null;
  [...cell.childNodes].forEach((node) => {
    const isBlock = node.nodeType === Node.ELEMENT_NODE
      && /^(P|H[1-6]|UL|OL|DIV|BLOCKQUOTE)$/.test(node.tagName);
    if (isBlock) {
      loose = null;
      blocks.push(node);
    } else if (node.nodeType === Node.ELEMENT_NODE || node.textContent.trim()) {
      if (!loose) {
        loose = document.createElement('p');
        blocks.push(loose);
      }
      loose.append(node);
    }
  });
  return blocks;
}

/**
 * Hand-drawn arrow used beside captions (decorative).
 * @returns {Element}
 */
function createArrow() {
  const span = document.createElement('span');
  span.className = 'quote-testimonial-arrow';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '<svg viewBox="0 0 60 60" width="60" height="60" focusable="false">'
    + '<path d="M44.7907 13.42C20.1696 16.2928 8.57706 42.9245 16.8908 51.0607"/>'
    + '<path d="M39.3314 11.0299L46.2257 12.4164L41.809 19.3094"/></svg>';
  return span;
}

/**
 * Builds the caption shown next to the photo (or the quote when there is no photo).
 * @param {Element} paragraph
 * @returns {Element}
 */
function createCaption(paragraph) {
  const caption = document.createElement('p');
  caption.className = 'quote-testimonial-caption';
  const text = document.createElement('span');
  text.className = 'quote-testimonial-caption-text';
  text.append(...paragraph.childNodes);
  caption.append(text, createArrow());
  return caption;
}

/**
 * Customer testimonial: rows are image (optional) | quote text | attribution.
 * Attribution is one line (photo caption) or several paragraphs:
 * name | photo caption | description... | link.
 * Layout: "stacked" (quote above photo), "split" (photo beside quote) or
 * "text" (no photo); inferred from content unless authored as a variant.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children]
    .map((row) => row.firstElementChild)
    .filter((cell) => cell && (cell.textContent.trim() || cell.querySelector('picture')));

  const imageCell = cells.find(isImageOnly);
  const [quoteCell, attributionCell] = cells.filter((cell) => cell !== imageCell);
  const attribution = attributionCell ? toParagraphs(attributionCell) : [];

  let layout = LAYOUTS.find((name) => block.classList.contains(name));
  if (!layout) {
    if (!imageCell) layout = 'text';
    else layout = attribution.length > 1 ? 'split' : 'stacked';
  }
  block.classList.add(`quote-testimonial-${layout}`);

  const body = document.createElement('div');
  body.className = 'quote-testimonial-body';

  if (quoteCell) {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'quote-testimonial-quote';
    blockquote.append(...toParagraphs(quoteCell));
    body.append(blockquote);
  }

  let captionSource = attribution[0];
  if (layout === 'split' && attribution.length > 1) {
    const [name, caption, ...details] = attribution;
    name.classList.add('quote-testimonial-cite');
    body.append(name);
    captionSource = caption;
    if (details.length) {
      const extra = document.createElement('div');
      extra.className = 'quote-testimonial-details';
      extra.append(...details);
      body.append(extra);
    }
  } else if (attribution.length > 1) {
    const extra = document.createElement('div');
    extra.className = 'quote-testimonial-details';
    extra.append(...attribution.slice(1));
    body.append(extra);
  }

  const caption = captionSource ? createCaption(captionSource) : null;
  const content = [body];

  if (imageCell) {
    const media = document.createElement('div');
    media.className = 'quote-testimonial-media';
    const image = document.createElement('div');
    image.className = 'quote-testimonial-image';
    const img = imageCell.querySelector('img');
    if (img) {
      image.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
    media.append(image);
    if (caption) media.append(caption);
    content.push(media);
  } else if (caption) {
    content.push(caption);
  }

  block.replaceChildren(...content);
}
