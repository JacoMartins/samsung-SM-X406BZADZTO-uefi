// Results dashboard: performance by dimension, exposure curve, recognition
// vs inference, delayed recall, response times, calibration, timing fidelity,
// narrative report and per-trial review (answers revealed only here).
import { h, clear, pct, fmtMs, fmtDate, segmented, toast } from '../dom.js';
import { store } from '../../core/store.js';
import { analyze, CONFIDENCE_LEVELS } from '../../analytics/analytics.js';
import { buildReport, reportToMarkdown } from '../../analytics/report.js';
import { sessionToJSON, sessionToCSV, download, describeResponse } from '../../analytics/export.js';
import { DIMENSIONS, PARADIGMS } from '../../engine/paradigms.js';
import { generate, svgToDataUrl, CATEGORIES } from '../../dataset/dataset.js';
import { intervalBars, lineChart, scatter, histogram, withTable } from '../charts.js';
import { app } from '../app-state.js';

const DIM_ORDER = ['recognition', 'context', 'relational', 'memory', 'aesthetic', 'interface'];
const EPI = { observable: ['Observable', 'obs'], inferential: ['Inferential', 'inf'], subjective: ['Subjective', 'subj'] };

export function resultsView(root, sessionId) {
  const session = app.active?.id === sessionId ? app.active : store.getSession(sessionId);
  if (!session) { root.append(h('div', { class: 'page narrow' }, h('h1', {}, 'Session not found'), h('p', {}, h('a', { href: '#/' }, 'Back to sessions')))); return; }
  const A = analyze(session);
  const report = buildReport(session, A);
  session.summary = { overall: A.overall.mean, nItems: A.nObjective };
  if (!session.simulated && store.getSession(session.id)) store.saveSession(session);

  const page = h('div', { class: 'page' });
  root.append(page);
  const stamp = `${session.participantId}_${session.createdAt.slice(0, 10)}_${session.id}`;

  page.append(
    h('div', { class: 'page-head' },
      h('div', {},
        h('div', { class: 'eyebrow' }, session.simulated ? 'Simulated demo data — not a real participant' : 'Session results'),
        h('h1', {}, `Participant ${session.participantId}`),
        h('p', {}, `${fmtDate(session.createdAt)} · ${statusLabel(session.status)} · seed ${session.seed} · ${session.trials.filter((t) => !t.practice).length} trials · blocks ${session.blockOrder.join(' → ')}`)),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => download(`vcw_${stamp}.json`, sessionToJSON(session, A)) }, 'Export JSON'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => download(`vcw_${stamp}.csv`, sessionToCSV(session), 'text/csv') }, 'Export CSV'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => download(`vcw_${stamp}_report.md`, reportToMarkdown(session, report), 'text/markdown') }, 'Report (.md)'))),
  );
  if (session.status !== 'completed') page.append(h('div', { class: 'notice warn', style: { marginBottom: '20px' } }, h('strong', {}, 'Incomplete session. '), 'Results below use only the trials that were finished and should be interpreted with extra caution.'));

  // ---------- headline tiles
  const c = A.calibration;
  page.append(h('div', { class: 'grid cols-4' },
    tile('Overall (objective items)', pct(A.overall.mean), Number.isFinite(A.overall.lo) ? `95% CI ${pct(A.overall.lo)}–${pct(A.overall.hi)} · ${A.nObjective} items` : `${A.nObjective} items`),
    tile('Observable vs inferential', `${pct(A.recognitionVsInference.observable.mean)} / ${pct(A.recognitionVsInference.inferential.mean)}`, 'Directly verifiable vs interpretation items'),
    tile('Confidence calibration', c.n ? `${c.bias >= 0 ? '+' : '−'}${Math.abs(Math.round(c.bias * 100))} pts` : '—', c.n ? `${c.bias > 0.1 ? 'Over-confident' : c.bias < -0.1 ? 'Under-confident' : 'Well calibrated'} · γ ${Number.isFinite(c.gamma) ? c.gamma.toFixed(2) : '—'}` : 'No ratings'),
    tile('Timing fidelity', fmtMs(A.timing.meanAbsDeviationMs), `mean |measured − requested| · ${A.timing.degraded} degraded / ${A.timing.invalid} invalid`),
  ));

  // ---------- dimension profile
  const dims = DIM_ORDER.filter((d) => A.dimensions[d]);
  const dimData = dims.map((d) => ({ label: DIMENSIONS[d].label, ...A.dimensions[d] }));
  const avg = dimData.length ? dimData.reduce((s, d) => s + (Number.isFinite(d.mean) ? d.mean : 0), 0) / dimData.filter((d) => Number.isFinite(d.mean)).length : NaN;
  const subjRows = dims.filter((d) => A.dimensions[d].subjectiveAgreement).map((d) => ({ label: DIMENSIONS[d].label, ...A.dimensions[d].subjectiveAgreement }));
  page.append(section('Performance by cognitive dimension', 'Objective items only (observable + inferential). Whiskers show 95% cluster-bootstrap intervals; the dashed line is this participant’s own average.',
    h('div', { class: 'card' }, withTable(intervalBars(dimData, { ref: avg, refLabel: 'own avg', width: 1040 }),
      [{ key: 'label', label: 'Dimension' }, { key: 'mean', label: 'Score', num: true, fmt: (v) => pct(v, 1) }, { key: 'lo', label: '95% CI', num: true, fmt: (v, r) => (Number.isFinite(v) ? `${pct(v)}–${pct(r.hi)}` : '—') }, { key: 'n', label: 'Items', num: true }, { key: 'clusters', label: 'Images', num: true }], dimData),
      subjRows.length ? h('div', { style: { marginTop: '14px' } }, h('h4', {}, 'Subjective items — agreement with reference annotation (not accuracy)'),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, subjRows.map((r) => `${r.label}: ${pct(r.mean)} (${r.n} items)`).join(' · '))) : null)));

  // ---------- exposure curve
  const be = A.byExposure;
  const expSeries = [
    { label: 'Observable (recognition)', points: be.map((b) => ({ x: b.exposureMs, y: b.observable.mean, ...band(b.observable), n: b.observable.n, tip: `measured ≈ ${fmtMs(b.actualMeanMs)} · ${b.nTrials} images` })) },
    { label: 'Inferential (interpretation)', points: be.map((b) => ({ x: b.exposureMs, y: b.inferential.mean, ...band(b.inferential), n: b.inferential.n, tip: `${b.nTrials} images` })) },
  ].filter((s) => s.points.some((p) => p.n > 0));
  const m = A.exposureModel;
  const modelText = m?.sufficient ? `Change per halving of exposure: ${-m.perHalving >= 0 ? '+' : '−'}${Math.abs(Math.round(m.perHalving * 100))} points (95% CI ${Math.round(-m.log.slopeHi * 100)} to ${Math.round(-m.log.slopeLo * 100)}); log model R² ${m.log.r2.toFixed(2)}, linear R² ${m.linear?.r2?.toFixed(2) ?? '—'}.` : 'At least 4 trials over 3 exposure levels are needed to model the curve.';
  const recInf = A.recognitionVsInference;
  page.append(h('div', { class: 'grid cols-2 section' },
    h('div', { class: 'card' }, h('h3', {}, 'Accuracy vs exposure duration'), h('div', { class: 'sub' }, 'Immediate-test trials. X axis is logarithmic; hover a point for measured duration.'),
      withTable(lineChart(expSeries, { xScale: 'log', xFmt: (v) => `${v} ms`, xLabel: 'Requested exposure' }),
        [{ key: 'exposureMs', label: 'Requested', num: true, fmt: (v) => `${v} ms` }, { key: 'actualMeanMs', label: 'Measured', num: true, fmt: fmtMs }, { key: 'obs', label: 'Observable', num: true }, { key: 'inf', label: 'Inferential', num: true }, { key: 'nTrials', label: 'Images', num: true }],
        be.map((b) => ({ ...b, obs: pct(b.observable.mean), inf: pct(b.inferential.mean) }))),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, modelText)),
    h('div', { class: 'card' }, h('h3', {}, 'Recognition vs inference'), h('div', { class: 'sub' }, 'Objectively verifiable observations compared with contextual interpretation, per dimension.'),
      withTable(intervalBars([
        { label: 'Observable — all', ...recInf.observable, color: 'var(--series-1)' },
        { label: 'Inferential — all', ...recInf.inferential, color: 'var(--series-2)' },
        ...dims.flatMap((d) => [A.dimensions[d].observable.n ? { label: `${DIMENSIONS[d].short} · obs.`, ...A.dimensions[d].observable, color: 'var(--series-1)', faded: true } : null, A.dimensions[d].inferential.n ? { label: `${DIMENSIONS[d].short} · inf.`, ...A.dimensions[d].inferential, color: 'var(--series-2)', faded: true } : null]).filter(Boolean),
      ]), [{ key: 'label', label: 'Group' }, { key: 'mean', label: 'Score', num: true, fmt: (v) => pct(v, 1) }, { key: 'n', label: 'Items', num: true }],
      [{ label: 'Observable', ...recInf.observable }, { label: 'Inferential', ...recInf.inferential }]),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, `Difference: ${Math.round(recInf.diff * 100)} points (± ${Math.round(1.96 * recInf.seDiff * 100) || '—'}).`)),
  ));

  // ---------- memory delay & RT
  const delaySeries = [{ label: 'Memory score', points: A.byDelay.map((d) => ({ x: d.delayMs / 1000, y: d.mean, ...band(d), n: d.n })) }];
  const rtTypes = ['all', ...Object.keys(A.rt.byType)];
  let rtType = 'all';
  const rtBox = h('div');
  const renderRt = () => { clear(rtBox); const vals = A.rt.values.filter((v) => rtType === 'all' || v.type === rtType).map((v) => v.ms); rtBox.append(histogram(vals)); };
  renderRt();
  page.append(h('div', { class: 'grid cols-2 section' },
    h('div', { class: 'card' }, h('h3', {}, 'Immediate vs delayed recall'), h('div', { class: 'sub' }, 'Module C (visual working memory), by retention interval.'),
      A.byDelay.length ? withTable(lineChart(delaySeries, { xFmt: (v) => (v ? `${v} s` : 'Immediate'), xLabel: 'Retention interval' }),
        [{ key: 'delayMs', label: 'Delay', num: true, fmt: (v) => `${v / 1000} s` }, { key: 'mean', label: 'Score', num: true, fmt: (v) => pct(v, 1) }, { key: 'n', label: 'Items', num: true }, { key: 'pos', label: 'Position', num: true }, { key: 'col', label: 'Colour', num: true }, { key: 'pres', label: 'Presence', num: true }],
        A.byDelay.map((d) => ({ ...d, pos: pct(d.bySubscale.position?.mean), col: pct(d.bySubscale.color?.mean), pres: pct(d.bySubscale['presence-absence']?.mean) }))) : h('div', { class: 'empty' }, 'Module C was not run.')),
    h('div', { class: 'card' }, h('h3', {}, 'Response time distribution'), h('div', { class: 'sub' }, `Time from question display to submission. Median correct ${fmtMs(A.rt.correctVsIncorrect.correct)} vs incorrect ${fmtMs(A.rt.correctVsIncorrect.incorrect)} (non-text).`),
      h('div', { style: { marginBottom: '10px' } }, segmented(rtTypes.map((t) => ({ value: t, label: t === 'all' ? 'All' : ({ mcq: 'Choice', multi: 'Multi-select', text: 'Free text', judgments: 'Judgements', grid: 'Position', count: 'Count', scale: 'Scale' }[t] || t) })), rtType, (v) => { rtType = v; renderRt(); }, { label: 'Question type' })),
      withTable(rtBox, [{ key: 'type', label: 'Type' }, { key: 'n', label: 'n', num: true }, { key: 'median', label: 'Median', num: true, fmt: fmtMs }, { key: 'q1', label: 'IQR', num: true, fmt: (v, r) => `${fmtMs(v)}–${fmtMs(r.q3)}` }],
        Object.entries(A.rt.byType).map(([type, s]) => ({ type, ...s })))),
  ));

  // ---------- calibration & timing
  const calPts = c.bins.filter((b) => b.n).map((b) => ({ x: b.meanExpected, y: b.accuracy, n: b.n, tip: `<b>${b.label}</b><br>implied ${pct(b.meanExpected)} · actual ${pct(b.accuracy)}<br>${b.n} items` }));
  const tPts = A.timing.points.map((p) => ({ x: p.requested, y: p.actual, color: p.quality === 'ok' ? 'var(--series-1)' : 'var(--series-2)', tip: `<b>Trial ${p.trial + 1}</b><br>requested ${p.requested} ms<br>measured ${p.actual.toFixed(1)} ms<br>${p.quality}` }));
  const tMax = Math.max(1000, ...A.timing.points.map((p) => Math.max(p.requested, p.actual))) * 1.05;
  const r = A.timing.refresh;
  page.append(h('div', { class: 'grid cols-2 section' },
    h('div', { class: 'card' }, h('h3', {}, 'Confidence vs actual accuracy'), h('div', { class: 'sub' }, 'Each point is a confidence level. Points below the diagonal indicate over-confidence; size reflects number of items.'),
      withTable(scatter(calPts, { xLabel: 'Accuracy implied by confidence (chance-adjusted)', yLabel: 'Actual score', sizeBy: true }),
        [{ key: 'label', label: 'Confidence' }, { key: 'n', label: 'Items', num: true }, { key: 'meanExpected', label: 'Implied', num: true, fmt: (v) => pct(v) }, { key: 'accuracy', label: 'Actual', num: true, fmt: (v) => pct(v) }], c.bins),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, c.n ? `Bias ${c.bias >= 0 ? '+' : ''}${Math.round(c.bias * 100)} pts · Brier ${c.brier.toFixed(3)} · resolution γ ${Number.isFinite(c.gamma) ? c.gamma.toFixed(2) : '—'} · ${c.n} rated items` : '')),
    h('div', { class: 'card' }, h('h3', {}, 'Presentation timing'), h('div', { class: 'sub' }, `Requested vs measured exposure per trial (rAF timestamps). Display ≈ ${r ? `${Number(r.estimatedHz).toFixed(1)} Hz, frame ${Number(r.medianFrameMs).toFixed(2)} ms` : 'unknown'}.`),
      h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: 'var(--series-1)' } }), 'OK'), h('span', {}, h('i', { style: { background: 'var(--series-2)' } }), 'Dropped frame / degraded')),
      withTable(scatter(tPts, { xDomain: [0, tMax], yDomain: [0, tMax], xFmt: (v) => `${Math.round(v)}`, yFmt: (v) => `${Math.round(v)}`, xLabel: 'Requested (ms)', yLabel: 'Measured (ms)' }),
        [{ key: 'trial', label: 'Trial', num: true, fmt: (v) => v + 1 }, { key: 'requested', label: 'Requested', num: true, fmt: fmtMs }, { key: 'actual', label: 'Measured', num: true, fmt: (v) => `${v.toFixed(1)} ms` }, { key: 'quality', label: 'Quality' }], A.timing.points),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, `${A.timing.droppedFrames} dropped frame(s) · ${A.timing.fullscreenExits} fullscreen exit(s) · ${A.timing.visibilityLosses} visibility loss(es). Measured values approximate screen timing; they cannot account for display latency.`)),
  ));

  // ---------- metrics table
  const mt = A.metrics;
  const sdt = A.sdt;
  page.append(section('Metrics', null, h('div', { class: 'grid cols-2' },
    h('div', { class: 'card' }, h('h3', {}, 'Named metrics'), h('dl', { class: 'kv', style: { marginTop: '10px' } },
      kv('Recognition accuracy', `${pct(mt.recognitionAccuracy.mean)} (${mt.recognitionAccuracy.n})`), kv('Recall accuracy (memory)', `${pct(mt.recallAccuracy.mean)} (${mt.recallAccuracy.n})`),
      kv('Contextual inference', `${pct(mt.contextualInference.mean)} (${mt.contextualInference.n})`), kv('Spatial relationship accuracy', `${pct(mt.spatialRelations.mean)} (${mt.spatialRelations.n})`),
      kv('Primary detail', `${pct(mt.primaryDetail.mean)} (${mt.primaryDetail.n})`), kv('Secondary detail', `${pct(mt.secondaryDetail.mean)} (${mt.secondaryDetail.n})`),
      kv('Median response latency', fmtMs(mt.medianLatencyMs)),
      ...Object.entries(sdt).filter(([, v]) => v).map(([k, v]) => kv({ objectRecognition: 'Object recognition d′', memoryPresence: 'Presence memory d′', interfaceIssues: 'Issue detection d′' }[k], `${v.dPrime.toFixed(2)} (c ${v.c.toFixed(2)}, ${v.n})`)))),
    h('div', { class: 'card' }, h('h3', {}, 'Subscales'), h('div', { class: 'table-wrap', style: { maxHeight: '340px', overflow: 'auto', marginTop: '6px' } }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Dimension'), h('th', {}, 'Subscale'), h('th', {}, 'Type'), h('th', { class: 'num' }, 'Score'), h('th', { class: 'num' }, 'n'))),
      h('tbody', {}, A.subscales.map((s) => h('tr', {}, h('td', {}, DIMENSIONS[s.dimension]?.short || s.dimension), h('td', {}, s.subscale), h('td', {}, epiBadge(s.epistemic)), h('td', { class: 'num' }, pct(s.mean)), h('td', { class: 'num' }, s.n))))))),
  )));

  // ---------- report
  page.append(section('Report', 'Generated from the data above. Statements are hedged by sample size; no norms, IQ estimates or diagnoses.',
    h('div', { class: 'card' }, report.sections.map((s) => h('div', { class: 'report-section' }, h('h3', {}, s.heading),
      (s.paragraphs || []).map((p) => h('p', {}, p)),
      (s.qa || []).map(({ q, a }) => h('div', { class: 'qa' }, h('b', {}, q), h('p', {}, a))),
      (s.groups || []).map((g) => h('div', {}, g.label ? h('div', { style: { fontWeight: 600, fontSize: '13.5px', marginTop: '6px' } }, g.label) : null, h('ul', {}, g.items.map((i) => h('li', {}, i))))))))));

  // ---------- trial review
  const reviewBox = h('div');
  page.append(section('Trial review', 'Correct answers are revealed only now that the session has ended. Free-text scoring evidence is shown for auditing.', reviewBox));
  session.trials.forEach((t) => reviewBox.append(trialReview(t)));
}

