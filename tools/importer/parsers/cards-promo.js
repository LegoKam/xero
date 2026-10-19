/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-promo.
 * Source: Row__Element > Col__Element > Block__Element (heading, text, link + illustration).
 * Block structure (2 columns): one row per promo -> [illustration | heading + paragraph + link].
 */
function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildImage(document, scope) {
  const srcImg = scope.querySelector('img');
  if (!srcImg) return '';
  let src = srcImg.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) return '';
  // Illustrations are SVG content images; avoid the default .svg -> :icon: conversion.
  if (/\.svg$/i.test(src)) src += '?format=svg';
  let alt = (srcImg.getAttribute('alt') || '').trim();
  if (!alt) {
    const labelled = srcImg.closest('[aria-label]');
    const label = labelled ? labelled.getAttribute('aria-label').trim() : '';
    // Source aria-labels are often just asset file names (e.g. "au-home-7-1"); treat those as decorative.
    if (label && /\s/.test(label)) alt = label;
  }
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  return img;
}

export default function parse(element, { document }) {
  const cells = [];

  element.querySelectorAll(':scope > [class*="Col__Element"] > [class^="Block__Element"]').forEach((promo) => {
    const contentCell = [];

    const heading = promo.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading && clean(heading.textContent)) contentCell.push(heading);

    promo.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim()) contentCell.push(p);
    });

    promo.querySelectorAll('[class^="Block__ButtonWrapper"] a[href]').forEach((a) => {
      const text = clean(a.textContent);
      if (!text) return;
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = text;
      const p = document.createElement('p');
      p.append(link);
      contentCell.push(p);
    });

    const imageScope = promo.querySelector('[class^="Block__ImageWrapper"]') || promo;
    const img = buildImage(document, imageScope);

    if (img || contentCell.length) cells.push([img, contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-promo', cells });
  element.replaceWith(block);
}
