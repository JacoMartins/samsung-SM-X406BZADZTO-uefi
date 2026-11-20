// Session runner: orchestrates fixation → exposure → mask → retention →
// questions → inter-trial interval, with fullscreen, visibility and pause
// handling. All state is persisted after every response.
import { h, clear } from '../dom.js';
import { store } from '../../core/store.js';
import { generate } from '../../dataset/dataset.js';
import { PARADIGMS } from '../../engine/paradigms.js';
import { PresentationController, estimateRefresh, loadBitmap, makeMask, framePlan } from '../../engine/presentation.js';
import { recordExposure, recordResponse, logEvent, completeSession } from '../../engine/experiment.js';
import { askQuestion } from '../../responses/collector.js';
import { Rng } from '../../core/rng.js';
import { app } from '../app-state.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BLOCK_NOTES = {
  A: 'Look at the centre cross. The image appears briefly and is then covered by a pattern mask. Afterwards, describe and identify what you saw.',
  B: 'Focus on understanding the situation: what is going on, what came before and what might come next.',
  C: 'After the image there may be a pause of up to 20 seconds before the questions. Keep your eyes on the screen; try to hold the image in mind.',
  D: 'Pay attention to mood, light, colour and composition as well as content.',
  E: 'You will see screenshots of unfamiliar websites and apps. Note the layout, hierarchy and anything that looks wrong.',
};

