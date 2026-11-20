// Seeded pseudo-random utilities. Every random decision in the workbench goes
// through an Rng instance so a session can be reproduced from its seed.

/** Hash an arbitrary string to a 32-bit unsigned integer (FNV-1a). */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
    this.state = this.seed || 0x9e3779b9;
  }

  /** mulberry32 — uniform float in [0, 1). */
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min = 0, max = 1) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  bool(p = 0.5) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /** Fisher–Yates shuffle, returns a new array. */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  sample(arr, n) { return this.shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length))); }

  /** Weighted pick from [{weight, value}] or [[value, weight]]. */
  weighted(items) {
    const norm = items.map((it) => (Array.isArray(it) ? { value: it[0], weight: it[1] } : it));
    const total = norm.reduce((s, it) => s + it.weight, 0);
    let r = this.next() * total;
    for (const it of norm) { if ((r -= it.weight) < 0) return it.value; }
    return norm[norm.length - 1].value;
  }

  /** Derive an independent child stream (stable for a given label). */
  fork(label) { return new Rng(hashString(`${this.seed}:${label}`)); }
}

/**
 * Balanced assignment: repeats `levels` to fill `n` slots as evenly as possible,
 * then shuffles. Used for counterbalancing exposure durations and delays.
 */
export function balancedSequence(levels, n, rng) {
  const out = [];
  const base = rng.shuffle(levels);
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return rng.shuffle(out);
}

export function randomId(prefix = 'id') {
  const c = globalThis.crypto;
  const raw = c?.randomUUID ? c.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${raw}`;
}
