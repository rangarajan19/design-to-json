# Design to JSON — Figma Plugin

**Version:** 1.0.3 — 2026-03-26

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
| **Layer** | id, name, type, visible, locked, opacity, blendMode, isMask, maskType |
| **Size & Position** | x/y (relative to parent), absolutePosition (relative to page), width, height, rotation, relativeTransform, constraints |
| **Fills** | SOLID (hex + rgba + opacity + visible), gradients (stops with hex + rgba), image fills — styleId + resolved name |
| **Strokes** | color, weight, per-side weights, align, cap, join, dashes, miterLimit — styleId + resolved name |
| **Effects** | Drop/inner shadow (hex + rgba, offset, spread, blendMode), layer/background blur, glass — styleId + resolved name |
| **Corners** | Uniform or per-corner radius, corner smoothing |
| **Auto Layout** | Direction, primary/counter axis sizing & alignment, padding (all sides), item spacing, wrap, layout positioning |
| **Layout Child** | align, grow, positioning, min/max width/height per child |
| **Text** | Family, style, weight (numeric), size, spacing, line height, case, decoration, alignment, truncation, paragraph spacing, styleId + resolved name — full mixed-style segment breakdown |
| **Prototype** | Triggers, actions, transition type/duration/easing, destination |
| **Components** | mainComponentId/Name, componentSetId/Name, componentProperties, overrides, baseStyles, resolvedStyles (merged master + instance) |
| **Layout Grids** | Pattern, hex + rgba color, alignment, gutter, count, section size, offset — styleId + resolved name |
| **Vector Nodes** | vectorPaths array (SVG path data + windingRule per path) |
| **Boolean Nodes** | booleanOperation (UNION / INTERSECT / SUBTRACT / EXCLUDE) |
| **Metadata per node** | pluginData, documentationLinks, exportSettings |
| **Styles (top-level)** | Resolved dictionary of all styles referenced in the frame — full paint/text/effect/grid properties per entry |
| **Variables (top-level)** | All variable collections with modes, per-variable resolvedType, scopes, valuesByMode |
| **Export Metadata** | figmaFileKey, figmaFileName, exportedAt, exportedBy, pageId/Name, totalNodeCount, deepestNestingLevel |
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
