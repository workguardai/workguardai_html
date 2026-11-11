// Builds the static pages from src/*.html and src/i18n/<lang>.json.
//   en  -> index.html, privacy/, news/, news/<id>/, press/
//   xx  -> the same under xx/
// News, articles and upcoming events all come from src/news.json.
// Run: node scripts/build.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const news = JSON.parse(await readFile('src/news.json', 'utf8')).items.sort((a, b) => b.date.localeCompare(a.date));
const articleTemplate = await readFile('src/article.html', 'utf8');
const PAGES = [
  { template: await readFile('src/page.html', 'utf8'), slug: '', title: 'meta.title', description: 'meta.description' },
  { template: await readFile('src/privacy.html', 'utf8'), slug: 'privacy/', title: 'privacy.title', description: 'privacy.metaDesc' },
  { template: await readFile('src/news.html', 'utf8'), slug: 'news/', title: 'news.title', description: 'news.metaDesc' },
  { template: await readFile('src/press.html', 'utf8'), slug: 'press/', title: 'press.title', description: 'press.metaDesc' },
  { template: await readFile('src/concept.html', 'utf8'), slug: 'concept/', title: 'cp.title', description: 'cp.metaDesc' },
  ...news.filter((n) => n.article).map((item) => ({ template: articleTemplate, slug: `news/${item.id}/`, item })),
];
const LANGS = config.languages;
const LABELS = { en: 'EN', sq: 'SQ', da: 'DA', fi: 'FI', es: 'ES' };
const NAMES = { en: 'English', sq: 'Shqip', da: 'Dansk', fi: 'Suomi', es: 'Español' };

const dicts = {};
for (const lang of LANGS) dicts[lang] = JSON.parse(await readFile(`src/i18n/${lang}.json`, 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathOf = (lang) => (lang === 'en' ? '' : `${lang}/`);
// A translation stays out of search engines until a native speaker has reviewed it.
const indexable = (lang) => (dicts[lang]._meta?.status ?? 'source') !== 'needs native review';
const urlOf = (lang, slug = '') => `${config.baseUrl}/${pathOf(lang)}${slug}`;

// Shared blocks, inserted with {{@name}} before the text keys are filled in.
const PARTIALS = {
  homeDevices: await readFile('src/partials/home-devices.html', 'utf8'),
  homeFlow: await readFile('src/partials/home-flow.html', 'utf8'),
};
const usedKeys = new Set([...PAGES.map(({ template }) => template), ...Object.values(PARTIALS)].flatMap((template) => [...template.matchAll(/\{\{([^@}][^}]*)\}\}/g)].map((m) => m[1])));
let problems = 0;

// Every news text must exist in every language.
for (const item of news) {
  const texts = { title: item.title, text: item.text, 'link.label': item.link?.label, 'event.banner': item.event?.banner, 'event.short': item.event?.short, 'photo.alt': item.photo?.alt, 'article.body': item.article?.body };
  for (const [field, value] of Object.entries(texts)) {
    if (!value) continue;
    for (const lang of LANGS) {
      if (!value[lang]) { console.error(`news.json: "${item.id}" is missing ${field}.${lang}`); problems++; }
    }
  }
  if (item.article?.draft) console.warn(`DRAFT, not ready to publish: news/${item.id}/`);
}

// Dates: "25–26 Nov 2026", written the way each language writes it.
const formatDate = (lang, start, end, monthOnly) => {
  const locale = lang === 'en' ? 'en-GB' : lang;
  if (monthOnly) return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(start));
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: lang === 'sq' ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
  return end ? format.formatRange(new Date(start), new Date(end)).replace(/\s*–\s*/, '–') : format.format(new Date(start));
};

const text = (t, key) => t[key] ?? dicts.en[key];
const dateOf = (item, lang) => formatDate(lang, item.date, item.endDate, item.monthOnly);
const articleUrl = (item, lang, base) => `${base}${pathOf(lang)}news/${item.id}/`;
const meetingUrl = (event, home) => `${home}?interest=event&event=${encodeURIComponent(event.name)}#work-form`;

// Plain links: nothing loads from these services until someone clicks.
const shareLinks = (url, title, t) => {
  const u = encodeURIComponent(url);
  const newtab = `<span class="visually-hidden">${esc(text(t, 'newtab'))}</span>`;
  return `<div class="share"><span class="mono">${esc(text(t, 'share.label'))}</span>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" rel="noopener" target="_blank">LinkedIn${newtab}</a>
            <a href="https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}" rel="noopener" target="_blank">WhatsApp${newtab}</a>
            <a href="mailto:?subject=${encodeURIComponent(title)}&amp;body=${u}">${esc(text(t, 'share.email'))}</a>
            <a href="${esc(url)}" data-copy="${esc(text(t, 'share.copied'))}">${esc(text(t, 'share.copy'))}</a>
            <button type="button" class="share-native" data-share-title="${esc(title)}" data-share-url="${esc(url)}" hidden>${esc(text(t, 'share.native'))}</button>
          </div>`;
};

