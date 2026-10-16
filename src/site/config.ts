/** Build-time site configuration. Values that are not yet confirmed stay empty and are simply omitted. */
export interface SiteConfig {
  name: string;
  /** Official production origin (no trailing slash). Empty until the domain is confirmed. */
  siteUrl: string;
  /** Official contact email. Empty until a real channel exists. */
  contactEmail: string;
  year: number;
  /** Hashed asset URLs produced by the bundler. */
  assets: { css: string; js: string };
}

export const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#naviq-os', label: 'NAVIQ OS' },
  { href: '#use-cases', label: 'Use Cases' },
  { href: '#approach', label: 'Our Approach' },
  { href: '#faq', label: 'FAQ' },
] as const;

export const SEO = {
  title: 'ZunoBot | A compact home robot concept, built around NAVIQ OS',
  description:
    'ZunoBot is a compact, wheeled home-robot concept with an expressive display face, designed around NAVIQ OS. Join the early-access waitlist to help shape what it should do.',
  ogImageAlt: 'ZunoBot concept render: a compact white home robot with a smiling cyan display face and blue accents.',
} as const;
