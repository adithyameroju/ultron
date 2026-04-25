---
name: acko-design-system
description: Complete ACKO design system including brand guidelines, colors, typography, spacing, and detailed UI component specifications. Use for all ACKO UI development, marketing materials, and visual content.
metadata:
  author: acko
  version: "2.0.0"
---

# ACKO Design System

Complete design system for building consistent, accessible, and on-brand ACKO interfaces.

## Table of Contents

### Foundation
1. [Colors](#colors)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Logo](#logo)
5. [Layout Patterns](#layout-patterns)
6. [Animations](#animations)
7. [UI Polish](#ui-polish)
8. [Accessibility](#accessibility)

### Components
9. [Buttons](#buttons)
10. [Text Fields](#text-fields)
11. [Dropdowns](#dropdowns)
12. [Checkbox](#checkbox)
13. [Radio Button](#radio-button)
14. [Calendar](#calendar)
15. [Badges](#badges)
16. [Navigation Wizard](#navigation-wizard)
17. [Pagination](#pagination)

---

# FOUNDATION

---

## Colors

### Core Brand Color

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Crocus Purple** | `#4E29BB` | 78, 41, 187 | Primary brand color |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Onyx | `#0A0A0A` | 10, 10, 10 | Text, dark backgrounds |
| Vivid Cerise | `#EC5FAB` | 236, 95, 171 | Highlights, promotions |
| Picton Blue | `#1EB7E7` | 30, 183, 231 | Interactive, links, info |
| Leafy Green | `#55B94D` | 85, 185, 77 | Success, confirmations |
| Sunshade | `#F4A024` | 244, 160, 36 | Warnings, attention |

### Color Scales (800 → 100)

**Onyx (Gray)**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#0A0A0A` | `#121212` | `#2F2F2F` | `#5D5D5D` | `#B0B0B0` | `#E7E7E7` | `#F6F6F6` | `#FFFFFF` |

**Crocus Purple**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#18084A` | `#2E1773` | `#4E29BB` | `#926FF3` | `#B59CF5` | `#D1C5FA` | `#ECEBFF` | `#F8F7FD` |

**Vivid Cerise**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#4F0826` | `#981950` | `#D82A7B` | `#EC5FAB` | `#F8A9D6` | `#FAD0E9` | `#FCE7F4` | `#FDF2F8` |

**Picton Blue**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#004768` | `#006A97` | `#009DE0` | `#1EB7E7` | `#59D8FF` | `#A1E7FD` | `#DEF7FF` | `#EEFAFF` |

**Leafy Green**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#004A19` | `#1C772C` | `#149A40` | `#55B94D` | `#85E37D` | `#B2F2AD` | `#DAFAD7` | `#F3FFF2` |

**Sunshade**
| 800 | 700 | 600 | 500 | 400 | 300 | 200 | 100 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| `#5B2C00` | `#B15A08` | `#D97700` | `#F4A024` | `#FFC368` | `#FFD79B` | `#FFEDC5` | `#FFF8E7` |

### Semantic Color Usage

| State | Color | Background | Foreground |
|-------|-------|------------|------------|
| Success | Leafy Green | `#DAFAD7` (200) | `#1C772C` (700) |
| Error | Vivid Cerise | `#FCE7F4` (200) | `#981950` (700) |
| Warning | Sunshade | `#FFEDC5` (200) | `#B15A08` (700) |
| Info | Picton Blue | `#DEF7FF` (200) | `#006A97` (700) |

### CSS Custom Properties

```css
:root {
  /* Purple */
  --purple-800: #18084A;
  --purple-700: #2E1773;
  --purple-600: #4E29BB;
  --purple-500: #926FF3;
  --purple-400: #B59CF5;
  --purple-300: #D1C5FA;
  --purple-200: #ECEBFF;
  --purple-100: #F8F7FD;
  
  /* Onyx */
  --onyx-800: #0A0A0A;
  --onyx-700: #121212;
  --onyx-600: #2F2F2F;
  --onyx-500: #5D5D5D;
  --onyx-400: #B0B0B0;
  --onyx-300: #E7E7E7;
  --onyx-200: #F6F6F6;
  --onyx-100: #FFFFFF;
  
  /* Cerise */
  --cerise-800: #4F0826;
  --cerise-700: #981950;
  --cerise-600: #D82A7B;
  --cerise-500: #EC5FAB;
  --cerise-400: #F8A9D6;
  --cerise-300: #FAD0E9;
  --cerise-200: #FCE7F4;
  --cerise-100: #FDF2F8;
  
  /* Blue */
  --blue-800: #004768;
  --blue-700: #006A97;
  --blue-600: #009DE0;
  --blue-500: #1EB7E7;
  --blue-400: #59D8FF;
  --blue-300: #A1E7FD;
  --blue-200: #DEF7FF;
  --blue-100: #EEFAFF;
  
  /* Green */
  --green-800: #004A19;
  --green-700: #1C772C;
  --green-600: #149A40;
  --green-500: #55B94D;
  --green-400: #85E37D;
  --green-300: #B2F2AD;
  --green-200: #DAFAD7;
  --green-100: #F3FFF2;
  
  /* Orange */
  --orange-800: #5B2C00;
  --orange-700: #B15A08;
  --orange-600: #D97700;
  --orange-500: #F4A024;
  --orange-400: #FFC368;
  --orange-300: #FFD79B;
  --orange-200: #FFEDC5;
  --orange-100: #FFF8E7;
}
```

---

## Typography

### Font Family

| Font | Role | CDN URL |
|------|------|---------|
| **Euclid Circular B** | All text | See font files below |

### Font Files

**Base URL:** `https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/`

| Weight | Normal | Italic |
|--------|--------|--------|
| Light (300) | `EuclidCircularB-Light.otf` | `EuclidCircularB-LightItalic.otf` |
| Regular (400) | `EuclidCircularB-Regular.otf` | `EuclidCircularB-RegularItalic.otf` |
| Medium (500) | `EuclidCircularB-Medium.otf` | `EuclidCircularB-MediumItalic.otf` |
| Semibold (600) | `EuclidCircularB-Semibold.otf` | `EuclidCircularB-SemiboldItalic.otf` |
| Bold (700) | `EuclidCircularB-Bold.otf` | `EuclidCircularB-BoldItalic.otf` |

### @font-face CSS

```css
@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-Light.otf') format('opentype');
  font-weight: 300;
  font-style: normal;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-LightItalic.otf') format('opentype');
  font-weight: 300;
  font-style: italic;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-RegularItalic.otf') format('opentype');
  font-weight: 400;
  font-style: italic;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-MediumItalic.otf') format('opentype');
  font-weight: 500;
  font-style: italic;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-Semibold.otf') format('opentype');
  font-weight: 600;
  font-style: normal;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-SemiboldItalic.otf') format('opentype');
  font-weight: 600;
  font-style: italic;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}

@font-face {
  font-family: 'Euclid Circular B';
  src: url('https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/Euclid%20Font/EuclidCircularB-BoldItalic.otf') format('opentype');
  font-weight: 700;
  font-style: italic;
}

body {
  font-family: 'Euclid Circular B', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Typography Scale

**Display (Heroes, Marketing)**
| Style | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| display-xl | 72px | 80px | -2px | Bold |
| display-lg | 56px | 64px | -1.5px | Bold |
| display-md | 48px | 56px | -1px | Bold |
| display-sm | 40px | 48px | -0.5px | Semibold |

**Headings (UI, Sections)**
| Style | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| heading-xl | 32px | 40px | -0.5px | Semibold |
| heading-lg | 24px | 32px | -0.3px | Semibold |
| heading-md | 20px | 28px | -0.2px | Semibold |
| heading-sm | 18px | 24px | 0 | Semibold |

**Body (Content, Paragraphs)**
| Style | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| body-lg | 18px | 28px | 0 | Regular |
| body-md | 16px | 24px | 0 | Regular |
| body-sm | 14px | 20px | 0 | Regular |

**Labels/Captions (Forms, UI Elements)**
| Style | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| label-lg | 14px | 20px | 0.1px | Medium |
| label-md | 12px | 16px | 0.2px | Medium |
| label-sm | 11px | 14px | 0.3px | Medium |
| caption | 12px | 16px | 0 | Regular |
| overline | 11px | 16px | 0.5px | Semibold |

### Typography Rules

- Use **sentence case** everywhere (headings, buttons, labels, navigation)
- **Minimum 14px** for body text (accessibility)
- **Minimum 12px** for labels/captions (never smaller)
- Use **Medium weight** for emphasis in body text (not Bold)
- Use **Semibold** for headings, **Bold** only for display
- **Tighter letter-spacing** for larger text, **looser** for small text
- Never use Light weight for body text (readability)

---

## Spacing

**Base unit:** 4px
**Starting value:** 8px

| Token | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Micro gaps |
| `space-2` | 8px | Tight gaps, icon padding, inline elements |
| `space-3` | 12px | Form field gaps, small component padding |
| `space-4` | 16px | Standard padding, card gaps, button padding |
| `space-5` | 20px | Medium gaps |
| `space-6` | 24px | Card padding, section gaps |
| `space-8` | 32px | Large component gaps |
| `space-10` | 40px | Large spacing |
| `space-12` | 48px | Section margins |
| `space-16` | 64px | Page sections |
| `space-20` | 80px | Hero spacing, major sections |
| `space-24` | 96px | Large section breaks |

**Scale:** `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

---

## Logo

**Primary Logo**
- Dark background: `https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/ACKO%20logo%20Primary%20Dark%20BG.svg`
- Light background: `https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/ACKO%20logo%20primary%20Light%20BG.svg`

**Horizontal Logo**
- Dark background: `https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/ACKO%20logo%20horizontal%20Dark%20bg.svg`
- Light background: `https://pub-c050457d48794d5bb9ffc2b4649de2c1.r2.dev/ACKO%20logo%20horizontal%20Light%20BG.svg`

### Clearspace
Minimum clear space = 1/2 logo height on all sides

### Minimum Size
- Preferred: 24px height
- Extreme cases: 16px height minimum

### Logo Restrictions
Never: rotate, apply effects, outline, slant/stretch, use multiple colors, use low resolution, modify proportions, place on busy backgrounds without sufficient contrast

---

## Layout Patterns

| Name | Description |
|------|-------------|
| Right Object Scene | Small label top-left, title top-left (2 lines), illustration/object right |
| Interface Scene | Label top-left, title bottom-left (2 lines), UI screenshot background |
| Text Only Scene | Title top-left, abstract scene fills background |
| Text Only Background | Large title centered, subtle texture/gradient background |
| Text Only Subtle | Small centered text (2 lines), minimal background |
| Big Number | Large display number centered, small label below |

**Common patterns:**
- Label/category always small, top-left or top-center
- Titles use 2-line breaks for rhythm
- Titles are never longer than 3 lines
- Objects positioned right, left, or as full background
- Use Crocus Purple as primary accent on light backgrounds

---

## Animations

### Easing Decision Guide

1. **Element entering or exiting?** → Use `ease-out`
2. **On-screen element moving?** → Use `ease-in-out`
3. **Hover/color transition?** → Use `ease`
4. **Users see this 100+ times daily?** → Don't animate

### Easing Curves

```css
:root {
  /* ease-out (most common) - for enter/exit */
  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);

  /* ease-in-out - for on-screen movement */
  --ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
  --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
}
```

### Duration Guidelines

| Element Type | Duration |
|--------------|----------|
| Micro-interactions | 100-150ms |
| Standard UI (tooltips, dropdowns) | 150-250ms |
| Modals, drawers | 200-300ms |
| Page transitions | 300-400ms |

**Rules:**
- UI animations should stay under 300ms
- Larger elements animate slower than smaller ones
- Exit animations can be faster than entrances
- Paired elements (modal + overlay) use same easing and duration

### Animation Performance

Only animate `transform` and `opacity` - these run on GPU.

**Avoid animating:** `padding`, `margin`, `height`, `width`, `blur` filters above 20px

```css
/* Force GPU acceleration */
.animated-element {
  will-change: transform;
}
```

### When to Animate

**Do animate:**
- Enter/exit transitions for spatial consistency
- State changes that benefit from visual continuity
- Responses to user actions (feedback)

**Don't animate:**
- Keyboard-initiated actions
- Anything users interact with 100+ times daily
- When speed matters more than smoothness

---

## UI Polish

### Font Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Prevent Layout Shift

- Never change font weight on hover or selected states
- Use `font-variant-numeric: tabular-nums` for dynamic numbers
- Use hardcoded dimensions for skeleton loaders and image placeholders

```css
.counter, .price, .timer {
  font-variant-numeric: tabular-nums;
}
```

### Text Wrapping

```css
h1, h2, h3 {
  text-wrap: balance;
}
```

### Hairline Borders

```css
:root {
  --border-hairline: 1px;
}

@media (min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  :root {
    --border-hairline: 0.5px;
  }
}
```

### Shadows for Borders

```css
/* Instead of border: 1px solid rgba(0, 0, 0, 0.08) */
box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
```

### Z-Index Scale

```css
:root {
  --z-dropdown: 100;
  --z-sticky: 150;
  --z-modal: 200;
  --z-tooltip: 300;
  --z-toast: 400;
}
```

### Decorative Elements

```css
.decorative-bg {
  pointer-events: none;
  user-select: none;
}
```

---

## Accessibility

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Tap Targets

Minimum tap target size is **44px**:

```css
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* For visually smaller buttons, expand hit area */
.small-icon-button {
  position: relative;
}

.small-icon-button::before {
  content: '';
  position: absolute;
  inset: -10px;
}
```

### Touch Devices

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    /* Hover styles only for mouse users */
  }
}

button, a, input {
  touch-action: manipulation;
}
```

### ARIA Labels

```html
<button aria-label="Close dialog">
  <CloseIcon />
</button>
```

### Keyboard Navigation

- Users should only tab through visible elements
- Focus should move to first interactive element when modals open
- Return focus to trigger element when modals close
- Ensure keyboard navigation scrolls elements into view

```css
.hidden-panel {
  visibility: hidden;
}
```

### Input Accessibility

- Minimum font size **16px** on inputs (prevents iOS zoom)
- Always associate labels with inputs
- Colocate error messages near the field that caused them

```html
<label for="email">Email</label>
<input id="email" type="email" aria-invalid="true" />
<span class="error-message">Please enter a valid email</span>
```

### Form Submission

```js
function handleKeyDown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    handleSubmit();
  }
}
```

### Focus States

All interactive elements must have visible focus states:

```css
:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--purple-200);
}

/* For dark backgrounds */
:focus {
  box-shadow: 0 0 0 3px var(--purple-400);
}
```

---

# COMPONENTS

---

## Buttons

Action triggers in the interface.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Primary | Main CTA, solid fill | Primary actions |
| Secondary | Less emphasis | Secondary actions |
| Outline | Border only | Tertiary actions |
| Ghost | No border/fill | Inline actions |
| Danger | Destructive action | Delete, remove |
| Success | Positive action | Confirm, approve |

### States

#### Primary Button

| State | Background | Text | Shadow |
|-------|------------|------|--------|
| Default | `purple-600` | `white` | None |
| Hover | `purple-700` | `white` | None |
| Active | `purple-800` | `white` | None |
| Focus | `purple-600` | `white` | 3px ring `purple-200` |
| Disabled | `purple-600` @ 50% | `white` | None |
| Loading | `purple-600` | Spinner | None |

#### Secondary Button

| State | Background | Text | Shadow |
|-------|------------|------|--------|
| Default | `onyx-200` | `onyx-700` | None |
| Hover | `onyx-300` | `onyx-800` | None |
| Active | `onyx-400` | `onyx-800` | None |
| Focus | `onyx-200` | `onyx-700` | 3px ring `purple-200` |
| Disabled | `onyx-200` @ 50% | `onyx-400` | None |

#### Outline Button

| State | Background | Border | Text |
|-------|------------|--------|------|
| Default | Transparent | `onyx-300` | `onyx-700` |
| Hover | `onyx-200` | `onyx-400` | `onyx-800` |
| Active | `onyx-300` | `onyx-400` | `onyx-800` |
| Focus | Transparent | `purple-400` | `onyx-700` |
| Disabled | Transparent | `onyx-200` | `onyx-400` |

#### Ghost Button

| State | Background | Text |
|-------|------------|------|
| Default | Transparent | `purple-600` |
| Hover | `purple-100` | `purple-700` |
| Active | `purple-200` | `purple-700` |
| Focus | Transparent + ring | `purple-600` |
| Disabled | Transparent | `purple-400` |

### Sizes

| Size | Height | Padding | Font Size | Icon Size | Border Radius |
|------|--------|---------|-----------|-----------|---------------|
| XS | 32px | 0 12px | 12px | 14px | 6px |
| SM | 40px | 0 16px | 13px | 16px | 8px |
| MD | 48px | 0 24px | 14px | 18px | 10px |
| LG | 56px | 0 32px | 16px | 20px | 12px |
| XL | 64px | 0 40px | 18px | 24px | 14px |

### Specifications

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  
  /* Size - Medium (default) */
  height: 48px;
  min-width: 48px;
  padding: 0 var(--space-6);
  
  /* Typography */
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  
  /* Shape */
  border-radius: 10px;
  border: none;
  
  /* Interaction */
  cursor: pointer;
  user-select: none;
  
  /* Animation */
  transition: background-color 150ms ease, 
              color 150ms ease,
              border-color 150ms ease,
              transform 100ms ease,
              box-shadow 150ms ease;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--purple-200);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:disabled:active {
  transform: none;
}

/* Hover only on pointer devices */
@media (hover: hover) and (pointer: fine) {
  .btn-primary:hover:not(:disabled) {
    background: var(--purple-700);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: var(--onyx-300);
  }
  
  .btn-outline:hover:not(:disabled) {
    background: var(--onyx-200);
    border-color: var(--onyx-400);
  }
  
  .btn-ghost:hover:not(:disabled) {
    background: var(--purple-100);
  }
  
  .btn-danger:hover:not(:disabled) {
    background: var(--cerise-700);
  }
  
  .btn-success:hover:not(:disabled) {
    background: var(--green-700);
  }
}

/* Primary */
.btn-primary {
  background: var(--purple-600);
  color: white;
}

/* Secondary */
.btn-secondary {
  background: var(--onyx-200);
  color: var(--onyx-700);
}

/* Outline */
.btn-outline {
  background: transparent;
  color: var(--onyx-700);
  box-shadow: inset 0 0 0 1px var(--onyx-300);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--purple-600);
}

/* Danger */
.btn-danger {
  background: var(--cerise-600);
  color: white;
}

/* Success */
.btn-success {
  background: var(--green-600);
  color: white;
}

/* Loading state */
.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Icon only */
.btn-icon {
  padding: 0;
  width: 48px;
}
```

### Accessibility

- Use `<button>` element (not `<div>` or `<a>`)
- Include descriptive text or `aria-label`
- Use `aria-disabled` instead of `disabled` for better announcements
- Use `aria-pressed` for toggle buttons
- Use `aria-busy="true"` for loading state

---

## Text Fields

Input components for text entry.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Default | Standard text input | General text entry |
| With Icon | Leading/trailing icon | Search, password |
| With Addon | Prefix/suffix text | Currency, URL |
| Textarea | Multi-line input | Comments, descriptions |
| Search | Styled for search | Search bars |
| Password | With visibility toggle | Password fields |

### States

| State | Border | Background | Label Color |
|-------|--------|------------|-------------|
| Default | `onyx-400` | `onyx-100` | `onyx-700` |
| Hover | `onyx-500` | `onyx-100` | `onyx-700` |
| Focus | `purple-600` + ring | `onyx-100` | `purple-600` |
| Filled | `onyx-400` | `onyx-100` | `onyx-700` |
| Disabled | `onyx-300` | `onyx-200` | `onyx-400` |
| Error | `cerise-600` | `cerise-100` | `cerise-700` |
| Success | `green-600` | `green-100` | `green-700` |
| Read-only | `onyx-300` | `onyx-200` | `onyx-600` |

### Sizes

| Size | Height | Padding | Font Size | Border Radius |
|------|--------|---------|-----------|---------------|
| Small | 40px | 0 12px | 14px | 8px |
| Medium | 48px | 0 16px | 16px | 10px |
| Large | 56px | 0 20px | 18px | 12px |

### Specifications

```css
.input-wrapper {
  position: relative;
  width: 100%;
}

.input-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 14px;
  font-weight: 500;
  color: var(--onyx-700);
}

.input-label.required::after {
  content: '*';
  color: var(--cerise-600);
  margin-left: 4px;
}

.input {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--onyx-400);
  border-radius: 10px;
  font-family: inherit;
  font-size: 16px;
  color: var(--onyx-800);
  background: var(--onyx-100);
  transition: border-color 150ms ease, 
              box-shadow 150ms ease,
              background-color 150ms ease;
}

.input::placeholder {
  color: var(--onyx-400);
}

.input:hover:not(:disabled):not(:focus) {
  border-color: var(--onyx-500);
}

.input:focus {
  outline: none;
  border-color: var(--purple-600);
  box-shadow: 0 0 0 3px var(--purple-200);
}

.input:disabled {
  background: var(--onyx-200);
  border-color: var(--onyx-300);
  color: var(--onyx-400);
  cursor: not-allowed;
}

.input.error {
  border-color: var(--cerise-600);
  background: var(--cerise-100);
}

.input.error:focus {
  box-shadow: 0 0 0 3px var(--cerise-200);
}

.input.success {
  border-color: var(--green-600);
  background: var(--green-100);
}

.input.success:focus {
  box-shadow: 0 0 0 3px var(--green-200);
}

/* With icon */
.input-with-icon {
  padding-left: 44px;
}

.input-icon {
  position: absolute;
  left: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--onyx-400);
  pointer-events: none;
}

/* Helper/Error text */
.input-helper {
  margin-top: var(--space-2);
  font-size: 12px;
  color: var(--onyx-500);
}

.input-error-text {
  margin-top: var(--space-2);
  font-size: 12px;
  color: var(--cerise-700);
}

/* Textarea */
.textarea {
  min-height: 120px;
  padding: var(--space-3) var(--space-4);
  resize: vertical;
  line-height: 1.5;
}
```

### Accessibility

- Always use `<label>` with `for` attribute
- Use `aria-describedby` for helper text
- Use `aria-invalid="true"` for errors
- Use `aria-required="true"` for required fields
- Support autocomplete attributes

---

## Dropdowns

Selection from a list of options.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Single Select | Select one option | Form fields |
| Multi Select | Select multiple | Filters, tags |
| Searchable | With type-ahead | Long lists |
| Grouped | Options in groups | Categorized data |
| With Icons | Options with icons | Rich selections |

### States

| State | Trigger Border | Trigger Background |
|-------|---------------|-------------------|
| Default | `onyx-400` | `onyx-100` |
| Hover | `onyx-500` | `onyx-100` |
| Open | `purple-600` + ring | `onyx-100` |
| Disabled | `onyx-300` | `onyx-200` |
| Error | `cerise-600` | `cerise-100` |

### Option States

| State | Background | Text |
|-------|------------|------|
| Default | `onyx-100` | `onyx-800` |
| Hover | `purple-100` | `onyx-800` |
| Selected | `purple-100` | `purple-700` |
| Focused | `purple-100` | `onyx-800` |
| Disabled | `onyx-100` | `onyx-400` |

### Specifications

```css
.dropdown-trigger {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-4);
  padding-right: 44px;
  border: 1px solid var(--onyx-400);
  border-radius: 10px;
  background: var(--onyx-100);
  font-family: inherit;
  font-size: 16px;
  color: var(--onyx-800);
  text-align: left;
  cursor: pointer;
  position: relative;
  transition: border-color 150ms ease, 
              box-shadow 150ms ease;
}

.dropdown-trigger:hover:not(:disabled) {
  border-color: var(--onyx-500);
}

.dropdown-trigger:focus,
.dropdown-trigger.open {
  outline: none;
  border-color: var(--purple-600);
  box-shadow: 0 0 0 3px var(--purple-200);
}

.dropdown-trigger:disabled {
  background: var(--onyx-200);
  border-color: var(--onyx-300);
  color: var(--onyx-400);
  cursor: not-allowed;
}

.dropdown-chevron {
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--onyx-500);
  transition: transform 200ms var(--ease-out-cubic);
  pointer-events: none;
}

.dropdown-trigger.open .dropdown-chevron {
  transform: translateY(-50%) rotate(180deg);
}

.dropdown-placeholder {
  color: var(--onyx-400);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: var(--onyx-100);
  border: 1px solid var(--onyx-300);
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  z-index: var(--z-dropdown);
  
  opacity: 0;
  transform: translateY(-8px);
  visibility: hidden;
  transition: opacity 150ms ease, 
              transform 150ms var(--ease-out-cubic),
              visibility 150ms ease;
}

.dropdown-menu.open {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.dropdown-option {
  padding: var(--space-3) var(--space-4);
  font-size: 14px;
  color: var(--onyx-800);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  transition: background-color 100ms ease;
}

.dropdown-option:hover,
.dropdown-option.focused {
  background: var(--purple-100);
}

.dropdown-option.selected {
  background: var(--purple-100);
  color: var(--purple-700);
  font-weight: 500;
}

.dropdown-option.disabled {
  color: var(--onyx-400);
  cursor: not-allowed;
}

.dropdown-check {
  width: 16px;
  height: 16px;
  margin-left: auto;
  color: var(--purple-600);
  opacity: 0;
}

.dropdown-option.selected .dropdown-check {
  opacity: 1;
}

.dropdown-group-header {
  padding: var(--space-2) var(--space-4);
  font-size: 11px;
  font-weight: 600;
  color: var(--onyx-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--onyx-200);
}
```

### Accessibility

- Use `role="listbox"` for menu
- Use `role="option"` for options
- Use `aria-expanded` on trigger
- Use `aria-selected` for selected options
- Arrow keys to navigate
- Enter/Space to select
- Escape to close
- Type-ahead for searchable

---

## Checkbox

Interactive selection control for multiple choices.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Default | Standard checkbox | Form selections |
| With Label | Checkbox with text label | Most common usage |
| With Description | Checkbox with label and helper text | Complex options |
| Indeterminate | Partially selected state | Parent of mixed children |

### States

| State | Border | Background | Checkmark |
|-------|--------|------------|-----------|
| Unchecked | `onyx-400` | `onyx-100` | None |
| Checked | `purple-600` | `purple-600` | White |
| Hover (unchecked) | `purple-400` | `purple-100` | None |
| Hover (checked) | `purple-700` | `purple-700` | White |
| Focus | `purple-600` + 3px ring `purple-200` | — | — |
| Disabled (unchecked) | `onyx-300` | `onyx-200` | None |
| Disabled (checked) | `onyx-400` | `onyx-400` | White |
| Error | `cerise-600` | `onyx-100` | None |
| Indeterminate | `purple-600` | `purple-600` | Minus icon |

### Sizes

| Size | Dimensions | Border Radius | Label Font |
|------|------------|---------------|------------|
| Small | 16px × 16px | 4px | body-sm (14px) |
| Medium | 20px × 20px | 6px | body-md (16px) |
| Large | 24px × 24px | 6px | body-lg (18px) |

### Specifications

```css
.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border-width: 2px;
  border-style: solid;
  border-color: var(--onyx-400);
  background: var(--onyx-100);
  appearance: none;
  cursor: pointer;
  position: relative;
  transition: background-color 150ms ease, 
              border-color 150ms ease,
              box-shadow 150ms ease;
}

.checkbox:hover:not(:disabled) {
  border-color: var(--purple-400);
  background: var(--purple-100);
}

.checkbox:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--purple-200);
}

.checkbox:checked {
  background: var(--purple-600);
  border-color: var(--purple-600);
}

.checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.checkbox:disabled {
  background: var(--onyx-200);
  border-color: var(--onyx-300);
  cursor: not-allowed;
}

.checkbox:disabled:checked {
  background: var(--onyx-400);
  border-color: var(--onyx-400);
}

.checkbox.error {
  border-color: var(--cerise-600);
}
```

### Accessibility

- Always associate with `<label>` using `for` attribute
- Use `aria-checked` for custom implementations
- Support keyboard: Space to toggle
- Use `aria-describedby` for helper text
- Use `aria-invalid="true"` for error state

---

## Radio Button

Selection control for mutually exclusive options.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Default | Standard radio button | Single selection from list |
| With Label | Radio with text label | Most common usage |
| With Description | Radio with label and helper | Complex options |
| Card Radio | Radio as selectable card | Visual selection (plans, options) |

### States

| State | Border | Background | Dot |
|-------|--------|------------|-----|
| Unselected | `onyx-400` | `onyx-100` | None |
| Selected | `purple-600` | `onyx-100` | `purple-600` (10px) |
| Hover (unselected) | `purple-400` | `purple-100` | None |
| Hover (selected) | `purple-700` | `purple-100` | `purple-700` |
| Focus | `purple-600` + 3px ring `purple-200` | — | — |
| Disabled (unselected) | `onyx-300` | `onyx-200` | None |
| Disabled (selected) | `onyx-400` | `onyx-200` | `onyx-400` |
| Error | `cerise-600` | `onyx-100` | None |

### Sizes

| Size | Dimensions | Dot Size | Label Font |
|------|------------|----------|------------|
| Small | 16px × 16px | 8px | body-sm (14px) |
| Medium | 20px × 20px | 10px | body-md (16px) |
| Large | 24px × 24px | 12px | body-lg (18px) |

### Specifications

```css
.radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--onyx-400);
  background: var(--onyx-100);
  appearance: none;
  cursor: pointer;
  position: relative;
  transition: background-color 150ms ease, 
              border-color 150ms ease,
              box-shadow 150ms ease;
}

.radio:hover:not(:disabled) {
  border-color: var(--purple-400);
  background: var(--purple-100);
}

.radio:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--purple-200);
}

.radio:checked {
  border-color: var(--purple-600);
}

.radio:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--purple-600);
}

.radio:disabled {
  background: var(--onyx-200);
  border-color: var(--onyx-300);
  cursor: not-allowed;
}

/* Card Radio */
.radio-card {
  padding: var(--space-4) var(--space-5);
  border: 2px solid var(--onyx-300);
  border-radius: 12px;
  background: var(--onyx-100);
  cursor: pointer;
  transition: border-color 150ms ease, 
              background-color 150ms ease;
}

.radio-card:hover {
  border-color: var(--purple-400);
  background: var(--purple-100);
}

.radio-card.selected {
  border-color: var(--purple-600);
  background: var(--purple-100);
}

.radio-card:focus-within {
  box-shadow: 0 0 0 3px var(--purple-200);
}
```

### Accessibility

- Group related radios with `role="radiogroup"`
- Use `aria-labelledby` for group label
- Arrow keys to navigate within group
- Space/Enter to select

---

## Calendar

Date selection component.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Single Date | Select one date | Appointment booking |
| Date Range | Select start and end | Trip dates, reports |
| Multi-Date | Select multiple dates | Availability |
| Month Picker | Select month/year | Reports, filters |
| Inline | Always visible | Booking flows |
| Dropdown | Opens on click | Form fields |

### Day Cell States

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | `onyx-100` | `onyx-800` | None |
| Hover | `purple-100` | `onyx-800` | None |
| Today | `onyx-100` | `purple-600` (bold) | None |
| Selected | `purple-600` | `white` | None |
| Range Start/End | `purple-600` | `white` | None |
| Range Middle | `purple-100` | `purple-700` | None |
| Disabled/Past | `onyx-100` | `onyx-400` | None |
| Outside Month | `onyx-100` | `onyx-300` | None |
| Focus | `purple-100` | — | 2px `purple-600` |

### Specifications

```css
.calendar {
  width: 320px;
  background: var(--onyx-100);
  border-radius: 12px;
  border: 1px solid var(--onyx-300);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: var(--onyx-200);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--onyx-300);
}

.calendar-day-header {
  padding: var(--space-2);
  text-align: center;
  background: var(--onyx-200);
  font-size: 12px;
  font-weight: 500;
  color: var(--onyx-500);
}

.calendar-day {
  aspect-ratio: 1;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--onyx-100);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.calendar-day:hover {
  background: var(--purple-100);
}

.calendar-day.selected {
  background: var(--purple-600);
  color: white;
  font-weight: 600;
}

.calendar-day.today {
  font-weight: 600;
  color: var(--purple-600);
}

.calendar-day.disabled {
  color: var(--onyx-400);
  cursor: not-allowed;
}

.calendar-day.range-start {
  background: var(--purple-600);
  color: white;
  border-radius: 50% 0 0 50%;
}

.calendar-day.range-end {
  background: var(--purple-600);
  color: white;
  border-radius: 0 50% 50% 0;
}

.calendar-day.in-range {
  background: var(--purple-100);
  color: var(--purple-700);
}

.calendar-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--onyx-600);
  transition: background-color 150ms ease;
}

.calendar-nav-btn:hover {
  background: var(--onyx-300);
}

.calendar-nav-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--purple-200);
}
```

### Accessibility

- Use `role="grid"` for calendar grid
- Arrow keys for day navigation
- Page Up/Down for month navigation
- Home/End for first/last day of week
- Announce selected date to screen readers

---

## Badges

Status indicators and labels.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Solid | Filled background | Status, categories |
| Outline | Border only | Secondary labels |
| Dot | With status indicator | Live status |
| Counter | Numeric value | Notifications |
| Removable | With close button | Tags, filters |

### Color Options

| Color | Background | Text | Dot | Use Case |
|-------|------------|------|-----|----------|
| Purple | `purple-200` | `purple-700` | `purple-500` | Default, brand |
| Green | `green-200` | `green-700` | `green-500` | Success, active |
| Blue | `blue-200` | `blue-700` | `blue-500` | Info, processing |
| Orange | `orange-200` | `orange-700` | `orange-500` | Warning, pending |
| Pink | `cerise-200` | `cerise-700` | `cerise-500` | Error, expired |
| Gray | `onyx-200` | `onyx-600` | `onyx-400` | Neutral, inactive |

### Sizes

| Size | Padding | Font Size | Height |
|------|---------|-----------|--------|
| Small | 2px 8px | 11px | 18px |
| Medium | 4px 10px | 12px | 22px |
| Large | 6px 12px | 14px | 28px |

### Specifications

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

.badge-sm {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
}

.badge-lg {
  padding: 6px 12px;
  font-size: 14px;
  border-radius: 8px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.badge-dot.animated {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.badge-outline {
  background: transparent;
  box-shadow: inset 0 0 0 1px currentColor;
}

.badge-counter {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* Color variants */
.badge-purple {
  background: var(--purple-200);
  color: var(--purple-700);
}

.badge-green {
  background: var(--green-200);
  color: var(--green-700);
}

.badge-blue {
  background: var(--blue-200);
  color: var(--blue-700);
}

.badge-orange {
  background: var(--orange-200);
  color: var(--orange-700);
}

.badge-pink {
  background: var(--cerise-200);
  color: var(--cerise-700);
}

.badge-gray {
  background: var(--onyx-200);
  color: var(--onyx-600);
}
```

---

## Navigation Wizard

Step-by-step progress indicator.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Horizontal | Steps in a row | Desktop flows |
| Vertical | Steps in a column | Mobile, sidebars |
| Compact | Numbers only | Space-constrained |
| With Connector | Connected line | Visual continuity |

### Step States

| State | Circle BG | Circle Text | Label Color | Connector |
|-------|-----------|-------------|-------------|-----------|
| Upcoming | `onyx-300` | `onyx-500` | `onyx-500` | `onyx-300` |
| Current | `purple-600` | `white` | `onyx-800` | `onyx-300` |
| Completed | `green-500` | `white` (check) | `onyx-800` | `green-500` |
| Error | `cerise-500` | `white` (!) | `cerise-700` | `onyx-300` |
| Disabled | `onyx-200` | `onyx-400` | `onyx-400` | `onyx-200` |

### Specifications

```css
.wizard {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.wizard-vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  position: relative;
}

.wizard-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  transition: background-color 200ms ease, 
              color 200ms ease,
              transform 150ms ease;
}

.wizard-step.upcoming .wizard-circle {
  background: var(--onyx-300);
  color: var(--onyx-500);
}

.wizard-step.current .wizard-circle {
  background: var(--purple-600);
  color: white;
  box-shadow: 0 0 0 4px var(--purple-200);
}

.wizard-step.completed .wizard-circle {
  background: var(--green-500);
  color: white;
}

.wizard-step.error .wizard-circle {
  background: var(--cerise-500);
  color: white;
}

.wizard-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--onyx-500);
}

.wizard-step.current .wizard-label,
.wizard-step.completed .wizard-label {
  color: var(--onyx-800);
}

.wizard-step.error .wizard-label {
  color: var(--cerise-700);
}

.wizard-connector {
  width: 60px;
  height: 2px;
  background: var(--onyx-300);
  margin: 0 var(--space-2);
  align-self: center;
}

.wizard-connector.completed {
  background: var(--green-500);
}
```

### Accessibility

- Use `aria-current="step"` for current step
- Use `aria-label` for step description
- Steps should be focusable if clickable
- Announce step changes to screen readers
- Use `role="navigation"` or `<nav>`

---

## Pagination

Navigation through paginated content.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| Simple | Prev/Next only | Mobile, minimal |
| Numbered | Page numbers | Data tables |
| Compact | Current/Total | Space-constrained |
| Load More | Single button | Infinite scroll |
| With Jump | Go to page input | Large datasets |

### States

#### Page Number Button

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | Transparent | `onyx-700` | None |
| Hover | `purple-100` | `onyx-800` | None |
| Active/Current | `purple-600` | `white` | None |
| Focus | Transparent | `onyx-700` | Ring |
| Disabled | Transparent | `onyx-400` | None |

#### Prev/Next Buttons

| State | Background | Icon/Text |
|-------|------------|-----------|
| Default | `onyx-200` | `onyx-700` |
| Hover | `onyx-300` | `onyx-800` |
| Active | `onyx-400` | `onyx-800` |
| Disabled | `onyx-200` @ 50% | `onyx-400` |

### Specifications

```css
.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pagination-btn {
  height: 40px;
  min-width: 40px;
  padding: 0 var(--space-3);
  border: none;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--onyx-700);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: background-color 150ms ease, 
              color 150ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .pagination-btn:hover:not(:disabled) {
    background: var(--purple-100);
  }
}

.pagination-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--purple-200);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn.current {
  background: var(--purple-600);
  color: white;
}

.pagination-nav {
  background: var(--onyx-200);
  color: var(--onyx-700);
}

@media (hover: hover) and (pointer: fine) {
  .pagination-nav:hover:not(:disabled) {
    background: var(--onyx-300);
  }
}

.pagination-ellipsis {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--onyx-400);
  font-size: 14px;
}

.pagination-info {
  font-size: 14px;
  color: var(--onyx-500);
  margin: 0 var(--space-4);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .pagination-info {
    width: 100%;
    text-align: center;
    order: -1;
    margin-bottom: var(--space-3);
  }
}
```

### Accessibility

- Use `<nav>` with `aria-label="Pagination"`
- Use `aria-current="page"` for current page
- Use `aria-disabled` for disabled buttons
- Announce page changes to screen readers
- Support keyboard navigation
