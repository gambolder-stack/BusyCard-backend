// Copies static TTFs (Regular 400 + Bold 700) of the four bundled families from the
// @expo-google-fonts/* devDependencies into ./assets/fonts with stable file names.
// All four families are SIL Open Font License 1.1.
//
// Run once (`npm run fonts`) and COMMIT assets/fonts/*.ttf. If the files already
// exist this script is a no-op, so builds never depend on the network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'fonts');

const TARGETS = [
  ['inter', 'Inter_400Regular.ttf', 'Inter-Regular.ttf'],
  ['inter', 'Inter_700Bold.ttf', 'Inter-Bold.ttf'],
  ['playfair-display', 'PlayfairDisplay_400Regular.ttf', 'PlayfairDisplay-Regular.ttf'],
  ['playfair-display', 'PlayfairDisplay_700Bold.ttf', 'PlayfairDisplay-Bold.ttf'],
  ['jetbrains-mono', 'JetBrainsMono_400Regular.ttf', 'JetBrainsMono-Regular.ttf'],
  ['jetbrains-mono', 'JetBrainsMono_700Bold.ttf', 'JetBrainsMono-Bold.ttf'],
  ['space-grotesk', 'SpaceGrotesk_400Regular.ttf', 'SpaceGrotesk-Regular.ttf'],
  ['space-grotesk', 'SpaceGrotesk_700Bold.ttf', 'SpaceGrotesk-Bold.ttf'],
];

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFile(full, name);
      if (hit) return hit;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

fs.mkdirSync(outDir, { recursive: true });
const missing = [];

for (const [pkg, srcName, destName] of TARGETS) {
  const dest = path.join(outDir, destName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) continue;
  const src = findFile(path.join(root, 'node_modules', '@expo-google-fonts', pkg), srcName);
  if (!src) {
    missing.push(destName);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`[fonts] ${destName}`);
}

if (missing.length) {
  console.error(
    `\n[fonts] Missing: ${missing.join(', ')}\n` +
      'Install devDependencies (npm install --include=dev) or drop the static TTFs into assets/fonts manually.\n' +
      'See assets/fonts/README.md for download links.'
  );
  process.exit(1);
}
console.log('[fonts] all 8 font files present in assets/fonts');
