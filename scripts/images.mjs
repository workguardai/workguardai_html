// Builds web images from assets/photos-src/*.jpg into assets/img/
// as AVIF and WebP at three widths. Metadata (EXIF/GPS) is not copied.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/photos-src';
const OUT = 'assets/img';
const WIDTHS = [480, 800, 1080];

await mkdir(OUT, { recursive: true });
for (const file of (await readdir(SRC)).filter((f) => f.endsWith('.jpg'))) {
  const name = path.parse(file).name;
  for (const w of WIDTHS) {
    const img = sharp(path.join(SRC, file)).rotate().resize({ width: w });
    await img.clone().avif({ quality: 45, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
    await img.clone().webp({ quality: 62 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  console.log('done', name);
}
