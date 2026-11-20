// Concept lexicon: canonical concept keys with synonyms and hypernyms.
// Used for (a) semantic matching of free-text answers, (b) choosing
// plausible distractors from the same semantic group, (c) mapping drawn
// object types to human-readable labels.

export const CONCEPTS = {
  // animals
  cat: { syn: ['cat', 'kitten', 'kitty', 'feline', 'tabby'], hyper: ['animal', 'pet'], group: 'animal' },
  dog: { syn: ['dog', 'puppy', 'pup', 'hound', 'canine', 'doggy'], hyper: ['animal', 'pet'], group: 'animal' },
  bird: { syn: ['bird', 'sparrow', 'pigeon', 'gull', 'seagull', 'crow', 'robin'], hyper: ['animal'], group: 'animal' },
  duck: { syn: ['duck', 'mallard', 'duckling'], hyper: ['animal', 'bird'], group: 'animal' },
  deer: { syn: ['deer', 'stag', 'doe', 'elk', 'reindeer', 'antelope'], hyper: ['animal'], group: 'animal' },
  horse: { syn: ['horse', 'pony', 'mare', 'stallion'], hyper: ['animal'], group: 'animal' },
  // people
  person: { syn: ['person', 'man', 'woman', 'people', 'human', 'adult', 'guy', 'lady', 'figure', 'pedestrian', 'someone', 'individual', 'passenger', 'commuter'], hyper: [], group: 'person' },
  child: { syn: ['child', 'kid', 'boy', 'girl', 'toddler', 'children'], hyper: ['person'], group: 'person' },
  // furniture / domestic
  bed: { syn: ['bed', 'mattress', 'bunk'], hyper: ['furniture'], group: 'furniture' },
  lamp: { syn: ['lamp', 'floor lamp', 'table lamp', 'lampshade'], hyper: ['light', 'furniture'], group: 'furniture' },
  window: { syn: ['window', 'windowpane', 'pane', 'glass'], hyper: [], group: 'structure' },
  table: { syn: ['table', 'desk', 'counter top', 'dining table'], hyper: ['furniture'], group: 'furniture' },
  chair: { syn: ['chair', 'stool', 'seat'], hyper: ['furniture'], group: 'furniture' },
  sofa: { syn: ['sofa', 'couch', 'settee', 'loveseat'], hyper: ['furniture'], group: 'furniture' },
  plant: { syn: ['plant', 'houseplant', 'potted plant', 'pot plant', 'fern'], hyper: ['vegetation'], group: 'nature' },
  bookshelf: { syn: ['bookshelf', 'bookcase', 'shelf', 'shelves', 'books'], hyper: ['furniture'], group: 'furniture' },
  clock: { syn: ['clock', 'wall clock'], hyper: [], group: 'object' },
  rug: { syn: ['rug', 'carpet', 'mat'], hyper: [], group: 'furniture' },
  picture: { syn: ['picture', 'painting', 'frame', 'artwork', 'poster', 'photo'], hyper: [], group: 'object' },
  tv: { syn: ['tv', 'television', 'screen', 'monitor', 'telly'], hyper: ['electronics'], group: 'object' },
  mug: { syn: ['mug', 'cup', 'coffee', 'tea cup', 'teacup'], hyper: ['container'], group: 'object' },
  vase: { syn: ['vase', 'flowers', 'bouquet', 'pot'], hyper: ['container'], group: 'object' },
  book: { syn: ['book', 'novel', 'notebook'], hyper: [], group: 'object' },
  apple: { syn: ['apple', 'fruit'], hyper: ['food'], group: 'food' },
  fruitbowl: { syn: ['fruit bowl', 'bowl', 'fruit', 'fruits', 'oranges', 'apples'], hyper: ['food'], group: 'food' },
  bottle: { syn: ['bottle', 'wine', 'jar', 'flask'], hyper: ['container'], group: 'object' },
  candle: { syn: ['candle', 'candles', 'candlelight', 'flame'], hyper: ['light'], group: 'object' },
  laptop: { syn: ['laptop', 'computer', 'notebook computer', 'macbook'], hyper: ['electronics'], group: 'object' },
  teapot: { syn: ['teapot', 'kettle', 'pot'], hyper: ['container'], group: 'object' },
  counter: { syn: ['counter', 'cabinet', 'cupboard', 'kitchen counter', 'worktop', 'cabinets'], hyper: ['furniture'], group: 'furniture' },
  fridge: { syn: ['fridge', 'refrigerator', 'freezer'], hyper: ['appliance'], group: 'furniture' },
  plate: { syn: ['plate', 'dish', 'food', 'meal'], hyper: [], group: 'food' },
  // nature
  tree: { syn: ['tree', 'trees', 'oak'], hyper: ['vegetation'], group: 'nature' },
  pine: { syn: ['pine', 'fir', 'conifer', 'evergreen', 'spruce', 'pine tree'], hyper: ['tree', 'vegetation'], group: 'nature' },
  palm: { syn: ['palm', 'palm tree', 'coconut tree'], hyper: ['tree', 'vegetation'], group: 'nature' },
  bush: { syn: ['bush', 'shrub', 'hedge', 'shrubs'], hyper: ['vegetation'], group: 'nature' },
  flower: { syn: ['flower', 'flowers', 'blossom', 'daisy', 'tulip'], hyper: ['vegetation'], group: 'nature' },
  rock: { syn: ['rock', 'boulder', 'stone', 'rocks'], hyper: [], group: 'nature' },
  mountain: { syn: ['mountain', 'mountains', 'peak', 'hill', 'hills', 'summit', 'range'], hyper: ['landscape'], group: 'nature' },
  lake: { syn: ['lake', 'water', 'pond', 'river', 'reflection'], hyper: ['water'], group: 'nature' },
  sea: { syn: ['sea', 'ocean', 'water', 'waves', 'bay'], hyper: ['water'], group: 'nature' },
  river: { syn: ['river', 'canal', 'water', 'stream'], hyper: ['water'], group: 'nature' },
  beach: { syn: ['beach', 'sand', 'shore', 'coast'], hyper: ['landscape'], group: 'nature' },
  cloud: { syn: ['cloud', 'clouds', 'cloudy'], hyper: ['sky'], group: 'nature' },
  sun: { syn: ['sun', 'sunshine', 'sunlight', 'sunset', 'sunrise'], hyper: ['sky', 'light'], group: 'nature' },
  moon: { syn: ['moon', 'moonlight', 'crescent'], hyper: ['sky', 'light'], group: 'nature' },
  grass: { syn: ['grass', 'lawn', 'field', 'meadow', 'park'], hyper: ['vegetation'], group: 'nature' },
  // urban / structures
  building: { syn: ['building', 'buildings', 'apartment', 'office', 'skyscraper', 'block', 'tower block'], hyper: ['structure'], group: 'structure' },
  house: { syn: ['house', 'home', 'cottage', 'houses'], hyper: ['building', 'structure'], group: 'structure' },
  columns: { syn: ['columns', 'pillars', 'column', 'pillar', 'portico', 'temple', 'museum', 'facade'], hyper: ['building', 'structure'], group: 'structure' },
  dome: { syn: ['dome', 'cupola', 'rotunda'], hyper: ['building', 'structure'], group: 'structure' },
  tower: { syn: ['tower', 'spire', 'steeple', 'clock tower', 'belfry'], hyper: ['building', 'structure'], group: 'structure' },
  bridge: { syn: ['bridge', 'viaduct', 'arches', 'aqueduct'], hyper: ['structure'], group: 'structure' },
  lighthouse: { syn: ['lighthouse', 'beacon'], hyper: ['building', 'structure'], group: 'structure' },
  streetlight: { syn: ['streetlight', 'street light', 'street lamp', 'lamppost', 'lamp post', 'light pole'], hyper: ['light'], group: 'street' },
  trafficlight: { syn: ['traffic light', 'traffic lights', 'stoplight', 'signal', 'traffic signal'], hyper: [], group: 'street' },
  bench: { syn: ['bench', 'seat', 'park bench'], hyper: ['furniture'], group: 'street' },
  shelter: { syn: ['bus shelter', 'bus stop', 'shelter', 'stop'], hyper: ['structure'], group: 'street' },
  sign: { syn: ['sign', 'signpost', 'road sign', 'stop sign', 'signage'], hyper: [], group: 'street' },
  trashcan: { syn: ['trash can', 'bin', 'trash', 'garbage can', 'rubbish bin', 'dustbin', 'litter bin'], hyper: ['container'], group: 'street' },
  road: { syn: ['road', 'street', 'crosswalk', 'zebra crossing', 'asphalt', 'highway', 'lane'], hyper: [], group: 'street' },
  sidewalk: { syn: ['sidewalk', 'pavement', 'footpath', 'walkway', 'platform'], hyper: [], group: 'street' },
  fountain: { syn: ['fountain', 'water feature'], hyper: ['structure'], group: 'street' },
  flag: { syn: ['flag', 'banner'], hyper: [], group: 'object' },
  stall: { syn: ['market stall', 'stall', 'stand', 'market', 'kiosk', 'booth'], hyper: ['structure'], group: 'street' },
  umbrella: { syn: ['umbrella', 'parasol', 'sunshade'], hyper: [], group: 'object' },
  // vehicles
  car: { syn: ['car', 'cars', 'automobile', 'sedan', 'vehicle', 'taxi', 'auto'], hyper: ['vehicle'], group: 'vehicle' },
  bus: { syn: ['bus', 'coach', 'tram', 'minibus'], hyper: ['vehicle'], group: 'vehicle' },
  truck: { syn: ['truck', 'lorry', 'van', 'delivery truck'], hyper: ['vehicle'], group: 'vehicle' },
  train: { syn: ['train', 'locomotive', 'railway', 'carriage', 'subway', 'metro', 'tram'], hyper: ['vehicle'], group: 'vehicle' },
  bicycle: { syn: ['bicycle', 'bike', 'cycle', 'bikes'], hyper: ['vehicle'], group: 'vehicle' },
  boat: { syn: ['boat', 'sailboat', 'sailing boat', 'yacht', 'dinghy', 'sail'], hyper: ['vehicle', 'vessel'], group: 'vehicle' },
  ship: { syn: ['ship', 'ferry', 'steamer', 'cargo ship', 'liner', 'vessel'], hyper: ['vehicle', 'vessel'], group: 'vehicle' },
  airplane: { syn: ['airplane', 'plane', 'aeroplane', 'jet', 'aircraft'], hyper: ['vehicle'], group: 'vehicle' },
  dock: { syn: ['dock', 'pier', 'jetty', 'wharf', 'quay'], hyper: ['structure'], group: 'structure' },
  crane: { syn: ['crane'], hyper: ['structure'], group: 'structure' },
  container: { syn: ['shipping container', 'container', 'containers', 'cargo'], hyper: [], group: 'object' },
  // outdoor misc
  tent: { syn: ['tent', 'camp', 'camping', 'campsite'], hyper: ['structure'], group: 'object' },
  campfire: { syn: ['campfire', 'fire', 'bonfire', 'flames'], hyper: ['light'], group: 'object' },
  ball: { syn: ['ball', 'football', 'beach ball'], hyper: ['toy'], group: 'object' },
  kite: { syn: ['kite'], hyper: ['toy'], group: 'object' },
  path: { syn: ['path', 'trail', 'track'], hyper: [], group: 'nature' },
  // design primitives
  shapeCircle: { syn: ['circle', 'circles', 'dot', 'disc', 'sphere', 'round'], hyper: ['shape'], group: 'shape' },
  shapeSquare: { syn: ['square', 'squares', 'rectangle', 'rectangles', 'block', 'blocks'], hyper: ['shape'], group: 'shape' },
  shapeTriangle: { syn: ['triangle', 'triangles', 'pyramid'], hyper: ['shape'], group: 'shape' },
  shapeLine: { syn: ['line', 'lines', 'stripe', 'stripes', 'bar', 'bars', 'rule'], hyper: ['shape'], group: 'shape' },
  shapeArc: { syn: ['arc', 'arch', 'curve', 'semicircle', 'half circle'], hyper: ['shape'], group: 'shape' },
  textBlock: { syn: ['text', 'title', 'heading', 'headline', 'typography', 'letters', 'words', 'type'], hyper: [], group: 'shape' },
};

