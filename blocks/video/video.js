/*
 * Video Block
 * Shows a video referenced by a link, with an optional poster image.
 * Supports YouTube, Vimeo, Wistia, Brightcove players and direct video files (mp4/webm).
 */
import { createOptimizedPicture } from '../../scripts/aem.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Determines the video source type from a URL.
 * @param {URL} url
 * @returns {'youtube'|'vimeo'|'wistia'|'brightcove'|'file'}
 */
function getVideoSource(url) {
  const host = url.hostname;
  if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('vimeo')) return 'vimeo';
  if (host.includes('wistia')) return 'wistia';
  if (host.includes('brightcove')) return 'brightcove';
  return 'file';
}

const LABELS = {
  youtube: 'YouTube video',
  vimeo: 'Vimeo video',
  wistia: 'Wistia video',
  brightcove: 'video',
  file: 'video',
};

/**
 * Builds the iframe embed URL for hosted players.
 * @param {URL} url
 * @param {string} source
 * @param {boolean} autoplay
 * @param {boolean} background
 * @returns {string}
 */
function getEmbedUrl(url, source, autoplay, background) {
  if (source === 'youtube') {
    let vid = url.searchParams.get('v');
    if (url.hostname.includes('youtu.be')) [, vid] = url.pathname.split('/');
    if (!vid && url.pathname.startsWith('/embed/')) [, , vid] = url.pathname.split('/');
    const params = new URLSearchParams({ rel: '0' });
    if (autoplay) params.set('autoplay', '1');
    if (background) {
      ['mute', 'loop', 'playsinline', 'disablekb'].forEach((p) => params.set(p, '1'));
      params.set('controls', '0');
      params.set('playlist', vid);
    }
    return `https://www.youtube.com/embed/${encodeURIComponent(vid || '')}?${params}`;
  }
  if (source === 'vimeo') {
    const vid = url.pathname.split('/').filter(Boolean).pop();
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (background) params.set('background', '1');
    return `https://player.vimeo.com/video/${encodeURIComponent(vid)}${params.size ? `?${params}` : ''}`;
  }
  if (source === 'wistia') {
    // accepts fast.wistia.net/embed/iframe/<id> and <account>.wistia.com/medias/<id>
    const vid = url.pathname.split('/').filter(Boolean).pop();
    const params = new URLSearchParams();
    if (autoplay) params.set('autoPlay', 'true');
    if (background) {
      params.set('muted', 'true');
      params.set('endVideoBehavior', 'loop');
      params.set('playbar', 'false');
    }
    return `https://fast.wistia.net/embed/iframe/${encodeURIComponent(vid)}${params.size ? `?${params}` : ''}`;
  }
  // brightcove: use the player URL as authored, adding autoplay when requested
  const embed = new URL(url.href);
  if (autoplay) embed.searchParams.set('autoplay', 'true');
  if (background) embed.searchParams.set('muted', 'true');
  return embed.href;
}

/**
 * Creates the media element (iframe or video) for the given URL.
 * @param {URL} url
 * @param {boolean} autoplay
 * @param {boolean} background
 * @returns {Element}
 */
function createMedia(url, autoplay, background) {
  const source = getVideoSource(url);
  if (source === 'file') {
    const video = document.createElement('video');
    video.className = 'video-media';
    if (background) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
    } else {
      video.controls = true;
    }
    if (autoplay) video.autoplay = true;
    const sourceEl = document.createElement('source');
    sourceEl.src = url.href;
    const ext = url.pathname.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'ogg'].includes(ext)) sourceEl.type = `video/${ext}`;
    video.append(sourceEl);
    return video;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'video-media video-frame';
  const iframe = document.createElement('iframe');
  iframe.src = getEmbedUrl(url, source, autoplay, background);
  iframe.title = `Content from ${LABELS[source]}`;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.allowFullscreen = true;
  wrapper.append(iframe);
  return wrapper;
}

/**
 * Loads the embed into the block once.
 * @param {Element} block
 * @param {URL} url
 * @param {boolean} autoplay
 * @param {boolean} background
 */
function loadEmbed(block, url, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;
  const media = createMedia(url, autoplay, background);
  block.append(media);
  block.dataset.embedLoaded = 'true';
}

/**
 * Video block: optional poster image row, then a row with the video URL link.
 * Poster and link may also share a single cell.
 * Options: autoplay (muted background loop when no poster is clicked).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const posterImg = block.querySelector('picture img');
  if (!link) {
    block.classList.add('video-empty');
    return;
  }

  let url;
  try {
    url = new URL(link.href);
  } catch {
    return;
  }

  const autoplay = block.classList.contains('autoplay');
  block.textContent = '';
  block.dataset.embedLoaded = 'false';

  if (posterImg && !autoplay) {
    block.classList.add('video-has-poster');
    const label = `Play ${LABELS[getVideoSource(url)]}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-poster';
    button.setAttribute('aria-label', label);
    button.append(createOptimizedPicture(posterImg.src, posterImg.alt || '', false, [{ width: '1200' }]));
    const icon = document.createElement('span');
    icon.className = 'video-play-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    button.addEventListener('click', () => {
      button.remove();
      loadEmbed(block, url, true, false);
      block.querySelector('iframe, video')?.focus();
    }, { once: true });
    block.append(button);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      const play = autoplay && !prefersReducedMotion.matches;
      loadEmbed(block, url, play, autoplay);
    }
  });
  observer.observe(block);
}
