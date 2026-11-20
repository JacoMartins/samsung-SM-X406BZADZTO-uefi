// Session list, import and demo data.
import { h, fmtDate, pct, toast } from '../dom.js';
import { store } from '../../core/store.js';
import { app } from '../app-state.js';
import { simulateSession } from '../../analytics/simulate.js';
import { defaultConfig, applyPreset } from '../../engine/experiment.js';
import { PARADIGMS } from '../../engine/paradigms.js';

export function homeView(root) {
  const sessions = store.listSessions();
  const page = h('div', { class: 'page' });
  root.append(page);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0]; if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (s.schema !== 'vcw-session/1' || !Array.isArray(s.trials)) throw new Error('Not a workbench session file');
      delete s.analytics; delete s.stimulusAnnotations;
      store.saveSession(s); toast('Session imported'); location.hash = `#/results/${s.id}`;
    } catch (e) { toast(`Import failed: ${e.message}`); }
  });

  page.append(
    h('div', { class: 'page-head' },
      h('div', {}, h('div', { class: 'eyebrow' }, 'Experimental research instrument'), h('h1', {}, 'Visual Cognition Workbench'),
        h('p', {}, 'Measures how much information a person extracts, interprets and retains from images shown for a fraction of a second — separately for recognition, contextual inference, relational reasoning, aesthetic perception and visual working memory. Not a diagnostic test.')),
      h('div', { class: 'row' }, h('a', { class: 'btn primary lg', href: '#/setup' }, 'New session'))),
    h('div', { class: 'grid cols-3' }, [...PARADIGMS.values()].slice(0, 6).map((p) => h('div', { class: 'card flat' }, h('div', { class: 'eyebrow' }, `Module ${p.id}`), h('h3', {}, p.name), h('p', { class: 'muted small', style: { marginTop: '6px', marginBottom: 0 } }, p.summary))),
      h('div', { class: 'card flat' }, h('div', { class: 'eyebrow' }, 'Controls'), h('h3', {}, 'Built for validity'), h('p', { class: 'muted small', style: { marginTop: '6px', marginBottom: 0 } }, 'Seeded randomisation, balanced conditions, fixation and masks, frame-locked exposures with measured timestamps, no repeats, and no feedback until the end.'))),
    h('div', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Sessions'),
        h('div', { class: 'row' },
          h('button', { class: 'btn sm', type: 'button', onclick: () => fileInput.click() }, 'Import JSON'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: demo, title: 'Generates a clearly labelled simulated session to preview the dashboard' }, 'View simulated demo'), fileInput)),
      sessions.length ? h('div', { class: 'card', style: { padding: '6px 14px' } }, h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Participant'), h('th', {}, 'Status'), h('th', { class: 'num' }, 'Trials'), h('th', { class: 'num' }, 'Overall'), h('th', {}, ''))),
        h('tbody', {}, sessions.map((s) => h('tr', {},
          h('td', { class: 'tabular' }, fmtDate(s.createdAt)), h('td', {}, s.participantId),
          h('td', {}, h('span', { class: `badge ${s.status === 'completed' ? 'good' : s.status === 'running' ? 'warn' : ''}` }, { completed: 'Completed', running: 'In progress', aborted: 'Incomplete' }[s.status] || s.status)),
          h('td', { class: 'num' }, s.trials), h('td', { class: 'num' }, s.summary ? pct(s.summary.overall) : '—'),
          h('td', { style: { textAlign: 'right', whiteSpace: 'nowrap' } },
            s.status === 'running' ? h('a', { class: 'btn sm', href: `#/run/${s.id}` }, 'Resume') : null, ' ',
            h('a', { class: 'btn sm', href: `#/results/${s.id}` }, 'Results'), ' ',
            h('button', { class: 'btn ghost sm danger', type: 'button', onclick: () => { if (confirm('Delete this session permanently from this browser?')) { store.deleteSession(s.id); location.reload(); } } }, 'Delete')))))))) :
        h('div', { class: 'notice' }, 'No sessions yet. Sessions are stored only in this browser; export them as JSON or CSV from the results page to keep them.')),
    store.available() ? '' : h('div', { class: 'notice warn section' }, h('strong', {}, 'Browser storage is unavailable. '), 'Sessions will be lost when the page closes. Export results before leaving.'),
  );

  function demo() {
    const s = simulateSession(applyPreset({ ...defaultConfig(), participantId: 'DEMO' }, 'standard'), { seed: 'demo-1' });
    app.active = s;
    location.hash = `#/results/${s.id}`;
  }
}
