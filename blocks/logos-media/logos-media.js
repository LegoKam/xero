export default function decorate(block) {
  // Flatten all images from rows into a single grid
  const images = block.querySelectorAll('img');
  const grid = document.createElement('div');
  grid.className = 'logos-media-grid';

  images.forEach((img) => {
    const item = document.createElement('div');
    item.className = 'logos-media-item';
    const pic = img.closest('picture') || img;
    item.append(pic);
    grid.append(item);
  });

  block.textContent = '';
  block.append(grid);
}
