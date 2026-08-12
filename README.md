# Shorthorn Cargo

USDOT 3856749 · MC 1407566

Two things live here:

| | |
|---|---|
| **`landing/`** | The current site — React + Vite, scroll-scrubbed video hero, 3D tracking map. **This is the one you want.** |
| `index.html` | The earlier single-file static page. Kept for reference; open it directly in a browser. |

## Run the site

```bash
cd landing
npm install
npm run dev
```

Then open the URL it prints, usually <http://localhost:5173>.

To build a deployable copy:

```bash
cd landing
npm run build
```

That writes a static `landing/dist/` folder you can host anywhere.

Full details — scrub speed, swapping the hero clip, the tracking map, the
pre-launch checklist — are in [`landing/README.md`](landing/README.md).

## Source assets

`shorthorn_Logo.jpg`, `truck.webp` and `video/` are the originals. The scripts in
`landing/tools/` derive the processed versions from them; `landing/public/media/`
holds the re-encoded hero clip.
