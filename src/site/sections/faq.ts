import { html, type Safe } from '../html';
import { icons } from '../icons';

interface Item { q: string; a: Safe | string }
export const FAQ: Item[] = [
  { q: 'What exactly is ZunoBot?', a: 'ZunoBot is a pre-launch, compact home-robot concept: a wheeled robot with a display for a face, an approachable physical form and, in the current design, articulated arms. It is being developed as one product, hardware and software together.' },
  { q: 'What is NAVIQ OS?', a: 'NAVIQ OS is the planned machine-software and autonomy foundation behind ZunoBot. It is designed to keep flexible, AI-driven planning separate from a deterministic safety and control layer. Details such as public release, licensing and supported interfaces will be announced when they are settled.' },
  { q: 'What is the relationship between the robot and its operating software?', a: 'The robot is the product, and NAVIQ OS is the software foundation it is built around. Our engineering team is integrating them as one system: sensors, motion control, interaction and safety boundaries, so you experience one coherent robot rather than unrelated parts.' },
  { q: 'What can ZunoBot do?', a: 'The direction is a friendly physical interface for selected information, reminders and simple assistance, with a mobile base for indoor movement and, possibly, selected connected workflows. These are design intentions, not a feature list. A launch feature list will state exactly what a delivered version can and cannot do.' },
  { q: 'Which capabilities are currently available?', a: 'None are offered to the public today. ZunoBot is at the design-concept stage, and the images on this site are design renders. We will describe a capability as available only after it has been demonstrated and validated on the target hardware.' },
  { q: 'Will it work with my smart-home devices?', a: 'No universal compatibility is implied. Selected devices and services may be supported as engineering and compatibility testing progress, and we would publish a verified list for any release. Tell us what you use on the waitlist form so we can prioritise.' },
  { q: 'How will privacy and data processing work?', a: html`Privacy is a design commitment, not yet a shipped feature: explicit permissions for connected services, clear status communication, data minimisation, and defined local and cloud boundaries. Before release we will publish which sensors are fitted, what runs on the robot and what data leaves it. For this website, see the <a href="/privacy">privacy notice</a> on how waitlist details are handled.` },
  { q: 'Is the robot available to purchase?', a: 'No. ZunoBot is not for sale, and there is no ordering, deposit or preorder. Joining the waitlist is an expression of interest. It does not reserve a unit or guarantee access.' },
  { q: 'How do I join the waitlist?', a: html`Use the short form in the <a href="#waitlist">waitlist section</a>. Name and email are all that is required. Your use case and what you would want ZunoBot to help with are optional. It is free, and no payment is needed.` },
  { q: 'When will pricing and launch timing be announced?', a: 'We have not set a price or a launch date. They will be announced after prototype validation, costing, manufacturing and support planning, and a review of applicable compliance requirements. We will not announce dates we cannot stand behind.' },
];

export function faq(): Safe {
  return html`
<section class="section section--obsidian faq" id="faq" aria-labelledby="faq-title">
  <div class="container faq__grid">
    <div class="section__head" data-reveal>
      <p class="eyebrow">FAQ</p>
      <h2 id="faq-title">Questions, answered plainly.</h2>
      <p class="lede">If something is not decided yet, the answer says so.</p>
    </div>
    <div class="faq__list" data-faq>
      ${FAQ.map((f) => html`
      <details class="qa" name="faq">
        <summary><span>${f.q}</span>${icons.plus}</summary>
        <div class="qa__a"><p>${f.a}</p></div>
      </details>`)}
    </div>
  </div>
</section>`;
}
