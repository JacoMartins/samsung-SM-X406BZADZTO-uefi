// Indoor scene templates: domestic environments, human interaction at home,
// objects / still life.
import { isDark, TIME_PHRASE, atmosphereFor, circumstanceOptions, personProps } from './common.js';

const side = (rng) => (rng.bool() ? 'left' : 'right');

export const bedroom = {
  id: 'bedroom', category: 'domestic', setting: 'bedroom', indoor: true,
  lightings: ['dawn', 'midday', 'sunset', 'lamplight', 'night'],
  build(S, rng, lk) {
    S.interior(rng.pick(['beige', 'white', 'teal', 'pink']), 'brown', 410);
    const bedColor = rng.pick(['blue', 'red', 'green', 'purple', 'yellow', 'white']);
    const bedX = rng.int(90, 200);
    const win = S.add('window', { x: rng.int(560, 640), y: 80, w: 190, h: 170, color: 'white', colorReliable: false, curtains: rng.pick(['red', 'blue', 'beige', 'green']), salience: 'secondary', z: 1 });
    const bed = S.add('bed', { x: bedX, y: 300, w: 400, h: 170, color: bedColor, salience: 'primary', z: 5 });
    const lampSide = side(rng);
    const lamp = S.add('lamp', { x: lampSide === 'left' ? bedX - 80 : bedX + 420, y: 270, w: 70, h: 160, color: rng.pick(['yellow', 'white', 'teal', 'red']), lit: isDark(lk), salience: 'secondary', z: 6 });
    const hasCat = rng.bool(0.75);
    const cat = hasCat ? S.add('cat', { x: bedX + rng.int(160, 250), y: 318, w: 110, h: 60, pose: 'sleeping', color: rng.pick(['orange', 'black', 'white', 'gray']), animate: 'animal', salience: 'primary', z: 8 }) : null;
    const pic = rng.bool(0.6) ? S.add('picture', { x: bedX + 140, y: 120, w: 130, h: 95, color: rng.pick(['blue', 'green', 'teal']), salience: 'secondary', z: 2 }) : null;
    const rug = rng.bool(0.6) ? S.add('rug', { x: bedX + 60, y: 500, w: 360, h: 70, color: rng.pick(['red', 'blue', 'beige', 'teal']), salience: 'secondary', z: 3 }) : null;
    const plant = rng.bool(0.5) ? S.add('plant', { x: 830, y: 330, w: 90, h: 150, color: 'orange', colorReliable: false, salience: 'secondary', z: 4 }) : null;
    const clock = rng.bool(0.4) ? S.add('clock', { x: 820, y: 110, w: 60, h: 60, color: 'black', salience: 'secondary', z: 2 }) : null;
    const book = rng.bool(0.4) ? S.add('book', { x: bedX + 320, y: 345, w: 55, h: 18, color: rng.pick(['red', 'blue', 'green']), salience: 'secondary', z: 9 }) : null;

    const rel = [{ s: lamp.id, p: 'beside', o: bed.id, text: `lamp beside the bed (${lampSide})` }, { s: win.id, p: 'above', o: bed.id, text: 'window on the wall above the floor, behind the bed area' }];
    if (cat) rel.push({ s: cat.id, p: 'on', o: bed.id, text: 'cat sleeping on the bed' });
    if (pic) rel.push({ s: pic.id, p: 'above', o: bed.id, text: 'picture hanging above the bed' });
    if (rug) rel.push({ s: rug.id, p: 'in front of', o: bed.id, text: 'rug on the floor in front of the bed' });
    if (book) rel.push({ s: book.id, p: 'on', o: bed.id, text: 'book lying on the bed' });

    const { atmosphere, contra } = atmosphereFor(lk, ['quiet', 'calm', 'peaceful', ...(cat ? ['cozy'] : [])], ['busy', 'chaotic', 'tense', 'industrial']);
    return {
      context: `${cat ? 'a cat napping in a quiet bedroom' : 'an empty, tidy bedroom'} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'rule-of-thirds', focalId: cat ? cat.id : bed.id,
      weather: 'n/a (indoor)',
      happening: cat
        ? { answer: 'A cat is napping on a bed', accepted: [[['cat'], ['sleep', 'nap', 'rest', 'lie', 'curl', 'doze', 'snooze', 'relax']], [['cat'], ['bed']]], foils: [{ text: 'Someone is packing a suitcase', credit: 0 }, { text: 'A bedroom is being repainted', credit: 0 }, { text: 'Nothing is happening in an empty bedroom', credit: 0.4 }] }
        : { answer: 'An empty bedroom at rest; nothing is happening', accepted: [[['bed', 'bedroom'], ['empty', 'quiet', 'nobody', 'tidy', 'nothing', 'still', 'made']]], foils: [{ text: 'A cat is napping on a bed', credit: 0 }, { text: 'Someone is packing a suitcase', credit: 0 }, { text: 'A child is jumping on the bed', credit: 0 }] },
      before: cat
        ? [{ text: 'The cat climbed onto the bed and settled down', credit: 1 }, { text: 'Someone made the bed earlier', credit: 0.6 }, { text: 'A storm broke the window', credit: 0 }, { text: 'Guests were dancing in the room', credit: 0 }]
        : [{ text: 'Someone made the bed and left the room', credit: 1 }, { text: 'The room was just repainted', credit: 0.3 }, { text: 'A storm broke the window', credit: 0 }, { text: 'Guests were dancing in the room', credit: 0 }],
      after: cat
        ? [{ text: 'The cat keeps sleeping or wakes and stretches', credit: 1 }, { text: `Someone comes in and ${isDark(lk) ? 'turns off' : 'turns on'} the lamp`, credit: 0.6 }, { text: 'The bed is carried out of the house', credit: 0 }, { text: 'A bus pulls up outside the door', credit: 0 }]
        : [{ text: 'Someone comes in to rest or go to sleep', credit: 1 }, { text: `The light ${isDark(lk) ? 'is switched off' : 'slowly changes'}`, credit: 0.6 }, { text: 'The bed is carried out of the house', credit: 0 }, { text: 'A bus pulls up outside the door', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'home', [{ text: 'A busy morning in an open-plan office', credit: 0 }, { text: 'A hotel room between guests', credit: 0.5 }]),
      statements: [
        { text: `There is a ${bedColor} bed.`, cls: 'observable' },
        { text: `A lamp stands to the ${lampSide} of the bed.`, cls: 'observable' },
        ...(cat ? [{ text: 'The cat feels safe in this room.', cls: 'inference' }, { text: 'The cat belongs to an elderly person who lives alone.', cls: 'speculation' }] : [{ text: 'Nobody is in the room at the moment.', cls: 'observable' }, { text: 'The owner is away on a long holiday.', cls: 'speculation' }]),
        { text: 'This is a private home rather than a shop.', cls: 'inference' },
        { text: 'The person who sleeps here works night shifts.', cls: 'speculation' },
      ],
    };
  },
};

export const livingRoom = {
  id: 'living-room', category: 'domestic', setting: 'living room', indoor: true,
  lightings: ['midday', 'sunset', 'lamplight', 'night'],
  build(S, rng, lk) {
    S.interior(rng.pick(['beige', 'white', 'gray', 'teal']), rng.pick(['brown', 'beige']), 400);
    const sofaColor = rng.pick(['green', 'blue', 'gray', 'red', 'yellow']);
    const sofaX = rng.int(300, 420);
    const tvOn = rng.bool(0.5);
    const shelf = S.add('bookshelf', { x: 40, y: 150, w: 170, h: 280, color: 'brown', colorReliable: false, salience: 'secondary', z: 2 });
    const win = S.add('window', { x: sofaX + 40, y: 70, w: 200, h: 160, color: 'white', colorReliable: false, salience: 'secondary', z: 1 });
    const sofa = S.add('sofa', { x: sofaX, y: 300, w: 300, h: 150, color: sofaColor, salience: 'primary', z: 5 });
    const reading = rng.bool(0.7);
    const person = reading ? S.add('person', { ...personProps(rng), x: sofaX + rng.int(60, 170), y: 245, w: 70, h: 200, pose: 'sitting', salience: 'primary', z: 7 }) : null;
    const book = reading ? S.add('book', { x: person.x + 50, y: 330, w: 40, h: 28, color: rng.pick(['red', 'blue', 'yellow']), salience: 'secondary', z: 8 }) : null;
    const tv = S.add('tv', { x: 760, y: 260, w: 170, h: 130, on: tvOn, salience: 'secondary', z: 4, color: 'black', colorReliable: false });
    const cabinet = S.add('table', { x: 750, y: 390, w: 190, h: 70, color: 'brown', label: 'TV stand', salience: 'secondary', z: 3, annotate: false });
    const hasDog = rng.bool(0.55);
    const dog = hasDog ? S.add('dog', { x: rng.int(240, 420), y: 460, w: 130, h: 90, color: rng.pick(['brown', 'beige', 'black', 'white']), animate: 'animal', flip: rng.bool(), salience: 'primary', z: 9 }) : null;
    const lamp = S.add('lamp', { x: sofaX + 310, y: 260, w: 70, h: 170, color: rng.pick(['white', 'yellow', 'orange']), lit: isDark(lk), salience: 'secondary', z: 6 });
    const mug = rng.bool(0.5) ? S.add('mug', { x: 820, y: 360, w: 26, h: 26, color: rng.pick(['red', 'white', 'blue']), salience: 'secondary', z: 6 }) : null;
    const plant = rng.bool(0.5) ? S.add('plant', { x: 230, y: 340, w: 70, h: 120, color: 'white', colorReliable: false, salience: 'secondary', z: 4 }) : null;
    void cabinet;

    const rel = [{ s: lamp.id, p: 'beside', o: sofa.id, text: 'lamp to the right of the sofa' }, { s: win.id, p: 'above', o: sofa.id, text: 'window above the sofa' }, { s: shelf.id, p: 'left of', o: sofa.id, text: 'bookshelf on the left side of the room' }];
    if (person) rel.push({ s: person.id, p: 'on', o: sofa.id, text: 'person sitting on the sofa reading a book' });
    if (dog) rel.push({ s: dog.id, p: 'in front of', o: sofa.id, text: 'dog on the floor in front of the sofa' });
    if (mug) rel.push({ s: mug.id, p: 'on', o: tv.id, text: 'mug on the TV stand' });

    const { atmosphere, contra } = atmosphereFor(lk, ['calm', 'cozy', 'peaceful'], ['tense', 'chaotic', 'sterile']);
    return {
      context: `${person ? 'a person reading on the sofa' : 'an empty living room'}${dog ? ' with a dog nearby' : ''} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'layered-depth', focalId: person ? person.id : sofa.id, weather: 'n/a (indoor)',
      happening: person
        ? { answer: 'Someone is relaxing on the sofa, reading', accepted: [[['person'], ['read', 'book']], [['person'], ['relax', 'sit', 'rest', 'sofa']]], foils: [{ text: 'Someone is vacuuming the floor', credit: 0 }, { text: 'A family is watching a football match together', credit: tvOn ? 0.2 : 0 }, { text: 'A delivery is being unloaded', credit: 0 }] }
        : { answer: 'An empty living room, nobody is using it', accepted: [[['sofa', 'room'], ['empty', 'nobody', 'quiet', 'nothing']]], foils: [{ text: 'Someone is relaxing on the sofa, reading', credit: 0 }, { text: 'A party is under way', credit: 0 }, { text: 'Movers are carrying out furniture', credit: 0 }] },
      before: person
        ? [{ text: 'The person sat down with a book to relax', credit: 1 }, { text: tvOn ? 'The person turned the TV on' : 'The person turned the TV off', credit: 0.6 }, { text: 'The person ran a marathon in the room', credit: 0 }, { text: 'The room was flooded', credit: 0 }]
        : [{ text: 'Someone tidied the room and left', credit: 1 }, { text: 'The family went out for the evening', credit: 0.7 }, { text: 'The room was flooded', credit: 0 }, { text: 'A concert was held here', credit: 0 }],
      after: person
        ? [{ text: 'They keep reading for a while', credit: 1 }, { text: dog ? 'They get up to take the dog for a walk' : 'They get up to make a drink', credit: 0.7 }, { text: 'The sofa is set on fire', credit: 0 }, { text: 'A train passes through the room', credit: 0 }]
        : [{ text: 'Someone comes in and sits down', credit: 1 }, { text: dog ? 'The dog lies down to sleep' : 'The room stays empty', credit: 0.7 }, { text: 'A train passes through the room', credit: 0 }, { text: 'The ceiling collapses', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'home', [{ text: 'A furniture showroom during opening hours', credit: 0.2 }, { text: 'A hospital waiting area', credit: 0 }]),
      statements: [
        { text: `The sofa is ${sofaColor}.`, cls: 'observable' },
        { text: `The television is switched ${tvOn ? 'on' : 'off'}.`, cls: 'observable' },
        ...(person ? [{ text: 'The person is enjoying their book.', cls: 'inference' }, { text: 'The person is a retired teacher.', cls: 'speculation' }] : []),
        ...(dog ? [{ text: 'The dog lives in this home.', cls: 'inference' }] : []),
        { text: 'The family recently moved into this house.', cls: 'speculation' },
      ],
    };
  },
};

export const kitchen = {
  id: 'kitchen', category: 'domestic', setting: 'kitchen', indoor: true,
  lightings: ['dawn', 'midday', 'lamplight', 'overcast'].filter((k) => k !== 'overcast'),
  build(S, rng, lk) {
    S.interior(rng.pick(['white', 'yellow', 'teal', 'beige']), rng.pick(['gray', 'beige', 'white']), 420);
    const counterColor = rng.pick(['blue', 'green', 'white', 'red', 'gray']);
    const counter = S.add('counter', { x: 40, y: 290, w: 520, h: 170, color: counterColor, salience: 'secondary', z: 3 });
    const fridge = S.add('fridge', { x: 600, y: 170, w: 130, h: 300, color: rng.pick(['white', 'gray', 'red']), salience: 'secondary', z: 3 });
    const win = S.add('window', { x: 170, y: 70, w: 210, h: 150, color: 'white', colorReliable: false, salience: 'secondary', z: 1 });
    const cooking = rng.bool(0.7);
    const person = cooking ? S.add('person', { ...personProps(rng), x: rng.int(150, 330), y: 170, w: 90, h: 290, salience: 'primary', z: 6 }) : null;
    const teapot = S.add('teapot', { x: rng.int(60, 120), y: 240, w: 75, h: 60, color: rng.pick(['red', 'blue', 'yellow', 'white']), salience: 'primary', z: 7 });
    const table = S.add('table', { x: 760, y: 380, w: 180, h: 110, color: 'brown', salience: 'secondary', z: 5 });
    const bowl = S.add('fruitbowl', { x: 800, y: 340, w: 100, h: 50, color: rng.pick(['white', 'blue', 'beige']), salience: 'secondary', z: 6 });
    const chair = rng.bool(0.6) ? S.add('chair', { x: 860, y: 330, w: 70, h: 160, color: 'brown', flip: true, salience: 'secondary', z: 4 }) : null;
    const hasCat = rng.bool(0.35);
    const cat = hasCat ? S.add('cat', { x: 470, y: 470, w: 110, h: 80, color: rng.pick(['orange', 'black', 'gray']), animate: 'animal', salience: 'secondary', z: 8 }) : null;
    const clock = S.add('clock', { x: 470, y: 90, w: 64, h: 64, color: rng.pick(['black', 'red', 'blue']), salience: 'secondary', z: 2 });
    void chair; void clock;
    const rel = [{ s: teapot.id, p: 'on', o: counter.id, text: 'teapot on the kitchen counter' }, { s: bowl.id, p: 'on', o: table.id, text: 'fruit bowl on the table' }, { s: fridge.id, p: 'right of', o: counter.id, text: 'fridge to the right of the counter' }];
    if (person) rel.push({ s: person.id, p: 'in front of', o: counter.id, text: 'person standing at the counter' });
    if (cat) rel.push({ s: cat.id, p: 'on', o: counter.id, text: 'cat on the floor near the counter' });
    void win;
    const { atmosphere, contra } = atmosphereFor(lk, person ? ['homely', 'busy'] : ['quiet', 'calm'], ['solemn', 'dramatic']);
    return {
      context: `${person ? 'someone preparing food or a drink' : 'an empty kitchen'} ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'layered-depth', focalId: person ? person.id : teapot.id, weather: 'n/a (indoor)',
      happening: person
        ? { answer: 'Someone is preparing food or a drink at the counter', accepted: [[['person'], ['cook', 'prepare', 'make', 'tea', 'coffee', 'breakfast', 'food', 'dinner']]], foils: [{ text: 'Someone is repairing the fridge', credit: 0.2 }, { text: 'A family is eating dinner', credit: 0.2 }, { text: 'A dog is being washed', credit: 0 }] }
        : { answer: 'An empty kitchen, nobody is cooking', accepted: [[['kitchen'], ['empty', 'nobody', 'quiet']]], foils: [{ text: 'Someone is preparing food at the counter', credit: 0 }, { text: 'A dinner party is in progress', credit: 0 }, { text: 'Plumbers are fixing a leak', credit: 0 }] },
      before: [{ text: person ? 'The person filled the teapot or took out ingredients' : 'Someone cleaned up after a meal', credit: 1 }, { text: 'Somebody bought fruit for the bowl', credit: 0.6 }, { text: 'The kitchen was demolished', credit: 0 }, { text: 'A horse walked through the room', credit: 0 }],
      after: [{ text: person ? 'They pour a drink or serve the food' : 'Someone comes in to make a drink', credit: 1 }, { text: 'Someone sits at the table to eat', credit: 0.7 }, { text: 'The fridge drives away', credit: 0 }, { text: 'The window turns into a door', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'home', [{ text: 'A restaurant kitchen during the dinner rush', credit: 0.2 }, { text: 'A laboratory experiment', credit: 0 }]),
      statements: [
        { text: `A ${teapot.color} teapot sits on the counter.`, cls: 'observable' },
        { text: 'There is a fruit bowl on the table.', cls: 'observable' },
        ...(person ? [{ text: 'The person is about to make tea.', cls: 'inference' }, { text: 'The person is cooking for a birthday guest.', cls: 'speculation' }] : [{ text: 'Somebody will cook here later today.', cls: 'inference' }]),
        { text: 'The household has three children.', cls: 'speculation' },
      ],
    };
  },
};

export const dinner = {
  id: 'dinner', category: 'human', setting: 'dining room', indoor: true,
  lightings: ['lamplight', 'sunset', 'night'],
  build(S, rng, lk) {
    S.interior(rng.pick(['red', 'beige', 'teal', 'brown']), 'brown', 430);
    const n = rng.int(2, 4);
    const win = S.add('window', { x: 680, y: 70, w: 200, h: 180, color: 'white', colorReliable: false, salience: 'secondary', z: 1 });
    const pic = S.add('picture', { x: 120, y: 90, w: 150, h: 110, color: rng.pick(['green', 'blue', 'yellow']), salience: 'secondary', z: 1 });
    const people = [];
    const xs = [150, 300, 560, 700].slice(0, n);
    xs.forEach((x, i) => people.push(S.add(i < n / 2 ? 'person' : 'person', { ...personProps(rng), x: x + rng.int(-10, 10), y: 230, w: 80, h: 220, pose: 'sitting', flip: x > 450, salience: 'primary', z: 4 })));
    const childAt = n >= 3 && rng.bool(0.5) ? 1 : -1;
    if (childAt >= 0) { const c = people[childAt]; c.type = 'child'; c.label = 'child'; c.h = 160; c.y = 290; c.w = 64; }
    const table = S.add('table', { x: 110, y: 370, w: 720, h: 130, color: rng.pick(['brown', 'white']), salience: 'primary', z: 6 });
    const candles = rng.int(1, 3);
    const candleObjs = [];
    for (let i = 0; i < candles; i++) candleObjs.push(S.add('candle', { x: 420 + i * 40, y: 320, w: 22, h: 52, color: 'white', salience: 'secondary', z: 7 }));
    const plates = xs.map((x) => S.add('plate', { x: x + 10, y: 360, w: 70, h: 16, color: rng.pick(['orange', 'green', 'red']), salience: 'secondary', z: 7, annotate: false }));
    const bottle = rng.bool(0.6) ? S.add('bottle', { x: 360, y: 300, w: 30, h: 72, color: rng.pick(['green', 'red']), salience: 'secondary', z: 7 }) : null;
    const lamp = rng.bool(0.5) ? S.add('lamp', { x: 880, y: 280, w: 60, h: 160, color: 'yellow', lit: true, salience: 'secondary', z: 3 }) : null;
    void win; void pic; void plates; void lamp;
    const rel = [{ s: people[0].id, p: 'at', o: table.id, text: 'people sitting around a dinner table' }, { s: candleObjs[0].id, p: 'on', o: table.id, text: 'candles in the middle of the table' }];
    if (bottle) rel.push({ s: bottle.id, p: 'on', o: table.id, text: 'bottle on the table' });
    people.forEach((p, i) => { if (i % 2 === 0 && people[i + 1]) rel.push({ s: p.id, p: 'facing', o: people[i + 1].id, text: 'diners facing each other across the table' }); });
    const { atmosphere, contra } = atmosphereFor(lk, ['intimate', 'warm', 'festive', 'cozy'], ['lonely', 'sterile', 'tense']);
    const adults = people.filter((p) => p.type === 'person').length;
    return {
      context: `${n} people sharing a meal by candlelight ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'symmetrical', focalId: candleObjs[0].id, weather: 'n/a (indoor)',
      happening: { answer: 'People are sharing a meal together', accepted: [[['person', 'child'], ['eat', 'dinner', 'meal', 'dine', 'food', 'supper']], [['family', 'friends', 'people'], ['together', 'table']]], foils: [{ text: 'A business meeting is being held', credit: 0.2 }, { text: 'People are playing a board game', credit: 0.2 }, { text: 'Someone is cleaning the table', credit: 0 }] },
      before: [{ text: 'Someone cooked and served the food', credit: 1 }, { text: 'The guests arrived and sat down', credit: 1 }, { text: 'Everyone was swimming in the sea', credit: 0 }, { text: 'The table was delivered by truck', credit: 0.1 }],
      after: [{ text: 'They keep eating and talking', credit: 1 }, { text: 'Dessert is served', credit: 0.8 }, { text: 'Everyone leaves to catch a train', credit: 0.1 }, { text: 'The candles are used to start a campfire', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a shared dinner', [{ text: 'A celebration such as a birthday or holiday', credit: 0.6 }, { text: 'A job interview', credit: 0 }]),
      statements: [
        { text: `${n} people are seated at the table.`, cls: 'observable' },
        { text: `There ${candles === 1 ? 'is one candle' : `are ${candles} candles`} on the table.`, cls: 'observable' },
        { text: 'The people know each other well.', cls: 'inference' },
        { text: 'They are celebrating a promotion.', cls: 'speculation' },
        ...(childAt >= 0 ? [{ text: 'This is a family meal.', cls: 'inference' }] : []),
        { text: 'The food was ordered from a restaurant.', cls: 'speculation' },
      ],
      countsOverride: { people: n, adults },
    };
  },
};

export const stillLife = {
  id: 'still-life', category: 'objects', setting: 'tabletop still life', indoor: true,
  lightings: ['dawn', 'midday', 'sunset', 'lamplight'],
  build(S, rng, lk) {
    S.interior(rng.pick(['gray', 'teal', 'beige', 'black']), rng.pick(['brown', 'white']), 360);
    S.background(`<rect x="0" y="360" width="960" height="240" fill="rgba(0,0,0,0.12)"/>`);
    const items = rng.shuffle(['vase', 'fruitbowl', 'bottle', 'mug', 'book', 'candle', 'apple', 'teapot']).slice(0, rng.int(4, 6));
    const slots = rng.shuffle([110, 260, 400, 540, 680, 800]);
    const sizes = { vase: [110, 190], fruitbowl: [170, 90], bottle: [70, 170], mug: [70, 70], book: [150, 40], candle: [40, 120], apple: [70, 75], teapot: [140, 110] };
    const objs = items.map((t, i) => {
      const [w, h] = sizes[t];
      const scale = rng.float(0.85, 1.15);
      const ww = w * scale; const hh = h * scale;
      const x = slots[i] + rng.int(-15, 15) - ww / 2 + 60;
      const props = { x, y: 470 - hh, w: ww, h: hh, color: rng.pick(['red', 'blue', 'yellow', 'green', 'white', 'teal', 'purple']), salience: i < 2 ? 'primary' : 'secondary', z: 5 + (i % 2) };
      if (t === 'vase') props.flowers = rng.pick(['red', 'pink', 'white', 'yellow']);
      if (t === 'candle') props.color = 'white';
      if (t === 'apple') props.color = rng.pick(['red', 'green']);
      if (t === 'fruitbowl') props.colorReliable = true;
      return S.add(t, props);
    });
    const cloth = S.add('table', { x: 40, y: 470, w: 880, h: 130, color: rng.pick(['white', 'beige', 'blue']), label: 'table', salience: 'secondary', z: 4 });
    const sorted = objs.slice().sort((a, b) => a.x - b.x);
    const rel = objs.map((o) => ({ s: o.id, p: 'on', o: cloth.id, text: `${o.type} on the table` }));
    for (let i = 0; i < sorted.length - 1; i++) rel.push({ s: sorted[i].id, p: 'left of', o: sorted[i + 1].id, text: `${sorted[i].type} to the left of the ${sorted[i + 1].type}` });
    const big = objs.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
    const { atmosphere, contra } = atmosphereFor(lk, ['calm', 'quiet', 'serene'], ['chaotic', 'busy', 'energetic']);
    return {
      context: `a still-life arrangement of ${objs.length} objects on a table ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'horizontal-band', focalId: big.id, weather: 'n/a (indoor)',
      happening: { answer: 'Objects are arranged on a table (a still life); nothing is moving', accepted: [[['object', 'arrangement', 'still', 'table', 'vase', 'bottle'], ['table', 'arrange', 'still', 'life', 'display']]], foils: [{ text: 'Someone is setting the table for guests', credit: 0.3 }, { text: 'A shop is holding a sale', credit: 0.1 }, { text: 'A child is playing with toys', credit: 0 }] },
      before: [{ text: 'Someone deliberately arranged the objects', credit: 1 }, { text: 'Someone came back from shopping', credit: 0.4 }, { text: 'The objects fell from the ceiling', credit: 0 }, { text: 'An earthquake shook the room', credit: 0 }],
      after: [{ text: 'The arrangement is photographed or painted', credit: 1 }, { text: 'Someone uses one of the objects', credit: 0.6 }, { text: 'The objects start talking', credit: 0 }, { text: 'A bus drives across the table', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a tabletop', [{ text: 'A photography or painting study', credit: 0.8 }, { text: 'A crime scene investigation', credit: 0 }]),
      statements: [
        { text: `There are ${objs.length} objects on the table.`, cls: 'observable' },
        { text: `The largest object is the ${big.type === 'fruitbowl' ? 'fruit bowl' : big.type}.`, cls: 'observable' },
        { text: 'The objects were arranged on purpose.', cls: 'inference' },
        { text: 'The arrangement belongs to an art student.', cls: 'speculation' },
      ],
    };
  },
};

export const desk = {
  id: 'desk', category: 'objects', setting: 'desk / study', indoor: true,
  lightings: ['midday', 'lamplight', 'night', 'overcast'].filter((k) => k !== 'overcast'),
  build(S, rng, lk) {
    S.interior(rng.pick(['white', 'gray', 'teal', 'beige']), 'brown', 470);
    const deskT = S.add('table', { x: 80, y: 380, w: 800, h: 220, color: rng.pick(['brown', 'white', 'black']), label: 'desk', salience: 'secondary', z: 3 });
    const laptop = S.add('laptop', { x: rng.int(330, 420), y: 255, w: 230, h: 140, color: rng.pick(['gray', 'black', 'white']), salience: 'primary', z: 6 });
    const lamp = S.add('lamp', { x: rng.bool() ? 120 : 720, y: 200, w: 110, h: 185, color: rng.pick(['red', 'yellow', 'white', 'black']), lit: isDark(lk), salience: 'primary', z: 5 });
    const mug = S.add('mug', { x: lamp.x < 400 ? 660 : 250, y: 335, w: 50, h: 48, color: rng.pick(['white', 'red', 'blue', 'yellow']), salience: 'secondary', z: 7 });
    const nb = rng.int(1, 3);
    const books = [];
    for (let i = 0; i < nb; i++) books.push(S.add('book', { x: lamp.x < 400 ? 760 : 110, y: 360 - i * 22, w: 120 - i * 10, h: 22, color: rng.pick(['red', 'blue', 'green', 'yellow', 'purple']), salience: 'secondary', z: 6 }));
    const plant = rng.bool(0.6) ? S.add('plant', { x: lamp.x < 400 ? 560 : 290, y: 250, w: 70, h: 135, color: 'white', colorReliable: false, salience: 'secondary', z: 5 }) : null;
    const clock = rng.bool(0.5) ? S.add('clock', { x: 440, y: 80, w: 80, h: 80, color: 'black', salience: 'secondary', z: 2 }) : null;
    const pic = rng.bool(0.5) ? S.add('picture', { x: lamp.x < 400 ? 650 : 140, y: 70, w: 160, h: 110, color: rng.pick(['blue', 'green']), salience: 'secondary', z: 2 }) : null;
    void plant; void clock; void pic;
    const rel = [{ s: laptop.id, p: 'on', o: deskT.id, text: 'laptop on the desk' }, { s: lamp.id, p: lamp.x < 400 ? 'left of' : 'right of', o: laptop.id, text: `desk lamp to the ${lamp.x < 400 ? 'left' : 'right'} of the laptop` }, { s: mug.id, p: 'beside', o: laptop.id, text: 'mug next to the laptop' }];
    if (nb > 1) rel.push({ s: books[1].id, p: 'on', o: books[0].id, text: 'books stacked on top of each other' });
    const { atmosphere, contra } = atmosphereFor(lk, ['quiet', 'focused', 'calm'], ['festive', 'chaotic']);
    return {
      context: `an unattended work desk with a laptop ${TIME_PHRASE[lk]}`,
      relationships: rel, atmosphere, contra, composition: 'centered', focalId: laptop.id, weather: 'n/a (indoor)',
      happening: { answer: 'A workspace is set up but nobody is working at the moment', accepted: [[['desk', 'laptop', 'workspace', 'office'], ['empty', 'nobody', 'work', 'study', 'break']]], foils: [{ text: 'Someone is typing on the laptop', credit: 0 }, { text: 'A meeting is in progress', credit: 0 }, { text: 'A shop is opening', credit: 0 }] },
      before: [{ text: 'Someone was working or studying here', credit: 1 }, { text: 'Someone made a drink and put it down', credit: 0.8 }, { text: 'A storm destroyed the office', credit: 0 }, { text: 'A horse knocked over the books', credit: 0 }],
      after: [{ text: 'The person returns to continue working', credit: 1 }, { text: `${isDark(lk) ? 'The lamp is switched off for the night' : 'The laptop goes to sleep'}`, credit: 0.6 }, { text: 'The desk is launched into space', credit: 0 }, { text: 'The books become birds', credit: 0 }],
      circumstances: circumstanceOptions(lk, 'a home office', [{ text: 'A study session or remote work day', credit: 0.8 }, { text: 'A wedding reception', credit: 0 }]),
      statements: [
        { text: 'There is a laptop on the desk.', cls: 'observable' },
        { text: `There ${nb === 1 ? 'is one book' : `are ${nb} books`} on the desk.`, cls: 'observable' },
        { text: 'Someone stepped away only briefly.', cls: 'inference' },
        { text: 'The owner is writing a novel.', cls: 'speculation' },
      ],
    };
  },
};

export const INDOOR_TEMPLATES = [bedroom, livingRoom, kitchen, dinner, stillLife, desk];
