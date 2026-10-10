// Builds the prototype screenshots for the website, with client-identifying
// details blurred. The unredacted originals stay outside this repo.
// Run: node scripts/screens.mjs "<folder with the original PNGs>"
import sharp from 'sharp';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) throw new Error('Pass the folder that holds the original screenshots.');
const OUT = 'assets/img';
const WIDTHS = [640, 1200];

// Regions in original pixels: [left, top, width, height]. Blur first, then crop to the content.
const SCREENS = {
  'screen-upload': { file: 'WorkGuardAi file storage.png', blur: [], crop: [330, 170, 1510, 944] },
  'screen-map': {
    file: 'WorkGuardAi Dashboard.png',
    crop: [185, 345, 1320, 825],
    blur: [
      [690, 240, 900, 80],   // uploaded file name (client project)
      [215, 1170, 420, 60],  // total progress figure
    ],
  },
  'screen-alerts': {
    file: 'WorkGuardAi notifications.png',
    crop: [150, 450, 1300, 812],
    blur: [
      // coordinates and depth on each card
      [490, 575, 400, 50], [255, 625, 280, 50],
      [490, 895, 400, 50], [255, 945, 280, 50],
      [490, 1215, 400, 50],
    ],
  },
};

for (const [name, { file, blur, crop }] of Object.entries(SCREENS)) {
  const input = path.join(SRC, file);
  const meta = await sharp(input).metadata();
  const patches = [];
  for (const [left, top, width, height] of blur) {
    const h = Math.min(height, meta.height - top);
    const patch = await sharp(input).extract({ left, top, width, height: h }).blur(30).toBuffer();
    patches.push({ input: patch, left, top });
  }
  const base = await sharp(input).composite(patches).png().toBuffer();
  const [left, top, width, height] = crop;
  const buf = await sharp(base).extract({ left, top, width, height }).png().toBuffer();
  for (const w of WIDTHS) {
    await sharp(buf).resize({ width: w }).webp({ quality: 80 }).toFile(`${OUT}/${name}-${w}.webp`);
    await sharp(buf).resize({ width: w }).avif({ quality: 55 }).toFile(`${OUT}/${name}-${w}.avif`);
  }
  console.log('done', name);
}
