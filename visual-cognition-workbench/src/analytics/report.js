// Narrative report. Every statement is derived from the analytics object and
// hedged according to the amount of data. No IQ estimates, diagnoses, norms
// or claims of exceptional ability are produced.
import { DIMENSIONS } from '../engine/paradigms.js';

const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—');
const ci = (s) => (Number.isFinite(s?.lo) ? ` (95% CI ${pct(s.lo)}–${pct(s.hi)})` : '');
const ms = (x) => (Number.isFinite(x) ? `${Math.round(x)} ms` : '—');
const sec = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '—');
const fmtSigned = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}`;
const CORE = ['recognition', 'context', 'relational', 'memory', 'aesthetic', 'interface'];
const MIN_ITEMS = 8;

export function buildReport(session, A) {
  const sections = [];
  const dims = Object.entries(A.dimensions).filter(([k, d]) => CORE.includes(k) && d.n > 0);
  const profileMean = dims.length ? dims.reduce((s, [, d]) => s + d.mean, 0) / dims.length : NaN;

  sections.push({
    id: 'summary', heading: 'Summary',
    paragraphs: [
      `Across ${A.nObjective} objectively scored items from ${A.trials.total - A.trials.invalid} valid trials, the mean score was ${pct(A.overall.mean)}${ci(A.overall)}. ` +
      'Scores are proportions of available credit on this stimulus set, with partial credit where appropriate. They are not normed against any population and should only be compared within this instrument and configuration.',
      A.trials.invalid ? `${A.trials.invalid} trial(s) were excluded because the page was hidden or the presentation was otherwise invalid.` : 'No trials were excluded for presentation problems.',
    ],
  });

  // dimension profile
  const strengths = []; const weaknesses = []; const neutral = []; const insufficient = [];
  for (const [k, d] of dims) {
    const name = DIMENSIONS[k].label;
    const line = `${name}: ${pct(d.mean)}${ci(d)}, ${d.n} items / ${d.clusters} images`;
    if (d.n < MIN_ITEMS || !Number.isFinite(d.lo)) insufficient.push(line);
    else if (d.lo > profileMean) strengths.push(line);
    else if (d.hi < profileMean) weaknesses.push(line);
    else neutral.push(line);
  }
  sections.push({
    id: 'profile', heading: 'Dimension profile',
    paragraphs: [`Dimensions are compared with this participant's own average across dimensions (${pct(profileMean)}), not with other people. A dimension is called a relative strength or weakness only when its whole 95% interval lies above or below that average.`],
    groups: [
      { label: 'Relative strengths', items: strengths.length ? strengths : ['None identified with confidence.'] },
      { label: 'Relative weaknesses', items: weaknesses.length ? weaknesses : ['None identified with confidence.'] },
      { label: 'Within the participant’s typical range', items: neutral.length ? neutral : ['—'] },
      ...(insufficient.length ? [{ label: 'Too little data to interpret', items: insufficient }] : []),
    ],
  });

  // research questions
  const rq = [];
  // Q1 speed
  const be = A.byExposure.filter((b) => b.observable.n > 0);
  if (be.length) {
    const best = Math.max(...be.map((b) => b.observable.mean));
    const thr = be.find((b) => b.observable.mean >= 0.75 * best);
    const shortest = be[0];
    rq.push({ q: 'How quickly can meaningful information be extracted from an unfamiliar image?',
      a: `At the shortest tested exposure (${shortest.exposureMs} ms requested, ${ms(shortest.actualMeanMs)} measured) observable-detail accuracy was ${pct(shortest.observable.mean)} over ${shortest.nTrials} image(s). ` +
        (thr ? `Performance first reached 75% of the participant's own best level at ${thr.exposureMs} ms. ` : '') +
        `Median answer time for non-text questions was ${ms(A.metrics.medianLatencyMs)}. ${shortest.nTrials < 3 ? 'With so few images per exposure level this estimate is coarse.' : ''}` });
  }
  // Q2 retention
  if (A.dimensions.memory?.n) {
    const imm = A.byDelay.find((d) => d.delayMs === 0); const late = A.byDelay[A.byDelay.length - 1];
    rq.push({ q: 'How much information is retained after brief exposure?',
      a: `Visual working-memory items averaged ${pct(A.dimensions.memory.mean)}${ci(A.dimensions.memory)}. ` +
        (imm && late && late.delayMs > 0 ? `Immediate testing gave ${pct(imm.mean)}; after ${sec(late.delayMs)} it was ${pct(late.mean)}. ` : '') +
        `Primary (salient) details scored ${pct(A.metrics.primaryDetail.mean)} versus ${pct(A.metrics.secondaryDetail.mean)} for secondary details.` });
  }
  // Q3 context
  if (A.dimensions.context?.n) {
    const fv = A.subscales.find((s) => s.subscale === 'fact-vs-interpretation');
    rq.push({ q: 'How accurately is context inferred from limited visual information?',
      a: `Contextual-inference items averaged ${pct(A.dimensions.context.mean)}${ci(A.dimensions.context)}. Reasonable alternative interpretations received partial credit rather than being marked wrong. ` +
        (fv ? `Separating visible facts from inference and speculation scored ${pct(fv.mean)} (${fv.n} sets).` : '') });
  }
  // Q4 relations
  if (A.dimensions.relational?.n || A.metrics.spatialRelations.n) {
    rq.push({ q: 'How effectively are relationships between visual elements recognised?',
      a: `${A.dimensions.relational ? `Relational judgements scored ${pct(A.dimensions.relational.mean)}${ci(A.dimensions.relational)}. ` : ''}Across all spatial/relational items (positions, relative sizes, left/right and above/below relations) the mean was ${pct(A.metrics.spatialRelations.mean)} over ${A.metrics.spatialRelations.n} items.` });
  }
  // Q5 deterioration
  const m = A.exposureModel;
  let q5;
  if (!m?.sufficient) q5 = `Not enough exposure levels or trials to model this (${m?.nTrials ?? 0} trials at ${m?.nLevels ?? 0} levels; at least 4 trials across 3 levels are needed).`;
  else {
    const per = `${fmtSigned(-m.perHalving)} points per halving of exposure (95% CI ${Math.round(-m.log.slopeHi * 100)} to ${Math.round(-m.log.slopeLo * 100)})`;
    q5 = {
      'no-reliable-change': `No reliable change in accuracy across the tested durations (${per}). Either extraction is already saturated at the shortest exposure, or there are too few trials to detect a change.`,
      inverse: `Accuracy did not decline with shorter exposures in this sample (${per}); this is most likely noise from the small number of trials and should be retested.`,
      proportional: `Accuracy fell roughly in proportion to exposure time (a straight-line model in milliseconds fit better, R² ${m.linear.r2.toFixed(2)} vs ${m.log.r2.toFixed(2)}).`,
      'log-linear': `Accuracy declined by a roughly constant amount for each halving of exposure (${per}; log model R² ${m.log.r2.toFixed(2)} vs linear ${m.linear?.r2?.toFixed(2)}). The decline is therefore not proportional to time: losing half of a long exposure costs about as much as losing half of a short one.`,
    }[m.verdict];
  }
  rq.push({ q: 'Does performance deteriorate proportionally as exposure decreases?', a: q5 });
  // Q6 balance
  const comp = ['recognition', 'memory', 'relational', 'context'].map((k) => [k, A.dimensions[k]]).filter(([, d]) => d && d.n >= MIN_ITEMS);
  if (comp.length >= 2) {
    const sorted = comp.slice().sort((a, b) => b[1].mean - a[1].mean);
    const [hiK, hi] = sorted[0]; const [loK, lo] = sorted[sorted.length - 1];
    const diff = hi.mean - lo.mean; const se = Math.sqrt((hi.se || 0) ** 2 + (lo.se || 0) ** 2);
    const reliable = Number.isFinite(se) && se > 0 && diff - 1.96 * se > 0;
    rq.push({ q: 'Are recognition, memory and reasoning equally developed?',
      a: `The largest gap is between ${DIMENSIONS[hiK].short.toLowerCase()} (${pct(hi.mean)}) and ${DIMENSIONS[loK].short.toLowerCase()} (${pct(lo.mean)}), a difference of ${Math.round(diff * 100)} points. ` +
        (reliable ? (diff >= 0.15 ? 'This difference is larger than its uncertainty and substantial in size, suggesting a genuinely uneven profile on these tasks.' : 'The difference exceeds its uncertainty but is modest in size.') : 'The difference is within measurement uncertainty, so the profile is consistent with evenly developed abilities on these tasks.') +
        ' Note that dimensions are measured with different question formats, so some of any gap may reflect format rather than ability.' });
  } else rq.push({ q: 'Are recognition, memory and reasoning equally developed?', a: 'At least two of these dimensions need 8 or more scored items to compare them.' });
  sections.push({ id: 'questions', heading: 'Research questions', qa: rq });

  // calibration
  const c = A.calibration;
  if (c.n >= 10) {
    const dir = c.bias > 0.1 ? 'over-confident' : c.bias < -0.1 ? 'under-confident' : 'reasonably well calibrated';
    sections.push({ id: 'calibration', heading: 'Confidence calibration', paragraphs: [
      `On ${c.n} rated items, confidence implied an expected score of ${pct(c.meanConfidence)} against an actual ${pct(c.meanAccuracy)}: the participant was ${dir} overall (bias ${c.bias >= 0 ? '+' : ''}${Math.round(c.bias * 100)} points, Brier ${c.brier.toFixed(3)}). ` +
      `Resolution (Goodman–Kruskal γ between confidence and score) was ${Number.isFinite(c.gamma) ? c.gamma.toFixed(2) : '—'}; values near 0 mean confidence did not discriminate right from wrong answers.`,
    ] });
  }

  // SDT
  const sd = Object.entries(A.sdt).filter(([, v]) => v && v.n >= 8);
  if (sd.length) sections.push({ id: 'sdt', heading: 'Signal detection', paragraphs: ['Sensitivity (d′) separates genuine detection from a tendency to say “yes”; criterion c > 0 indicates conservative responding.'],
    groups: [{ label: 'Measures', items: sd.map(([k, v]) => `${{ objectRecognition: 'Object recognition (multi-select)', memoryPresence: 'Presence / absence memory', interfaceIssues: 'Interface issue detection' }[k]}: hit rate ${pct(v.hitRate)}, false-alarm rate ${pct(v.faRate)}, d′ ${v.dPrime.toFixed(2)}, c ${v.c.toFixed(2)} (${v.n} judgements)`) }] });

  // further testing
  const further = [];
  for (const [k, d] of dims) if (d.n < MIN_ITEMS || (d.hi - d.lo) > 0.35) further.push(`${DIMENSIONS[k].label}: ${d.n < MIN_ITEMS ? 'few items' : 'wide uncertainty'} — run more trials of this module.`);
  const thin = A.byExposure.filter((b) => b.nTrials < 2);
  if (thin.length) further.push(`Exposure levels with fewer than two images (${thin.map((b) => `${b.exposureMs} ms`).join(', ')}) — increase trials to estimate the exposure curve.`);
  if (A.timing.degraded > A.timing.n * 0.2) further.push('More than 20% of exposures had dropped frames; repeat on a quieter machine or browser tab before interpreting short-exposure results.');
  if (c.n >= 10 && Math.abs(c.bias) > 0.15) further.push('Confidence was notably mis-calibrated; a dedicated metacognition block would clarify whether this is stable.');
  const textItems = A.items.filter((i) => i.type === 'text' && i.epistemic !== 'subjective');
  if (textItems.length) further.push('Free-text answers are scored lexically against annotations; review the per-answer evidence in the trial review, as unusual but correct phrasing can be under-credited.');
  sections.push({ id: 'further', heading: 'Areas requiring further testing', groups: [{ label: '', items: further.length ? further : ['No specific gaps flagged; replication with a fresh stimulus set is still recommended before drawing conclusions.'] }] });

  // measurement quality
  const r = A.timing.refresh;
  sections.push({ id: 'quality', heading: 'Measurement quality', paragraphs: [
    `Display refresh was estimated at ${r ? `${r.estimatedHz} Hz (frame ≈ ${Number(r.medianFrameMs).toFixed(2)} ms, jitter ${Number(r.jitterMs).toFixed(2)} ms)` : 'an unknown rate'}. Exposures are quantised to whole frames; the mean absolute difference between requested and measured exposure was ${ms(A.timing.meanAbsDeviationMs)} (max ${ms(A.timing.maxAbsDeviationMs)}), with ${A.timing.droppedFrames} dropped frame(s) during exposures and ${A.timing.degraded} degraded trial(s).`,
    'Measured times are requestAnimationFrame timestamps. They approximate, but cannot guarantee, when light actually left the screen; display latency and compositor behaviour are outside the browser’s control. Durations at or below a few frames should be read as approximate.',
    `Fullscreen exits: ${A.timing.fullscreenExits}. Loss of page visibility: ${A.timing.visibilityLosses}.`,
  ] });

  sections.push({ id: 'limits', heading: 'Interpretation limits', paragraphs: [
    'This is an experimental research instrument, not a medical or psychological diagnostic test. It produces no IQ estimate, clinical classification or claim about exceptional ability.',
    'Stimuli are procedurally generated illustrations (plus any photographs added by the researcher); performance may differ with photographs of real scenes. Subjective items (atmosphere, design language, explanations) are reported as agreement with a reference annotation, never as accuracy.',
  ] });
  return { sections };
}

export function reportToMarkdown(session, report) {
  const lines = [`# Visual Cognition Workbench — session report`, '', `Session ${session.id} · participant ${session.participantId} · ${session.createdAt}`, ''];
  for (const s of report.sections) {
    lines.push(`## ${s.heading}`, '');
    (s.paragraphs || []).forEach((p) => lines.push(p, ''));
    (s.qa || []).forEach(({ q, a }) => lines.push(`**${q}**`, '', a, ''));
    (s.groups || []).forEach((g) => { if (g.label) lines.push(`**${g.label}**`, ''); g.items.forEach((i) => lines.push(`- ${i}`)); lines.push(''); });
  }
  return lines.join('\n');
}
