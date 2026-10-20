/*
 * Video Block
 * Shows a video referenced by a link, with an optional poster image.
 * Supports YouTube, Vimeo, Wistia, Brightcove players and direct video files (mp4/webm).
 */
import { createOptimizedPicture } from '../../scripts/aem.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// hand-drawn play icon from the source OverlayButton
const PLAY_ICON = '<svg viewBox="0 0 43 42" focusable="false" aria-hidden="true"><path d="M36.2004 6.22094C27.1776 -2.91442 13.1882 1.01218 5.82094 9.74686C-2.04296 18.161 0.274823 29.6203 8.71816 36.8324C17.4926 44.365 31.1509 40.4384 38.2698 32.7455C45.3887 25.0526 43.1537 13.1125 36.2004 6.22094ZM37.0282 31.6236C31.0682 38.9159 18.8171 41.0795 10.9532 35.5502C2.67538 29.7004 -0.139066 18.3213 7.0626 10.7085C13.9332 2.61488 25.2737 0.210837 33.9654 7.26269C41.2498 13.1125 42.9882 24.4916 37.0282 31.6236Z" stroke-width="0.5"/><path d="M25.5213 14.5862C23.0379 13.3842 20.5546 11.6213 17.8229 10.9802C17.3263 10.9 16.8296 11.2206 16.4985 11.7014C16.4985 11.3809 16.4985 11.0603 16.4985 10.8199C16.4157 9.37749 14.5118 10.259 14.5118 11.3007C14.5946 14.426 14.0979 17.4711 14.0152 20.5162C13.9324 23.962 14.4291 27.4879 14.4291 30.9337C14.4291 31.4947 14.7602 31.7351 15.3396 31.6549C22.6241 30.2926 29.1635 25.9654 35.0407 21.8785C35.4546 21.558 35.9513 20.6765 35.3718 20.2758C32.3091 18.1122 28.998 16.2691 25.5213 14.5862ZM16.4157 12.8233C16.4985 12.9034 16.5813 12.9034 16.6641 12.9034C19.0646 13.4644 20.9685 14.9068 23.1207 15.9485C26.5146 17.5512 29.8257 19.234 32.8885 21.3977C27.9218 24.8435 22.3757 28.2091 16.3329 29.5714C16.2502 26.366 15.9191 23.2408 15.9191 20.0354C15.9191 17.6314 16.3329 15.2273 16.4157 12.8233Z" stroke-width="0.5"/></svg>';

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
    // player chrome colour matches the source player-color (#000856)
    const params = new URLSearchParams({ playerColor: '000856' });
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
    const alt = posterImg.alt?.trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-poster';
    // name starts with the visible text so voice control "click Play video" works
    button.setAttribute('aria-label', alt ? `Play video: ${alt}` : 'Play video');
    const picture = createOptimizedPicture(posterImg.src, '', false, [{ width: '1200' }]);
    picture.querySelector('img')?.setAttribute('aria-hidden', 'true');
    button.append(picture);
    const overlay = document.createElement('span');
    overlay.className = 'video-overlay';
    overlay.innerHTML = `<span class="video-play-graphic">
      <span class="video-play-icon">${PLAY_ICON}</span>
      <span class="video-play-label">Play video</span>
    </span>`;
    button.append(overlay);
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
