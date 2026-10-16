import { html, type Safe } from '../html';
import type { SiteConfig } from '../config';
import { LIMITS } from '../../../shared/waitlist';

/**
 * Plain-language notice describing what the waitlist in this repository actually does.
 * It has not been reviewed by a lawyer and the operator's legal identity and contact route are
 * business decisions this code cannot make. See docs/LAUNCH-CHECKLIST.md.
 */
export function privacyPage(site: SiteConfig): Safe {
  return html`
<section class="section section--obsidian prose" aria-labelledby="privacy-title">
  <div class="container prose__wrap">
    <p class="eyebrow">Privacy notice</p>
    <h1 id="privacy-title">How the ZunoBot waitlist handles your details</h1>
    <p class="prose__meta">Last updated 16 October 2026</p>
    <p class="prose__draft"><strong>Draft status.</strong> This notice describes the waitlist as it is built today, in plain language. It has not yet had a legal review.</p>

    <h2>What this covers</h2>
    <p>This notice covers the early-access waitlist on this website. It is an expression of interest. It is not an order, a deposit or a reservation, and no payment is taken.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Required:</strong> your name and email address.</li>
      <li><strong>Optional:</strong> your country or region, your main interest, and a short message (up to ${LIMITS.message} characters) about what you would want ZunoBot to help with.</li>
      <li><strong>Your choices:</strong> whether you ticked the optional boxes for development updates and for research invitations, the version of the form wording you saw, and when you signed up or last updated your entry.</li>
    </ul>
    <p>Please do not put sensitive personal information in the free-text message. We do not ask for it.</p>

    <h2>What we do not collect</h2>
    <ul>
      <li>We do not store your IP address. The server briefly keeps a salted, one-way hash of it in memory, only to limit abuse, and it is not written to the database or logs.</li>
      <li>We do not log your name, email address or message.</li>
      <li>This site sets no cookies and uses no analytics or advertising trackers.</li>
    </ul>

    <h2>Why we use it</h2>
    <ul>
      <li>To keep the waitlist and contact you about early access to ZunoBot.</li>
      <li>To understand which uses people care about, so we can decide what to build first.</li>
      <li>To send development updates, or invite you to surveys and research conversations, <strong>only if you ticked those optional boxes</strong>.</li>
    </ul>

    <h2>Where it is stored and who sees it</h2>
    <p>Entries are stored in a database on the server that runs this site. They are used by the ZunoBot team and are not sold. The hosting provider that runs the server processes the data on our behalf.</p>

    <h2>How long we keep it</h2>
    <p>We keep your entry until you ask us to delete it or until the early-access programme ends, whichever comes first.</p>

    <h2>Your choices and rights</h2>
    <ul>
      <li><strong>Change or withdraw an opt-in:</strong> submit the waitlist form again with the same email address and untick the box. Your latest choice is the one we keep.</li>
      <li><strong>Access, correct or delete your data:</strong> ${site.contactEmail ? html`email <a href="mailto:${site.contactEmail}">${site.contactEmail}</a>.` : 'an official contact address has not been published yet. It will be listed here before the waitlist is promoted publicly.'}</li>
      <li>Depending on where you live, you may have further rights under local law, including the right to complain to your data protection authority.</li>
    </ul>

    <h2>Security</h2>
    <p>Submissions are validated on the server, rate limited and protected against basic automated abuse. No system is perfectly secure, and we will not make claims about it that we cannot verify.</p>

    <h2>Changes</h2>
    <p>If we change how the waitlist works, we will update this page and its date. <a href="/">Back to the home page</a>.</p>
  </div>
</section>`;
}
