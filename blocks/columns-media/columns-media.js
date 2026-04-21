export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-media-${cols.length}-cols`);

  // Check if this is a badge/logo grid (images only, no headings)
  const hasHeading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const images = block.querySelectorAll('img');

  if (!hasHeading && images.length > 0) {
    // Badge grid mode: flatten all images into a single grid container
    const grid = document.createElement('div');
    grid.className = 'columns-media-grid';
    images.forEach((img) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'columns-media-img-col';
      const pic = img.closest('picture') || img;
      wrapper.append(pic);
      grid.append(wrapper);
    });
    block.textContent = '';
    block.append(grid);
  } else {
    // Standard columns-media: keep row structure, mark image columns
    [...block.children].forEach((row) => {
      [...row.children].forEach((col) => {
        const pic = col.querySelector('picture');
        if (pic) {
          const picWrapper = pic.closest('div');
          if (picWrapper && picWrapper.children.length === 1) {
            picWrapper.classList.add('columns-media-img-col');
          }
        }
      });
    });
  }
}
