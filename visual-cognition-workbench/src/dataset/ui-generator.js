// Synthetic website / interface screenshots with planted, annotated design
// problems. Because every issue is planted deliberately, its presence or
// absence is objectively known, which makes interface-analysis answers
// scoreable. Brand names and copy are fictitious.
import { SCENE_W, SCENE_H, cellOf } from './scene.js';

export const UI_ISSUES = {
  'low-contrast': { label: 'Low-contrast text that is hard to read', fix: ['contrast', 'darker', 'dark', 'readable', 'legible', 'legibility', 'lighter', 'colour', 'color', 'grey', 'gray', 'faint', 'pale'] },
  misalignment: { label: 'An element is misaligned with its neighbours', fix: ['align', 'alignment', 'aligned', 'grid', 'line', 'offset', 'misaligned', 'crooked', 'straight'] },
  'inconsistent-spacing': { label: 'Inconsistent spacing between elements', fix: ['spacing', 'space', 'gap', 'gaps', 'margin', 'padding', 'even', 'evenly', 'consistent', 'uneven', 'whitespace'] },
  'typography-mix': { label: 'Too many typefaces or inconsistent type styles', fix: ['font', 'fonts', 'typeface', 'typography', 'type', 'serif', 'consistent', 'size', 'style', 'mixed'] },
  'competing-cta': { label: 'Two calls to action compete with equal emphasis', fix: ['button', 'buttons', 'cta', 'primary', 'secondary', 'emphasis', 'hierarchy', 'one', 'compete', 'competing', 'call'] },
  'small-targets': { label: 'Links or buttons are too small to use comfortably', fix: ['small', 'bigger', 'larger', 'size', 'tap', 'click', 'target', 'tiny', 'touch', 'increase'] },
  'weak-hierarchy': { label: 'The main heading lacks visual dominance', fix: ['hierarchy', 'headline', 'heading', 'title', 'bigger', 'larger', 'bold', 'emphasis', 'prominent', 'dominant', 'size'] },
  'text-over-image': { label: 'Text is placed over a busy image', fix: ['image', 'background', 'overlay', 'busy', 'pattern', 'behind', 'readable', 'legible', 'contrast', 'scrim'] },
  'hidden-nav': { label: 'Main navigation is hidden or unclear', fix: ['navigation', 'nav', 'menu', 'hamburger', 'links', 'visible', 'show', 'hidden', 'expose'] },
  'inconsistent-buttons': { label: 'Buttons for similar actions use inconsistent styles', fix: ['button', 'buttons', 'consistent', 'style', 'same', 'uniform', 'shape', 'colour', 'color'] },
  clutter: { label: 'Too many competing accent colours', fix: ['colour', 'color', 'colours', 'colors', 'palette', 'clutter', 'busy', 'simplify', 'reduce', 'fewer', 'calm'] },
};

const LAYOUT_ISSUES = {
  landing: ['low-contrast', 'misalignment', 'inconsistent-spacing', 'typography-mix', 'competing-cta', 'small-targets', 'weak-hierarchy', 'text-over-image', 'hidden-nav', 'inconsistent-buttons', 'clutter'],
  dashboard: ['low-contrast', 'misalignment', 'inconsistent-spacing', 'typography-mix', 'competing-cta', 'small-targets', 'weak-hierarchy', 'hidden-nav', 'clutter'],
  product: ['low-contrast', 'misalignment', 'inconsistent-spacing', 'typography-mix', 'competing-cta', 'small-targets', 'weak-hierarchy', 'hidden-nav', 'inconsistent-buttons', 'clutter'],
  article: ['low-contrast', 'misalignment', 'inconsistent-spacing', 'typography-mix', 'small-targets', 'weak-hierarchy', 'text-over-image', 'hidden-nav', 'clutter'],
};

