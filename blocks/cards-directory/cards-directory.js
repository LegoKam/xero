import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * True when the element is a paragraph containing only a single link.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkParagraph(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a');
  return links.length === 1 && links[0].textContent.trim() === el.textContent.trim();
}

/**
 * Groups runs of single-link paragraphs into a link list and tags authored lists.
 * @param {Element} body
 */
function decorateLinks(body) {
  let list = null;
  [...body.children].forEach((el) => {
    if (isLinkParagraph(el)) {
      if (!list) {
        list = document.createElement('ul');
        list.className = 'cards-directory-links';
        el.before(list);
      }
      const li = document.createElement('li');
      li.append(...el.childNodes);
      list.append(li);
      el.remove();
    } else {
      list = null;
      if ((el.tagName === 'UL' || el.tagName === 'OL') && el.querySelector('a')) {
        el.classList.add('cards-directory-links');
      }
    }
  });
  body.querySelectorAll('.cards-directory-links a').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary');
    const wrapper = a.closest('.button-wrapper');
    if (wrapper) wrapper.classList.remove('button-wrapper');
  });
}

/**
 * Directory link cards: heading, optional description and a list of links,
 * with an optional supporting image.
 * Row: [optional image] | [heading, description, links].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children]
      .filter((div) => div.textContent.trim() || div.querySelector('picture, img'));
    const imageCell = cells.find((div) => div.querySelector('picture') && !div.textContent.trim());
    const bodyCell = cells.find((div) => div !== imageCell);

    if (bodyCell) {
      bodyCell.className = 'cards-directory-card-body';
      decorateLinks(bodyCell);
      li.append(bodyCell);
    }
    if (imageCell) {
      imageCell.className = 'cards-directory-card-image';
      li.append(imageCell);
      li.classList.add('cards-directory-has-image');
    }
    if (li.children.length) ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(
    createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
  ));
  block.replaceChildren(ul);
}
