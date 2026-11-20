// Write the full ground-truth annotation manifest for both pools.
// Usage: node tools/build-manifest.js [out.json]
import { writeFileSync } from 'node:fs';
import { catalog, generate, DATASET_VERSION } from '../src/dataset/dataset.js';

const out = process.argv[2] || `dataset-${DATASET_VERSION}-annotations.json`;
const pools = Object.fromEntries(['training', 'assessment'].map((p) => [p, catalog(p).map((e) => generate(e).annotation)]));
writeFileSync(out, JSON.stringify({ version: DATASET_VERSION, generatedAt: new Date().toISOString(), pools }, null, 1));
console.log(`Wrote ${pools.training.length + pools.assessment.length} annotations to ${out}`);
