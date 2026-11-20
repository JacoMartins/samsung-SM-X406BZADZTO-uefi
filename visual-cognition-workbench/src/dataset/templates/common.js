// Shared helpers for scene templates.
export const isDark = (k) => ['night', 'lamplight', 'bluehour'].includes(k);

export const TIME_PHRASE = {
  dawn: 'early in the morning', midday: 'around midday', sunset: 'at sunset', bluehour: 'at dusk',
  night: 'at night', overcast: 'on an overcast day', lamplight: 'in the evening',
};

/** Atmosphere adjectives contributed by lighting (reference annotation). */
export const LIGHT_ATMOS = {
  dawn: ['calm', 'fresh', 'serene'], midday: ['bright', 'cheerful', 'energetic'], sunset: ['warm', 'nostalgic', 'romantic'],
  bluehour: ['melancholic', 'calm', 'mysterious'], night: ['quiet', 'mysterious', 'lonely'], overcast: ['gloomy', 'subdued', 'calm'],
  lamplight: ['cozy', 'intimate', 'warm'],
};

/** Adjectives that contradict a lighting condition. */
export const LIGHT_CONTRA = {
  dawn: ['tense', 'chaotic'], midday: ['gloomy', 'mysterious'], sunset: ['sterile', 'cold'], bluehour: ['energetic', 'festive'],
  night: ['bright', 'energetic'], overcast: ['festive', 'bright'], lamplight: ['sterile', 'cold'],
};

export const ATMOSPHERE_VOCAB = [
  'calm', 'cozy', 'quiet', 'lively', 'busy', 'tense', 'lonely', 'cheerful', 'melancholic', 'mysterious', 'romantic', 'energetic',
  'serene', 'gloomy', 'festive', 'nostalgic', 'dramatic', 'sterile', 'warm', 'cold', 'playful', 'solemn', 'intimate', 'chaotic',
  'bright', 'subdued', 'fresh', 'majestic', 'industrial', 'peaceful',
];

export const DESIGN_LANGUAGES = ['minimalist', 'geometric', 'organic', 'retro', 'brutalist', 'playful', 'corporate', 'editorial'];

export function circumstanceOptions(lightKey, place, extra = []) {
  const byTime = {
    dawn: 'An early morning before the day gets busy', midday: 'An ordinary day in full daylight', sunset: 'The end of the day as the sun goes down',
    bluehour: 'The quiet period just after sunset', night: 'Late at night after dark', overcast: 'A grey, cloudy day', lamplight: 'An evening indoors with the lights on',
  };
  const opposite = {
    dawn: 'Late at night after dark', midday: 'Late at night after dark', sunset: 'An early morning before the day gets busy',
    bluehour: 'An ordinary day in full daylight', night: 'An ordinary day in full daylight', overcast: 'Late at night after dark', lamplight: 'An ordinary day in full daylight',
  };
  return [
    { text: `${byTime[lightKey]} at ${place}`, credit: 1 },
    { text: `${opposite[lightKey]} at ${place}`, credit: 0.25 },
    ...extra,
  ];
}

export function atmosphereFor(lightKey, base = [], contra = []) {
  const atm = [...new Set([...base, ...(LIGHT_ATMOS[lightKey] || [])])];
  const con = [...new Set([...contra, ...(LIGHT_CONTRA[lightKey] || [])])].filter((a) => !atm.includes(a));
  return { atmosphere: atm, contra: con };
}

export const PEOPLE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink', 'white', 'black'];
export const SKIN = ['#f1c7a5', '#d9a47e', '#b57c55', '#8a5a3c', '#5e3d2a'];
export const HAIR = ['#2a1d16', '#4a3222', '#8a5a2b', '#c9a15d', '#1b1b1b', '#9a9a9a'];

export function personProps(rng, extra = {}) {
  const color = rng.pick(PEOPLE_COLORS);
  return { color, pants: rng.pick(['blue', 'black', 'gray', 'brown', 'beige']), skin: rng.pick(SKIN), hair: rng.pick(HAIR), animate: 'person', ...extra };
}
