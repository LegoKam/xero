/* eslint-disable */
/* global WebImporter */
/**
 * Parser for video.
 * Source: [class^="Video__Element"] (Wistia player placeholder: poster img + play overlay),
 * typically inside figure.Caption__Figure with a figcaption (partner-programme hero).
 * The DOM holds no video URL; the Wistia id lives in the __NEXT_DATA__ JSON
 * (e.g. component "left-aligned-video-header" -> "videoId").
 * Block structure (1 column, 1 row): optional poster image + link to the video URL in one cell.
 * The figcaption text is kept as a paragraph after the block; the whole figure is replaced.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Collect every object carrying a videoId from the Next.js page data. */
function collectVideoEntries(document) {
  const script = document.querySelector('#__NEXT_DATA__');
  if (!script) return [];
  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch (e) {
    return [];
  }
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node.videoId === 'string' && node.videoId) found.push(node);
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  walk(data);
  return found;
}

/** Strip query, AEM cache-busting hash and extension so poster srcs can be compared. */
function srcKey(src) {
  return (src || '').split('?')[0].replace(/\.[0-9]+(\.[a-z0-9]+)$/i, '$1').replace(/\.[a-z0-9]+$/i, '');
}

function findVideoId(document, posterSrc, captionText) {
  const entries = collectVideoEntries(document);
  if (!entries.length) return '';
  const key = srcKey(posterSrc);
  const byPoster = key && entries.find((e) => {
    const s = e.image && (e.image.src || e.image.url);
    if (!s) return false;
    const k = srcKey(s);
    return k === key || k.startsWith(key) || key.startsWith(k);
  });
  if (byPoster) return byPoster.videoId;
  const byCaption = captionText && entries.find((e) => clean(e.captionText) === captionText);
  if (byCaption) return byCaption.videoId;
  const byType = entries.find((e) => /video/i.test(e['@type'] || ''));
  return (byType || entries[0]).videoId;
}

export default function parse(element, { document }) {
  const figure = element.closest('figure');
  const figcaption = figure ? figure.querySelector('figcaption') : null;
  const captionText = figcaption ? clean(figcaption.textContent) : '';

  const content = [];

  const srcImg = element.querySelector('img');
  const posterSrc = srcImg ? srcImg.getAttribute('src') || '' : '';
  if (posterSrc && !posterSrc.startsWith('data:')) {
    const img = document.createElement('img');
    img.src = posterSrc;
    img.alt = clean(srcImg.getAttribute('alt')) || captionText;
    content.push(img);
  }

  const videoId = findVideoId(document, posterSrc, captionText);
  if (videoId) {
    const href = `https://fast.wistia.net/embed/iframe/${videoId}`;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = href;
    content.push(link);
  }

  const cells = [[content]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'video', cells });
  element.replaceWith(block);

  // Replace the whole figure (caption + arrow decoration) with the block's wrapper,
  // holding the block followed by the caption text as a paragraph.
  if (figure && figure.parentNode) {
    const holder = block.parentElement && block.parentElement !== figure
      ? block.parentElement
      : document.createElement('div');
    if (!holder.contains(block)) holder.append(block);
    if (captionText) {
      const p = document.createElement('p');
      p.textContent = captionText;
      block.after(p);
    }
    if (holder !== figure) figure.replaceWith(holder);
  }
}
