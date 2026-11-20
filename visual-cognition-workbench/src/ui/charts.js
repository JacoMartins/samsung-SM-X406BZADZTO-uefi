// Hand-rolled SVG charts with hover tooltips and a table view for each.
// Conventions: thin marks, recessive grid, one y-axis, legend whenever there
// are two or more series, text in ink tokens (never the series colour).
import { h, showTip, hideTip, pct, clear } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  kids.flat().forEach((k) => k != null && el.append(k instanceof Node ? k : document.createTextNode(String(k))));
  return el;
}
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const fin = Number.isFinite;

function frame(width, height, m) {
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' });
  return { svg, iw: width - m.l - m.r, ih: height - m.t - m.b, g: s('g', { transform: `translate(${m.l},${m.t})` }) };
}

function yAxis(g, iw, ih, ticks = [0, 0.25, 0.5, 0.75, 1], fmt = (v) => pct(v)) {
  const ax = s('g', { class: 'axis' });
  ticks.forEach((t) => {
    const y = ih - t * ih;
    ax.append(s('line', { x1: 0, x2: iw, y1: y, y2: y, class: t === 0 ? 'baseline' : 'grid-line' }));
    ax.append(s('text', { x: -8, y: y + 4, 'text-anchor': 'end' }, fmt(t)));
  });
  g.append(ax);
}

function hover(el, html) {
  el.addEventListener('pointermove', (e) => showTip(e, html));
  el.addEventListener('pointerleave', hideTip);
  el.setAttribute('tabindex', '0');
  el.addEventListener('focus', (e) => { const r = e.target.getBoundingClientRect(); showTip({ clientX: r.right, clientY: r.top }, html); });
  el.addEventListener('blur', hideTip);
}

export function legend(items) {
  return h('div', { class: 'legend' }, items.map((it, i) => h('span', {}, h('i', { style: { background: it.color || SERIES[i] } }), it.label)));
}

/** Wrap a chart with a "show data" table toggle. */
export function withTable(chartEl, columns, rows, { caption = '' } = {}) {
  const tableWrap = h('div', { class: 'table-wrap', hidden: true },
    h('table', { class: 'data' }, caption ? h('caption', { class: 'muted small', style: { textAlign: 'left', paddingBottom: '6px' } }, caption) : null,
      h('thead', {}, h('tr', {}, columns.map((c) => h('th', { class: c.num ? 'num' : '' }, c.label)))),
      h('tbody', {}, rows.map((r) => h('tr', {}, columns.map((c) => h('td', { class: c.num ? 'num' : '' }, c.fmt ? c.fmt(r[c.key], r) : r[c.key])))))));
  const btn = h('button', { class: 'btn ghost sm', type: 'button', 'aria-expanded': 'false' }, 'Show data');
  btn.addEventListener('click', () => { const open = tableWrap.hidden; tableWrap.hidden = !open; chartEl.hidden = open; btn.textContent = open ? 'Show chart' : 'Show data'; btn.setAttribute('aria-expanded', String(open)); });
  return h('div', {}, chartEl, tableWrap, h('div', { class: 'chart-foot' }, h('span'), btn));
}

/**
 * Horizontal bars with 95% interval whiskers.
 * data: [{label, mean, lo, hi, n, note}], ref: optional reference value
 */
