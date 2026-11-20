// Response collection: renders one question, records timing of display,
// first interaction and submission (performance.now()), and resolves with the
// raw response. No correctness feedback is ever shown here.
import { h, clear } from '../ui/dom.js';
import { CONFIDENCE_LEVELS } from '../analytics/analytics.js';

export function askQuestion(container, q, { index, total, practice, onAbort } = {}) {
  return new Promise((resolve) => {
    clear(container);
    const state = { response: null, confidence: null };
    let tFirst = null;
    const touch = () => { if (tFirst == null) tFirst = performance.now(); };
    const err = h('div', { class: 'qerr', role: 'alert' });
    const body = h('div', { class: 'qbody' });
    const keyHandlers = [];

    const setResp = (r) => { touch(); state.response = r; err.textContent = ''; };

    if (q.type === 'mcq' || q.type === 'multi') {
      const multi = q.type === 'multi';
      const sel = new Set();
      const cols = q.options.length > 5 && q.options.every((o) => o.label.length < 26);
      const list = h('div', { class: `options${cols ? ' cols-2' : ''}`, role: multi ? 'group' : 'radiogroup', 'aria-label': q.prompt });
      const buttons = q.options.map((o, i) => {
        const b = h('button', { type: 'button', class: 'option', [multi ? 'aria-pressed' : 'aria-checked']: 'false', role: multi ? null : 'radio' },
          h('span', { class: 'key' }, i < 9 ? String(i + 1) : ''), o.swatch ? h('span', { class: 'sw', style: { background: o.swatch } }) : null, h('span', {}, o.label));
        b.addEventListener('click', () => choose(i));
        return b;
      });
      function choose(i) {
        const o = q.options[i];
        if (multi) {
          if (sel.has(o.id)) sel.delete(o.id);
          else { if (q.maxSelect && sel.size >= q.maxSelect) { err.textContent = `Select at most ${q.maxSelect}.`; return; } sel.add(o.id); }
          buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(sel.has(q.options[k].id))));
          setResp({ selected: [...sel] });
        } else {
          buttons.forEach((b, k) => b.setAttribute('aria-checked', String(k === i)));
          setResp({ optionId: o.id });
        }
      }
      keyHandlers.push((e) => { const n = Number(e.key); if (n >= 1 && n <= q.options.length) { choose(n - 1); return true; } return false; });
      list.append(...buttons);
      body.append(list);
      if (multi) body.append(h('p', { class: 'muted small', style: { marginTop: '10px' } }, q.maxSelect ? `Choose up to ${q.maxSelect}. ` : 'Select all that apply — or none, if none were present. ', 'Press Continue when done.'));
      if (multi) state.response = { selected: [] };
    } else if (q.type === 'count') {
      const input = h('input', { type: 'number', min: 0, max: q.max || 50, step: 1, inputmode: 'numeric', 'aria-label': 'Count' });
      input.addEventListener('input', () => setResp({ value: input.value === '' ? null : Number(input.value) }));
      const step = (d) => { input.value = Math.max(0, Number(input.value || 0) + d); setResp({ value: Number(input.value) }); };
      body.append(h('div', { class: 'counter' }, h('button', { type: 'button', class: 'btn', onclick: () => step(-1), 'aria-label': 'Decrease' }, '−'), input, h('button', { type: 'button', class: 'btn', onclick: () => step(1), 'aria-label': 'Increase' }, '+')));
      setTimeout(() => input.focus(), 30);
    } else if (q.type === 'grid') {
      const grid = h('div', { class: 'gridpick', role: 'radiogroup', 'aria-label': 'Image regions' });
      const names = ['Top left', 'Top centre', 'Top right', 'Middle left', 'Centre', 'Middle right', 'Bottom left', 'Bottom centre', 'Bottom right'];
      const bs = names.map((n, i) => h('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': n, title: n, onclick: () => pick(i) }, String(i + 1)));
      function pick(i) { bs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); setResp({ cell: i }); }
      keyHandlers.push((e) => { const n = Number(e.key); if (n >= 1 && n <= 9) { pick(n - 1); return true; } return false; });
      grid.append(...bs);
      body.append(grid, h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'The frame below represents the image area, divided into a 3 × 3 grid.'));
    } else if (q.type === 'scale') {
      const row = h('div', { class: 'scale', role: 'radiogroup', 'aria-label': q.prompt });
      const bs = [];
      for (let v = q.min; v <= q.max; v++) { const b = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => pick(v) }, String(v)); bs.push(b); }
      function pick(v) { bs.forEach((b, k) => b.setAttribute('aria-pressed', String(k + q.min === v))); setResp({ value: v }); }
      keyHandlers.push((e) => { const n = Number(e.key); if (n >= q.min && n <= q.max) { pick(n); return true; } return false; });
      row.append(...bs);
      body.append(row, h('div', { class: 'temp-strip', 'aria-hidden': 'true' }), h('div', { class: 'scale-labels' }, h('span', {}, q.minLabel), h('span', {}, 'Neutral'), h('span', {}, q.maxLabel)));
    } else if (q.type === 'judgments') {
      const answers = {};
      const wrap = h('div', { class: 'judg' });
      q.items.forEach((it) => {
        const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': it.text });
        const bs = q.columns.map((c) => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { answers[it.id] = c.id; bs.forEach((b, k) => b.setAttribute('aria-pressed', String(q.columns[k].id === c.id))); setResp({ answers: { ...answers } }); } }, c.label));
        seg.append(...bs);
        wrap.append(h('div', { class: 'judg-row' }, h('div', {}, it.text), seg));
      });
      body.append(wrap);
      state.response = { answers: {} };
    } else if (q.type === 'text') {
      const ta = h('textarea', { placeholder: q.placeholder || '', 'aria-label': q.prompt, spellcheck: 'false' });
      ta.addEventListener('input', () => setResp({ text: ta.value }));
      body.append(ta, h('p', { class: 'muted small', style: { marginTop: '6px' } }, 'Write freely; spelling does not matter. ', h('span', { class: 'kbd' }, 'Ctrl'), ' + ', h('span', { class: 'kbd' }, 'Enter'), ' to continue.'));
      setTimeout(() => ta.focus(), 30);
    }

    let conf = null;
    if (q.confidence) {
      const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Confidence' });
      const bs = CONFIDENCE_LEVELS.map((l, i) => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { state.confidence = i + 1; bs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); touch(); err.textContent = ''; } }, l));
      seg.append(...bs);
      conf = h('div', { class: 'confidence' }, h('div', { class: 'lbl' }, 'How confident are you in this answer?'), seg);
    }

    const submit = (skip = false) => {
      if (!skip) {
        const r = state.response;
        const empty = r == null || (q.type === 'text' && !String(r.text || '').trim()) || (q.type === 'count' && !Number.isFinite(r.value))
          || (q.type === 'judgments' && Object.keys(r.answers || {}).length < q.items.length);
        if (empty) { err.textContent = q.type === 'judgments' ? 'Answer every row, or choose “I don’t know”.' : 'Give an answer, or choose “I don’t know”.'; return; }
        if (q.confidence && state.confidence == null) { err.textContent = 'Rate your confidence.'; return; }
      }
      const tSubmit = performance.now();
      document.removeEventListener('keydown', onKey, true);
      resolve({
        response: skip ? { skipped: true } : state.response, confidence: skip ? null : state.confidence,
        tShown: round(tShown), tFirstInput: tFirst == null ? null : round(tFirst), tSubmit: round(tSubmit),
        latencyMs: round(tSubmit - tShown), firstInputLatencyMs: tFirst == null ? null : round(tFirst - tShown),
      });
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onAbort?.(); return; }
      const inText = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
      if (e.key === 'Enter' && (!inText || e.ctrlKey || e.metaKey || e.target.type === 'number')) { e.preventDefault(); submit(); return; }
      if (!inText && !e.ctrlKey && !e.metaKey && !e.altKey) for (const fn of keyHandlers) if (fn(e)) { e.preventDefault(); return; }
    }
    document.addEventListener('keydown', onKey, true);

    container.append(h('div', { class: 'qwrap' },
      h('div', { class: 'eyebrow' }, practice ? 'Practice · ' : '', `Question ${index + 1} of ${total}`),
      h('div', { class: 'qprompt', id: 'qprompt' }, q.prompt),
      q.note ? h('div', { class: 'qnote' }, q.note) : null,
      body, conf,
      h('div', { class: 'qactions' },
        h('button', { type: 'button', class: 'btn ghost', onclick: () => submit(true) }, 'I don’t know'),
        h('div', { class: 'row' }, err, h('button', { type: 'button', class: 'btn primary lg', onclick: () => submit(false) }, 'Continue', h('span', { class: 'kbd', style: { marginLeft: '4px', opacity: 0.6 } }, '↵'))))));
    const tShown = performance.now();
  });
}

const round = (x) => Math.round(x * 100) / 100;
