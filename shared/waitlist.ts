/**
 * Waitlist contract shared by the browser form and the server.
 * Pure TypeScript, no DOM and no Node APIs, so it can run in both places.
 */

export const INTERESTS = [
  { value: 'home', label: 'At home' },
  { value: 'education', label: 'Education or learning' },
  { value: 'research', label: 'Research' },
  { value: 'development', label: 'Development or making' },
  { value: 'other', label: 'Something else' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];

export const LIMITS = { name: 80, email: 254, country: 80, message: 600 } as const;

/** Bump when the wording of the consent text on the form changes. Stored with every registration. */
export const CONSENT_VERSION = '2026-10-v1';

export interface WaitlistSubmission {
  name: string;
  email: string;
  country: string;
  interest: Interest | '';
  message: string;
  marketingOptIn: boolean;
  researchOptIn: boolean;
  /** Honeypot. Real people never see or fill this field. */
  website: string;
  /** Signed, time-stamped token issued by GET /api/waitlist/token. */
  token: string;
}

export type FieldName = 'name' | 'email' | 'country' | 'interest' | 'message';
export type FieldErrors = Partial<Record<FieldName, string>>;

export interface CleanWaitlistEntry {
  name: string;
  email: string;
  country: string;
  interest: Interest | '';
  message: string;
  marketingOptIn: boolean;
  researchOptIn: boolean;
}

export type ValidationResult =
  | { ok: true; value: CleanWaitlistEntry }
  | { ok: false; errors: FieldErrors };

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, drop control characters and collapse runs of spaces. Newlines are kept only when `multiline`. */
export function cleanText(value: unknown, multiline = false): string {
  if (typeof value !== 'string') return '';
  let v = value.normalize('NFC').replace(CONTROL_CHARS, '');
  v = multiline ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : v.replace(/[\r\n\t]+/g, ' ');
  return v.replace(/[  ]{2,}/g, ' ').trim();
}

export function normalizeEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

/** Pragmatic syntax check. Deliverability can only be proven by sending mail, which this project does not do. */
export function isPlausibleEmail(email: string): boolean {
  if (email.length < 6 || email.length > LIMITS.email) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64) return false;
  if (/\s/.test(email)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) return false; // ASCII / punycode domains only
  if (domain.split('.').some((label) => !label || label.startsWith('-') || label.endsWith('-') || label.length > 63)) {
    return false;
  }
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  return tld.length >= 2 && !/^\d+$/.test(tld);
}

export function validateWaitlist(raw: unknown): ValidationResult {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = cleanText(r.name);
  if (!name) errors.name = 'Please tell us your name.';
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  const email = normalizeEmail(r.email);
  if (!email) errors.email = 'Please enter your email address.';
  else if (!isPlausibleEmail(email)) errors.email = 'That email address doesn’t look right. Check for typos, for example name@example.com.';

  const country = cleanText(r.country);
  if (country.length > LIMITS.country) errors.country = `Please keep this under ${LIMITS.country} characters.`;

  const interestRaw = cleanText(r.interest);
  const interest = interestRaw as Interest | '';
  if (interestRaw && !INTERESTS.some((i) => i.value === interestRaw)) errors.interest = 'Please choose one of the listed options.';

  const message = cleanText(r.message, true);
  if (message.length > LIMITS.message) errors.message = `Please keep this under ${LIMITS.message} characters (currently ${message.length}).`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      email,
      country,
      interest,
      message,
      marketingOptIn: r.marketingOptIn === true,
      researchOptIn: r.researchOptIn === true,
    },
  };
}

/** Responses the API can return. The browser relies on `status` only. */
export type WaitlistApiResponse =
  | { status: 'ok' }
  | { status: 'invalid'; errors: FieldErrors }
  | { status: 'token' } // anti-spam token missing, expired or too fresh: fetch a new one and retry
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'error' };
