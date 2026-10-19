/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature.
 * Source: Row__Element containing Col > Box > Highlight__CopyWrapper (text) + Col (illustration).
 * Block structure: one row, two cells -> [text (heading, paragraph, list, link) | image].
 */
function buildImage(document, scope) {
  const srcImg = scope && scope.querySelector('img');
  if (!srcImg) return null;
  let src = srcImg.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) return null;
  // Content illustrations served as SVG would otherwise be turned into :icon: tokens.
  if (/\.svg$/i.test(src)) src += '?format=svg';
  const labelled = srcImg.closest('[aria-label]');
  const img = document.createElement('img');
  img.src = src;
  img.alt = (srcImg.getAttribute('alt') || '').trim()
    || (labelled ? labelled.getAttribute('aria-label').trim() : '');
  return img;
}

export default function parse(element, { document }) {
  const cols = element.querySelectorAll(':scope > [class*="Col__Element"]');
  const copy = element.querySelector('[class^="Highlight__CopyWrapper"]');
  const imageCol = [...cols].find((c) => !c.querySelector('[class^="Highlight__CopyWrapper"]'));

  const textCell = [];
  if (copy) {
    const heading = copy.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) textCell.push(heading);

    copy.querySelectorAll(':scope > p').forEach((p) => {
      if (p.textContent.trim()) textCell.push(p);
    });

    const srcList = copy.querySelector('ul, ol');
    if (srcList) {
      const list = document.createElement('ul');
      srcList.querySelectorAll(':scope > li').forEach((li) => {
        const text = li.textContent.replace(/\s+/g, ' ').trim();
        if (!text) return;
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });
      if (list.children.length) textCell.push(list);
    }

    copy.querySelectorAll(':scope > a[href]').forEach((a) => {
      const text = a.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      textCell.push(p);
    });
  }

  const img = buildImage(document, imageCol);
  const cells = [[textCell, img || '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-feature', cells });
  element.replaceWith(block);
}
