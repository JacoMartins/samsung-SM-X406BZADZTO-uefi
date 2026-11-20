// Results analytics: turns a session record into the aggregates shown on the
// dashboard and used by the report. Practice trials and trials whose
// presentation was invalid (page hidden during exposure) are excluded.
import { mean, median, quantile, clusterBootstrap, ols, gamma, dPrime } from './stats.js';
import { DIMENSIONS } from '../engine/paradigms.js';

export const CONFIDENCE_LEVELS = ['Guessing', 'Unsure', 'Somewhat sure', 'Fairly sure', 'Certain'];

export function confidenceToProb(level, chance) {
  if (level == null) return null;
  return chance + (1 - chance) * (level - 1) / 4;
}

export function flattenItems(session) {
  const items = [];
  for (const t of session.trials) {
    const valid = !!t.exposure && t.exposure.quality !== 'invalid' && !t.flags?.invalid;
    for (const q of t.questions) {
      const s = t.scores.find((x) => x.questionId === q.id);
      const r = t.responses.find((x) => x.questionId === q.id);
      if (!s || !r) continue;
      items.push({
        trialIndex: t.index, practice: t.practice, module: t.module, stimulusId: t.stimulusId, category: t.category, template: t.template,
        questionId: q.id, key: q.key, type: q.type, dimension: q.dimension, subscale: q.subscale, epistemic: q.epistemic, detail: q.detail, stage: q.stage,
        score: s.score, correct: s.correct, skipped: !!s.skipped, sdt: s.sdt || null,
        confidence: r.confidence ?? null, confProb: confidenceToProb(r.confidence, q.chance), chance: q.chance,
        latencyMs: r.latencyMs ?? null, firstInputMs: r.firstInputLatencyMs ?? null, sinceOffsetMs: r.sinceOffsetMs ?? null, serial: r.serial ?? null,
        exposureRequested: t.condition.exposureMs, exposureActual: t.exposure?.actualMs ?? null, delayMs: t.condition.delayMs,
        timingQuality: t.exposure?.quality ?? 'missing', valid,
      });
    }
  }
  return items;
}

const objective = (it) => it.epistemic !== 'subjective';

function summarize(items, seed = 1) {
  if (!items.length) return { mean: NaN, lo: NaN, hi: NaN, n: 0, clusters: 0 };
  return clusterBootstrap(items, { seed });
}

