// Image presentation controller.
//
// Timing model (stated honestly in the UI and the report):
//  * Exposures are scheduled in whole display frames. A requested duration D
//    becomes N = max(1, round(D / frameInterval)) frames; e.g. 100 ms at 60 Hz
//    is 6 frames, at 144 Hz 14 frames (97.2 ms).
//  * Onset and offset are both drawn inside requestAnimationFrame callbacks,
//    so both reach the screen at the next compositor frame; the recorded
//    duration is the difference between the two rAF frame timestamps.
//  * rAF timestamps approximate, but do not guarantee, photon onset. Browser
//    compositing, display latency, variable refresh and dropped frames can
//    shift or stretch the real exposure. Gaps > 1.5 frame intervals during an
//    exposure are counted as dropped frames and the trial is flagged.
import { Rng } from '../core/rng.js';

const raf = () => new Promise((r) => requestAnimationFrame(r));

export async function estimateRefresh(samples = 120) {
  const ts = [];
  let last = await raf();
  for (let i = 0; i < samples; i++) { const t = await raf(); ts.push(t - last); last = t; }
  const sorted = ts.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mad = sorted.map((d) => Math.abs(d - median)).sort((a, b) => a - b)[Math.floor(sorted.length / 2)];
  const hz = 1000 / median;
  const common = [30, 50, 60, 75, 90, 100, 120, 144, 165, 240];
  const nominal = common.reduce((a, b) => (Math.abs(b - hz) < Math.abs(a - hz) ? b : a));
  return {
    medianFrameMs: round(median), estimatedHz: round(hz), nominalHz: Math.abs(nominal - hz) / hz < 0.04 ? nominal : null,
    jitterMs: round(mad), irregularFrames: ts.filter((d) => d > median * 1.5).length, samples: ts.length,
    stable: mad < median * 0.1 && ts.filter((d) => d > median * 1.5).length < samples * 0.05,
  };
}

const round = (x) => Math.round(x * 1000) / 1000;

export function framePlan(requestedMs, frameMs) {
  const frames = Math.max(1, Math.round(requestedMs / frameMs));
  return { frames, expectedMs: round(frames * frameMs), quantizationErrorMs: round(frames * frameMs - requestedMs) };
}

export async function loadBitmap(stim) {
  const src = stim.svg ? URL.createObjectURL(new Blob([stim.svg], { type: 'image/svg+xml' })) : stim.src;
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.src = src;
    await img.decode();
    const w = img.naturalWidth || 960; const h = img.naturalHeight || 600;
    // rasterise once, at full resolution, so presentation is a single blit
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    // letterbox external images to the fixed 16:10 frame
    const s = Math.min(c.width / w, c.height / h);
    ctx.drawImage(img, (c.width - w * s) / 2, (c.height - h * s) / 2, w * s, h * s);
    return await createImageBitmap(c);
  } finally {
    if (stim.svg) URL.revokeObjectURL(src);
  }
}