function trialReview(t) {
  const det = h('details', { class: 'trial' });
  const scores = t.scores.filter((s) => s.epistemic !== 'subjective');
  const mean = scores.length ? scores.reduce((a, s) => a + s.score, 0) / scores.length : NaN;
  const ex = t.exposure;
  det.append(h('summary', {},
    h('span', { class: 'mono small muted' }, `#${t.index + 1}`),
    h('span', { class: 'badge' }, t.practice ? 'Practice' : `Module ${t.module}`),
    h('span', {}, CATEGORIES[t.category] || t.category),
    h('span', { class: 'muted small' }, `${t.condition.exposureMs} ms${ex ? ` → ${ex.actualMs.toFixed(1)} ms` : ''}${t.condition.delayMs ? ` · delay ${t.condition.delayMs / 1000} s` : ''}`),
    ex && ex.quality !== 'ok' ? h('span', { class: `badge ${ex.quality === 'invalid' ? 'bad' : 'warn'}` }, ex.quality) : null,
    t.flags?.interrupted ? h('span', { class: 'badge bad' }, 'interrupted') : null,
    h('span', { style: { marginLeft: 'auto' }, class: 'small' }, scoreBar(mean), pct(mean))));
  let filled = false;
  det.addEventListener('toggle', () => {
    if (!det.open || filled) return;
    filled = true;
    let ann; let img;
    try { const g = generate(t.stimulusId); ann = g.annotation; img = g.svg ? svgToDataUrl(g.svg) : g.src; } catch { ann = null; }
    const qs = t.questions.map((q) => {
      const r = t.responses.find((x) => x.questionId === q.id);
      const s = t.scores.find((x) => x.questionId === q.id);
      return h('div', { class: 'qreview' },
        h('div', { class: 'row', style: { justifyContent: 'space-between', gap: '8px' } }, h('span', { class: 'p' }, q.prompt), h('span', { class: 'small', style: { whiteSpace: 'nowrap' } }, epiBadge(q.epistemic), ' ', s ? h('span', {}, scoreBar(s.score), pct(s.score)) : '—')),
        h('div', { class: 'a' }, 'Answer: ', r ? (r.response?.skipped ? h('i', {}, 'I don’t know') : describeResponse(q, r.response) || '—') : h('i', {}, 'not answered'), r?.confidence ? h('span', { class: 'muted' }, ` · confidence: ${CONFIDENCE_LEVELS[r.confidence - 1]}`) : null, r ? h('span', { class: 'muted' }, ` · ${fmtMs(r.latencyMs)}`) : null),
        h('div', { class: 'r' }, 'Reference: ', referenceText(q, s, ann)));
    });
    det.append(h('div', { class: 'trial-body' },
      h('div', {}, img ? h('img', { src: img, alt: `Stimulus ${t.stimulusId}`, loading: 'lazy' }) : null,
        h('dl', { class: 'kv small', style: { marginTop: '10px' } }, kv('Stimulus', t.stimulusId), kv('Context', ann?.context || '—'), kv('Lighting', ann?.lighting || '—'),
          ex ? kv('Frames', `${ex.targetFrames} planned · ${ex.framesElapsed} elapsed · ${ex.droppedFrames} dropped`) : null, ex ? kv('Fixation / mask', `${Math.round(ex.fixationActualMs)} / ${Math.round(ex.maskActualMs)} ms`) : null)),
      h('div', {}, qs)));
  });
  return det;
}

