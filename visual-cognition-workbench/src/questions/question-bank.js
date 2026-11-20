// Question generation from ground-truth annotations.
//
// Every question carries:
//   dimension  — which cognitive dimension it scores
//   subscale   — finer metric (e.g. "spatial", "secondary-detail")
//   epistemic  — 'observable' (objectively verifiable), 'inferential'
//                (requires contextual interpretation) or 'subjective'
//                (scored as agreement with a reference, never as accuracy)
//   stage      — 0 = free recall (always asked first, before any cue),
//                1 = recognition / judgement (order randomised)
//   truth      — what the scorer needs; never shown before the session ends
import { CONCEPTS, labelOf, sameGroup } from '../scoring/lexicon.js';
import { COLOR_NAMES, COLORS, LIGHTING } from '../dataset/palette.js';
import { ATMOSPHERE_VOCAB, DESIGN_LANGUAGES } from '../dataset/templates/common.js';
import { TEMPLATES } from '../dataset/dataset.js';
import { UI_ISSUES } from '../dataset/ui-generator.js';
import { GRID_COLS } from '../dataset/scene.js';

let qCounter = 0;
const qid = () => `q${++qCounter}`;
const the = (k) => `the ${labelOf(k)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function opts(list) { return list.map((o, i) => ({ id: `o${i}`, ...o })); }

/** Concepts that would be confusable with something present (shared synonyms). */
function overlapsPresent(key, present) {
  const syn = new Set(CONCEPTS[key]?.syn || []);
  return [...present].some((p) => p === key || (CONCEPTS[p]?.syn || []).some((s) => syn.has(s)) || (CONCEPTS[p]?.hyper || []).includes(key) || (CONCEPTS[key]?.hyper || []).includes(p));
}

/** Plausible absent distractors, preferring the same semantic groups as targets. */
function distractors(targets, present, n, rng) {
  const pool = new Set();
  targets.forEach((t) => sameGroup(t).forEach((k) => pool.add(k)));
  let cands = rng.shuffle([...pool].filter((k) => !overlapsPresent(k, present) && CONCEPTS[k].group !== 'shape'));
  if (cands.length < n) {
    const extra = rng.shuffle(Object.keys(CONCEPTS).filter((k) => !pool.has(k) && !overlapsPresent(k, present) && !['shape', 'street'].includes(CONCEPTS[k].group) && !['road', 'sidewalk', 'grass', 'path'].includes(k)));
    cands = cands.concat(extra);
  }
  return cands.slice(0, n);
}

/** Instances that can be referred to unambiguously (unique type, real geometry). */
function referable(ann, { minArea = 0.003, needColor = false, foreground = false } = {}) {
  const counts = ann.counts?.byType || {};
  return (ann.instances || []).filter((o) => !o.region && o.box && (counts[o.type] ?? 1) === 1 && o.area >= minArea && CONCEPTS[o.type] && (!needColor || o.colorReliable)
    && (!foreground || (o.salience !== 'background' && o.area < 0.2)));
}

function colorOptions(truth, rng, n = 5) {
  const others = rng.shuffle(COLOR_NAMES.filter((c) => c !== truth));
  const picked = [truth, ...others.slice(0, n - 1)];
  return opts(rng.shuffle(picked).map((c) => ({ label: cap(c), value: c, swatch: COLORS[c].hex })));
}

function multiQuestion({ targets, foils, prompt, ...rest }, rng) {
  return {
    type: 'multi', prompt, ...rest,
    options: opts(rng.shuffle([...targets.map((k) => ({ label: cap(labelOf(k)), value: k, target: true })), ...foils.map((k) => ({ label: cap(labelOf(k)), value: k, target: false }))])),
  };
}

function mcqFromCredits(prompt, list, rng, extra = {}) {
  return { type: 'mcq', prompt, options: opts(rng.shuffle(list.map((x) => ({ label: x.text, value: x.text, credit: x.credit })))), ...extra };
}

// ------------------------------------------------------------ Module A
function recognition(ann, rng) {
  const qs = [];
  const present = new Set(ann.objects);
  const isDesign = ann.category === 'graphic-design';
  qs.push({ key: 'A.describe', type: 'text', stage: 0, dimension: 'recognition', subscale: 'free-recall', epistemic: 'observable', detail: 'primary',
    prompt: 'Describe everything you saw: objects, people or animals, the setting, colours and light.', placeholder: 'e.g. a small boat on a lake, mountains behind…', truth: { mode: 'objects' } });

  const primaries = [...new Set((ann.instances || []).filter((o) => o.salience === 'primary').map((o) => o.type))].filter((k) => CONCEPTS[k]);
  if (primaries.length) {
    const targets = rng.sample(primaries, Math.min(3, primaries.length));
    qs.push({ key: 'A.mainObjects', dimension: 'recognition', subscale: 'main-objects', epistemic: 'observable', detail: 'primary', stage: 1,
      ...multiQuestion({ targets, foils: distractors(targets, present, 7 - targets.length, rng), prompt: 'Which of these were main elements of the image? Select all that apply.' }, rng) });
  }
  const secondaries = [...new Set((ann.instances || []).filter((o) => o.salience === 'secondary').map((o) => o.type))].filter((k) => CONCEPTS[k] && !primaries.includes(k));
  if (secondaries.length >= 2) {
    const targets = rng.sample(secondaries, Math.min(3, secondaries.length));
    qs.push({ key: 'A.secondary', dimension: 'recognition', subscale: 'secondary-detail', epistemic: 'observable', detail: 'secondary', stage: 1,
      ...multiQuestion({ targets, foils: distractors(targets, present, 7 - targets.length, rng), prompt: 'Which of these smaller or background details were present? Select all that apply.' }, rng) });
  }
  if (!isDesign && ann.counts) {
    const people = ann.counts.people ?? 0; const animals = ann.counts.animals ?? 0;
    const askAnimals = animals > 0 && (people === 0 || rng.bool());
    qs.push({ key: 'A.count', type: 'count', stage: 1, dimension: 'recognition', subscale: 'enumeration', epistemic: 'observable', detail: 'primary',
      prompt: askAnimals ? 'How many animals (including birds) were in the image?' : 'How many people were in the image?', truth: { value: askAnimals ? animals : people }, max: 20 });
  } else if (isDesign) {
    const shapes = (ann.instances || []).filter((o) => o.type.startsWith('shape') && o.type !== 'shapeLine' || o.type === 'shapeLine' && o.salience === 'primary').length;
    qs.push({ key: 'A.count', type: 'count', stage: 1, dimension: 'recognition', subscale: 'enumeration', epistemic: 'observable', detail: 'primary', prompt: 'How many distinct graphic shapes were in the composition (ignore text)?', truth: { value: shapes }, max: 20 });
  }
  if (ann.setting) {
    const others = rng.sample([...new Set(TEMPLATES.filter((t) => t.category !== ann.category && t.setting !== ann.setting).map((t) => t.setting))], 3);
    qs.push({ key: 'A.setting', type: 'mcq', stage: 1, dimension: 'recognition', subscale: 'environment', epistemic: 'observable', detail: 'primary', prompt: 'What kind of environment was shown?',
      options: opts(rng.shuffle([{ label: cap(ann.setting), credit: 1 }, ...others.map((s) => ({ label: cap(s), credit: 0 }))])) });
  }
  if (ann.lightingKey) {
    const others = rng.sample(Object.keys(LIGHTING).filter((k) => k !== ann.lightingKey && LIGHTING[k].label !== ann.lighting), 3);
    const near = { dawn: ['sunset'], sunset: ['dawn', 'lamplight'], bluehour: ['night'], night: ['bluehour', 'lamplight'], lamplight: ['night', 'sunset'], midday: ['overcast'], overcast: ['midday'] };
    qs.push({ key: 'A.lighting', type: 'mcq', stage: 1, dimension: 'recognition', subscale: 'lighting', epistemic: 'observable', detail: 'primary', prompt: 'How was the scene lit?',
      options: opts(rng.shuffle([{ label: cap(ann.lighting), credit: 1 }, ...others.map((k) => ({ label: cap(LIGHTING[k].label), credit: (near[ann.lightingKey] || []).includes(k) ? 0.25 : 0 }))])) });
  }
  const colorable = referable(ann, { needColor: true, minArea: 0.006 });
  const prim = colorable.filter((o) => o.salience === 'primary');
  const target = (prim.length ? rng.pick(prim) : colorable.length ? rng.pick(colorable) : null);
  if (target) {
    qs.push({ key: 'A.color', type: 'mcq', stage: 1, dimension: 'recognition', subscale: 'color', epistemic: 'observable', detail: target.salience === 'primary' ? 'primary' : 'secondary',
      prompt: `What colour was ${the(target.type)}?`, options: colorOptions(target.color, rng), truth: { color: target.color, objectId: target.id }, colorScored: true });
  }
  return qs;
}

// ------------------------------------------------------------ Module B
function spatialPairs(ann, rng) {
  const objs = referable(ann, { minArea: 0.004, foreground: true });
  const pairs = [];
  for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
    const a = objs[i]; const b = objs[j];
    const dx = a.center.x - b.center.x; const dy = a.center.y - b.center.y;
    const gapX = Math.abs(dx) - (a.box.w + b.box.w) / 4;
    if (gapX > 60 && Math.abs(dx) > 130) pairs.push({ a, b, axis: 'x', aIs: dx < 0 ? 'left' : 'right' });
    else if (Math.abs(dy) > 140 && Math.abs(dx) < 220) pairs.push({ a, b, axis: 'y', aIs: dy < 0 ? 'above' : 'below' });
  }
  return rng.shuffle(pairs);
}

const OPP = { left: 'right', right: 'left', above: 'below', below: 'above' };
const relPhrase = (p, rel) => `${cap(the(p.a.type))} was ${rel === 'left' ? 'to the left of' : rel === 'right' ? 'to the right of' : rel === 'above' ? 'above' : 'below'} ${the(p.b.type)}.`;

function context(ann, rng) {
  const N = ann.narrative;
  if (!N) return [];
  const qs = [];
  qs.push({ key: 'B.describe', type: 'text', stage: 0, dimension: 'context', subscale: 'gist-free', epistemic: 'inferential', detail: 'primary',
    prompt: 'In one or two sentences: what was happening in this scene?', placeholder: 'Describe the situation, not just the objects…', truth: { mode: 'interpretation', accepted: N.happening.accepted, reference: N.happening.answer } });
  qs.push({ key: 'B.happening', dimension: 'context', subscale: 'gist', epistemic: 'inferential', detail: 'primary', stage: 1,
    ...mcqFromCredits('Which description best fits what was happening?', [{ text: N.happening.answer, credit: 1 }, ...N.happening.foils], rng) });
  qs.push({ key: 'B.before', dimension: 'context', subscale: 'before', epistemic: 'inferential', detail: 'primary', stage: 1,
    ...mcqFromCredits('What most plausibly happened just before this moment?', N.before, rng), note: 'Several answers can be reasonable; plausible alternatives receive partial credit.' });
  qs.push({ key: 'B.after', dimension: 'context', subscale: 'after', epistemic: 'inferential', detail: 'primary', stage: 1,
    ...mcqFromCredits('What is most likely to happen next?', N.after, rng), note: 'Several answers can be reasonable; plausible alternatives receive partial credit.' });
  if (N.circumstances?.length) qs.push({ key: 'B.circumstances', dimension: 'context', subscale: 'circumstances', epistemic: 'inferential', detail: 'primary', stage: 1,
    ...mcqFromCredits('What are the most probable circumstances?', N.circumstances, rng) });

  // relational judgements: template relations (true) + computed spatial relations (one true, one inverted)
  const items = [];
  rng.sample(ann.relationships || [], 2).forEach((t) => items.push({ text: `${cap(t)}.`, answer: 'true', source: 'annotated relation' }));
  const pairs = spatialPairs(ann, rng);
  if (pairs[0]) items.push({ text: relPhrase(pairs[0], pairs[0].aIs), answer: 'true', source: 'computed geometry' });
  if (pairs[1]) items.push({ text: relPhrase(pairs[1], OPP[pairs[1].aIs]), answer: 'false', source: 'computed geometry' });
  else if (pairs[0]) items.push({ text: relPhrase({ a: pairs[0].b, b: pairs[0].a }, pairs[0].aIs), answer: 'false', source: 'computed geometry' });
  if (items.length >= 2) {
    qs.push({ key: 'B.relations', type: 'judgments', stage: 1, dimension: 'relational', subscale: 'relations', epistemic: 'observable', detail: 'primary',
      prompt: 'Were these statements about relationships between elements true or false?', columns: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }],
      items: rng.shuffle(items).map((it, i) => ({ id: `i${i}`, ...it })) });
  }
  if (ann.statements?.length >= 3) {
    const byCls = (c) => ann.statements.filter((s) => s.cls === c);
    const chosen = [...rng.sample(byCls('observable'), 1), ...rng.sample(byCls('inference'), 1), ...rng.sample(byCls('speculation'), 1)];
    const rest = rng.shuffle(ann.statements.filter((s) => !chosen.includes(s)));
    if (rest.length) chosen.push(rest[0]);
    qs.push({ key: 'B.classify', type: 'judgments', stage: 1, dimension: 'context', subscale: 'fact-vs-interpretation', epistemic: 'inferential', detail: 'primary',
      prompt: 'For each statement, is it directly visible, a reasonable inference, or speculation?', columns: [{ id: 'observable', label: 'Directly visible' }, { id: 'inference', label: 'Reasonable inference' }, { id: 'speculation', label: 'Speculation' }],
      items: rng.shuffle(chosen).map((s, i) => ({ id: `i${i}`, text: s.text, answer: s.cls === 'inference' ? 'inference' : s.cls })), ordinal: ['observable', 'inference', 'speculation'] });
  }
  return qs;
}

// ------------------------------------------------------------ Module C
function memory(ann, rng) {
  const qs = [];
  const present = new Set(ann.objects);
  qs.push({ key: 'C.recall', type: 'text', stage: 0, dimension: 'memory', subscale: 'object-recall', epistemic: 'observable', detail: 'primary',
    prompt: 'List every object, person or animal you remember from the image.', placeholder: 'Separate items with commas', truth: { mode: 'objects' } });
  const refs = referable(ann, { minArea: 0.004, foreground: true });
  const posTarget = rng.pick(refs.filter((o) => o.salience !== 'background').length ? refs.filter((o) => o.salience !== 'background') : refs);
  if (posTarget) qs.push({ key: 'C.position', type: 'grid', stage: 1, dimension: 'memory', subscale: 'position', epistemic: 'observable', detail: posTarget.salience === 'primary' ? 'primary' : 'secondary',
    prompt: `Where in the frame was ${the(posTarget.type)}? Choose the region containing its centre.`, truth: { cells: [{ cell: posTarget.cell, credit: 1 }] }, cols: GRID_COLS });
  // relative size
  const sizePairs = [];
  for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) { const r = refs[i].area / refs[j].area; if (r > 1.8 || r < 1 / 1.8) sizePairs.push([refs[i], refs[j]]); }
  if (sizePairs.length) {
    const [a, b] = rng.pick(sizePairs);
    const larger = a.area > b.area ? a : b;
    qs.push({ key: 'C.size', type: 'mcq', stage: 1, dimension: 'memory', subscale: 'relative-size', epistemic: 'observable', detail: 'secondary',
      prompt: 'Which of these took up more space in the image?', options: opts(rng.shuffle([a, b]).map((o) => ({ label: cap(labelOf(o.type)), value: o.type, credit: o === larger ? 1 : 0 }))) });
  }
  const colorable = referable(ann, { needColor: true, minArea: 0.003 }).filter((o) => o !== posTarget);
  if (colorable.length) {
    const t = rng.pick(colorable);
    qs.push({ key: 'C.color', type: 'mcq', stage: 1, dimension: 'memory', subscale: 'color', epistemic: 'observable', detail: t.salience === 'primary' ? 'primary' : 'secondary',
      prompt: `What colour was ${the(t.type)}?`, options: colorOptions(t.color, rng), truth: { color: t.color }, colorScored: true });
  }
  const pairs = spatialPairs(ann, rng);
  if (pairs.length) {
    const p = pairs[0];
    const choices = p.axis === 'x' ? ['left', 'right'] : ['above', 'below'];
    qs.push({ key: 'C.spatial', type: 'mcq', stage: 1, dimension: 'memory', subscale: 'spatial', epistemic: 'observable', detail: 'primary',
      prompt: `Relative to ${the(p.b.type)}, where was ${the(p.a.type)}?`, options: opts(choices.map((c) => ({ label: c === 'left' ? 'To its left' : c === 'right' ? 'To its right' : c === 'above' ? 'Above it' : 'Below it', value: c, credit: c === p.aIs ? 1 : 0 }))) });
  }
  // presence / absence (signal detection)
  const pres = rng.sample([...present].filter((k) => CONCEPTS[k] && !['road', 'sidewalk', 'grass', 'path', 'beach'].includes(k)), 2);
  const lures = distractors(pres.length ? pres : [...present], present, 4 - pres.length, rng);
  const items = rng.shuffle([...pres.map((k) => ({ text: `${cap(labelOf(k))}`, answer: 'present', concept: k })), ...lures.map((k) => ({ text: cap(labelOf(k)), answer: 'absent', concept: k }))]);
  if (items.length >= 3) qs.push({ key: 'C.presence', type: 'judgments', stage: 1, dimension: 'memory', subscale: 'presence-absence', epistemic: 'observable', detail: 'secondary', sdt: true,
    prompt: 'Was each of these in the image?', columns: [{ id: 'present', label: 'Present' }, { id: 'absent', label: 'Absent' }], items: items.map((it, i) => ({ id: `i${i}`, ...it })) });
  return qs;
}

// ------------------------------------------------------------ Module D
const COMPOSITIONS = {
  centered: 'Centred: the subject sits in the middle',
  'rule-of-thirds': 'Off-centre: subject placed on a third line',
  symmetrical: 'Symmetrical: mirrored left and right',
  'layered-depth': 'Layered depth: distinct foreground, middle and background',
  'horizontal-band': 'Horizontal bands: strong horizontal structure',
  'leading-lines': 'Leading lines: lines converge into the frame',
  'asymmetrical-balance': 'Asymmetrical balance: unequal masses balanced',
  'asymmetrical-negative-space': 'Negative space: few elements, large empty areas',
};
const COMP_NEAR = {
  centered: { symmetrical: 0.5 }, symmetrical: { centered: 0.5 }, 'rule-of-thirds': { 'asymmetrical-balance': 0.5 }, 'asymmetrical-balance': { 'rule-of-thirds': 0.5, 'asymmetrical-negative-space': 0.5 },
  'asymmetrical-negative-space': { 'asymmetrical-balance': 0.5 }, 'layered-depth': { 'horizontal-band': 0.25 }, 'horizontal-band': { 'layered-depth': 0.25 }, 'leading-lines': { 'layered-depth': 0.25 },
};

function aesthetic(ann, rng) {
  const qs = [];
  if (ann.atmosphere?.length) {
    const ref = rng.sample(ann.atmosphere.filter((a) => ATMOSPHERE_VOCAB.includes(a)), 3);
    const contra = rng.sample((ann.atmosphereContra || []).filter((a) => ATMOSPHERE_VOCAB.includes(a)), 2);
    const neutral = rng.sample(ATMOSPHERE_VOCAB.filter((a) => !ann.atmosphere.includes(a) && !(ann.atmosphereContra || []).includes(a)), 8 - ref.length - contra.length);
    if (ref.length) qs.push({ key: 'D.atmosphere', type: 'multi', stage: 1, dimension: 'aesthetic', subscale: 'atmosphere', epistemic: 'subjective', detail: 'primary', confidence: false,
      prompt: 'Which words describe the emotional atmosphere? Select up to three.', maxSelect: 3,
      options: opts(rng.shuffle([...ref.map((a) => ({ label: cap(a), value: a, target: true })), ...contra.map((a) => ({ label: cap(a), value: a, target: false, contra: true })), ...neutral.map((a) => ({ label: cap(a), value: a, target: false }))])) });
  }
  if (ann.colorTemperature != null) qs.push({ key: 'D.temperature', type: 'scale', stage: 1, dimension: 'aesthetic', subscale: 'color-temperature', epistemic: 'observable', detail: 'primary',
    prompt: 'What was the overall colour temperature?', min: 1, max: 7, minLabel: 'Very cool / blue', maxLabel: 'Very warm / orange', truth: { value: ann.colorTemperature, tolerance: 3 } });
  if (ann.timeOfDay && ann.lightQuality) {
    const q = { soft: 'Soft, low-angle natural light', hard: 'Hard, bright daylight with crisp shadows', diffuse: 'Flat, diffuse light from a cloudy sky', artificial: 'Mostly artificial light sources' };
    const near = { soft: { diffuse: 0.25 }, diffuse: { soft: 0.25 }, hard: {}, artificial: {} };
    qs.push({ key: 'D.lighting', type: 'mcq', stage: 1, dimension: 'aesthetic', subscale: 'lighting-quality', epistemic: 'observable', detail: 'primary', prompt: 'Which best describes the quality of the light?',
      options: opts(rng.shuffle(Object.entries(q).map(([k, label]) => ({ label, value: k, credit: k === ann.lightQuality ? 1 : near[ann.lightQuality]?.[k] || 0 })))) });
  }
  if (ann.composition && COMPOSITIONS[ann.composition]) {
    const others = rng.sample(Object.keys(COMPOSITIONS).filter((k) => k !== ann.composition), 3);
    qs.push({ key: 'D.composition', type: 'mcq', stage: 1, dimension: 'aesthetic', subscale: 'composition', epistemic: 'inferential', detail: 'primary', prompt: 'Which best describes the composition?',
      options: opts(rng.shuffle([ann.composition, ...others].map((k) => ({ label: COMPOSITIONS[k], value: k, credit: k === ann.composition ? 1 : COMP_NEAR[ann.composition]?.[k] || 0 })))) });
  }
  if (ann.focal?.cell != null) qs.push({ key: 'D.focal', type: 'grid', stage: 1, dimension: 'aesthetic', subscale: 'visual-hierarchy', epistemic: 'inferential', detail: 'primary',
    prompt: 'Where was the main focal point — where did your eye go first?', truth: { cells: [{ cell: ann.focal.cell, credit: 1 }], adjacency: 0.5 }, cols: GRID_COLS });
  if (ann.designLanguage) {
    qs.push({ key: 'D.design', type: 'mcq', stage: 1, dimension: 'aesthetic', subscale: 'design-language', epistemic: 'subjective', detail: 'primary', confidence: false, prompt: 'Which design language fits best?',
      options: opts(rng.shuffle([ann.designLanguage, ...rng.sample(DESIGN_LANGUAGES.filter((d) => d !== ann.designLanguage), 3)]).map((d) => ({ label: cap(d), value: d, credit: d === ann.designLanguage ? 1 : 0 }))) });
  } else if (ann.weather) {
    const all = ['clear', 'overcast', 'rainy', 'clear night', 'n/a (indoor)'];
    const truth = ann.weather.startsWith('n/a') ? 'n/a (indoor)' : ann.weather;
    const label = { clear: 'Clear, dry weather', overcast: 'Overcast', rainy: 'Rain', 'clear night': 'A clear night', 'n/a (indoor)': 'Indoors — weather not visible' };
    qs.push({ key: 'D.environment', type: 'mcq', stage: 1, dimension: 'aesthetic', subscale: 'environment', epistemic: 'inferential', detail: 'secondary', prompt: 'What were the environmental conditions?',
      options: opts(all.map((w) => ({ label: label[w], value: w, credit: w === truth ? 1 : (truth === 'clear night' && w === 'clear') || (truth === 'overcast' && w === 'rainy') ? 0.25 : 0 }))) });
  }
  qs.push({ key: 'D.explain', type: 'text', stage: 2, dimension: 'aesthetic', subscale: 'explanation', epistemic: 'subjective', detail: 'primary', confidence: false,
    prompt: 'Briefly explain which visual features created that atmosphere (light, colour, composition, subject).', placeholder: 'e.g. the low orange light and long shadows…', truth: { mode: 'cues' } });
  return qs;
}

// ------------------------------------------------------------ Module E
function interfaceAnalysis(ann, rng) {
  const ui = ann.ui;
  if (!ui) return [];
  const qs = [];
  qs.push({ key: 'E.improve', type: 'text', stage: 0, dimension: 'interface', subscale: 'improvements', epistemic: 'inferential', detail: 'primary',
    prompt: 'What usability or visual problems did you notice, and how would you improve them?', placeholder: 'e.g. the grey body text is too faint — increase contrast…', truth: { mode: 'issues', issues: ui.issues } });
  qs.push({ key: 'E.pageType', type: 'mcq', stage: 1, dimension: 'interface', subscale: 'page-type', epistemic: 'observable', detail: 'primary', prompt: 'What kind of interface was this?',
    options: opts(rng.shuffle(['landing page', 'analytics dashboard', 'product page', 'editorial article'].map((p) => ({ label: cap(p), value: p, credit: p === ui.pageType ? 1 : 0 })))) });
  qs.push({ key: 'E.nav', type: 'mcq', stage: 1, dimension: 'interface', subscale: 'navigation', epistemic: 'observable', detail: 'secondary', prompt: 'How was the main navigation presented?',
    options: opts(rng.shuffle(['top bar', 'left sidebar', 'hamburger menu only', 'no navigation'].map((p) => ({ label: cap(p), value: p, credit: p === ui.navType ? 1 : 0 })))) });
  qs.push({ key: 'E.focal', type: 'grid', stage: 1, dimension: 'interface', subscale: 'focal-point', epistemic: 'inferential', detail: 'primary', prompt: 'Where was the primary visual focal point?', truth: { cells: ui.focalCells }, cols: GRID_COLS });
  qs.push({ key: 'E.hierarchy', type: 'mcq', stage: 1, dimension: 'interface', subscale: 'information-hierarchy', epistemic: 'inferential', detail: 'primary', prompt: 'Which element dominated the information hierarchy?',
    options: opts(rng.shuffle(['headline', 'image', 'cards', 'navigation'].map((p) => ({ label: cap(p), value: p, credit: p === ui.dominant ? 1 : 0 })))) });
  const absent = rng.sample(ui.absentIssues, Math.max(3, 6 - ui.issues.length));
  qs.push({ key: 'E.issues', type: 'multi', stage: 1, dimension: 'interface', subscale: 'issue-detection', epistemic: 'observable', detail: 'primary', sdt: true,
    prompt: 'Which of these problems were present? Select all that apply.',
    options: opts(rng.shuffle([...ui.issues.map((k) => ({ label: UI_ISSUES[k].label, value: k, target: true })), ...absent.map((k) => ({ label: UI_ISSUES[k].label, value: k, target: false }))])) });
  return qs;
}

export const BUILDERS = { recognition, context, memory, aesthetic, interface: interfaceAnalysis };

const CHANCE = { mcq: (q) => 1 / (q.options?.length || 2), multi: () => 0.25, count: () => 0.15, grid: () => 0.2, judgments: (q) => 1 / (q.columns?.length || 2), scale: () => 0.4, text: () => 0 };

/** Build the ordered question list for one trial. Free recall first; then randomised. */
export function buildQuestions(builderKey, annotation, rng, { maxQuestions = Infinity } = {}) {
  const raw = BUILDERS[builderKey](annotation, rng);
  const qs = raw.map((q) => ({
    id: qid(), stimulusId: annotation.id, confidence: q.epistemic !== 'subjective' && q.confidence !== false, ...q,
    chance: CHANCE[q.type]?.(q) ?? 0.25,
  }));
  const s0 = qs.filter((q) => q.stage === 0);
  let s1 = rng.shuffle(qs.filter((q) => q.stage === 1));
  const s2 = qs.filter((q) => q.stage === 2);
  if (Number.isFinite(maxQuestions)) s1 = s1.slice(0, Math.max(0, maxQuestions - s0.length - s2.length));
  return [...s0, ...s1, ...s2];
}