export async function runView(root, sessionId) {
  let session = app.active?.id === sessionId ? app.active : store.getSession(sessionId);
  if (!session) { root.append(h('div', { class: 'page narrow' }, h('h1', {}, 'Session not found'), h('p', {}, h('a', { href: '#/' }, 'Back to sessions')))); return; }
  if (session.status !== 'running') { location.hash = `#/results/${session.id}`; return; }
  app.active = session;

  document.body.classList.add('testing');
  const testRoot = h('div', { class: 'test-root' });
  const meta = h('div', { class: 'trial-meta' });
  const progress = h('div', { class: 'progress-line', style: { width: '0%' } });
  const pauseBtn = h('button', { class: 'btn ghost sm pause-btn', type: 'button', title: 'Pause (Esc)' }, 'Pause');
  const surface = h('div', { style: { display: 'contents' } });
  testRoot.append(progress, meta, pauseBtn, surface);
  root.append(testRoot);

  const save = () => { if (!store.saveSession(session)) console.warn('Session could not be saved to local storage'); };
  let quitting = false; let paused = null;
  const onFs = () => { if (!document.fullscreenElement) logEvent(session, 'fullscreen-exit', { trial: session.cursor.trial }); };
  const onVis = () => { if (document.visibilityState !== 'visible') logEvent(session, 'hidden', { trial: session.cursor.trial }); };
  const onBlur = () => logEvent(session, 'blur', { trial: session.cursor.trial });
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  const cleanup = () => {
    document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur);
    document.body.classList.remove('testing');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  app.onLeave = cleanup;

  function pause() {
    if (paused) return paused.promise;
    let resolveFn;
    const promise = new Promise((r) => { resolveFn = r; });
    const overlay = h('div', { class: 'modal' }, h('div', { class: 'modal-card', style: { maxWidth: '440px' } },
      h('h2', {}, 'Session paused'),
      h('p', { class: 'muted', style: { marginTop: '8px' } }, 'Your answers so far are saved. If you quit now, the session is marked as incomplete and its partial results remain available.'),
      h('div', { class: 'row', style: { marginTop: '16px', justifyContent: 'flex-end' } },
        h('button', { class: 'btn danger', type: 'button', onclick: () => done('quit') }, 'Save & quit'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => done('resume') }, 'Resume'))));
    function done(v) { overlay.remove(); paused = null; if (v === 'quit') quitting = true; logEvent(session, v === 'quit' ? 'abort' : 'resume'); resolveFn(v); }
    logEvent(session, 'pause', { trial: session.cursor.trial });
    document.body.append(overlay);
    paused = { promise };
    return promise;
  }
  pauseBtn.addEventListener('click', () => pause());
  const escKey = (e) => { if (e.key === 'Escape' && !paused) { e.preventDefault(); pause(); } };
  document.addEventListener('keydown', escKey);

  /** Show a message on the stage and wait for Space (or a click on the button). */
  function waitSpace(content, { button = 'Continue' } = {}) {
    return new Promise((resolve) => {
      clear(surface);
      testRoot.className = 'test-root';
      const btn = h('button', { class: 'btn', type: 'button', style: { marginTop: '18px', background: 'transparent', color: '#e8e8e6', borderColor: '#55565a' } }, button, ' ', h('span', { class: 'kbd' }, 'Space'));
      const box = h('div', { class: 'stage-msg' }, content, btn);
      surface.append(box);
      const go = async () => { document.removeEventListener('keydown', onKey); if (paused) await paused.promise; resolve(); };
      const onKey = (e) => { if (e.code === 'Space' && !paused) { e.preventDefault(); go(); } };
      document.addEventListener('keydown', onKey);
      btn.addEventListener('click', go);
      btn.focus();
    });
  }

  // ---------------- intro & calibration ----------------
  const cfg = session.config;
  const nativeApp = !!globalThis.__vcwNative;   // Android app: native immersive mode instead of the Fullscreen API
  const touch = matchMedia('(hover: none)').matches;
  let fsUnavailable = nativeApp || !document.documentElement.requestFullscreen;
  const resuming = session.cursor.trial > 0 || session.trials.some((t) => t.exposure);
  clear(surface);
  surface.append(h('div', { class: 'stage-msg' }, h('h2', {}, 'Measuring display…'), h('p', {}, 'Please wait a moment and keep this window in front.')));
  await sleep(200);
  const refresh = await estimateRefresh(120);
  session.environment = { ...session.environment, refresh: session.environment?.refresh && resuming ? session.environment.refresh : refresh, refreshAtResume: resuming ? refresh : undefined };
  const frameMs = refresh.medianFrameMs;
  const exposuresAll = [...new Set(session.trials.map((t) => t.condition.exposureMs))].sort((a, b) => a - b);
  const quant = exposuresAll.map((e) => { const p = framePlan(e, frameMs); return `${e} ms → ${p.frames} frames (${p.expectedMs.toFixed(1)} ms)`; });
  logEvent(session, 'refresh-estimated', refresh);
  save();

  await waitSpace([
    h('h2', {}, resuming ? 'Resume session' : 'Before you begin'),
    h('p', {}, resuming ? 'The trial that was interrupted will be skipped, because its image has already been seen.' : `${session.trials.length} trials${session.trials.some((t) => t.practice) ? `, starting with ${session.trials.filter((t) => t.practice).length} practice trial(s) that are not scored` : ''}. Each image is shown only once and disappears automatically. You will not be told whether answers are correct until the end.`),
    h('p', {}, 'Sit at a comfortable distance, avoid distractions, and look at the cross in the centre before each image. ', touch ? 'Tap Pause (top right) to pause at any time.' : ['Press ', h('span', { class: 'kbd' }, 'Esc'), ' to pause at any time.']),
    h('p', { style: { fontSize: '13px' } }, `Display: about ${refresh.estimatedHz.toFixed(1)} Hz${refresh.stable ? '' : ' (irregular — close other tabs for better timing)'}. Exposures are rounded to whole frames: ${quant.join('; ')}. Actual on-screen times are measured and recorded, but browsers cannot guarantee exact photon timing.`),
  ], { button: cfg.fullscreen && !fsUnavailable ? 'Enter fullscreen & start' : 'Start' });

  async function ensureFullscreen() {
    if (!cfg.fullscreen || fsUnavailable || document.fullscreenElement) return;
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await sleep(350); logEvent(session, 'fullscreen-enter'); }
    catch { fsUnavailable = true; logEvent(session, 'fullscreen-denied'); }
  }
  await ensureFullscreen();

  // interrupted trial on resume → invalidate (stimulus already seen)
  const cur = session.trials[session.cursor.trial];
  if (cur && cur.exposure && cur.responses.length < cur.questions.length) {
    cur.flags.invalid = true; cur.flags.interrupted = true; session.cursor.trial++; save();
  }

  const canvas = h('canvas', { class: 'stage-canvas', 'aria-hidden': 'true' });
  const pc = new PresentationController(canvas, { background: getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#1e1f22', frameMs });
  const stageSize = () => {
    const s = Math.min(1, (innerWidth - 32) / 960, (innerHeight - 32) / 600);
    return { w: Math.round(960 * s), h: Math.round(600 * s), scale: s };
  };
  session.environment.platform = nativeApp ? `${globalThis.__vcwNative.platform}-app (native immersive mode)` : 'browser';
  if (nativeApp) logEvent(session, 'native-immersive');
  session.environment.screen = { w: screen.width, h: screen.height, dpr: devicePixelRatio, viewport: { w: innerWidth, h: innerHeight } };
  session.environment.stimulusCss = stageSize();

  const loadTrialAssets = (t) => Promise.all([loadBitmap(generate(t.stimulusId)), makeMask(`${session.seed}:${t.index}`)]);
  let nextAssets = session.trials[session.cursor.trial] ? loadTrialAssets(session.trials[session.cursor.trial]) : null;
  let lastBlock = null; let lastPractice = null;

  try {
    for (let ti = session.cursor.trial; ti < session.trials.length && !quitting; ti++) {
      const t = session.trials[ti];
      session.cursor = { trial: ti, question: 0 };
      const assetsP = nextAssets;
      nextAssets = session.trials[ti + 1] ? loadTrialAssets(session.trials[ti + 1]) : null;
      const mainTotal = session.trials.filter((x) => !x.practice).length;
      const mainIdx = session.trials.filter((x) => !x.practice && x.index < t.index).length + 1;
      meta.textContent = t.practice ? `Practice ${ti + 1}` : `Trial ${mainIdx} of ${mainTotal}`;
      progress.style.width = `${(ti / session.trials.length) * 100}%`;

      if (t.module !== lastBlock || t.practice !== lastPractice) {
        const p = PARADIGMS.get(t.module);
        await waitSpace([
          h('div', { class: 'eyebrow', style: { color: '#8a8a88' } }, t.practice ? 'Practice' : `Block · Module ${t.module}`),
          h('h2', {}, p.name), h('p', {}, BLOCK_NOTES[t.module] || p.summary),
          t.practice ? h('p', {}, 'Practice trials use separate images and are not included in your results.') : null,
        ], { button: 'Begin' });
        lastBlock = t.module; lastPractice = t.practice;
      } else {
        await waitSpace([h('p', {}, 'Ready for the next image?')], { button: 'Start trial' });
      }
      if (quitting) break;
      if (cfg.fullscreen && !fsUnavailable && !document.fullscreenElement) {
        await waitSpace([h('h2', {}, 'Fullscreen was exited'), h('p', {}, 'Return to fullscreen to keep conditions consistent.')], { button: 'Return to fullscreen' });
        await ensureFullscreen();
      }

      // presentation
      const [bitmap, mask] = await assetsP;
      clear(surface); testRoot.className = 'test-root';
      meta.style.visibility = 'hidden'; pauseBtn.style.visibility = 'hidden'; progress.style.visibility = 'hidden';
      const size = stageSize();
      pc.resize(size.w, size.h);
      pc.clear();
      surface.append(canvas);
      const exposure = await pc.present({ bitmap, mask, fixationMs: t.condition.fixationMs, exposureMs: t.condition.exposureMs, maskMs: t.condition.maskMs });
      exposure.stimulusCss = size;
      recordExposure(session, ti, exposure);
      logEvent(session, 'exposure', { trial: ti, actualMs: exposure.actualMs, quality: exposure.quality });
      bitmap.close?.();
      save();

      // retention interval
      const retStart = performance.now();
      if (t.condition.delayMs > 0) t.retention = await retention(surface, t.condition.delayMs, cfg.retentionFiller, new Rng(`filler:${session.seed}:${ti}`));
      meta.style.visibility = ''; pauseBtn.style.visibility = ''; progress.style.visibility = '';
      t.retention = { ...(t.retention || {}), requestedMs: t.condition.delayMs, actualMs: Math.round(performance.now() - retStart) };

      // questions
      testRoot.className = 'test-root questions';
      for (let qi = 0; qi < t.questions.length; qi++) {
        if (t.responses.some((r) => r.questionId === t.questions[qi].id)) continue;
        session.cursor.question = qi;
        const q = t.questions[qi];
        const res = await askQuestion(surface, q, { index: qi, total: t.questions.length, practice: t.practice, onAbort: () => pause() });
        if (paused) await paused.promise;
        recordResponse(session, ti, q, { response: res.response, confidence: res.confidence, tShown: res.tShown, tFirstInput: res.tFirstInput, tSubmit: res.tSubmit, latencyMs: res.latencyMs, firstInputLatencyMs: res.firstInputLatencyMs, sinceOffsetMs: Math.round(res.tShown - exposure.offsetTs), serial: qi });
        save();
        if (quitting) break;
      }
      if (quitting) break;
      session.cursor.trial = ti + 1;
      store.addSeen(session.participantId, [t.stimulusId]);
      save();
      // inter-trial interval: blank neutral stage
      clear(surface); testRoot.className = 'test-root';
      surface.append(h('div', { class: 'stage-dot', 'aria-hidden': 'true' }));
      await sleep(cfg.timing.itiMs);
    }
  } finally {
    pc.destroy();
    document.removeEventListener('keydown', escKey);
  }
  completeSession(session, quitting ? 'aborted' : 'completed');
  store.addSeen(session.participantId, session.trials.filter((t) => t.exposure).map((t) => t.stimulusId));
  save();
  cleanup();
  app.onLeave = null;
  location.hash = `#/results/${session.id}`;
}

/** Retention interval with optional parity-judgement filler task. */
async function retention(surface, ms, filler, rng) {
  clear(surface);
  const bar = h('i');
  const box = h('div', { class: 'retention' });
  surface.append(box);
  const rec = { filler, responses: [] };
  const start = performance.now();
  if (filler === 'parity') {
    const digit = h('div', { class: 'digit', 'aria-live': 'off' });
    box.append(h('p', { style: { color: '#9a9a98', margin: 0, fontSize: '13px' } }, 'Press ', h('span', { class: 'kbd' }, 'F'), ' for odd, ', h('span', { class: 'kbd' }, 'J'), ' for even'), digit, h('div', { class: 'bar' }, bar));
    let current = null; let shownAt = 0;
    const onKey = (e) => {
      if (current == null) return;
      const k = e.key.toLowerCase(); if (k !== 'f' && k !== 'j') return;
      rec.responses.push({ digit: current, key: k, correct: (current % 2 === 1) === (k === 'f'), rtMs: Math.round(performance.now() - shownAt) });
      current = null; digit.style.opacity = '0.3';
    };
    document.addEventListener('keydown', onKey);
    while (performance.now() - start < ms - 400) {
      current = rng.int(1, 9); shownAt = performance.now(); digit.textContent = String(current); digit.style.opacity = '1';
      bar.style.width = `${Math.min(100, ((performance.now() - start) / ms) * 100)}%`;
      await sleep(Math.min(1000, ms - (performance.now() - start)));
    }
    digit.textContent = '';
    await sleep(Math.max(0, ms - (performance.now() - start)));
    document.removeEventListener('keydown', onKey);
    rec.accuracy = rec.responses.length ? rec.responses.filter((r) => r.correct).length / rec.responses.length : null;
  } else {
    box.append(h('div', { class: 'stage-dot' }), h('div', { class: 'bar' }, bar));
    while (performance.now() - start < ms) { bar.style.width = `${Math.min(100, ((performance.now() - start) / ms) * 100)}%`; await sleep(100); }
  }
  return rec;
}
