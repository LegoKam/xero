export default function decorate(block) {
  // The block may contain a single row with mixed content:
  // heading, description paragraph, and multiple image paragraphs.
  // Or it may have images spread across multiple rows.
  const content = block.querySelector(':scope > div > div') || block;
  const children = [...content.children];

  // Separate text content (headings, description) from images
  const header = document.createElement('div');
  header.className = 'logos-media-header';

  const grid = document.createElement('div');
  grid.className = 'logos-media-grid';

  children.forEach((child) => {
    const img = child.querySelector('img');
    const isHeading = child.matches('h1, h2, h3, h4, h5, h6');
    const isTextP = child.matches('p') && !img && child.textContent.trim();

    if (isHeading || isTextP) {
      header.append(child);
    } else if (img) {
      const item = document.createElement('div');
      item.className = 'logos-media-item';
      const pic = img.closest('picture') || img;
      item.append(pic);
      grid.append(item);
    }
  });

  block.textContent = '';
  if (header.children.length > 0) block.append(header);
  block.append(grid);
}
