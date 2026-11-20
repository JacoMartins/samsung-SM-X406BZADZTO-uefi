// Experimental paradigm registry. A paradigm declares which stimulus
// categories it samples, its default timing conditions and which question
// builder it uses. New paradigms can be added with registerParadigm() without
// touching the engine, presentation, scoring or analytics layers.
import { BUILDERS } from '../questions/question-bank.js';

export const PARADIGMS = new Map();

export function registerParadigm(def) {
  for (const k of ['id', 'name', 'dimension', 'categories', 'builder', 'defaults']) if (!(k in def)) throw new Error(`Paradigm missing ${k}`);
  if (!BUILDERS[def.builder] && typeof def.buildQuestions !== 'function') throw new Error(`Unknown question builder ${def.builder}`);
  PARADIGMS.set(def.id, def);
  return def;
}

const SCENES = ['domestic', 'urban', 'nature', 'human', 'architecture', 'transportation', 'objects', 'photography', 'graphic-design'];

registerParadigm({
  id: 'A', name: 'Rapid Visual Recognition', short: 'Recognition', dimension: 'recognition', builder: 'recognition',
  categories: SCENES,
  summary: 'An unfamiliar image is flashed briefly. Identify main objects, counts, environment, colour, lighting and secondary details.',
  defaults: { enabled: true, trials: 5, exposures: [100, 250, 500, 750, 1000], delays: [0] },
});
registerParadigm({
  id: 'B', name: 'Contextual Understanding', short: 'Context', dimension: 'context', builder: 'context',
  categories: ['domestic', 'urban', 'nature', 'human', 'architecture', 'transportation', 'photography'],
  summary: 'Infer what is happening, what came before, what follows and how elements relate. Separate visible facts from inference and speculation.',
  defaults: { enabled: true, trials: 5, exposures: [100, 250, 500, 750, 1000], delays: [0] },
});
registerParadigm({
  id: 'C', name: 'Visual Working Memory', short: 'Memory', dimension: 'memory', builder: 'memory',
  categories: SCENES,
  summary: 'After a retention interval (immediate, 5 s or 20 s), recall objects, positions, sizes, colours, spatial relations and presence of details.',
  defaults: { enabled: true, trials: 6, exposures: [750], delays: [0, 5000, 20000] },
});
registerParadigm({
  id: 'D', name: 'Atmospheric & Aesthetic Interpretation', short: 'Aesthetic', dimension: 'aesthetic', builder: 'aesthetic',
  categories: ['domestic', 'urban', 'nature', 'architecture', 'photography', 'graphic-design', 'objects'],
  summary: 'Judge atmosphere, colour temperature, light quality, composition, focal point and design language, and explain your reading.',
  defaults: { enabled: true, trials: 4, exposures: [250, 500, 750, 1000], delays: [0] },
});
registerParadigm({
  id: 'E', name: 'Visual Hierarchy & Interface Analysis', short: 'Interface', dimension: 'interface', builder: 'interface',
  categories: ['interface'],
  summary: 'Unfamiliar interface screenshots: identify focal point, navigation, hierarchy and planted usability problems, then suggest improvements.',
  defaults: { enabled: true, trials: 4, exposures: [250, 500, 750, 1000], delays: [0] },
});

export const DIMENSIONS = {
  recognition: { label: 'Visual recognition', short: 'Recognition' },
  context: { label: 'Contextual inference', short: 'Context' },
  relational: { label: 'Relational reasoning', short: 'Relational' },
  aesthetic: { label: 'Atmospheric & aesthetic perception', short: 'Aesthetic' },
  memory: { label: 'Visual working memory', short: 'Memory' },
  interface: { label: 'Interface analysis (applied)', short: 'Interface' },
};
