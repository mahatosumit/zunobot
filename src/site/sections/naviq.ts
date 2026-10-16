import { html, type Safe } from '../html';

const LAYERS = [
  { n: '01', name: 'Human interaction and task requests', role: 'What people see and ask for',
    does: 'Display, supported input methods, setup, status, settings and permission prompts.',
    boundary: 'Must show people what the robot is doing and give them understandable controls.' },
  { n: '02', name: 'Autonomy and planning', role: 'Interprets, plans and proposes',
    does: 'Task interpretation, planning, context, perception and proposed behaviours.',
    boundary: 'May be uncertain or slow. It proposes actions and cannot bypass safety controls.' },
  { n: '03', name: 'Safety validation and deterministic control', role: 'Decides what is permitted',
    does: 'Command validation, motion limits, watchdogs, safe-stop behaviour and emergency-stop handling.',
    boundary: 'Deterministic and small enough to test, with the authority to reject unsafe proposals.' },
  { n: '04', name: 'Hardware, sensors and actuators', role: 'What physically moves and senses',
    does: 'Compute, sensors, motors, battery, display, actuators and mechanical assemblies.',
    boundary: 'Needs physical integration, electrical and mechanical review, and real-world testing.' },
] as const;
const OPEN = 2;

const VALUES = [
  { t: 'Hardware and software, designed together', d: 'One team owns how the robot’s body, sensors and software behave as a whole.' },
  { t: 'A structured path for software to evolve', d: 'Defined interfaces make updates easier to test than ad hoc integrations.' },
  { t: 'Uncertain AI kept apart from safety-critical control', d: 'Flexible planning sits above a layer built to be predictable and testable.' },
  { t: 'A foundation for future machine capabilities', d: 'NAVIQ OS is intended to be reusable for other machines when there is a clear use case.' },
];

export function naviq(): Safe {
  return html`
<section class="section naviq" id="naviq-os" aria-labelledby="naviq-title">
  <div class="naviq__bg" aria-hidden="true"></div>
  <div class="container">
    <div class="naviq__grid">
      <div class="naviq__copy">
        <p class="eyebrow eyebrow--cyan" data-reveal>Powered by NAVIQ OS</p>
        <h2 id="naviq-title" data-reveal style="--d:60ms">More than a robot. A system designed to think, move, and evolve.</h2>
        <p class="lede" data-reveal style="--d:120ms">NAVIQ OS is the planned software and autonomy foundation behind ZunoBot. It is intended to connect high-level task planning, perception, navigation, behaviour and machine control through a structured architecture.</p>
        <blockquote class="naviq__rule" data-reveal style="--d:180ms">
          <p>The autonomy layer <em>proposes</em> actions.<br>The safety and control layer determines which are <em>permitted</em>.</p>
        </blockquote>
      </div>

      <div class="naviq__diagram" data-naviq data-reveal style="--d:120ms">
        <p class="naviq__diagram-label">Layered architecture <span>Select a layer</span></p>
        <div class="stack">
          <div class="stack__rail" aria-hidden="true">
            <span class="pulse pulse--ok"></span><span class="pulse pulse--blocked"></span>
          </div>
          <ol class="stack__layers">
            ${LAYERS.map((l, i) => html`
            <li class="layer${i === OPEN ? ' is-open' : ''}${i === 2 ? ' layer--control' : ''}" ${i === 2 ? 'id="layer-control"' : ''}>
              ${i === 2 ? html`<div class="gate" aria-hidden="true"><span>Permission boundary</span></div>` : ''}
              <h3 class="layer__h">
                <button type="button" class="layer__btn" aria-expanded="${i === OPEN ? 'true' : 'false'}" aria-controls="layer-body-${i}" id="layer-btn-${i}">
                  <span class="layer__n">${l.n}</span>
                  <span class="layer__t"><span class="layer__name">${l.name}</span><span class="layer__role">${l.role}</span></span>
                  <span class="layer__chev" aria-hidden="true"></span>
                </button>
              </h3>
              <div class="layer__body" id="layer-body-${i}" role="region" aria-labelledby="layer-btn-${i}" ${i === OPEN ? '' : 'hidden'}>
                <p><span class="k">Responsible for</span>${l.does}</p>
                <p><span class="k">Boundary</span>${l.boundary}</p>
              </div>
            </li>`)}
          </ol>
        </div>
        <p class="naviq__legend"><span class="dot dot--ok"></span>A proposal that passes validation reaches the hardware layer <span class="dot dot--blocked"></span>One that does not is stopped. Illustrative flow of the design principle, not live telemetry.</p>
      </div>
    </div>

    <ul class="naviq__values">
      ${VALUES.map((v, i) => html`<li data-reveal style="--d:${i * 60}ms"><h3>${v.t}</h3><p>${v.d}</p></li>`)}
    </ul>

    <p class="naviq__status" data-reveal><strong>Status.</strong> NAVIQ OS is the planned foundation for ZunoBot, not a shipped product. Safety claims, supported capabilities and deployment readiness all require validation, and nothing here describes a certified or production-ready system. Details such as public release, licensing and supported interfaces will be announced when they are settled.</p>
  </div>
</section>`;
}