const ACCENTS = [['blue', '#3156c9'], ['green', '#1f8a62'], ['orange', '#c2511c'], ['purple', '#6d3fd6'], ['teal', '#0f7a74']];
const NAMES = ['Lumora', 'Quillfield', 'Brightmere', 'Northvale', 'Corvana', 'Tessaly', 'Halcyra', 'Ombrel'];
const SANS = 'Helvetica, Arial, sans-serif';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

class Canvas {
  constructor() { this.parts = []; this.elements = []; }
  box(x, y, w, h, fill, o = {}) { this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 0}" fill="${fill}" ${o.stroke ? `stroke="${o.stroke}" stroke-width="${o.sw || 1.5}"` : ''}/>`); }
  text(x, y, s, o = {}) { this.parts.push(`<text x="${x}" y="${y}" font-family="${o.font || SANS}" font-size="${o.size || 14}" font-weight="${o.weight || 400}" fill="${o.fill || '#1d1d1f'}" text-anchor="${o.anchor || 'start'}" letter-spacing="${o.tracking || 0}">${esc(s)}</text>`); }
  lines(x, y, w, n, o = {}) { for (let i = 0; i < n; i++) this.box(x, y + i * (o.gap || 14), i === n - 1 ? w * 0.6 : w, o.h || 7, o.fill || '#b9bcc2', { r: 3 }); }
  button(x, y, w, h, label, o = {}) {
    const fill = o.outline ? 'none' : o.fill;
    this.box(x, y, w, h, fill === 'none' ? '#ffffff' : fill, { r: o.r ?? 6, stroke: o.outline ? o.fill : null, sw: 2 });
    this.text(x + w / 2, y + h / 2 + (o.size || 14) * 0.35, label, { size: o.size || 14, weight: 600, fill: o.outline ? o.fill : o.textFill || '#fff', anchor: 'middle' });
  }
  image(x, y, w, h, busy, hue = '#9db7e0') {
    if (busy) {
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6d7f99"/>`;
      for (let i = 0; i < 60; i++) {
        const cx = x + ((i * 97) % w); const cy = y + ((i * 53) % h); const r = 10 + ((i * 7) % 40);
        s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${['#f4d06f', '#e66d5c', '#ffffff', '#3d5a80', '#98c1d9'][i % 5]}" opacity="0.75"/>`;
      }
      this.parts.push(s);
    } else {
      this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${hue}"/>` +
        `<circle cx="${x + w * 0.72}" cy="${y + h * 0.32}" r="${Math.min(w, h) * 0.12}" fill="#ffffff" opacity="0.7"/>` +
        `<polygon points="${x},${y + h} ${x + w * 0.35},${y + h * 0.45} ${x + w * 0.6},${y + h * 0.75} ${x + w * 0.75},${y + h * 0.6} ${x + w},${y + h}" fill="#ffffff" opacity="0.35"/>`);
    }
  }
  el(kind, x, y, w, h, extra = {}) { this.elements.push({ kind, box: { x, y, w, h }, cell: cellOf(x + w / 2, y + h / 2).index, ...extra }); }
}

function nav(c, rng, I, accent, name, { logoX = 40, itemsRightX = 920, y = 0, h = 64 } = {}) {
  c.box(0, y, SCENE_W, h, '#ffffff'); c.box(0, y + h - 1, SCENE_W, 1, '#e5e5ea');
  c.box(logoX, y + 20, 24, 24, accent, { r: 6 }); c.text(logoX + 34, y + 38, name, { size: 19, weight: 700 });
  c.el('logo', logoX, y + 20, 140, 24);
  if (I.has('hidden-nav')) {
    for (let i = 0; i < 3; i++) c.box(itemsRightX - 24, y + 24 + i * 7, 24, 3, '#333', { r: 1 });
    c.el('navigation', itemsRightX - 24, y + 22, 24, 20, { style: 'hamburger' });
    return 'hamburger menu only';
  }
  const items = rng.sample(['Product', 'Pricing', 'Stories', 'Docs', 'About', 'Support', 'Shop', 'Journal'], 4);
  const size = I.has('small-targets') ? 9 : 15;
  let x = itemsRightX - 330;
  items.forEach((it) => { c.text(x, y + 38, it, { size, fill: '#3a3a3c' }); x += 80; });
  c.el('navigation', itemsRightX - 330, y + 20, 320, 26, { style: 'top bar' });
  return 'top bar';
}

