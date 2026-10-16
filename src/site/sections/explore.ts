import { html, type Safe } from '../html';
import { icons } from '../icons';
import { crop, type CropSpec } from '../crop';

interface Part {
  id: string;
  label: string;
  title: string;
  body: string;
  caveat: string;
  tag: string;
  /** Hotspot position as a fraction (0..1) of the front render image. Software has no physical location. */
  at?: { x: number; y: number };
  visual?: CropSpec;
}

export const PARTS: Part[] = [
  { id: 'display', label: 'Display and head', title: 'Display and head', tag: 'Design targets', at: { x: 0.66, y: 0.12 },
    body: 'A faceted white head frames a dark display opening: the robot’s face. The V5 design baseline targets a display opening of roughly 100 × 55 mm and reserves clearance for a head pan of about ±45°.',
    caveat: 'The final display, mounting, wiring and interface behaviour depend on integration and fit checks.',
    visual: { plate: 'front', zoom: 2.4, x: 0.5, y: 0.24 } },
  { id: 'torso', label: 'Torso and electronics', title: 'Torso and electronics packaging', tag: 'Design targets', at: { x: 0.479, y: 0.4 },
    body: 'A compact torso with a roughly 180 × 140 mm envelope is designed to house compute, sensors, battery and wiring. Removable shell panels, a removable electronics tray and an independent battery hatch are design goals.',
    caveat: 'Compute choice, thermal behaviour, battery pack and cable routing remain to be confirmed on a physical unit.',
    visual: { plate: 'rear', zoom: 2, x: 0.46, y: 0.5 } },
  { id: 'drive', label: 'Wheeled drive base', title: 'Wheeled drive base', tag: 'Design concept', at: { x: 0.585, y: 0.925 },
    body: 'A differential-drive concept: two driven wheels and a rear support point, with a ground-clearance target of about 12 mm. It is meant to let ZunoBot move across indoor floors.',
    caveat: 'Reliable movement depends on the final drive components, sensors, control software and testing on real floors.',
    visual: { plate: 'rear', zoom: 2.2, x: 0.5, y: 0.82 } },
  { id: 'arms', label: 'Articulated arms', title: 'Articulated arms', tag: 'Not yet validated', at: { x: 0.745, y: 0.56 },
    body: 'The current design includes articulated arms with shoulder, upper-arm and forearm sections and a simplified gripper concept.',
    caveat: 'Gripper mechanics are still integration work. We are not claiming reliable manipulation or object handling.',
    visual: { plate: 'side', zoom: 2, x: 0.5, y: 0.5 } },
  { id: 'naviq', label: 'NAVIQ OS', title: 'NAVIQ OS software foundation', tag: 'Planned', 
    body: 'The planned software and autonomy foundation. It is intended to connect task planning, perception, navigation, behaviour and machine control. The autonomy layer proposes actions; a separate safety and control layer decides which are permitted.',
    caveat: 'Capabilities and safety behaviour must be implemented and validated on the target hardware.' },
];

export function explore(): Safe {
  return html`
<section class="section section--graphite explore" id="explore" aria-labelledby="explore-title">
  <div class="explore__grid-bg" aria-hidden="true"></div>
  <div class="container">
    <div class="section__head" data-reveal>
      <p class="eyebrow">Explore the robot</p>
      <h2 id="explore-title">Look closer at how it is designed.</h2>
      <p class="lede">Select a part to see what the design intends, and what is still to be proven. Details here come from the team’s design records. A component being drawn is not proof that it works.</p>
    </div>

    <div class="explore__layout" data-explore>
      <div class="explore__stage-wrap">
        <div class="explore__stage" data-stage>
          <img class="explore__poster" src="/images/front-cutout.webp" width="585" height="770" loading="lazy" decoding="async"
            alt="ZunoBot concept render, front view.">
          <div class="explore__viewer" data-viewer-mount hidden></div>
          <div class="explore__hotspots">
            ${PARTS.filter((p) => p.at).map((p) => html`
            <button class="hotspot" type="button" data-hotspot="${p.id}" aria-pressed="false" aria-label="${p.label}: show details" style="--ix:${p.at!.x};--iy:${p.at!.y}"><span aria-hidden="true"></span></button>`)}
          </div>
          <p class="explore__badge" data-badge hidden>Stylised 3D model, not CAD</p>
          <div class="explore__loading" data-loading hidden><span class="spinner" aria-hidden="true"></span><span>Loading 3D view…</span></div>
        </div>
        <div class="explore__controls">
          <button class="btn btn--ghost btn--sm" type="button" data-load-3d hidden>${icons.cube} Load interactive 3D</button>
          <button class="btn btn--ghost btn--sm" type="button" data-reset-view hidden>${icons.rotate} Reset view</button>
          <button class="btn btn--ghost btn--sm" type="button" data-toggle-spin hidden aria-pressed="false"><span data-spin-label>Pause rotation</span></button>
          <p class="explore__hint" data-hint>Select a point on the robot, or choose a part from the list.</p>
        </div>
        <p class="sr-only" role="status" aria-live="polite" data-viewer-status></p>
      </div>

      <div class="explore__detail">
        <div class="explore__tabs" role="tablist" aria-label="Robot parts" aria-orientation="vertical" data-part-tabs>
          ${PARTS.map((p, i) => html`<button class="part-tab" role="tab" type="button" id="part-tab-${p.id}" aria-controls="part-${p.id}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" data-part="${p.id}"><span class="part-tab__n">0${i + 1}</span>${p.label}</button>`)}
        </div>
        <div class="explore__panels">
          ${PARTS.map((p, i) => html`
          <article class="part-panel" role="tabpanel" id="part-${p.id}" aria-labelledby="part-tab-${p.id}" tabindex="0" ${i === 0 ? '' : 'hidden'}>
            ${p.visual ? crop(p.visual, 16 / 10, 'part-panel__crop') : html`<div class="part-panel__sw" aria-hidden="true"><span></span><span></span><span></span><span></span></div>`}
            <p><span class="tag tag--target">${p.tag}</span></p>
            <h3>${p.title}</h3>
            <p>${p.body}</p>
            <p class="part-panel__caveat"><strong>Still to confirm.</strong> ${p.caveat}</p>
            ${p.id === 'naviq' ? html`<p><a class="link-arrow" href="#naviq-os">How NAVIQ OS is structured ${icons.arrowRight}</a></p>` : ''}
          </article>`)}
        </div>
      </div>
    </div>
  </div>
</section>`;
}
