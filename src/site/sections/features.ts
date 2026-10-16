import { html, raw, type Safe } from '../html';
import { crop, type CropSpec } from '../crop';

interface Feature {
  n: string;
  title: string;
  kicker: string;
  copy: string;
  tag: string;
  visual: { kind: 'crop'; spec: CropSpec } | { kind: 'hub' };
}

const FEATURES: Feature[] = [
  { n: '01', title: 'Expressive interaction', kicker: 'A face that communicates.',
    copy: 'The display is designed to speak in a friendly visual language, so you can tell at a glance whether ZunoBot is ready, working, waiting or stopped.',
    tag: 'Design direction', visual: { kind: 'crop', spec: { plate: 'front', zoom: 2.15, x: 0.5, y: 0.22 } } },
  { n: '02', title: 'A mobile physical presence', kicker: 'Present in more than one room.',
    copy: 'A wheeled, differential-drive design explores a robot that can be present in different indoor areas, subject to navigation and environmental validation.',
    tag: 'Subject to validation', visual: { kind: 'crop', spec: { plate: 'rear', zoom: 2.1, x: 0.5, y: 0.8 } } },
  { n: '03', title: 'Intelligent assistance', kicker: 'Help you can ask for.',
    copy: 'The intended direction includes selected information, conversational interaction, reminders and similar software-assisted experiences, as they are built and tested.',
    tag: 'Planned', visual: { kind: 'crop', spec: { plate: 'front', zoom: 2.2, x: 0.53, y: 0.43 } } },
  { n: '04', title: 'A foundation for connected workflows', kicker: 'Works with what you choose.',
    copy: 'Selected compatible services or smart-home integrations may be supported as engineering and compatibility work progresses. No universal compatibility is implied.',
    tag: 'Planned', visual: { kind: 'hub' } },
  { n: '05', title: 'Designed for evolution', kicker: 'Improves without starting over.',
    copy: 'The architecture aims to let hardware and software improve without treating each update as an entirely new product. Serviceable panels and removable assemblies are design goals.',
    tag: 'Design goal', visual: { kind: 'crop', spec: { plate: 'rear', zoom: 1.9, x: 0.47, y: 0.5 } } },
];

const hub = (): Safe => raw(`<svg class="hub" viewBox="0 0 400 400" role="img" aria-label="Diagram: ZunoBot at the centre, with selected information, reminders, smart-home devices and developer tools connected only where supported." focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M200 200 L82 92M200 200 L318 92M200 200 L82 308M200 200 L318 308" stroke-dasharray="3 7" opacity=".55"/>
    <circle cx="200" cy="200" r="52" opacity=".9"/><circle cx="200" cy="200" r="64" opacity=".25"/>
    <rect x="22" y="62" width="120" height="58" rx="14" stroke-dasharray="4 5" opacity=".75"/><rect x="258" y="62" width="120" height="58" rx="14" stroke-dasharray="4 5" opacity=".75"/>
    <rect x="22" y="280" width="120" height="58" rx="14" stroke-dasharray="4 5" opacity=".75"/><rect x="258" y="280" width="120" height="58" rx="14" stroke-dasharray="4 5" opacity=".75"/>
  </g>
  <g fill="currentColor" font-family="Inter, system-ui, sans-serif" font-size="13" text-anchor="middle" font-weight="500">
    <text x="200" y="196">ZunoBot</text><text x="200" y="214" font-size="10.5" opacity=".7">NAVIQ OS</text>
    <text x="82" y="87">Information</text><text x="82" y="105" font-size="10.5" opacity=".7">selected</text>
    <text x="318" y="87">Reminders</text><text x="318" y="105" font-size="10.5" opacity=".7">as built</text>
    <text x="82" y="305">Smart-home</text><text x="82" y="323" font-size="10.5" opacity=".7">tested devices only</text>
    <text x="318" y="305">Developer tools</text><text x="318" y="323" font-size="10.5" opacity=".7">later, if supported</text>
  </g></svg>`);

const visual = (f: Feature): Safe => (f.visual.kind === 'hub' ? html`<div class="features__hub" aria-hidden="true">${hub()}</div>` : crop(f.visual.spec, 1));

export function features(): Safe {
  return html`
<section class="section section--obsidian features" id="features" aria-labelledby="features-title">
  <div class="container">
    <div class="section__head" data-reveal>
      <p class="eyebrow">Intended experiences</p>
      <h2 id="features-title">Designed for presence. Built to evolve.</h2>
      <p class="lede">These are the experiences ZunoBot is being designed toward. Each one depends on engineering and validation, and we will mark what is available as it becomes true.</p>
    </div>

    <div class="features__layout" data-features>
      <div class="features__stage" aria-hidden="true">
        <div class="features__frame">
          ${FEATURES.map((f, i) => html`<div class="features__layer${i === 0 ? ' is-active' : ''}" data-layer="${i}">${visual(f)}</div>`)}
        </div>
        <p class="features__stage-note">Crops of the concept renders. Illustrative, not a product demonstration.</p>
      </div>
      <ol class="features__list">
        ${FEATURES.map((f, i) => html`
        <li class="feature${i === 0 ? ' is-active' : ''}" data-feature="${i}" data-reveal>
          <div class="feature__visual" aria-hidden="true">${visual(f)}</div>
          <p class="feature__n">${f.n}</p>
          <h3>${f.title}</h3>
          <p class="feature__kicker">${f.kicker}</p>
          <p class="feature__copy">${f.copy}</p>
          <p><span class="tag tag--target">${f.tag}</span></p>
        </li>`)}
      </ol>
    </div>
  </div>
</section>`;
}
