// Architecture, transportation, photography and graphic-design templates.
import { isDark, TIME_PHRASE, atmosphereFor, circumstanceOptions, personProps } from './common.js';

export const facade = {
  id: 'civic-facade', category: 'architecture', setting: 'civic building / museum', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'bluehour', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    const n = rng.pick([4, 6, 8]);
    S.ground(500, 'gray');
    const colColor = rng.pick(['white', 'beige', 'gray']);
    const cols = S.add('columns', { x: 200, y: 110, w: 560, h: 400, count: n, color: colColor, salience: 'primary', z: 3 });
    const dome = rng.bool(0.4) ? S.add('dome', { x: 380, y: 50, w: 200, h: 80, color: rng.pick(['green', 'gray', 'teal']), salience: 'secondary', z: 2 }) : null;
    const flag = rng.bool(0.6) ? S.add('flag', { x: rng.pick([110, 820]), y: 120, w: 70, h: 300, color: rng.pick(['red', 'blue', 'green']), salience: 'secondary', z: 3 }) : null;
    const trees = rng.bool(0.6);
    if (trees) { S.add('tree', { x: 20, y: 300, w: 160, h: 220, color: 'green', salience: 'secondary', z: 4 }); S.add('tree', { x: 790, y: 300, w: 160, h: 220, color: 'green', salience: 'secondary', z: 4, annotate: false }); }
    const nPeople = rng.int(0, 3);
    for (let i = 0; i < nPeople; i++) S.add('person', { ...personProps(rng), x: rng.int(240, 700), y: 470 + rng.int(0, 20), w: 34, h: 100, flip: rng.bool(), salience: 'secondary', z: 6 });
    const birds = rng.bool(0.4) ? rng.int(2, 4) : 0;
    for (let i = 0; i < birds; i++) S.add('bird', { x: rng.int(150, 800), y: rng.int(30, 90), w: 26, h: 12, pose: 'flying', color: 'black', animate: 'animal', salience: 'secondary', z: 5 });
    const rel = [{ s: 'steps', p: 'in front of', o: cols.id, text: 'wide steps leading up to the columns' }];
    if (dome) rel.push({ s: dome.id, p: 'on top of', o: cols.id, text: 'dome on top of the building' });
    if (flag) rel.push({ s: flag.id, p: 'beside', o: cols.id, text: 'flag beside the entrance' });
    if (nPeople) rel.push({ s: 'person', p: 'on', o: 'steps', text: 'small figures on the steps, showing the scale of the building' });
    const { atmosphere, contra } = atmosphereFor(lk, ['solemn', 'majestic', 'formal'], ['playful', 'cozy', 'chaotic']);
    return {
      context: `the symmetrical columned facade of a civic building ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'symmetrical', focalId: cols.id, weather: lk === 'overcast' ? 'overcast' : 'clear',
      happening: { answer: nPeople ? 'A few visitors walk in front of a large public building' : 'A grand public building stands quietly', accepted: [[['columns', 'building', 'museum', 'facade'], ['stand', 'visit', 'entrance', 'front', 'grand', 'large']]], foils: [{ text: 'A building is being demolished', credit: 0 }, { text: 'A rock concert is under way', credit: 0 }, { text: 'Crowds are queueing for an event', credit: nPeople > 2 ? 0.3 : 0 }] },
      before: [{ text: 'Visitors arrived to see the building', credit: nPeople ? 1 : 0.5 }, { text: 'The building opened for the day', credit: 0.8 }, { text: 'The building was built yesterday', credit: 0 }, { text: 'A flood covered the steps', credit: 0 }],
      after: [{ text: 'People go inside or walk past', credit: 1 }, { text: 'The building closes for the evening', credit: 0.6 }, { text: 'The columns walk away', credit: 0 }, { text: 'A ship docks at the steps', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a civic building', [{ text: 'An ordinary visiting day at a museum or public institution', credit: 0.8 }, { text: 'A private bedroom', credit: 0 }]),
      statements: [
        { text: `The facade has ${n} columns.`, cls: 'observable' },
        { text: 'The building is symmetrical.', cls: 'observable' },
        { text: 'This is an important public building.', cls: 'inference' },
        { text: 'It was designed by a famous architect in 1850.', cls: 'speculation' },
      ],
      extraObjects: ['building'],
    };
  },
};

export const riverBridge = {
  id: 'river-bridge', category: 'architecture', setting: 'riverside with bridge', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'bluehour', 'night'],
  build(S, rng, lk) {
    S.sky();
    const sky = [];
    let x = -20;
    while (x < 980) { const w = rng.int(60, 130); const h = rng.int(100, 230); sky.push(S.add('building', { x, y: 330 - h, w, h, color: rng.pick(['gray', 'blue', 'purple']), colorReliable: false, litWindows: isDark(lk), seed: sky.length, salience: 'background', z: 1, annotate: sky.length === 0 })); x += w + rng.int(4, 20); }
    if (rng.bool(0.5)) S.add('tower', { x: rng.int(100, 750), y: 80, w: 90, h: 250, color: 'gray', salience: 'secondary', z: 1 });
    S.water(330, isDark(lk) ? '#1f3050' : '#46779e', 270);
    S.region('river', { x: 0, y: 330, w: 960, h: 270, salience: 'primary' });
    const arches = rng.int(3, 5);
    const bColor = rng.pick(['beige', 'gray', 'red', 'brown']);
    const bridge = S.add('bridge', { x: -20, y: 260, w: 1000, h: 170, arches, color: bColor, salience: 'primary', z: 3 });
    const nBoats = rng.int(0, 2);
    const boats = [];
    for (let i = 0; i < nBoats; i++) boats.push(S.add(rng.bool() ? 'boat' : 'ship', { x: rng.int(80, 760), y: 450 + i * 40, w: 150, h: 90, color: rng.pick(['red', 'white', 'yellow', 'blue']), flip: rng.bool(), salience: 'secondary', z: 5 }));
    const nPeople = rng.int(0, 3);
    for (let i = 0; i < nPeople; i++) S.add('person', { ...personProps(rng), x: rng.int(80, 860), y: 210, w: 22, h: 60, flip: rng.bool(), salience: 'secondary', z: 4 });
    const birds = rng.bool(0.5) ? rng.int(2, 5) : 0;
    for (let i = 0; i < birds; i++) S.add('bird', { x: rng.int(100, 850), y: rng.int(40, 160), w: 28, h: 12, pose: 'flying', color: isDark(lk) ? 'black' : 'black', animate: 'animal', salience: 'secondary', z: 6 });
    const sl = rng.bool(0.5) ? S.add('streetlight', { x: rng.int(100, 800), y: 160, w: 40, h: 110, lit: isDark(lk), salience: 'secondary', z: 4 }) : null;
    void sl;
    const rel = [{ s: bridge.id, p: 'over', o: 'river', text: `bridge with ${arches} arches spanning the river` }, { s: sky[0].id, p: 'behind', o: bridge.id, text: 'city skyline behind the bridge' }];
    boats.forEach((b) => rel.push({ s: b.id, p: 'on', o: 'river', text: `${b.type} on the river in front of the bridge` }));
    if (nPeople) rel.push({ s: 'person', p: 'on', o: bridge.id, text: 'people walking on the bridge' });
    const { atmosphere, contra } = atmosphereFor(lk, ['calm', 'urban', 'elegant'], ['claustrophobic', 'chaotic']);
    return {
      context: `an arched stone bridge across a city river ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'horizontal-band', focalId: bridge.id, weather: isDark(lk) ? 'clear night' : 'clear',
      happening: { answer: nBoats ? 'Boats move along a river beneath a city bridge' : 'A calm river flows under an old city bridge', accepted: [[['bridge'], ['river', 'water', 'cross', 'span', 'arch']], [['boat', 'ship'], ['river', 'sail', 'float', 'pass']]], foils: [{ text: 'The bridge is collapsing', credit: 0 }, { text: 'A rowing race is finishing', credit: nBoats ? 0.15 : 0 }, { text: 'A traffic jam blocks the motorway', credit: 0 }] },
      before: [{ text: nBoats ? 'The boat came along the river from upstream' : 'The river flowed on as usual', credit: 1 }, { text: 'People started crossing the bridge', credit: 0.6 }, { text: 'The river was dry desert', credit: 0 }, { text: 'An earthquake destroyed the city', credit: 0 }],
      after: [{ text: nBoats ? 'The boat passes under the bridge' : 'A boat comes into view', credit: 1 }, { text: 'Lights come on along the river', credit: isDark(lk) ? 0.4 : 0.7 }, { text: 'The bridge folds up like paper', credit: 0 }, { text: 'Snow buries the city in a minute', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a city riverside', [{ text: 'A typical day in an old European-style city', credit: 0.6 }, { text: 'A desert expedition', credit: 0 }]),
      statements: [
        { text: `The bridge has ${arches} arches.`, cls: 'observable' },
        { text: 'There is a city skyline in the background.', cls: 'observable' },
        { text: 'The bridge is old.', cls: 'inference' },
        { text: 'The bridge is the oldest in the country.', cls: 'speculation' },
      ],
    };
  },
};

export const busStop = {
  id: 'bus-stop', category: 'transportation', setting: 'bus stop', indoor: false,
  lightings: ['dawn', 'midday', 'overcast', 'sunset', 'night'],
  build(S, rng, lk) {
    S.sky();
    S.add('building', { x: -10, y: 100, w: 400, h: 300, color: rng.pick(['beige', 'gray', 'red']), colorReliable: false, litWindows: isDark(lk), seed: 2, salience: 'background', z: 0 });
    S.add('building', { x: 560, y: 60, w: 420, h: 340, color: rng.pick(['gray', 'white', 'teal']), colorReliable: false, litWindows: isDark(lk), seed: 7, salience: 'background', z: 0, annotate: false });
    S.background('<rect x="0" y="400" width="960" height="70" fill="#b9b4a8"/><rect x="0" y="470" width="960" height="130" fill="#4a4d52"/><rect x="0" y="466" width="960" height="6" fill="#8c877c"/>');
    S.region('road', { x: 0, y: 470, w: 960, h: 130, salience: 'background' });
    const arriving = rng.bool(0.7);
    const busColor = rng.pick(['red', 'yellow', 'blue', 'green', 'white']);
    const fromRight = rng.bool();
    const bus = arriving ? S.add('bus', { x: fromRight ? 520 : -60, y: 330, w: 480, h: 200, color: busColor, flip: !fromRight, salience: 'primary', z: 6 }) : null;
    const shelter = S.add('shelter', { x: fromRight ? 150 : 520, y: 230, w: 300, h: 200, color: rng.pick(['green', 'red', 'blue', 'gray']), salience: 'primary', z: 3 });
    const sign = S.add('sign', { x: shelter.x - 60, y: 260, w: 60, h: 160, color: rng.pick(['blue', 'red', 'green']), text: 'BUS', salience: 'secondary', z: 4 });
    const nWaiting = rng.int(1, 4);
    const waiting = [];
    for (let i = 0; i < nWaiting; i++) waiting.push(S.add(i === 3 ? 'child' : 'person', { ...personProps(rng, rng.bool(0.35) ? { holding: rng.pick(['bag', 'phone']) } : {}), x: shelter.x + 20 + i * 68, y: i === 3 ? 330 : 270, w: 58, h: i === 3 ? 120 : 175, flip: fromRight ? false : true, salience: 'primary', z: 5 }));
    const sl = S.add('streetlight', { x: fromRight ? 470 : 30, y: 150, w: 70, h: 260, lit: isDark(lk), salience: 'secondary', z: 4 });
    const bin = rng.bool(0.5) ? S.add('trashcan', { x: shelter.x + 310, y: 360, w: 38, h: 52, color: rng.pick(['green', 'gray']), salience: 'secondary', z: 4 }) : null;
    const raining = lk === 'overcast' && rng.bool(0.5);
    if (raining) S.rain(80);
    void sl; void bin;
    const rel = [{ s: waiting[0].id, p: 'at', o: shelter.id, text: 'people waiting at the bus shelter' }, { s: sign.id, p: 'beside', o: shelter.id, text: 'bus-stop sign beside the shelter' }];
    if (bus) rel.push({ s: bus.id, p: 'approaching', o: shelter.id, text: 'bus pulling in towards the stop' });
    const { atmosphere, contra } = atmosphereFor(lk, ['everyday', 'busy', ...(raining ? ['gloomy'] : [])], ['romantic', 'majestic', 'festive']);
    return {
      context: `${bus ? 'a bus arriving at a stop where' : 'a bus stop where'} ${nWaiting} ${nWaiting === 1 ? 'person waits' : 'people wait'} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: bus ? bus.id : shelter.id, weather: raining ? 'rainy' : lk === 'overcast' ? 'overcast' : isDark(lk) ? 'clear night' : 'clear',
      happening: bus
        ? { answer: 'A bus is arriving at a stop where people are waiting', accepted: [[['bus'], ['arrive', 'pull', 'approach', 'stop', 'come']], [['person'], ['wait', 'board', 'queue', 'stand']]], foils: [{ text: 'A bus has broken down and passengers are stranded', credit: 0.15 }, { text: 'People are protesting about bus fares', credit: 0 }, { text: 'A bus is leaving an empty stop', credit: 0.3 }] }
        : { answer: 'People are waiting at a bus stop for a bus', accepted: [[['person'], ['wait', 'bus', 'stop', 'queue']]], foils: [{ text: 'A bus is arriving at the stop', credit: 0 }, { text: 'People are leaving a concert', credit: 0 }, { text: 'A taxi rank is closing', credit: 0.1 }] },
      before: [{ text: 'The people walked to the stop and waited', credit: 1 }, { text: 'They checked the timetable', credit: 0.7 }, { text: 'The bus fell from the sky', credit: 0 }, { text: 'They swam across a lake', credit: 0 }],
      after: bus
        ? [{ text: 'The bus stops and the people get on', credit: 1 }, { text: 'Passengers get off the bus', credit: 0.8 }, { text: 'The bus drives past without stopping', credit: 0.3 }, { text: 'The bus turns into a boat', credit: 0 }]
        : [{ text: 'A bus arrives and they get on', credit: 1 }, { text: 'Someone gives up and walks away', credit: 0.5 }, { text: 'A helicopter lands at the stop', credit: 0 }, { text: 'The shelter flies away', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a city bus stop', [{ text: 'A normal commute or errand by public transport', credit: 0.8 }, { text: 'A ski holiday in the mountains', credit: 0 }]),
      statements: [
        { text: `${nWaiting} ${nWaiting === 1 ? 'person is' : 'people are'} at the stop.`, cls: 'observable' },
        ...(bus ? [{ text: `The bus is ${busColor}.`, cls: 'observable' }, { text: 'The bus is about to stop here.', cls: 'inference' }] : []),
        { text: 'The people are going to work.', cls: 'inference' },
        { text: 'One of them is going to a job interview.', cls: 'speculation' },
      ],
      extraObjects: ['sidewalk'],
    };
  },
};

export const trainStation = {
  id: 'train-station', category: 'transportation', setting: 'train station', indoor: false,
  lightings: ['dawn', 'midday', 'overcast', 'night'],
  build(S, rng, lk) {
    S.sky();
    S.background(`<rect x="0" y="0" width="960" height="70" fill="#3c4048"/><rect x="0" y="70" width="960" height="12" fill="#2b2e34"/>` +
      Array.from({ length: 6 }, (_, i) => `<rect x="${i * 190 + 60}" y="80" width="14" height="330" fill="#3c4048"/>`).join(''));
    const trainColor = rng.pick(['red', 'blue', 'white', 'yellow', 'green']);
    const train = S.add('train', { x: rng.int(-200, 0), y: 180, w: 1100, h: 210, color: trainColor, salience: 'primary', z: 3 });
    S.background(`<rect x="0" y="390" width="960" height="30" fill="#2a2a2a"/>`);
    S.ground(410, 'gray');
    S.background(`<rect x="0" y="410" width="960" height="10" fill="#e8c24a"/>`);
    S.region('sidewalk', { x: 0, y: 410, w: 960, h: 190, salience: 'background' });
    const clock = S.add('clock', { x: rng.int(380, 520), y: 90, w: 70, h: 70, color: 'black', salience: 'secondary', z: 5 });
    const nPeople = rng.int(1, 4);
    const people = [];
    for (let i = 0; i < nPeople; i++) people.push(S.add('person', { ...personProps(rng, rng.bool(0.5) ? { holding: 'bag', accent: rng.pick(['brown', 'black', 'red']) } : {}), x: 80 + i * 200 + rng.int(-30, 30), y: 340, w: 70, h: 210, flip: rng.bool(), salience: 'primary', z: 6 }));
    const bench = rng.bool(0.6) ? S.add('bench', { x: rng.int(600, 760), y: 480, w: 180, h: 70, color: rng.pick(['brown', 'green', 'gray']), salience: 'secondary', z: 5 }) : null;
    const sign = S.add('sign', { x: 800, y: 100, w: 120, h: 50, color: 'blue', text: 'PLATFORM 2', salience: 'secondary', z: 5, annotate: true });
    const bin = rng.bool(0.4) ? S.add('trashcan', { x: 30, y: 490, w: 40, h: 56, color: 'gray', salience: 'secondary', z: 5 }) : null;
    void bench; void sign; void bin;
    const rel = [{ s: train.id, p: 'beside', o: 'sidewalk', text: 'train stopped beside the platform' }, { s: people[0].id, p: 'on', o: 'sidewalk', text: 'passengers standing on the platform' }, { s: clock.id, p: 'above', o: train.id, text: 'clock hanging above the platform' }];
    const { atmosphere, contra } = atmosphereFor(lk, ['busy', 'transitional', 'everyday'], ['intimate', 'serene']);
    return {
      context: `passengers on a station platform beside a stationary train ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'horizontal-band', focalId: train.id, weather: lk === 'overcast' ? 'overcast' : 'n/a (covered platform)',
      happening: { answer: 'Passengers are boarding or leaving a train at the platform', accepted: [[['person', 'passenger'], ['board', 'wait', 'get', 'leave', 'arrive', 'travel', 'platform']], [['train'], ['station', 'platform', 'stop', 'arrive', 'depart']]], foils: [{ text: 'A train has derailed', credit: 0 }, { text: 'Workers are repairing the tracks', credit: 0.05 }, { text: 'The station is closed and empty', credit: 0 }] },
      before: [{ text: 'The train pulled into the station', credit: 1 }, { text: 'Passengers bought tickets', credit: 0.7 }, { text: 'The train sailed across the sea', credit: 0 }, { text: 'The platform was a football pitch', credit: 0 }],
      after: [{ text: 'The doors close and the train departs', credit: 1 }, { text: 'The passengers walk to the exit', credit: 0.8 }, { text: 'The train takes off like a plane', credit: 0 }, { text: 'The clock falls on the train', credit: 0.02 }],
      circumstances: circumstanceOptions(lk, 'a railway station', [{ text: 'An ordinary journey by train', credit: 0.8 }, { text: 'A farm harvest', credit: 0 }]),
      statements: [
        { text: `The train is ${trainColor}.`, cls: 'observable' },
        { text: 'There is a clock above the platform.', cls: 'observable' },
        { text: 'The train is about to leave.', cls: 'inference' },
        { text: 'The train is running late today.', cls: 'speculation' },
      ],
    };
  },
};

export const harbour = {
  id: 'harbour', category: 'transportation', setting: 'harbour', indoor: false,
  lightings: ['dawn', 'midday', 'sunset', 'bluehour', 'overcast', 'night'],
  build(S, rng, lk) {
    S.sky();
    const lighthouse = rng.bool(0.6) ? S.add('lighthouse', { x: rng.pick([60, 800]), y: 120, w: 90, h: 240, lit: isDark(lk) || lk === 'bluehour', salience: 'primary', z: 2 }) : null;
    const crane = rng.bool(0.5) ? S.add('crane', { x: lighthouse && lighthouse.x < 400 ? 640 : 200, y: 80, w: 240, h: 280, color: rng.pick(['yellow', 'red', 'orange']), salience: 'secondary', z: 1 }) : null;
    const nCont = crane ? rng.int(2, 4) : 0;
    for (let i = 0; i < nCont; i++) S.add('container', { x: crane.x + i * 70, y: 320, w: 64, h: 40, color: rng.pick(['red', 'blue', 'green', 'orange']), salience: 'secondary', z: 2, annotate: i === 0 });
    S.water(360, isDark(lk) ? '#1d2e4f' : '#3f789f', 240);
    S.region('sea', { x: 0, y: 360, w: 960, h: 240, salience: 'primary' });
    const dock = S.add('dock', { x: rng.int(300, 520), y: 470, w: 420, h: 130, color: 'brown', salience: 'secondary', z: 4 });
    const nBoats = rng.int(1, 3);
    const boats = [];
    for (let i = 0; i < nBoats; i++) boats.push(S.add(i === 0 && rng.bool(0.4) ? 'ship' : 'boat', { x: [120, 560, 760][i] + rng.int(-30, 30), y: 330 + i * 30, w: i === 0 ? 220 : 120, h: i === 0 ? 130 : 100, color: rng.pick(['red', 'white', 'blue', 'yellow', 'green']), flip: rng.bool(), salience: i === 0 ? 'primary' : 'secondary', z: 3 + i }));
    const nGulls = rng.int(1, 4);
    for (let i = 0; i < nGulls; i++) S.add('bird', { x: rng.int(150, 800), y: rng.int(60, 220), w: 30, h: 14, pose: 'flying', color: 'white', animate: 'animal', salience: 'secondary', z: 5 });
    const person = rng.bool(0.6) ? S.add('person', { ...personProps(rng), x: dock.x + rng.int(40, 300), y: 360, w: 45, h: 120, flip: rng.bool(), salience: 'secondary', z: 5 }) : null;
    const rel = [{ s: boats[0].id, p: 'on', o: 'sea', text: `${boats[0].type} moored in the harbour` }, { s: dock.id, p: 'over', o: 'sea', text: 'wooden pier over the water' }];
    if (lighthouse) rel.push({ s: lighthouse.id, p: 'behind', o: boats[0].id, text: 'lighthouse at the harbour entrance' });
    if (person) rel.push({ s: person.id, p: 'on', o: dock.id, text: 'person standing on the pier' });
    if (crane) rel.push({ s: crane.id, p: 'above', o: 'container', text: 'crane above shipping containers' });
    const { atmosphere, contra } = atmosphereFor(lk, crane ? ['industrial', 'busy'] : ['calm', 'nostalgic'], ['cozy', 'intimate']);
    return {
      context: `a working harbour with ${nBoats === 1 ? 'a boat' : 'boats'} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: (lighthouse || boats[0]).id, weather: lk === 'overcast' ? 'overcast' : isDark(lk) ? 'clear night' : 'clear',
      happening: { answer: 'Boats are moored in a harbour', accepted: [[['boat', 'ship'], ['harbour', 'harbor', 'moor', 'dock', 'port', 'anchor']]], foils: [{ text: 'A ship is sinking', credit: 0 }, { text: 'A regatta is starting', credit: 0.1 }, { text: 'The harbour is frozen over', credit: 0 }] },
      before: [{ text: 'The boats came back into port', credit: 1 }, { text: crane ? 'A cargo ship was unloaded' : 'Fishermen unloaded their catch', credit: 0.6 }, { text: 'The sea drained away', credit: 0 }, { text: 'A herd of horses swam in', credit: 0 }],
      after: [{ text: 'A boat leaves the harbour', credit: 1 }, { text: isDark(lk) ? 'The harbour stays quiet until morning' : 'More cargo or passengers are loaded', credit: 0.8 }, { text: 'The lighthouse walks into the sea', credit: 0 }, { text: 'The pier turns into a road', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a seaport', [{ text: 'A normal working day at the port', credit: 0.8 }, { text: 'A library reading hour', credit: 0 }]),
      statements: [
        { text: `There ${nBoats === 1 ? 'is one boat' : `are ${nBoats} boats`} in the water.`, cls: 'observable' },
        ...(lighthouse ? [{ text: 'A red-and-white lighthouse stands at the edge of the harbour.', cls: 'observable' }] : []),
        { text: 'The harbour is used for fishing or trade.', cls: 'inference' },
        { text: 'The harbour master is retiring this week.', cls: 'speculation' },
      ],
    };
  },
};

export const silhouette = {
  id: 'silhouette', category: 'photography', setting: 'hilltop at dusk', indoor: false,
  lightings: ['sunset', 'dawn', 'bluehour'],
  build(S, rng, lk) {
    S.sky();
    const sun = S.add('sun', { x: rng.int(300, 600), y: 300, w: 140, h: 140, colorHex: lk === 'bluehour' ? '#f4d6c4' : '#ffd37a', salience: 'secondary', z: 0 });
    S.background(`<path d="M0,430 Q300,340 600,400 T960,380 L960,600 L0,600 z" fill="#1d1416"/>`);
    S.region('mountain', { x: 0, y: 340, w: 960, h: 260, salience: 'background' });
    const posePeople = rng.int(1, 2);
    const ppl = [];
    for (let i = 0; i < posePeople; i++) ppl.push(S.add('person', { ...personProps(rng), x: rng.int(240, 360) + i * 90, y: 210 + i * 8, w: 80, h: 200, silhouette: true, colorReliable: false, flip: i === 1, salience: 'primary', z: 6 }));
    const dog = rng.bool(0.35) ? S.add('dog', { x: ppl[ppl.length - 1].x + 100, y: 345, w: 90, h: 60, color: 'black', colorReliable: false, animate: 'animal', salience: 'secondary', z: 6 }) : null;
    if (dog) dog.draw = 'dog';
    const tree = S.add('tree', { x: rng.pick([700, 40]), y: 160, w: 210, h: 260, color: 'black', colorReliable: false, salience: 'secondary', z: 5 });
    tree.color = 'black';
    const nBirds = rng.int(2, 5);
    for (let i = 0; i < nBirds; i++) S.add('bird', { x: rng.int(120, 800), y: rng.int(60, 200), w: 30, h: 14, pose: 'flying', color: 'black', animate: 'animal', salience: 'secondary', z: 6 });
    const rel = [{ s: ppl[0].id, p: 'in front of', o: sun.id, text: 'figure silhouetted against the setting sun' }, { s: tree.id, p: 'beside', o: ppl[0].id, text: 'lone tree on the hill' }];
    if (ppl.length > 1) rel.push({ s: ppl[0].id, p: 'beside', o: ppl[1].id, text: 'two figures standing side by side' });
    if (dog) rel.push({ s: dog.id, p: 'beside', o: ppl[ppl.length - 1].id, text: 'dog next to the figures' });
    const { atmosphere, contra } = atmosphereFor(lk, ['dramatic', 'contemplative', ...(ppl.length > 1 ? ['romantic'] : ['lonely'])], ['busy', 'sterile', 'chaotic']);
    return {
      context: `${ppl.length > 1 ? 'two figures' : 'a lone figure'} silhouetted on a hilltop against the low sun`,
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: ppl[0].id, weather: 'clear',
      happening: { answer: ppl.length > 1 ? 'Two people stand on a hill watching the sun go down' : 'A person stands alone on a hill watching the low sun', accepted: [[['person'], ['watch', 'stand', 'look', 'view', 'silhouette']], [['sun', 'sunset', 'sunrise'], ['watch', 'look', 'view', 'enjoy']]], foils: [{ text: 'People are running away from a fire', credit: 0 }, { text: 'A hiker is lost and calling for help', credit: 0.1 }, { text: 'A film crew is shooting a scene', credit: 0.2 }] },
      before: [{ text: 'They walked up the hill to see the view', credit: 1 }, { text: 'They were hiking all day', credit: 0.6 }, { text: 'They parachuted onto the hill', credit: 0.05 }, { text: 'They were working in a mine', credit: 0 }],
      after: [{ text: lk === 'dawn' ? 'The sun rises and they continue their walk' : 'It gets dark and they walk back down', credit: 1 }, { text: 'Someone takes a photograph', credit: 0.7 }, { text: 'The sun suddenly rises again at night', credit: 0 }, { text: 'A bus arrives on the hilltop', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a hilltop viewpoint', [{ text: 'A moment of reflection during a walk', credit: 0.8 }, { text: 'A crowded rush hour', credit: 0 }]),
      statements: [
        { text: 'The figures appear completely dark against a bright sky.', cls: 'observable' },
        { text: `There ${ppl.length === 1 ? 'is one figure' : 'are two figures'}.`, cls: 'observable' },
        { text: 'The photo was taken facing the sun.', cls: 'inference' },
        { text: 'The person is thinking about a lost love.', cls: 'speculation' },
      ],
      technique: 'silhouette / backlighting',
    };
  },
};

export const nightRoad = {
  id: 'night-road', category: 'photography', setting: 'road at night (long exposure)', indoor: false,
  lightings: ['night', 'bluehour'],
  build(S, rng, lk) {
    S.sky();
    let x = -10;
    let i = 0;
    while (x < 980) { const w = rng.int(100, 180); const h = rng.int(160, 300); S.add('building', { x, y: 330 - h, w, h, color: rng.pick(['gray', 'blue', 'purple']), colorReliable: false, litWindows: true, seed: i, salience: 'background', z: 1, annotate: i === 0 }); x += w + 6; i++; }
    S.background('<polygon points="0,600 960,600 620,330 340,330" fill="#2c2f36"/><rect x="0" y="330" width="960" height="6" fill="#1c1e22"/>');
    S.region('road', { x: 0, y: 330, w: 960, h: 270, salience: 'primary' });
    const trails = rng.int(3, 6);
    let tr = '';
    for (let k = 0; k < trails; k++) {
      const red = k % 2 === 0;
      const x0 = red ? 380 + k * 12 : 520 + k * 14;
      const x1 = red ? 80 + k * 50 : 900 - k * 50;
      tr += `<path d="M${x0},335 Q${(x0 + x1) / 2},${430 + k * 8} ${x1},600" fill="none" stroke="${red ? '#ff4b3a' : '#fff2c0'}" stroke-width="${3 + k % 3}" opacity="0.9"/>`;
    }
    S.post.push(tr);
    S.region('car', { x: 300, y: 335, w: 360, h: 265, salience: 'primary' });
    const lights = rng.int(2, 4);
    for (let k = 0; k < lights; k++) S.add('streetlight', { x: k % 2 ? 680 + k * 40 : 220 - k * 40, y: 150 + k * 20, w: 70, h: 200 - k * 10, lit: true, salience: 'secondary', z: 3, annotate: k === 0 });
    const tl = rng.bool(0.5) ? S.add('trafficlight', { x: 610, y: 230, w: 36, h: 110, state: 'green', color: 'green', salience: 'secondary', z: 3 }) : null;
    const moon = lk === 'night' && rng.bool(0.5) ? S.add('moon', { x: rng.int(100, 800), y: 40, w: 50, h: 50, salience: 'secondary', z: 0 }) : null;
    void tl; void moon;
    const rel = [{ s: 'light trails', p: 'along', o: 'road', text: 'streaks of red tail-lights and white headlights following the road' }, { s: 'building', p: 'beside', o: 'road', text: 'lit buildings lining the road' }];
    const { atmosphere, contra } = atmosphereFor(lk, ['energetic', 'dynamic', 'urban'], ['cozy', 'rustic', 'serene']);
    return {
      context: 'a long-exposure photograph of traffic at night, cars reduced to light trails',
      relationships: rel, atmosphere, contra, composition: 'leading-lines', focalId: null, focalCell: 7, weather: 'clear night',
      happening: { answer: 'Traffic moving along a road at night, blurred into light trails', accepted: [[['car', 'traffic', 'light'], ['trail', 'streak', 'blur', 'move', 'drive', 'long', 'exposure']], [['road'], ['night', 'traffic']]], foils: [{ text: 'Fireworks over a city', credit: 0.1 }, { text: 'A power cut in a city', credit: 0 }, { text: 'An empty road at night with no traffic', credit: 0.2 }] },
      before: [{ text: 'A camera on a tripod opened its shutter for several seconds', credit: 1 }, { text: 'Cars started their evening journeys', credit: 0.6 }, { text: 'A meteor shower lit the road', credit: 0 }, { text: 'Snow covered the road', credit: 0 }],
      after: [{ text: 'More cars keep passing through', credit: 1 }, { text: 'Traffic thins out later in the night', credit: 0.8 }, { text: 'The buildings fly away', credit: 0 }, { text: 'The road becomes a river', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a city road', [{ text: 'Evening commuting traffic', credit: 0.8 }, { text: 'A forest picnic', credit: 0 }]),
      statements: [
        { text: 'There are red and white streaks of light on the road.', cls: 'observable' },
        { text: 'The image was made with a long exposure.', cls: 'inference' },
        { text: 'The photographer won a prize for this image.', cls: 'speculation' },
        { text: 'Cars were moving when the picture was taken.', cls: 'inference' },
      ],
      technique: 'long exposure',
    };
  },
};

export const portraitDof = {
  id: 'portrait-dof', category: 'photography', setting: 'outdoor portrait', indoor: false,
  lightings: ['midday', 'sunset', 'dawn', 'overcast'],
  build(S, rng, lk) {
    S.sky();
    S.ground(380, 'green');
    for (let i = 0; i < 5; i++) S.add(rng.bool() ? 'tree' : 'pine', { x: i * 200 - 30 + rng.int(-20, 20), y: 160, w: 180, h: 240, color: 'green', blur: 2, salience: 'background', z: 1, annotate: i === 0 });
    const bgPeople = rng.int(0, 2);
    for (let i = 0; i < bgPeople; i++) S.add('person', { ...personProps(rng), x: rng.pick([120, 760]) + rng.int(-40, 40), y: 300, w: 40, h: 110, blur: 2, salience: 'background', z: 2 });
    const bike = rng.bool(0.4) ? S.add('bicycle', { x: rng.pick([60, 760]), y: 370, w: 130, h: 80, color: rng.pick(['red', 'blue', 'yellow']), blur: 1, salience: 'secondary', z: 2 }) : null;
    const main = S.add('person', { ...personProps(rng), x: rng.pick([300, 520]), y: 120, w: 170, h: 520, salience: 'primary', z: 5 });
    const holding = rng.bool(0.4) ? S.add('mug', { x: main.x + 130, y: 300, w: 44, h: 44, color: rng.pick(['white', 'red', 'yellow']), salience: 'secondary', z: 6 }) : null;
    const flowers = rng.bool(0.5) ? rng.int(2, 5) : 0;
    for (let i = 0; i < flowers; i++) S.add('flower', { x: rng.int(30, 900), y: 520, w: 30, h: 60, color: rng.pick(['red', 'yellow', 'white']), salience: 'secondary', z: 7, annotate: i === 0 });
    void bike;
    const rel = [{ s: main.id, p: 'in front of', o: 'tree', text: 'sharp subject in front of a blurred background' }];
    if (holding) rel.push({ s: holding.id, p: 'held by', o: main.id, text: 'person holding a cup' });
    const { atmosphere, contra } = atmosphereFor(lk, ['intimate', 'calm', 'personal'], ['chaotic', 'industrial']);
    return {
      context: 'a portrait with a sharp subject against a softly blurred park background (shallow depth of field)',
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: main.id, weather: lk === 'overcast' ? 'overcast' : 'clear',
      happening: { answer: 'A person is posing for a portrait in a park', accepted: [[['person'], ['pose', 'portrait', 'photo', 'stand', 'picture']]], foils: [{ text: 'A person is running from danger', credit: 0 }, { text: 'A crowd is watching a show', credit: 0 }, { text: 'Someone is waiting for a friend in a park', credit: 0.5 }] },
      before: [{ text: 'A photographer asked them to pose', credit: 1 }, { text: 'They were walking in the park', credit: 0.7 }, { text: 'They climbed out of a submarine', credit: 0 }, { text: 'They finished a night shift in a mine', credit: 0.05 }],
      after: [{ text: 'The photographer takes more shots', credit: 1 }, { text: 'They walk on through the park', credit: 0.7 }, { text: 'The trees become sharp and walk closer', credit: 0 }, { text: 'They jump into a volcano', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a park', [{ text: 'A planned portrait or photo session', credit: 0.8 }, { text: 'An emergency evacuation', credit: 0 }]),
      statements: [
        { text: 'The background is blurred while the person is sharp.', cls: 'observable' },
        { text: `The person is wearing ${main.color}.`, cls: 'observable' },
        { text: 'The photo was taken with a wide-aperture lens.', cls: 'inference' },
        { text: 'This photo is for a dating profile.', cls: 'speculation' },
      ],
      technique: 'shallow depth of field',
    };
  },
};

export const poster = {
  id: 'poster', category: 'graphic-design', setting: 'poster / graphic composition', indoor: true,
  lightings: ['midday'],
  build(S, rng, lk) {
    const style = rng.pick(['geometric', 'minimalist', 'retro', 'playful']);
    const palettes = {
      geometric: { bg: 'white', marks: ['red', 'blue', 'yellow', 'black'] },
      minimalist: { bg: rng.pick(['white', 'beige']), marks: ['black', rng.pick(['red', 'blue'])] },
      retro: { bg: 'beige', marks: ['orange', 'brown', 'teal', 'yellow'] },
      playful: { bg: rng.pick(['pink', 'yellow']), marks: ['purple', 'teal', 'red', 'white'] },
    };
    const pal = palettes[style];
    S.background(`<rect width="960" height="600" fill="${pal.bg === 'white' ? '#efede6' : pal.bg === 'beige' ? '#e9dcc1' : pal.bg === 'pink' ? '#f0bcd0' : '#f2d98a'}"/>`);
    const shapes = [];
    const nShapes = style === 'minimalist' ? rng.int(1, 2) : rng.int(3, 6);
    const kinds = style === 'retro' ? ['shapeArc', 'shapeCircle', 'shapeLine'] : style === 'playful' ? ['shapeCircle', 'shapeTriangle', 'shapeSquare'] : ['shapeCircle', 'shapeSquare', 'shapeTriangle', 'shapeLine'];
    const left = rng.bool();
    const cells = rng.shuffle([[540, 70], [700, 260], [560, 380], [760, 60], [780, 400], [600, 200]]).map(([x, y]) => [left ? x : x - 500, y]);
    for (let i = 0; i < nShapes; i++) {
      const k = rng.pick(kinds);
      const [x, y] = cells[i];
      const size = i === 0 ? rng.int(200, 260) : rng.int(70, 150);
      let w = k === 'shapeLine' ? size * 1.4 : size;
      const lo = left ? 500 : 30; const hi = left ? 930 : 460;
      const xx = Math.max(lo, Math.min(x, hi - w));
      w = Math.min(w, hi - xx);
      const o = { x: xx, y: Math.min(y, 600 - size - 20), w, h: k === 'shapeLine' ? 18 : k === 'shapeArc' ? size / 2 : size, color: pal.marks[i % pal.marks.length], salience: i === 0 ? 'primary' : 'secondary', z: 3 + i, stroke: 22 };
      if (k === 'shapeSquare' && style === 'geometric' && rng.bool(0.5)) o.rotate = 15;
      shapes.push(S.add(k, o));
    }
    const words = rng.pick([['FORM', 'AND', 'FIELD'], ['NORTH', 'LIGHT'], ['SIGNAL'], ['OPEN', 'STUDIO'], ['SOFT', 'MACHINE'], ['TIDE', 'LINES']]);
    const tx = left ? 70 : 520;
    const title = S.add('textBlock', { x: tx, y: 330, w: 380, h: 70, text: words.join(' '), fontSize: words.join(' ').length > 10 ? 52 : 70, color: style === 'playful' ? 'purple' : 'black', weight: style === 'minimalist' ? 300 : 800, tracking: style === 'minimalist' ? 8 : 0, font: style === 'retro' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif', salience: 'primary', z: 10 });
    const sub = S.add('textBlock', { x: tx, y: 420, w: 300, h: 22, text: rng.pick(['EXHIBITION · 12 — 28 MAY', 'LECTURE SERIES 2026', 'NEW WORK BY THE COLLECTIVE', 'OPENING FRIDAY 7 PM']), fontSize: 20, weight: 500, tracking: 2, color: style === 'playful' ? 'purple' : 'black', salience: 'secondary', z: 10, label: 'subtitle text', colorReliable: false });
    const rule = style !== 'playful' ? S.add('shapeLine', { x: tx, y: 310, w: 120, h: 6, color: pal.marks[0], salience: 'secondary', z: 9 }) : null;
    void sub; void rule;
    const big = shapes[0];
    const rel = [{ s: title.id, p: left ? 'left of' : 'right of', o: big.id, text: `title text on the ${left ? 'left' : 'right'}, large shape on the ${left ? 'right' : 'left'}` }];
    if (shapes[1]) rel.push({ s: shapes[1].id, p: 'smaller than', o: big.id, text: 'smaller shapes grouped around the large one' });
    const atmosByStyle = { geometric: ['bold', 'energetic', 'modern'], minimalist: ['calm', 'serene', 'elegant'], retro: ['nostalgic', 'warm', 'playful'], playful: ['playful', 'cheerful', 'energetic'] };
    const contraByStyle = { geometric: ['gloomy', 'rustic'], minimalist: ['chaotic', 'busy'], retro: ['sterile', 'cold'], playful: ['solemn', 'gloomy'] };
    return {
      context: `a ${style} poster with a text block and ${nShapes} graphic shape${nShapes > 1 ? 's' : ''}`,
      relationships: rel, atmosphere: atmosByStyle[style], contra: contraByStyle[style], composition: style === 'minimalist' ? 'asymmetrical-negative-space' : 'asymmetrical-balance', focalId: big.id,
      designLanguage: style, weather: 'n/a (graphic)', setting: 'poster / graphic composition',
      happening: { answer: 'A poster advertising an event or exhibition', accepted: [[['poster', 'textBlock', 'design', 'graphic'], ['event', 'exhibition', 'poster', 'advert', 'announce', 'design']]], foils: [{ text: 'A photograph of a city street', credit: 0 }, { text: 'A page of a scientific report', credit: 0.1 }, { text: 'A road sign warning drivers', credit: 0 }] },
      before: [{ text: 'A designer composed the layout for an event', credit: 1 }, { text: 'The organisers chose a title', credit: 0.7 }, { text: 'It was painted by a falling ladder', credit: 0 }, { text: 'It was found in a shipwreck', credit: 0 }],
      after: [{ text: 'The poster is printed and displayed', credit: 1 }, { text: 'People attend the advertised event', credit: 0.8 }, { text: 'The shapes rearrange themselves', credit: 0 }, { text: 'It is used as a road map', credit: 0 }],
      circumstances: [{ text: 'Promotion for a cultural event', credit: 1 }, { text: 'An internal tax form', credit: 0 }, { text: 'A product warning label', credit: 0.1 }, { text: 'A decorative print with no event', credit: 0.5 }],
      statements: [
        { text: `The title reads "${words.join(' ')}".`, cls: 'observable' },
        { text: `There ${nShapes === 1 ? 'is one large shape' : `are ${nShapes} shapes`}.`, cls: 'observable' },
        { text: 'The poster advertises a cultural event.', cls: 'inference' },
        { text: 'The designer studied in Switzerland.', cls: 'speculation' },
      ],
    };
  },
};

export const STRUCTURE_TEMPLATES = [facade, riverBridge, busStop, trainStation, harbour, silhouette, nightRoad, portraitDof, poster];
