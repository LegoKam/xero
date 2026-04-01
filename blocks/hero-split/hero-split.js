export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  const [imageRow, textRow] = rows;

  // Build content column
  const content = document.createElement('div');
  content.className = 'hero-split-content';

  // Build media column
  const media = document.createElement('div');
  media.className = 'hero-split-media';

  // Extract image
  const picture = imageRow.querySelector('picture');
  if (picture) {
    media.append(picture);
  } else {
    const img = imageRow.querySelector('img');
    if (img) media.append(img);
  }

  // Extract text content from each cell in the text row
  [...textRow.children].forEach((cell) => {
    const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
    const link = cell.querySelector('a');

    if (heading) {
      content.append(heading);
    } else if (link && !heading) {
      link.classList.add('button');
      const wrapper = document.createElement('p');
      wrapper.className = 'button-wrapper';
      wrapper.append(link);
      content.append(wrapper);
    } else {
      const text = cell.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.className = 'hero-split-subtitle';
        p.textContent = text;
        content.append(p);
      }
    }
  });

  // Replace block content
  block.textContent = '';
  block.append(content, media);
}