export function analyze(session) {
  const all = flattenItems(session);
  const items = all.filter((it) => !it.practice && it.valid);
  const obj = items.filter(objective);
  const mainTrials = session.trials.filter((t) => !t.practice);

  const out = { generatedAt: new Date().toISOString(), sessionId: session.id, nItems: items.length, nObjective: obj.length };
  out.trials = {
    total: mainTrials.length,
    completed: mainTrials.filter((t) => t.responses.length >= t.questions.length).length,
    invalid: mainTrials.filter((t) => t.exposure?.quality === 'invalid' || t.flags?.invalid).length,
    degraded: mainTrials.filter((t) => t.exposure?.quality === 'degraded').length,
  };
  out.overall = summarize(obj, 11);

  // per dimension (objective items only) + subjective agreement separately
  out.dimensions = {};
  for (const dim of Object.keys(DIMENSIONS)) {
    const di = obj.filter((it) => it.dimension === dim);
    const subj = items.filter((it) => it.dimension === dim && it.epistemic === 'subjective');
    if (!di.length && !subj.length) continue;
    out.dimensions[dim] = { ...summarize(di, dim.length * 7), observable: summarize(di.filter((i) => i.epistemic === 'observable'), 3), inferential: summarize(di.filter((i) => i.epistemic === 'inferential'), 5), subjectiveAgreement: subj.length ? summarize(subj, 13) : null };
  }

  // subscales (named metrics)
  const sub = new Map();
  for (const it of items) { const k = `${it.dimension}:${it.subscale}`; if (!sub.has(k)) sub.set(k, []); sub.get(k).push(it); }
  out.subscales = [...sub.entries()].map(([k, xs]) => ({ key: k, dimension: xs[0].dimension, subscale: xs[0].subscale, epistemic: xs[0].epistemic, mean: mean(xs.map((x) => x.score)), n: xs.length }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // named headline metrics
  const metric = (pred) => { const xs = obj.filter(pred); return { mean: mean(xs.map((x) => x.score)), n: xs.length }; };
  out.metrics = {
    recognitionAccuracy: metric((i) => i.dimension === 'recognition'),
    recallAccuracy: metric((i) => i.dimension === 'memory'),
    contextualInference: metric((i) => i.dimension === 'context'),
    spatialRelations: metric((i) => ['spatial', 'relations', 'position', 'relative-size'].includes(i.subscale)),
    secondaryDetail: metric((i) => i.detail === 'secondary'),
    primaryDetail: metric((i) => i.detail === 'primary'),
    medianLatencyMs: median(items.filter((i) => i.latencyMs != null && i.type !== 'text').map((i) => i.latencyMs)),
  };

  // accuracy vs exposure (immediate-test trials only, delay 0)
  const immediate = obj.filter((i) => i.delayMs === 0);
  const exposures = [...new Set(immediate.map((i) => i.exposureRequested))].sort((a, b) => a - b);
  out.byExposure = exposures.map((e) => {
    const xs = immediate.filter((i) => i.exposureRequested === e);
    const actual = [...new Set(xs.map((i) => i.trialIndex))].map((ti) => xs.find((x) => x.trialIndex === ti).exposureActual).filter((v) => v != null);
    return { exposureMs: e, actualMeanMs: mean(actual), all: summarize(xs, e), observable: summarize(xs.filter((i) => i.epistemic === 'observable'), e + 1), inferential: summarize(xs.filter((i) => i.epistemic === 'inferential'), e + 2), nTrials: new Set(xs.map((i) => i.trialIndex)).size };
  });
  out.exposureModel = exposureModel(immediate);

  out.recognitionVsInference = (() => {
    const o = summarize(obj.filter((i) => i.epistemic === 'observable'), 21);
    const f = summarize(obj.filter((i) => i.epistemic === 'inferential'), 22);
    return { observable: o, inferential: f, diff: o.mean - f.mean, seDiff: Math.sqrt((o.se || 0) ** 2 + (f.se || 0) ** 2) };
  })();

  // memory: immediate vs delayed
  const mem = obj.filter((i) => i.module === 'C');
  out.byDelay = [...new Set(mem.map((i) => i.delayMs))].sort((a, b) => a - b).map((d) => ({ delayMs: d, ...summarize(mem.filter((i) => i.delayMs === d), d + 3), bySubscale: groupMeans(mem.filter((i) => i.delayMs === d), 'subscale') }));
  out.delayModel = (() => { const tr = trialMeans(mem); return ols(tr.map((t) => t.delayMs / 1000), tr.map((t) => t.score)); })();

  // response times
  const rtItems = items.filter((i) => i.latencyMs != null);
  out.rt = {
    byType: groupStats(rtItems, 'type'), byDimension: groupStats(rtItems.filter((i) => i.type !== 'text'), 'dimension'),
    values: rtItems.map((i) => ({ ms: i.latencyMs, type: i.type, dimension: i.dimension, correct: i.correct, score: i.score })),
    correctVsIncorrect: { correct: median(rtItems.filter((i) => i.correct === true && i.type !== 'text').map((i) => i.latencyMs)), incorrect: median(rtItems.filter((i) => i.correct === false && i.type !== 'text').map((i) => i.latencyMs)) },
  };

  // confidence calibration
  const cal = obj.filter((i) => i.confidence != null);
  out.calibration = {
    n: cal.length,
    bins: [1, 2, 3, 4, 5].map((lvl) => { const xs = cal.filter((i) => i.confidence === lvl); return { level: lvl, label: CONFIDENCE_LEVELS[lvl - 1], n: xs.length, meanExpected: mean(xs.map((i) => i.confProb)), accuracy: mean(xs.map((i) => i.score)) }; }),
    bias: mean(cal.map((i) => i.confProb)) - mean(cal.map((i) => i.score)),
    brier: mean(cal.map((i) => (i.confProb - i.score) ** 2)),
    gamma: gamma(cal.map((i) => i.confidence), cal.map((i) => i.score)),
    meanConfidence: mean(cal.map((i) => i.confProb)), meanAccuracy: mean(cal.map((i) => i.score)),
  };

  // signal detection
  const sdtSum = (pred) => items.filter((i) => i.sdt && pred(i)).reduce((a, i) => ({ hits: a.hits + i.sdt.hits, misses: a.misses + i.sdt.misses, falseAlarms: a.falseAlarms + i.sdt.falseAlarms, correctRejections: a.correctRejections + i.sdt.correctRejections }), { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
  const sdtOut = (counts) => (counts.hits + counts.misses + counts.falseAlarms + counts.correctRejections ? { ...counts, ...dPrime(counts) } : null);
  out.sdt = {
    objectRecognition: sdtOut(sdtSum((i) => i.module === 'A')),
    memoryPresence: sdtOut(sdtSum((i) => i.key === 'C.presence')),
    interfaceIssues: sdtOut(sdtSum((i) => i.key === 'E.issues')),
  };

  // timing fidelity
  const ex = mainTrials.map((t) => t.exposure).filter(Boolean);
  out.timing = {
    refresh: session.environment?.refresh || null,
    n: ex.length,
    meanAbsDeviationMs: mean(ex.map((e) => Math.abs(e.actualMs - e.requestedMs))),
    maxAbsDeviationMs: Math.max(0, ...ex.map((e) => Math.abs(e.actualMs - e.requestedMs))),
    meanAbsVsFramePlanMs: mean(ex.map((e) => Math.abs(e.actualMs - e.expectedMs))),
    droppedFrames: ex.reduce((s, e) => s + e.droppedFrames, 0),
    degraded: ex.filter((e) => e.quality === 'degraded').length, invalid: ex.filter((e) => e.quality === 'invalid').length,
    points: mainTrials.filter((t) => t.exposure).map((t) => ({ trial: t.index, requested: t.exposure.requestedMs, actual: t.exposure.actualMs, quality: t.exposure.quality })),
    fullscreenExits: session.events.filter((e) => e.type === 'fullscreen-exit').length,
    visibilityLosses: session.events.filter((e) => e.type === 'hidden').length,
  };

  out.byCategory = groupMeans(obj, 'category');
  out.byModule = groupMeans(obj, 'module');
  out.items = items;
  return out;
}

function trialMeans(items) {
  const m = new Map();
  for (const it of items) { if (!m.has(it.trialIndex)) m.set(it.trialIndex, []); m.get(it.trialIndex).push(it); }
  return [...m.values()].map((xs) => ({ trialIndex: xs[0].trialIndex, score: mean(xs.map((x) => x.score)), exposureMs: xs[0].exposureActual ?? xs[0].exposureRequested, exposureRequested: xs[0].exposureRequested, delayMs: xs[0].delayMs, epistemic: xs[0].epistemic }));
}

function groupMeans(items, key) {
  const m = {};
  for (const it of items) { (m[it[key]] ||= []).push(it.score); }
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { mean: mean(v), n: v.length }]));
}

function groupStats(items, key) {
  const m = {};
  for (const it of items) (m[it[key]] ||= []).push(it.latencyMs);
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { n: v.length, median: median(v), q1: quantile(v, 0.25), q3: quantile(v, 0.75), min: Math.min(...v), max: Math.max(...v) }]));
}

/**
 * Does performance fall proportionally with exposure time? Compare a model
 * linear in milliseconds with one linear in log2(ms) on trial-level means.
 */
function exposureModel(items) {
  const tr = trialMeans(items).filter((t) => t.exposureMs > 0);
  const levels = new Set(tr.map((t) => t.exposureRequested));
  if (tr.length < 4 || levels.size < 3) return { sufficient: false, nTrials: tr.length, nLevels: levels.size };
  const y = tr.map((t) => t.score);
  const log = ols(tr.map((t) => Math.log2(t.exposureMs)), y);
  const lin = ols(tr.map((t) => t.exposureMs / 1000), y);
  let verdict;
  if (!log || (log.slopeLo <= 0 && log.slopeHi >= 0)) verdict = 'no-reliable-change';
  else if (log.slope < 0) verdict = 'inverse';
  else if (lin && lin.r2 > log.r2 + 0.05) verdict = 'proportional';
  else verdict = 'log-linear';
  return { sufficient: true, nTrials: tr.length, nLevels: levels.size, log, linear: lin, perHalving: log ? log.slope : NaN, verdict, points: tr };
}
