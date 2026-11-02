// Checks the generated site against the content rules. Run after the build: npm test
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const problems = [];
const fail = (message) => problems.push(message);

// Article length: 150 to 250 words in the English source.
const { items } = JSON.parse(await readFile('src/news.json', 'utf8'));
for (const item of items.filter((n) => n.article)) {
  const words = item.article.body.en.join(' ').split(/\s+/).length;
  if (words < 150 || words > 250) fail(`news/${item.id}: ${words} words in English, expected 150 to 250`);
}

// Generated pages
const pages = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'assets', 'review', 'src', 'scripts'].includes(entry.name) && !entry.name.startsWith('.')) await walk(full);
    else if (entry.name === 'index.html') pages.push(full);
  }
};
await walk('.');

// The Finnish outcomes are "shortlisted", and only the approved facts may be claimed.
const banned = [
  /Selected by (the three cities|Helsinki)/i, /Selected among competing/i, /We are part of/i, /competing for/i,
  /\bANK\b/, /circular-buildings-(en|fi)/, /partnered|in partnership/i,
];
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const pattern of banned) if (pattern.test(text)) fail(`${page}: matches ${pattern}`);
  if (html.includes('[MISSING')) fail(`${page}: missing translation`);
  if (/\{\{/.test(html)) fail(`${page}: unreplaced template tag`);
  if (/<!-- TODO/.test(html)) fail(`${page}: review note left in the public page`);
  if (!/property="og:image"/.test(html)) fail(`${page}: no Open Graph image`);

  // Local links and images must exist.
  for (const [, url] of html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    let target = path.join(path.dirname(page), url);
    if (url.endsWith('/') || url === '.' || url === './') target = path.join(target, 'index.html');
    await access(target).catch(() => fail(`${page}: broken link ${url}`));
  }
}

// Sitemap: every URL is a page on disk, and no draft or noindex page is listed.
const sitemap = await readFile('sitemap.xml', 'utf8');
for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const file = path.join(url.replace(config.baseUrl, '.'), 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  if (html === null) fail(`sitemap: ${url} has no page`);
  else if (html.includes('name="robots" content="noindex"')) fail(`sitemap: ${url} is noindex`);
}

console.log(`checked ${pages.length} pages`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('all checks passed');