function referenceText(q, s, ann) {
  if (!s) return '—';
  const d = s.detail || {};
  switch (q.type) {
    case 'mcq': return q.colorScored ? `${q.truth.color} (adjacent hues earn half credit)` : `${q.options.filter((o) => (o.credit ?? 0) > 0).sort((a, b) => b.credit - a.credit).map((o) => `${o.label}${o.credit < 1 ? ` (${Math.round(o.credit * 100)}% credit)` : ''}`).join('; ')}`;
    case 'multi': return q.epistemic === 'subjective' ? `reference: ${q.options.filter((o) => o.target).map((o) => o.label).join(', ')} (agreement, not accuracy)` : `present: ${q.options.filter((o) => o.target).map((o) => o.label).join(', ')}`;
    case 'count': return `${q.truth.value}`;
    case 'grid': return `region ${q.truth.cells.map((c) => c.cell + 1).join(' / ')} (adjacent regions earn partial credit)`;
    case 'scale': return `${q.truth.value} on the 1–7 scale`;
    case 'judgments': return q.items.map((it) => `${it.text} → ${q.columns.find((c) => c.id === it.answer)?.label}`).join(' · ');
    case 'text':
      if (q.truth.mode === 'objects') return `matched: ${(d.matched || []).join(', ') || 'none'}; missed: ${(d.missed || []).join(', ') || 'none'}${d.intrusions?.length ? `; not in image: ${d.intrusions.join(', ')}` : ''}`;
      if (q.truth.mode === 'interpretation') return `reference reading: “${q.truth.reference}”; matched terms: ${(d.satisfied || []).join(', ') || 'none'}`;
      if (q.truth.mode === 'issues') return `planted problems: ${(d.planted || []).join('; ')}; addressed: ${(d.hits || []).length}`;
      return `visual cues mentioned: ${(d.cueGroups || []).join(', ') || 'none'} (qualitative)`;
    default: return '—';
  }
}

// CI bands only where at least 3 images contribute; otherwise they mislead
const band = (st) => (st.clusters >= 3 ? { lo: st.lo, hi: st.hi } : {});
const statusLabel = (s) => ({ completed: 'Completed', aborted: 'Incomplete (stopped early)', running: 'In progress' }[s] || s);
const epiBadge = (e) => h('span', { class: `badge ${EPI[e]?.[1] || ''}` }, EPI[e]?.[0] || e);
const scoreBar = (v) => h('span', { class: 'scorebar' }, h('i', { style: { width: `${Number.isFinite(v) ? Math.round(v * 100) : 0}%` } }));
const kv = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
function tile(label, value, detail) { return h('div', { class: 'card' }, h('div', { class: 'stat' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'detail' }, detail))); }
function section(title, sub, ...content) { return h('div', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', {}, title), sub ? h('span', { class: 'muted small', style: { maxWidth: '640px' } }, sub) : null), ...content); }
export { toast };
