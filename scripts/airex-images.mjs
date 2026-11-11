// Builds the AIREX 2026 gallery images from the original photos.
// Usage: node scripts/airex-images.mjs "<folder with the originals>"
// The originals are only read, never changed. Output goes to assets/img/
// as WebP at 1500px (long side) and 800px (thumbnail width).
// sharp does not copy metadata unless asked, so EXIF and GPS are dropped.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Pass the folder with the original photos.'); process.exit(1); }
const OUT = 'assets/img';

// Alphabetical order of the source filenames.
const PHOTOS = [
  ['airex-01-progress-by-hand', 'Fav1.jpg'],
  ['airex-02-owners-public-clients', 'Fav2.jpg'],
  ['airex-03-why-us', 'Fav3.jpg'],
  ['airex-04-thank-you-qr', 'Fav4.jpg'],
  ['airex-05-waiting', 'Fav5.jpg'],
  ['airex-06-market', 'Fav7.jpg'],
  ['airex-07-plan-to-progress', 'KMNR8535.jpg'],
  ['airex-08-on-the-mic', 'R_A_1167.jpg'],
  ['airex-09-tesekkur', 'R_A_1250.jpg'],
  ['airex-10-exhibition', 'R_A_1253.jpg'],
];

// Large: aim for 150 to 250 KB by stepping the quality down.
async function large(file, out) {
  for (const q of [78, 72, 66, 60, 54, 48]) {
    await sharp(file).rotate().resize(1500, 1500, { fit: 'inside' }).webp({ quality: q, effort: 6 }).toFile(out);
    if ((await stat(out)).size <= 250 * 1024) return q;
  }
  return 48;
}

for (const [name, file] of PHOTOS) {
  const src = path.join(SRC, file);
  const q = await large(src, `${OUT}/${name}-1500.webp`);
  await sharp(src).rotate().resize({ width: 800 }).webp({ quality: 66, effort: 6 }).toFile(`${OUT}/${name}-800.webp`);
  const m = await sharp(`${OUT}/${name}-1500.webp`).metadata();
  const kb = Math.round((await stat(`${OUT}/${name}-1500.webp`)).size / 1024);
  console.log(name, `${m.width}x${m.height}`, `q${q}`, `${kb} KB`);
}
