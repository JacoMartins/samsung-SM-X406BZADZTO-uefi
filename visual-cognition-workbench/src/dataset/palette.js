// Named colour vocabulary used for both rendering and ground truth.
// `family` groups perceptually adjacent names so colour answers can receive
// partial credit (e.g. "orange" for an object annotated "red").

export const COLORS = {
  red:    { hex: '#c8463b', family: 'warm',    neighbors: ['orange', 'pink', 'brown'] },
  orange: { hex: '#e2873a', family: 'warm',    neighbors: ['red', 'yellow', 'brown'] },
  yellow: { hex: '#e8c24a', family: 'warm',    neighbors: ['orange', 'beige'] },
  green:  { hex: '#4f9150', family: 'cool',    neighbors: ['teal'] },
  teal:   { hex: '#2f8f8c', family: 'cool',    neighbors: ['green', 'blue'] },
  blue:   { hex: '#3a69b0', family: 'cool',    neighbors: ['teal', 'purple'] },
  purple: { hex: '#7752a6', family: 'cool',    neighbors: ['blue', 'pink'] },
  pink:   { hex: '#d9809f', family: 'warm',    neighbors: ['red', 'purple'] },
  brown:  { hex: '#7f5536', family: 'warm',    neighbors: ['orange', 'red', 'beige'] },
  black:  { hex: '#2b2b2d', family: 'neutral', neighbors: ['gray'] },
  white:  { hex: '#efede6', family: 'neutral', neighbors: ['gray', 'beige'] },
  gray:   { hex: '#8b8d90', family: 'neutral', neighbors: ['black', 'white'] },
  beige:  { hex: '#d6c29c', family: 'warm',    neighbors: ['white', 'brown', 'yellow'] },
};

export const COLOR_NAMES = Object.keys(COLORS);

export function hex(name) { return COLORS[name]?.hex ?? name; }

/** Credit for naming colour `answer` when truth is `truth`. */
export function colorCredit(truth, answer) {
  if (!truth || !answer) return 0;
  if (truth === answer) return 1;
  if (COLORS[truth]?.neighbors.includes(answer)) return 0.5;
  return 0;
}

/** Mix two hex colours, t in [0,1]. */
export function mix(a, b, t) {
  const pa = parse(hex(a)), pb = parse(hex(b));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function shade(c, t) { return t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t); }

function parse(h) {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/**
 * Lighting presets. `temperature` is the reference colour temperature on a
 * 1 (very cool) .. 7 (very warm) scale; it is derived from the actual tint
 * that is applied to the rendered image, so it is a measurable property.
 */
export const LIGHTING = {
  dawn:      { label: 'soft dawn light',        time: 'early morning', sky: ['#f6c9a8', '#a9bfdc'], tint: '#ffb08a', tintOpacity: 0.12, darkness: 0.05, temperature: 5, quality: 'soft',       outdoorOnly: false },
  midday:    { label: 'bright midday daylight', time: 'midday',        sky: ['#7fbbea', '#d9eefb'], tint: '#ffffff', tintOpacity: 0.0,  darkness: 0.0,  temperature: 4, quality: 'hard',       outdoorOnly: false },
  sunset:    { label: 'warm sunset',            time: 'sunset',        sky: ['#f08a4b', '#7a4f8f'], tint: '#ff8a3d', tintOpacity: 0.2,  darkness: 0.12, temperature: 6, quality: 'soft',       outdoorOnly: false },
  bluehour:  { label: 'cool blue hour',         time: 'dusk',          sky: ['#2f3f73', '#b48aa3'], tint: '#3a4f9a', tintOpacity: 0.22, darkness: 0.25, temperature: 2, quality: 'soft',       outdoorOnly: false },
  night:     { label: 'night with artificial light', time: 'night',    sky: ['#0b1230', '#1f2c55'], tint: '#101a40', tintOpacity: 0.45, darkness: 0.5,  temperature: 2, quality: 'artificial', outdoorOnly: false },
  overcast:  { label: 'flat overcast daylight', time: 'daytime',       sky: ['#aeb6bd', '#dde1e4'], tint: '#9aa7b3', tintOpacity: 0.14, darkness: 0.08, temperature: 3, quality: 'diffuse',    outdoorOnly: true },
  lamplight: { label: 'warm lamplight',         time: 'evening',       sky: ['#1c2140', '#3a3560'], tint: '#ffad5a', tintOpacity: 0.22, darkness: 0.28, temperature: 7, quality: 'artificial', outdoorOnly: false },
};

export const LIGHTING_TIMES = ['early morning', 'midday', 'daytime', 'sunset', 'dusk', 'evening', 'night'];
