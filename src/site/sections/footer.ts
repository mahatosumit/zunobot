import { html, type Safe } from '../html';
import { logoMark } from '../icons';
import type { SiteConfig } from '../config';

export function footer(site: SiteConfig, base: string): Safe {
  return html`
<footer class="footer">
  <div class="container footer__grid">
    <div class="footer__brand">
      <a class="brand" href="${base || '/'}" aria-label="ZunoBot, home">${logoMark(28)}<span class="brand__name">ZunoBot</span></a>
      <p>A pre-launch home-robot concept built around NAVIQ OS. Hardware and software are developed as one system, and each claim is proven before it is made.</p>
    </div>
    <nav class="footer__col" aria-label="Product">
      <h2>Product</h2>
      <ul>
        <li><a href="${base}#product">What is ZunoBot</a></li>
        <li><a href="${base}#features">Intended experiences</a></li>
        <li><a href="${base}#explore">Explore the robot</a></li>
        <li><a href="${base}#specs">Design references</a></li>
      </ul>
    </nav>
    <nav class="footer__col" aria-label="NAVIQ OS and approach">
      <h2>NAVIQ OS</h2>
      <ul>
        <li><a href="${base}#naviq-os">Architecture</a></li>
        <li><a href="${base}#trust">Privacy and safety</a></li>
        <li><a href="${base}#approach">Our approach</a></li>
      </ul>
    </nav>
    <nav class="footer__col" aria-label="Waitlist and legal">
      <h2>Early access</h2>
      <ul>
        <li><a href="${base}#waitlist">Join the waitlist</a></li>
        <li><a href="${base}#faq">FAQ</a></li>
        <li><a href="/privacy">Privacy notice</a></li>
        ${site.contactEmail ? html`<li><a href="mailto:${site.contactEmail}">${site.contactEmail}</a></li>` : ''}
      </ul>
    </nav>
  </div>
  <div class="container footer__legal">
    <p>&copy; <span data-year>${site.year}</span> ZunoBot. Images are design concept renders. Features described are design intentions until validated. The waitlist is not an order or a reservation.</p>
  </div>
</footer>`;
}
