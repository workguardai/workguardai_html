# workguardai.com

Static site served by GitHub Pages from `main` (`CNAME` → workguardai.com). No framework and no build step on the server: the generated HTML is committed.

## Layout

| Path | What it is |
|---|---|
| `src/page.html` | The one page template. Text is `{{key}}`; build values are `{{@name}}`. |
| `src/i18n/en.json` | English source text. |
| `src/i18n/{sq,da,fi,es}.json` | Translations. `_meta.status` says whether a native speaker has reviewed it. |
| `site.config.json` | Base URL, Formspree form ID, languages, `noindex` switch for the whole site. |
| `index.html`, `privacy/`, `sq/`, `da/`, `fi/`, `es/`, `robots.txt`, `sitemap.xml` | **Generated.** Do not edit by hand. |
| `assets/` | CSS, JS, self-hosted fonts, generated images. |
| `assets/photos-src/` | Source photos (EXIF stripped). |

## Change text

1. Edit the key in `src/i18n/en.json` (and the same key in the other language files).
2. Run `node scripts/build.mjs`. A key missing in a translation falls back to English and is listed in the output.

## Images

`npm install` once, then `npm run images` rebuilds AVIF and WebP (480, 800, 1080 px) from `assets/photos-src/`. Crops (such as the hero) are defined at the top of `scripts/images.mjs`.

Prototype screenshots: `node scripts/screens.mjs "<folder with the original screenshots>"` blurs the client file name, coordinates and figures, crops to the content and writes `assets/img/screen-*`. The unredacted originals must never be added to this repo.

## Pilot form

Submissions go to Formspree, which emails ek@workguardai.com. Put the form ID (the part after `formspree.io/f/`) in `site.config.json` → `formspreeId` and rebuild. While it is empty the button is disabled and a TODO note shows.

## Search engines and translations

English is indexed. A translation whose `_meta.status` is `"needs native review"` gets `noindex` and stays out of `sitemap.xml`; visitors can still reach it through the language switcher. After a native speaker has reviewed a language file, set its status to `"reviewed"` and rebuild.

## Open items

- Native review of SQ, DA, FI and ES (including the privacy page).
- Ask Formspree for a Data Processing Agreement with Standard Contractual Clauses, then name it on the privacy page.

## Preview locally

```
python3 -m http.server 4321
```

then open http://localhost:4321.
