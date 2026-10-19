/**
 * FAQ accordion: one row per item (question | answer rich text).
 * Each row becomes a native details/summary element.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const items = [...block.children].map((row) => {
    const [questionCell, answerCell] = row.children;
    if (!questionCell || !questionCell.textContent.trim()) return null;

    const details = document.createElement('details');
    details.className = 'accordion-faq-item';

    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-question';
    summary.append(...questionCell.childNodes);

    const answer = document.createElement('div');
    answer.className = 'accordion-faq-answer';
    if (answerCell) answer.append(...answerCell.childNodes);

    details.append(summary, answer);
    return details;
  }).filter(Boolean);

  block.replaceChildren(...items);
}
