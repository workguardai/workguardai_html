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
  // "From the field" strip: square crops on the ground, away from buildings and signage
  'field-cut': ['excavation-day-02.jpg', { left: 0, top: 600, width: 1800, height: 1800 }],
  'field-floor': ['excavation-day-03.jpg', { left: 0, top: 600, width: 1800, height: 1800 }],
  'field-shoring': ['shored-excavation-night-02.jpg', { left: 0, top: 600, width: 1800, height: 1800 }],
  'field-drone': ['drone-controller-closeup.jpg', { left: 0, top: 300, width: 1800, height: 1800 }],
  'field-urban-compactor': ['urban-site-dusk-04.jpg', { left: 0, top: 1250, width: 1150, height: 1150 }],
  'field-urban-materials': ['urban-site-dusk-02.jpg', { left: 250, top: 1100, width: 1300, height: 1300 }],
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