function cardTitleStyle(I, i) {
  if (!I.has('typography-mix')) return { font: SANS, size: 18, weight: 700 };
  return [{ font: 'Georgia, serif', size: 22, weight: 400 }, { font: 'Courier New, monospace', size: 15, weight: 700 }, { font: SANS, size: 19, weight: 800 }, { font: 'Georgia, serif', size: 16, weight: 700 }][i % 4];
}

function cardRow(c, rng, I, accent, { y, n = 3, x0 = 40, total = 880, h = 170, withButtons = true, titles }) {
  const gaps = I.has('inconsistent-spacing') ? rng.shuffle([10, 46, 24]).slice(0, n - 1) : Array(n - 1).fill(28);
  const w = (total - gaps.reduce((a, b) => a + b, 0)) / n;
  const mis = I.has('misalignment') ? rng.int(1, n - 1) : -1;
  const clutter = ['#fde68a', '#bfdbfe', '#fecaca', '#bbf7d0', '#e9d5ff'];
  let x = x0;
  for (let i = 0; i < n; i++) {
    const dy = i === mis ? 16 : 0; const dx = i === mis ? 9 : 0;
    const bg = I.has('clutter') ? clutter[i % clutter.length] : '#ffffff';
    c.box(x + dx, y + dy, w, h, bg, { r: 10, stroke: '#e5e5ea' });
    const ts = cardTitleStyle(I, i);
    c.text(x + dx + 18, y + dy + 34, titles[i % titles.length], ts);
    c.lines(x + dx + 18, y + dy + 54, w - 50, 3, { fill: I.has('low-contrast') ? '#e6e6ea' : '#9a9ca3' });
    if (withButtons) {
      if (I.has('inconsistent-buttons')) {
        const styles = [{ fill: accent, r: 6 }, { fill: '#e2483b', r: 18 }, { fill: '#222', r: 0, outline: true }];
        c.button(x + dx + 18, y + dy + h - 50, 110, 32, 'Learn more', { ...styles[i % 3], size: 13 });
      } else c.button(x + dx + 18, y + dy + h - 50, 110, 32, 'Learn more', { fill: accent, outline: true, size: 13 });
    }
    c.el('card', x + dx, y + dy, w, h);
    x += w + (gaps[i] ?? 0);
  }
}

