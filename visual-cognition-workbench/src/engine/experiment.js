// Experiment engine: configuration, deterministic session planning, response
// recording and scoring. Pure logic (no DOM) so it can be tested in Node and
// so a session can be re-planned from its seed for reproducibility checks.
import { Rng, balancedSequence, randomId } from '../core/rng.js';
import { PARADIGMS } from './paradigms.js';
import { selectStimuli, generate, DATASET_VERSION } from '../dataset/dataset.js';
import { buildQuestions } from '../questions/question-bank.js';
import { scoreResponse, SCORING_VERSION } from '../scoring/scorer.js';

export const APP_VERSION = '1.0.0';
export const EXPOSURE_PRESETS = [100, 250, 500, 750, 1000];
export const DELAY_PRESETS = [0, 5000, 20000];

export function defaultConfig() {
  const modules = {};
  for (const [id, p] of PARADIGMS) modules[id] = { ...p.defaults, exposures: [...p.defaults.exposures], delays: [...p.defaults.delays] };
  return {
    participantId: 'P001',
    sessionLabel: '',
    seed: '',
    modules,
    blockOrder: 'random',
    practiceTrials: 2,
    timing: { fixationMs: 500, fixationJitterMs: 300, maskEnabled: true, maskMs: 200, itiMs: 1200 },
    retentionFiller: 'none',
    fullscreen: true,
    excludePreviouslySeen: true,
    maxQuestionsPerTrial: 8,
  };
}

export const SESSION_PRESETS = {
  quick: { label: 'Quick (~12 min)', trials: { A: 3, B: 2, C: 3, D: 2, E: 2 }, practice: 1 },
  standard: { label: 'Standard (~30 min)', trials: { A: 5, B: 5, C: 6, D: 4, E: 4 }, practice: 2 },
  extended: { label: 'Extended (~55 min)', trials: { A: 10, B: 8, C: 9, D: 6, E: 6 }, practice: 2 },
};

export function applyPreset(config, presetKey) {
  const p = SESSION_PRESETS[presetKey];
  const c = structuredClone(config);
  for (const [id, n] of Object.entries(p.trials)) if (c.modules[id]) c.modules[id].trials = n;
  c.practiceTrials = p.practice;
  return c;
}

export function validateConfig(cfg) {
  const errors = [];
  const enabled = Object.entries(cfg.modules).filter(([, m]) => m.enabled && m.trials > 0);
  if (!enabled.length) errors.push('Enable at least one module.');
  for (const [id, m] of enabled) {
    if (!m.exposures.length) errors.push(`Module ${id}: choose at least one exposure duration.`);
    if (m.exposures.some((e) => !(e >= 10 && e <= 10000))) errors.push(`Module ${id}: exposures must be between 10 and 10000 ms.`);
    if (!m.delays.length) errors.push(`Module ${id}: choose at least one retention delay.`);
  }
  if (!String(cfg.participantId || '').trim()) errors.push('A participant identifier is required (use a pseudonym, not a name).');
  return errors;
}

/**
 * Build the complete, deterministic trial plan for a session.
 * Exposure × delay conditions are fully crossed and balanced within each
 * module; stimuli are drawn without replacement from the assessment pool
 * (practice from the separate training pool), excluding previously seen ids.
 */
export function planSession(config, { seen = new Set() } = {}) {
  const seed = config.seed && String(config.seed).trim() ? String(config.seed).trim() : String(Math.floor(Math.random() * 1e9));
  const rng = new Rng(`session:${seed}`);
  const used = new Set(config.excludePreviouslySeen ? seen : []);
  const enabled = [...PARADIGMS.values()].filter((p) => config.modules[p.id]?.enabled && config.modules[p.id].trials > 0);
  const blocks = config.blockOrder === 'random' ? rng.fork('blocks').shuffle(enabled) : enabled;
  const trials = [];

  // practice block (training pool, not scored in results)
  const prng = rng.fork('practice');
  for (let i = 0; i < (config.practiceTrials || 0) && blocks.length; i++) {
    const p = blocks[i % blocks.length];
    const m = config.modules[p.id];
    const [stim] = selectStimuli({ pool: 'training', categories: p.categories, n: 1, rng: prng, exclude: used });
    if (!stim) continue;
    used.add(stim.id);
    trials.push(makeTrial({ p, m, stim, rng: prng, practice: true, exposureMs: prng.pick(m.exposures), delayMs: 0, config }));
  }

  for (const p of blocks) {
    const m = config.modules[p.id];
    const brng = rng.fork(`block:${p.id}`);
    const conditions = [];
    for (const e of m.exposures) for (const d of m.delays) conditions.push({ exposureMs: e, delayMs: d });
    const seq = balancedSequence(conditions, m.trials, brng);
    const stims = selectStimuli({ pool: 'assessment', categories: p.categories, n: m.trials, rng: brng, exclude: used });
    stims.forEach((s) => used.add(s.id));
    seq.forEach((cond, i) => { if (stims[i]) trials.push(makeTrial({ p, m, stim: stims[i], rng: brng, practice: false, ...cond, config })); });
  }
  trials.forEach((t, i) => { t.index = i; });
  return { seed, trials, blockOrder: blocks.map((b) => b.id) };
}

function makeTrial({ p, stim, rng, practice, exposureMs, delayMs, config }) {
  const { annotation } = generate(stim);
  const questions = buildQuestions(p.builder, annotation, rng.fork(stim.id), { maxQuestions: config.maxQuestionsPerTrial });
  const t = config.timing;
  return {
    index: -1, practice, module: p.id, dimension: p.dimension, stimulusId: stim.id, category: stim.category, template: stim.template, pool: stim.pool,
    condition: { exposureMs, delayMs, fixationMs: Math.round(t.fixationMs + rng.float(0, t.fixationJitterMs || 0)), maskMs: t.maskEnabled ? t.maskMs : 0 },
    questions, responses: [], scores: [], exposure: null, retention: null, flags: {},
  };
}

export function createSession(config, environment, { seen } = {}) {
  const plan = planSession(config, { seen });
  return {
    id: randomId('S'), schema: 'vcw-session/1',
    versions: { app: APP_VERSION, dataset: DATASET_VERSION, scoring: SCORING_VERSION },
    createdAt: new Date().toISOString(), completedAt: null, status: 'running',
    participantId: config.participantId, label: config.sessionLabel || '',
    config: structuredClone({ ...config, seed: plan.seed }), seed: plan.seed, blockOrder: plan.blockOrder,
    environment, trials: plan.trials, events: [], cursor: { trial: 0, question: 0 },
  };
}

export function recordExposure(session, trialIndex, exposure) {
  session.trials[trialIndex].exposure = exposure;
}

/** Store a response and score it immediately (scores are never shown until the end). */
export function recordResponse(session, trialIndex, question, payload) {
  const trial = session.trials[trialIndex];
  const { annotation } = generate(trial.stimulusId);
  const result = scoreResponse(question, payload.response, annotation);
  trial.responses = trial.responses.filter((r) => r.questionId !== question.id);
  trial.scores = trial.scores.filter((s) => s.questionId !== question.id);
  trial.responses.push({ questionId: question.id, key: question.key, ...payload });
  trial.scores.push({ questionId: question.id, key: question.key, dimension: question.dimension, subscale: question.subscale, epistemic: question.epistemic, detail: question.detail, ...result });
  return result;
}

export function logEvent(session, type, data = {}) {
  session.events.push({ t: Math.round(performance.now() * 100) / 100, wall: new Date().toISOString(), type, ...data });
}

export function completeSession(session, status = 'completed') {
  session.status = status;
  session.completedAt = new Date().toISOString();
}