/** Pattern mask (random coloured patches + noise) to interrupt iconic persistence. */
export async function makeMask(seed) {
  const rng = new Rng(`mask:${seed}`);
  const c = document.createElement('canvas'); c.width = 960; c.height = 600;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#777'; ctx.fillRect(0, 0, 960, 600);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `hsl(${rng.int(0, 360)} ${rng.int(10, 70)}% ${rng.int(15, 85)}%)`;
    const w = rng.int(10, 90); const h = rng.int(10, 90);
    if (rng.bool(0.5)) ctx.fillRect(rng.int(-20, 960), rng.int(-20, 600), w, h);
    else { ctx.beginPath(); ctx.ellipse(rng.int(0, 960), rng.int(0, 600), w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  return createImageBitmap(c);
}

export class PresentationController {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{background:string, frameMs:number}} opts
   */
  constructor(canvas, { background = '#1e1f22', frameMs = 1000 / 60 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: false });
    this.background = background;
    this.frameMs = frameMs;
    this.hidden = false;
    this._onVis = () => { if (document.visibilityState !== 'visible') this.hidden = true; };
    document.addEventListener('visibilitychange', this._onVis);
  }

  destroy() { document.removeEventListener('visibilitychange', this._onVis); }

  /** Size the canvas backing store to its CSS size × devicePixelRatio. */
  resize(cssW, cssH) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${cssW}px`; this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssH * dpr);
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
  }

  clear() { const { ctx, canvas } = this; ctx.fillStyle = this.background; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  drawFixation() {
    this.clear();
    const { ctx, canvas } = this;
    const s = Math.round(14 * (this.dpr || 1)); const w = Math.max(2, Math.round(2 * (this.dpr || 1)));
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(canvas.width / 2 - s, canvas.height / 2 - w / 2, s * 2, w);
    ctx.fillRect(canvas.width / 2 - w / 2, canvas.height / 2 - s, w, s * 2);
  }

  drawBitmap(bmp) { this.ctx.drawImage(bmp, 0, 0, this.canvas.width, this.canvas.height); }

  /** Wait until `ms` have elapsed since `since` (frame-aligned). Returns last rAF timestamp. */
  async waitFrames(since, ms) {
    let t = since;
    while (t - since < ms - this.frameMs / 2) t = await raf();
    return t;
  }

  /**
   * Run fixation → stimulus → mask → blank for one trial.
   * Returns a complete timing record.
   */
  async present({ bitmap, mask, fixationMs, exposureMs, maskMs }) {
    this.hidden = document.visibilityState !== 'visible';
    const rec = { requestedMs: exposureMs, frameMs: round(this.frameMs), fixationRequestedMs: fixationMs, maskRequestedMs: maskMs, displayCss: { w: this.cssW, h: this.cssH }, dpr: this.dpr };
    const plan = framePlan(exposureMs, this.frameMs);
    Object.assign(rec, { targetFrames: plan.frames, expectedMs: plan.expectedMs, quantizationErrorMs: plan.quantizationErrorMs });

    // fixation
    let t = await raf();
    this.drawFixation();
    const fixOn = t;
    t = await this.waitFrames(fixOn, fixationMs);

    // stimulus onset — drawn in the same callback whose timestamp we record
    this.drawBitmap(bitmap);
    const onset = t; const onsetCall = performance.now();
    const deltas = []; let prev = onset; let frames = 0;
    while (true) {
      t = await raf();
      deltas.push(t - prev); prev = t; frames++;
      if (t - onset >= plan.frames * this.frameMs - this.frameMs / 2) break;
    }
    // offset: replace with mask (or blank) in this frame
    if (mask && maskMs > 0) this.ctx.drawImage(mask, 0, 0, this.canvas.width, this.canvas.height); else this.clear();
    const offset = t; const offsetCall = performance.now();
    let maskOff = offset;
    if (mask && maskMs > 0) { maskOff = await this.waitFrames(offset, maskMs); this.clear(); }
    await raf();

    const dropped = deltas.filter((d) => d > this.frameMs * 1.5).length;
    Object.assign(rec, {
      fixationOnsetTs: round(fixOn), fixationActualMs: round(onset - fixOn),
      onsetTs: round(onset), offsetTs: round(offset), onsetCallTs: round(onsetCall), offsetCallTs: round(offsetCall),
      actualMs: round(offset - onset), framesElapsed: frames, droppedFrames: dropped, maxFrameGapMs: round(Math.max(...deltas)),
      deviationMs: round(offset - onset - exposureMs), maskOnsetTs: round(offset), maskOffsetTs: round(maskOff), maskActualMs: round(maskOff - offset),
      pageHidden: this.hidden,
      quality: this.hidden ? 'invalid' : dropped > 0 || Math.abs(offset - onset - plan.expectedMs) > this.frameMs * 1.5 ? 'degraded' : 'ok',
    });
    return rec;
  }
}
