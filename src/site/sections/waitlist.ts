import { html, type Safe } from '../html';
import { icons } from '../icons';
import { INTERESTS, LIMITS } from '../../../shared/waitlist';

const BENEFITS = [
  'Occasional development updates with meaningful progress, not inflated claims.',
  'Optional invitations to surveys, feedback sessions or demonstrations.',
  'Early notice of any pilot, and a clear description of its scope.',
];

export function waitlist(contactEmail: string): Safe {
  return html`
<section class="section waitlist" id="waitlist" aria-labelledby="waitlist-title">
  <div class="waitlist__bg" aria-hidden="true"><span class="waitlist__orb"></span></div>
  <div class="container waitlist__grid">
    <div class="waitlist__copy">
      <p class="eyebrow" data-reveal>Early-access waitlist</p>
      <h2 id="waitlist-title" data-reveal style="--d:60ms">Help shape the future of home robotics.</h2>
      <p class="lede" data-reveal style="--d:120ms">Be among the people who help us define what a genuinely useful home robot should do. Join the ZunoBot early-access waitlist for product updates, research opportunities, and announcements about future access.</p>
      <ul class="waitlist__benefits" data-reveal style="--d:180ms">${BENEFITS.map((b) => html`<li>${b}</li>`)}</ul>
      <p class="waitlist__fine" data-reveal style="--d:240ms"><strong>Free, and no payment is taken.</strong> The waitlist is an expression of interest. It is not an order or a deposit, it does not reserve a unit, and it does not guarantee access.</p>
    </div>

    <div class="waitlist__card on-light" data-waitlist data-reveal style="--d:120ms">
      <form class="wl-form" action="/api/waitlist" method="post" novalidate data-wl-form aria-labelledby="wl-heading"${contactEmail ? html` data-contact="${contactEmail}"` : ''}>
        <h3 id="wl-heading" class="wl-form__title">Join the waitlist</h3>
        <p class="wl-form__req">Name and email are required. Everything else is optional.</p>

        <div class="field">
          <label for="wl-name">Name</label>
          <input id="wl-name" name="name" type="text" autocomplete="name" required maxlength="${LIMITS.name}" aria-describedby="wl-name-err">
          <p class="field__err" id="wl-name-err" hidden></p>
        </div>
        <div class="field">
          <label for="wl-email">Email address</label>
          <input id="wl-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="${LIMITS.email}" spellcheck="false" autocapitalize="off" aria-describedby="wl-email-err">
          <p class="field__err" id="wl-email-err" hidden></p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="wl-country">Country or region <span class="field__opt">Optional</span></label>
            <input id="wl-country" name="country" type="text" autocomplete="country-name" maxlength="${LIMITS.country}" aria-describedby="wl-country-err">
            <p class="field__err" id="wl-country-err" hidden></p>
          </div>
          <div class="field">
            <label for="wl-interest">Main interest <span class="field__opt">Optional</span></label>
            <select id="wl-interest" name="interest" aria-describedby="wl-interest-err">
              <option value="">Choose one</option>
              ${INTERESTS.map((i) => html`<option value="${i.value}">${i.label}</option>`)}
            </select>
            <p class="field__err" id="wl-interest-err" hidden></p>
          </div>
        </div>
        <div class="field">
          <label for="wl-message">What would you want ZunoBot to help with? <span class="field__opt">Optional</span></label>
          <textarea id="wl-message" name="message" rows="4" maxlength="${LIMITS.message}" aria-describedby="wl-message-count wl-message-err"></textarea>
          <p class="field__count" id="wl-message-count"><span data-wl-count>0</span> / ${LIMITS.message}</p>
          <p class="field__err" id="wl-message-err" hidden></p>
        </div>

        <fieldset class="checks">
          <legend class="sr-only">Optional contact preferences</legend>
          <label class="check"><input type="checkbox" name="researchOptIn"><span>I am open to being invited to surveys or research conversations.</span></label>
          <label class="check"><input type="checkbox" name="marketingOptIn"><span>Send me occasional ZunoBot development updates.</span></label>
        </fieldset>

        <div class="hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>

        <div class="wl-alert" role="alert" tabindex="-1" hidden data-wl-alert></div>
        <button class="btn btn--primary wl-submit" type="submit" data-wl-submit><span class="wl-submit__label">Join the Waitlist</span><span class="spinner" aria-hidden="true"></span></button>
        <p class="wl-form__notice">We use your details to manage the waitlist and to contact you about early access. Optional updates and research invitations are sent only if you tick the boxes above. Read the <a href="/privacy">privacy notice</a>.</p>
        <noscript><p class="wl-noscript">This form needs JavaScript to send your details securely.${contactEmail ? html` You can also write to <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}</p></noscript>
      </form>

      <div class="wl-success" hidden tabindex="-1" data-wl-success role="status">
        <svg class="wl-success__check" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 33l9 9 16-18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>You are on the list.</h3>
        <p>Thank you, <span data-wl-name></span>. Your details are stored. If you had already joined with this address, we kept your original place and updated your answers.</p>
        <p>There is no automatic confirmation email yet, so there is nothing to look for in your inbox. We will be in touch when there is real progress to share. Joining does not reserve a unit or guarantee access.</p>
        <div class="wl-success__actions">
          <a class="btn btn--ghost btn--sm" href="#naviq-os">Read about NAVIQ OS ${icons.arrowRight}</a>
          <button class="btn btn--ghost btn--sm" type="button" data-wl-again>Add another person</button>
        </div>
      </div>
    </div>
  </div>
</section>`;
}
