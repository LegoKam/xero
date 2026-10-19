/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-split.
 * Source: main header[class*="Region__Element"] (Xero hero region).
 * Block structure (1 column): row 1 = image, row 2 = H1 + subheading + CTA.
 * Video heroes (partner-programme): the hero holds a figure.Caption__Figure with a
 * Video__Element and no CopyWrapper. The video parser runs first and leaves a video
 * block table (+ caption paragraph) in place of the figure; that content is skipped
 * when choosing the image/text and is kept, after the hero-split table.
 */
function isVideoBlock(node) {
  if (!node || node.tagName !== 'TABLE') return false;
  const firstCell = node.querySelector('tr > th, tr > td');
  return !!firstCell && /^\s*video\b/i.test(firstCell.textContent || '');
}

export default function parse(element, { document }) {
  // Video content to keep outside the hero block: already-parsed video tables (with the
  // wrapper holding their caption) and any still-raw video figures.
  const keep = [];
  element.querySelectorAll('table').forEach((t) => {
    if (!isVideoBlock(t)) return;
    const holder = t.parentElement;
    const holderOnlyVideo = holder && holder !== element
      && [...holder.children].every((c) => c === t || c.tagName === 'P');
    keep.push(holderOnlyVideo ? holder : t);
  });
  const rawVideo = [...element.querySelectorAll('figure')].filter((f) => f.querySelector('[class^="Video__Element"]'));
  const skip = [...keep, ...rawVideo, ...element.querySelectorAll('[class^="Video__Element"]')];
  const skipped = (n) => skip.some((s) => s === n || s.contains(n));

  const cells = [];

  const image = [...element.querySelectorAll('img')].find((img) => !skipped(img));
  if (image) cells.push([image]);

  const contentCell = [];
  const heading = [...element.querySelectorAll('h1, h2')].find((h) => !skipped(h));
  if (heading) contentCell.push(heading);

  const copyWrapper = element.querySelector('[class*="CopyWrapper"]') || element;
  copyWrapper.querySelectorAll('p').forEach((p) => {
    if (skipped(p)) return;
    if (p.textContent.trim()) contentCell.push(p);
  });

  copyWrapper.querySelectorAll('[class*="ButtonGroup__Element"] a[href], a[class*="Button__Element"]').forEach((a) => {
    if (skipped(a)) return;
    if (contentCell.some((n) => n.contains && n.contains(a))) return;
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = a.textContent.trim();
    const wrap = document.createElement('p');
    wrap.append(link);
    if (!contentCell.some((n) => n.querySelector && n.querySelector(`a[href="${link.getAttribute('href')}"]`))) {
      contentCell.push(wrap);
    }
  });

  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-split', cells });
  // Detach the kept video content before the hero region is replaced, then re-insert it after.
  keep.forEach((n) => n.remove());
  element.replaceWith(block);
  if (keep.length) block.after(...keep);
}
