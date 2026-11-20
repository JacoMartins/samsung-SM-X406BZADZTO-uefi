// Outdoor templates: urban, nature, human interaction outdoors.
import { isDark, TIME_PHRASE, atmosphereFor, circumstanceOptions, personProps } from './common.js';

function road(S, y, h, crosswalk) {
  let s = `<rect x="0" y="${y}" width="960" height="${h}" fill="#4a4d52"/>`;
  for (let i = 0; i < 12; i++) s += `<rect x="${i * 90 + 10}" y="${y + h / 2 - 3}" width="50" height="6" fill="#e9e6da" opacity="0.8"/>`;
  if (crosswalk) for (let i = 0; i < 8; i++) s += `<rect x="${crosswalk}" y="${y + 6 + i * (h / 8)}" width="90" height="${h / 16}" fill="#efede6"/>`;
  S.background(s);
}

export const street = {
  id: 'street', category: 'urban', setting: 'city street', indoor: false,
  lightings: ['dawn', 'midday', 'overcast', 'sunset', 'night'],
  build(S, rng, lk) {
    S.sky();
    const bcolors = rng.shuffle(['beige', 'gray', 'brown', 'red', 'white', 'teal']);
    const buildings = [];
    let bx = -20;
    while (bx < 960) { const w = rng.int(150, 230); const h = rng.int(240, 380); buildings.push(S.add('building', { x: bx, y: 390 - h, w, h, color: bcolors[buildings.length % bcolors.length], colorReliable: false, litWindows: isDark(lk), seed: buildings.length, salience: 'background', z: 1, door: true })); bx += w + rng.int(0, 10); }
    S.background(`<rect x="0" y="390" width="960" height="40" fill="#b9b4a8"/>`);
    const cw = rng.int(300, 600);
    road(S, 430, 120, cw);
    S.background(`<rect x="0" y="550" width="960" height="50" fill="#b9b4a8"/>`);
    const raining = lk === 'overcast' && rng.bool(0.6);
    const nCars = rng.int(1, 3);
    const cars = [];
    const lanes = rng.shuffle([[60, 445], [640, 445], [380, 495], [150, 495]]);
    for (let i = 0; i < nCars; i++) { const [x, y] = lanes[i]; cars.push(S.add('car', { x, y, w: 190, h: 75, color: rng.pick(['red', 'blue', 'yellow', 'white', 'black', 'green']), flip: y > 470, lightsOn: isDark(lk) || raining, salience: i === 0 ? 'primary' : 'secondary', z: 6 })); }
    const nPeople = rng.int(1, 3);
    const people = [];
    for (let i = 0; i < nPeople; i++) people.push(S.add('person', { ...personProps(rng, raining ? { holding: 'umbrella', accent: rng.pick(['red', 'blue', 'yellow', 'black']) } : rng.bool(0.3) ? { holding: 'bag' } : {}), x: rng.int(40, 860), y: 260 + rng.int(-5, 10), w: 55, h: 150, flip: rng.bool(), salience: 'primary', z: 4 }));
    const tlState = rng.pick(['red', 'green', 'amber']);
    const tl = S.add('trafficlight', { x: cw - 50, y: 250, w: 45, h: 160, state: tlState, color: tlState === 'amber' ? 'orange' : tlState, colorReliable: false, label: 'traffic light', salience: 'secondary', z: 5 });
    const sl = S.add('streetlight', { x: rng.pick([80, 760]), y: 170, w: 80, h: 240, lit: isDark(lk) || lk === 'overcast', salience: 'secondary', z: 5 });
    const tree = rng.bool(0.6) ? S.add('tree', { x: rng.pick([180, 620]), y: 250, w: 110, h: 160, color: 'green', salience: 'secondary', z: 3 }) : null;
    const bike = rng.bool(0.4) ? S.add('bicycle', { x: rng.int(420, 560), y: 350, w: 90, h: 60, color: rng.pick(['red', 'blue', 'black', 'yellow']), salience: 'secondary', z: 5 }) : null;
    const bin = rng.bool(0.4) ? S.add('trashcan', { x: rng.int(700, 880), y: 360, w: 40, h: 55, color: rng.pick(['green', 'gray', 'black']), salience: 'secondary', z: 5 }) : null;
    S.region('road', { x: 0, y: 430, w: 960, h: 120, salience: 'background' });
    if (raining) S.rain(90);
    void bike; void bin;
    const rel = [{ s: tl.id, p: 'beside', o: 'road', text: 'traffic light beside the crosswalk' }, { s: people[0].id, p: 'on', o: 'sidewalk', text: 'pedestrians walking on the sidewalk' }, { s: cars[0].id, p: 'on', o: 'road', text: 'cars driving on the road' }];
    if (tree) rel.push({ s: tree.id, p: 'in front of', o: buildings[0].id, text: 'tree in front of the buildings' });
    const { atmosphere, contra } = atmosphereFor(lk, raining ? ['gloomy', 'busy'] : ['busy', 'lively'], ['serene', 'intimate']);
    return {
      context: `an ordinary city street with traffic and pedestrians ${TIME_PHRASE[lk]}${raining ? ' in the rain' : ''}`,
      relationships: rel, atmosphere, contra, composition: 'layered-depth', focalId: cars[0].id, weather: raining ? 'rainy' : lk === 'overcast' ? 'overcast' : isDark(lk) ? 'clear night' : 'clear',
      happening: { answer: 'Ordinary city traffic: cars drive past while people walk along the street', accepted: [[['car', 'traffic'], ['drive', 'pass', 'road', 'street', 'traffic']], [['person'], ['walk', 'cross', 'street', 'sidewalk']]], foils: [{ text: 'A street parade is passing through', credit: 0.1 }, { text: 'A car accident has blocked the road', credit: 0 }, { text: 'The street is closed for construction', credit: 0 }] },
      before: [{ text: tlState === 'red' ? 'The traffic light turned red' : 'Cars were waiting at the light', credit: 0.8 }, { text: 'People left nearby buildings to go somewhere', credit: 1 }, { text: 'An airplane landed on the road', credit: 0 }, { text: 'The buildings were just built that morning', credit: 0 }],
      after: [{ text: tlState === 'red' ? 'Pedestrians cross while the cars wait' : 'The cars continue down the street', credit: 1 }, { text: 'The traffic light changes colour', credit: 0.8 }, { text: 'The street floods with sea water', credit: 0 }, { text: 'A whale swims by', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a city street', [{ text: 'Normal commuting or errands in town', credit: 0.8 }, { text: 'An emergency evacuation', credit: 0 }]),
      statements: [
        { text: `The traffic light shows ${tlState}.`, cls: 'observable' },
        { text: `There ${nCars === 1 ? 'is one car' : `are ${nCars} cars`} on the road.`, cls: 'observable' },
        { text: 'The pedestrians are heading to work or the shops.', cls: 'inference' },
        { text: 'One of the drivers is late for a wedding.', cls: 'speculation' },
        ...(raining ? [{ text: 'It is raining.', cls: 'observable' }] : []),
      ],
      extraObjects: ['road', 'sidewalk'],
    };
  },
};

export const plaza = {
  id: 'plaza', category: 'urban', setting: 'town square', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'bluehour', 'night'],
  build(S, rng, lk) {
    S.sky();
    const b1 = S.add('building', { x: 0, y: 120, w: 300, h: 280, color: rng.pick(['beige', 'red', 'white']), colorReliable: false, litWindows: isDark(lk), seed: 3, salience: 'background', z: 1 });
    const tower = rng.bool(0.5) ? S.add('tower', { x: 380, y: 40, w: 150, h: 360, color: rng.pick(['beige', 'gray', 'brown']), salience: 'secondary', z: 1 }) : null;
    const b2 = S.add('building', { x: 640, y: 160, w: 330, h: 240, color: rng.pick(['teal', 'gray', 'beige']), colorReliable: false, litWindows: isDark(lk), seed: 5, salience: 'background', z: 1 });
    S.ground(400, 'beige');
    let tiles = '';
    for (let i = 0; i < 12; i++) tiles += `<line x1="${i * 100 - 100}" y1="600" x2="${480 + (i - 6) * 40}" y2="400" stroke="#bfae8c" stroke-width="2"/>`;
    S.background(tiles);
    const fountain = rng.bool(0.6) ? S.add('fountain', { x: 380, y: 330, w: 200, h: 130, color: 'gray', colorReliable: false, salience: 'primary', z: 4 }) : null;
    const bench = S.add('bench', { x: rng.int(80, 200), y: 430, w: 180, h: 70, color: rng.pick(['brown', 'green', 'black']), salience: 'secondary', z: 5 });
    const sitting = rng.bool(0.6);
    const sitter = sitting ? S.add('person', { ...personProps(rng), x: bench.x + 50, y: 330, w: 70, h: 170, pose: 'sitting', salience: 'primary', z: 6 }) : null;
    const nBirds = rng.int(2, 6);
    const birds = [];
    for (let i = 0; i < nBirds; i++) birds.push(S.add('bird', { x: rng.int(560, 880), y: rng.int(500, 550), w: 36, h: 30, color: rng.pick(['gray', 'gray', 'black']), flip: rng.bool(), animate: 'animal', salience: 'secondary', z: 7 }));
    const walker = rng.bool(0.6) ? S.add('person', { ...personProps(rng), x: rng.int(620, 820), y: 310, w: 60, h: 170, flip: true, salience: 'primary', z: 5 }) : null;
    const sl = S.add('streetlight', { x: 300, y: 220, w: 70, h: 230, lit: isDark(lk), salience: 'secondary', z: 4 });
    const tree = S.add('tree', { x: rng.pick([840, 20]), y: 270, w: 120, h: 180, color: 'green', salience: 'secondary', z: 3 });
    const bin = rng.bool(0.5) ? S.add('trashcan', { x: bench.x + 200, y: 450, w: 36, h: 50, color: 'green', salience: 'secondary', z: 5 }) : null;
    void b1; void b2; void sl; void bin; void tower;
    const rel = [{ s: birds[0].id, p: 'on', o: 'ground', text: 'pigeons on the ground of the square' }];
    if (sitter) rel.push({ s: sitter.id, p: 'on', o: bench.id, text: 'person sitting on a bench' });
    if (fountain) rel.push({ s: fountain.id, p: 'center', o: 'square', text: 'fountain in the middle of the square' });
    if (walker) rel.push({ s: walker.id, p: 'near', o: birds[0].id, text: 'person walking near the birds' });
    const { atmosphere, contra } = atmosphereFor(lk, ['calm', 'leisurely', 'peaceful'], ['tense', 'chaotic', 'industrial']);
    const people = (sitter ? 1 : 0) + (walker ? 1 : 0);
    return {
      context: `a quiet town square with birds${people ? ' and a few people' : ''} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'layered-depth', focalId: fountain ? fountain.id : bench.id, weather: isDark(lk) ? 'clear night' : 'clear',
      happening: { answer: people ? 'People are spending leisure time in a calm town square with birds around' : 'Birds gather in an empty town square', accepted: [[['bird'], ['square', 'ground', 'gather', 'peck', 'feed']], [['person'], ['sit', 'bench', 'relax', 'walk', 'rest']]], foils: [{ text: 'A market is being set up', credit: 0.1 }, { text: 'A protest march is happening', credit: 0 }, { text: 'Firefighters are putting out a fire', credit: 0 }] },
      before: [{ text: 'The birds landed looking for food', credit: 1 }, { text: 'Someone scattered bread crumbs', credit: 0.7 }, { text: 'A tornado passed through', credit: 0 }, { text: 'The fountain was built overnight', credit: 0 }],
      after: [{ text: 'The birds fly off when someone walks close', credit: 1 }, { text: sitter ? 'The person on the bench gets up and leaves' : 'Someone sits down on the bench', credit: 0.8 }, { text: 'The square turns into a lake', credit: 0 }, { text: 'A bus drives through the fountain', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a public square', [{ text: 'A relaxed moment of free time in town', credit: 0.8 }, { text: 'A busy stock exchange floor', credit: 0 }]),
      statements: [
        { text: `There are ${nBirds} birds on the ground.`, cls: 'observable' },
        ...(fountain ? [{ text: 'There is a fountain in the square.', cls: 'observable' }] : []),
        { text: 'The birds are looking for food.', cls: 'inference' },
        { text: 'The square was built in the 18th century.', cls: 'speculation' },
        ...(sitter ? [{ text: 'The person on the bench is waiting for a friend.', cls: 'speculation' }] : []),
      ],
      extraObjects: ['building'],
    };
  },
};

export const mountainLake = {
  id: 'mountain-lake', category: 'nature', setting: 'mountain lake', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'bluehour', 'night', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    const sunOrMoon = isDark(lk) ? 'moon' : (['dawn', 'sunset', 'midday'].includes(lk) ? 'sun' : null);
    if (sunOrMoon) S.add(sunOrMoon, { x: rng.int(560, 800), y: lk === 'midday' ? 60 : 180, w: 70, h: 70, colorHex: lk === 'sunset' ? '#ffcf7a' : '#fff3c4', salience: 'secondary', z: 0 });
    const nClouds = lk === 'overcast' ? 5 : rng.int(0, 3);
    for (let i = 0; i < nClouds; i++) S.add('cloud', { x: rng.int(-40, 820), y: rng.int(20, 140), w: rng.int(140, 220), h: 60, colorHex: isDark(lk) ? '#5b6787' : lk === 'sunset' ? '#f7c4a0' : '#ffffff', salience: 'background', z: 1, annotate: i === 0 });
    const m = [];
    const nM = rng.int(2, 3);
    for (let i = 0; i < nM; i++) m.push(S.add('mountain', { x: -100 + i * 380 + rng.int(-40, 40), y: rng.int(110, 200), w: rng.int(420, 560), h: 260, color: rng.pick(['gray', 'blue', 'purple']), colorReliable: false, snow: rng.bool(0.6), salience: i === 1 ? 'primary' : 'background', z: 2 + (i % 2) }));
    S.water(380, isDark(lk) ? '#22345a' : '#4f86b0', 140);
    S.region('lake', { x: 0, y: 380, w: 960, h: 140, salience: 'primary' });
    S.ground(520, 'green');
    const pines = rng.int(3, 7);
    for (let i = 0; i < pines; i++) S.add('pine', { x: rng.pick([rng.int(-20, 260), rng.int(660, 900)]), y: rng.int(330, 380), w: 70, h: 190, color: 'green', salience: 'secondary', z: 6, annotate: i === 0 });
    const boat = rng.bool(0.6) ? S.add('boat', { x: rng.int(300, 560), y: 360, w: 110, h: 90, color: rng.pick(['red', 'white', 'yellow', 'brown']), flip: rng.bool(), salience: 'primary', z: 5 }) : null;
    const deer = rng.bool(0.4) ? S.add('deer', { x: rng.int(560, 760), y: 470, w: 110, h: 110, color: 'brown', animate: 'animal', flip: rng.bool(), salience: 'primary', z: 7 }) : null;
    const nBirds = rng.bool(0.5) ? rng.int(2, 4) : 0;
    for (let i = 0; i < nBirds; i++) S.add('bird', { x: rng.int(200, 700), y: rng.int(80, 200), w: 30, h: 14, pose: 'flying', color: isDark(lk) ? 'black' : 'black', animate: 'animal', salience: 'secondary', z: 4 });
    const rel = [{ s: m[0].id, p: 'behind', o: 'lake', text: 'mountains behind the lake' }, { s: 'pine', p: 'along', o: 'lake', text: 'pine trees along the shore' }];
    if (boat) rel.push({ s: boat.id, p: 'on', o: 'lake', text: 'boat floating on the lake' });
    if (deer) rel.push({ s: deer.id, p: 'on', o: 'shore', text: 'deer standing on the shore' });
    if (sunOrMoon) rel.push({ s: sunOrMoon, p: 'above', o: m[0].id, text: `${sunOrMoon} above the mountains` });
    const { atmosphere, contra } = atmosphereFor(lk, ['serene', 'peaceful', 'majestic', 'calm'], ['busy', 'chaotic', 'industrial', 'festive']);
    return {
      context: `a remote mountain lake ${TIME_PHRASE[lk]}${boat ? ' with a small boat' : ''}`,
      relationships: rel, atmosphere, contra, composition: 'layered-depth', focalId: boat ? boat.id : m[1]?.id || m[0].id, weather: lk === 'overcast' ? 'overcast' : isDark(lk) ? 'clear night' : 'clear',
      happening: { answer: boat ? 'A small boat floats on a calm mountain lake' : 'A calm, untouched mountain landscape', accepted: [[['boat'], ['float', 'lake', 'water', 'sail']], [['mountain', 'lake'], ['calm', 'still', 'quiet', 'peaceful', 'landscape', 'view']]], foils: [{ text: 'A boat race is under way', credit: boat ? 0.1 : 0 }, { text: 'A forest fire is spreading', credit: 0 }, { text: 'A city is being built on the shore', credit: 0 }] },
      before: [{ text: boat ? 'Someone rowed the boat out from the shore' : 'Nothing notable; the landscape was just as calm', credit: 1 }, { text: 'The wind died down and the water became calm', credit: 0.8 }, { text: 'A volcano erupted', credit: 0 }, { text: 'A traffic jam formed', credit: 0 }],
      after: [{ text: `The light changes as ${isDark(lk) ? 'night goes on' : lk === 'sunset' ? 'the sun sets' : 'the day goes on'}`, credit: 1 }, { text: boat ? 'The boat returns to the shore' : 'Animals come down to drink', credit: 0.8 }, { text: 'The lake freezes in seconds', credit: 0 }, { text: 'A bus stops on the lake', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a remote lake', [{ text: 'A quiet holiday in the countryside', credit: 0.6 }, { text: 'Rush hour in a city centre', credit: 0 }]),
      statements: [
        { text: `There ${nM === 2 ? 'are two' : 'are three'} mountain peaks.`, cls: 'observable' },
        ...(boat ? [{ text: 'There is a boat on the water.', cls: 'observable' }] : []),
        { text: 'The area is far from any city.', cls: 'inference' },
        { text: 'The lake is famous for its fish.', cls: 'speculation' },
        { text: 'The air here is cold.', cls: 'inference' },
      ],
      extraObjects: ['lake', 'mountain', 'pine'],
    };
  },
};

export const forest = {
  id: 'forest', category: 'nature', setting: 'forest clearing', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'night', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    S.ground(360, isDark(lk) ? 'green' : 'green');
    S.background(`<path d="M380,600 Q470,470 500,360 L540,360 Q560,470 700,600 z" fill="#b49a72" opacity="0.85"/>`);
    const back = rng.int(8, 12);
    for (let i = 0; i < back; i++) S.add(rng.bool(0.6) ? 'pine' : 'tree', { x: i * 90 + rng.int(-20, 20), y: rng.int(150, 210), w: rng.int(80, 110), h: 220, color: 'green', salience: 'background', z: 1, annotate: false });
    const camping = rng.bool(0.6);
    const tent = camping ? S.add('tent', { x: rng.int(110, 250), y: 360, w: 190, h: 130, color: rng.pick(['orange', 'red', 'yellow', 'blue', 'green']), salience: 'primary', z: 4 }) : null;
    const fire = camping && (isDark(lk) || lk === 'sunset' || rng.bool(0.4)) ? S.add('campfire', { x: tent.x + 230, y: 470, w: 70, h: 50, color: 'orange', colorReliable: false, salience: 'primary', z: 5 }) : null;
    const nPeople = camping ? rng.int(0, 2) : 0;
    const people = [];
    for (let i = 0; i < nPeople; i++) people.push(S.add('person', { ...personProps(rng), x: (fire ? fire.x : 420) + (i ? 110 : -100) + rng.int(-10, 10), y: 370, w: 70, h: 160, pose: 'sitting', flip: i === 1, salience: 'primary', z: 6 }));
    const deer = !camping || rng.bool(0.3) ? S.add('deer', { x: rng.int(600, 780), y: 340, w: 130, h: 130, color: 'brown', animate: 'animal', flip: rng.bool(), salience: 'primary', z: 4 }) : null;
    const rock = rng.bool(0.6) ? S.add('rock', { x: rng.int(740, 860), y: 470, w: 100, h: 70, color: 'gray', salience: 'secondary', z: 5 }) : null;
    const nFlowers = rng.int(0, 4);
    for (let i = 0; i < nFlowers; i++) S.add('flower', { x: rng.int(40, 340), y: 530, w: 26, h: 50, color: rng.pick(['red', 'yellow', 'white', 'purple']), salience: 'secondary', z: 6, annotate: i === 0 });
    const bush = S.add('bush', { x: rng.int(0, 60), y: 430, w: 150, h: 90, color: 'green', salience: 'secondary', z: 3 });
    const bird = rng.bool(0.5) ? S.add('bird', { x: rng.int(400, 600), y: rng.int(100, 200), w: 34, h: 16, pose: 'flying', color: 'black', animate: 'animal', salience: 'secondary', z: 3 }) : null;
    void rock; void bush; void bird;
    const rel = [{ s: 'tree', p: 'around', o: 'clearing', text: 'trees surrounding a clearing' }, { s: 'path', p: 'through', o: 'clearing', text: 'path leading into the forest' }];
    if (tent) rel.push({ s: tent.id, p: 'in', o: 'clearing', text: 'tent pitched in the clearing' });
    if (fire) rel.push({ s: fire.id, p: 'beside', o: tent.id, text: 'campfire next to the tent' });
    if (people.length) rel.push({ s: people[0].id, p: 'beside', o: fire ? fire.id : tent.id, text: 'people sitting by the campfire' });
    if (deer) rel.push({ s: deer.id, p: 'at edge of', o: 'clearing', text: 'deer at the edge of the clearing' });
    const { atmosphere, contra } = atmosphereFor(lk, camping ? ['peaceful', 'adventurous', ...(fire ? ['cozy'] : [])] : ['serene', 'quiet', 'peaceful'], ['industrial', 'busy', 'sterile']);
    return {
      context: camping ? `a campsite in a forest clearing ${TIME_PHRASE[lk]}` : `a deer in a quiet forest clearing ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: (fire || tent || deer).id, weather: lk === 'overcast' ? 'overcast' : isDark(lk) ? 'clear night' : 'clear',
      happening: camping
        ? { answer: people.length ? 'People are camping and sitting by their tent' : 'A tent is pitched at a campsite in the forest', accepted: [[['tent', 'camp', 'camping'], ['forest', 'tree', 'clearing', 'wood']], [['person'], ['camp', 'fire', 'sit']]], foils: [{ text: 'Lumberjacks are cutting down trees', credit: 0 }, { text: 'A search party is looking for someone', credit: 0.1 }, { text: 'A deer is grazing in an empty clearing', credit: deer ? 0.4 : 0 }] }
        : { answer: 'A deer stands in a quiet forest clearing', accepted: [[['deer'], ['stand', 'graze', 'forest', 'clearing', 'eat']]], foils: [{ text: 'People are camping in the forest', credit: 0 }, { text: 'Hunters are chasing a deer', credit: 0.1 }, { text: 'The forest is on fire', credit: 0 }] },
      before: camping
        ? [{ text: 'The campers hiked in and pitched the tent', credit: 1 }, { text: 'They gathered wood for a fire', credit: fire ? 0.9 : 0.4 }, { text: 'A helicopter dropped the tent from the sky', credit: 0.05 }, { text: 'A city was demolished here', credit: 0 }]
        : [{ text: 'The deer walked out from between the trees', credit: 1 }, { text: 'The deer heard a noise and stopped', credit: 0.7 }, { text: 'A circus left the deer here', credit: 0 }, { text: 'A car crashed nearby', credit: 0 }],
      after: camping
        ? [{ text: isDark(lk) ? 'The campers go to sleep in the tent' : 'The campers continue their hike or cook food', credit: 1 }, { text: 'The fire is put out', credit: 0.6 }, { text: 'The tent floats away into space', credit: 0 }, { text: 'A train arrives', credit: 0 }]
        : [{ text: 'The deer walks back into the forest', credit: 1 }, { text: 'The deer starts grazing', credit: 0.9 }, { text: 'The deer jumps onto a bus', credit: 0 }, { text: 'Snow falls in summer heat', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a forest', [{ text: camping ? 'A camping trip' : 'An undisturbed wild area', credit: 0.8 }, { text: 'A shopping mall opening', credit: 0 }]),
      statements: [
        ...(tent ? [{ text: `There is a ${tent.color} tent.`, cls: 'observable' }] : []),
        ...(deer ? [{ text: 'A deer is standing at the edge of the clearing.', cls: 'observable' }] : []),
        { text: camping ? 'The campers plan to stay overnight.' : 'The deer is alert to danger.', cls: 'inference' },
        { text: camping ? 'The campers are on their honeymoon.' : 'The deer has a fawn hidden nearby.', cls: 'speculation' },
        { text: 'A path leads through the forest.', cls: 'observable' },
      ],
      extraObjects: ['tree', 'path'],
    };
  },
};

export const beach = {
  id: 'beach', category: 'nature', setting: 'beach', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    if (lk !== 'overcast') S.add('sun', { x: rng.int(120, 780), y: lk === 'midday' ? 50 : 230, w: 80, h: 80, colorHex: lk === 'sunset' ? '#ffcf7a' : '#fff3c4', salience: 'secondary', z: 0 });
    S.water(290, lk === 'sunset' ? '#5a6fa0' : '#3f8fb4', 150);
    S.region('sea', { x: 0, y: 290, w: 960, h: 150, salience: 'primary' });
    S.background(`<path d="M0,430 Q240,410 480,430 T960,425 L960,600 L0,600 z" fill="#e4cf9e"/><path d="M0,430 Q240,410 480,430 T960,425" fill="none" stroke="#f5f1e6" stroke-width="6" opacity="0.8"/>`);
    const umb = rng.bool(0.7) ? S.add('umbrella', { x: rng.int(100, 300), y: 360, w: 170, h: 180, color: rng.pick(['red', 'yellow', 'blue', 'teal', 'pink']), salience: 'primary', z: 5 }) : null;
    const nPeople = rng.int(1, 3);
    const people = [];
    for (let i = 0; i < nPeople; i++) {
      const sitting = umb && i === 0;
      people.push(S.add(rng.bool(0.3) && i > 0 ? 'child' : 'person', { ...personProps(rng), x: sitting ? umb.x + 40 : rng.int(380, 820), y: sitting ? 420 : 370, w: sitting ? 70 : 55, h: sitting ? 140 : 160, pose: sitting ? 'sitting' : 'standing', flip: rng.bool(), salience: 'primary', z: 6 }));
    }
    people.forEach((p) => { if (p.type === 'child') { p.h *= 0.7; p.y += 50; p.label = 'child'; } });
    const dog = rng.bool(0.4) ? S.add('dog', { x: rng.int(500, 760), y: 470, w: 100, h: 70, color: rng.pick(['beige', 'brown', 'black']), flip: rng.bool(), animate: 'animal', salience: 'primary', z: 7 }) : null;
    const ball = rng.bool(0.4) ? S.add('ball', { x: rng.int(420, 700), y: 520, w: 34, h: 34, color: rng.pick(['red', 'yellow', 'blue']), salience: 'secondary', z: 7 }) : null;
    const boat = rng.bool(0.6) ? S.add(rng.bool() ? 'boat' : 'ship', { x: rng.int(500, 800), y: 230, w: 120, h: 75, color: rng.pick(['white', 'red', 'blue']), flip: rng.bool(), salience: 'secondary', z: 1 }) : null;
    const palm = rng.bool(0.5) ? S.add('palm', { x: rng.pick([830, 0]), y: 230, w: 130, h: 300, color: 'green', salience: 'secondary', z: 4 }) : null;
    const nGulls = rng.int(0, 3);
    for (let i = 0; i < nGulls; i++) S.add('bird', { x: rng.int(100, 800), y: rng.int(80, 200), w: 30, h: 14, pose: 'flying', color: 'white', animate: 'animal', salience: 'secondary', z: 3 });
    S.region('beach', { x: 0, y: 430, w: 960, h: 170, salience: 'background' });
    void palm;
    const rel = [{ s: 'sea', p: 'behind', o: 'beach', text: 'sea behind the sandy beach' }];
    if (umb) rel.push({ s: people[0].id, p: 'under', o: umb.id, text: 'person sitting under a beach umbrella' });
    if (dog) rel.push({ s: dog.id, p: 'on', o: 'beach', text: 'dog running on the sand' });
    if (ball && dog) rel.push({ s: dog.id, p: 'near', o: ball.id, text: 'dog near a ball' });
    if (boat) rel.push({ s: boat.id, p: 'on', o: 'sea', text: `${boat.type} out on the sea` });
    const { atmosphere, contra } = atmosphereFor(lk, ['relaxed', 'playful', 'cheerful'], ['tense', 'claustrophobic', 'industrial']);
    return {
      context: `a day at the beach ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'horizontal-band', focalId: umb ? umb.id : people[0].id, weather: lk === 'overcast' ? 'overcast' : 'clear',
      happening: { answer: 'People are relaxing and playing on a beach', accepted: [[['person', 'child'], ['beach', 'relax', 'play', 'sun', 'holiday', 'swim', 'walk']], [['dog'], ['play', 'run', 'ball']]], foils: [{ text: 'A lifeguard rescue is under way', credit: 0.05 }, { text: 'A storm is forcing people to leave', credit: lk === 'overcast' ? 0.2 : 0 }, { text: 'A fishing market is open', credit: 0 }] },
      before: [{ text: 'They arrived at the beach and set up for the day', credit: 1 }, { text: 'Someone went for a swim', credit: 0.6 }, { text: 'The beach was covered in snow', credit: 0 }, { text: 'An office meeting ended here', credit: 0 }],
      after: [{ text: lk === 'sunset' ? 'They pack up and head home as it gets dark' : 'They keep relaxing, swimming or playing', credit: 1 }, { text: dog ? 'The dog chases the ball into the water' : 'Someone goes into the water', credit: 0.8 }, { text: 'A train arrives on the sand', credit: 0 }, { text: 'The sea disappears', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'the seaside', [{ text: 'A summer holiday or day off', credit: 0.8 }, { text: 'A winter blizzard', credit: 0 }]),
      statements: [
        ...(umb ? [{ text: `The umbrella is ${umb.color}.`, cls: 'observable' }] : []),
        { text: `There ${nPeople === 1 ? 'is one person' : `are ${nPeople} people`} on the beach.`, cls: 'observable' },
        { text: 'It is a warm day.', cls: 'inference' },
        { text: 'These people are on their first holiday in years.', cls: 'speculation' },
      ],
      extraObjects: ['sea', 'beach'],
    };
  },
};

export const parkConversation = {
  id: 'park-conversation', category: 'human', setting: 'park', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    S.ground(380, 'green');
    const nClouds = rng.int(1, 3);
    for (let i = 0; i < nClouds; i++) S.add('cloud', { x: rng.int(0, 800), y: rng.int(30, 130), w: 170, h: 60, colorHex: lk === 'sunset' ? '#f7c4a0' : '#ffffff', salience: 'background', z: 0, annotate: i === 0 });
    const trees = rng.int(2, 4);
    for (let i = 0; i < trees; i++) S.add('tree', { x: [30, 760, 250, 600][i], y: 190, w: 170, h: 230, color: 'green', salience: i === 0 ? 'secondary' : 'background', z: 2, annotate: i === 0 });
    S.background(`<path d="M0,520 Q480,450 960,500 L960,560 Q480,510 0,580 z" fill="#c9b68f"/>`);
    const handshake = rng.bool(0.4);
    const a = S.add('person', { ...personProps(rng), x: 360, y: 270, w: 75, h: 220, salience: 'primary', z: 5 });
    const b = S.add('person', { ...personProps(rng), x: 470, y: 275, w: 75, h: 215, flip: true, salience: 'primary', z: 5 });
    if (handshake) S.add('hands', { x: 430, y: 340, w: 40, h: 12, draw: 'shapeLine', color: 'beige', annotate: false, z: 6 });
    const dog = rng.bool(0.6) ? S.add('dog', { x: rng.pick([230, 580]), y: 420, w: 110, h: 75, color: rng.pick(['brown', 'black', 'beige', 'white']), flip: rng.bool(), animate: 'animal', salience: 'secondary', z: 6 }) : null;
    const bench = rng.bool(0.6) ? S.add('bench', { x: 700, y: 420, w: 170, h: 70, color: rng.pick(['brown', 'green']), salience: 'secondary', z: 4 }) : null;
    const bike = rng.bool(0.4) ? S.add('bicycle', { x: 130, y: 420, w: 110, h: 70, color: rng.pick(['red', 'blue', 'yellow']), salience: 'secondary', z: 4 }) : null;
    const kite = rng.bool(0.3) ? S.add('kite', { x: rng.int(600, 820), y: 80, w: 50, h: 80, color: rng.pick(['red', 'yellow', 'blue']), salience: 'secondary', z: 3 }) : null;
    const lake = rng.bool(0.3);
    void bench; void bike; void kite; void lake;
    const rel = [{ s: a.id, p: 'facing', o: b.id, text: handshake ? 'two people shaking hands' : 'two people facing each other, talking' }];
    if (dog) rel.push({ s: dog.id, p: 'near', o: a.id, text: 'dog standing near the people' });
    if (bench) rel.push({ s: bench.id, p: 'right of', o: b.id, text: 'empty bench to the right' });
    const { atmosphere, contra } = atmosphereFor(lk, ['friendly', 'relaxed', 'cheerful'], ['tense', 'lonely', 'hostile']);
    return {
      context: `two people ${handshake ? 'greeting each other' : 'having a conversation'} in a park ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'centered', focalId: a.id, weather: lk === 'overcast' ? 'overcast' : 'clear',
      happening: { answer: handshake ? 'Two people are greeting each other' : 'Two people are having a conversation in the park', accepted: [[['person'], ['talk', 'conversation', 'chat', 'speak', 'meet', 'greet', 'discuss']], [['person'], ['shake', 'handshake', 'hello', 'greet', 'introduce']]], foils: [{ text: 'Two people are arguing angrily', credit: 0.2 }, { text: 'A jogger is running a race', credit: 0 }, { text: 'A picnic is being packed away', credit: 0.1 }] },
      before: [{ text: 'They met by chance or by arrangement in the park', credit: 1 }, { text: dog ? 'One of them was walking the dog' : 'One of them was out for a walk', credit: 0.8 }, { text: 'They were stuck in a lift together', credit: 0.05 }, { text: 'A meteor landed in the park', credit: 0 }],
      after: [{ text: 'They continue talking or walk on together', credit: 1 }, { text: 'They say goodbye and go separate ways', credit: 0.9 }, { text: 'They start a fist fight', credit: 0.05 }, { text: 'They board a ship from the grass', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a public park', [{ text: 'A casual meeting during free time', credit: 0.8 }, { text: 'A formal court hearing', credit: 0 }]),
      statements: [
        { text: 'Two people are standing facing each other.', cls: 'observable' },
        { text: 'They know each other.', cls: 'inference' },
        { text: 'They are colleagues discussing a project.', cls: 'speculation' },
        ...(dog ? [{ text: 'The dog belongs to one of them.', cls: 'inference' }] : []),
      ],
      extraObjects: ['grass', 'path'],
    };
  },
};

export const market = {
  id: 'market', category: 'human', setting: 'street market', indoor: false,
  lightings: ['dawn', 'midday', 'overcast', 'sunset'],
  build(S, rng, lk) {
    S.sky();
    S.add('building', { x: -10, y: 80, w: 980, h: 320, color: rng.pick(['beige', 'white', 'gray']), colorReliable: false, salience: 'background', z: 0, annotate: false });
    S.ground(400, 'gray');
    const stall = S.add('stall', { x: 220, y: 200, w: 420, h: 250, color: rng.pick(['red', 'green', 'blue', 'yellow']), salience: 'primary', z: 3 });
    const vendor = S.add('person', { ...personProps(rng), x: 390, y: 210, w: 70, h: 200, salience: 'primary', z: 2 });
    const nCustomers = rng.int(1, 3);
    const custs = [];
    for (let i = 0; i < nCustomers; i++) custs.push(S.add(i === 2 ? 'child' : 'person', { ...personProps(rng, { holding: i === 0 ? 'bag' : undefined, accent: 'beige' }), x: [680, 120, 780][i], y: i === 2 ? 360 : 280, w: i === 2 ? 55 : 72, h: i === 2 ? 140 : 220, flip: i !== 1, salience: 'primary', z: 6 }));
    const bike = rng.bool(0.4) ? S.add('bicycle', { x: 40, y: 430, w: 110, h: 70, color: rng.pick(['red', 'blue', 'black']), salience: 'secondary', z: 5 }) : null;
    const dog = rng.bool(0.3) ? S.add('dog', { x: 560, y: 470, w: 90, h: 64, color: 'brown', animate: 'animal', salience: 'secondary', z: 7 }) : null;
    const sign = S.add('sign', { x: 660, y: 330, w: 80, h: 120, color: rng.pick(['black', 'green']), text: 'FRESH', salience: 'secondary', z: 4 });
    void bike; void dog; void sign;
    const rel = [{ s: vendor.id, p: 'behind', o: stall.id, text: 'vendor standing behind the fruit stall' }, { s: custs[0].id, p: 'in front of', o: stall.id, text: 'customer in front of the stall' }, { s: 'fruit', p: 'on', o: stall.id, text: 'fruit displayed on the counter' }];
    const { atmosphere, contra } = atmosphereFor(lk, ['lively', 'busy', 'cheerful'], ['lonely', 'sterile', 'solemn']);
    return {
      context: `a vendor selling fruit to customers at a street market ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'centered', focalId: stall.id, weather: lk === 'overcast' ? 'overcast' : 'clear',
      happening: { answer: 'A vendor is selling fruit to customers at a market stall', accepted: [[['person', 'vendor', 'customer'], ['buy', 'sell', 'shop', 'market', 'purchase', 'fruit']]], foils: [{ text: 'A stall is being dismantled after closing', credit: 0.2 }, { text: 'A cooking competition is being judged', credit: 0 }, { text: 'Police are inspecting the stall', credit: 0.05 }] },
      before: [{ text: 'The vendor set up the stall and laid out the fruit', credit: 1 }, { text: 'The customer walked over to look at the fruit', credit: 1 }, { text: 'The fruit grew on the stall overnight', credit: 0 }, { text: 'An airplane delivered the stall', credit: 0 }],
      after: [{ text: 'The customer pays and takes the fruit', credit: 1 }, { text: 'The customer walks on without buying', credit: 0.6 }, { text: 'The vendor flies away', credit: 0 }, { text: 'The stall sinks into the ground', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a local market', [{ text: 'A regular market day', credit: 0.8 }, { text: 'A hospital emergency', credit: 0 }]),
      statements: [
        { text: 'Fruit is displayed on the stall.', cls: 'observable' },
        { text: `The stall awning is striped ${stall.color} and white.`, cls: 'observable' },
        { text: 'The person behind the stall is the seller.', cls: 'inference' },
        { text: 'The seller grows the fruit on their own farm.', cls: 'speculation' },
      ],
      extraObjects: ['fruitbowl'],
    };
  },
};

export const OUTDOOR_TEMPLATES = [street, plaza, mountainLake, forest, beach, parkConversation, market];
