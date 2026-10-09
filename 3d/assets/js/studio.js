/* Configurator: the visitor's text or logo printed on a 3D bottle. */
import { THREE, PI, A, LU, N, FONT, makeRenderer, makeBottle, studioEnv, addLights, contactShadow } from "./bottles.js";
import { t } from "./i18n.js";

const $ = id => document.getElementById(id);
const SHAPES = ["spirits", "wine"];
/* Glass presets (linear colour values) */
const GLASS = [
  { c: 0x050505, r: 0.62, cc: 0.12 },  // matte black
  { c: 0x111113, r: 0.2, cc: 1 },      // graphite gloss
  { c: 0x020c05, r: 0.14, cc: 1 },     // wine green
  { c: 0x18191a, r: 0.5, cc: 0.2 }     // frost (light)
];

export function initStudio() {
  const canvas = $("cv3"), view = canvas.closest(".studio__view");
  const textIn = $("stText"), fileIn = $("stFile"), inv = $("stInv"), sum = $("stSum");
  const drop = $("stDrop"), fileRow = $("stFileRow"), fileName = $("stFileName");
  textIn.value = t("st.default");  // the module loads after the language is applied
  const S = { shape: 0, tech: 2, glass: 0, img: null, alpha: true, text: textIn.value, edited: false, th: 0.35, vth: 0, drag: false, vis: false, w: 0, h: 0 };

  const renderer = makeRenderer(canvas, { preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  try { scene.environment = studioEnv(renderer); } catch (_) {}
  addLights(scene);
  const key = new THREE.PointLight(0xffffff, 1.4 * 0.8 * LU, 14, 0); scene.add(key);
  const cam = new THREE.PerspectiveCamera(30, 0.9, 0.1, 50); cam.position.set(0, 0.1, 13.4);
  const sh = contactShadow(3, 0.5); sh.position.y = -3.02; scene.add(sh);
  const bottles = SHAPES.map(shape => { const o = makeBottle(0, { shape }); o.h.rotation.z = -0.08; scene.add(o.h); return o; });
  bottles[1].h.visible = false;
  const PC = document.createElement("canvas"); PC.width = PC.height = N;

  const active = () => bottles[S.shape];

  function paint() {
    const o = PC.getContext("2d", { willReadFrequently: true }), dark = S.glass !== 3, invert = inv.checked;
    o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, N, N);
    if (S.img) {
      const I = S.img, k = Math.min(720 / I.w, 560 / I.h);
      o.drawImage(I.im, 512 - (I.w * k) / 2, 470 - (I.h * k) / 2, I.w * k, I.h * k);
    } else {
      const tx = S.text || " ";
      o.fillStyle = "#000"; o.textAlign = "center"; o.textBaseline = "middle";
      o.font = `700 170px ${FONT}`;
      const tw = o.measureText(tx).width, fz = Math.min(170, (170 * 720) / Math.max(tw, 1));
      o.font = `700 ${fz}px ${FONT}`; o.fillText(tx, 512, 470);
    }
    // Turn the artwork into a coverage mask (logos without alpha: use luminance)
    const d = o.getImageData(0, 0, N, N), a = d.data, lum = S.img && !S.alpha;
    for (let k = 0; k < a.length; k += 4) {
      let al = a[k + 3] / 255;
      if (lum) { const l = (a[k] + a[k + 1] + a[k + 2]) / 765; al *= invert ? l : 1 - l; }
      a[k] = a[k + 1] = a[k + 2] = 255; a[k + 3] = al * 255;
    }
    o.putImageData(d, 0, 0);
    o.globalCompositeOperation = "source-in";
    let fill;
    if (S.tech === 2) {
      fill = o.createLinearGradient(260, 300, 760, 700);
      (dark ? ["#9a7a2e", "#ffe9a8", "#b8923a", "#fff1c0"] : ["#5a4310", "#a98424", "#6e5214", "#c49a30"]).forEach((c, i) => fill.addColorStop(i / 3, c));
    } else if (S.tech === 3) {
      fill = o.createLinearGradient(240, 320, 780, 640);
      fill.addColorStop(0, "#14a8e0"); fill.addColorStop(0.5, "#e8408f"); fill.addColorStop(1, "#ffc93c");
    } else fill = S.tech === 1 ? (dark ? "#e6e6e6" : "#1c1c1c") : dark ? "#f4f4f4" : "#141414";
    o.fillStyle = fill; o.fillRect(0, 0, N, N); o.globalCompositeOperation = "source-over";

    const b = active();
    b.ctx.clearRect(0, 0, N, N); b.ctx.drawImage(PC, 0, 0); b.tex.needsUpdate = true;
    const g = GLASS[S.glass];
    bottles.forEach(o2 => {
      const bm = o2.body.material; bm.color.setHex(g.c); bm.roughness = g.r; bm.clearcoat = g.cc;
      const lm = o2.lab.material;
      lm.metalness = [0, 0, 0.9, 0.1][S.tech]; lm.roughness = [0.38, 0.5, 0.3, 0.25][S.tech]; lm.bumpScale = [2.4, 1.2, 2.6, 1][S.tech];
      lm.envMapIntensity = S.tech === 2 ? 1.6 : 1;
    });
    view.classList.toggle("is-frost", S.glass === 3);
    sh.material.opacity = S.glass === 3 ? 0.75 : 0.5;
    summary();
  }

  function summaryText() {
    const art = S.img ? t("st.art.logo") : `«${S.text || "…"}»`;
    return `${t(`tech.${S.tech}.name`)} · ${t(`st.glass.${S.glass}`)} · ${t(`st.shape.${S.shape}`)} · ${art}`;
  }
  function summary() { sum.textContent = summaryText(); }

  /* ---------- Controls ---------- */
  document.querySelectorAll("[data-studio]").forEach(group => {
    const key = group.dataset.studio;
    group.addEventListener("click", e => {
      const btn = e.target.closest("button[data-v]"); if (!btn) return;
      S[key] = +btn.dataset.v;
      group.querySelectorAll("button[data-v]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
      if (key === "shape") bottles.forEach((o, i) => (o.h.visible = i === S.shape));
      paint();
      if (key === "shape" || key === "tech") S.vth += 0.12 * A; // a little spin as feedback
    });
  });
  textIn.addEventListener("input", () => { S.text = textIn.value; S.edited = true; paint(); });
  inv.addEventListener("change", paint);

  function loadFile(fi) {
    if (!fi) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const w = im.naturalWidth || 300, h = im.naturalHeight || 300, c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d"); x.drawImage(im, 0, 0, 64, 64);
        const dd = x.getImageData(0, 0, 64, 64).data; let n = 0;
        for (let k = 3; k < dd.length; k += 4) if (dd[k] < 250) n++;
        S.alpha = n > 20; S.img = { im, w, h };
        fileName.textContent = fi.name; fileName.removeAttribute("data-i18n"); fileRow.hidden = false;
        paint();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(fi);
  }
  fileIn.addEventListener("change", () => loadFile(fileIn.files[0]));
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, () => drop.classList.add("is-over")));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove("is-over")));
  $("stFileClear").addEventListener("click", () => {
    S.img = null; fileIn.value = ""; fileRow.hidden = true;
    fileName.setAttribute("data-i18n", "st.logo"); fileName.textContent = t("st.logo");
    paint();
  });

  $("stCta").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("studio:cta", { detail: { summary: summaryText() } }));
  });

  $("stDownload").addEventListener("click", () => {
    const w = canvas.width, h = canvas.height, out = document.createElement("canvas");
    out.width = w; out.height = h;
    const x = out.getContext("2d"), frost = S.glass === 3;
    const g = x.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, Math.max(w, h) * 0.8);
    (frost ? ["#4a4a50", "#1e1e21", "#0d0d0e"] : ["#ffffff", "#ebebee", "#cfcfd5"]).forEach((c, i) => g.addColorStop([0, 0.55, 1][i], c));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    renderer.render(scene, cam);
    x.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.download = "agroalimgrup-mockup.png"; a.href = out.toDataURL("image/png");
    document.body.appendChild(a); a.click(); a.remove();
    document.dispatchEvent(new CustomEvent("toast", { detail: t("st.saved") }));
  });

  /* Drag to rotate, with inertia */
  let lx = 0;
  canvas.addEventListener("pointerdown", e => { S.drag = true; lx = e.clientX; S.vth = 0; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener("pointermove", e => { if (!S.drag) return; const dx = e.clientX - lx; lx = e.clientX; S.th += dx * 0.012; S.vth = dx * 0.012; });
  const up = () => { S.drag = false; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  new IntersectionObserver(es => es.forEach(e => (S.vis = e.isIntersecting)), { rootMargin: "100px" }).observe(canvas);

  document.addEventListener("langchange", () => {
    if (!S.edited) { S.text = t("st.default"); textIn.value = S.text; paint(); } else summary();
  });

  function frame(tm = 0) {
    requestAnimationFrame(frame);
    if (!S.vis) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (S.w !== w || S.h !== h)) { S.w = w; S.h = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (!S.drag) { S.th += S.vth + 0.004 * A; S.vth *= 0.94; }
    bottles.forEach(o => { o.b.rotation.y = S.th; o.h.position.y = Math.sin(tm / 1400) * 0.05 * A; });
    key.position.set(Math.sin((tm / 1200) * A) * 3, 1.5, 4);
    renderer.render(scene, cam);
  }

  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  requestAnimationFrame(frame);
}
