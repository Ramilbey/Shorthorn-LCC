# Shorthorn Cargo — landing page

React + Vite + Tailwind, with a scroll-scrubbed video hero and a WebGL tracking map.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer. Check with `node -v`.

**1. Install dependencies** (once, from this folder):

```bash
npm install
```

**2. Start the dev server:**

```bash
npm run dev
```

Open the URL it prints — usually <http://localhost:5173>. Edits reload instantly.

**3. Build for production:**

```bash
npm run build
```

Output lands in `dist/`. Preview that build locally with:

```bash
npm run preview
```

`dist/` is a plain static folder — drop it on Netlify, Vercel, Cloudflare Pages,
S3, or any web host. No server-side code.

### Handy URLs

| URL | |
|---|---|
| `/` | the site |
| `/?rig` | dev-only 3D model viewer — orbit the truck on its own |

## Layout

| Path | |
|---|---|
| `src/App.jsx` | Loading terminal, scroll hero, page sections, Night Express map |
| `src/Truck.jsx` | The 3D tractor-trailer — extruded bodywork, lathe-turned tyres, turning wheels |
| `src/Monogram.jsx` | The "S" mark, as vector — inherits `currentColor` |
| `src/Inspect.jsx` | The `/?rig` viewer |
| `public/media/` | Hero clip, re-encoded for scrubbing |
| `tools/` | One-off scripts that produced `src/assets/truck.png` |

## The hero

A tall runway with a pinned frame; scroll position drives `video.currentTime`.
The overlay is a fixed composition rather than a sequence — headline top-left,
a frosted `GlassPanel` in each bottom corner, and the glass Contact CTA centred
between them. All of it holds for the whole runway and releases in the last 7%.

The header is transparent over the hero and picks up its frosted backing and
hairline rule once the runway finishes (`settled` in `App`).

**To change the scrub speed**, edit one number — the runway height in
`ScrollHero`:

```jsx
<section id="top" ref={runway} className="relative h-[620vh]">
```

Taller = slower. 620vh spreads the 10-second clip over about six screens of
scrolling.

**If you swap the clip**, it *must* be encoded all-intra or seeking will stutter
between keyframes:

```bash
ffmpeg -i source.mp4 -an -vf scale=1280:720 -c:v libx264 -pix_fmt yuv420p \
  -g 1 -bf 0 -crf 25 -preset slow -movflags +faststart public/media/hero-1280.mp4
```

`-g 1 -bf 0` is the part that matters. Phones load the 854-wide cut.

## Night Express

Real WebGL. The lower 48 is a dot matrix rasterised from the outline in `USA`,
projected with an Albers conic. `ROUTE` drives both the drawn lane and the
telemetry panel — edit it to change the run.

## Before launch

- `COMPANY.safetyRating` is `"Not Rated"`, which is what FMCSA reports for a
  carrier that has not had a compliance review. Confirm on SAFER and update.
- The hero footage and the `truck.png` studio render are supplied assets. The
  render carries visible Kenworth badging — worth checking the licence covers
  commercial use before this goes public.
