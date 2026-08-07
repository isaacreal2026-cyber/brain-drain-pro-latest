# Performance Audit & Results

Measured on the production build (`pnpm build`) served with Brotli/gzip
compression and immutable caching for hashed assets.

## What was wrong

1. **~170 KB of unused JavaScript was preloaded on first paint.** The
   `vite.config.ts` `manualChunks` forced route-only libraries
   (`recharts`, `d3`, `framer-motion`) into shared vendor chunks, and Vite
   emitted `<link rel="modulepreload">` for all of them — even though they
   are only used by lazy-loaded routes.
2. **Dead code pulled in 389 KB.** `ui/chart.tsx` (an unused shadcn
   starter primitive) did `import * as recharts`, dragging the entire
   charts library into the main bundle.
3. **`framer-motion` (130 KB) was eagerly imported by `AppShell`** — the
   always-loaded layout used it for a 3-pixel progress bar, a sidebar width
   transition, and the mobile drawer.
4. **`HomeFeed` was the only eagerly imported route**, which kept its lazy
   deps (`d3`/NeuralGraph) closer to the critical path.
5. **Render-blocking Google Fonts** — a CSS `@import` plus a blocking
   stylesheet `<link>` delayed first contentful paint.

## Fixes applied

- Deleted the unused `ui/chart.tsx` (removed 389 KB of `recharts`).
- Removed `manualChunks` grouping for `d3`, `recharts`, and
  `framer-motion`. They now stay inside their lazy route chunks. Kept
  `react-vendor` and `radix` as shared chunks (used by the app shell).
- Made **all routes lazy** (including `HomeFeed`) so no route's heavy
  dependencies are part of the initial graph.
- Replaced `framer-motion` usage in `AppShell`:
  - Sidebar width → CSS `transition-[width]`.
  - Top progress bar → a 30-line CSS-keyframe component
    (`ui/connection-loader.tsx`) with `prefers-reduced-motion`.
  - Mobile drawer → extracted into `layout/MobileNavDrawer.tsx`,
    code-split so `framer-motion` only downloads when a mobile user opens it.
- Removed the render-blocking CSS `@import` for Inter and made the font
  stylesheet non-blocking (`media="print" onload="this.media='all'"`) with a
  `<noscript>` fallback; system font applies until Inter loads.

## Results (first paint, gzip)

| Asset | Before (est.) | After |
|---|---:|---:|
| JavaScript (initial) | ~313 KB | **143 KB** |
| CSS | 23.5 KB | **23.5 KB** |
| **Total first paint** | **~336 KB** | **167 KB** |

**First-paint JS dropped ~54%.** Recharts (103 KB gz), d3 (25 KB gz), and
framer-motion (42 KB gz) are no longer downloaded until the user visits the
screen that needs them. Firebase (210 KB gz) loads only on sign-in.

### Estimated download time (167 KB first paint)

| Network | Time |
|---|---:|
| Broadband | ~0.14 s |
| 4G | ~0.9 s |
| Fast 3G | ~9.1 s |
| Slow 3G | ~34 s |

### What loads lazily (not on first paint)

- `firebase/*` — 210 KB gz, only when signing in
- `charts` (recharts) — 103 KB gz, only on the Profile timeline
- `d3` — bundled with the HomeFeed NeuralGraph (loaded after Home Feed mounts)
- `framer-motion` — bundled with MobileNavDrawer / RuntimeEngine / BrainCard,
  loaded on interaction

## Ongoing recommendations

- **CSS is 159 KB raw / 24 KB gz.** Tailwind v4 tree-shakes unused
  utilities; the bulk is design tokens + elevation utilities. Acceptable,
  but can be reduced by removing the custom elevation/shadow system if unused.
- **Add Brotli at the host/CDN** (the static `serve` test used gzip; Brotli
  is typically 15–20% smaller).
- **Preload the Inter font's latin `woff2`** with
  `<link rel="preload" as="font" crossorigin>` once the exact file URL is
  known, to avoid the two-hop CSS→font request chain.
- **Budget check in CI**: fail the build if initial JS exceeds 180 KB gzip.
- For Slow 3G targets, consider an inline critical-CSS/skeleton shell so
  something paints while the 143 KB JS downloads.
