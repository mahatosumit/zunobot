import { $, $$, prefersReducedMotion, tabKeys } from './dom';
import { canAutoLoad3D, hasWebGL2 } from './webgl';
import type { ProductViewer } from './viewer';

export function initExplore(): void {
  const root = $('[data-explore]');
  const section = $('#explore');
  const stage = $('[data-stage]', root ?? document);
  const mount = $('[data-viewer-mount]');
  if (!root || !section || !stage || !mount) return;

  const tabs = $$<HTMLButtonElement>('[data-part]', root);
  const panels = $$<HTMLElement>('.part-panel', root);
  const hotspots = $$<HTMLButtonElement>('[data-hotspot]', root);
  const loadBtn = $<HTMLButtonElement>('[data-load-3d]', root);
  const resetBtn = $<HTMLButtonElement>('[data-reset-view]', root);
  const spinBtn = $<HTMLButtonElement>('[data-toggle-spin]', root);
  const spinLabel = $('[data-spin-label]', root);
  const hint = $('[data-hint]', root);
  const badge = $('[data-badge]', root);
  const loading = $('[data-loading]', root);
  const status = $('[data-viewer-status]', root);

  let viewer: ProductViewer | null = null;
  let state: 'idle' | 'loading' | 'ready' = 'idle';
  let selected = tabs[0]?.dataset.part ?? 'display';
  let userSelected = false;

  const say = (msg: string): void => { if (status) status.textContent = msg; };

  function select(id: string, focusTab = false): void {
    selected = id;
    tabs.forEach((t) => {
      const on = t.dataset.part === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    panels.forEach((p) => { p.hidden = p.id !== `part-${id}`; });
    hotspots.forEach((h) => h.setAttribute('aria-pressed', String(h.dataset.hotspot === id)));
    if (viewer && userSelected) viewer.focusPart(id === 'naviq' ? null : id);
  }
  tabs.forEach((t) => t.addEventListener('click', () => { userSelected = true; select(t.dataset.part as string); }));
  tabKeys(tabs, (tab, focus) => { userSelected = true; select(tab.dataset.part as string, focus); }, window.matchMedia('(min-width: 961px)').matches);
  hotspots.forEach((h) => h.addEventListener('click', () => { userSelected = true; select(h.dataset.hotspot as string); }));
  select(selected);

  function restoreHotspots(): void {
    hotspots.forEach((h) => {
      h.style.removeProperty('--x');
      h.style.removeProperty('--y');
      h.style.opacity = '';
    });
  }

  function showFallback(message: string, retry: boolean): void {
    viewer?.dispose();
    viewer = null;
    state = 'idle';
    root!.classList.remove('is-3d');
    mount!.hidden = true;
    if (loading) loading.hidden = true;
    if (badge) badge.hidden = true;
    if (resetBtn) resetBtn.hidden = true;
    if (spinBtn) spinBtn.hidden = true;
    restoreHotspots();
    if (loadBtn) { loadBtn.hidden = !retry; loadBtn.disabled = false; loadBtn.lastChild!.textContent = retry ? ' Try 3D again' : ' Load interactive 3D'; }
    if (hint) hint.textContent = message;
    say(message);
  }

  async function load(): Promise<void> {
    if (state !== 'idle') return;
    state = 'loading';
    if (loadBtn) loadBtn.disabled = true;
    if (loading) loading.hidden = false;
    say('Loading the 3D view.');
    try {
      if (!hasWebGL2()) throw new Error('webgl2');
      const { createViewer } = await import('./viewer');
      mount!.hidden = false;
      const reduced = prefersReducedMotion();
      viewer = createViewer(mount!, {
        reducedMotion: reduced,
        onAnchors: (a) => {
          for (const h of hotspots) {
            const p = a[h.dataset.hotspot as string];
            if (!p) continue;
            h.style.setProperty('--x', `${p.x.toFixed(2)}%`);
            h.style.setProperty('--y', `${p.y.toFixed(2)}%`);
            h.style.opacity = p.facing ? '' : '0.25';
          }
        },
        onAutoRotateChange: (on) => {
          if (spinLabel) spinLabel.textContent = on ? 'Pause rotation' : 'Resume rotation';
          spinBtn?.setAttribute('aria-pressed', String(!on));
        },
        onLost: () => showFallback('The 3D view stopped because the graphics context was lost. Showing the render instead.', true),
      });
      mount!.tabIndex = 0;
      mount!.setAttribute('role', 'img');
      mount!.setAttribute('aria-roledescription', '3D viewer');
      mount!.setAttribute('aria-label', 'Interactive 3D view of a stylised ZunoBot model. Drag, or use the left and right arrow keys, to rotate. Press Home to reset the view.');
      state = 'ready';
      root!.classList.add('is-3d');
      if (loading) loading.hidden = true;
      if (badge) badge.hidden = false;
      if (loadBtn) loadBtn.hidden = true;
      if (resetBtn) resetBtn.hidden = false;
      if (spinBtn && !reduced) spinBtn.hidden = false;
      if (hint) hint.textContent = 'Drag to rotate, or focus the model and use the arrow keys.';
      say('3D view ready. This is a stylised model built from the design renders, not CAD geometry.');
      if (userSelected) viewer.focusPart(selected === 'naviq' ? null : selected);
    } catch {
      showFallback('Interactive 3D is not available here, so the design render is shown instead.', hasWebGL2());
    }
  }

  loadBtn?.addEventListener('click', () => { void load(); });
  resetBtn?.addEventListener('click', () => viewer?.resetView());
  spinBtn?.addEventListener('click', () => { if (viewer) viewer.setAutoRotate(!viewer.autoRotate); });

  if (canAutoLoad3D() && hasWebGL2() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); void load(); }
    }, { rootMargin: '400px 0px' });
    io.observe(stage);
  } else if (loadBtn) {
    loadBtn.hidden = false;
  }
}
