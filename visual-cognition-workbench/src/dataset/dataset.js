// Dataset management: deterministic catalog of procedurally generated
// stimuli (separate training and assessment pools), annotation assembly,
// optional external (photographic) stimuli, and balanced selection without
// repetition.
import { Rng, hashString } from '../core/rng.js';
import { SceneBuilder, SCENE_W, SCENE_H, cellOf } from './scene.js';
import { LIGHTING, COLORS } from './palette.js';
import { INDOOR_TEMPLATES } from './templates/indoor.js';
import { OUTDOOR_TEMPLATES } from './templates/outdoor.js';
import { STRUCTURE_TEMPLATES } from './templates/structures.js';
import { generateInterface } from './ui-generator.js';
import { CONCEPTS } from '../scoring/lexicon.js';

export const DATASET_VERSION = '1.0.0';

export const CATEGORIES = {
  domestic: 'Domestic environments',
  urban: 'Urban environments',
  nature: 'Nature',
  human: 'Human interactions',
  architecture: 'Architecture',
  transportation: 'Transportation',
  objects: 'Objects & still life',
  photography: 'Photography',
  'graphic-design': 'Graphic design',
  interface: 'Website interfaces',
};

export const TEMPLATES = [...INDOOR_TEMPLATES, ...OUTDOOR_TEMPLATES, ...STRUCTURE_TEMPLATES];
const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
export const INTERFACE_TEMPLATE = { id: 'interface', category: 'interface', setting: 'website / app interface' };

/** Variants generated per template, per pool. Pools never share seeds. */
export const POOL_SIZES = { assessment: 30, training: 5 };
const INTERFACE_POOL = { assessment: 80, training: 8 };

export function catalog(pool = 'assessment') {
  const entries = [];
  for (const t of TEMPLATES) {
    for (let i = 0; i < POOL_SIZES[pool]; i++) entries.push(entryFor(pool, t.id, t.category, i));
  }
  for (let i = 0; i < INTERFACE_POOL[pool]; i++) entries.push(entryFor(pool, 'interface', 'interface', i));
  return entries.concat(externalEntries.filter((e) => e.pool === pool));
}

function entryFor(pool, template, category, index) {
  const prefix = pool === 'training' ? 'T' : 'A';
  return { id: `${prefix}-${template}-${String(index).padStart(3, '0')}`, pool, template, category, index, source: 'procedural' };
}

export function parseId(id) {
  const m = /^([AT])-(.+)-(\d{3})$/.exec(id);
  if (!m) return null;
  return { pool: m[1] === 'T' ? 'training' : 'assessment', template: m[2], index: Number(m[3]) };
}

const cache = new Map();

/** Generate (memoized) the stimulus for a catalog entry: { svg | src, annotation }. */
export function generate(entryOrId) {
  const entry = typeof entryOrId === 'string' ? lookup(entryOrId) : entryOrId;
  if (!entry) throw new Error(`Unknown stimulus ${entryOrId}`);
  if (cache.has(entry.id)) return cache.get(entry.id);
  let out;
  if (entry.source === 'external') out = { src: entry.src, annotation: entry.annotation };
  else if (entry.template === 'interface') out = buildInterface(entry);
  else out = buildScene(entry);
  cache.set(entry.id, out);
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  return out;
}

function lookup(id) {
  const ext = externalEntries.find((e) => e.id === id);
  if (ext) return ext;
  const p = parseId(id);
  if (!p) return null;
  const category = p.template === 'interface' ? 'interface' : TEMPLATE_BY_ID[p.template]?.category;
  if (!category) return null;
  return entryFor(p.pool, p.template, category, p.index);
}

function seedFor(entry) { return hashString(`${DATASET_VERSION}:${entry.pool}:${entry.template}:${entry.index}`); }