const LAYOUTS = {
  landing(c, rng, I, [accentName, accent], name) {
    c.box(0, 0, SCENE_W, SCENE_H, '#f6f6f8');
    const navType = nav(c, rng, I, accent, name);
    const headline = rng.pick([['Plan less.', 'Make more.'], ['Your work,', 'in one calm place.'], ['Field notes', 'for curious teams.'], ['Quiet tools', 'for loud ideas.']]);
    const overImage = I.has('text-over-image');
    if (overImage) c.image(0, 64, SCENE_W, 290, true);
    else c.image(520, 92, 400, 240, false, '#a9c1e8');
    const hSize = I.has('weak-hierarchy') ? 17 : 44; const hWeight = I.has('weak-hierarchy') ? 400 : 800;
    const hFill = overImage ? '#ffffff' : '#111114';
    headline.forEach((l, i) => c.text(40, 150 + i * (hSize + 8), l, { size: hSize, weight: hWeight, fill: hFill }));
    c.el('headline', 40, 150 - hSize, 440, hSize * 2 + 8, { dominance: I.has('weak-hierarchy') ? 'low' : 'high' });
    const subFill = I.has('low-contrast') ? '#d2d2d7' : overImage ? '#ffffff' : '#4a4a50';
    c.text(40, 255, 'A focused workspace for planning, writing and sharing.', { size: 15, fill: subFill });
    c.text(40, 276, 'Start free, invite your team when you are ready.', { size: 15, fill: subFill });
    const bh = I.has('small-targets') ? 24 : 44; const bw = I.has('small-targets') ? 90 : 150;
    c.button(40, 300, bw, bh, 'Get started', { fill: accent, size: I.has('small-targets') ? 11 : 15 });
    c.el('primary button', 40, 300, bw, bh);
    if (I.has('competing-cta')) { c.button(40 + bw + 16, 300, bw, bh, 'Book a demo', { fill: '#e2483b', size: I.has('small-targets') ? 11 : 15 }); c.el('competing button', 56 + bw, 300, bw, bh); }
    else { c.button(40 + bw + 16, 300, bw, bh, 'See pricing', { fill: accent, outline: true, size: I.has('small-targets') ? 11 : 15 }); }
    if (!overImage) c.el('hero image', 520, 92, 400, 240);
    cardRow(c, rng, I, accent, { y: 390, titles: ['Plan', 'Write', 'Share'] });
    const focal = I.has('weak-hierarchy') ? [{ cell: overImage ? 1 : 2, credit: 1 }, { cell: 0, credit: 0.5 }, { cell: 3, credit: 0.5 }] : [{ cell: 0, credit: 1 }, { cell: 3, credit: 0.5 }, { cell: 1, credit: 0.25 }];
    if (I.has('competing-cta')) focal.push({ cell: 3, credit: 0.75 });
    return { pageType: 'landing page', navType, dominant: I.has('weak-hierarchy') ? (overImage ? 'image' : 'image') : 'headline', focal };
  },
  dashboard(c, rng, I, [accentName, accent], name) {
    c.box(0, 0, SCENE_W, SCENE_H, '#f3f4f7');
    let navType;
    const side = !I.has('hidden-nav');
    const left = side ? 200 : 0;
    if (side) {
      c.box(0, 0, 200, SCENE_H, '#1f2430');
      c.box(24, 24, 22, 22, accent, { r: 6 }); c.text(56, 41, name, { size: 17, weight: 700, fill: '#fff' });
      const size = I.has('small-targets') ? 9 : 14;
      ['Overview', 'Reports', 'Customers', 'Billing', 'Settings'].forEach((t, i) => {
        if (i === 0) c.box(12, 82 + i * 44, 176, 34, '#2e3546', { r: 6 });
        c.text(28, 104 + i * 44, t, { size, fill: i === 0 ? '#fff' : '#b6bccb' });
      });
      c.el('navigation', 0, 70, 200, 230, { style: 'left sidebar' });
      navType = 'left sidebar';
    } else {
      c.box(0, 0, SCENE_W, 56, '#1f2430');
      for (let i = 0; i < 3; i++) c.box(24, 20 + i * 7, 22, 3, '#fff', { r: 1 });
      c.text(60, 35, name, { size: 17, weight: 700, fill: '#fff' });
      c.el('navigation', 24, 18, 22, 20, { style: 'hamburger' });
      navType = 'hamburger menu only';
    }
    const top = side ? 0 : 56;
    const tSize = I.has('weak-hierarchy') ? 12 : 26;
    c.text(left + 32, top + 52, 'Overview', { size: tSize, weight: I.has('weak-hierarchy') ? 400 : 800 });
    c.el('headline', left + 32, top + 52 - tSize, 200, tSize);
    const bw = I.has('small-targets') ? 70 : 120; const bh = I.has('small-targets') ? 22 : 36;
    c.button(SCENE_W - 32 - bw, top + 26, bw, bh, 'Export', { fill: accent, size: I.has('small-targets') ? 10 : 14 });
    c.el('primary button', SCENE_W - 32 - bw, top + 26, bw, bh);
    if (I.has('competing-cta')) { c.button(SCENE_W - 48 - 2 * bw, top + 26, bw, bh, 'Upgrade', { fill: '#e2483b', size: I.has('small-targets') ? 10 : 14 }); c.el('competing button', SCENE_W - 48 - 2 * bw, top + 26, bw, bh); }
    const area = SCENE_W - left - 64;
    const gaps = I.has('inconsistent-spacing') ? [8, 40, 20] : [20, 20, 20];
    const tw = (area - gaps.reduce((a, b) => a + b, 0)) / 4;
    const mis = I.has('misalignment') ? rng.int(1, 3) : -1;
    const kpi = [['Revenue', '$48.2k'], ['Active users', '3,914'], ['Churn', '2.1%'], ['NPS', '61']];
    const clutter = ['#fde68a', '#bfdbfe', '#fecaca', '#bbf7d0'];
    let x = left + 32;
    kpi.forEach(([k, v], i) => {
      const dy = i === mis ? 14 : 0;
      c.box(x, top + 84 + dy, tw, 96, I.has('clutter') ? clutter[i] : '#ffffff', { r: 10, stroke: '#e3e5ea' });
      const ts = cardTitleStyle(I, i);
      c.text(x + 16, top + 112 + dy, k, { size: 13, fill: I.has('low-contrast') ? '#d6d8dd' : '#6b6f78', font: ts.font });
      c.text(x + 16, top + 152 + dy, v, { size: I.has('typography-mix') ? ts.size + 6 : 28, weight: 800, font: ts.font });
      c.el('card', x, top + 84 + dy, tw, 96);
      x += tw + (gaps[i] ?? 0);
    });
    c.box(left + 32, top + 200, area * 0.62, 250, '#ffffff', { r: 10, stroke: '#e3e5ea' });
    const pts = Array.from({ length: 12 }, (_, i) => `${left + 52 + i * (area * 0.62 - 40) / 11},${top + 410 - (40 + ((i * 37) % 120) + i * 8)}`).join(' ');
    c.parts.push(`<polyline points="${pts}" fill="none" stroke="${I.has('clutter') ? '#e2483b' : accent}" stroke-width="3"/>`);
    c.el('chart', left + 32, top + 200, area * 0.62, 250);
    const tx = left + 52 + area * 0.62;
    c.box(tx, top + 200, area * 0.38 - 20, 250, '#ffffff', { r: 10, stroke: '#e3e5ea' });
    for (let r = 0; r < 6; r++) { c.lines(tx + 16, top + 226 + r * 36, area * 0.38 - 60, 1, { fill: I.has('low-contrast') ? '#ececf0' : '#a0a3ab' }); c.box(tx + 16, top + 244 + r * 36, area * 0.38 - 52, 1, '#eeeef2'); }
    c.el('table', tx, top + 200, area * 0.38 - 20, 250);
    const focal = I.has('weak-hierarchy') ? [{ cell: 4, credit: 1 }, { cell: 1, credit: 0.75 }, { cell: 2, credit: 0.5 }] : [{ cell: 1, credit: 1 }, { cell: 4, credit: 0.75 }, { cell: 0, credit: 0.5 }];
    return { pageType: 'analytics dashboard', navType, dominant: I.has('weak-hierarchy') ? 'cards' : 'cards', focal };
  },
  product(c, rng, I, [accentName, accent], name) {
    c.box(0, 0, SCENE_W, SCENE_H, '#ffffff');
    const navType = nav(c, rng, I, accent, name);
    c.image(40, 90, 420, 360, false, rng.pick(['#e8c9a8', '#b8d0c0', '#c8c0e6']));
    c.el('product image', 40, 90, 420, 360);
    for (let i = 0; i < 4; i++) c.image(40 + i * 108, 466, 96, 72, false, '#e5e5ea');
    const product = rng.pick(['Linen Field Jacket', 'Ceramic Pour-over Set', 'Trail Day Pack 22L', 'Oak Desk Organiser']);
    const tSize = I.has('weak-hierarchy') ? 15 : 34;
    c.text(500, 140, product, { size: tSize, weight: I.has('weak-hierarchy') ? 400 : 800 });
    c.el('headline', 500, 140 - tSize, 400, tSize);
    c.text(500, 186, rng.pick(['$128', '$64', '$89', '$42']), { size: I.has('typography-mix') ? 30 : 24, weight: 700, font: I.has('typography-mix') ? 'Georgia, serif' : SANS });
    const pf = I.has('low-contrast') ? '#d4d4d9' : '#55565c';
    c.text(500, 222, 'Made in small batches from natural materials.', { size: 15, fill: pf, font: I.has('typography-mix') ? 'Courier New, monospace' : SANS });
    c.text(500, 244, 'Free returns within 30 days.', { size: 15, fill: pf });
    ['S', 'M', 'L', 'XL'].forEach((s, i) => { const sz = I.has('small-targets') ? 22 : 44; c.box(500 + i * (sz + 10), 270, sz, sz, '#fff', { r: 6, stroke: '#c7c7cc' }); c.text(500 + i * (sz + 10) + sz / 2, 270 + sz / 2 + 5, s, { size: I.has('small-targets') ? 9 : 14, anchor: 'middle' }); });
    const bw = I.has('small-targets') ? 110 : 200; const bh = I.has('small-targets') ? 26 : 48;
    const gap = I.has('inconsistent-spacing') ? 6 : 16;
    const bx = I.has('misalignment') ? 512 : 500;
    c.button(bx, 340, bw, bh, 'Add to bag', { fill: accent, size: I.has('small-targets') ? 11 : 16, r: I.has('inconsistent-buttons') ? 24 : 8 });
    c.el('primary button', bx, 340, bw, bh);
    if (I.has('competing-cta')) { c.button(500 + bw + gap, 340, bw, bh, 'Buy now', { fill: '#e2483b', size: I.has('small-targets') ? 11 : 16, r: I.has('inconsistent-buttons') ? 0 : 8 }); c.el('competing button', 500 + bw + gap, 340, bw, bh); }
    else c.button(500 + bw + gap, 340, bw, bh, 'Save', { fill: '#3a3a3c', outline: true, size: I.has('small-targets') ? 11 : 16, r: I.has('inconsistent-buttons') ? 0 : 8 });
    const rv = I.has('clutter') ? ['#fde68a', '#bfdbfe', '#fecaca'] : ['#f6f6f8', '#f6f6f8', '#f6f6f8'];
    const gaps2 = I.has('inconsistent-spacing') ? [8, 30] : [16, 16];
    let y = 420;
    for (let i = 0; i < 3; i++) { c.box(500, y, 420, 40, rv[i], { r: 8 }); c.lines(516, y + 16, 300, 1, { fill: I.has('low-contrast') ? '#e8e8ec' : '#a0a3ab' }); c.el('review', 500, y, 420, 40); y += 40 + (gaps2[i] ?? 0); }
    const focal = I.has('weak-hierarchy') ? [{ cell: 3, credit: 1 }, { cell: 0, credit: 1 }, { cell: 4, credit: 0.5 }] : [{ cell: 3, credit: 1 }, { cell: 0, credit: 0.75 }, { cell: 1, credit: 0.75 }, { cell: 2, credit: 0.5 }];
    return { pageType: 'product page', navType, dominant: 'image', focal };
  },
  article(c, rng, I, [accentName, accent], name) {
    c.box(0, 0, SCENE_W, SCENE_H, '#fbfaf7');
    const navType = nav(c, rng, I, accent, name);
    const overImage = I.has('text-over-image');
    const head = rng.pick(['The slow return of night trains', 'What the river remembers', 'Inside the quiet city of glass', 'Notes from a winter garden']);
    const tSize = I.has('weak-hierarchy') ? 16 : 38;
    if (overImage) c.image(40, 84, 880, 210, true);
    c.text(60, overImage ? 180 : 130, head, { size: tSize, weight: I.has('weak-hierarchy') ? 400 : 800, font: I.has('typography-mix') ? 'Courier New, monospace' : 'Georgia, serif', fill: overImage ? '#ffffff' : '#141414' });
    c.el('headline', 60, (overImage ? 180 : 130) - tSize, 700, tSize);
    c.text(60, overImage ? 214 : 162, `By ${rng.pick(['A. Morel', 'J. Okafor', 'L. Haldane', 'S. Ivers'])} · ${rng.int(4, 12)} min read`, { size: I.has('small-targets') ? 9 : 13, fill: I.has('low-contrast') ? '#dadad6' : '#6b6b66' });
    if (!overImage) { c.image(60, 186, 560, 160, false, '#c9d6c3'); c.el('hero image', 60, 186, 560, 160); }
    const bodyY = overImage ? 320 : 370;
    const mis = I.has('misalignment');
    const gap = I.has('inconsistent-spacing') ? [12, 34] : [22, 22];
    let y = bodyY;
    for (let p = 0; p < 3; p++) { c.lines(60 + (mis && p === 1 ? 14 : 0), y, 540, 4, { fill: I.has('low-contrast') ? '#e7e6e2' : '#8f8f8a', gap: 13 }); y += 52 + (gap[p] ?? 0); }
    c.el('body text', 60, bodyY, 540, y - bodyY);
    c.text(660, bodyY + 4, 'Related', { size: 15, weight: 700, font: I.has('typography-mix') ? 'Georgia, serif' : SANS });
    const cl = I.has('clutter') ? ['#e2483b', '#f2b33a', '#2e9d63', '#6d3fd6'] : [accent, accent, accent, accent];
    for (let i = 0; i < 4; i++) { c.box(660, bodyY + 22 + i * 46, 6, 30, cl[i], { r: 2 }); c.lines(676, bodyY + 30 + i * 46, 220, 2, { fill: '#a7a7a2', gap: 12 }); }
    c.el('sidebar', 660, bodyY - 10, 260, 210);
    const focal = I.has('weak-hierarchy') ? [{ cell: overImage ? 1 : 4, credit: 1 }, { cell: 0, credit: 0.5 }, { cell: 1, credit: 0.75 }] : [{ cell: 0, credit: 1 }, { cell: 1, credit: 0.75 }, { cell: 3, credit: 0.5 }];
    return { pageType: 'editorial article', navType, dominant: overImage || I.has('weak-hierarchy') ? 'image' : 'headline', focal };
  },
};

export const UI_LAYOUTS = Object.keys(LAYOUTS);

export function generateInterface(rng, layout = rng.pick(UI_LAYOUTS)) {
  const applicable = LAYOUT_ISSUES[layout];
  const nIssues = rng.int(2, 3);
  let issues = rng.sample(applicable, nIssues);
  // hidden-nav and small-targets can mask each other on the nav; keep both but they are compatible.
  const I = new Set(issues);
  const c = new Canvas();
  const accent = rng.pick(ACCENTS);
  const name = rng.pick(NAMES);
  const meta = LAYOUTS[layout](c, rng, I, accent, name);
  issues = [...I];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W}" height="${SCENE_H}">${c.parts.join('')}</svg>`;
  return {
    svg,
    ui: {
      layout, pageType: meta.pageType, navType: meta.navType, dominant: meta.dominant, focalCells: meta.focal,
      issues, absentIssues: applicable.filter((k) => !I.has(k)), brand: name, accent: accent[0], elements: c.elements,
    },
  };
}