/** Human-readable label for a concept key. */
export const LABELS = {
  tv: 'television', trafficlight: 'traffic light', streetlight: 'street lamp', trashcan: 'trash bin', fruitbowl: 'fruit bowl',
  shapeCircle: 'circle', shapeSquare: 'square / rectangle', shapeTriangle: 'triangle', shapeLine: 'line / stripe', shapeArc: 'arc',
  textBlock: 'text', shelter: 'bus shelter', columns: 'columned facade', stall: 'market stall', bookshelf: 'bookshelf', pine: 'pine tree', palm: 'palm tree',
  container: 'shipping container', dock: 'pier', ship: 'ship', mug: 'mug',
};

export function labelOf(key) { return LABELS[key] || key; }

/** Abstract hypernyms that earn partial credit ("animal" for cat). */
export const HYPERNYM_TERMS = {
  animal: ['animal', 'animals', 'creature', 'pet', 'pets', 'wildlife'],
  pet: ['pet', 'pets'],
  vehicle: ['vehicle', 'vehicles', 'transport', 'traffic'],
  furniture: ['furniture'],
  vegetation: ['vegetation', 'greenery', 'foliage', 'plants', 'nature'],
  structure: ['structure', 'construction', 'architecture'],
  building: ['building', 'buildings', 'architecture'],
  light: ['light', 'lights', 'lighting', 'glow'],
  water: ['water'],
  sky: ['sky'],
  food: ['food', 'snack'],
  container: ['container'],
  electronics: ['device', 'electronics', 'gadget'],
  shape: ['shape', 'shapes', 'geometry', 'geometric'],
  tree: ['tree', 'trees'],
  bird: ['bird', 'birds'],
  person: ['person', 'people', 'human', 'figure'],
  toy: ['toy'],
  vessel: ['vessel', 'watercraft'],
  landscape: ['landscape', 'scenery'],
  appliance: ['appliance'],
};

export function groupOf(key) { return CONCEPTS[key]?.group || 'object'; }

/** All concept keys in the same semantic group (for distractors). */
export function sameGroup(key) {
  const g = groupOf(key);
  return Object.keys(CONCEPTS).filter((k) => k !== key && CONCEPTS[k].group === g);
}
