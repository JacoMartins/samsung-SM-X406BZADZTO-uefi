// Scoring engine: maps (question, response) -> score in [0, 1] plus
// auditable detail. Objective items are scored as accuracy; subjective items
// are scored as agreement with the reference annotation and flagged so the
// analytics layer never mixes them into accuracy figures.
import { colorCredit, COLOR_NAMES } from '../dataset/palette.js';
import { scoreObjectRecall, scoreInterpretation, scoreKeywordGroups, analyze, containsTerm, wordCount } from './semantic.js';
import { UI_ISSUES } from '../dataset/ui-generator.js';
import { GRID_COLS } from '../dataset/scene.js';

export const SCORING_VERSION = '1.0.0';

function gridDistance(a, b, cols = GRID_COLS) {
  return Math.max(Math.abs((a % cols) - (b % cols)), Math.abs(Math.floor(a / cols) - Math.floor(b / cols)));
}

const CUE_GROUPS = [
  { id: 'light', terms: ['light', 'lighting', 'sun', 'sunlight', 'shadow', 'glow', 'lamp', 'bright', 'dark', 'dim', 'sunset', 'sunrise', 'night', 'dusk', 'dawn', 'backlit', 'silhouette', 'shade', 'contrast', 'exposure', 'evening', 'morning'] },
  { id: 'color', terms: [...COLOR_NAMES, 'colour', 'color', 'warm', 'cool', 'cold', 'hue', 'saturated', 'muted', 'pastel', 'tone', 'tones', 'palette', 'golden', 'vivid'] },
  { id: 'composition', terms: ['composition', 'centre', 'center', 'centred', 'symmetry', 'symmetrical', 'foreground', 'background', 'line', 'lines', 'space', 'empty', 'frame', 'framing', 'balance', 'layer', 'horizon', 'perspective', 'depth', 'scale', 'small', 'large', 'distance', 'blur', 'focus'] },
];

