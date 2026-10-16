import { html, type Safe } from '../html';

const VIEWS = [
  { id: 'front', label: 'Front', title: 'Front view', caption: 'Faceted head with a dark display face, a blue chest panel and a centre accent channel.',
    alt: 'ZunoBot concept front view: friendly illuminated face, compact white body, blue accents, articulated arms and wheeled base.' },
  { id: 'rear', label: 'Rear', title: 'Rear view', caption: 'The rear shell, centre accent, arm joints and the two drive wheels.',
    alt: 'Rear concept view of ZunoBot showing rear shell, centre blue accent, arm joints, and the two wheels.' },
  { id: 'side', label: 'Side', title: 'Side view', caption: 'Head profile, torso, articulated arms and a compact rolling base.',
    alt: 'Side concept view of ZunoBot showing head profile, torso, articulated arms, and compact rolling base.' },
] as const;

export function product(): Safe {
  return html`
<section class="section section--graphite product" id="product" aria-labelledby="product-title">
  <div class="container product__grid">
    <div class="product__copy">
      <div class="section__head" data-reveal>
        <p class="eyebrow">What is ZunoBot?</p>
        <h2 id="product-title">A compact home robot, designed to be approached.</h2>
        <p class="lede">ZunoBot is a compact, wheeled home-robot concept with an expressive display for a face. It is being developed as one coherent product, hardware and software together, to be a friendly physical interface in the rooms where everyday life happens.</p>
      </div>
      <dl class="facts" data-reveal>
        <div><dt>Its form</dt><dd>A faceted white head, a compact torso and a wheeled base. Approachable by design, with room inside for compute, sensors, battery and actuators.</dd></div>
        <div><dt>Its role</dt><dd>A physical interface for selected information, assistance and automation experiences, as the software matures.</dd></div>
        <div><dt>How it is built</dt><dd>Hardware and software are designed together around NAVIQ OS, so the robot can be understood, tested and improved as one system.</dd></div>
        <div><dt>What is still to prove</dt><dd>ZunoBot is a concept. What it can do depends on implementation and validation, and we will say so plainly.</dd></div>
      </dl>
    </div>

    <div class="gallery" data-gallery data-reveal style="--d:120ms">
      <div class="gallery__tabs" role="tablist" aria-label="ZunoBot concept views" hidden data-gallery-tabs>
        ${VIEWS.map((v, i) => html`<button class="gallery__tab" role="tab" type="button" id="view-tab-${v.id}" aria-controls="view-${v.id}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">${v.label}</button>`)}
      </div>
      <div class="gallery__frame">
        ${VIEWS.map((v, i) => html`
        <figure class="gallery__fig${i === 0 ? ' is-active' : ''}" id="view-${v.id}" role="tabpanel" aria-labelledby="view-tab-${v.id}" data-view="${v.id}">
          <img src="/images/${v.id}-plate-1024.webp" srcset="/images/${v.id}-plate-640.webp 640w, /images/${v.id}-plate-1024.webp 1024w"
            sizes="(max-width: 960px) 100vw, 560px" width="1024" height="1024" alt="${v.alt}" ${i === 0 ? '' : 'loading="lazy"'} decoding="async">
          <figcaption><strong>${v.title}.</strong> ${v.caption}</figcaption>
        </figure>`)}
      </div>
      <p class="gallery__note">Concept renders, not photographs of a production unit. Colours, fittings and details differ between views and will change as the design is validated.</p>
    </div>
  </div>
</section>`;
}
