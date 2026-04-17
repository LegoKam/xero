# Cards-Grid Block Enhancement Plan

## Context
The `cards-grid` block already exists in `blocks/cards-grid/` with basic card structure (image + body). The user wants to enhance it to support the **Icon + Title + Text** pattern from the Xero AU homepage, matching a screenshot they'll provide.

### Current State
- **JS** (`cards-grid.js`): Converts rows to `<ul>/<li>`, classifies children as `cards-grid-card-image` or `cards-grid-card-body`
- **CSS** (`cards-grid.css`): Basic grid layout (`auto-fill, minmax(257px, 1fr)`), border style, image aspect ratio 4:3
- **Content**: Used on AU page for "Run your business, but better" section with icon + heading + description cards

### Design Tokens Available
- Xero Navy text: `var(--xero-navy)` / `var(--text-color)` (`#213b55`)
- Xero Blue: `var(--xero-blue)` (`#0078c8`)
- Light grey bg: `var(--xero-light-grey)` (`#ecf2f6`)
- Font: National2 via `var(--body-font-family)`
- Spacing: `var(--content-gap)` (24px), `var(--section-spacing)` (48px)

### Target Design (from screenshot reference)
The Xero AU "Run your business, but better" section shows:
- 3 cards in a row on desktop
- Each card: tick/check icon (small, top-left) + bold heading + description paragraph
- Clean white background, no card borders
- Generous padding and spacing between cards

## Checklist

- [ ] **1. User provides screenshot** — Wait for the screenshot to confirm exact visual design
- [ ] **2. Extract styles from live Xero site** — Navigate to xero.com/au and extract computed styles for the cards section (padding, gap, font sizes, icon sizes, card dimensions)
- [ ] **3. Update `cards-grid.js`** — Enhance JS decoration to:
  - Detect icon images (small images that aren't full card-width photos)
  - Add `.cards-grid-card-icon` class for icon containers
  - Keep existing image/body classification working for backwards compatibility
- [ ] **4. Update `cards-grid.css`** — Restyle to match Xero design:
  - Remove card borders for icon-card variant
  - Set icon size (~40-48px)
  - Bold heading styling
  - Proper card padding and gap
  - Responsive: stack on mobile, 3-column on desktop
  - Use Xero design tokens from `styles.css`
- [ ] **5. Create test page** — Add `drafts/cards-grid-test.plain.html` with sample content matching the icon + title + text pattern
- [ ] **6. Verify rendering** — Preview on localhost:3000, compare with screenshot, check mobile responsive
- [ ] **7. Run lint** — `npx stylelint` and `npx eslint` on changed files

> **Note:** Implementation requires Execute mode. Switch to execute mode to proceed.
