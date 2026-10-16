/**
 * Verifies every internal link and in-page anchor in dist/*.html resolves, and that every local asset exists.
 * External links are listed but never fetched. Run after `npm run build`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '../dist');
if (!existsSync(dist)) { console.error('dist/ not found. Run `npm run build` first.'); process.exit(1); }

const pages: string[] = [];
(function walk(d: string): void {
  for (const e of readdirSync(d)) { const p = path.join(d, e); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && pages.push(p); }
})(dist);

const idsOf = (html: string): Set<string> => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] as string));
const urlToFile = (u: string): string | null => {
  const clean = u.split('#')[0]!.split('?')[0]!;
  const candidates = clean.endsWith('/') ? [path.join(dist, clean, 'index.html')] : [path.join(dist, clean), path.join(dist, clean, 'index.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
};

let bad = 0; let checked = 0; const external = new Set<string>();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const pageUrl = '/' + path.relative(dist, page).replace(/index\.html$/, '').replace(/\\/g, '/');
  const ids = idsOf(html);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1] as string;
    if (/^(mailto:|tel:|data:|javascript:)/.test(u)) continue;
    if (/^https?:\/\//.test(u)) { external.add(u); continue; }
    checked++;
    if (u.startsWith('#')) { if (u.length > 1 && !ids.has(u.slice(1))) { bad++; console.error(`${pageUrl}: missing anchor ${u}`); } continue; }
    const file = urlToFile(u);
    if (!file) { bad++; console.error(`${pageUrl}: broken link ${u}`); continue; }
    const hash = u.split('#')[1];
    if (hash && file.endsWith('.html') && !idsOf(readFileSync(file, 'utf8')).has(hash)) { bad++; console.error(`${pageUrl}: ${u} -> missing anchor #${hash}`); }
  }
  void pageUrl;
}
console.log(`check-links: ${checked} internal references across ${pages.length} pages, ${bad} broken. External links (not fetched): ${external.size ? [...external].join(', ') : 'none'}.`);
process.exit(bad ? 1 : 0);
