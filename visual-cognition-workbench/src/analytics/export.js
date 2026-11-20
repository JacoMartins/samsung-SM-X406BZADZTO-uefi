// Export: full session JSON (configuration, stimuli ids, timing, responses,
// scores) and a flat one-row-per-response CSV for statistical software.
import { generate } from '../dataset/dataset.js';

export function sessionToJSON(session, analytics) {
  const { items, ...summary } = analytics || {};
  return JSON.stringify({ ...session, analytics: analytics ? summary : undefined, stimulusAnnotations: Object.fromEntries(session.trials.map((t) => [t.stimulusId, safeAnn(t.stimulusId)])) }, null, 2);
}

function safeAnn(id) { try { return generate(id).annotation; } catch { return null; } }

const COLUMNS = ['session_id', 'participant_id', 'seed', 'trial_index', 'practice', 'module', 'stimulus_id', 'category', 'template', 'pool',
  'exposure_requested_ms', 'exposure_target_frames', 'exposure_actual_ms', 'exposure_onset_ts', 'exposure_offset_ts', 'frame_ms', 'dropped_frames', 'timing_quality',
  'fixation_actual_ms', 'mask_actual_ms', 'delay_requested_ms', 'delay_actual_ms',
  'question_id', 'question_key', 'question_type', 'dimension', 'subscale', 'epistemic', 'detail_level', 'serial_position', 'prompt',
  'response', 'confidence', 'question_shown_ts', 'first_input_ts', 'submit_ts', 'latency_ms', 'first_input_latency_ms', 'since_offset_ms',
  'score', 'correct', 'skipped', 'sdt_hits', 'sdt_misses', 'sdt_false_alarms', 'sdt_correct_rejections', 'score_detail'];

function cell(v) {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function describeResponse(q, r) {
  if (!r || r.skipped) return '';
  switch (q.type) {
    case 'mcq': return q.options.find((o) => o.id === r.optionId)?.label ?? '';
    case 'multi': return (r.selected || []).map((id) => q.options.find((o) => o.id === id)?.label).filter(Boolean).join(' | ');
    case 'judgments': return q.items.map((it) => `${it.text} => ${r.answers?.[it.id] ?? ''}`).join(' | ');
    case 'grid': return `region ${Number(r.cell) + 1}`;
    default: return r.text ?? r.value ?? '';
  }
}

export function sessionToCSV(session) {
  const rows = [COLUMNS.join(',')];
  for (const t of session.trials) {
    for (const q of t.questions) {
      const r = t.responses.find((x) => x.questionId === q.id);
      const s = t.scores.find((x) => x.questionId === q.id);
      if (!r) continue;
      const e = t.exposure || {};
      rows.push([
        session.id, session.participantId, session.seed, t.index, t.practice, t.module, t.stimulusId, t.category, t.template, t.pool,
        t.condition.exposureMs, e.targetFrames, e.actualMs, e.onsetTs, e.offsetTs, e.frameMs, e.droppedFrames, e.quality,
        e.fixationActualMs, e.maskActualMs, t.condition.delayMs, t.retention?.actualMs,
        q.id, q.key, q.type, q.dimension, q.subscale, q.epistemic, q.detail, r.serial, q.prompt,
        describeResponse(q, r.response), r.confidence, r.tShown, r.tFirstInput, r.tSubmit, r.latencyMs, r.firstInputLatencyMs, r.sinceOffsetMs,
        s?.score, s?.correct, s?.skipped, s?.sdt?.hits, s?.sdt?.misses, s?.sdt?.falseAlarms, s?.sdt?.correctRejections, s?.detail,
      ].map(cell).join(','));
    }
  }
  return rows.join('\r\n');
}

export async function download(filename, text, type = 'application/json') {
  const native = globalThis.__vcwNative;
  if (native) {
    try {
      const copy = await native.saveFile(filename, text);
      notify(copy ? `Saved to Documents/VisualCognition/${filename}` : `Exported ${filename}`);
    } catch (e) { notify(`Export failed: ${e?.message || e}`); }
    return;
  }
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function notify(msg) {
  if (typeof document === 'undefined') return;
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 3500);
}
