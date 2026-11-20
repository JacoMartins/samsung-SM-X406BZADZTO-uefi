// Lexical-semantic matching for free-text answers.
//
// This is deliberately transparent and deterministic: tokenisation, light
// stemming, a synonym/hypernym lexicon, typo-tolerant matching and negation
// detection. It is NOT a language model; answers phrased in ways the lexicon
// does not cover can be under-credited, which is why free-text scores are
// always reported with their matched evidence so they can be audited.
import { CONCEPTS, HYPERNYM_TERMS } from './lexicon.js';

const NEGATORS = new Set(['no', 'not', 'without', 'none', 'never', 'nobody', 'nothing', 'neither', 'nor', 'isnt', 'arent', 'wasnt', 'werent', 'dont', 'didnt', 'doesnt', 'cant', 'couldnt']);
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'are', 'was', 'were', 'it', 'its', 'with', 'some', 'there', 'that', 'this', 'i', 'saw', 'see', 'think', 'maybe', 'probably', 'like', 'very', 'by', 'for', 'be', 'as', 'from', 'one', 'two', 'three']);

export function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
}

export function stem(w) {
  if (w.length <= 3) return w;
  let s = w;
  if (s.endsWith('ies') && s.length > 4) s = `${s.slice(0, -3)}y`;
  else if (/(ches|shes|sses|xes|zes)$/.test(s)) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us') && !s.endsWith('is')) s = s.slice(0, -1);
  if (s.endsWith('ing') && s.length > 5) { s = s.slice(0, -3); if (/([b-df-hj-np-tv-z])\1$/.test(s)) s = s.slice(0, -1); }
  else if (s.endsWith('ed') && s.length > 4) { s = s.slice(0, -2); if (/([b-df-hj-np-tv-z])\1$/.test(s)) s = s.slice(0, -1); }
  else if (s.endsWith('ly') && s.length > 5) s = s.slice(0, -2);
  if (s.endsWith('e') && s.length > 3) s = s.slice(0, -1);
  return s;
}

/** Optimal-string-alignment (Damerau–Levenshtein) distance with early exit. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function tolerance(len) { return len >= 10 ? 2 : len >= 5 ? 1 : 0; }
const fuzzyEq = (a, b) => { const t = tolerance(b.length); return t > 0 && a[0] === b[0] && editDistance(a, b, t) <= t; };

// phrase (as stemmed token array) -> concept keys
const PHRASES = [];
for (const [key, c] of Object.entries(CONCEPTS)) {
  for (const syn of c.syn) PHRASES.push({ key, tokens: tokenize(syn).map(stem), raw: syn });
}
PHRASES.sort((a, b) => b.tokens.length - a.tokens.length);
const HYPER_PHRASES = [];
for (const [h, terms] of Object.entries(HYPERNYM_TERMS)) for (const t of terms) HYPER_PHRASES.push({ hyper: h, tokens: tokenize(t).map(stem) });

function isNegated(tokens, idx) {
  for (let k = Math.max(0, idx - 3); k < idx; k++) if (NEGATORS.has(tokens[k])) return true;
  return false;
}

/**
 * Analyse text into concept mentions.
 * @returns {{ mentions: Array<{keys:string[], term:string, negated:boolean, fuzzy:boolean}>, hypernyms: Array<{hyper, negated}>, tokens:string[], stems:string[] }}
 */
export function analyze(text) {
  const tokens = tokenize(text);
  const stems = tokens.map(stem);
  const used = new Array(tokens.length).fill(false);
  const byStart = new Map();
  for (let i = 0; i < stems.length; i++) {
    for (const p of PHRASES) {
      const n = p.tokens.length;
      if (i + n > stems.length) continue;
      let ok = true; let fuzzy = false;
      for (let k = 0; k < n; k++) {
        const a = stems[i + k]; const b = p.tokens[k];
        if (a === b) continue;
        if (n === 1 && fuzzyEq(tokens[i + k], p.raw)) { fuzzy = true; continue; }
        ok = false; break;
      }
      if (!ok) continue;
      if ([...Array(n).keys()].some((k) => used[i + k] && byStart.get(i)?.len > n)) continue;
      const prev = byStart.get(i);
      if (prev && prev.len > n) continue;
      if (prev && prev.len === n) { if (!prev.keys.includes(p.key)) prev.keys.push(p.key); prev.fuzzy = prev.fuzzy && fuzzy; continue; }
      byStart.set(i, { keys: [p.key], len: n, term: tokens.slice(i, i + n).join(' '), negated: isNegated(tokens, i), fuzzy, index: i });
    }
  }
  // remove mentions nested inside longer ones
  const mentions = [];
  const covered = new Array(tokens.length).fill(false);
  for (const m of [...byStart.values()].sort((a, b) => b.len - a.len)) {
    if ([...Array(m.len).keys()].some((k) => covered[m.index + k])) continue;
    for (let k = 0; k < m.len; k++) covered[m.index + k] = true;
    mentions.push(m);
  }
  const hypernyms = [];
  stems.forEach((s, i) => { for (const h of HYPER_PHRASES) if (h.tokens.length === 1 && h.tokens[0] === s) hypernyms.push({ hyper: h.hyper, negated: isNegated(tokens, i), index: i }); });
  return { mentions: mentions.sort((a, b) => a.index - b.index), hypernyms, tokens, stems };
}

