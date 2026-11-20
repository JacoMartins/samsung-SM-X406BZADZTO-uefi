// Session configuration.
import { h, clear, switchInput, segmented, toast } from '../dom.js';
import { store } from '../../core/store.js';
import { PARADIGMS } from '../../engine/paradigms.js';
import { defaultConfig, applyPreset, validateConfig, SESSION_PRESETS, EXPOSURE_PRESETS, DELAY_PRESETS, createSession } from '../../engine/experiment.js';
import { app } from '../app-state.js';

function estimateMinutes(cfg) {
  let sec = 0;
  for (const [id, m] of Object.entries(cfg.modules)) {
    if (!m.enabled) continue;
    const perQ = { A: 9, B: 12, C: 9, D: 11, E: 14 }[id] || 10;
    const nq = { A: 7, B: 8, C: 6, D: 7, E: 6 }[id] || 6;
    const meanDelay = m.delays.reduce((a, b) => a + b, 0) / m.delays.length / 1000;
    sec += m.trials * (nq * perQ + 4 + meanDelay + cfg.timing.itiMs / 1000);
  }
  sec += (cfg.practiceTrials || 0) * 70;
  return Math.round(sec / 60);
}

export function setupView(root) {
  let cfg = store.getConfig() || defaultConfig();
  // merge new defaults (e.g. paradigms added later)
  const base = defaultConfig();
  cfg = { ...base, ...cfg, timing: { ...base.timing, ...cfg.timing }, modules: { ...base.modules, ...cfg.modules } };
  const page = h('div', { class: 'page' });
  root.append(page);

  const persist = () => store.setConfig(cfg);
  const render = () => {
    clear(page);
    const errs = validateConfig(cfg);
    const minutes = estimateMinutes(cfg);
    page.append(
      h('div', { class: 'page-head' },
        h('div', {}, h('div', { class: 'eyebrow' }, 'Configuration'), h('h1', {}, 'New session'),
          h('p', {}, 'Choose the modules, exposure conditions and controls. Every random decision is derived from the session seed, so a configuration and seed fully reproduce the trial plan.')),
        h('div', { class: 'row' }, h('span', { class: 'muted small' }, `≈ ${minutes} min`), h('button', { class: 'btn primary lg', type: 'button', disabled: errs.length ? true : null, onclick: start }, 'Start session'))),
      errs.length ? h('div', { class: 'notice warn', style: { marginBottom: '20px' } }, errs.map((e) => h('div', {}, e))) : '',

      h('div', { class: 'grid cols-2' },
        h('div', { class: 'card' },
          h('h3', {}, 'Participant'), h('div', { class: 'sub' }, 'Use a pseudonymous code. Images already shown to this code are excluded automatically.'),
          h('div', { class: 'grid', style: { gap: '12px' } },
            field('Participant code', input(cfg.participantId, (v) => { cfg.participantId = v.trim(); }, { placeholder: 'e.g. P014' })),
            field('Session label', input(cfg.sessionLabel, (v) => { cfg.sessionLabel = v; }, { placeholder: 'optional, e.g. baseline' })),
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'muted small' }, `${store.getSeen(cfg.participantId || '').size} images previously seen by this code`),
              h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { if (confirm(`Forget which images participant "${cfg.participantId}" has seen? They may then be shown again.`)) { store.clearSeen(cfg.participantId); render(); } } }, 'Reset seen images')))),
        h('div', { class: 'card' },
          h('h3', {}, 'Session length'), h('div', { class: 'sub' }, 'Presets set the number of trials per module; adjust individually below.'),
          h('div', { class: 'chips' }, Object.entries(SESSION_PRESETS).map(([k, p]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => { cfg = applyPreset(cfg, k); persist(); render(); } }, p.label))),
          h('div', { class: 'grid cols-2', style: { marginTop: '16px', gap: '12px' } },
            field('Practice trials', number(cfg.practiceTrials, 0, 5, (v) => { cfg.practiceTrials = v; }), 'Training pool; not scored'),
            field('Seed', input(cfg.seed, (v) => { cfg.seed = v; }, { placeholder: 'blank = random' }), 'Same seed → same plan')))),

      h('div', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', {}, 'Modules'), h('span', { class: 'muted small' }, 'Durations are rounded to whole display frames at run time and the measured value is recorded.')),
        h('div', { class: 'grid cols-2' }, [...PARADIGMS.values()].map(moduleCard))),

      h('div', { class: 'section' }, h('h2', {}, 'Experimental controls'),
        h('div', { class: 'grid cols-3' },
          h('div', { class: 'card' }, h('h3', {}, 'Fixation'), h('div', { class: 'sub' }, 'A cross precedes every image; random jitter prevents anticipating onset.'),
            h('div', { class: 'grid', style: { gap: '12px' } },
              field('Fixation duration (ms)', number(cfg.timing.fixationMs, 200, 3000, (v) => { cfg.timing.fixationMs = v; })),
              field('Random jitter, up to (ms)', number(cfg.timing.fixationJitterMs, 0, 2000, (v) => { cfg.timing.fixationJitterMs = v; })))),
          h('div', { class: 'card' }, h('h3', {}, 'Backward mask'), h('div', { class: 'sub' }, 'A pattern mask replaces the image at offset so it does not linger as an after-image.'),
            h('div', { class: 'grid', style: { gap: '12px' } },
              h('label', { class: 'check' }, switchInput(cfg.timing.maskEnabled, (v) => { cfg.timing.maskEnabled = v; persist(); render(); }, 'Mask enabled'), 'Show mask after each image'),
              field('Mask duration (ms)', number(cfg.timing.maskMs, 0, 2000, (v) => { cfg.timing.maskMs = v; }, !cfg.timing.maskEnabled)))),
          h('div', { class: 'card' }, h('h3', {}, 'Pacing'), h('div', { class: 'sub' }, 'Blank interval after each trial; the participant then starts the next trial.'),
            h('div', { class: 'grid', style: { gap: '12px' } },
              field('Inter-trial interval (ms)', number(cfg.timing.itiMs, 0, 10000, (v) => { cfg.timing.itiMs = v; })),
              field('Retention filler (memory delays)', select(cfg.retentionFiller, [['none', 'None — blank screen'], ['parity', 'Odd/even digit task (limits rehearsal)']], (v) => { cfg.retentionFiller = v; })))),
        ),
        h('div', { class: 'card', style: { marginTop: '16px' } },
          h('div', { class: 'grid cols-3' },
            h('label', { class: 'check' }, switchInput(cfg.fullscreen, (v) => { cfg.fullscreen = v; persist(); }, 'Fullscreen'), h('span', {}, h('b', {}, 'Fullscreen testing'), h('br'), h('span', { class: 'muted small' }, 'Exits are logged; participant is asked to return.'))),
            h('label', { class: 'check' }, switchInput(cfg.excludePreviouslySeen, (v) => { cfg.excludePreviouslySeen = v; persist(); }, 'Exclude seen'), h('span', {}, h('b', {}, 'Never repeat images'), h('br'), h('span', { class: 'muted small' }, 'Across sessions for this participant code.'))),
            h('div', {}, h('b', { class: 'small' }, 'Block order'), h('div', { style: { marginTop: '6px' } }, segmented([{ value: 'random', label: 'Randomised' }, { value: 'fixed', label: 'A → E' }], cfg.blockOrder, (v) => { cfg.blockOrder = v; persist(); }, { label: 'Block order' })))))),
    );
  };

  function moduleCard(p) {
    const m = cfg.modules[p.id];
    const exposureChips = h('div', { class: 'chips' }, [...new Set([...EXPOSURE_PRESETS, ...m.exposures])].sort((a, b) => a - b).map((e) => chip(`${e} ms`, m.exposures.includes(e), () => { toggle(m.exposures, e); })));
    const custom = h('input', { type: 'number', min: 10, max: 10000, placeholder: 'custom ms', style: { width: '110px' }, 'aria-label': 'Custom exposure in ms' });
    custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = Math.round(Number(custom.value)); if (v >= 10 && v <= 10000 && !m.exposures.includes(v)) { m.exposures.push(v); m.exposures.sort((a, b) => a - b); persist(); render(); } } });
    return h('div', { class: 'card', style: { opacity: m.enabled ? 1 : 0.6 } },
      h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
        h('div', {}, h('div', { class: 'eyebrow' }, `Module ${p.id}`), h('h3', {}, p.name)),
        switchInput(m.enabled, (v) => { m.enabled = v; persist(); render(); }, `Enable module ${p.id}`)),
      h('p', { class: 'muted small', style: { margin: '6px 0 14px' } }, p.summary),
      h('div', { class: 'grid', style: { gap: '12px' } },
        field('Trials', number(m.trials, 0, 40, (v) => { m.trials = v; }, !m.enabled)),
        h('div', {}, h('div', { class: 'small', style: { fontWeight: 550, color: 'var(--ink-2)', marginBottom: '6px' } }, 'Exposure durations'), h('div', { class: 'row' }, exposureChips, custom)),
        p.id === 'C' || m.delays.some((d) => d > 0) ? h('div', {}, h('div', { class: 'small', style: { fontWeight: 550, color: 'var(--ink-2)', marginBottom: '6px' } }, 'Retention delays'),
          h('div', { class: 'chips' }, DELAY_PRESETS.map((d) => chip(d ? `${d / 1000} s` : 'Immediate', m.delays.includes(d), () => toggle(m.delays, d))))) : null,
        h('div', { class: 'muted small' }, `${m.exposures.length * m.delays.length} condition(s), balanced across ${m.trials} trials`)));
  }

  function toggle(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { arr.push(v); arr.sort((a, b) => a - b); } persist(); render(); }
  const chip = (label, on, fn) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick: fn }, label);
  const field = (label, control, hint) => h('label', { class: 'field' }, h('span', {}, label, hint ? h('span', { class: 'hint' }, ` · ${hint}`) : null), control);
  function input(val, set, attrs = {}) { const el = h('input', { type: 'text', value: val ?? '', ...attrs }); el.addEventListener('change', () => { set(el.value); persist(); render(); }); return el; }
  function number(val, min, max, set, disabled) { const el = h('input', { type: 'number', min, max, value: val, disabled: disabled || null }); el.addEventListener('change', () => { const v = Math.max(min, Math.min(max, Math.round(Number(el.value) || 0))); set(v); persist(); render(); }); return el; }
  function select(val, options, set) { const el = h('select', {}, options.map(([v, l]) => h('option', { value: v, selected: v === val ? true : null }, l))); el.addEventListener('change', () => { set(el.value); persist(); }); return el; }

  function start() {
    const errs = validateConfig(cfg);
    if (errs.length) { toast(errs[0]); return; }
    persist();
    const session = createSession(cfg, { userAgent: navigator.userAgent, language: navigator.language, screen: { w: screen.width, h: screen.height, dpr: devicePixelRatio } }, { seen: store.getSeen(cfg.participantId) });
    const short = Object.entries(cfg.modules).filter(([, m]) => m.enabled).reduce((n, [id, m]) => n + Math.max(0, m.trials - session.trials.filter((t) => !t.practice && t.module === id).length), 0);
    if (short) toast(`${short} trial(s) could not be filled: the participant has seen most images in a category.`, 4000);
    store.saveSession(session);
    app.active = session;
    location.hash = `#/run/${session.id}`;
  }
  render();
}
