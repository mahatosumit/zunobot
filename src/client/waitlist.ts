import { $ } from './dom';
import { validateWaitlist, type FieldErrors, type FieldName, type WaitlistApiResponse } from '../../shared/waitlist';

const FIELDS: FieldName[] = ['name', 'email', 'country', 'interest', 'message'];

export function initWaitlist(): void {
  const root = $('[data-waitlist]');
  const form = $<HTMLFormElement>('[data-wl-form]');
  const success = $('[data-wl-success]');
  const alertBox = $('[data-wl-alert]');
  const submit = $<HTMLButtonElement>('[data-wl-submit]');
  const count = $('[data-wl-count]');
  if (!root || !form || !success || !alertBox || !submit) return;

  const contactEmail = form.dataset.contact ?? '';
  const input = (name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const err = (name: string): HTMLElement => document.getElementById(`wl-${name}-err`) as HTMLElement;

  let token = '';
  let tokenAt = 0;
  let submitting = false;
  const touched = new Set<FieldName>();

  async function fetchToken(): Promise<void> {
    try {
      const res = await fetch('/api/waitlist/token', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = (await res.json()) as { token?: string };
      token = data.token ?? '';
      tokenAt = Date.now();
    } catch {
      /* the submit handler retries */
    }
  }
  // Issue a token only once someone is actually near the form
  let tokenRequested = false;
  const warm = (): void => { if (!tokenRequested) { tokenRequested = true; void fetchToken(); } };
  form.addEventListener('focusin', warm, { once: true });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { warm(); io.disconnect(); } }, { rootMargin: '500px' });
    io.observe(form);
  } else warm();

  const values = (): Record<string, unknown> => ({
    name: input('name').value,
    email: input('email').value,
    country: input('country').value,
    interest: input('interest').value,
    message: input('message').value,
    marketingOptIn: (input('marketingOptIn') as HTMLInputElement).checked,
    researchOptIn: (input('researchOptIn') as HTMLInputElement).checked,
  });

  function showFieldErrors(errors: FieldErrors, only?: FieldName): void {
    for (const f of FIELDS) {
      if (only && f !== only) continue;
      const box = err(f);
      const el = input(f);
      const msg = errors[f];
      box.hidden = !msg;
      box.textContent = msg ?? '';
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    }
  }
  const currentErrors = (): FieldErrors => { const r = validateWaitlist(values()); return r.ok ? {} : r.errors; };

  for (const f of FIELDS) {
    const el = input(f);
    el.addEventListener('blur', () => { touched.add(f); showFieldErrors(currentErrors(), f); });
    // Once a field has shown an error, clear it as soon as it becomes valid
    el.addEventListener('input', () => { if (touched.has(f) || el.getAttribute('aria-invalid') === 'true') showFieldErrors(currentErrors(), f); });
  }
  input('message').addEventListener('input', () => { if (count) count.textContent = String(input('message').value.length); });

  function showAlert(html: Node[]): void {
    alertBox!.replaceChildren(...html);
    alertBox!.hidden = false;
    alertBox!.focus();
  }
  const clearAlert = (): void => { alertBox!.hidden = true; alertBox!.replaceChildren(); };
  const p = (text: string, strong = false): HTMLElement => {
    const el = document.createElement(strong ? 'strong' : 'span');
    el.textContent = text;
    return el;
  };

  function setBusy(on: boolean): void {
    submitting = on;
    submit!.disabled = on;
    submit!.classList.toggle('is-loading', on);
    form!.setAttribute('aria-busy', String(on));
    const label = submit!.querySelector('.wl-submit__label');
    if (label) label.textContent = on ? 'Sending…' : 'Join the Waitlist';
  }

  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  async function post(attempt = 0): Promise<{ http: number; body: WaitlistApiResponse | null }> {
    if (!token) await fetchToken();
    // The server rejects forms submitted within ~2s of loading; wait out the remainder instead of failing.
    const wait = 2300 - (Date.now() - tokenAt);
    if (wait > 0) await sleep(wait);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values(), website: (input('website') as HTMLInputElement).value, token }),
        signal: ctrl.signal,
      });
      let body: WaitlistApiResponse | null = null;
      try { body = (await res.json()) as WaitlistApiResponse; } catch { body = null; }
      if (body?.status === 'token' && attempt === 0) { token = ''; return post(1); }
      return { http: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  async function onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (submitting) return;
    clearAlert();
    const result = validateWaitlist(values());
    if (!result.ok) {
      FIELDS.forEach((f) => touched.add(f));
      showFieldErrors(result.errors);
      const first = FIELDS.find((f) => result.errors[f]);
      if (first) input(first).focus();
      return;
    }
    showFieldErrors({});
    setBusy(true);
    try {
      const { http, body } = await post();
      if (http === 200 && body?.status === 'ok') {
        const nameEl = $('[data-wl-name]', success!);
        if (nameEl) nameEl.textContent = result.value.name.split(' ')[0] ?? result.value.name;
        form!.hidden = true;
        success!.hidden = false;
        success!.focus();
        token = '';
        return;
      }
      if (http === 422 && body?.status === 'invalid') {
        touched.add('name');
        showFieldErrors(body.errors);
        const first = FIELDS.find((f) => body.errors[f]);
        if (first) input(first).focus();
        return;
      }
      if (http === 429) {
        const secs = body?.status === 'rate_limited' ? body.retryAfterSeconds : 60;
        const mins = Math.max(1, Math.ceil(secs / 60));
        showAlert([p('Too many attempts. ', true), p(`Please wait about ${mins} minute${mins === 1 ? '' : 's'} and try again. Your answers are still in the form.`)]);
        return;
      }
      throw new Error('server');
    } catch {
      const nodes: Node[] = [p('We could not save your details just now. ', true), p('Nothing was lost: your answers are still in the form. Check your connection and press the button to try again.')];
      if (contactEmail) {
        const a = document.createElement('a');
        a.href = `mailto:${contactEmail}`;
        a.textContent = contactEmail;
        nodes.push(p(' If it keeps failing, you can write to '), a, p('.'));
      }
      showAlert(nodes);
    } finally {
      setBusy(false);
    }
  }
  form.addEventListener('submit', (e) => { void onSubmit(e); });

  $('[data-wl-again]', success)?.addEventListener('click', () => {
    form.reset();
    if (count) count.textContent = '0';
    touched.clear();
    showFieldErrors({});
    clearAlert();
    success.hidden = true;
    form.hidden = false;
    input('name').focus();
    void fetchToken();
  });

}
