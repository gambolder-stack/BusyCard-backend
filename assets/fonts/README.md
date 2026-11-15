# Bundled fonts (SIL OFL 1.1)

The server loads these 8 files from disk at runtime - no network access, no system fonts.

| Family           | Regular (400)                 | Bold (700)                 |
|------------------|-------------------------------|----------------------------|
| Inter            | Inter-Regular.ttf             | Inter-Bold.ttf             |
| Playfair Display | PlayfairDisplay-Regular.ttf   | PlayfairDisplay-Bold.ttf   |
| JetBrains Mono   | JetBrainsMono-Regular.ttf     | JetBrainsMono-Bold.ttf     |
| Space Grotesk    | SpaceGrotesk-Regular.ttf      | SpaceGrotesk-Bold.ttf      |

## Getting them in place

1. **Automatic:** `npm install --include=dev && npm run fonts` copies static TTFs out of the
   `@expo-google-fonts/*` devDependencies. Then **commit `assets/fonts/*.ttf`**.
2. **Manual:** download the families from https://fonts.google.com, export/choose the *static*
   Regular and Bold instances (not the variable `[wght]` files - `pdf-lib` embeds static TTFs far
   more reliably) and rename them to the file names above.

All four families are licensed under the SIL Open Font License 1.1, which permits bundling.
