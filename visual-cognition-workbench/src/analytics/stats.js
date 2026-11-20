// Small, dependency-free statistics helpers.
import { Rng } from '../core/rng.js';

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const sd = (xs) => { if (xs.length < 2) return NaN; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
export function quantile(xs, q) {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b); const pos = (s.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (xs) => quantile(xs, 0.5);

/** Inverse standard normal CDF (Acklam's approximation). */
export function probit(p) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5; const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** d′ and criterion c with the log-linear correction (Hautus, 1995). */
export function dPrime({ hits, misses, falseAlarms, correctRejections }) {
  const H = (hits + 0.5) / (hits + misses + 1);
  const F = (falseAlarms + 0.5) / (falseAlarms + correctRejections + 1);
  return { hitRate: H, faRate: F, dPrime: probit(H) - probit(F), c: -0.5 * (probit(H) + probit(F)), n: hits + misses + falseAlarms + correctRejections };
}

/**
 * Cluster bootstrap of a mean: items are resampled by trial (cluster) because
 * questions about the same image are not independent.
 */
export function clusterBootstrap(items, { cluster = (it) => it.trialIndex, value = (it) => it.score, B = 1000, seed = 1 } = {}) {
  const groups = new Map();
  for (const it of items) { const k = cluster(it); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(value(it)); }
  const gs = [...groups.values()];
  const point = mean(items.map(value));
  if (gs.length < 2) return { mean: point, lo: NaN, hi: NaN, se: NaN, n: items.length, clusters: gs.length };
  const rng = new Rng(seed);
  const stats = [];
  for (let b = 0; b < B; b++) {
    let s = 0; let n = 0;
    for (let i = 0; i < gs.length; i++) { const g = gs[Math.floor(rng.next() * gs.length)]; for (const v of g) { s += v; n++; } }
    stats.push(s / n);
  }
  return { mean: point, lo: quantile(stats, 0.025), hi: quantile(stats, 0.975), se: sd(stats), n: items.length, clusters: gs.length };
}

/** Ordinary least squares y = a + b x, with standard error of b and R². */
export function ols(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = mean(xs); const my = mean(ys);
  let sxx = 0; let sxy = 0; let syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  if (sxx === 0) return null;
  const b = sxy / sxx; const a = my - b * mx;
  const sse = ys.reduce((s, y, i) => s + (y - (a + b * xs[i])) ** 2, 0);
  const seB = Math.sqrt(sse / Math.max(1, n - 2) / sxx);
  const t = tCrit(n - 2);
  return { intercept: a, slope: b, seSlope: seB, slopeLo: b - t * seB, slopeHi: b + t * seB, r2: syy ? 1 - sse / syy : 0, n };
}

export function tCrit(df) {
  const table = { 1: 12.71, 2: 4.3, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23, 12: 2.18, 15: 2.13, 20: 2.09, 25: 2.06, 30: 2.04, 40: 2.02, 60: 2.0 };
  if (df <= 0) return NaN;
  const keys = Object.keys(table).map(Number);
  for (const k of keys) if (df <= k) return table[k];
  return 1.96;
}

/** Goodman–Kruskal gamma between ordinal x and y. */
export function gamma(xs, ys) {
  let c = 0; let d = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    const s = Math.sign(xs[i] - xs[j]) * Math.sign(ys[i] - ys[j]);
    if (s > 0) c++; else if (s < 0) d++;
  }
  return c + d ? (c - d) / (c + d) : NaN;
}
