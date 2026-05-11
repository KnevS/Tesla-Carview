/**
 * Build PNG icons fuer PWA und Apple Touch Icon aus einer einzigen SVG.
 * Wird einmalig zur Build-Zeit aufgerufen — Resultat liegt in /public.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC  = path.join(ROOT, 'public', 'icon.svg');
const OUT  = path.join(ROOT, 'public');

if (!existsSync(SRC)) {
  console.error('icon.svg fehlt — Build abgebrochen');
  process.exit(1);
}
const svg = readFileSync(SRC);
mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'icon-maskable.png',    size: 512, padding: 0.18 }, // safe-zone
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size, padding } of sizes) {
  let pipeline;
  if (padding) {
    const inner = Math.round(size * (1 - 2 * padding));
    pipeline = sharp(svg, { density: 384 }).resize(inner, inner)
      .extend({
        top:    Math.round(size * padding),
        bottom: Math.round(size * padding),
        left:   Math.round(size * padding),
        right:  Math.round(size * padding),
        background: { r: 26, g: 26, b: 26, alpha: 1 },
      });
  } else {
    pipeline = sharp(svg, { density: 384 }).resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  await pipeline.png().toFile(path.join(OUT, name));
  console.log('built', name);
}
