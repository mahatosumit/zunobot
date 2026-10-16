import { html, type Safe } from '../html';
import { icons } from '../icons';

export function hero(): Safe {
  return html`
<section class="hero" id="top" aria-labelledby="hero-title">
  <div class="hero__bg" aria-hidden="true"><span class="hero__glow"></span><span class="hero__floor"></span></div>
  <div class="container hero__grid">
    <div class="hero__head">
      <p class="eyebrow eyebrow--cyan hero__rise" style="--d:0ms">Early-access waitlist · Powered by NAVIQ OS</p>
      <h1 id="hero-title" class="hero__rise" style="--d:60ms">A more helpful home starts here.</h1>
    </div>

    <figure class="hero__stage" data-hero-stage>
      <div class="hero__robot">
        <img class="hero__img" src="/images/front-cutout.webp"
          srcset="/images/front-cutout-400.webp 400w, /images/front-cutout.webp 585w" sizes="(max-width: 900px) 62vw, 34vw"
          width="585" height="770" fetchpriority="high" decoding="async"
          alt="ZunoBot concept render, front view: a compact white robot with a faceted head, a dark display showing a smiling cyan face, blue chest panel and arms, and a wheeled base.">
        <div class="hero__reflection" aria-hidden="true"><img src="/images/front-cutout.webp" alt="" width="585" height="770" loading="eager" decoding="async"></div>
        <span class="hero__shadow" aria-hidden="true"></span>
        <div class="hero__viewer" data-hero-viewer aria-hidden="true"></div>
      </div>
      <figcaption class="hero__caption">
        <span data-hero-caption>Design concept render</span>
        <a class="hero__3d" href="#explore">${icons.cube} Explore in 3D</a>
      </figcaption>
    </figure>

    <div class="hero__body">
      <p class="lede hero__rise" style="--d:140ms">Meet ZunoBot — a compact home robot designed to bring helpful intelligence into the spaces where everyday life happens. Powered by NAVIQ OS and engineered as one connected system.</p>
      <div class="hero__cta hero__rise" style="--d:220ms">
        <a class="btn btn--primary" href="#waitlist">Join the Early-Access Waitlist ${icons.arrowRight}</a>
        <a class="btn btn--ghost" href="#product">Explore ZunoBot</a>
      </div>
      <p class="hero__note hero__rise" style="--d:300ms">A pre-launch concept. Joining is free and is an expression of interest, not an order or a reservation.</p>
    </div>
  </div>

  <div class="container">
    <ul class="hero__facts">
      <li><span class="hero__fact-k">Form</span> A compact, wheeled home-robot concept</li>
      <li><span class="hero__fact-k">Face</span> A display designed to express status and simple emotion</li>
      <li><span class="hero__fact-k">Software</span> Built around NAVIQ OS, as one connected system</li>
    </ul>
  </div>
</section>`;
}
