import { html, type Safe } from '../html';
import { NAV_LINKS } from '../config';
import { icons, logoMark } from '../icons';

/** `base` is "" on the home page and "/" on other pages so in-page links still work from there. */
export function nav(base: string): Safe {
  const links = NAV_LINKS.map((l) => html`<li><a href="${base}${l.href}">${l.label}</a></li>`);
  return html`
<header class="nav" data-nav>
  <div class="container nav__bar">
    <a class="brand" href="${base || '/'}" aria-label="ZunoBot, home">
      ${logoMark(28)}<span class="brand__name">ZunoBot</span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      <ul>${links}</ul>
    </nav>
    <a class="btn btn--primary btn--sm nav__cta" href="${base}#waitlist">Join the Waitlist</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" data-nav-toggle>
      <span class="nav__toggle-open">${icons.menu}</span><span class="nav__toggle-close">${icons.close}</span>
    </button>
  </div>
  <div class="nav__panel" id="mobile-menu" hidden data-nav-panel>
    <nav aria-label="Mobile primary">
      <ul>${links}</ul>
    </nav>
    <a class="btn btn--primary" href="${base}#waitlist" data-nav-close>Join the Waitlist ${icons.arrowRight}</a>
  </div>
</header>`;
}
