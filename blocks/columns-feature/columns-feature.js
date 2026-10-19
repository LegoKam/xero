/**
 * Side-by-side text and image columns.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const first = block.firstElementChild;
  if (!first) return;
  block.classList.add(`columns-feature-${first.children.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && col.children.length === 1 && !col.textContent.trim()) {
        col.classList.add('columns-feature-img-col');
      } else {
        col.classList.add('columns-feature-text-col');
      }
    });
  });
}
