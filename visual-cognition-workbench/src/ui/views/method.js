// Method documentation shown in-app.
import { h } from '../dom.js';

export function methodView(root) {
  const S = (title, ...kids) => [h('h2', {}, title), ...kids];
  const P = (t) => h('p', {}, t);
  const L = (...items) => h('ul', {}, items.map((i) => h('li', {}, i)));
  root.append(h('div', { class: 'page narrow method' },
    h('div', { class: 'eyebrow' }, 'Method'), h('h1', {}, 'How the workbench measures'),
    P('The workbench presents unfamiliar images for controlled, brief durations and then asks structured questions. It separates five dimensions — visual recognition, contextual inference, relational reasoning, atmospheric/aesthetic perception and visual working memory — plus an applied interface-analysis module, and examines how performance changes with exposure time and retention delay.'),
    ...S('Trial sequence',
      L('Participant starts the trial (self-paced) → fixation cross for the configured duration plus random jitter.',
        'Image appears in a fixed 960 × 600 CSS-pixel frame (scaled down only if the screen is smaller; the size is recorded) on a neutral surface whose colour does not change with the UI theme.',
        'After the exposure, a random pattern mask replaces the image (configurable), then the screen goes blank.',
        'Memory trials insert a retention interval (immediate, 5 s, 20 s), optionally filled with an odd/even digit task to limit rehearsal.',
        'Questions follow one at a time: free recall first (so that later multiple-choice options cannot cue it), then recognition and judgement questions in random order. Each objective question asks for a confidence rating.')),
    ...S('Timing and its limits',
      P('Before each session the display refresh interval is estimated from 120 requestAnimationFrame intervals. Requested exposures are converted to a whole number of frames. Onset and offset are both drawn inside rAF callbacks, and the difference between their frame timestamps is recorded as the measured exposure, together with dropped frames (intervals longer than 1.5 frames), fixation and mask durations, and whether the page lost visibility.'),
      P('These are browser timestamps, not photodiode measurements. They cannot detect display latency, pixel response time or compositor buffering, and variable-refresh displays add uncertainty. Exposures of only a few frames are therefore approximate; trials with dropped frames are flagged “degraded” and those where the page was hidden are excluded.')),
    ...S('Experimental controls',
      L('Seeded randomisation of stimulus selection, block order, question order and option order: the same configuration and seed reproduce the identical plan.',
        'Exposure × delay conditions are fully crossed and balanced within each module.',
        'Stimuli are drawn without replacement, spread across categories and templates; images seen by a participant code in earlier sessions are excluded.',
        'Separate training (practice) and assessment pools with disjoint seeds.',
        'No correctness feedback until the session ends; fullscreen exits, pauses and visibility changes are logged.')),
    ...S('Stimuli and ground truth',
      P('Stimuli are procedurally generated vector illustrations across ten categories (domestic, urban, nature, human interaction, architecture, transportation, still life, photography techniques, graphic design and website interfaces). Because the same object list both draws the image and produces its annotation, ground truth for objects, counts, colours, positions, sizes, spatial relations, lighting and colour temperature is exact. Narrative annotations (what happened before or next, circumstances) list several answers with graded plausibility.'),
      P('Interface screenshots contain deliberately planted problems (low contrast, misalignment, inconsistent spacing, mixed typography, competing calls to action, small targets, weak hierarchy, text over busy images, hidden navigation, inconsistent buttons, colour clutter), so their presence or absence is known.'),
      P('Researchers can add licensed photographs through data/external/manifest.json using the same annotation schema; questions that need missing fields are skipped automatically.')),
    ...S('Scoring',
      L('Every question is classed as observable (objectively verifiable), inferential (requires contextual interpretation) or subjective (atmosphere, design language, explanations). Subjective items are reported as agreement with a reference annotation and never enter accuracy scores.',
        'Partial credit: neighbouring colours, adjacent grid regions, near counts, plausible alternative interpretations and adjacent fact/inference/speculation categories earn graded credit.',
        'Multi-select and presence questions are scored as hits minus false alarms and summarised with signal-detection d′ and criterion c.',
        'Free text is scored by transparent lexical-semantic matching: tokenisation, light stemming, a synonym and hypernym lexicon (“kitten” = cat; “animal” earns half credit), typo tolerance and negation detection. The evidence used is stored with every score for auditing; unusual but correct phrasing can be under-credited.',
        'Confidence (5 levels) is mapped to an implied probability above chance for each question type, giving calibration bias, Brier score and resolution (Goodman–Kruskal γ).')),
    ...S('Analysis',
      P('Dimension scores are means of item scores with 95% intervals from a cluster bootstrap over images, because questions about the same image are not independent. The exposure curve is modelled on trial-level means with two models — linear in milliseconds and linear in log₂(ms) — to test whether performance falls proportionally with exposure or by a constant amount per halving. Relative strengths and weaknesses are judged only against the participant’s own average, never against population norms.')),
    ...S('What this is not',
      P('This is an experimental cognitive assessment tool. It is not a medical, clinical or psychological diagnostic instrument and does not produce IQ estimates, diagnoses or claims of exceptional ability. Results depend on the stimulus set, display and testing conditions.')),
  ));
}
