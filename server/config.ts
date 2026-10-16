import { randomBytes } from 'node:crypto';
import path from 'node:path';

export interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
  tokenSecret: string;
  /** True when TOKEN_SECRET was generated at start-up (tokens then do not survive a restart). */
  tokenSecretIsEphemeral: boolean;
  trustProxy: boolean;
  allowedOrigins: string[];
  staticDir: string;
  /** Minimum seconds between loading the form and submitting it (bots tend to post instantly). */
  minFormSeconds: number;
  /** A form token stays valid for this long. */
  maxFormSeconds: number;
  submitLimit: { max: number; windowSeconds: number };
  tokenLimit: { max: number; windowSeconds: number };
  globalSubmitLimit: { max: number; windowSeconds: number };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<ServerConfig> = {}): ServerConfig {
  const secret = env.WAITLIST_TOKEN_SECRET?.trim();
  const cfg: ServerConfig = {
    port: Number(env.PORT) || 8787,
    host: env.HOST?.trim() || '127.0.0.1',
    dbPath: path.resolve(env.WAITLIST_DB_PATH?.trim() || './data/waitlist.db'),
    tokenSecret: secret || randomBytes(32).toString('hex'),
    tokenSecretIsEphemeral: !secret,
    trustProxy: env.TRUST_PROXY === 'true',
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    staticDir: path.resolve(env.STATIC_DIR?.trim() || './dist'),
    minFormSeconds: 2,
    maxFormSeconds: 60 * 60 * 6,
    submitLimit: { max: 5, windowSeconds: 600 },
    tokenLimit: { max: 40, windowSeconds: 600 },
    globalSubmitLimit: { max: 400, windowSeconds: 3600 },
  };
  return { ...cfg, ...overrides };
}
