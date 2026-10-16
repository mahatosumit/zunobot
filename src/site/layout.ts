import { html, esc, raw, type Safe } from './html';
import type { SiteConfig } from './config';
import { SEO } from './config';

export interface PageMeta {
  title: string;
  description: string;
  /** Path used for canonical/og:url, e.g. "/" or "/privacy". */
  path: string;
  noindex?: boolean;
  /** Extra <link rel=preload> tags etc. */
  preloads?: Safe;
}

export function renderDocument(site: SiteConfig, meta: PageMeta, body: Safe): string {
  const abs = (p: string): string => `${site.siteUrl}${p}`;
  const canonical = site.siteUrl ? `<link rel="canonical" href="${esc(abs(meta.path))}">` : '';
  const ogUrl = site.siteUrl ? `<meta property="og:url" content="${esc(abs(meta.path))}">` : '';
  // Social crawlers need absolute image URLs, so the image tags are only emitted once the official origin is known.
  const ogImage = site.siteUrl
    ? `<meta property="og:image" content="${esc(abs('/og.jpg'))}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SEO.ogImageAlt)}">
<meta name="twitter:image" content="${esc(abs('/og.jpg'))}">`
    : '';
  const twitterCard = site.siteUrl ? 'summary_large_image' : 'summary';
  const jsonLd = site.siteUrl
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ZunoBot',
        url: site.siteUrl,
        description: SEO.description,
      }).replace(/</g, '\\u003c')}</script>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="theme-color" content="#08090b">
<meta name="color-scheme" content="dark">
${meta.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${canonical}
<meta property="og:type" content="website">
<meta property="og:site_name" content="ZunoBot">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
${ogUrl}
${ogImage}
<meta name="twitter:card" content="${twitterCard}">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/InterDisplay-SemiBold.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/Inter-Regular.woff" as="font" type="font/woff" crossorigin>
${meta.preloads?.value ?? ''}
<link rel="stylesheet" href="${esc(site.assets.css)}">
<script type="module" src="${esc(site.assets.js)}"></script>
${jsonLd}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${body.value}
</body>
</html>
`;
}

export { html, raw };
