import { html, type Safe } from '../html';

const PRINCIPLES = [
  { t: 'Useful before impressive', d: 'Choose capabilities by the problem they solve, not by how futuristic they look in a demo.' },
  { t: 'Human-centred', d: 'Make status, permissions and intended behaviour understandable to a non-expert.' },
  { t: 'Safety by architecture', d: 'Do not let probabilistic AI bypass deterministic movement and actuator constraints.' },
  { t: 'Built to evolve', d: 'Design for maintainability, software iteration and replaceable components where practical.' },
  { t: 'Evidence over claims', d: 'Tell a visual concept, a working prototype, a validated capability and a production-ready feature apart.' },
];
const STAGES = [
  { t: 'Waitlist and discovery', d: 'Understand demand, users, high-value tasks and the limits people will not accept.', now: true },
  { t: 'Design-partner review', d: 'Challenge assumptions with a small group of target users.' },
  { t: 'Prototype validation', d: 'Evaluate movement, sensing, interaction, safety, reliability, setup and maintenance.' },
  { t: 'Controlled pilot', d: 'Test the agreed feature set with invited participants.' },
  { t: 'Production decision', d: 'Commit to cost, manufacturing, quality, support, compliance and delivery, only on evidence.' },
];
const LADDER = ['Visual concept', 'Working prototype', 'Validated capability', 'Production-ready feature'];

export function approach(): Safe {
  return html`
<section class="section section--graphite approach" id="approach" aria-labelledby="approach-title">
  <div class="container">
    <div class="approach__top">
      <div class="section__head" data-reveal>
        <p class="eyebrow">Our approach</p>
        <h2 id="approach-title">Evidence before claims.</h2>
        <p class="lede">We would rather ship fewer things we can prove than many we cannot. ZunoBot is being built on five principles, and a staged path from concept to product.</p>
      </div>
      <ul class="ladder" aria-label="How we describe the status of a feature" data-reveal>
        ${LADDER.map((l, i) => html`<li${i === 0 ? ' aria-current="true"' : ''}><span>${l}</span>${i === 0 ? html`<em>Where the material on this site sits</em>` : ''}</li>`)}
      </ul>
    </div>
    <ul class="approach__principles">
      ${PRINCIPLES.map((p, i) => html`<li data-reveal style="--d:${i * 40}ms"><h3>${p.t}</h3><p>${p.d}</p></li>`)}
    </ul>
    <h3 class="approach__h" data-reveal>From interest to a real product</h3>
    <ol class="stages">
      ${STAGES.map((s, i) => html`
      <li class="stage${s.now ? ' is-now' : ''}" data-reveal style="--d:${i * 50}ms">
        <span class="stage__n">${i + 1}</span>
        ${s.now ? html`<span class="tag tag--commit">We are here</span>` : ''}
        <h4>${s.t}</h4><p>${s.d}</p>
      </li>`)}
    </ol>
    <p class="approach__foot" data-reveal>The waitlist is how we learn which jobs people value, how much limitation they will accept, and what to build first. It is not a count of emails.</p>
  </div>
</section>`;
}
