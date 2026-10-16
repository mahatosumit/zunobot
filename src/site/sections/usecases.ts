import { html, type Safe } from '../html';

const CASES = [
  { n: '01', title: 'Information and reminders, at a glance', benefit: 'Selected information and reminders at a friendly, physical point in the room, so you do not have to reach for another screen.',
    depends: 'Final software, the services you choose and your permission.' },
  { n: '02', title: 'A friendlier interface at home', benefit: 'A face and clear status cues make it obvious whether the robot is ready, working, waiting or stopped.',
    depends: 'Display and interface integration, tested with real users.' },
  { n: '03', title: 'Selected connected workflows', benefit: 'Bring a few supported devices or services together in one place, after you set them up and approve them.',
    depends: 'Compatibility testing for each named device or service. No universal compatibility is implied.' },
  { n: '04', title: 'Learning, experimenting, demonstrating', benefit: 'A hands-on way to explore robotics and human–machine interaction in supervised, controlled settings.',
    depends: 'Published interfaces, documentation and safety guidance for educators and developers.' },
  { n: '05', title: 'Capabilities as they mature', benefit: 'New software abilities arrive only once they have been built, tested and clearly described.',
    depends: 'Engineering progress and validation. Nothing is promised in advance.' },
];

export function usecases(): Safe {
  return html`
<section class="section section--paper on-light usecases" id="use-cases" aria-labelledby="usecases-title">
  <div class="container usecases__grid">
    <div class="usecases__main">
      <div class="section__head" data-reveal>
        <p class="eyebrow">Everyday use cases</p>
        <h2 id="usecases-title">Moments we are designing for.</h2>
        <p class="lede">Relatable scenarios, described by the benefit to you, and by what each one depends on. None of these is a guarantee of performance in every home.</p>
      </div>
      <ol class="cases">
        ${CASES.map((c, i) => html`
        <li class="case" data-reveal style="--d:${i * 40}ms">
          <span class="case__n">${c.n}</span>
          <div>
            <h3>${c.title}</h3>
            <p class="case__benefit">${c.benefit}</p>
            <p class="case__depends"><span>Depends on</span>${c.depends}</p>
          </div>
        </li>`)}
      </ol>
    </div>
    <aside class="usecases__side" aria-label="What ZunoBot is not positioned as">
      <figure class="usecases__fig" data-reveal>
        <img src="/images/side-cutout.webp" width="465" height="819" loading="lazy" decoding="async" alt="ZunoBot concept render, side view: compact white robot with a faceted head, articulated arms and a rolling base.">
        <figcaption>Design concept render</figcaption>
      </figure>
      <div class="notfor" data-reveal>
        <h3>What ZunoBot is not positioned as</h3>
        <p>Not a general-purpose household worker, a caregiver, a supervisor for children, older adults or pets, a medical device, a security system, or a replacement for human supervision. The first product is meant to be narrow and well tested.</p>
      </div>
    </aside>
  </div>
</section>`;
}