function buildScene(entry) {
  const t = TEMPLATE_BY_ID[entry.template];
  const rng = new Rng(seedFor(entry));
  const lightingKey = rng.pick(t.lightings);
  const S = new SceneBuilder(rng.fork('scene'), lightingKey);
  const N = t.build(S, rng.fork('build'), lightingKey);
  const svg = S.render({ vignette: entry.category !== 'graphic-design' });
  const L = LIGHTING[lightingKey];
  const instances = S.annotateObjects();
  const objects = [...new Set([...instances.map((o) => o.type), ...(N.extraObjects || [])])].filter((k) => CONCEPTS[k]);
  const people = instances.filter((o) => o.type === 'person' || o.type === 'child').length;
  const animals = instances.filter((o) => o.animate === 'animal').length;
  const byType = {};
  instances.forEach((o) => { byType[o.type] = (byType[o.type] || 0) + 1; });
  const focalObj = instances.find((o) => o.id === N.focalId);
  const isDesign = entry.category === 'graphic-design';
  const annotation = {
    id: entry.id, pool: entry.pool, source: 'procedural', category: entry.category, template: t.id,
    setting: N.setting || t.setting, indoor: !!t.indoor, width: SCENE_W, height: SCENE_H,
    objects, instances,
    counts: { people: N.countsOverride?.people ?? people, animals, byType },
    atmosphere: N.atmosphere, atmosphereContra: N.contra,
    lighting: isDesign ? 'flat graphic (no scene lighting)' : L.label, lightingKey: isDesign ? null : lightingKey,
    timeOfDay: isDesign ? null : L.time, lightQuality: isDesign ? null : L.quality,
    colorTemperature: isDesign ? designTemperature(instances) : L.temperature,
    relationships: N.relationships.map((r) => r.text), relationsStructured: N.relationships,
    context: N.context,
    narrative: { happening: N.happening, before: N.before, after: N.after, circumstances: N.circumstances },
    statements: N.statements,
    composition: N.composition,
    focal: focalObj ? { objectId: focalObj.id, type: focalObj.type, cell: focalObj.cell } : { objectId: null, type: null, cell: N.focalCell ?? 4 },
    weather: N.weather, designLanguage: N.designLanguage || null, technique: N.technique || null,
    dominantColors: dominantColors(instances),
  };
  return { svg, annotation };
}

function designTemperature(instances) {
  const warm = instances.filter((o) => COLORS[o.color]?.family === 'warm').length;
  const cool = instances.filter((o) => COLORS[o.color]?.family === 'cool').length;
  return Math.max(1, Math.min(7, 4 + Math.round((warm - cool) * 1.0)));
}

function dominantColors(instances) {
  const area = {};
  instances.filter((o) => o.colorReliable && o.color && !o.region).forEach((o) => { area[o.color] = (area[o.color] || 0) + o.area; });
  return Object.entries(area).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
}

function buildInterface(entry) {
  const rng = new Rng(seedFor(entry));
  const { svg, ui } = generateInterface(rng);
  const annotation = {
    id: entry.id, pool: entry.pool, source: 'procedural', category: 'interface', template: 'interface',
    setting: ui.pageType, indoor: null, width: SCENE_W, height: SCENE_H,
    objects: [], instances: ui.elements.map((e, i) => ({ id: `u${i + 1}`, type: e.kind, label: e.kind, box: e.box, cell: e.cell, salience: 'secondary' })),
    counts: {}, atmosphere: [], atmosphereContra: [], lighting: null, lightingKey: null, colorTemperature: null,
    relationships: [], relationsStructured: [], context: `${ui.pageType} for the fictitious brand "${ui.brand}"`,
    narrative: null, statements: [], composition: null,
    focal: { objectId: null, cell: ui.focalCells[0].cell, cells: ui.focalCells },
    ui,
  };
  return { svg, annotation };
}

// ---------------------------------------------------------------- external
let externalEntries = [];

/**
 * Load external stimuli (e.g. licensed photographs) from a manifest:
 * { "images": [ { "id", "src", "pool", "category", "annotation": {...} } ] }
 * Annotations follow the same schema as procedural stimuli; any missing
 * fields simply disable the questions that need them.
 */
