import { createOptimizedPicture } from '../../scripts/aem.js';

function isPricingGrid(block) {
  return block.querySelector('h3') && block.querySelectorAll(':scope > div > div > p').length > 4;
}

function decoratePricingGrid(block) {
  const rows = [...block.children];
  // Filter out empty rows (rows where inner div has no meaningful content)
  const contentRows = rows.filter((row) => {
    const inner = row.querySelector(':scope > div');
    return inner && inner.textContent.trim().length > 0;
  });

  // Group into cards: each card has [pricing, name, cta] in sequence
  const cards = [];
  for (let i = 0; i < contentRows.length; i += 3) {
    if (i + 2 < contentRows.length) {
      cards.push({
        pricing: contentRows[i],
        name: contentRows[i + 1],
        cta: contentRows[i + 2],
      });
    }
  }

  const ul = document.createElement('ul');
  cards.forEach((card) => {
    const li = document.createElement('li');
    li.className = 'cards-grid-pricing-card';

    // Plan name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'cards-grid-plan-name';
    const heading = card.name.querySelector('h3');
    if (heading) nameDiv.append(heading);
    li.append(nameDiv);

    // Pricing details
    const pricingDiv = document.createElement('div');
    pricingDiv.className = 'cards-grid-plan-pricing';
    const paragraphs = card.pricing.querySelectorAll('p');
    paragraphs.forEach((p) => {
      // Detect savings line (has bold text with "Save")
      if (p.querySelector('strong') && p.textContent.includes('Save')) {
        p.classList.add('cards-grid-savings');
      }
      // Detect the "Now" + price line
      if (p.querySelector('strong') && p.textContent.includes('Now')) {
        p.classList.add('cards-grid-now-price');
      }
      // Detect "Usually" line
      if (p.textContent.startsWith('Usually')) {
        p.classList.add('cards-grid-usual-price');
      }
      // Detect "AUD per month"
      if (p.textContent.includes('per month')) {
        p.classList.add('cards-grid-per-month');
      }
      // Description (no class added = last paragraph without special markers)
      pricingDiv.append(p);
    });
    li.append(pricingDiv);

    // CTA buttons
    const ctaDiv = document.createElement('div');
    ctaDiv.className = 'cards-grid-plan-cta';
    const links = card.cta.querySelectorAll('a');
    links.forEach((link) => {
      const wrapper = document.createElement('p');
      if (link.textContent.trim() === 'Buy now') {
        wrapper.className = 'button-wrapper';
        link.className = 'button primary';
      } else {
        wrapper.className = 'cards-grid-learn-more';
      }
      wrapper.append(link);
      ctaDiv.append(wrapper);
    });
    li.append(ctaDiv);

    ul.append(li);
  });

  block.textContent = '';
  block.classList.add('pricing');
  block.append(ul);
}

function isImageCardGrid(block) {
  const rows = [...block.children];
  return rows.length > 0 && rows.every((row) => {
    const img = row.querySelector('img');
    const hasHeading = row.querySelector('h2, h3');
    return img && !hasHeading;
  });
}

function decorateImageCardGrid(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-grid-image-card';

    const img = row.querySelector('img');
    if (img) {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'cards-grid-card-image';
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      imageDiv.append(optimizedPic);
      li.append(imageDiv);
    }

    // Collect any remaining text content (headings, paragraphs, links)
    const textContent = row.querySelectorAll('h2, h3, h4, p, a');
    if (textContent.length > 0) {
      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'cards-grid-card-body';
      textContent.forEach((el) => {
        if (!el.closest('picture') && el.textContent.trim()) {
          bodyDiv.append(el);
        }
      });
      if (bodyDiv.children.length > 0) li.append(bodyDiv);
    }

    ul.append(li);
  });
  block.textContent = '';
  block.classList.add('image-cards');
  block.append(ul);
}

function decorateDefaultGrid(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-grid-card-image';
      else div.className = 'cards-grid-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

export default function decorate(block) {
  if (isPricingGrid(block)) {
    decoratePricingGrid(block);
  } else if (isImageCardGrid(block)) {
    decorateImageCardGrid(block);
  } else {
    decorateDefaultGrid(block);
  }
}
