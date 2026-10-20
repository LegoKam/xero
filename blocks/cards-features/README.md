# cards-features

Custom **cards** block. Purpose: short feature highlights in a 3-column (or 4-column) row: an optional decorative tick icon, a bold or linked title, a description and an optional link.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. One row per feature; single cell containing:

1. Title: a bold paragraph (`**Title**`) or a heading (optionally linked, e.g. `## [Title](/link)`).
2. Description paragraph.
3. Optional link paragraph (sits on the bottom line of the row on desktop).

## Supported variations

- `cards-features (ticks)`: always show the blue tick icon beside each title.
- `cards-features (no-ticks)`: never show the tick icon.
- No variation: the tick is shown automatically when the block has at most 3 items, every title is a bold paragraph and no item contains a link (the xero.com tick-list pattern). Linked titles and rows with "Explore ..." links render without icons.

Layout: 1 column on mobile; 3 columns from 768px. When the item count is a multiple of 4 the block uses 2 columns from 768px and 4 columns from 1024px. The block is inset to the source content column (8.33% / 10.42% / 11% of the page width).

## Universal Editor fields

N/A (Document Authoring project)
