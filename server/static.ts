import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.svg', '.xml', '.txt']);

export function createStaticHandler(root: string) {
  const cache = new Map<string, Buffer>();

  async function resolveFile(pathname: string): Promise<string | null> {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;
    const rel = path.posix.normalize(decoded).replace(/^\/+/, '');
    const candidates = rel === '' ? ['index.html'] : path.extname(rel) ? [rel] : [`${rel}/index.html`, `${rel}.html`];
    for (const c of candidates) {
      const abs = path.resolve(root, c);
      if (abs !== root && !abs.startsWith(root + path.sep)) return null; // path traversal guard
      try {
        if ((await stat(abs)).isFile()) return abs;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  function cacheControl(rel: string, ext: string): string {
    if (ext === '.html') return 'no-cache';
    if (rel.startsWith('assets/')) return 'public, max-age=31536000, immutable'; // content-hashed by the build
    if (ext === '.woff' || ext === '.woff2') return 'public, max-age=2592000';
    return 'public, max-age=86400';
  }

  return async function serve(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let file = await resolveFile(pathname);
    let status = 200;
    if (!file) {
      file = path.join(root, '404.html');
      status = 404;
    }
    let info;
    try {
      info = await stat(file);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(root, file).split(path.sep).join('/');
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const headers: Record<string, string> = {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': status === 404 ? 'no-cache' : cacheControl(rel, ext),
      Vary: 'Accept-Encoding',
    };
    if (status === 200) {
      headers.ETag = etag;
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers).end();
        return;
      }
    }

    const accept = String(req.headers['accept-encoding'] ?? '');
    if (COMPRESSIBLE.has(ext)) {
      const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : '';
      const key = `${file}:${info.mtimeMs}:${enc}`;
      let body = cache.get(key);
      if (!body) {
        const raw = await readFile(file);
        body = enc === 'br'
          ? await brotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
          : enc === 'gzip' ? await gz(raw, { level: 9 }) : raw;
        cache.set(key, body);
      }
      if (enc) headers['Content-Encoding'] = enc;
      headers['Content-Length'] = String(body.length);
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }

    headers['Content-Length'] = String(info.size);
    res.writeHead(status, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  };
}
