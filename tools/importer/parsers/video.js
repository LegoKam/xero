/* eslint-disable */
/* global WebImporter */
/**
 * Parser for video.
 * Source: [class^="Video__Element"] (Wistia player placeholder). Shapes:
 *  - OverlayButton variant: poster img inside OverlayButton__Element + "Play video" title,
 *    often inside figure.Caption__Figure with a figcaption (video heroes, feature pages);
 *  - bare Video__Element holding only the poster img (xero-ledger-and-cashbook header).
 * The DOM holds no video URL; ids live in the __NEXT_DATA__ JSON:
 *  - header components (left-aligned-video-header, video-header, product-page/video-header): "videoId";
 *  - content components (content/video, feature-page/video): "@type" contains "video", id in "id".
 * Each Video__Element is paired with its own JSON entry by poster src, then caption, then document
 * order among the not-yet-used video entries. YouTube / Vimeo / Brightcove / mp4 ids or URLs are
 * emitted as such; plain ids default to Wistia (fast.wistia.net/embed/iframe/<id>).
 * Block structure (1 column, 1 row): optional poster image + link to the video URL in one cell.
 * The figcaption text is kept as a paragraph after the block; the whole figure is replaced.
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

const VIDEO_URL_RE = /(youtube\.com|youtu\.be|vimeo\.com|wistia\.(com|net)|brightcove|bcove\.video|\.mp4(\?|#|$))/i;

function readNextData(document) {
  const script = document.querySelector('#__NEXT_DATA__');
  if (!script) return null;
  try {
    return JSON.parse(script.textContent);
  } catch (e) {
    return null;
  }
}

function isVideoComponent(node) {
  return /video/i.test(node['@type'] || '') && !/video-browser|videos-list/i.test(node['@type'] || '');
}

/** Every object describing a video: header components (videoId) and video components (@type). */
function collectVideoEntries(document) {
  if (document.__xeroVideoEntries) return document.__xeroVideoEntries;
  const data = readNextData(document);
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const hasId = typeof node.videoId === 'string' && node.videoId;
    const hasUrl = ['videoUrl', 'embedUrl', 'videoSrc'].some((k) => typeof node[k] === 'string' && node[k]);
    if (hasId || isVideoComponent(node) || hasUrl) {
      // ordered: header/content components that render a Video__Element (not feature tiles)
      found.push({ node, ordered: !!hasId || isVideoComponent(node) });
    }
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  if (data) walk(data);
  document.__xeroVideoEntries = found;
  return found;
}

/** Strip query, AEM cache-busting number and extension so poster srcs can be compared. */
function srcKey(src) {
  const file = (src || '').split('?')[0].split('#')[0];
  return file.replace(/\.[0-9]+(\.[a-z0-9]+)$/i, '$1').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
}

function entryPoster(node) {
  const img = node.image || node.poster || node.thumbnail;
  if (img && typeof img === 'object') return img.src || img.url || '';
  if (typeof img === 'string') return img;
  return node.imageSrc || '';
}

function absolute(url) {
  if (/^\/\//.test(url)) return `https:${url}`;
  if (/^\//.test(url)) return `https://www.xero.com${url}`;
  return url;
}

/** Turn a stored id or URL into the URL the video block understands. */
function toVideoUrl(value, provider) {
  const v = clean(value);
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v) || /^\/.+\.mp4(\?|#|$)/i.test(v)) {
    return VIDEO_URL_RE.test(v) ? absolute(v) : '';
  }
  const p = (provider || '').toLowerCase();
  if (/youtube/.test(p)) return `https://www.youtube.com/watch?v=${v}`;
  if (/vimeo/.test(p)) return `https://vimeo.com/${v}`;
  if (/^\d{6,}$/.test(v)) return `https://vimeo.com/${v}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(v) && /[A-Z_-]/.test(v)) return `https://www.youtube.com/watch?v=${v}`;
  if (/^[A-Za-z0-9]+$/.test(v)) return `https://fast.wistia.net/embed/iframe/${v}`;
  return '';
}

function entryUrl(node) {
  const provider = node.videoType || node.provider || node.platform || node.source || '';
  const candidates = [node.videoUrl, node.embedUrl, node.url, node.videoSrc, node.videoId];
  if (isVideoComponent(node)) candidates.push(node.id);
  for (const c of candidates) {
    if (typeof c !== 'string' || !c) continue;
    const url = toVideoUrl(c, provider);
    if (url) return url;
  }
  return '';
}

/** A URL already present in the DOM (iframe / video / data attribute), if any. */
function domVideoUrl(element) {
  const iframe = element.querySelector('iframe[src]');
  if (iframe && VIDEO_URL_RE.test(iframe.getAttribute('src'))) return absolute(iframe.getAttribute('src'));
  const source = element.querySelector('video[src], video source[src]');
  if (source) return absolute(source.getAttribute('src'));
  const holder = element.querySelector('[data-video-id], [data-wistia-id], [data-youtube-id], [data-vimeo-id]')
    || (element.matches('[data-video-id], [data-wistia-id]') ? element : null);
  if (holder) {
    if (holder.dataset.youtubeId) return toVideoUrl(holder.dataset.youtubeId, 'youtube');
    if (holder.dataset.vimeoId) return toVideoUrl(holder.dataset.vimeoId, 'vimeo');
    return toVideoUrl(holder.dataset.wistiaId || holder.dataset.videoId);
  }
  return '';
}

function findEntry(document, posterSrc, captionText) {
  const entries = collectVideoEntries(document);
  if (!document.__xeroVideoUsed) document.__xeroVideoUsed = new Set();
  const used = document.__xeroVideoUsed;
  const free = entries.filter((e) => !used.has(e.node));
  const key = srcKey(posterSrc);
  const base = key.split('/').pop();
  let hit = key && free.find((e) => {
    const k = srcKey(entryPoster(e.node));
    return k && (k === key || k.split('/').pop() === base);
  });
  if (!hit && captionText) {
    hit = free.find((e) => e.ordered
      && [e.node.captionText, e.node.caption].some((c) => typeof c === 'string' && clean(c) === captionText));
  }
  // Document order among the remaining header/content video components, but never steal an entry
  // whose poster clearly belongs to a different video.
  if (!hit) hit = free.find((e) => e.ordered && (!key || !entryPoster(e.node)));
  if (!hit) return null;
  used.add(hit.node);
  return hit.node;
}

export default function parse(element, { document }) {
  const figure = element.closest('figure');
  const figcaption = figure ? figure.querySelector('figcaption') : null;
  const captionText = figcaption ? clean(figcaption.textContent) : '';

  const content = [];

  const srcImg = element.querySelector('img');
  const posterSrc = srcImg ? srcImg.getAttribute('src') || '' : '';
  const entry = findEntry(document, posterSrc, captionText);

  if (posterSrc && !posterSrc.startsWith('data:')) {
    const img = document.createElement('img');
    img.src = posterSrc;
    img.alt = clean(srcImg.getAttribute('alt')) || captionText
      || (entry && typeof entry.heading === 'string' ? clean(entry.heading.replace(/[*[\]]/g, '')) : '');
    content.push(img);
  }

  const href = domVideoUrl(element) || (entry ? entryUrl(entry) : '');
  if (href) {
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
