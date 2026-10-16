import { initNav } from './nav';
import { initReveal } from './reveal';
import { initHero } from './hero';
import { initGallery } from './gallery';
import { initFeatures } from './features';
import { initExplore } from './explore';
import { initNaviq } from './naviq';
import { initWaitlist } from './waitlist';
import { initYear } from './year';

function boot(): void {
  initNav();
  initReveal();
  initHero();
  initGallery();
  initFeatures();
  initExplore();
  initNaviq();
  initWaitlist();
  initYear();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
