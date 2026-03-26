# Design to JSON — Plugin Rules

## Versioning
- After completing a meaningful set of changes, run: `bash build.sh`
- Do NOT run build.sh for every minor edit — only when a logical feature/fix is done
- build.sh bumps the patch version in manifest.json and updates README.md automatically

## Figma Sandbox Constraints (strictly enforced)
The plugin runs in Figma's restricted JS sandbox. Never use:
- `??` nullish coalescing — use `def(val, fallback)` helper instead
- `?.` optional chaining — use explicit `&&` guards
- Default function parameters — use `if (x === undefined) x = default`
- Arrow functions inside `.map()` / `.filter()` / `.forEach()` callbacks
- `let` or `const` — use `var` only
- Template literals in performance-critical paths

## Code Conventions
- Use the `def(val, fallback)` helper for all null/undefined checks
- All color data: include both `hex` and `rgba` — use `rgbaToHex()` and `toRgba()` helpers
- All paint objects: include `visible` flag (never silently drop invisible fills)
- Style names: always resolve via `resolveStyleName(styleId)` and include as `*StyleName`
- Mixed text values: output the string `"MIXED"` (not null) for `figma.mixed` properties

## File Roles
- `code.js` — all plugin logic, runs in Figma's sandbox
- `ui.html` — plugin panel UI (search, filter, viewer, copy, download)
- `manifest.json` — plugin config + current version
- `build.sh` — version bump + README update script

## What's Already Extracted
Everything in the README table is implemented. Before adding extraction for a property,
grep code.js to confirm it isn't already captured.