export async function loadExternalManifest(url = 'data/external/manifest.json') {
  if (globalThis.location?.protocol === 'file:') return 0; // standalone file: no manifest to fetch
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return 0;
    const json = await res.json();
    externalEntries = (json.images || []).filter((im) => im.id && im.src && im.annotation).map((im) => ({
      id: `X-${im.id}`, pool: im.pool === 'training' ? 'training' : 'assessment', template: `external:${im.category || 'other'}`,
      category: im.category || 'photography', source: 'external', src: new URL(im.src, new URL(url, location.href)).href,
      annotation: normalizeExternal(im),
    }));
    return externalEntries.length;
  } catch { return 0; }
}

function normalizeExternal(im) {
  const a = im.annotation;
  const instances = (a.instances || []).map((o, i) => ({ id: o.id || `x${i + 1}`, ...o, cell: o.cell ?? (o.box ? cellOf(o.box.x + o.box.w / 2, o.box.y + o.box.h / 2, a.width || SCENE_W, a.height || SCENE_H).index : null) }));
  return {
    id: `X-${im.id}`, pool: im.pool || 'assessment', source: 'external', category: im.category || 'photography', template: `external:${im.category || 'other'}`,
    setting: a.setting || a.context || null, width: a.width || SCENE_W, height: a.height || SCENE_H,
    objects: a.objects || [], instances, counts: a.counts || {}, atmosphere: a.atmosphere || [], atmosphereContra: a.atmosphereContra || [],
    lighting: a.lighting || null, lightingKey: a.lightingKey || null, timeOfDay: a.timeOfDay || null, colorTemperature: a.colorTemperature ?? null,
    relationships: a.relationships || [], relationsStructured: a.relationsStructured || [], context: a.context || '',
    narrative: a.narrative || null, statements: a.statements || [], composition: a.composition || null, focal: a.focal || null,
    weather: a.weather || null, designLanguage: a.designLanguage || null, dominantColors: a.dominantColors || [], ui: a.ui || null,
  };
}

export function setExternalEntries(list) { externalEntries = list; }

// ---------------------------------------------------------------- selection
/**
 * Draw `n` distinct stimuli from `pool`, balanced across the allowed
 * categories and spread across templates so near-duplicate layouts are not
 * shown back-to-back. `exclude` is a Set of ids already seen.
 */
export function selectStimuli({ pool = 'assessment', categories, n, rng, exclude = new Set() }) {
  const all = catalog(pool).filter((e) => categories.includes(e.category) && !exclude.has(e.id));
  const byCat = new Map();
  for (const e of all) { if (!byCat.has(e.category)) byCat.set(e.category, []); byCat.get(e.category).push(e); }
  const cats = rng.shuffle([...byCat.keys()]);
  const usedTemplates = new Map();
  const out = [];
  let guard = 0;
  while (out.length < n && cats.length && guard++ < n * 20) {
    const cat = cats[out.length % cats.length];
    const pool2 = byCat.get(cat).filter((e) => !out.includes(e));
    if (!pool2.length) { cats.splice(cats.indexOf(cat), 1); continue; }
    // prefer the least-used template in this category
    const minUse = Math.min(...pool2.map((e) => usedTemplates.get(e.template) || 0));
    const candidates = pool2.filter((e) => (usedTemplates.get(e.template) || 0) === minUse);
    const pick = rng.pick(candidates);
    usedTemplates.set(pick.template, (usedTemplates.get(pick.template) || 0) + 1);
    out.push(pick);
  }
  // avoid identical templates on consecutive trials where possible
  const ordered = rng.shuffle(out);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].template === ordered[i - 1].template) {
      const j = ordered.findIndex((e, k) => k > i && e.template !== ordered[i - 1].template && (!ordered[i + 1] || e.template !== ordered[i + 1].template));
      if (j > 0) [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  }
  return ordered;
}

export function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
