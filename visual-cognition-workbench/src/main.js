// Application bootstrap and hash router.
import { clear } from './ui/dom.js';
import { store } from './core/store.js';
import { loadExternalManifest } from './dataset/dataset.js';
import { app } from './ui/app-state.js';
import { homeView } from './ui/views/home.js';
import { setupView } from './ui/views/setup.js';
import { runView } from './ui/views/run.js';
import { resultsView } from './ui/views/results.js';
import { datasetView } from './ui/views/dataset.js';
import { methodView } from './ui/views/method.js';

const root = document.getElementById('app');

function route() {
  if (app.onLeave && !location.hash.startsWith('#/run/')) { app.onLeave(); app.onLeave = null; }
  const [, name = '', id] = location.hash.replace(/^#/, '').split('/');
  clear(root);
  window.scrollTo(0, 0);
  document.querySelectorAll('.topnav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (name || 'home')));
  const titles = { '': 'Sessions', setup: 'New session', run: 'Testing', results: 'Results', dataset: 'Dataset', method: 'Method' };
  document.title = `${titles[name] ?? 'Workbench'} · Visual Cognition Workbench`;
  try {
    if (name === 'setup') setupView(root);
    else if (name === 'run' && id) runView(root, id).catch(fail);
    else if (name === 'results' && id) resultsView(root, id);
    else if (name === 'dataset') datasetView(root);
    else if (name === 'method') methodView(root);
    else homeView(root);
  } catch (e) { fail(e); }
  root.focus({ preventScroll: true });
}

function fail(e) {
  console.error(e);
  document.body.classList.remove('testing');
  root.innerHTML = '';
  const p = document.createElement('div'); p.className = 'page narrow';
  p.innerHTML = '<h1>Something went wrong</h1><p class="muted">Your session data saved so far is kept in this browser. Details:</p>';
  const pre = document.createElement('pre'); pre.className = 'json'; pre.textContent = String(e?.stack || e);
  p.append(pre); root.append(p);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.setPrefs({ theme: next });
});

window.addEventListener('hashchange', route);
loadExternalManifest().finally(route);
