// Simulated participant, used for (a) automated tests of the full pipeline
// and (b) an explicitly labelled demo dataset for previewing the dashboard.
// Simulated data must never be presented as a real result.
import { Rng } from '../core/rng.js';
import { createSession, recordResponse, recordExposure, completeSession, defaultConfig } from '../engine/experiment.js';
import { generate } from '../dataset/dataset.js';
import { framePlan } from '../engine/presentation.js';
import { labelOf } from '../scoring/lexicon.js';

export function simulateSession(config = defaultConfig(), { seed = 'demo', ability = {}, frameMs = 1000 / 60 } = {}) {
  const rng = new Rng(`sim:${seed}`);
  const s = createSession({ ...config, seed: config.seed || seed }, {
    simulated: true, userAgent: 'simulated participant', screen: { w: 1920, h: 1080, dpr: 2 },
    refresh: { medianFrameMs: frameMs, estimatedHz: Math.round(1000 / frameMs), nominalHz: Math.round(1000 / frameMs), jitterMs: 0.2, irregularFrames: 0, samples: 120, stable: true },
  });
  const base = { recognition: 0.78, context: 0.7, relational: 0.66, memory: 0.62, aesthetic: 0.68, interface: 0.6, ...ability };
  let clock = 1000;
  for (const t of s.trials) {
    const plan = framePlan(t.condition.exposureMs, frameMs);
    const dropped = rng.bool(0.04) ? 1 : 0;
    const actual = plan.expectedMs + dropped * frameMs;
    clock += t.condition.fixationMs;
    recordExposure(s, t.index, { requestedMs: t.condition.exposureMs, frameMs, targetFrames: plan.frames, expectedMs: plan.expectedMs, onsetTs: clock, offsetTs: clock + actual, actualMs: actual, droppedFrames: dropped, framesElapsed: plan.frames + dropped, quality: dropped ? 'degraded' : 'ok', fixationActualMs: t.condition.fixationMs, maskActualMs: t.condition.maskMs, simulated: true });
    const offset = clock + actual;
    clock = offset + t.condition.maskMs + t.condition.delayMs;
    t.retention = { requestedMs: t.condition.delayMs, actualMs: t.condition.delayMs };
    const expF = Math.min(1, 0.55 + 0.45 * Math.log2(t.condition.exposureMs / 100 + 1) / Math.log2(11));
    const delF = 1 - 0.012 * (t.condition.delayMs / 1000);
    const { annotation } = generate(t.stimulusId);
    t.questions.forEach((q, serial) => {
      const p = Math.max(0.05, Math.min(0.97, (base[q.dimension] ?? 0.65) * expF * delF * (q.detail === 'secondary' ? 0.85 : 1) + rng.float(-0.08, 0.08)));
      const good = rng.bool(p);
      const response = simulateAnswer(q, good, rng, annotation);
      const latency = Math.round((q.type === 'text' ? 9000 : 2200) * Math.exp(rng.float(-0.5, 0.6)) * (good ? 1 : 1.25));
      const conf = q.epistemic === 'subjective' ? null : Math.max(1, Math.min(5, Math.round((good ? 3.6 : 2.6) + rng.float(-1.2, 1.2))));
      const shown = clock; clock += latency;
      recordResponse(s, t.index, q, { response, confidence: conf, tShown: shown, tFirstInput: shown + latency * 0.4, tSubmit: clock, latencyMs: latency, firstInputLatencyMs: Math.round(latency * 0.4), sinceOffsetMs: Math.round(shown - offset), serial });
    });
    clock += config.timing?.itiMs ?? 1000;
  }
  completeSession(s);
  s.simulated = true;
  return s;
}

function simulateAnswer(q, good, rng, ann) {
  switch (q.type) {
    case 'mcq': {
      const sorted = q.options.slice().sort((a, b) => (b.credit ?? (q.colorScored && b.value === q.truth.color ? 1 : 0)) - (a.credit ?? (q.colorScored && a.value === q.truth.color ? 1 : 0)));
      return { optionId: good ? sorted[0].id : rng.pick(sorted.slice(1)).id };
    }
    case 'multi': {
      const sel = q.options.filter((o) => (o.target ? rng.bool(good ? 0.9 : 0.45) : rng.bool(good ? 0.05 : 0.3))).map((o) => o.id);
      return { selected: q.maxSelect ? sel.slice(0, q.maxSelect) : sel };
    }
    case 'count': return { value: Math.max(0, q.truth.value + (good ? 0 : rng.pick([-2, -1, 1, 2]))) };
    case 'grid': return { cell: good ? q.truth.cells[0].cell : rng.int(0, 8) };
    case 'scale': return { value: Math.max(1, Math.min(7, q.truth.value + (good ? rng.int(-1, 1) : rng.pick([-3, -2, 2, 3])))) };
    case 'judgments': return { answers: Object.fromEntries(q.items.map((it) => [it.id, rng.bool(good ? 0.9 : 0.5) ? it.answer : rng.pick(q.columns).id])) };
    case 'text': {
      if (q.truth.mode === 'objects') return { text: (ann.objects || []).filter(() => rng.bool(good ? 0.7 : 0.3)).map(labelOf).join(', ') };
      if (q.truth.mode === 'interpretation') return { text: good ? q.truth.reference : 'not sure, something outside' };
      if (q.truth.mode === 'issues') return { text: good ? 'The grey text has poor contrast and the spacing between cards is uneven.' : 'Looks fine.' };
      return { text: good ? 'The warm low light and the soft colours in the background make it calm.' : 'Nice.' };
    }
    default: return { skipped: true };
  }
}
