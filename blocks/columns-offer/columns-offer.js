const STAT_PATTERN = /^[^\w\s]?\s*\d[\d.,]*$/;

/**
 * Returns true when a paragraph holds nothing but a single link (a CTA).
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkParagraph(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Groups the link-only paragraphs of the text column into an actions row.
 * The first link becomes the primary button (unless the author already formatted it);
 * the rest stay text links.
 * @param {Element} col
 */
function decorateActions(col) {
  const ctas = [...col.children].filter(isLinkParagraph);
  if (!ctas.length) return;
  const actions = document.createElement('div');
  actions.className = 'columns-offer-actions';
  ctas[0].before(actions);
  ctas.forEach((p, i) => {
    const a = p.querySelector('a');
    if (!a.classList.contains('button')) {
      if (i === 0) {
        p.className = 'button-wrapper';
        a.className = 'button primary';
      } else {
        p.classList.add('columns-offer-link');
      }
    }
    actions.append(p);
  });
}

/**
 * Marks the price stat (e.g. "$0") and the label/note paragraphs around it,
 * and splits a leading currency symbol so it can be set smaller than the amount.
 * @param {Element} col
 */
function decorateCard(col) {
  const paragraphs = [...col.querySelectorAll(':scope > p')];
  const stat = paragraphs.find((p) => STAT_PATTERN.test(p.textContent.trim()));
  if (!stat) return;
  stat.classList.add('columns-offer-stat');
  const idx = paragraphs.indexOf(stat);
  paragraphs.slice(0, idx).forEach((p) => p.classList.add('columns-offer-label'));
  paragraphs.slice(idx + 1).forEach((p) => p.classList.add('columns-offer-note'));

  const holder = stat.querySelector('strong') || stat;
  const text = holder.textContent.trim();
  const match = text.match(/^([^\d\s]+)\s*(.+)$/);
  if (!match) return;
  const [, symbol, value] = match;
  const currency = document.createElement('span');
  currency.className = 'columns-offer-currency';
  currency.textContent = symbol;
  const amount = document.createElement('span');
  amount.className = 'columns-offer-amount';
  amount.textContent = value;
  holder.replaceChildren(currency, amount);
}

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
      if (isCard) decorateCard(col);
      else decorateActions(col);
    });
  });
}
