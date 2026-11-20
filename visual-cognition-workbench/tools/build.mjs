// Build outputs:
//   node tools/build.mjs www         → www/  (web assets for the Android app)
//   node tools/build.mjs standalone  → dist/visual-cognition-workbench.html
//     a single self-contained file (JS + CSS inlined) that runs offline when
//     opened directly from disk.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const mode = process.argv[2] || 'standalone';

if (mode === 'www') {
  const out = join(root, 'www');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const p of ['styles', 'data']) cpSync(join(root, p), join(out, p), { recursive: true });
  // bundle the app together with the Capacitor bridge (bare imports resolved by esbuild)
  await build({ entryPoints: [join(root, 'src/native/entry.js')], bundle: true, format: 'esm', minify: true, outfile: join(out, 'app.js'), target: ['es2020'], legalComments: 'none' });
  const html = readFileSync(join(root, 'index.html'), 'utf8').replace('<script type="module" src="src/main.js"></script>', '<script type="module" src="app.js"></script>');
  if (!html.includes('src="app.js"')) throw new Error('entry rewrite failed');
  writeFileSync(join(out, 'index.html'), html);
  console.log('Built Android web bundle in www/');
} else if (mode === 'standalone') {
  const res = await build({ entryPoints: [join(root, 'src/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none' });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(join(root, 'styles/main.css'), 'utf8');
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="styles/main.css">', () => `<style>\n${css}\n</style>`);
  html = html.replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${js}\n</script>`);
  if (html.includes('src/main.js') || html.includes('styles/main.css')) throw new Error('inlining failed');
  mkdirSync(join(root, 'dist'), { recursive: true });
  const file = join(root, 'dist/visual-cognition-workbench.html');
  writeFileSync(file, html);
  console.log(`Wrote ${file} (${Math.round(html.length / 1024)} KB)`);
} else {
  console.error(`Unknown mode ${mode}`);
  process.exit(1);
}
