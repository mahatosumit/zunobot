import { html, type Safe } from './html';
import { renderDocument } from './layout';
import { SEO, type SiteConfig } from './config';
import { nav } from './sections/nav';
import { hero } from './sections/hero';
import { product } from './sections/product';
import { features } from './sections/features';
import { explore } from './sections/explore';
import { naviq } from './sections/naviq';
import { usecases } from './sections/usecases';
import { trust } from './sections/trust';
import { specs } from './sections/specs';
import { approach } from './sections/approach';
import { waitlist } from './sections/waitlist';
import { faq } from './sections/faq';
import { footer } from './sections/footer';
import { privacyPage } from './sections/privacyPage';

const HERO_PRELOAD = html`<link rel="preload" as="image" href="/images/front-cutout.webp" imagesrcset="/images/front-cutout-400.webp 400w, /images/front-cutout.webp 585w" imagesizes="(max-width: 900px) 62vw, 34vw" fetchpriority="high">`;

export function renderHome(site: SiteConfig): string {
  const body: Safe = html`
${nav('')}
<main id="main">
${hero()}
${product()}
${features()}
${explore()}
${naviq()}
${usecases()}
${trust()}
${specs()}
${approach()}
${waitlist(site.contactEmail)}
${faq()}
</main>
${footer(site, '')}`;
  return renderDocument(site, { title: SEO.title, description: SEO.description, path: '/', preloads: HERO_PRELOAD }, body);
}

export function renderPrivacy(site: SiteConfig): string {
  const body = html`${nav('/')}<main id="main">${privacyPage(site)}</main>${footer(site, '/')}`;
  return renderDocument(site, { title: 'Privacy notice | ZunoBot', description: 'How the ZunoBot early-access waitlist handles personal data.', path: '/privacy' }, body);
}

export function renderNotFound(site: SiteConfig): string {
  const body = html`${nav('/')}
<main id="main"><section class="section section--obsidian notfound"><div class="container">
  <p class="eyebrow">Error 404</p><h1>This page does not exist.</h1>
  <p class="lede">The link may be old or mistyped. The home page has everything we can currently say about ZunoBot.</p>
  <p><a class="btn btn--primary" href="/">Back to the home page</a></p>
</div></section></main>${footer(site, '/')}`;
  return renderDocument(site, { title: 'Page not found | ZunoBot', description: 'This page does not exist.', path: '/404', noindex: true }, body);
}
