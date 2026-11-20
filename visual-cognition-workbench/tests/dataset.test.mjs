import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, generate, selectStimuli, CATEGORIES } from '../src/dataset/dataset.js';
import { Rng } from '../src/core/rng.js';
import { CONCEPTS } from '../src/scoring/lexicon.js';

test('every catalog entry generates valid SVG and annotation', () => {
  for (const pool of ['training', 'assessment']) {
    for (const e of catalog(pool)) {
      const { svg, annotation: a } = generate(e);
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), e.id);
      assert.equal(a.id, e.id);
      assert.ok(CATEGORIES[a.category], `${e.id} category`);
      for (const o of a.objects) assert.ok(CONCEPTS[o], `${e.id}: unknown concept ${o}`);
      for (const inst of a.instances) assert.ok(inst.cell >= 0 && inst.cell <= 8, `${e.id}: cell`);
    }
  }
});

test('generation is deterministic', () => {
  const a = generate('A-street-007'); const b = generate({ ...catalog('assessment').find((e) => e.id === 'A-street-007') });
  assert.equal(a.svg, b.svg);
});

test('training and assessment pools are disjoint and cover all categories', () => {
  const t = new Set(catalog('training').map((e) => e.id));
  const a = catalog('assessment');
  assert.ok(a.every((e) => !t.has(e.id)));
  assert.deepEqual(new Set(a.map((e) => e.category)), new Set(Object.keys(CATEGORIES)));
});

test('selection never repeats and honours exclusions', () => {
  const rng = new Rng(3);
  const exclude = new Set(['A-bedroom-000', 'A-kitchen-001']);
  const s = selectStimuli({ pool: 'assessment', categories: ['domestic', 'urban'], n: 20, rng, exclude });
  assert.equal(s.length, 20);
  assert.equal(new Set(s.map((e) => e.id)).size, 20);
  assert.ok(s.every((e) => !exclude.has(e.id) && ['domestic', 'urban'].includes(e.category)));
});

test('interfaces carry planted issues and absent alternatives', () => {
  for (const e of catalog('assessment').filter((x) => x.category === 'interface')) {
    const { ui } = generate(e).annotation;
    assert.ok(ui.issues.length >= 2 && ui.issues.length <= 3);
    assert.ok(ui.absentIssues.length >= 3);
    assert.ok(ui.issues.every((i) => !ui.absentIssues.includes(i)));
  }
});
