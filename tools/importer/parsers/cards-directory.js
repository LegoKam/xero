/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-directory.
 * Source: ul[class^="DetailCardList__List"] > li.DetailCardList__Item > Row >
 *   Col (h3, description <p>, run of Link__Wrapper > a links) + Responsive__Wrapper > Col > img.
 *   (au/advisors: regions -> advisor directory; au/certifications: learning paths.)
 * Block structure (2 columns, cards convention): one row per item ->
 *   [image (or empty) | h3, description paragraph(s), bulleted list of links].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildImage(document, scope) {
  const srcImg = scope && scope.querySelector('img');
  if (!srcImg) return null;
  const src = srcImg.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = clean(srcImg.getAttribute('alt'));
  return img;
}

export default function parse(element, { document }) {
  const cells = [];

  let items = [...element.querySelectorAll(':scope > li')];
  if (!items.length) items = [...element.querySelectorAll('[class^="DetailCardList__Item"]')];

  items.forEach((item) => {
    const imageWrap = item.querySelector('[class^="Responsive__Wrapper"]');
    const img = buildImage(document, imageWrap || item);

    const body = [];
    const heading = item.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading && clean(heading.textContent)) {
      const h3 = document.createElement('h3');
      h3.textContent = clean(heading.textContent);
      body.push(h3);
    }

    const inImage = (n) => imageWrap && imageWrap.contains(n);
    item.querySelectorAll('p').forEach((p) => {
      if (inImage(p) || p.closest('a')) return;
      const text = clean(p.textContent);
      if (!text) return;
      // Keep inline links / emphasis of the description; drop styling wrappers.
      const out = document.createElement('p');
      out.innerHTML = p.innerHTML;
      body.push(out);
    });

    const links = [...item.querySelectorAll('a[href]')]
      .filter((a) => !inImage(a) && !a.closest('p') && clean(a.textContent));
    if (links.length) {
      const list = document.createElement('ul');
      links.forEach((a) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = clean(a.textContent);
        li.append(link);
        list.append(li);
      });
      body.push(list);
    }

    if (img || body.length) cells.push([img || '', body]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-directory', cells });
  element.replaceWith(block);
}