/** Does the text contain `term` (a concept key or a plain word/stem)? */
export function containsTerm(analysis, term) {
  if (CONCEPTS[term]) return analysis.mentions.some((m) => !m.negated && m.keys.includes(term));
  const st = stem(term.toLowerCase());
  return analysis.stems.some((s, i) => {
    if (isNegated(analysis.tokens, i) && !['empty', 'nobody', 'nothing'].includes(term)) return false;
    if (s === st) return true;
    if (st.length >= 4 && (s.startsWith(st) || st.startsWith(s)) && Math.min(s.length, st.length) >= 4) return true;
    return fuzzyEq(s, st);
  });
}

const SAL_WEIGHT = { primary: 1, secondary: 0.6, background: 0.35 };

/**
 * Free-recall scoring against the annotated object list.
 * Weighted recall with hypernym partial credit (0.5) and a mild intrusion
 * penalty. Returns the evidence used so the score is auditable.
 */
export function scoreObjectRecall(text, annotation) {
  const a = analyze(text);
  const present = new Set(annotation.objects || []);
  const weight = {};
  for (const k of present) weight[k] = 0.35;
  for (const o of annotation.instances || []) if (present.has(o.type)) weight[o.type] = Math.max(weight[o.type], SAL_WEIGHT[o.salience] ?? 0.6);
  const credited = new Map();
  const intrusions = [];
  const correctRejections = [];
  for (const m of a.mentions) {
    const hit = m.keys.find((k) => present.has(k));
    if (m.negated) { if (!hit) correctRejections.push(m.term); continue; }
    if (hit) credited.set(hit, Math.max(credited.get(hit) || 0, 1));
    else intrusions.push(m.term);
  }
  // hypernyms: "an animal" when a cat is present but not named
  for (const h of a.hypernyms) {
    if (h.negated) continue;
    const cand = [...present].filter((k) => !credited.has(k) && (CONCEPTS[k]?.hyper || []).includes(h.hyper));
    if (cand.length) credited.set(cand[0], Math.max(credited.get(cand[0]) || 0, 0.5));
  }
  const keys = Object.keys(weight);
  // denominator: everything above background weight, plus background items that were named
  const denomKeys = keys.filter((k) => weight[k] > 0.35 || credited.has(k));
  const denom = denomKeys.reduce((s, k) => s + weight[k], 0) || 1;
  const num = [...credited.entries()].reduce((s, [k, c]) => s + weight[k] * c, 0);
  const raw = num / denom;
  const score = Math.max(0, Math.min(1, raw - 0.05 * intrusions.length));
  return {
    score, recall: raw, matched: [...credited.keys()], partial: [...credited.entries()].filter(([, c]) => c < 1).map(([k]) => k),
    missed: denomKeys.filter((k) => !credited.has(k)), intrusions, correctRejections, method: 'lexical-semantic recall',
  };
}

/**
 * Score an interpretation against accepted interpretations. Each accepted
 * interpretation is a list of slots; each slot is a list of alternative
 * terms. Score = best fraction of satisfied slots across interpretations,
 * so any reasonable reading listed in the annotation earns credit.
 */
export function scoreInterpretation(text, accepted) {
  const a = analyze(text);
  let best = { score: 0, interpretation: -1, satisfied: [] };
  accepted.forEach((slots, idx) => {
    const sat = slots.map((alts) => alts.find((t) => containsTerm(a, t)) || null);
    // hypernym partial credit: "a pet" satisfies a [cat] slot at 0.5
    const partial = slots.map((alts, i) => (!sat[i] && alts.some((t) => (CONCEPTS[t]?.hyper || []).some((h) => a.hypernyms.some((x) => x.hyper === h && !x.negated)))) ? 0.5 : 0);
    const score = (sat.filter(Boolean).length + partial.reduce((x, y) => x + y, 0)) / slots.length;
    if (score > best.score) best = { score, interpretation: idx, satisfied: sat.filter(Boolean) };
  });
  return { ...best, method: 'interpretation slot matching' };
}

/** Coverage of keyword groups: fraction of groups with at least one hit. */
export function scoreKeywordGroups(text, groups) {
  const a = analyze(text);
  const hits = groups.map((g) => g.terms.find((t) => containsTerm(a, t)) ? g.id : null).filter(Boolean);
  return { score: groups.length ? hits.length / groups.length : 0, hits, method: 'keyword-group coverage' };
}

export function wordCount(text) { return tokenize(text).filter((t) => !STOP.has(t)).length; }
