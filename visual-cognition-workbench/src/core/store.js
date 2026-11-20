// Persistence layer (localStorage). Every access is guarded: storage can be
// unavailable (private mode, blocked site data) and the app must still run.
const NS = 'vcw.v1';

function safeGet(key) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } }
function safeSet(key, val) { try { globalThis.localStorage?.setItem(key, val); return true; } catch { return false; } }
function safeRemove(key) { try { globalThis.localStorage?.removeItem(key); } catch { /* ignore */ } }
const read = (key, fallback) => { const raw = safeGet(`${NS}.${key}`); if (raw == null) return fallback; try { return JSON.parse(raw); } catch { return fallback; } };
const write = (key, value) => safeSet(`${NS}.${key}`, JSON.stringify(value));

export const store = {
  available() { return safeSet(`${NS}.__probe`, '1'); },
  getConfig() { return read('config', null); },
  setConfig(cfg) { return write('config', cfg); },
  getPrefs() { return read('prefs', {}); },
  setPrefs(p) { return write('prefs', { ...this.getPrefs(), ...p }); },

  listSessions() { return read('sessions', []); },
  getSession(id) { return read(`session.${id}`, null); },
  saveSession(session) {
    const ok = write(`session.${session.id}`, session);
    const idx = this.listSessions().filter((s) => s.id !== session.id);
    idx.unshift({ id: session.id, participantId: session.participantId, createdAt: session.createdAt, completedAt: session.completedAt || null, status: session.status, trials: session.trials.filter((t) => !t.practice).length, summary: session.summary || null });
    write('sessions', idx.slice(0, 200));
    return ok;
  },
  deleteSession(id) { safeRemove(`${NS}.session.${id}`); write('sessions', this.listSessions().filter((s) => s.id !== id)); },

  /** Stimuli already shown to a participant (across sessions). */
  getSeen(participantId) { return new Set(read(`seen.${participantId}`, [])); },
  addSeen(participantId, ids) { const s = this.getSeen(participantId); ids.forEach((i) => s.add(i)); write(`seen.${participantId}`, [...s]); },
  clearSeen(participantId) { safeRemove(`${NS}.seen.${participantId}`); },
};
