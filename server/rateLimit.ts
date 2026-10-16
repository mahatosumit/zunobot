/**
 * Small in-memory sliding-window limiter. Keys are opaque strings (we pass a salted hash of the client
 * address, never the address itself). State is process-local: fine for a single instance. If you scale to
 * several instances, move this to a shared store (Redis, a CDN/WAF rule, etc.).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt. Returns `allowed: false` plus a Retry-After hint once the budget is spent. */
  take(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const t = this.now();
    this.sweep(t);
    const recent = (this.hits.get(key) ?? []).filter((h) => t - h < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? t;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - t) / 1000)) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private sweep(t: number): void {
    if (t - this.lastSweep < this.windowMs / 2) return;
    this.lastSweep = t;
    for (const [key, list] of this.hits) {
      const fresh = list.filter((h) => t - h < this.windowMs);
      if (fresh.length === 0) this.hits.delete(key);
      else this.hits.set(key, fresh);
    }
  }

  /** Test helper. */
  get size(): number {
    return this.hits.size;
  }
}
