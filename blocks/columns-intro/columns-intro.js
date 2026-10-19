/**
 * Two-column intro: heading cell | body text cell.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-intro-row');
    const [headingCell, bodyCell, ...rest] = row.children;
    if (headingCell) headingCell.classList.add('columns-intro-heading');
    if (bodyCell) bodyCell.classList.add('columns-intro-body');
    rest.forEach((cell) => cell.classList.add('columns-intro-body'));
  });
}
