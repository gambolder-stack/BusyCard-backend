# Business Card Generator - Backend & Print Engine

Node.js + TypeScript + Express. No headless browser: PDFs come from `pdf-lib` (+ `@pdf-lib/fontkit`),
PNGs from `@resvg/resvg-js`, QR codes from `qrcode`, share links from `lz-string`.
Peak memory for an export is a few MB on top of the ~80-120 MB Node baseline, far inside Render's 512 MB.

## How it works

`CardConfig` → layout engine → a renderer-agnostic **Scene** (rects, circles, lines, paths, text in points,
bleed included) → either `renderPdf` (vector, embedded fonts) or `sceneToSvg` → resvg → 300 DPI PNG.
Text is converted to glyph outlines for the PNG, so PDF and PNG are geometrically identical and resvg needs no fonts.

```
business-card-backend/
├── package.json  tsconfig.json  render.yaml  .env.example  .gitignore  README.md
├── assets/fonts/            # 8 static TTFs (Inter, Playfair Display, JetBrains Mono, Space Grotesk × Regular/Bold)
│   └── README.md
├── docs/API_CONTRACT.md     # hand this to the frontend developer
├── examples/card-config.example.json
├── scripts/
│   ├── copy-fonts.mjs       # copies TTFs from @expo-google-fonts/* devDependencies into assets/fonts
│   └── smoke.ts             # renders every layout/standard/orientation into ./out and prints RSS
└── src/
    ├── index.ts  app.ts  config.ts  schema.ts  errors.ts
    ├── middleware/rateLimit.ts
    ├── routes/        export.ts  qr.ts  share.ts
    ├── services/      qr.ts  share.ts
    └── engine/
        ├── geometry.ts  scene.ts  color.ts  prng.ts  fonts.ts  text.ts
        ├── patterns.ts  qrDraw.ts  buildScenes.ts
        ├── svg.ts  renderPng.ts  renderPdf.ts
        └── layout/    common.ts  front.ts  back.ts
```

## Local development

```bash
npm install            # installs devDependencies too (fonts + tsc)
npm run fonts          # copies the 8 TTFs into assets/fonts  -> commit them
npm run dev            # http://localhost:3000  (CORS allows http://localhost:5173)
npm run smoke          # writes sample PDFs/PNGs to ./out and prints memory use
```

## Deploy to Render (free)

1. Commit `assets/fonts/*.ttf` (so runtime never needs the network).
2. New Web Service → this repo, or use `render.yaml`. Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Health check path: `/health`.
3. Env vars: `NODE_ENV=production`, `FRONTEND_URL=https://your-app.vercel.app` (comma-separate extra origins, no trailing slash), `NODE_OPTIONS=--max-old-space-size=384`.
4. In the Vercel app, `fetch(`${API}/health`)` on first render to wake the container (cold start is typically 30-60s).

## Behaviour worth knowing

- **Safe zone:** every text/QR/border element is placed inside the 0.125" safe zone; overflow shrinks content, then drops trailing contact lines.
- **Colour:** the PDF is RGB. Printers convert to CMYK; the QR plate and text keep contrast so it survives conversion.
- **Glyph coverage:** characters missing from a font render as that font's fallback glyph (CJK is not supported by the four bundled families).
- **vCard QR density:** ECC level H is mandated for `/api/qr` and used for print too. A long vCard makes a dense QR; keep fields short, and prefer `qrType: "url"` for tiny print sizes.
- **Rate limits** (per IP): exports 20 / 10 min, other API routes 300 / 15 min. Tune with `EXPORT_RATE_*` / `API_RATE_MAX`.
