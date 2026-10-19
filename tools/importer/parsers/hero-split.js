/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-split.
 * Sources:
 *  (a) main header[class*="Region__Element"] (Xero hero region with an image; copy in a
 *      LeftAligned__CopyWrapper or loose in a Col; the image may sit in a second Row);
 *  (b) the copy + image Row inside a LeftAlignedProofPoints header (proof-point cards and
 *      ratings live outside the Row and are never read).
 * Block structure (1 column): row 1 = image (optional), row 2 = [eyebrow] + H1 + intro
 * paragraph(s) / checklist + CTA links.
 * Video heroes (partner-programme, partner-hub, xero-tax, ...): the hero holds a
 * figure.Caption__Figure (or a bare Video__Element) and no hero image. The video parser runs
 * first and leaves a video block table (+ caption paragraph) in its place; that content is
 * skipped when choosing the image/text and is kept, after the hero-split table.
 */
function isVideoBlock(node) {
  if (!node || node.tagName !== 'TABLE') return false;
  const firstCell = node.querySelector('tr > th, tr > td');
  return !!firstCell && /^\s*video\b/i.test(firstCell.textContent || '');
}

const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

/** Containers whose text/images never belong to the hero copy. */
const FOREIGN = [
  '[class*="ProofPoint"]', '[class*="Rating"]', '[class*="Award"]', '[class*="Badge"]',
  '[class*="Logo"]', '[class*="Card"]', '[class*="Caption__"]', '[class*="OverlayButton"]',
  '[class*="Video__"]', 'figcaption',
].join(', ');

/** Eyebrow / label shown above the H1. */
const EYEBROW = '[class*="Eyebrow"], [class*="Overline"], [class*="Kicker"], [class*="Label"], [class*="Tag__"]';

const precedes = (a, b) => !!(a.compareDocumentPosition(b) & 4); // a before b

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
  // Proof-point cards, ratings, logos, captions: any such container that does not hold the H1
  // (LeftAlignedProofPoints__CopyWrapper itself matches "ProofPoint" but holds the copy).
  const foreign = [...element.querySelectorAll(FOREIGN)].filter((c) => !c.querySelector('h1'));
  const skip = [...keep, ...rawVideo, ...element.querySelectorAll('[class^="Video__Element"]'), ...foreign];
  const skipped = (n) => skip.some((s) => s === n || s.contains(n));

  const cells = [];

  // Hero image: first image outside video/proof-point/logo containers; images whose alt marks
  // them as a logo/badge/award are used only when nothing else is available.
  const images = [...element.querySelectorAll('img')].filter((img) => !skipped(img));
  const badgeLike = (img) => /\b(logo|badge|award|rating|stars?)\b/i.test(img.getAttribute('alt') || '');
  const image = images.find((img) => !badgeLike(img)) || images[0];
  if (image) cells.push([image]);

  const contentCell = [];
  const headings = [...element.querySelectorAll('h1, h2')].filter((h) => !skipped(h));
  const heading = headings.find((h) => h.tagName === 'H1') || headings[0];

  const copyWrapper = element.querySelector('[class*="CopyWrapper"]')
    || (heading && heading.closest('[class*="Col__Element"]'))
    || element;

  // Eyebrow / label above the heading (labelled element, or a short h2-h6/p before the H1).
  if (heading) {
    const eyebrows = [...copyWrapper.querySelectorAll(`${EYEBROW}, h2, h3, h4, h5, h6, p`)].filter((n) => {
      if (n === heading || heading.contains(n) || n.contains(heading) || skipped(n)) return false;
      if (!precedes(n, heading) || !clean(n.textContent)) return false;
      if (n.closest('a, button, [class*="ButtonGroup"]')) return false;
      return !n.parentElement.closest(`${EYEBROW}, h2, h3, h4, h5, h6, p`);
    });
    eyebrows.forEach((n) => {
      const p = document.createElement('p');
      p.textContent = clean(n.textContent);
      contentCell.push(p);
    });
    contentCell.push(heading);
  }

  copyWrapper.querySelectorAll('p').forEach((p) => {
    if (skipped(p)) return;
    if (heading && precedes(p, heading)) return; // handled as eyebrow
    if (contentCell.some((n) => n === p || (n.contains && n.contains(p)))) return;
    if (p.textContent.trim()) contentCell.push(p);
  });

  // Checklist under the intro (List__Element), rebuilt without the icon markup.
  copyWrapper.querySelectorAll('ul, ol').forEach((list) => {
    if (skipped(list) || /ButtonGroup/.test(list.className || '')) return;
    if (list.parentElement.closest('ul, ol')) return;
    const items = [...list.querySelectorAll(':scope > li')].map((li) => {
      const copy = li.cloneNode(true);
      copy.querySelectorAll('svg, title, [class*="Icon"]').forEach((n) => n.remove());
      return clean(copy.textContent);
    }).filter(Boolean);
    if (!items.length) return;
    const out = document.createElement(list.tagName.toLowerCase());
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      out.append(li);
    });
    contentCell.push(out);
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
