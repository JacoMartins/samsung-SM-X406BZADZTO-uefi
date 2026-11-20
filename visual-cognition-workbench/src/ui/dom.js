// Tiny DOM helpers.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }
export const pct = (x, d = 0) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');
export const fmtMs = (x) => (Number.isFinite(x) ? `${Math.round(x)} ms` : '—');
export const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

export function toast(msg, ms = 2200) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

const tip = () => document.getElementById('tooltip');
export function showTip(evt, html) {
  const t = tip(); if (!t) return;
  t.innerHTML = html; t.hidden = false;
  const pad = 14; const r = t.getBoundingClientRect();
  let x = evt.clientX + pad; let y = evt.clientY + pad;
  if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
  t.style.left = `${Math.max(8, x)}px`; t.style.top = `${Math.max(8, y)}px`;
}
export function hideTip() { const t = tip(); if (t) t.hidden = true; }

export function switchInput(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', 'aria-label': label });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'switch' }, input, h('span'));
}

export function segmented(options, value, onChange, { label } = {}) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
  const render = (val) => {
    clear(wrap);
    options.forEach((o) => wrap.append(h('button', { type: 'button', 'aria-pressed': String(o.value === val), onclick: () => { onChange(o.value); render(o.value); } }, o.label)));
  };
  render(value);
  return wrap;
}
