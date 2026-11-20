import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, scoreObjectRecall, scoreInterpretation, stem } from '../src/scoring/semantic.js';
import { scoreResponse } from '../src/scoring/scorer.js';

const ann = { objects: ['cat', 'bed', 'lamp', 'window'], instances: [{ type: 'cat', salience: 'primary' }, { type: 'bed', salience: 'primary' }, { type: 'lamp', salience: 'secondary' }, { type: 'window', salience: 'secondary' }] };

test('synonyms, typos and stemming are recognised', () => {
  const m = analyze('two kittens on a matress by the widnow').mentions.flatMap((x) => x.keys);
  assert.ok(m.includes('cat') && m.includes('bed') && m.includes('window'));
  assert.equal(stem('sleeping'), stem('sleep'));
});

test('negated mentions are not credited and intrusions are penalised', () => {
  const r = scoreObjectRecall('a cat, no lamp, and a horse', ann);
  assert.ok(r.matched.includes('cat'));
  assert.ok(!r.matched.includes('lamp'));
  assert.deepEqual(r.intrusions, ['horse']);
  assert.ok(r.score < r.recall);
});

test('hypernyms earn partial credit', () => {
  const r = scoreObjectRecall('an animal on some furniture', ann);
  assert.ok(r.partial.includes('cat'));
  assert.ok(r.score > 0 && r.score < 0.5);
});

test('alternative interpretations are all accepted', () => {
  const acc = [[['cat'], ['sleep', 'nap']], [['bedroom'], ['quiet', 'empty']]];
  assert.equal(scoreInterpretation('the cat naps', acc).score, 1);
  assert.equal(scoreInterpretation('a quiet bedroom', acc).score, 1);
  assert.equal(scoreInterpretation('a car race', acc).score, 0);
});

test('multi-select scores hits minus false alarms with SDT counts', () => {
  const q = { type: 'multi', epistemic: 'observable', options: [{ id: 'a', target: true }, { id: 'b', target: true }, { id: 'c', target: false }, { id: 'd', target: false }] };
  const r = scoreResponse(q, { selected: ['a', 'c'] }, ann);
  assert.equal(r.score, 0);
  assert.deepEqual(r.sdt, { hits: 1, misses: 1, falseAlarms: 1, correctRejections: 1 });
  assert.equal(scoreResponse(q, { selected: ['a', 'b'] }, ann).score, 1);
});

test('partial credit for counts, grid adjacency, colours and scales', () => {
  assert.equal(scoreResponse({ type: 'count', truth: { value: 3 } }, { value: 3 }).score, 1);
  assert.ok(Math.abs(scoreResponse({ type: 'count', truth: { value: 3 } }, { value: 2 }).score - 2 / 3) < 1e-9);
  assert.equal(scoreResponse({ type: 'grid', cols: 3, truth: { cells: [{ cell: 4, credit: 1 }] } }, { cell: 0 }).score, 0.5);
  assert.equal(scoreResponse({ type: 'grid', cols: 3, truth: { cells: [{ cell: 0, credit: 1 }] } }, { cell: 8 }).score, 0);
  const cq = { type: 'mcq', colorScored: true, truth: { color: 'red' }, options: [{ id: 'x', value: 'orange' }] };
  assert.equal(scoreResponse(cq, { optionId: 'x' }).score, 0.5);
  assert.ok(Math.abs(scoreResponse({ type: 'scale', truth: { value: 6, tolerance: 3 } }, { value: 5 }).score - 2 / 3) < 1e-9);
});

test('subjective items are flagged as agreement, never correct/incorrect', () => {
  const q = { type: 'multi', epistemic: 'subjective', maxSelect: 3, options: [{ id: 'a', target: true }, { id: 'b', target: true }, { id: 'c', target: false, contra: true }] };
  const r = scoreResponse(q, { selected: ['a'] }, ann);
  assert.equal(r.correct, null);
  assert.equal(r.agreement, true);
});

test('fact/inference/speculation classification gives adjacent partial credit', () => {
  const q = { type: 'judgments', ordinal: ['observable', 'inference', 'speculation'], columns: [], items: [{ id: 'i', answer: 'observable' }, { id: 'j', answer: 'speculation' }] };
  assert.equal(scoreResponse(q, { answers: { i: 'inference', j: 'observable' } }).score, 0.25);
});

test('skipped answers score zero', () => {
  assert.equal(scoreResponse({ type: 'mcq', options: [] }, { skipped: true }).score, 0);
});