export function scoreResponse(q, response, annotation) {
  if (!response || response.skipped) return { score: 0, correct: false, skipped: true, detail: { reason: 'no answer' } };
  switch (q.type) {
    case 'mcq': {
      const opt = q.options.find((o) => o.id === response.optionId);
      if (!opt) return { score: 0, correct: false, detail: { reason: 'invalid option' } };
      const score = q.colorScored ? colorCredit(q.truth.color, opt.value) : (opt.credit ?? 0);
      const best = q.colorScored ? q.truth.color : q.options.reduce((a, b) => ((b.credit ?? 0) > (a.credit ?? 0) ? b : a)).label;
      return { score, correct: score >= 0.999, detail: { chosen: opt.label, reference: best } };
    }
    case 'multi': {
      const sel = new Set(response.selected || []);
      const targets = q.options.filter((o) => o.target);
      const foils = q.options.filter((o) => !o.target);
      const hits = targets.filter((o) => sel.has(o.id)).length;
      const fas = foils.filter((o) => sel.has(o.id)).length;
      if (q.epistemic === 'subjective') {
        const contra = q.options.filter((o) => o.contra && sel.has(o.id)).length;
        const denom = Math.min(q.maxSelect || targets.length, targets.length) || 1;
        const score = Math.max(0, Math.min(1, hits / denom - 0.5 * contra / denom));
        return { score, correct: null, agreement: true, detail: { matchedReference: hits, contradictory: contra, selected: [...sel].length } };
      }
      const score = Math.max(0, hits / (targets.length || 1) - fas / (foils.length || 1));
      return { score, correct: hits === targets.length && fas === 0, sdt: { hits, misses: targets.length - hits, falseAlarms: fas, correctRejections: foils.length - fas }, detail: { hits, falseAlarms: fas, targets: targets.map((t) => t.label) } };
    }
    case 'count': {
      const truth = q.truth.value; const v = Number(response.value);
      if (!Number.isFinite(v)) return { score: 0, correct: false, detail: { reason: 'not a number' } };
      const score = Math.max(0, 1 - Math.abs(v - truth) / Math.max(2, truth));
      return { score, correct: v === truth, detail: { answer: v, truth, error: v - truth } };
    }
    case 'grid': {
      const cell = Number(response.cell);
      const cells = q.truth.cells;
      const adj = q.truth.adjacency ?? 0.5;
      let score = 0;
      for (const c of cells) {
        const d = gridDistance(cell, c.cell, q.cols);
        score = Math.max(score, d === 0 ? c.credit : d === 1 ? c.credit * adj : 0);
      }
      return { score, correct: score >= 0.999, detail: { answer: cell, reference: cells.map((c) => c.cell), distance: Math.min(...cells.map((c) => gridDistance(cell, c.cell, q.cols))) } };
    }
    case 'scale': {
      const d = Math.abs(Number(response.value) - q.truth.value);
      const score = Math.max(0, 1 - d / (q.truth.tolerance || 3));
      return { score, correct: d <= 1, detail: { answer: Number(response.value), truth: q.truth.value, error: Number(response.value) - q.truth.value } };
    }
    case 'judgments': {
      const ans = response.answers || {};
      let total = 0; const per = [];
      const sdt = { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 };
      for (const it of q.items) {
        const a = ans[it.id];
        let s = 0;
        if (a === it.answer) s = 1;
        else if (a && q.ordinal) s = Math.abs(q.ordinal.indexOf(a) - q.ordinal.indexOf(it.answer)) === 1 ? 0.5 : 0;
        total += s; per.push({ item: it.text, answer: a ?? null, truth: it.answer, score: s });
        if (q.sdt) {
          if (it.answer === 'present') a === 'present' ? sdt.hits++ : sdt.misses++;
          else a === 'present' ? sdt.falseAlarms++ : sdt.correctRejections++;
        }
      }
      const score = total / q.items.length;
      return { score, correct: score >= 0.999, ...(q.sdt ? { sdt } : {}), detail: { items: per } };
    }
    case 'text': return scoreText(q, response.text || '', annotation);
    default: return { score: 0, correct: null, detail: { reason: `unknown type ${q.type}` } };
  }
}

function scoreText(q, text, annotation) {
  const words = wordCount(text);
  if (!text.trim()) return { score: 0, correct: false, detail: { reason: 'empty' } };
  const mode = q.truth?.mode;
  if (mode === 'objects') {
    const r = scoreObjectRecall(text, annotation);
    return { score: r.score, correct: null, detail: { ...r, words } };
  }
  if (mode === 'interpretation') {
    const r = scoreInterpretation(text, q.truth.accepted || []);
    return { score: r.score, correct: null, detail: { ...r, reference: q.truth.reference, words } };
  }
  if (mode === 'issues') {
    const groups = (q.truth.issues || []).map((id) => ({ id, terms: UI_ISSUES[id].fix }));
    const r = scoreKeywordGroups(text, groups);
    return { score: r.score, correct: null, detail: { ...r, planted: q.truth.issues.map((i) => UI_ISSUES[i].label), words } };
  }
  if (mode === 'cues') {
    const a = analyze(text);
    const groups = CUE_GROUPS.filter((g) => g.terms.some((t) => containsTerm(a, t))).map((g) => g.id);
    const subject = (annotation.objects || []).some((k) => containsTerm(a, k));
    const atm = (annotation.atmosphere || []).filter((w) => containsTerm(a, w));
    const n = groups.length + (subject ? 1 : 0);
    const score = Math.min(1, n / 3 + (atm.length ? 0.15 : 0));
    return { score, correct: null, agreement: true, detail: { cueGroups: groups, mentionsSubject: subject, atmosphereTerms: atm, words, method: 'visual-cue coverage (qualitative)' } };
  }
  return { score: 0, correct: null, detail: { reason: 'no text scoring mode' } };
}