export function intervalBars(data, { ref = null, refLabel = '', height, width = 640 } = {}) {
  const rowH = 38;
  const longest = Math.max(8, ...data.map((d) => String(d.label).length));
  const m = { l: Math.min(width * 0.42, 16 + longest * 6.6), r: 56, t: 14, b: 28 };
  const H = height || m.t + m.b + data.length * rowH;
  const { svg, g, iw } = frame(width, H, m);
  const x = (v) => Math.max(0, Math.min(1, v)) * iw;
  const ax = s('g', { class: 'axis' });
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => { ax.append(s('line', { x1: x(t), x2: x(t), y1: 0, y2: data.length * rowH, class: t === 0 ? 'baseline' : 'grid-line' })); ax.append(s('text', { x: x(t), y: data.length * rowH + 18, 'text-anchor': 'middle' }, pct(t))); });
  g.append(ax);
  data.forEach((d, i) => {
    const y = i * rowH + rowH / 2;
    g.append(s('text', { x: -12, y: y + 4, 'text-anchor': 'end', class: 'label' }, d.label));
    if (!fin(d.mean)) { g.append(s('text', { x: 4, y: y + 4, class: 'axis-label' }, 'no data')); return; }
    g.append(s('rect', { x: 0, y: y - 7, width: Math.max(2, x(d.mean)), height: 14, rx: 3, fill: d.color || SERIES[0], opacity: d.faded ? 0.4 : 1 }));
    if (fin(d.lo)) {
      g.append(s('line', { x1: x(d.lo), x2: x(d.hi), y1: y, y2: y, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
      [d.lo, d.hi].forEach((v) => g.append(s('line', { x1: x(v), x2: x(v), y1: y - 6, y2: y + 6, stroke: 'var(--ink)', 'stroke-width': 1.5 })));
    }
    g.append(s('text', { x: iw + 8, y: y + 4, class: 'value-label' }, pct(d.mean)));
    const hit = s('rect', { x: -m.l, y: i * rowH, width: iw + m.l + m.r, height: rowH, class: 'hit' });
    hover(hit, `<b>${d.label}</b><br>${pct(d.mean, 1)}${fin(d.lo) ? ` · 95% CI ${pct(d.lo)}–${pct(d.hi)}` : ''}<br>${d.n} items${d.clusters ? ` · ${d.clusters} images` : ''}${d.note ? `<br>${d.note}` : ''}`);
    g.append(hit);
  });
  if (fin(ref)) {
    g.append(s('line', { x1: x(ref), x2: x(ref), y1: -4, y2: data.length * rowH, class: 'ref-line' }));
    g.append(s('text', { x: x(ref) + 4, y: -4, class: 'axis-label' }, refLabel));
  }
  svg.append(g);
  svg.setAttribute('aria-label', `Bar chart: ${data.map((d) => `${d.label} ${pct(d.mean)}`).join(', ')}`);
  return h('div', { class: 'chart' }, svg);
}

/**
 * Line chart with optional CI bands. series: [{label, points:[{x, y, lo, hi, n, tip}]}]
 * xScale: 'log' | 'linear'; xTicks: values
 */
export function lineChart(series, { xScale = 'linear', xTicks, xFmt = (v) => v, xLabel = '', yTicks, yFmt, height = 260, extraTip = () => '' } = {}) {
  const m = { l: 46, r: 16, t: 12, b: 40 };
  const { svg, g, iw, ih } = frame(640, height, m);
  const xs = series.flatMap((se) => se.points.map((p) => p.x)).filter(fin);
  if (!xs.length) return h('div', { class: 'empty' }, 'Not enough data yet.');
  const tx = xScale === 'log' ? Math.log2 : (v) => v;
  const ticks = xTicks || [...new Set(xs)].sort((a, b) => a - b);
  let x0 = tx(Math.min(...ticks, ...xs)); let x1 = tx(Math.max(...ticks, ...xs));
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  const pad = (x1 - x0) * 0.06;
  const x = (v) => ((tx(v) - x0 + pad) / (x1 - x0 + 2 * pad)) * iw;
  const y = (v) => ih - Math.max(0, Math.min(1, v)) * ih;
  yAxis(g, iw, ih, yTicks, yFmt);
  const ax = s('g', { class: 'axis' });
  ticks.forEach((t) => ax.append(s('text', { x: x(t), y: ih + 18, 'text-anchor': 'middle' }, xFmt(t))));
  if (xLabel) ax.append(s('text', { x: iw / 2, y: ih + 34, 'text-anchor': 'middle', class: 'axis-label' }, xLabel));
  g.append(ax);
  series.forEach((se, si) => {
    const col = se.color || SERIES[si];
    const pts = se.points.filter((p) => fin(p.y)).sort((a, b) => a.x - b.x);
    const band = pts.filter((p) => fin(p.lo) && fin(p.hi));
    if (band.length > 1) {
      const d = `M${band.map((p) => `${x(p.x)},${y(p.hi)}`).join('L')}L${band.slice().reverse().map((p) => `${x(p.x)},${y(p.lo)}`).join('L')}Z`;
      g.append(s('path', { d, fill: col, opacity: 0.12 }));
    }
    if (pts.length > 1) g.append(s('path', { d: `M${pts.map((p) => `${x(p.x)},${y(p.y)}`).join('L')}`, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    pts.forEach((p) => {
      g.append(s('circle', { cx: x(p.x), cy: y(p.y), r: 4.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 2 }));
      const hit = s('circle', { cx: x(p.x), cy: y(p.y), r: 14, class: 'hit' });
      hover(hit, `<b>${se.label}</b><br>${xFmt(p.x)}: ${pct(p.y, 1)}${fin(p.lo) ? `<br>95% CI ${pct(p.lo)}–${pct(p.hi)}` : ''}${p.n != null ? `<br>${p.n} items` : ''}${p.tip ? `<br>${p.tip}` : ''}${extraTip(p)}`);
      g.append(hit);
    });
  });
  svg.append(g);
  const wrap = h('div', { class: 'chart' });
  if (series.length > 1) wrap.append(legend(series.map((se, i) => ({ label: se.label, color: se.color || SERIES[i] }))));
  wrap.append(svg);
  return wrap;
}

/** Scatter with optional diagonal reference (calibration / timing fidelity). */
export function scatter(points, { xDomain = [0, 1], yDomain = [0, 1], xFmt = pct, yFmt = pct, xLabel = '', yLabel = '', diagonal = true, height = 260, xTicks, yTicks, sizeBy } = {}) {
  const m = { l: 52, r: 16, t: 12, b: 40 };
  const { svg, g, iw, ih } = frame(640, height, m);
  if (!points.length) return h('div', { class: 'empty' }, 'Not enough data yet.');
  const x = (v) => ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * iw;
  const y = (v) => ih - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * ih;
  const yt = yTicks || [0, 0.25, 0.5, 0.75, 1].map((t) => yDomain[0] + t * (yDomain[1] - yDomain[0]));
  const xt = xTicks || [0, 0.25, 0.5, 0.75, 1].map((t) => xDomain[0] + t * (xDomain[1] - xDomain[0]));
  const ax = s('g', { class: 'axis' });
  yt.forEach((t, i) => { ax.append(s('line', { x1: 0, x2: iw, y1: y(t), y2: y(t), class: i === 0 ? 'baseline' : 'grid-line' })); ax.append(s('text', { x: -8, y: y(t) + 4, 'text-anchor': 'end' }, yFmt(t))); });
  xt.forEach((t) => ax.append(s('text', { x: x(t), y: ih + 18, 'text-anchor': 'middle' }, xFmt(t))));
  if (xLabel) ax.append(s('text', { x: iw / 2, y: ih + 34, 'text-anchor': 'middle', class: 'axis-label' }, xLabel));
  if (yLabel) ax.append(s('text', { x: -ih / 2, y: -40, transform: 'rotate(-90)', 'text-anchor': 'middle', class: 'axis-label' }, yLabel));
  g.append(ax);
  if (diagonal) g.append(s('line', { x1: x(Math.max(xDomain[0], yDomain[0])), y1: y(Math.max(xDomain[0], yDomain[0])), x2: x(Math.min(xDomain[1], yDomain[1])), y2: y(Math.min(xDomain[1], yDomain[1])), class: 'ref-line' }));
  const maxN = Math.max(1, ...points.map((p) => p.n || 1));
  points.forEach((p) => {
    if (!fin(p.x) || !fin(p.y)) return;
    const r = sizeBy ? 4 + 8 * Math.sqrt((p.n || 1) / maxN) : 4.5;
    g.append(s('circle', { cx: x(p.x), cy: y(p.y), r, fill: p.color || SERIES[0], 'fill-opacity': 0.85, stroke: 'var(--surface)', 'stroke-width': 2 }));
    const hit = s('circle', { cx: x(p.x), cy: y(p.y), r: Math.max(10, r + 4), class: 'hit' });
    hover(hit, p.tip);
    g.append(hit);
  });
  svg.append(g);
  return h('div', { class: 'chart' }, svg);
}

/** Histogram of values (ms) on log-spaced bins with median marker. */
export function histogram(values, { height = 220, label = 'Response time' } = {}) {
  const m = { l: 40, r: 16, t: 12, b: 40 };
  const { svg, g, iw, ih } = frame(640, height, m);
  const vs = values.filter((v) => fin(v) && v > 0);
  if (vs.length < 2) return h('div', { class: 'empty' }, 'Not enough responses yet.');
  const edges = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000, 20000, 40000, Infinity];
  const lo = [0, ...edges.slice(0, -1)];
  const counts = edges.map((e, i) => vs.filter((v) => v >= lo[i] && v < e).length);
  const maxC = Math.max(...counts);
  const bw = iw / edges.length;
  const yTicks = [0, Math.ceil(maxC / 2), maxC];
  const ax = s('g', { class: 'axis' });
  yTicks.forEach((t, i) => { const yy = ih - (t / maxC) * ih; ax.append(s('line', { x1: 0, x2: iw, y1: yy, y2: yy, class: i === 0 ? 'baseline' : 'grid-line' })); ax.append(s('text', { x: -8, y: yy + 4, 'text-anchor': 'end' }, t)); });
  const fmt = (v) => (v === Infinity ? '' : v >= 1000 ? `${v / 1000}s` : `${v}`);
  edges.forEach((e, i) => { if (i % 2 === 0 || iw > 500) ax.append(s('text', { x: (i + 1) * bw, y: ih + 18, 'text-anchor': 'middle' }, fmt(e))); });
  ax.append(s('text', { x: iw / 2, y: ih + 34, 'text-anchor': 'middle', class: 'axis-label' }, `${label} (bin upper edge)`));
  g.append(ax);
  counts.forEach((c, i) => {
    const hh = (c / maxC) * ih;
    if (c) g.append(s('path', { d: roundTop(i * bw + 1, ih - hh, bw - 2, hh, 3), fill: SERIES[0] }));
    const hit = s('rect', { x: i * bw, y: 0, width: bw, height: ih, class: 'hit' });
    hover(hit, `<b>${fmt(lo[i]) || '0'}–${edges[i] === Infinity ? '∞' : fmt(edges[i])} ms</b><br>${c} response${c === 1 ? '' : 's'}`);
    g.append(hit);
  });
  const sorted = vs.slice().sort((a, b) => a - b); const med = sorted[Math.floor(sorted.length / 2)];
  const bi = edges.findIndex((e) => med < e); const frac = (med - lo[bi]) / ((edges[bi] === Infinity ? lo[bi] * 2 : edges[bi]) - lo[bi]);
  const mx = (bi + frac) * bw;
  g.append(s('line', { x1: mx, x2: mx, y1: -4, y2: ih, class: 'ref-line' }));
  g.append(s('text', { x: mx + 4, y: 4, class: 'axis-label' }, `median ${Math.round(med)} ms`));
  svg.append(g);
  return h('div', { class: 'chart' }, svg);
}

function roundTop(x, y, w, hh, r) {
  r = Math.min(r, hh, w / 2);
  return `M${x},${y + hh}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh}Z`;
}

export function replace(container, el) { clear(container); container.append(el); }
