import { createOptimizedPicture } from '../../scripts/aem.js';

const RATING_RE = /^(?:rating:?\s*)?(\d+(?:\.\d+)?)\s*(?:out of|of|\/)\s*(\d+)(?:\s*stars?)?\.?$/i;

/**
 * Parses an authored rating string such as "5 out of 5 stars" or "4.5/5".
 * @param {string} text
 * @returns {{value: number, max: number}|null}
 */
function parseRating(text) {
  const match = text.trim().match(RATING_RE);
  if (!match) return null;
  const max = Math.min(Math.max(Math.round(Number(match[2])), 1), 10);
  const value = Math.min(Math.max(Number(match[1]), 0), max);
  return { value, max };
}

/**
 * Builds an accessible star rating element.
 * @param {{value: number, max: number}} rating
 * @returns {Element}
 */
function buildStars({ value, max }) {
  const wrapper = document.createElement('p');
  wrapper.className = 'cards-testimonial-rating';
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', `${value} out of ${max} stars`);
  for (let i = 1; i <= max; i += 1) {
    const star = document.createElement('span');
    star.setAttribute('aria-hidden', 'true');
    let state = 'empty';
    if (value >= i) state = 'full';
    else if (value > i - 1) state = 'half';
    star.className = `cards-testimonial-star cards-testimonial-star-${state}`;
    star.textContent = '★';
    wrapper.append(star);
  }
  return wrapper;
}

/**
 * True when the element holds only bold text (the reviewer name).
 * @param {Element} el
 * @returns {boolean}
 */
function isBoldOnly(el) {
  const bold = el.querySelector(':scope > strong, :scope > b');
  return !!bold && bold.textContent.trim() === el.textContent.trim();
}

/**
 * Decorates the text cell: rating -> stars, quote -> blockquote, name/business -> attribution.
 * @param {Element} cell
 */
function decorateBody(cell) {
  cell.className = 'cards-testimonial-card-body';
  const children = [...cell.children];
  if (!children.length) return;

  let rating = null;
  const remaining = children.filter((el) => {
    if (rating) return true;
    rating = parseRating(el.textContent);
    if (rating) {
      el.remove();
      return false;
    }
    return true;
  });

  let nameIndex = remaining.findIndex(isBoldOnly);
  if (nameIndex === -1 && remaining.length > 1) nameIndex = remaining.length - 1;
  const quoteEls = nameIndex === -1 ? remaining : remaining.slice(0, nameIndex);
  const attributionEls = nameIndex === -1 ? [] : remaining.slice(nameIndex);

  const fragments = [];
  if (rating) fragments.push(buildStars(rating));
  if (quoteEls.length) {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'cards-testimonial-quote';
    blockquote.append(...quoteEls);
    fragments.push(blockquote);
  }
  if (attributionEls.length) {
    const attribution = document.createElement('div');
    attribution.className = 'cards-testimonial-attribution';
    attributionEls[0].classList.add('cards-testimonial-name');
    attribution.append(...attributionEls);
    fragments.push(attribution);
  }
  cell.replaceChildren(...fragments);
}

/**
 * Star-rated customer review cards.
 * Row: [optional review-site logo + label] | [rating, quote, **name**, business].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children]
      .filter((div) => div.textContent.trim() || div.querySelector('picture, img'));
    const sourceCell = cells.find((div) => div.querySelector('picture, img'));
    const bodyCell = cells.find((div) => div !== sourceCell);

    if (sourceCell) {
      sourceCell.className = 'cards-testimonial-card-source';
      sourceCell.querySelectorAll('p').forEach((p) => {
        if (!p.querySelector('picture, img') && p.textContent.trim()) {
          p.classList.add('cards-testimonial-source-label');
        }
      });
      li.append(sourceCell);
    }
    if (bodyCell) {
      decorateBody(bodyCell);
      li.append(bodyCell);
    }
    if (li.children.length) ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(
    createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]),
  ));
  block.replaceChildren(ul);
}
