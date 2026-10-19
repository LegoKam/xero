const STAT_PATTERN = /^[^\w\s]?\s*\d[\d.,]*$/;

/**
 * Offer text beside an offer card (label, price stat, note, tick list).
 * The last column of each multi-column row is treated as the offer card.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const first = block.firstElementChild;
  if (!first) return;
  block.classList.add(`columns-offer-${first.children.length}-cols`);

  [...block.children].forEach((row) => {
    const cols = [...row.children];
    cols.forEach((col, i) => {
      const isCard = cols.length > 1 && i === cols.length - 1;
      col.classList.add(isCard ? 'columns-offer-card' : 'columns-offer-text');
      if (!isCard) return;
      // mark the price/stat paragraph (e.g. "$0") so it can be styled large
      const stat = [...col.querySelectorAll('p')]
        .find((p) => STAT_PATTERN.test(p.textContent.trim()));
      if (stat) stat.classList.add('columns-offer-stat');
    });
  });
}
