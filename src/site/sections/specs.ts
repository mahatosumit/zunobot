import { html, type Safe } from '../html';

const REFERENCES = [
  { k: 'Overall height', v: 'About 302 mm', tag: 'Design target' },
  { k: 'Chassis envelope', v: 'About 180 × 140 mm', tag: 'Design target' },
  { k: 'Ground clearance', v: 'About 12 mm', tag: 'Design target' },
  { k: 'Display opening', v: 'About 100 × 55 mm', tag: 'Design target' },
  { k: 'Drive layout', v: 'Differential drive: two driven wheels and a rear support point', tag: 'Design concept' },
  { k: 'Obstacle sensing layout', v: 'Five ultrasonic positions: front-left, front-right, left, right and rear. Detection performance is not yet verified.', tag: 'Design requirement' },
  { k: 'Serviceability', v: 'Removable shell panels, battery hatch and electronics tray', tag: 'Design goal' },
];
const UNSPECIFIED = ['Battery life and charging', 'Speed', 'Weight', 'Payload and manipulation', 'Connectivity', 'Microphones and cameras', 'Production materials and finish', 'Price and availability'];

export function specs(): Safe {
  return html`
<section class="section section--obsidian specs" id="specs" aria-labelledby="specs-title">
  <div class="specs__grid-bg" aria-hidden="true"></div>
  <div class="container specs__grid">
    <figure class="specs__fig" data-reveal>
      <div class="specs__drawing">
        <img src="/images/side-cutout.webp" width="465" height="819" loading="lazy" decoding="async" alt="ZunoBot concept render, side view, with a dimension line marking the approximately 302 millimetre height target.">
        <svg class="specs__dim" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M20 3V97M10 3h20M10 97h20" stroke="currentColor" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/>
        </svg>
        <span class="specs__dim-label">≈ 302 mm<small>design target</small></span>
      </div>
      <figcaption>Concept render with the height target marked. Proportions in the render are indicative.</figcaption>
    </figure>

    <div class="specs__copy">
      <div class="section__head" data-reveal>
        <p class="eyebrow">Product design and specifications</p>
        <h2 id="specs-title">Design references, not final specifications.</h2>
        <p class="lede">These figures come from the team’s V5 engineering baseline. They have not been verified on a physical unit and will change. Anything we have not decided yet is listed as such, rather than guessed.</p>
      </div>
      <h3 class="specs__h">Design references</h3>
      <dl class="spec-list" data-reveal>
        ${REFERENCES.map((r) => html`<div><dt>${r.k}</dt><dd>${r.v}</dd><dd class="spec-list__tag"><span class="tag tag--target">${r.tag}</span></dd></div>`)}
      </dl>
      <h3 class="specs__h">Not yet specified</h3>
      <ul class="unspecified" data-reveal>${UNSPECIFIED.map((u) => html`<li>${u}</li>`)}</ul>
      <p class="specs__foot">We will publish confirmed specifications only once the product is validated and the figures have been measured on the exact unit being described.</p>
    </div>
  </div>
</section>`;
}
