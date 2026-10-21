---
name: Xero
description: Beautiful business software. Navy and Xero blue on white with a mint-green primary action.
colors:
  navy: "#000856"
  xero-blue: "#1f65d6"
  xero-blue-dark: "#184390"
  mint-green: "#50dcaa"
  mint-green-dark: "#4ac49d"
  cyan: "#13b5ea"
  grey-blue: "#ecf2f6"
  mist: "#f5f9fa"
  sand: "#f2f1ee"
  white: "#ffffff"
typography:
  heading:
    fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "51.6px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  button: "6px"
  panel: "12px"
  pill: "56px"
spacing:
  section: "72px"
  content-padding: "40px"
components:
  button-primary:
    backgroundColor: "{colors.mint-green}"
    textColor: "{colors.navy}"
    rounded: "{rounded.button}"
  button-primary-hover:
    backgroundColor: "{colors.mint-green-dark}"
  button-accent:
    backgroundColor: "{colors.xero-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
  button-accent-hover:
    backgroundColor: "{colors.xero-blue-dark}"
---

## Overview

Descriptive snapshot of the Xero AU site as built in this repo (`styles/brand.css`, measured from xero.com/au) and as rendered at `main--xero--LegoKam.aem.page`. A deep navy text colour on white, Xero blue for accents and links, and a mint-green primary call to action.

## Colors

Navy `#000856` is both the text and heading colour. Mint green `#50dcaa` carries the primary action, with Xero blue `#1f65d6` as the accent action. Grey-blue `#ecf2f6`, mist `#f5f9fa` and sand `#f2f1ee` are the alternating section bands.

## Typography

Source typeface National2 is licensed (webfonts in `/fonts`); Inter is the open-licence substitute and is what the stylesheet declares first. Headings are bold with -0.02em tracking and scale from 32px (mobile) to 51.6px (1200+). Body is 16px at 1.4 line-height; lead text scales 20px to 27.6px.

## Layout

Content is capped at 1440px with an inset column (8.33vw, 10.42vw at 768+, 11vw to 158px at 1024+). Section spacing is 45px on mobile, 72px from 900px. The nav bar is 60px.

## Shapes

Buttons use a 6px radius, panels and cards 12px, pills 56px.

## Components

Navy promo banner with a countdown above a sticky white header; megamenu header with a green "Get one month free" CTA; grey-blue bands holding white cards; a six-column link-grid footer with a region selector.

## Do's and Don'ts

- Do keep text navy on white or grey-blue; use mint green for the single primary action per view.
- Do use Inter as the web fallback for National2.
- Don't introduce new accent hues beyond the cyan used in the logo.
