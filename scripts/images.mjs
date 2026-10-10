// Builds web images from assets/photos-src/*.jpg into assets/img/
// as AVIF and WebP at three widths. Metadata (EXIF/GPS) is not copied.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/photos-src';
const OUT = 'assets/img';
const WIDTHS = [480, 800, 1080];

// Derived crops: { name: [source, { left, top, width, height }] }
const CROPS = {
  // Excavation only; leaves out the apartment blocks behind the site
  'hero-excavation': ['excavation-day-05.jpg', { left: 80, top: 760, width: 1640, height: 1640 }],
};

const jobs = (await readdir(SRC))
  .filter((f) => f.endsWith('.jpg'))
  .map((f) => [path.parse(f).name, f, null]);
for (const [name, [file, crop]] of Object.entries(CROPS)) jobs.push([name, file, crop]);

const only = process.argv[2];
await mkdir(OUT, { recursive: true });
for (const [name, file, crop] of jobs) {
  if (only && name !== only) continue;
  for (const w of WIDTHS) {
    let img = sharp(path.join(SRC, file)).rotate();
    if (crop) img = img.extract(crop);
    img = img.resize({ width: w });
    await img.clone().avif({ quality: 45, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
    await img.clone().webp({ quality: 62 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  console.log('done', name);
}
