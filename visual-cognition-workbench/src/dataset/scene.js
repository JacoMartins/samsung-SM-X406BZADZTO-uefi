// Scene builder + SVG renderer. Templates describe a scene through the
// builder; the builder produces BOTH the SVG markup and the structured
// ground-truth annotation from the same object list, so annotations can never
// drift from what is actually drawn.
import { drawObject, drawGlow } from './drawables.js';
import { LIGHTING, hex, mix, shade } from './palette.js';

export const SCENE_W = 960;
export const SCENE_H = 600;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;

export function cellOf(cx, cy, w = SCENE_W, h = SCENE_H) {
  const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor((cx / w) * GRID_COLS)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((cy / h) * GRID_ROWS)));
  return { row, col, index: row * GRID_COLS + col };
}

export class SceneBuilder {
  constructor(rng, lightingKey) {
    this.rng = rng;
    this.lightingKey = lightingKey;
    this.L = LIGHTING[lightingKey];
    this.objects = [];
    this.bg = [];
    this.fg = []; // overlays drawn above objects but below tint (rain, etc.)
    this.post = []; // drawn above everything (e.g. silhouettes against glow)
    this.counter = 0;
    this.filters = new Set();
  }

  /**
   * Add an annotated object.
   * @param {string} type canonical concept key (lexicon)
   * @param {object} p   geometry + drawing props: x,y,w,h,color,salience,z,count,...
   */
  add(type, p) {
    const o = {
      id: `o${++this.counter}`, type, label: p.label || type, salience: p.salience || 'secondary',
      z: p.z ?? 10, annotate: p.annotate !== false, ...p,
    };
    this.objects.push(o);
    return o;
  }

  /** Annotated area (lake, road, sea...) that is drawn as part of the background. */
  region(type, p) {
    return this.add(type, { ...p, draw: 'none', region: true, colorReliable: false, z: -1 });
  }

  /** Raw background SVG (not annotated as an object). */
  background(svg) { this.bg.push(svg); }
  overlay(svg) { this.fg.push(svg); }

  sky(top, bottom) { // fills whole canvas with lighting gradient
    this.background(`<rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="url(#skyGrad)"/>`);
  }

  ground(y, color, opts = {}) {
    const c = hex(color);
    this.background(`<rect x="0" y="${y}" width="${SCENE_W}" height="${SCENE_H - y}" fill="${c}"/>` +
      (opts.horizonShade !== false ? `<rect x="0" y="${y}" width="${SCENE_W}" height="${Math.min(40, SCENE_H - y)}" fill="${shade(c, -0.12)}" opacity="0.5"/>` : ''));
  }

  interior(wall, floor, floorY) {
    const w = hex(wall); const fl = hex(floor);
    this.background(`<rect x="0" y="0" width="${SCENE_W}" height="${floorY}" fill="${w}"/>` +
      `<rect x="0" y="${floorY - 14}" width="${SCENE_W}" height="14" fill="${shade(w, -0.18)}"/>` +
      `<rect x="0" y="${floorY}" width="${SCENE_W}" height="${SCENE_H - floorY}" fill="${fl}"/>` +
      Array.from({ length: 8 }, (_, i) => `<line x1="${i * 140 - 60}" y1="${SCENE_H}" x2="${i * 120 + 40}" y2="${floorY}" stroke="${shade(fl, -0.12)}" stroke-width="2"/>`).join(''));
  }

  water(y, color = '#4f86b0', h = SCENE_H - y) {
    const c = hex(color);
    let s = `<rect x="0" y="${y}" width="${SCENE_W}" height="${h}" fill="${c}"/>`;
    for (let i = 0; i < 14; i++) {
      const yy = y + 8 + this.rng.float(0, h - 10); const xx = this.rng.float(0, SCENE_W - 80);
      s += `<rect x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" width="${this.rng.int(30, 90)}" height="2" fill="${shade(c, 0.25)}" opacity="0.6"/>`;
    }
    this.background(s);
  }

  rain(intensity = 60) {
    let s = '';
    for (let i = 0; i < intensity; i++) {
      const x = this.rng.float(0, SCENE_W); const y = this.rng.float(0, SCENE_H);
      s += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 6).toFixed(0)}" y2="${(y + 22).toFixed(0)}" stroke="#d7e3ee" stroke-width="1.4" opacity="0.55"/>`;
    }
    this.overlay(s);
  }

  /** Assemble SVG markup. */
  render({ vignette = true } = {}) {
    const L = this.L;
    const objs = this.objects.slice().sort((a, b) => a.z - b.z);
    const body = objs.map((o) => {
      const svg = drawObject(o);
      return o.blur ? `<g filter="url(#dof${o.blur})">${svg}</g>` : svg;
    }).join('');
    const glows = objs.map((o) => drawGlow(o)).join('');
    const darkness = L.darkness ? `<rect width="${SCENE_W}" height="${SCENE_H}" fill="#050812" opacity="${L.darkness}"/>` : '';
    const tint = L.tintOpacity ? `<rect width="${SCENE_W}" height="${SCENE_H}" fill="${L.tint}" opacity="${L.tintOpacity}"/>` : '';
    const vig = vignette ? `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#vignette)"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W}" height="${SCENE_H}">` +
      defs(L) + this.bg.join('') + body + this.fg.join('') + darkness + tint + glows + this.post.join('') + vig + '</svg>';
  }

  /** Object-level ground truth derived from the drawn geometry. */
  annotateObjects() {
    return this.objects.filter((o) => o.annotate).map((o) => {
      const cx = o.x + o.w / 2; const cy = o.y + o.h / 2;
      const area = (o.w * o.h) / (SCENE_W * SCENE_H);
      return {
        id: o.id, type: o.type, label: o.label, color: o.colorName ?? o.color ?? null,
        box: { x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w), h: Math.round(o.h) },
        center: { x: Math.round(cx), y: Math.round(cy) }, cell: cellOf(cx, cy).index,
        area: Math.round(area * 10000) / 10000, salience: o.salience,
        animate: o.animate || null, region: !!o.region, pose: o.pose || null, colorReliable: o.colorReliable !== false && !!(o.colorName ?? o.color),
      };
    });
  }
}

function defs(L) {
  const [top, bottom] = L.sky;
  return `<defs>
<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<radialGradient id="glowWarm"><stop offset="0" stop-color="#ffd58a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<radialGradient id="glowCool"><stop offset="0" stop-color="#cfe2ff" stop-opacity="0.5"/><stop offset="1" stop-color="#9bbcff" stop-opacity="0"/></radialGradient>
<radialGradient id="glowSun"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.9"/><stop offset="1" stop-color="${mix(top, '#ffe08a', 0.5)}" stop-opacity="0"/></radialGradient>
<linearGradient id="coneWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a0" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0.02"/></linearGradient>
<radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>
<filter id="dof1"><feGaussianBlur stdDeviation="2.5"/></filter>
<filter id="dof2"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;
}
