// Vector drawables. Each drawable renders an object into its bounding box
// {x, y, w, h} and returns an SVG fragment. Optional `glow` renders emissive
// parts (lamps, lit windows) above the lighting overlay so they stay bright
// at night. All geometry is deterministic given the object descriptor.
import { hex, shade, mix } from './palette.js';

const f = (n) => Math.round(n * 10) / 10;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`;
const circ = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const ell = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, sw = 2, extra = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;
const flipWrap = (o, s) => (o.flip ? `<g transform="translate(${f(2 * o.x + o.w)},0) scale(-1,1)">${s}</g>` : s);
const shadow = (o, k = 0.5) => ell(o.x + o.w / 2, o.y + o.h, o.w * k, Math.max(3, o.h * 0.04), 'rgba(0,0,0,0.18)');

export const DRAWABLES = {
  none() { return ''; },
  cat(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.25);
    if (o.pose === 'sleeping') {
      return shadow(o, 0.45) + ell(x + w * 0.5, y + h * 0.62, w * 0.42, h * 0.32, c) +
        circ(x + w * 0.84, y + h * 0.5, h * 0.26, c) +
        poly([[x + w * 0.74, y + h * 0.36], [x + w * 0.78, y + h * 0.12], [x + w * 0.86, y + h * 0.3]], c) +
        poly([[x + w * 0.88, y + h * 0.3], [x + w * 0.95, y + h * 0.12], [x + w * 0.98, y + h * 0.4]], c) +
        path(`M${f(x + w * 0.1)},${f(y + h * 0.7)} q${f(-w * 0.12)},${f(h * 0.2)} ${f(w * 0.1)},${f(h * 0.3)}`, 'none', `stroke="${d}" stroke-width="${f(h * 0.1)}" stroke-linecap="round"`) +
        line(x + w * 0.8, y + h * 0.52, x + w * 0.86, y + h * 0.52, d, 1.5);
    }
    return flipWrap(o, shadow(o, 0.4) + ell(x + w * 0.45, y + h * 0.68, w * 0.32, h * 0.25, c) +
      rect(x + w * 0.2, y + h * 0.75, w * 0.08, h * 0.25, d) + rect(x + w * 0.6, y + h * 0.75, w * 0.08, h * 0.25, d) +
      circ(x + w * 0.76, y + h * 0.4, h * 0.2, c) +
      poly([[x + w * 0.64, y + h * 0.3], [x + w * 0.67, y + h * 0.05], [x + w * 0.76, y + h * 0.22]], c) +
      poly([[x + w * 0.78, y + h * 0.22], [x + w * 0.87, y + h * 0.05], [x + w * 0.9, y + h * 0.32]], c) +
      path(`M${f(x + w * 0.15)},${f(y + h * 0.65)} q${f(-w * 0.15)},${f(-h * 0.2)} ${f(-w * 0.05)},${f(-h * 0.5)}`, 'none', `stroke="${c}" stroke-width="${f(h * 0.08)}" stroke-linecap="round"`) +
      circ(x + w * 0.73, y + h * 0.38, h * 0.025, '#1b1b1b') + circ(x + w * 0.83, y + h * 0.38, h * 0.025, '#1b1b1b'));
  },
  dog(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.3);
    return flipWrap(o, shadow(o, 0.45) + ell(x + w * 0.45, y + h * 0.55, w * 0.33, h * 0.2, c) +
      [0.2, 0.32, 0.56, 0.68].map((p) => rect(x + w * p, y + h * 0.62, w * 0.07, h * 0.38, d)).join('') +
      ell(x + w * 0.8, y + h * 0.3, w * 0.15, h * 0.17, c) + ell(x + w * 0.93, y + h * 0.36, w * 0.08, h * 0.07, shade(c, -0.1)) +
      ell(x + w * 0.73, y + h * 0.3, w * 0.05, h * 0.15, d, `transform="rotate(15 ${f(x + w * 0.73)} ${f(y + h * 0.3)})"`) +
      circ(x + w * 0.84, y + h * 0.25, h * 0.03, '#1b1b1b') +
      line(x + w * 0.13, y + h * 0.48, x + w * 0.02, y + h * 0.25, c, Math.max(2, h * 0.06)));
  },
  bird(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    if (o.pose === 'flying') {
      return path(`M${f(x)},${f(y + h * 0.4)} Q${f(x + w * 0.25)},${f(y)} ${f(x + w * 0.5)},${f(y + h * 0.55)} Q${f(x + w * 0.75)},${f(y)} ${f(x + w)},${f(y + h * 0.4)}`, 'none', `stroke="${c}" stroke-width="${f(Math.max(2, h * 0.14))}" stroke-linecap="round"`);
    }
    return flipWrap(o, ell(x + w * 0.45, y + h * 0.55, w * 0.35, h * 0.3, c) + circ(x + w * 0.75, y + h * 0.3, h * 0.18, c) +
      poly([[x + w * 0.88, y + h * 0.28], [x + w, y + h * 0.33], [x + w * 0.88, y + h * 0.38]], hex('orange')) +
      poly([[x + w * 0.12, y + h * 0.5], [x - w * 0.05, y + h * 0.35], [x + w * 0.05, y + h * 0.65]], shade(c, -0.2)) +
      line(x + w * 0.4, y + h * 0.82, x + w * 0.38, y + h, '#5a4630', 1.5) + line(x + w * 0.52, y + h * 0.82, x + w * 0.54, y + h, '#5a4630', 1.5) +
      circ(x + w * 0.78, y + h * 0.27, h * 0.04, '#111'));
  },
  duck(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return flipWrap(o, ell(x + w * 0.45, y + h * 0.65, w * 0.42, h * 0.3, c) + circ(x + w * 0.78, y + h * 0.3, h * 0.2, hex('green')) +
      poly([[x + w * 0.92, y + h * 0.3], [x + w * 1.05, y + h * 0.36], [x + w * 0.92, y + h * 0.4]], hex('orange')) +
      circ(x + w * 0.8, y + h * 0.26, h * 0.035, '#111'));
  },
  deer(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.3);
    return flipWrap(o, shadow(o, 0.4) + ell(x + w * 0.45, y + h * 0.5, w * 0.3, h * 0.14, c) +
      [0.22, 0.3, 0.58, 0.66].map((p) => rect(x + w * p, y + h * 0.55, w * 0.045, h * 0.45, d)).join('') +
      poly([[x + w * 0.66, y + h * 0.45], [x + w * 0.74, y + h * 0.18], [x + w * 0.8, y + h * 0.2], [x + w * 0.76, y + h * 0.48]], c) +
      ell(x + w * 0.82, y + h * 0.17, w * 0.08, h * 0.06, c) +
      line(x + w * 0.78, y + h * 0.12, x + w * 0.72, y, d, 2) + line(x + w * 0.82, y + h * 0.12, x + w * 0.9, y, d, 2) +
      line(x + w * 0.75, y + h * 0.05, x + w * 0.69, y + h * 0.04, d, 2));
  },
  horse(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.35);
    return flipWrap(o, shadow(o, 0.45) + ell(x + w * 0.45, y + h * 0.48, w * 0.32, h * 0.16, c) +
      [0.2, 0.3, 0.6, 0.7].map((p) => rect(x + w * p, y + h * 0.55, w * 0.05, h * 0.45, d)).join('') +
      poly([[x + w * 0.68, y + h * 0.42], [x + w * 0.8, y + h * 0.1], [x + w * 0.88, y + h * 0.12], [x + w * 0.8, y + h * 0.48]], c) +
      ell(x + w * 0.9, y + h * 0.14, w * 0.09, h * 0.06, c, `transform="rotate(30 ${f(x + w * 0.9)} ${f(y + h * 0.14)})"`) +
      path(`M${f(x + w * 0.78)},${f(y + h * 0.1)} L${f(x + w * 0.68)},${f(y + h * 0.4)}`, 'none', `stroke="${d}" stroke-width="5"`) +
      line(x + w * 0.13, y + h * 0.45, x + w * 0.06, y + h * 0.75, d, 5));
  },
  person(o) {
    const { x, y, w, h } = o; const shirt = hex(o.color); const skin = o.skin || '#c99a76';
    const pants = hex(o.pants || 'blue'); const hair = o.hair || '#3a2a20';
    const hr = Math.min(w * 0.22, h * 0.08);
    const cx = x + w / 2;
    let s = shadow(o, 0.35);
    if (o.pose === 'sitting') {
      s += rect(cx - w * 0.22, y + h * 0.25, w * 0.44, h * 0.38, shirt, 'rx="6"') +
        rect(cx - w * 0.22, y + h * 0.58, w * 0.62, h * 0.12, pants, 'rx="4"') +
        rect(cx + w * 0.3, y + h * 0.6, w * 0.12, h * 0.4, pants, 'rx="4"') +
        circ(cx, y + h * 0.15, hr * 1.2, skin) + path(`M${f(cx - hr * 1.2)},${f(y + h * 0.14)} a${f(hr * 1.2)},${f(hr * 1.2)} 0 0 1 ${f(hr * 2.4)},0 z`, hair);
    } else {
      s += rect(cx - w * 0.2, y + h * 0.58, w * 0.16, h * 0.42, pants, 'rx="4"') + rect(cx + w * 0.04, y + h * 0.58, w * 0.16, h * 0.42, pants, 'rx="4"') +
        rect(cx - w * 0.26, y + h * 0.2, w * 0.52, h * 0.42, shirt, 'rx="8"') +
        rect(cx - w * 0.4, y + h * 0.22, w * 0.13, h * 0.32, shade(shirt, -0.12), 'rx="5"') +
        rect(cx + w * 0.27, y + h * 0.22, w * 0.13, h * 0.32, shade(shirt, -0.12), 'rx="5"') +
        circ(cx, y + h * 0.1, hr * 1.25, skin) + path(`M${f(cx - hr * 1.25)},${f(y + h * 0.09)} a${f(hr * 1.25)},${f(hr * 1.25)} 0 0 1 ${f(hr * 2.5)},0 z`, hair);
      if (o.holding === 'umbrella') s += line(cx + w * 0.36, y + h * 0.5, cx + w * 0.36, y - h * 0.05, '#333', 2) + path(`M${f(cx - w * 0.3)},${f(y - h * 0.02)} Q${f(cx + w * 0.36)},${f(y - h * 0.35)} ${f(cx + w * 1.0)},${f(y - h * 0.02)} z`, hex(o.accent || 'red'));
      if (o.holding === 'bag') s += rect(cx + w * 0.3, y + h * 0.5, w * 0.3, h * 0.18, hex(o.accent || 'brown'), 'rx="3"');
      if (o.holding === 'phone') s += rect(cx + w * 0.2, y + h * 0.18, w * 0.08, h * 0.08, '#222', 'rx="1"');
    }
    if (o.silhouette) s = `<g fill="#111" style="filter:none">${s.replace(/fill="[^"]+"/g, 'fill="#14100f"')}</g>`;
    return o.flip ? flipWrap(o, s) : s;
  },
  child(o) { return DRAWABLES.person(o); },
  bed(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return shadow(o, 0.5) + rect(x, y, w * 0.06, h, '#6b4a33') + rect(x + w * 0.94, y + h * 0.35, w * 0.06, h * 0.65, '#6b4a33') +
      rect(x + w * 0.04, y + h * 0.4, w * 0.92, h * 0.35, '#f4f1ea', 'rx="6"') +
      rect(x + w * 0.25, y + h * 0.32, w * 0.71, h * 0.45, c, 'rx="8"') +
      ell(x + w * 0.15, y + h * 0.4, w * 0.09, h * 0.08, '#ffffff') + rect(x + w * 0.04, y + h * 0.75, w * 0.92, h * 0.08, '#6b4a33');
  },
  lamp(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x + w * 0.46, y + h * 0.35, w * 0.08, h * 0.55, '#555') + ell(x + w / 2, y + h * 0.95, w * 0.3, h * 0.05, '#444') +
      poly([[x + w * 0.2, y + h * 0.38], [x + w * 0.8, y + h * 0.38], [x + w * 0.68, y], [x + w * 0.32, y]], c);
  },
  lampGlow(o) {
    if (!o.lit) return '';
    const { x, y, w, h } = o;
    return `<circle cx="${f(x + w / 2)}" cy="${f(y + h * 0.3)}" r="${f(w * 1.4)}" fill="url(#glowWarm)"/>` +
      poly([[x + w * 0.2, y + h * 0.38], [x + w * 0.8, y + h * 0.38], [x + w * 0.68, y], [x + w * 0.32, y]], mix(hex(o.color), '#fff2c8', 0.55));
  },
  window(o) {
    const { x, y, w, h } = o; const frame = hex(o.color || 'white');
    const sky = o.skyColors || ['#8fc3ea', '#e1f0fa'];
    return rect(x, y, w, h, frame) + `<rect x="${f(x + w * 0.07)}" y="${f(y + h * 0.07)}" width="${f(w * 0.86)}" height="${f(h * 0.86)}" fill="url(#skyGrad)"/>` +
      rect(x + w * 0.47, y, w * 0.06, h, frame) + rect(x, y + h * 0.47, w, h * 0.06, frame) +
      (o.curtains ? rect(x - w * 0.12, y - h * 0.04, w * 0.2, h * 1.08, hex(o.curtains), 'opacity="0.95"') + rect(x + w * 0.92, y - h * 0.04, w * 0.2, h * 1.08, hex(o.curtains), 'opacity="0.95"') : '') +
      (sky ? '' : '');
  },
  table(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return shadow(o, 0.5) + rect(x, y, w, h * 0.12, c, 'rx="3"') + rect(x + w * 0.06, y + h * 0.12, w * 0.05, h * 0.88, shade(c, -0.2)) +
      rect(x + w * 0.89, y + h * 0.12, w * 0.05, h * 0.88, shade(c, -0.2));
  },
  chair(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.25);
    return flipWrap(o, rect(x + w * 0.05, y, w * 0.12, h * 0.6, d) + rect(x + w * 0.05, y + h * 0.5, w * 0.9, h * 0.1, c) +
      rect(x + w * 0.08, y + h * 0.6, w * 0.08, h * 0.4, d) + rect(x + w * 0.84, y + h * 0.6, w * 0.08, h * 0.4, d) +
      rect(x + w * 0.05, y + h * 0.05, w * 0.12, h * 0.3, c));
  },
  sofa(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const d = shade(c, -0.18);
    return shadow(o, 0.5) + rect(x + w * 0.06, y, w * 0.88, h * 0.55, d, 'rx="10"') + rect(x, y + h * 0.3, w * 0.12, h * 0.55, c, 'rx="8"') +
      rect(x + w * 0.88, y + h * 0.3, w * 0.12, h * 0.55, c, 'rx="8"') + rect(x + w * 0.1, y + h * 0.45, w * 0.8, h * 0.35, c, 'rx="6"') +
      line(x + w * 0.5, y + h * 0.48, x + w * 0.5, y + h * 0.78, shade(c, -0.3), 1.5) +
      rect(x + w * 0.06, y + h * 0.85, w * 0.04, h * 0.15, '#3b2b20') + rect(x + w * 0.9, y + h * 0.85, w * 0.04, h * 0.15, '#3b2b20');
  },
  plant(o) {
    const { x, y, w, h } = o; const pot = hex(o.color || 'orange'); const g = hex('green');
    return poly([[x + w * 0.25, y + h * 0.68], [x + w * 0.75, y + h * 0.68], [x + w * 0.67, y + h], [x + w * 0.33, y + h]], pot) +
      [[-0.35, 0.1], [0.3, 0.05], [0, -0.02], [-0.2, 0.25], [0.25, 0.28]].map(([dx, dy], i) =>
        ell(x + w * (0.5 + dx * 0.6), y + h * (0.3 + dy), w * 0.16, h * 0.2, shade(g, i % 2 ? -0.12 : 0.05), `transform="rotate(${dx * 90} ${f(x + w * (0.5 + dx * 0.6))} ${f(y + h * (0.3 + dy))})"`)).join('');
  },
  bookshelf(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    const cols = ['red', 'blue', 'yellow', 'green', 'white', 'teal', 'purple', 'orange'];
    let s = shadow(o, 0.5) + rect(x, y, w, h, c) + rect(x + w * 0.05, y + h * 0.04, w * 0.9, h * 0.92, shade(c, -0.35));
    for (let r = 0; r < 3; r++) {
      const sy = y + h * 0.04 + r * h * 0.307;
      s += rect(x, sy + h * 0.29, w, h * 0.02, c);
      let bx = x + w * 0.08; let k = 0;
      while (bx < x + w * 0.86) {
        const bw = w * (0.06 + ((k * 7 + r * 3) % 4) * 0.015);
        const bh = h * (0.2 + ((k * 5 + r) % 3) * 0.025);
        s += rect(bx, sy + h * 0.29 - bh, bw, bh, hex(cols[(k + r * 3) % cols.length]));
        bx += bw + 2; k++;
      }
    }
    return s;
  },
  clock(o) {
    const { x, y, w, h } = o; const r = Math.min(w, h) / 2; const cx = x + w / 2; const cy = y + h / 2;
    return circ(cx, cy, r, hex(o.color || 'black')) + circ(cx, cy, r * 0.84, '#f7f5ef') +
      line(cx, cy, cx, cy - r * 0.6, '#222', 2.5) + line(cx, cy, cx + r * 0.45, cy + r * 0.1, '#222', 2.5) + circ(cx, cy, 2.5, '#222');
  },
  rug(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return ell(x + w / 2, y + h / 2, w / 2, h / 2, c) + ell(x + w / 2, y + h / 2, w * 0.38, h * 0.34, 'none', `stroke="${shade(c, 0.3)}" stroke-width="3"`);
  },
  picture(o) {
    const { x, y, w, h } = o;
    return rect(x, y, w, h, '#5c4330') + rect(x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.84, hex(o.color)) +
      poly([[x + w * 0.1, y + h * 0.9], [x + w * 0.42, y + h * 0.4], [x + w * 0.62, y + h * 0.7], [x + w * 0.74, y + h * 0.55], [x + w * 0.9, y + h * 0.9]], shade(hex(o.color), -0.35)) +
      circ(x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.09, '#f3e3a1');
  },
  tv(o) {
    const { x, y, w, h } = o;
    return rect(x, y, w, h * 0.85, '#1a1a1c', 'rx="4"') + rect(x + w * 0.04, y + h * 0.05, w * 0.92, h * 0.72, o.on ? '#4b7fc0' : '#26282c') +
      rect(x + w * 0.45, y + h * 0.85, w * 0.1, h * 0.1, '#333') + rect(x + w * 0.3, y + h * 0.94, w * 0.4, h * 0.06, '#333');
  },
  tvGlow(o) { return o.on ? `<rect x="${f(o.x + o.w * 0.04)}" y="${f(o.y + o.h * 0.05)}" width="${f(o.w * 0.92)}" height="${f(o.h * 0.72)}" fill="#7fb1ee" opacity="0.85"/><circle cx="${f(o.x + o.w / 2)}" cy="${f(o.y + o.h / 2)}" r="${f(o.w)}" fill="url(#glowCool)"/>` : ''; },
  mug(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x, y + h * 0.1, w * 0.75, h * 0.9, c, 'rx="3"') + path(`M${f(x + w * 0.75)},${f(y + h * 0.3)} a${f(w * 0.22)},${f(h * 0.25)} 0 1 1 0,${f(h * 0.45)}`, 'none', `stroke="${c}" stroke-width="${f(Math.max(2, w * 0.1))}"`);
  },
  vase(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = path(`M${f(x + w * 0.35)},${f(y + h * 0.45)} C${f(x)},${f(y + h * 0.65)} ${f(x + w * 0.1)},${f(y + h)} ${f(x + w * 0.5)},${f(y + h)} C${f(x + w * 0.9)},${f(y + h)} ${f(x + w)},${f(y + h * 0.65)} ${f(x + w * 0.65)},${f(y + h * 0.45)} z`, c);
    if (o.flowers) {
      const fc = hex(o.flowers);
      [[0.3, 0.1], [0.55, 0.02], [0.75, 0.15], [0.45, 0.2]].forEach(([dx, dy]) => {
        s += line(x + w * 0.5, y + h * 0.48, x + w * dx, y + h * (dy + 0.06), hex('green'), 2);
        s += circ(x + w * dx, y + h * (dy + 0.06), w * 0.12, fc) + circ(x + w * dx, y + h * (dy + 0.06), w * 0.04, hex('yellow'));
      });
    }
    return s;
  },
  book(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x, y, w, h, c, 'rx="2"') + rect(x + w * 0.04, y + h * 0.75, w * 0.92, h * 0.18, '#f4efe2');
  },
  apple(o) { const { x, y, w, h } = o; return circ(x + w / 2, y + h * 0.58, Math.min(w, h) * 0.42, hex(o.color)) + line(x + w / 2, y + h * 0.2, x + w * 0.55, y, '#5a3e2b', 2) + ell(x + w * 0.66, y + h * 0.12, w * 0.14, h * 0.07, hex('green')); },
  fruitbowl(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return circ(x + w * 0.3, y + h * 0.35, h * 0.28, hex('orange')) + circ(x + w * 0.55, y + h * 0.3, h * 0.3, hex('red')) + circ(x + w * 0.75, y + h * 0.4, h * 0.25, hex('green')) +
      path(`M${f(x)},${f(y + h * 0.45)} L${f(x + w)},${f(y + h * 0.45)} Q${f(x + w * 0.9)},${f(y + h)} ${f(x + w / 2)},${f(y + h)} Q${f(x + w * 0.1)},${f(y + h)} ${f(x)},${f(y + h * 0.45)} z`, c);
  },
  bottle(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x + w * 0.38, y, w * 0.24, h * 0.3, c, 'opacity="0.9"') + rect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.7, c, 'rx="8" opacity="0.9"') +
      rect(x + w * 0.2, y + h * 0.5, w * 0.6, h * 0.25, '#f2ead6') + rect(x + w * 0.2, y + h * 0.32, w * 0.12, h * 0.6, 'rgba(255,255,255,0.25)');
  },
  candle(o) {
    const { x, y, w, h } = o;
    return rect(x + w * 0.25, y + h * 0.3, w * 0.5, h * 0.7, hex(o.color || 'white')) + line(x + w / 2, y + h * 0.3, x + w / 2, y + h * 0.22, '#333', 1.5);
  },
  candleGlow(o) {
    const { x, y, w, h } = o;
    return `<circle cx="${f(x + w / 2)}" cy="${f(y + h * 0.15)}" r="${f(w * 2.2)}" fill="url(#glowWarm)"/>` + ell(x + w / 2, y + h * 0.13, w * 0.15, h * 0.1, '#ffd36b');
  },
  laptop(o) {
    const { x, y, w, h } = o;
    return poly([[x + w * 0.1, y + h * 0.75], [x + w * 0.9, y + h * 0.75], [x + w * 0.85, y], [x + w * 0.15, y]], hex(o.color || 'gray')) +
      poly([[x + w * 0.16, y + h * 0.7], [x + w * 0.84, y + h * 0.7], [x + w * 0.8, y + h * 0.06], [x + w * 0.2, y + h * 0.06]], '#2c3e57') +
      rect(x, y + h * 0.75, w, h * 0.12, shade(hex(o.color || 'gray'), 0.2), 'rx="3"');
  },
  teapot(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return ell(x + w * 0.5, y + h * 0.62, w * 0.3, h * 0.36, c) + rect(x + w * 0.42, y + h * 0.15, w * 0.16, h * 0.14, shade(c, -0.15), 'rx="3"') +
      poly([[x + w * 0.76, y + h * 0.55], [x + w, y + h * 0.3], [x + w * 0.96, y + h * 0.28], [x + w * 0.74, y + h * 0.7]], c) +
      path(`M${f(x + w * 0.22)},${f(y + h * 0.45)} a${f(w * 0.15)},${f(h * 0.18)} 0 1 0 0,${f(h * 0.35)}`, 'none', `stroke="${c}" stroke-width="${f(w * 0.07)}"`);
  },
  counter(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = rect(x, y, w, h * 0.1, '#d9d4cb') + rect(x, y + h * 0.1, w, h * 0.9, c);
    const n = Math.max(2, Math.round(w / 110));
    for (let i = 0; i < n; i++) {
      const dx = x + (w / n) * i;
      s += rect(dx + 6, y + h * 0.18, w / n - 12, h * 0.75, shade(c, 0.08), 'rx="3"') + rect(dx + w / n / 2 - 12, y + h * 0.3, 24, 4, '#555', 'rx="2"');
    }
    return s;
  },
  fridge(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'white');
    return rect(x, y, w, h, c, 'rx="6"') + line(x, y + h * 0.36, x + w, y + h * 0.36, shade(c, -0.25), 2) +
      rect(x + w * 0.8, y + h * 0.1, w * 0.06, h * 0.18, '#888', 'rx="2"') + rect(x + w * 0.8, y + h * 0.45, w * 0.06, h * 0.25, '#888', 'rx="2"');
  },
  tree(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'green');
    return shadow(o, 0.4) + rect(x + w * 0.44, y + h * 0.5, w * 0.12, h * 0.5, '#6b4a33') +
      circ(x + w * 0.5, y + h * 0.3, w * 0.36, c) + circ(x + w * 0.28, y + h * 0.42, w * 0.26, shade(c, -0.08)) + circ(x + w * 0.72, y + h * 0.42, w * 0.26, shade(c, 0.06));
  },
  pine(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'green');
    return rect(x + w * 0.45, y + h * 0.82, w * 0.1, h * 0.18, '#5a3e2b') +
      [0, 1, 2].map((i) => poly([[x + w * (0.5), y + h * (i * 0.22)], [x + w * (0.1 - i * 0.04), y + h * (0.38 + i * 0.22)], [x + w * (0.9 + i * 0.04), y + h * (0.38 + i * 0.22)]], shade(c, -0.05 * i))).join('');
  },
  palm(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'green');
    let s = path(`M${f(x + w * 0.5)},${f(y + h)} Q${f(x + w * 0.4)},${f(y + h * 0.5)} ${f(x + w * 0.55)},${f(y + h * 0.15)}`, 'none', `stroke="#8a6a45" stroke-width="${f(w * 0.08)}"`);
    [[-0.5, 0.1], [0.5, 0.05], [-0.35, -0.1], [0.4, -0.12], [0, -0.15]].forEach(([dx, dy]) => {
      s += path(`M${f(x + w * 0.55)},${f(y + h * 0.15)} Q${f(x + w * (0.55 + dx * 0.5))},${f(y + h * (0.05 + dy))} ${f(x + w * (0.55 + dx))},${f(y + h * (0.3 + dy))}`, 'none', `stroke="${c}" stroke-width="${f(w * 0.1)}" stroke-linecap="round"`);
    });
    return s;
  },
  bush(o) { const { x, y, w, h } = o; const c = hex(o.color || 'green'); return ell(x + w * 0.3, y + h * 0.6, w * 0.3, h * 0.4, shade(c, -0.1)) + ell(x + w * 0.65, y + h * 0.55, w * 0.35, h * 0.45, c); },
  flower(o) { const { x, y, w, h } = o; return line(x + w / 2, y + h, x + w / 2, y + h * 0.3, hex('green'), 2) + [0, 72, 144, 216, 288].map((a) => circ(x + w / 2 + Math.cos(a * Math.PI / 180) * w * 0.22, y + h * 0.25 + Math.sin(a * Math.PI / 180) * w * 0.22, w * 0.18, hex(o.color))).join('') + circ(x + w / 2, y + h * 0.25, w * 0.14, hex('yellow')); },
  rock(o) { const { x, y, w, h } = o; const c = hex(o.color || 'gray'); return poly([[x, y + h], [x + w * 0.1, y + h * 0.4], [x + w * 0.45, y], [x + w * 0.85, y + h * 0.25], [x + w, y + h]], c) + poly([[x + w * 0.45, y], [x + w * 0.85, y + h * 0.25], [x + w, y + h], [x + w * 0.6, y + h]], shade(c, -0.15)); },
  mountain(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'gray');
    return poly([[x, y + h], [x + w * 0.5, y], [x + w, y + h]], c) + poly([[x + w * 0.5, y], [x + w, y + h], [x + w * 0.62, y + h]], shade(c, -0.15)) +
      (o.snow ? poly([[x + w * 0.38, y + h * 0.24], [x + w * 0.5, y], [x + w * 0.62, y + h * 0.24], [x + w * 0.55, y + h * 0.2], [x + w * 0.5, y + h * 0.28], [x + w * 0.44, y + h * 0.2]], '#f4f6f8') : '');
  },
  cloud(o) { const { x, y, w, h } = o; const c = o.colorHex || '#ffffff'; return `<g opacity="0.92">${ell(x + w * 0.5, y + h * 0.6, w * 0.5, h * 0.4, c)}${circ(x + w * 0.35, y + h * 0.45, h * 0.38, c)}${circ(x + w * 0.62, y + h * 0.38, h * 0.48, c)}</g>`; },
  sun(o) { return ''; },
  sunGlow(o) { const { x, y, w } = o; return `<circle cx="${f(x + w / 2)}" cy="${f(y + w / 2)}" r="${f(w * 1.2)}" fill="url(#glowSun)"/>` + circ(x + w / 2, y + w / 2, w / 2, o.colorHex || '#fff1b8'); },
  moon(o) { return ''; },
  moonGlow(o) { const { x, y, w } = o; return `<circle cx="${f(x + w / 2)}" cy="${f(y + w / 2)}" r="${f(w)}" fill="url(#glowCool)"/>` + circ(x + w / 2, y + w / 2, w / 2, '#f1f0e4') + circ(x + w * 0.62, y + w * 0.4, w * 0.42, 'rgba(20,30,60,0.55)'); },
  boat(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return flipWrap(o, poly([[x, y + h * 0.65], [x + w, y + h * 0.65], [x + w * 0.85, y + h], [x + w * 0.12, y + h]], c) +
      line(x + w * 0.45, y + h * 0.65, x + w * 0.45, y, '#5a4630', 3) + poly([[x + w * 0.47, y + h * 0.04], [x + w * 0.47, y + h * 0.58], [x + w * 0.88, y + h * 0.58]], '#f3f1ea') +
      poly([[x + w * 0.43, y + h * 0.1], [x + w * 0.43, y + h * 0.58], [x + w * 0.12, y + h * 0.58]], '#e3dfd5'));
  },
  ship(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return flipWrap(o, poly([[x, y + h * 0.55], [x + w, y + h * 0.55], [x + w * 0.9, y + h], [x + w * 0.05, y + h]], c) +
      rect(x + w * 0.25, y + h * 0.25, w * 0.45, h * 0.3, '#efede6') + rect(x + w * 0.35, y, w * 0.1, h * 0.25, hex('red')) +
      [0.3, 0.42, 0.54].map((p) => rect(x + w * p, y + h * 0.33, w * 0.06, h * 0.08, '#2b3d5a')).join(''));
  },
  car(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return flipWrap(o, shadow(o, 0.5) + rect(x, y + h * 0.4, w, h * 0.4, c, 'rx="8"') +
      poly([[x + w * 0.2, y + h * 0.42], [x + w * 0.3, y], [x + w * 0.68, y], [x + w * 0.82, y + h * 0.42]], c) +
      poly([[x + w * 0.27, y + h * 0.4], [x + w * 0.34, y + h * 0.08], [x + w * 0.48, y + h * 0.08], [x + w * 0.48, y + h * 0.4]], '#cfe3f2') +
      poly([[x + w * 0.52, y + h * 0.4], [x + w * 0.52, y + h * 0.08], [x + w * 0.65, y + h * 0.08], [x + w * 0.76, y + h * 0.4]], '#cfe3f2') +
      circ(x + w * 0.23, y + h * 0.8, h * 0.2, '#222') + circ(x + w * 0.77, y + h * 0.8, h * 0.2, '#222') +
      circ(x + w * 0.23, y + h * 0.8, h * 0.08, '#999') + circ(x + w * 0.77, y + h * 0.8, h * 0.08, '#999'));
  },
  carGlow(o) {
    if (!o.lightsOn) return '';
    const { x, y, w, h } = o; const fx = o.flip ? x : x + w;
    return `<circle cx="${f(fx)}" cy="${f(y + h * 0.55)}" r="${f(h * 0.9)}" fill="url(#glowWarm)"/>` + circ(fx - (o.flip ? -4 : 4), y + h * 0.55, 5, '#fff4c4');
  },
  truck(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return flipWrap(o, shadow(o, 0.5) + rect(x, y, w * 0.68, h * 0.78, '#e7e4dc', 'rx="3"') + rect(x + w * 0.7, y + h * 0.3, w * 0.3, h * 0.48, c, 'rx="6"') +
      rect(x + w * 0.78, y + h * 0.36, w * 0.16, h * 0.16, '#cfe3f2') + circ(x + w * 0.18, y + h * 0.82, h * 0.16, '#222') + circ(x + w * 0.5, y + h * 0.82, h * 0.16, '#222') + circ(x + w * 0.85, y + h * 0.82, h * 0.16, '#222'));
  },
  bus(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = shadow(o, 0.5) + rect(x, y, w, h * 0.85, c, 'rx="12"') + rect(x, y + h * 0.62, w, h * 0.06, shade(c, -0.25));
    for (let i = 0; i < 5; i++) s += rect(x + w * (0.05 + i * 0.16), y + h * 0.12, w * 0.13, h * 0.32, '#cfe3f2', 'rx="3"');
    s += rect(x + w * 0.86, y + h * 0.12, w * 0.1, h * 0.6, '#9fc0d8', 'rx="3"');
    s += circ(x + w * 0.2, y + h * 0.85, h * 0.14, '#222') + circ(x + w * 0.78, y + h * 0.85, h * 0.14, '#222');
    return flipWrap(o, s);
  },
  train(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = rect(x, y, w, h * 0.88, c, 'rx="10"') + rect(x, y + h * 0.66, w, h * 0.06, shade(c, -0.3));
    const n = Math.floor(w / 70);
    for (let i = 0; i < n; i++) s += rect(x + 14 + i * 70, y + h * 0.15, 48, h * 0.3, '#cfe3f2', 'rx="4"');
    for (let i = 0; i < Math.floor(w / 140); i++) s += circ(x + 50 + i * 140, y + h * 0.92, h * 0.08, '#222') + circ(x + 90 + i * 140, y + h * 0.92, h * 0.08, '#222');
    return s;
  },
  bicycle(o) {
    const { x, y, w, h } = o; const c = hex(o.color); const r = h * 0.3;
    return flipWrap(o, circ(x + r, y + h - r, r, 'none', `stroke="#222" stroke-width="3"`) + circ(x + w - r, y + h - r, r, 'none', `stroke="#222" stroke-width="3"`) +
      `<polyline points="${f(x + r)},${f(y + h - r)} ${f(x + w * 0.42)},${f(y + h * 0.38)} ${f(x + w * 0.72)},${f(y + h * 0.38)} ${f(x + w - r)},${f(y + h - r)} ${f(x + w * 0.5)},${f(y + h - r)} ${f(x + w * 0.42)},${f(y + h * 0.38)}" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>` +
      line(x + w * 0.42, y + h * 0.38, x + w * 0.38, y + h * 0.22, c, 4) + line(x + w * 0.32, y + h * 0.22, x + w * 0.45, y + h * 0.22, '#222', 4) +
      line(x + w * 0.72, y + h * 0.38, x + w * 0.74, y + h * 0.18, c, 4) + line(x + w * 0.68, y + h * 0.18, x + w * 0.8, y + h * 0.16, '#222', 3));
  },
  building(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = rect(x, y, w, h, c) + rect(x, y, w, 8, shade(c, -0.2));
    const cols = Math.max(2, Math.floor(w / 46)); const rows = Math.max(2, Math.floor((h - 40) / 56));
    const cw = (w - 16) / cols;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) s += rect(x + 8 + k * cw + cw * 0.2, y + 22 + r * 56, cw * 0.6, 34, shade(c, -0.35));
    if (o.door) s += rect(x + w / 2 - 14, y + h - 46, 28, 46, shade(c, -0.45));
    return s;
  },
  buildingGlow(o) {
    if (!o.litWindows) return '';
    const { x, y, w, h } = o;
    const cols = Math.max(2, Math.floor(w / 46)); const rows = Math.max(2, Math.floor((h - 40) / 56)); const cw = (w - 16) / cols;
    let s = '';
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (((r * 7 + k * 3 + (o.seed || 0)) % 5) < 2) s += rect(x + 8 + k * cw + cw * 0.2, y + 22 + r * 56, cw * 0.6, 34, '#ffd27a', 'opacity="0.9"');
    return s;
  },
  house(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x + w * 0.08, y + h * 0.42, w * 0.84, h * 0.58, c) + poly([[x, y + h * 0.45], [x + w / 2, y], [x + w, y + h * 0.45]], hex(o.roof || 'red')) +
      rect(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.34, shade(c, -0.4)) + rect(x + w * 0.16, y + h * 0.56, w * 0.18, h * 0.16, '#cfe3f2') + rect(x + w * 0.66, y + h * 0.56, w * 0.18, h * 0.16, '#cfe3f2');
  },
  columns(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = poly([[x - w * 0.03, y + h * 0.2], [x + w / 2, y], [x + w * 1.03, y + h * 0.2]], shade(c, -0.05)) + rect(x - w * 0.03, y + h * 0.2, w * 1.06, h * 0.08, shade(c, -0.12));
    const n = o.count || 6;
    for (let i = 0; i < n; i++) { const cx = x + w * 0.06 + i * (w * 0.88) / (n - 1); s += rect(cx - w * 0.025, y + h * 0.28, w * 0.05, h * 0.6, c) + rect(cx - w * 0.035, y + h * 0.28, w * 0.07, h * 0.03, shade(c, -0.1)); }
    s += rect(x + w * 0.02, y + h * 0.28, w * 0.96, h * 0.6, shade(c, -0.4), 'opacity="0.35"');
    for (let i = 0; i < 3; i++) s += rect(x - w * 0.03 - i * 10, y + h * (0.88 + i * 0.04), w * 1.06 + i * 20, h * 0.04, shade(c, -0.05 * i));
    return s;
  },
  dome(o) { const { x, y, w, h } = o; const c = hex(o.color); return path(`M${f(x)},${f(y + h)} A${f(w / 2)},${f(h)} 0 0 1 ${f(x + w)},${f(y + h)} z`, c) + line(x + w / 2, y, x + w / 2, y - h * 0.25, shade(c, -0.3), 3); },
  tower(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = poly([[x + w * 0.15, y + h], [x + w * 0.35, y + h * 0.12], [x + w * 0.65, y + h * 0.12], [x + w * 0.85, y + h]], c) + poly([[x + w * 0.3, y + h * 0.12], [x + w / 2, y], [x + w * 0.7, y + h * 0.12]], shade(c, -0.25));
    for (let i = 0; i < 6; i++) s += rect(x + w * 0.45, y + h * (0.2 + i * 0.12), w * 0.1, h * 0.05, shade(c, -0.4));
    return s;
  },
  bridge(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = rect(x, y + h * 0.35, w, h * 0.1, c);
    const arches = o.arches || 4; const aw = w / arches;
    for (let i = 0; i < arches; i++) s += path(`M${f(x + i * aw)},${f(y + h)} L${f(x + i * aw)},${f(y + h * 0.45)} L${f(x + (i + 1) * aw)},${f(y + h * 0.45)} L${f(x + (i + 1) * aw)},${f(y + h)} L${f(x + (i + 1) * aw - aw * 0.12)},${f(y + h)} A${f(aw * 0.38)},${f(h * 0.4)} 0 0 0 ${f(x + i * aw + aw * 0.12)},${f(y + h)} z`, shade(c, -0.1));
    for (let i = 0; i <= arches * 3; i++) s += rect(x + (w / (arches * 3)) * i - 2, y + h * 0.25, 4, h * 0.1, shade(c, -0.2));
    return s;
  },
  lighthouse(o) {
    const { x, y, w, h } = o;
    let s = poly([[x + w * 0.2, y + h], [x + w * 0.32, y + h * 0.18], [x + w * 0.68, y + h * 0.18], [x + w * 0.8, y + h]], '#f2efe8');
    for (let i = 0; i < 3; i++) s += poly([[x + w * (0.29 - i * 0.03), y + h * (0.33 + i * 0.25)], [x + w * (0.71 + i * 0.03), y + h * (0.33 + i * 0.25)], [x + w * (0.73 + i * 0.03), y + h * (0.43 + i * 0.25)], [x + w * (0.27 - i * 0.03), y + h * (0.43 + i * 0.25)]], hex('red'));
    s += rect(x + w * 0.32, y + h * 0.06, w * 0.36, h * 0.12, '#33404f') + poly([[x + w * 0.28, y + h * 0.06], [x + w / 2, y], [x + w * 0.72, y + h * 0.06]], hex('red'));
    return s;
  },
  lighthouseGlow(o) { return o.lit ? `<circle cx="${f(o.x + o.w / 2)}" cy="${f(o.y + o.h * 0.12)}" r="${f(o.w * 1.6)}" fill="url(#glowWarm)"/>` : ''; },
  streetlight(o) {
    const { x, y, w, h } = o;
    return rect(x + w * 0.45, y + h * 0.05, w * 0.1, h * 0.95, '#3a3d42') + path(`M${f(x + w * 0.5)},${f(y + h * 0.06)} q${f(w * 0.3)},${f(-h * 0.06)} ${f(w * 0.45)},${f(h * 0.02)}`, 'none', 'stroke="#3a3d42" stroke-width="5"') +
      rect(x + w * 0.82, y + h * 0.07, w * 0.22, h * 0.03, '#3a3d42');
  },
  streetlightGlow(o) {
    if (!o.lit) return '';
    const { x, y, w, h } = o;
    return `<polygon points="${f(x + w * 0.83)},${f(y + h * 0.1)} ${f(x + w * 1.03)},${f(y + h * 0.1)} ${f(x + w * 1.9)},${f(y + h)} ${f(x - w * 0.1)},${f(y + h)}" fill="url(#coneWarm)"/>` + rect(x + w * 0.84, y + h * 0.095, w * 0.18, h * 0.015, '#ffe7a8');
  },
  trafficlight(o) {
    const { x, y, w, h } = o; const st = o.state || 'red';
    return rect(x + w * 0.45, y + h * 0.35, w * 0.1, h * 0.65, '#3a3d42') + rect(x + w * 0.2, y, w * 0.6, h * 0.38, '#25272b', 'rx="5"') +
      circ(x + w / 2, y + h * 0.07, w * 0.16, st === 'red' ? '#e5483b' : '#4a2522') + circ(x + w / 2, y + h * 0.19, w * 0.16, st === 'amber' ? '#f2b33a' : '#4a3d22') + circ(x + w / 2, y + h * 0.31, w * 0.16, st === 'green' ? '#45c46a' : '#203a28');
  },
  bench(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return shadow(o, 0.5) + rect(x, y, w, h * 0.14, c, 'rx="2"') + rect(x, y + h * 0.2, w, h * 0.14, c, 'rx="2"') + rect(x - w * 0.02, y + h * 0.5, w * 1.04, h * 0.14, c, 'rx="2"') +
      rect(x + w * 0.06, y + h * 0.64, w * 0.05, h * 0.36, '#333') + rect(x + w * 0.89, y + h * 0.64, w * 0.05, h * 0.36, '#333');
  },
  shelter(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x, y, w, h * 0.06, c) + rect(x + w * 0.02, y + h * 0.06, w * 0.03, h * 0.94, '#555') + rect(x + w * 0.95, y + h * 0.06, w * 0.03, h * 0.94, '#555') +
      rect(x + w * 0.05, y + h * 0.1, w * 0.9, h * 0.6, 'rgba(190,220,235,0.35)') + rect(x + w * 0.15, y + h * 0.66, w * 0.7, h * 0.06, '#666');
  },
  sign(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return rect(x + w * 0.46, y + h * 0.3, w * 0.08, h * 0.7, '#555') + (o.round ? circ(x + w / 2, y + h * 0.17, w * 0.42, c) : rect(x, y, w, h * 0.32, c, 'rx="4"')) +
      (o.text ? `<text x="${f(x + w / 2)}" y="${f(y + h * 0.21)}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${f(h * 0.14)}" text-anchor="middle" fill="#fff">${o.text}</text>` : '');
  },
  trashcan(o) { const { x, y, w, h } = o; const c = hex(o.color); return rect(x + w * 0.1, y + h * 0.12, w * 0.8, h * 0.88, c, 'rx="4"') + rect(x, y, w, h * 0.14, shade(c, -0.15), 'rx="3"') + [0.3, 0.5, 0.7].map((p) => rect(x + w * p - 2, y + h * 0.25, 4, h * 0.6, shade(c, -0.2))).join(''); },
  umbrella(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    return line(x + w / 2, y + h * 0.2, x + w / 2 + w * 0.05, y + h, '#555', 3) + path(`M${f(x)},${f(y + h * 0.3)} Q${f(x + w / 2)},${f(y - h * 0.1)} ${f(x + w)},${f(y + h * 0.3)} z`, c) +
      path(`M${f(x + w * 0.33)},${f(y + h * 0.3)} Q${f(x + w / 2)},${f(y - h * 0.05)} ${f(x + w * 0.66)},${f(y + h * 0.3)}`, 'none', `stroke="${shade(c, 0.4)}" stroke-width="2"`);
  },
  tent(o) { const { x, y, w, h } = o; const c = hex(o.color); return shadow(o, 0.5) + poly([[x, y + h], [x + w / 2, y], [x + w, y + h]], c) + poly([[x + w * 0.38, y + h], [x + w / 2, y + h * 0.4], [x + w * 0.62, y + h]], shade(c, -0.4)); },
  campfire(o) { const { x, y, w, h } = o; return line(x, y + h, x + w, y + h * 0.75, '#5a3e2b', 6) + line(x, y + h * 0.75, x + w, y + h, '#6b4a33', 6); },
  campfireGlow(o) { const { x, y, w, h } = o; return `<circle cx="${f(x + w / 2)}" cy="${f(y + h * 0.6)}" r="${f(w * 2.2)}" fill="url(#glowWarm)"/>` + path(`M${f(x + w * 0.25)},${f(y + h * 0.85)} Q${f(x + w * 0.2)},${f(y + h * 0.3)} ${f(x + w * 0.5)},${f(y)} Q${f(x + w * 0.8)},${f(y + h * 0.3)} ${f(x + w * 0.75)},${f(y + h * 0.85)} z`, '#f08a2c') + path(`M${f(x + w * 0.38)},${f(y + h * 0.85)} Q${f(x + w * 0.4)},${f(y + h * 0.5)} ${f(x + w * 0.5)},${f(y + h * 0.3)} Q${f(x + w * 0.6)},${f(y + h * 0.5)} ${f(x + w * 0.62)},${f(y + h * 0.85)} z`, '#ffd46b'); },
  stall(o) {
    const { x, y, w, h } = o; const c = hex(o.color);
    let s = rect(x + w * 0.04, y + h * 0.15, w * 0.03, h * 0.85, '#6b4a33') + rect(x + w * 0.93, y + h * 0.15, w * 0.03, h * 0.85, '#6b4a33');
    for (let i = 0; i < 8; i++) s += rect(x + (w / 8) * i, y, w / 8, h * 0.18, i % 2 ? c : '#f4f1ea');
    s += rect(x, y + h * 0.6, w, h * 0.4, '#8a6a45');
    for (let i = 0; i < 9; i++) s += circ(x + w * 0.1 + i * w * 0.1, y + h * 0.56, h * 0.05, hex(['red', 'orange', 'yellow', 'green'][i % 4]));
    return s;
  },
  ball(o) { const { x, y, w } = o; return circ(x + w / 2, y + w / 2, w / 2, hex(o.color)) + path(`M${f(x)},${f(y + w / 2)} Q${f(x + w / 2)},${f(y + w * 0.2)} ${f(x + w)},${f(y + w / 2)}`, 'none', 'stroke="#fff" stroke-width="2"'); },
  kite(o) { const { x, y, w, h } = o; const c = hex(o.color); return poly([[x + w / 2, y], [x + w, y + h * 0.4], [x + w / 2, y + h * 0.7], [x, y + h * 0.4]], c) + path(`M${f(x + w / 2)},${f(y + h * 0.7)} q${f(-w * 0.3)},${f(h * 0.2)} 0,${f(h * 0.3)}`, 'none', 'stroke="#444" stroke-width="1.5"'); },
  airplane(o) {
    const { x, y, w, h } = o; const c = hex(o.color || 'white');
    return flipWrap(o, ell(x + w / 2, y + h / 2, w / 2, h * 0.14, c) + poly([[x + w * 0.4, y + h / 2], [x + w * 0.55, y + h / 2], [x + w * 0.35, y + h], [x + w * 0.27, y + h]], shade(c, -0.1)) +
      poly([[x + w * 0.05, y + h * 0.45], [x + w * 0.14, y + h * 0.45], [x + w * 0.06, y + h * 0.05], [x, y + h * 0.05]], shade(c, -0.1)));
  },
  dock(o) { const { x, y, w, h } = o; let s = rect(x, y, w, h * 0.3, '#8a6a45'); for (let i = 0; i < 6; i++) s += rect(x + i * (w / 5.2), y + h * 0.3, 8, h * 0.7, '#5a3e2b'); return s; },
  crane(o) { const { x, y, w, h } = o; const c = hex(o.color || 'yellow'); return rect(x + w * 0.1, y, w * 0.08, h, c) + rect(x, y, w, h * 0.05, c) + line(x + w * 0.85, y + h * 0.05, x + w * 0.85, y + h * 0.45, '#333', 2) + rect(x + w * 0.8, y + h * 0.45, w * 0.1, h * 0.06, '#555'); },
  container(o) { const { x, y, w, h } = o; const c = hex(o.color); let s = rect(x, y, w, h, c); for (let i = 1; i < 8; i++) s += rect(x + (w / 8) * i, y + 3, 2, h - 6, shade(c, -0.25)); return s; },
  fountain(o) { const { x, y, w, h } = o; return ell(x + w / 2, y + h * 0.85, w / 2, h * 0.15, '#9aa3ab') + ell(x + w / 2, y + h * 0.82, w * 0.44, h * 0.1, '#7fb6d8') + rect(x + w * 0.45, y + h * 0.35, w * 0.1, h * 0.47, '#9aa3ab') + path(`M${f(x + w / 2)},${f(y + h * 0.35)} q${f(-w * 0.3)},${f(-h * 0.4)} ${f(-w * 0.35)},${f(h * 0.45)} M${f(x + w / 2)},${f(y + h * 0.35)} q${f(w * 0.3)},${f(-h * 0.4)} ${f(w * 0.35)},${f(h * 0.45)}`, 'none', 'stroke="#bfe0f2" stroke-width="3"'); },
  flag(o) { const { x, y, w, h } = o; return rect(x, y, 3, h, '#555') + rect(x + 3, y, w * 0.9, h * 0.3, hex(o.color)) + rect(x + 3, y + h * 0.1, w * 0.9, h * 0.1, '#f4f1ea'); },
  plate(o) { const { x, y, w, h } = o; return ell(x + w / 2, y + h / 2, w / 2, h / 2, '#f4f1ea') + ell(x + w / 2, y + h / 2, w * 0.3, h * 0.28, hex(o.color || 'orange')); },
  // Graphic design primitives
  shapeCircle(o) { return circ(o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) / 2, hex(o.color)); },
  shapeSquare(o) { return rect(o.x, o.y, o.w, o.h, hex(o.color), o.rotate ? `transform="rotate(${o.rotate} ${f(o.x + o.w / 2)} ${f(o.y + o.h / 2)})"` : ''); },
  shapeTriangle(o) { return poly([[o.x, o.y + o.h], [o.x + o.w / 2, o.y], [o.x + o.w, o.y + o.h]], hex(o.color)); },
  shapeLine(o) { return rect(o.x, o.y, o.w, Math.max(2, o.h), hex(o.color)); },
  shapeArc(o) { return path(`M${f(o.x)},${f(o.y + o.h)} A${f(o.w / 2)},${f(o.h)} 0 0 1 ${f(o.x + o.w)},${f(o.y + o.h)}`, 'none', `stroke="${hex(o.color)}" stroke-width="${f(o.stroke || 14)}"`); },
  textBlock(o) {
    const fs = o.fontSize || o.h * 0.8;
    return `<text x="${f(o.x)}" y="${f(o.y + fs * 0.85)}" font-family="${o.font || 'Helvetica, Arial, sans-serif'}" font-weight="${o.weight || 700}" font-size="${f(fs)}" letter-spacing="${o.tracking || 0}" fill="${hex(o.color)}">${o.text}</text>`;
  },
};

export function drawObject(o) {
  const fn = DRAWABLES[o.draw || o.type];
  if (!fn) throw new Error(`No drawable for ${o.draw || o.type}`);
  return fn(o);
}

export function drawGlow(o) {
  const fn = DRAWABLES[`${o.draw || o.type}Glow`];
  return fn ? fn(o) : '';
}