const eventRow = (item, lang, home, t) => {
  const { event } = item;
  const url = `${urlOf(lang)}#event-${item.id}`;
  return `        <li id="event-${item.id}" data-end="${event.end}">
          <time class="mono" datetime="${event.start}">${esc(formatDate(lang, event.start, event.end))}</time>
          <div>
            <h3>${esc(event.short[lang])}</h3>
            <p>${esc(event.banner[lang])}</p>
            ${shareLinks(url, event.banner[lang], t)}
          </div>
          <a class="btn btn-outline btn-small" href="${esc(meetingUrl(event, home))}">${esc(text(t, 'ev.request'))}</a>
        </li>`;
};

const articleBody = (item, lang, t, base) => {
  const { article } = item;
  const paragraphs = article.body[lang].map((p) => `    <p>${esc(p)}</p>`).join('\n');
  const notes = article.draft ? (article.notes ?? []).map((n) => `    <p class="todo">[TODO: ${esc(n)}]</p>`).join('\n') : '';
  const source = item.link ? `    <p><a href="${esc(item.link.url)}" rel="noopener" target="_blank">${esc(item.link.label[lang])} <span aria-hidden="true">↗</span><span class="visually-hidden">${esc(text(t, 'newtab'))}</span></a></p>` : '';
  const photo = item.photo ? `    <picture><source type="image/avif" srcset="${base}assets/img/${item.photo.name}-800.avif"><img src="${base}assets/img/${item.photo.name}-800.webp" width="${item.photo.width}" height="${item.photo.height}" alt="${esc(item.photo.alt[lang])}"></picture>` : '';
  return [photo, paragraphs, notes, source].filter(Boolean).join('\n');
};

const newsItem = (item, lang, base, t) => {
  const photo = item.photo && `
          <picture>
            <source type="image/avif" srcset="${base}assets/img/${item.photo.name}-800.avif">
            <img src="${base}assets/img/${item.photo.name}-800.webp" width="${item.photo.width}" height="${item.photo.height}" loading="lazy" decoding="async" alt="${esc(item.photo.alt[lang])}">
          </picture>`;
  const link = item.link && `
          <a href="${esc(item.link.url)}" rel="noopener" target="_blank">${esc(item.link.label[lang])} <span aria-hidden="true">↗</span><span class="visually-hidden">${esc(t.newtab ?? dicts.en.newtab)}</span></a>`;
  return `        <li id="${item.id}">${photo ?? ''}
          <time class="mono" datetime="${item.date}">${esc(dateOf(item, lang))}</time>
          <h3>${item.article ? `<a href="${articleUrl(item, lang, base)}">${esc(item.title[lang])}</a>` : esc(item.title[lang])}</h3>
          <p>${esc(item.text[lang])}</p>${link ?? ''}
        </li>`;
};

// Upcoming events, soonest first. The page also carries this list so the banner
// moves on by itself when an event ends, without waiting for a rebuild.
const today = new Date().toISOString().slice(0, 10);
const upcoming = news.filter((n) => n.event && n.event.end >= today).sort((a, b) => a.event.start.localeCompare(b.event.start));
const eventsFor = (lang, t, home) => upcoming.map(({ event }) => ({
  end: event.end,
  tag: formatDate(lang, event.start, event.end),
  label: event.banner[lang],
  cta: `${text(t, 'cta.meet')} ${event.short[lang]}`,
  meet: meetingUrl(event, home),
}));
for (const key of usedKeys) {
  if (!(key in dicts.en)) { console.error(`en.json is missing "${key}"`); problems++; }
}

