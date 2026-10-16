/**
 * Production build:
 *   1. bundle client JS (+ lazy 3D chunk) and CSS with esbuild, content-hashed
 *   2. copy /public
 *   3. pre-render every page to static HTML
 *   4. emit sitemap.xml / robots.txt
 * Environment: SITE_URL (optional, official origin), CONTACT_EMAIL (optional).
 */
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile } from 'node:process';
import type { SiteConfig } from '../src/site/config';
import { renderHome, renderPrivacy, renderNotFound } from '../src/site/pages';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
if (existsSync(path.join(root, '.env'))) loadEnvFile(path.join(root, '.env'));

export async function buildSite(opts: { minify?: boolean; quiet?: boolean } = {}): Promise<void> {
  const minify = opts.minify ?? true;
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const result = await build({
    absWorkingDir: root,
    entryPoints: { main: 'src/client/main.ts', site: 'src/styles/main.css' },
    outdir: 'dist/assets',
    entryNames: '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2022', 'chrome111', 'safari16', 'firefox111'],
    minify,
    sourcemap: minify ? false : 'inline',
    metafile: true,
    legalComments: 'none',
    external: ['/fonts/*', '/images/*'],
    logLevel: 'warning',
  });

  const files = Object.keys(result.metafile.outputs);
  const find = (prefix: string, ext: string): string => {
    const hit = files.find((f) => path.dirname(f) === 'dist/assets' && path.basename(f).startsWith(prefix) && f.endsWith(ext));
    if (!hit) throw new Error(`Build output ${prefix}*${ext} not found`);
    return '/' + hit.replace(/^dist\//, '');
  };
  const site: SiteConfig = {
    name: 'ZunoBot',
    siteUrl: (process.env.SITE_URL ?? '').trim().replace(/\/+$/, ''),
    contactEmail: (process.env.CONTACT_EMAIL ?? '').trim(),
    year: new Date().getFullYear(),
    assets: { css: find('site-', '.css'), js: find('main-', '.js') },
  };

  cpSync(path.join(root, 'public'), dist, { recursive: true });

  const write = (rel: string, content: string): void => {
    const file = path.join(dist, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  write('index.html', renderHome(site));
  write('privacy/index.html', renderPrivacy(site));
  write('404.html', renderNotFound(site));

  const pages = ['/', '/privacy'];
  if (site.siteUrl) {
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((p) => `  <url><loc>${site.siteUrl}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
  }
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n${site.siteUrl ? `\nSitemap: ${site.siteUrl}/sitemap.xml\n` : ''}`);

  if (!opts.quiet) report(site);
}

function report(site: SiteConfig): void {
  const rows: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|css|html)$/.test(name)) {
        const buf = readFileSync(p);
        rows.push(`${path.relative(dist, p).padEnd(46)} ${(buf.length / 1024).toFixed(1).padStart(8)} kB  gzip ${(gzipSync(buf).length / 1024).toFixed(1).padStart(7)} kB`);
      }
    }
  };
  walk(dist);
  console.log(rows.join('\n'));
  console.log(`\nSITE_URL: ${site.siteUrl || '(not set: canonical, og:image and sitemap omitted)'}`);
  console.log(`CONTACT_EMAIL: ${site.contactEmail ? 'set' : '(not set: no public contact shown)'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
