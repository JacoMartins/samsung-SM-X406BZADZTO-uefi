// Native (Android app) integration, loaded only in the Capacitor build.
// Exposes globalThis.__vcwNative so the rest of the app stays platform-free.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

if (Capacitor.isNativePlatform()) {
  globalThis.__vcwNative = {
    platform: Capacitor.getPlatform(),
    /** Write an export to app storage, then open the share sheet (Drive, Files, email…). */
    async saveFile(name, text) {
      const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      let savedCopy = null;
      try {
        const doc = await Filesystem.writeFile({ path: `VisualCognition/${name}`, data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
        savedCopy = doc.uri;
      } catch { /* public Documents may be unavailable; the share sheet still works */ }
      try { await Share.share({ title: name, files: [res.uri], dialogTitle: 'Save or send export' }); } catch (e) { if (!savedCopy) throw e; }
      return savedCopy;
    },
  };
}