for (const lang of LANGS) {
  const t = dicts[lang];
  const missing = [...usedKeys].filter((k) => !(k in t));
  if (missing.length) console.warn(`${lang}: ${missing.length} missing, using English: ${missing.join(', ')}`);

  for (const { template, slug, item, title: titleKey, description: descriptionKey } of PAGES) {
    const depth = (lang === 'en' ? 0 : 1) + slug.split('/').filter(Boolean).length;
    const base = '../'.repeat(depth);
    const langnav = LANGS.map((l) => {
      const href = base + pathOf(l) + slug || './';
      const current = l === lang ? ' aria-current="true"' : '';
      return `        <a href="${href}" hreflang="${l}" lang="${l}" title="${NAMES[l]}"${current}>${LABELS[l]}</a>`;
    }).join('\n');
    const alternates = [
      ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlOf(l, slug)}">`),
      `<link rel="alternate" hreflang="x-default" href="${urlOf('en', slug)}">`,
    ].join('\n');
    const formReady = Boolean(config.formspreeId);
    const home = base + pathOf(lang) || './';
    const events = eventsFor(lang, t, home);
    const pageTitle = item ? `${item.title[lang]} · WorkGuardAI` : text(t, titleKey);
    const pageDescription = item ? item.text[lang] : text(t, descriptionKey);
    const image = `${config.baseUrl}/assets/img/${item?.ogImage ?? 'og-default.jpg'}`;
    const og = [
      ['og:type', item ? 'article' : 'website'], ['og:site_name', 'WorkGuardAI'], ['og:title', pageTitle], ['og:description', pageDescription],
      ['og:url', urlOf(lang, slug)], ['og:image', image], ['og:image:width', '1200'], ['og:image:height', '630'],
    ].map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`);
    const twitter = [['twitter:card', 'summary_large_image'], ['twitter:title', pageTitle], ['twitter:description', pageDescription], ['twitter:image', image]]
      .map(([k, v]) => `<meta name="${k}" content="${esc(v)}">`);

    const vars = {
      lang,
      base,
      home,
      privacy: `${base}${pathOf(lang)}privacy/`,
      newsPage: `${base}${pathOf(lang)}news/`,
      newsLatest: news.slice(0, 3).map((n) => newsItem(n, lang, base, t)).join('\n'),
      newsAll: news.map((n) => newsItem(n, lang, base, t)).join('\n'),
      eventsJson: JSON.stringify(events).replace(/</g, '\\u003c'),
      eventHidden: events.length ? '' : ' hidden',
      eventTag: esc(events[0]?.tag ?? ''),
      eventLabel: esc(events[0]?.label ?? ''),
      eventCta: esc(events[0]?.cta ?? t['cta.meetNone'] ?? dicts.en['cta.meetNone']),
      canonical: urlOf(lang, slug),
      alternates,
      langnav,
      robots: config.noindex || !indexable(lang) || item?.article.draft ? '<meta name="robots" content="noindex">' : '',
      pageTitle: esc(pageTitle),
      pageDescription: esc(pageDescription),
      og: [...og, ...twitter].join('\n'),
      press: `${base}${pathOf(lang)}press/`,
      conceptPage: `${base}${pathOf(lang)}concept/`,
      // The hero's second button appears once site.config.json has a deck link.
      deckButton: config.deckUrl ? `<a class="btn btn-ghost" href="${esc(config.deckUrl)}">${esc(text(t, 'home.deck'))}</a>` : '',
      eventList: upcoming.map((n) => eventRow(n, lang, home, t)).join('\n'),
      eventMeet: esc(events[0]?.meet ?? `${home}?interest=event#work-form`),
      articleTitle: item ? esc(item.title[lang]) : '',
      articleDate: item ? esc(dateOf(item, lang)) : '',
      articleIso: item?.date ?? '',
      articleBody: item ? articleBody(item, lang, t, base) : '',
      articleShare: item ? shareLinks(urlOf(lang, slug), item.title[lang], t) : '',
      articleCta: item?.event ? `<a class="btn btn-outline btn-small" href="${esc(meetingUrl(item.event, home))}">${esc(text(t, 'ev.request'))}</a>` : `<a class="link-arrow" href="${home}?interest=pilot#work-form">${esc(text(t, 'work.h2'))} <span aria-hidden="true">→</span></a>`,
      formAction: formReady ? `https://formspree.io/f/${config.formspreeId}` : '#',
      formDisabled: formReady ? '' : ' disabled',
      formTodo: formReady ? '' : ' <span class="todo">[TODO: Formspree form ID in site.config.json]</span>',
    };

    let html = template.replace(/\{\{@(\w+)\}\}/g, (tag, k) => PARTIALS[k] ?? tag)
      // Review notes stay in the source files, not on the public pages.
      .replace(/[ \t]*<!-- TODO[\s\S]*?-->\n?/g, '')
      .replace(/\{\{@(\w+)\}\}/g, (_, k) => {
        if (!(k in vars)) throw new Error(`Unknown build variable @${k}`);
        return vars[k];
      })
      .replace(/\{\{([^}]+)\}\}/g, (_, k) => esc(t[k] ?? dicts.en[k] ?? `[MISSING ${k}]`));

    const status = t._meta?.status ?? 'unknown';
    html = html.replace('<!doctype html>', `<!doctype html>\n<!-- Generated by scripts/build.mjs from src/i18n/${lang}.json (${status}). Do not edit by hand. -->`);

    const dir = pathOf(lang) + slug;
    if (dir) await mkdir(dir, { recursive: true });
    await writeFile(`${dir}index.html`, html);
    console.log(`wrote ${dir}index.html${status === 'needs native review' ? '  (needs native review)' : ''}`);
  }
}

// robots.txt and sitemap.xml (indexable pages only)
const sitemapUrls = config.noindex ? [] : LANGS.filter(indexable).flatMap((lang) => PAGES.filter(({ item }) => !item?.article.draft).map(({ slug }) => urlOf(lang, slug)));
await writeFile('robots.txt', config.noindex
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`);
await writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
console.log(`wrote robots.txt, sitemap.xml (${sitemapUrls.length} urls)`);

if (problems) process.exit(1);
