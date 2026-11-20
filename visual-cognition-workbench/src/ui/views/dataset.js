// Dataset browser for researchers. Viewing assessment images spoils them for
// participants, so the training pool is shown by default.
import { h, clear } from '../dom.js';
import { catalog, generate, svgToDataUrl, CATEGORIES, DATASET_VERSION, TEMPLATES } from '../../dataset/dataset.js';
import { download } from '../../analytics/export.js';

export function datasetView(root) {
  const page = h('div', { class: 'page' });
  root.append(page);
  let pool = 'training'; let category = 'all'; let limit = 60;
  const grid = h('div', { class: 'thumbs' });
  const countEl = h('span', { class: 'muted small' });
  const warn = h('div', { class: 'notice warn', style: { marginBottom: '16px' }, hidden: true }, h('strong', {}, 'Assessment pool. '), 'Do not let participants see these images — they are used for scored trials. Browsing here does not mark images as seen.');

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { const img = e.target; img.src = svgToDataUrl(generate(img.dataset.id).svg); io.unobserve(img); }
  }, { rootMargin: '200px' }) : null;

  const render = () => {
    clear(grid);
    warn.hidden = pool !== 'assessment';
    const all = catalog(pool).filter((e) => category === 'all' || e.category === category);
    countEl.textContent = `${all.length} stimuli`;
    all.slice(0, limit).forEach((e) => {
      const img = h('img', { alt: e.id, 'data-id': e.id, width: 320, height: 200 });
      if (e.source === 'external') img.src = e.src; else if (io) io.observe(img); else img.src = svgToDataUrl(generate(e).svg);
      grid.append(h('button', { class: 'thumb', type: 'button', onclick: () => open(e) }, img, h('div', { class: 'cap' }, h('span', { class: 'mono' }, e.id), h('span', {}, CATEGORIES[e.category]))));
    });
    if (all.length > limit) grid.append(h('button', { class: 'btn', type: 'button', style: { gridColumn: '1 / -1' }, onclick: () => { limit += 60; render(); } }, `Show more (${all.length - limit} remaining)`));
  };

  function open(e) {
    const g = generate(e);
    const close = () => m.remove();
    const m = h('div', { class: 'modal', onclick: (ev) => { if (ev.target === m) close(); } }, h('div', { class: 'modal-card' },
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } }, h('h2', { class: 'mono', style: { fontSize: '16px' } }, e.id), h('button', { class: 'btn sm', type: 'button', onclick: close }, 'Close')),
      h('div', { class: 'grid cols-2' }, h('img', { src: g.svg ? svgToDataUrl(g.svg) : g.src, alt: e.id }), h('pre', { class: 'json' }, JSON.stringify(g.annotation, (k, v) => (k === 'instances' ? v.map((o) => `${o.id} ${o.type} ${o.color || ''} cell ${o.cell} ${o.salience}`) : v), 2)))));
    document.body.append(m);
    const onKey = (ev) => { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  const filters = h('div', { class: 'row', style: { marginBottom: '16px' } },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Pool' }, ['training', 'assessment'].map((p) => h('button', { type: 'button', 'aria-pressed': String(p === pool), onclick: (ev) => { pool = p; limit = 60; [...ev.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === ev.target))); render(); } }, p === 'training' ? 'Training pool' : 'Assessment pool'))),
    (() => { const s = h('select', { style: { width: 'auto' }, 'aria-label': 'Category' }, h('option', { value: 'all' }, 'All categories'), Object.entries(CATEGORIES).map(([k, v]) => h('option', { value: k }, v))); s.addEventListener('change', () => { category = s.value; limit = 60; render(); }); return s; })(),
    countEl);

  page.append(
    h('div', { class: 'page-head' },
      h('div', {}, h('div', { class: 'eyebrow' }, `Dataset v${DATASET_VERSION}`), h('h1', {}, 'Stimulus dataset'),
        h('p', {}, `${TEMPLATES.length} procedural scene templates plus a synthetic interface generator, across ${Object.keys(CATEGORIES).length} categories. Every stimulus is generated deterministically from its id, and its ground-truth annotation is derived from the same object list that draws it. Training and assessment pools use disjoint seeds.`)),
      h('button', { class: 'btn sm', type: 'button', onclick: () => download(`vcw_dataset_${DATASET_VERSION}_manifest.json`, JSON.stringify({ version: DATASET_VERSION, pools: { training: catalog('training').map((e) => generate(e).annotation), assessment: catalog('assessment').map((e) => generate(e).annotation) } })) }, 'Download annotations')),
    warn, filters, grid);
  render();
}
