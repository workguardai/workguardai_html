# workguardai.com

Static site served by GitHub Pages from `main` (`CNAME` → workguardai.com). No framework and no build step on the server: the generated HTML is committed.

## Layout

| Path | What it is |
|---|---|
| `src/page.html` | The one page template. Text is `{{key}}`; build values are `{{@name}}`. |
| `src/i18n/en.json` | English source text. |
| `src/i18n/{sq,da,fi,es}.json` | Translations. `_meta.status` says whether a native speaker has reviewed it. |
| `site.config.json` | Base URL, Formspree form ID, languages, `noindex` switch. |
| `index.html`, `sq/`, `da/`, `fi/`, `es/` | **Generated.** Do not edit by hand. |
| `assets/` | CSS, JS, self-hosted fonts, generated images. |
| `assets/photos-src/` | Source photos (EXIF stripped). |

## Change text

1. Edit the key in `src/i18n/en.json` (and the same key in the other language files).
2. Run `node scripts/build.mjs`. A key missing in a translation falls back to English and is listed in the output.

## Images

`npm install` once, then `npm run images` rebuilds AVIF and WebP (480, 800, 1080 px) from `assets/photos-src/`. Crops (such as the hero) are defined at the top of `scripts/images.mjs`.

## Pilot form

Submissions go to Formspree, which emails ek@workguardai.com. Put the form ID (the part after `formspree.io/f/`) in `site.config.json` → `formspreeId` and rebuild. While it is empty the button is disabled and a TODO note shows.

## Before going live

- Set `"noindex": false` in `site.config.json` and rebuild.
- Resolve every `[TODO: ...]` on the page.
- Native review of each translation; then set its `_meta.status` to `"reviewed"`.

## Preview locally

```
python3 -m http.server 4321
```

then open http://localhost:4321.
