# Design to JSON — Figma Plugin

A Figma plugin that extracts complete design data from a selected frame into a structured, readable JSON format. Useful for design handoff, documentation, design system audits, and feeding design tokens into code.

---

## Features

- **One-click extraction** — select a frame, click Extract JSON
- **Full recursive tree** — captures every nested layer, group, component, and instance
- **Search & filter** — search across keys/values; filter by fills, text, auto layout, effects, prototype, components, or corners
- **Syntax-highlighted viewer** — color-coded JSON rendered in the plugin panel
- **Expand / Collapse** — toggle between pretty-printed and compact JSON
- **Copy to clipboard** — copy the full or filtered JSON in one click
- **Download as file** — saves `<frame-name>.json` directly to your machine

---

## What Gets Extracted

| Category | Data |
|---|---|
| **Layer** | id, name, type, visible, locked, opacity, blend mode, mask |
| **Size & Position** | x, y, width, height, rotation, relativeTransform, constraints |
| **Fills** | SOLID (hex + rgba + opacity + visible flag), linear/radial/angular gradients (stops with hex + rgba), image fills — linked style name included |
| **Strokes** | color, weight, alignment, dash pattern, cap, join, per-side weights — linked style name included |
| **Effects** | Drop shadow, inner shadow (hex + rgba), layer blur, background blur — linked style name included |
| **Corners** | Uniform or per-corner radius, corner smoothing |
| **Auto Layout** | Direction, primary/counter axis sizing & alignment, padding (top/bottom/left/right), item spacing, counter axis spacing, wrap, layout positioning |
| **Layout Child** | align, grow, positioning, min/max width/height per child layer |
| **Text** | Font family, style, weight (numeric), size, letter spacing, line height, text case, decoration, alignment, truncation, paragraph spacing, linked text style name — full styled segment breakdown (with per-segment fontWeight + textStyleName) |
| **Prototype** | Triggers (click, hover, key, etc.), actions (navigate, open overlay, URL), transition type, duration, easing, direction |
| **Components** | Main component id & name, component set id & name, componentProperties (variant/boolean/text/swap), overrides list, baseStyles (inherited master styles for non-overridden fields) |
| **Layout Grids** | Pattern, color, alignment, gutter, count, section size, offset — linked style name included |
| **Export Settings** | Format (PNG/SVG/PDF), suffix, scale constraint |
| **Children** | Fully recursive — all nested layers at every depth |

---

## File Structure

```
design to json/
├── manifest.json   # Plugin manifest (Figma API 1.0.0)
├── code.js         # Plugin logic — runs in Figma's sandbox
├── ui.html         # Plugin UI — viewer, search, filters, copy, download
└── README.md
```

---

## Installation

1. Open the **Figma desktop app**
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select `manifest.json` from this folder
4. The plugin will appear under **Plugins → Development**

---

## Usage

1. Select a **Frame** (or Component / Component Set) on the canvas
2. Run **Design to JSON** from Plugins → Development
3. Click **Extract JSON**
4. Use the filter tabs or search bar to navigate the output
5. Click **Copy JSON** or **Download** to export

---

## Output Example (condensed)

```json
{
  "id": "1:23",
  "name": "Card / Default",
  "type": "FRAME",
  "width": 360,
  "height": 200,
  "fills": [{ "type": "SOLID", "hex": "#ffffff" }],
  "autoLayout": {
    "layoutMode": "VERTICAL",
    "paddingTop": 16,
    "paddingBottom": 16,
    "paddingLeft": 16,
    "paddingRight": 16,
    "itemSpacing": 12
  },
  "children": [
    {
      "name": "Title",
      "type": "TEXT",
      "text": {
        "characters": "Hello World",
        "fontFamily": "Inter",
        "fontSize": 18,
        "lineHeight": { "value": 24, "unit": "PIXELS" }
      }
    }
  ]
}
```

---

## Tech

- Figma Plugin API 1.0.0
- Vanilla JS — written in ES5-compatible syntax to match Figma's sandbox constraints (no `??`, `?.`, or arrow functions in callbacks)
- No build step required
- Zero external dependencies

---

## Known Constraints

Figma's plugin sandbox runs a restricted JavaScript environment. The plugin avoids:
- `??` nullish coalescing operator
- `?.` optional chaining
- Default function parameters
- Arrow functions inside `.map()` / `.filter()` callbacks

All null/undefined checks are handled with explicit guards for full sandbox compatibility.
