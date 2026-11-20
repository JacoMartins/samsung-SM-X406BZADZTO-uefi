import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, createSession, planSession, validateConfig, applyPreset } from '../src/engine/experiment.js';
import { framePlan } from '../src/engine/presentation.js';
import { simulateSession } from '../src/analytics/simulate.js';
import { analyze } from '../src/analytics/analytics.js';
import { buildReport, reportToMarkdown } from '../src/analytics/report.js';
import { sessionToCSV, sessionToJSON } from '../src/analytics/export.js';
import { probit, dPrime, ols } from '../src/analytics/stats.js';

test('same config + seed reproduces the plan exactly', () => {
  const cfg = { ...defaultConfig(), seed: 'repro' };
  const sig = (p) => JSON.stringify(p.trials.map((t) => [t.stimulusId, t.condition, t.questions.map((q) => [q.key, q.prompt, q.options?.map((o) => o.label)])]));
  assert.equal(sig(planSession(cfg)), sig(planSession(cfg)));
  assert.notEqual(sig(planSession(cfg)), sig(planSession({ ...cfg, seed: 'other' })));
});

test('no stimulus repeats; previously seen stimuli are excluded; practice uses training pool', () => {
  const cfg = { ...defaultConfig(), seed: 'x' };
  const p1 = planSession(cfg);
  const ids = p1.trials.map((t) => t.stimulusId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(p1.trials.filter((t) => t.practice).every((t) => t.pool === 'training'));
  assert.ok(p1.trials.filter((t) => !t.practice).every((t) => t.pool === 'assessment'));
  const p2 = planSession({ ...cfg, seed: 'y' }, { seen: new Set(ids) });
  assert.ok(p2.trials.every((t) => !ids.includes(t.stimulusId)));
});

test('conditions are balanced within a module', () => {
  const cfg = { ...defaultConfig(), seed: 'bal' };
  cfg.modules.C.trials = 9;
  const c = planSession(cfg).trials.filter((t) => t.module === 'C' && !t.practice);
  const counts = {};
  c.forEach((t) => { counts[t.condition.delayMs] = (counts[t.condition.delayMs] || 0) + 1; });
  assert.deepEqual(counts, { 0: 3, 5000: 3, 20000: 3 });
});

test('free recall is always asked before recognition questions', () => {
  for (const t of planSession({ ...defaultConfig(), seed: 'order' }).trials) {
    const stages = t.questions.map((q) => q.stage);
    assert.deepEqual(stages, stages.slice().sort((a, b) => a - b));
  }
});

test('validation catches empty configurations', () => {
  const cfg = defaultConfig();
  Object.values(cfg.modules).forEach((m) => { m.enabled = false; });
  assert.ok(validateConfig(cfg).length > 0);
  assert.equal(validateConfig(defaultConfig()).length, 0);
});

test('exposures are quantised to whole frames', () => {
  assert.deepEqual(framePlan(100, 1000 / 60).frames, 6);
  assert.equal(framePlan(100, 1000 / 144).frames, 14);
  assert.equal(framePlan(5, 1000 / 60).frames, 1);
});

test('statistics helpers', () => {
  assert.ok(Math.abs(probit(0.975) - 1.95996) < 1e-3);
  assert.ok(dPrime({ hits: 9, misses: 1, falseAlarms: 1, correctRejections: 9 }).dPrime > 2);
  const fit = ols([1, 2, 3, 4], [2, 4, 6, 8]);
  assert.ok(Math.abs(fit.slope - 2) < 1e-9 && Math.abs(fit.r2 - 1) < 1e-9);
});

test('full pipeline: simulate → analyse → report → export', () => {
  const s = simulateSession(applyPreset(defaultConfig(), 'standard'), { seed: 'pipeline' });
  const A = analyze(s);
  assert.ok(A.nObjective > 50);
  assert.ok(A.overall.mean > 0 && A.overall.mean < 1);
  assert.ok(A.byExposure.length >= 3 && A.byDelay.length === 3);
  assert.ok(A.items.every((i) => !i.practice));
  const md = reportToMarkdown(s, buildReport(s, A));
  assert.ok(/not a medical/.test(md));
  assert.ok(!/\bIQ\b(?! estimate)/.test(md.replace('no IQ estimate', '')));
  const csv = sessionToCSV(s).split('\r\n');
  assert.equal(csv.length - 1, s.trials.reduce((n, t) => n + t.responses.length, 0));
  assert.ok(JSON.parse(sessionToJSON(s, A)).trials.length === s.trials.length);
});

test('subjective items never enter accuracy aggregates', () => {
  const s = simulateSession(defaultConfig(), { seed: 'subj' });
  const A = analyze(s);
  const objN = A.items.filter((i) => i.epistemic !== 'subjective').length;
  assert.equal(A.nObjective, objN);
  assert.ok(A.items.some((i) => i.epistemic === 'subjective'));
});

test('createSession records versions and seed', () => {
  globalThis.performance ??= { now: () => Date.now() };
  const s = createSession({ ...defaultConfig(), seed: 'v' }, {});
  assert.equal(s.seed, 'v');
  assert.ok(s.versions.app && s.versions.dataset && s.versions.scoring);
});
