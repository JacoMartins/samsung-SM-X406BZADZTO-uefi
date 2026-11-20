# Visual Cognition Workbench

An experimental research instrument for measuring how people extract, interpret
and retain information from images shown for very short durations (100–1000 ms).
**It is not a medical or psychological diagnostic tool**, and it produces no IQ
estimates, diagnoses or claims of exceptional ability.

It scores five dimensions separately — visual recognition, contextual
inference, relational reasoning, atmospheric/aesthetic perception and visual
working memory — plus an applied interface-analysis module, and reports
processing speed, accuracy vs exposure, immediate vs delayed recall, response
times and confidence calibration.

## Running

No build step and no dependencies. Serve the folder over HTTP (ES modules do not
load from `file://`):

```sh
npm start            # node tools/serve.js → http://localhost:8080
npm test             # 24 unit/integration tests (node:test)
node tools/e2e.mjs shots/   # optional headless end-to-end run (needs Playwright; server on :8123)
npm run dataset:manifest    # dump all ground-truth annotations to JSON
```

Sessions are stored in the browser's localStorage. Export each session as JSON
(complete record) or CSV (one row per response) from the results page.
"View simulated demo" on the home page builds a clearly labelled simulated
session for previewing the dashboard.

## Modules

| | Module | Measures | Default exposures |
|---|---|---|---|
| A | Rapid visual recognition | main objects, counts, environment, colour, lighting, secondary details, free description | 100–1000 ms |
| B | Contextual understanding | what is happening, before, after, circumstances, relations, fact vs inference vs speculation | 100–1000 ms |
| C | Visual working memory | object recall, position, relative size, colour, spatial relations, presence/absence | 750 ms × delay 0 / 5 / 20 s |
| D | Atmosphere & aesthetics | atmosphere, colour temperature, light quality, composition, focal point, design language, explanation | 250–1000 ms |
| E | Visual hierarchy & interfaces | page type, focal point, navigation, hierarchy, planted usability problems, suggested improvements | 250–1000 ms |

## Experimental controls

- Seeded randomisation of stimulus selection, block order, question order and
  option order; config + seed reproduce the identical plan.
- Exposure × delay conditions fully crossed and balanced within each module.
- No image repetition within a session, and images already seen by a participant
  code are excluded in later sessions. Separate training (practice) and
  assessment pools.
- Fixation cross with random jitter, optional backward pattern mask, fixed
  960 × 600 stimulus frame on a neutral surface that does not change with the
  UI theme, fullscreen mode, self-paced trial start plus fixed inter-trial
  interval, optional odd/even filler task during memory delays.
- Free recall is always asked before recognition questions so options cannot
  cue it. No correctness feedback until the session ends.

### Timing

Display refresh is estimated from 120 `requestAnimationFrame` intervals.
Exposures are converted to whole frames (100 ms = 6 frames at 60 Hz, 14 frames =
97.2 ms at 144 Hz). Onset and offset are drawn inside rAF callbacks and the
difference between their frame timestamps is stored as the measured exposure,
along with dropped frames, fixation and mask durations, and page visibility.
These are browser timestamps, not photodiode measurements: they cannot see
display latency or compositor buffering, so very short exposures are
approximate. Trials with dropped frames are flagged *degraded*; trials where the
page was hidden are excluded.

## Dataset

740 assessment and 118 training stimuli generated deterministically from their
ids: 22 scene templates across domestic, urban, nature, human interaction,
architecture, transportation, still life, photography and graphic design, plus
a synthetic website/app generator. Because the same object list draws the image
and produces the annotation, ground truth for objects, counts, colours,
positions, sizes, spatial relations, lighting and colour temperature is exact.
Narrative fields list several answers with graded plausibility. Interface
screenshots carry 2–3 deliberately planted problems out of eleven types.

The stimuli are illustrations, not photographs. Licensed photographs can be
added through `data/external/manifest.json` (see `data/external/README.md`).

## Scoring

- Every question is classed **observable**, **inferential** or **subjective**.
  Subjective items (atmosphere, design language, explanations) are reported as
  agreement with a reference and never enter accuracy scores.
- Partial credit for neighbouring colours, adjacent grid regions, near counts,
  plausible alternative interpretations and adjacent fact/inference/speculation
  categories.
- Multi-select and presence questions: hits − false alarms, with d′ and
  criterion c.
- Free text: transparent lexical-semantic matching (stemming, synonym and
  hypernym lexicon, typo tolerance, negation detection). The evidence is stored
  with every score so it can be checked. It is not a language model, so unusual
  but correct wording can be under-credited.
- Confidence (5 levels) is mapped to a chance-adjusted probability, giving
  calibration bias, Brier score and resolution (Goodman–Kruskal γ).
- Dimension scores use 95% cluster-bootstrap intervals over images. The
  exposure curve is fitted with linear-in-ms and linear-in-log₂(ms) models to
  test whether performance falls in proportion to exposure time.

## Architecture

```
src/
  core/        rng (seeded PRNG, balanced sequences), store (localStorage)
  dataset/     palette, drawables, scene builder, templates/, ui-generator, dataset (pools, selection, external images)
  engine/      paradigms (registry), experiment (config, planning, recording), presentation (rAF timing, masks)
  questions/   question-bank (per-module generators from annotations)
  responses/   collector (question UI, timing of display / first input / submit)
  scoring/     lexicon, semantic matching, scorer
  analytics/   stats, analytics, report, export, simulate
  ui/          dom, charts (SVG), views/ (home, setup, run, results, dataset, method)
```

To add a paradigm, call `registerParadigm()` in `src/engine/paradigms.js` with
its categories, default conditions and a question builder added to
`BUILDERS` in `src/questions/question-bank.js`. Planning, presentation,
scoring, analytics and export pick it up without changes.
