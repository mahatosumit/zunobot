import { html, type Safe } from '../html';

const PRINCIPLES = [
  { t: 'Explicit permissions for connected services', d: 'Connected services are meant to stay off until you set them up and approve them, with the least access needed and confirmation for consequential actions.' },
  { t: 'Clear communication about sensing and status', d: 'People should be able to see what the robot is doing. We will publish the sensors actually fitted and what each one is for.' },
  { t: 'Data minimisation', d: 'Collect only the data a clearly explained feature needs, and no more.' },
  { t: 'Defined local and cloud boundaries', d: 'Before release we will document which tasks run on the robot, which need connectivity or outside providers, and what data is transmitted.' },
  { t: 'Predictable controls and safe stopping', d: 'A reachable stop mechanism, hard motion limits, watchdogs and fault handling, tested against failure conditions and not only ideal demos.' },
  { t: 'A permission boundary between planning and movement', d: 'AI-generated intent is kept separate from low-level actuation. The safety and control layer can reject a proposal.' },
];
const QUESTIONS = ['What can ZunoBot sense?', 'What can it control?', 'Where does data go?', 'When does it move?', 'How do I stop it?', 'What happens when something fails?'];

export function trust(): Safe {
  return html`
<section class="section section--graphite trust" id="trust" aria-labelledby="trust-title">
  <div class="container trust__grid">
    <div class="trust__intro">
      <div class="section__head" data-reveal>
        <p class="eyebrow">Privacy and safety</p>
        <h2 id="trust-title">Designed around trust.</h2>
        <p class="lede">A robot in a home is closer to people than most connected devices, so trust has to be designed in, not added afterwards.</p>
      </div>
      <p class="trust__status" data-reveal><span class="tag tag--commit">Design commitment</span> These are the principles ZunoBot is being engineered to follow. They are commitments about design, not statements that the software already does these things. We will say when each one is implemented and verified.</p>
      <div class="trust__questions" data-reveal>
        <h3>Before you ever consider buying a robot, you should be able to answer:</h3>
        <ul>${QUESTIONS.map((q) => html`<li>${q}</li>`)}</ul>
      </div>
    </div>
    <ol class="principles">
      ${PRINCIPLES.map((p, i) => html`
      <li data-reveal style="--d:${i * 40}ms"><span class="principles__n">0${i + 1}</span><div><h3>${p.t}</h3><p>${p.d}</p></div></li>`)}
    </ol>
  </div>
</section>`;
}
