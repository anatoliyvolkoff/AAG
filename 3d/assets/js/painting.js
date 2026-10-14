/* Glass painting page: scrolling scrubs the spray-coating film frame by frame. */
import { detectLang } from "./i18n.js";
import { $, $$, initCommon, initHeader, initPreloader } from "./ui.js";

const N = +(document.getElementById("pv")?.dataset.frames) || 144;   // 1280×720 WebP frames 000…N-1
const DIR = new URL("../media/paint/", import.meta.url).href;
const src = i => `${DIR}${String(i).padStart(3, "0")}.webp`;
const CL = v => Math.max(0, Math.min(1, v));
const sm = t => t * t * (3 - 2 * t);
const FOCUS_X = 0.45, FOCUS_Y = 0.5;                   // keep the bottle and the nozzle in frame when cropping

function initScrub(onReady) {
  const sec = $("pv"), stage = $("pvStage"), canvas = $("pvCanvas"), cx = canvas.getContext("2d");
  const steps = $$(".pv__step", sec), bars = $$(".pv__bar b", sec), hint = sec.querySelector(".pv__hint");
  const ranges = steps.map(s => s.dataset.range.split(",").map(Number));
  const imgs = new Array(N), ok = new Uint8Array(N);
  let W = 0, H = 0, cur = 0, need = true, ready = false;

  /* Load the first frame, then coarse to fine, so every scroll position soon has a frame close by */
  const order = [];
  for (let step = 32; step >= 1; step >>= 1) for (let i = 0; i < N; i += step) if (!order.includes(i)) order.push(i);
  if (!order.includes(N - 1)) order.push(N - 1);
  let next = 0, loaded = 0;
  const load = () => {
    if (next >= order.length) return;
    const i = order[next++], im = new Image();
    im.decoding = "async";
    im.onload = () => {
      imgs[i] = im; ok[i] = 1; need = true;
      sec.dataset.loaded = ++loaded;
      if (!ready) { ready = true; sec.classList.add("is-ready"); onReady(); }
      load();
    };
    im.onerror = load;
    im.src = src(i);
  };
  for (let k = 0; k < 6; k++) load();

  const below = i => { for (let k = i; k >= 0; k--) if (ok[k]) return k; return -1; };
  const above = i => { for (let k = i; k < N; k++) if (ok[k]) return k; return -1; };

  function cover(im, alpha) {
    const iw = im.naturalWidth, ih = im.naturalHeight, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
    const dx = Math.min(0, Math.max(W - dw, W / 2 - FOCUS_X * dw)), dy = Math.min(0, Math.max(H - dh, H / 2 - FOCUS_Y * dh));
    cx.globalAlpha = alpha;
    cx.drawImage(im, dx, dy, dw, dh);
  }
  /* Draw fractional frame f: the frame below, cross-faded into the next one, so every pixel of scroll moves the picture */
  function draw(f) {
    const i = Math.floor(f), lo = below(i), hi = above(Math.min(N - 1, i + 1));
    if (lo < 0 && hi < 0) return false;
    if (lo < 0) cover(imgs[hi], 1);
    else {
      cover(imgs[lo], 1);
      if (hi > lo) { const k = CL((f - lo) / (hi - lo)); if (k > 0.002) cover(imgs[hi], k); }
    }
    cx.globalAlpha = 1;
    return true;
  }

  function copy(p) {
    steps.forEach((el, k) => {
      const [a, b] = ranges[k], f = 0.04;
      const vin = k === 0 ? 1 : sm(CL((p - a) / f));
      const vout = k === steps.length - 1 ? 1 : 1 - sm(CL((p - b) / f));
      const v = Math.min(vin, vout), dir = p < a ? 1 : -1;
      el.style.opacity = v.toFixed(3);
      el.style.transform = v > 0.999 ? "none" : `translate3d(0, ${((1 - v) * 20 * dir).toFixed(1)}px, 0)`;
      el.style.visibility = v < 0.01 ? "hidden" : "visible";
      bars[k].style.transform = `scaleX(${CL((p - a) / (b - a)).toFixed(3)})`;
    });
    if (hint) hint.style.opacity = (1 - sm(CL(p / 0.06))).toFixed(3);
  }

  function size() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H; need = true;
  }
  size();
  if ("ResizeObserver" in window) new ResizeObserver(size).observe(canvas); else addEventListener("resize", size);

  const progress = () => {
    const run = sec.offsetHeight - stage.offsetHeight;
    return CL(-sec.getBoundingClientRect().top / Math.max(1, run));
  };
  let lastCopy = -1;
  function frame() {
    requestAnimationFrame(frame);
    const r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const target = progress(), prev = cur;
    cur = target;                                       // locked to the scroll: down plays forward, up plays backward
    if (cur !== prev) need = true;
    if (need && draw(cur * (N - 1))) { need = false; sec.dataset.frame = Math.round(cur * (N - 1)); }
    if (Math.abs(cur - lastCopy) > 0.0002) { lastCopy = cur; copy(cur); }
  }
  requestAnimationFrame(frame);
}

initCommon(detectLang());
initHeader();
const finish = initPreloader();
initScrub(() => setTimeout(finish, 120));
