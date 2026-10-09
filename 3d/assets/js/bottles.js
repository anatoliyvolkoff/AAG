/* Shared 3D building blocks: maths helpers, bottle geometry, label art,
   studio environment, lights and contact shadows. */
import * as THREE from "three";

// Authored colours are treated as linear values (the art direction was tuned that way).
THREE.ColorManagement.enabled = false;

export { THREE };
export const PI = Math.PI;
export const CL = v => Math.max(0, Math.min(1, v));
export const ct = (q, a, b) => CL((q - a) / (b - a));
export const sm = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const mx = (a, b, u) => a + (b - a) * sm(u);
export const ss = t => { t = CL(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const A = reduceMotion ? 0 : 1;
/** Physically-based light units: multiply legacy intensities by π to keep the original look. */
export const LU = Math.PI;
export const N = 1024;
export const FONT = "Inter, Arial, sans-serif";
const INK = "#f0f0f0";

/* Body colour of each technology's showcase bottle */
export const BODY = [0x050506, 0x0a0a0c, 0x040404, 0x151517];

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (_) { return false; }
}

export function makeRenderer(canvas, opts = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", ...opts });
  const dprCap = innerWidth < 760 ? 1.5 : 1.75;
  r.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}

/* ---------- Label artwork (drawn on a 1024² canvas, white ink) ---------- */
export const ART = [
  x => { // Screen print: SOARE sun mark
    x.fillStyle = x.strokeStyle = INK; x.lineCap = "round"; x.lineWidth = 18;
    x.beginPath(); x.arc(512, 420, 105, 0, 6.283); x.stroke();
    x.lineWidth = 14;
    for (let k = 0; k < 12; k++) {
      const a = k * PI / 6;
      x.beginPath(); x.moveTo(512 + 150 * Math.cos(a), 420 + 150 * Math.sin(a)); x.lineTo(512 + 205 * Math.cos(a), 420 + 205 * Math.sin(a)); x.stroke();
    }
    x.textAlign = "center"; x.font = `600 120px ${FONT}`; x.fillText("SOARE", 512, 690); x.fillRect(382, 730, 260, 10);
  },
  x => { // Pad print: fine text and barcode
    x.fillStyle = INK; x.textAlign = "center"; x.font = `600 270px ${FONT}`; x.fillText("BIO", 512, 500);
    x.font = `64px ${FONT}`; x.fillText("0,5 L · 12% vol.", 512, 590);
    x.textAlign = "left"; x.font = `30px ${FONT}`;
    x.fillText("Agro Alim Grup · Chișinău", 330, 690); x.fillText("Produs în Republica Moldova", 330, 730);
    for (let k = 0; k < 30; k++) x.fillRect(330 + k * 12, 770, k % 3 ? 4 : 7, 70);
  },
  x => { // Hot foil (used on cards/hero only — the story bottle uses the photographed foil map)
    const g = x.createLinearGradient(300, 200, 720, 820);
    g.addColorStop(0, "#8a6a2a"); g.addColorStop(0.35, "#ffeab0"); g.addColorStop(0.6, "#b38c3c"); g.addColorStop(1, "#f6e0a4");
    x.strokeStyle = x.fillStyle = g; x.lineWidth = 10; x.strokeRect(320, 230, 384, 560);
    x.lineWidth = 3; x.strokeRect(338, 248, 348, 524);
    x.lineWidth = 8; x.beginPath(); x.arc(512, 360, 34, 0, 6.283); x.stroke();
    x.textAlign = "center"; x.font = `600 76px ${FONT}`; x.fillText("RESERVA", 512, 520);
    x.font = `40px ${FONT}`; x.fillText("Chișinău", 512, 640);
  },
  x => { // UV print: gradient panel
    const g = x.createLinearGradient(270, 280, 754, 760);
    g.addColorStop(0, "#161616"); g.addColorStop(0.5, "#6e6e6e"); g.addColorStop(1, "#e8e8e8");
    x.fillStyle = g; x.fillRect(270, 280, 484, 480);
    x.fillStyle = "rgba(255,255,255,.22)"; x.beginPath(); x.moveTo(270, 280); x.lineTo(754, 280); x.lineTo(270, 540); x.fill();
    x.fillStyle = "#fff"; x.textAlign = "center"; x.font = `600 130px ${FONT}`; x.fillText("FRESH", 512, 520);
    x.font = `42px ${FONT}`; x.fillText("сок прямого отжима", 512, 600);
  }
];

/* Draw the label of bottle `o` at process progress q ∈ [0,1] (animated reveal per technology). */
export function drawLabel(o, q, force) {
  if (o.foil) { o.lab.material.opacity = ct(q, 0.55, 0.62); return; }
  const i = o.i, sg = Math.round(q * 300);
  if (sg === o.sig && !force) return;
  o.sig = sg;
  const x = o.ctx;
  x.clearRect(0, 0, N, N); x.save();
  if (i === 0) {
    // squeegee sweep: reveal follows the blade across the curved label
    const s = ct(q, 0.15, 0.85), u = s > 0 ? CL((Math.asin(CL((-0.6 + 1.2 * s) / 0.655)) + 1.145) / 2.29) : 0;
    x.beginPath(); x.rect(0, 0, N * u, N); x.clip(); ART[0](x);
  } else if (i === 3) {
    // UV head: wet ink band ahead of the cured band
    const s = ct(q, 0.1, 0.85);
    x.save(); x.beginPath(); x.rect(0, 0, N, N * s); x.clip(); x.globalAlpha = 0.55 * ct(q, 0, 0.12); ART[3](x); x.restore();
    x.beginPath(); x.rect(0, 0, N, N * CL(s - 0.1 + 0.3 * ct(q, 0.85, 0.97))); x.clip(); ART[3](x);
  } else {
    x.globalAlpha = i === 1 ? ct(q, 0.6, 0.68) : ct(q, 0.55, 0.62); ART[i](x);
  }
  x.restore(); o.tex.needsUpdate = true;
}

/* ---------- Geometry ---------- */
const V = (a, b) => new THREE.Vector2(a, b);
/* Spirits bottle profile traced from the photo reference (1 L): neck, shoulder, body, rounded base */
const BASE = [[0, -2.945], [0.4727, -2.945], [0.5005, -2.9421], [0.5275, -2.9334], [0.5532, -2.9192], [0.5769, -2.8999], [0.5981, -2.8758], [0.6161, -2.8476], [0.6307, -2.8159], [0.6413, -2.7817], [0.6478, -2.7456], [0.65, -2.7086], [0.65, -2.428]];
const PROF = [...BASE, [0.65, 0.3493], [0.65, 0.6152], [0.6443, 0.6595], [0.6387, 0.7039], [0.633, 0.7482], [0.6188, 0.7925], [0.6047, 0.8811], [0.5664, 0.9255], [0.5466, 0.9698], [0.5183, 1.0141], [0.4886, 1.0584], [0.4461, 1.1027], [0.405, 1.147], [0.3526, 1.1914], [0.2946, 1.2357], [0.2577, 1.28], [0.2351, 1.3243], [0.2351, 1.3686], [0.2452, 1.5311], [0.2467, 2.2698], [0.2511, 2.58], [0.26, 2.648]];
const LIP = [[0.26, 2.648], [0.2807, 2.6361], [0.2881, 2.713], [0.2881, 2.8666], [0.294, 2.902], [0.2836, 2.9316], [0.2364, 2.9405]];
/* Bordeaux 0.75 L: same body radius so labels share geometry; high rounded shoulder, long neck */
const WINE = [...BASE, [0.65, 0.5], [0.649, 0.62], [0.643, 0.74], [0.628, 0.86], [0.602, 0.98], [0.563, 1.1], [0.507, 1.22], [0.437, 1.34], [0.36, 1.46], [0.296, 1.57], [0.258, 1.68], [0.24, 1.8], [0.232, 2.2], [0.228, 2.86], [0, 2.86]];
const CAPSULE = [[0.226, 1.94], [0.24, 1.96], [0.24, 2.82], [0.236, 2.855], [0.21, 2.875], [0, 2.875]];

let G = null;
function geo() {
  if (G) return G;
  G = {
    body: new THREE.LatheGeometry(PROF.map(a => V(a[0], a[1])), 96),
    wine: new THREE.LatheGeometry(WINE.map(a => V(a[0], a[1])), 96),
    lip: new THREE.LatheGeometry(LIP.map(a => V(a[0], a[1])), 64),
    capsule: new THREE.LatheGeometry(CAPSULE.map(a => V(a[0], a[1])), 64),
    liq: new THREE.CylinderGeometry(0.22, 0.22, 0.26, 32),
    lab: new THREE.CylinderGeometry(0.655, 0.655, 1.5, 64, 1, true, -1.145, 2.29),
    labFoil: new THREE.CylinderGeometry(0.655, 0.655, 3.235, 96, 1, true, -1.2, 2.4),
    seam: new THREE.CylinderGeometry(0.657, 0.657, 1.4, 4, 1, true, 0.78, 0.05)
  };
  return G;
}

/* ---------- Photographed foil (Medusa Vodka reference): colour + bump ---------- */
let FOIL = null;
export function foilMaps(onLoad) {
  if (FOIL) { if (onLoad) FOIL.ready.then(onLoad); return FOIL; }
  const L = new THREE.TextureLoader();
  let res; const ready = new Promise(r => (res = r));
  let n = 0; const done = () => { if (++n === 2) res(); };
  const map = L.load(new URL("../media/foil.webp", import.meta.url).href, done, undefined, done);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.generateMipmaps = false; map.minFilter = THREE.LinearFilter;
  const bump = L.load(new URL("../media/foil-bump.webp", import.meta.url).href, done, undefined, done);
  bump.anisotropy = 8; bump.generateMipmaps = false; bump.minFilter = THREE.LinearFilter;
  FOIL = { map, bump, ready };
  if (onLoad) ready.then(onLoad);
  return FOIL;
}

/* Create a bottle. i = technology index (0..3). opts: { finished, foilPhoto, shape:'spirits'|'wine' } */
export function makeBottle(i, opts = {}) {
  const g = geo();
  const h = new THREE.Group(), b = new THREE.Group(); h.add(b);
  const foilPhoto = !!opts.foilPhoto;
  const matte = i === 2;
  const body = new THREE.Mesh(opts.shape === "wine" ? g.wine : g.body, matte
    ? new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.62, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.9 })
    : new THREE.MeshPhysicalMaterial({ color: BODY[i], roughness: 0.22, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 }));
  const lip = new THREE.Mesh(g.lip, new THREE.MeshPhysicalMaterial({ color: 0xd5d9da, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.6 }));
  const liq = new THREE.Mesh(g.liq, new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.3 }));
  liq.position.y = 2.78;
  const capsule = new THREE.Mesh(g.capsule, new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.35, metalness: 0.7, envMapIntensity: 1.2 }));

  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const lm = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, transparent: true, depthWrite: false };
  let lab;
  if (foilPhoto) {
    const F = foilMaps();
    lab = new THREE.Mesh(g.labFoil, new THREE.MeshStandardMaterial({ map: F.map, color: 0xffffff, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5, opacity: 0, bumpMap: F.bump, bumpScale: 3, ...lm }));
    lab.position.y = -1.091;
  } else {
    lab = new THREE.Mesh(g.lab, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: i === 3 ? 0.1 : i === 2 ? 0.85 : 0, bumpMap: tex, bumpScale: i === 3 ? 1 : 2.2, envMapIntensity: i === 2 ? 1.5 : 1, ...lm }));
    lab.position.y = -1;
  }
  const seam = new THREE.Mesh(g.seam, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  seam.position.y = -1.1;
  b.add(body, lab, seam);
  if (opts.shape === "wine") b.add(capsule); else b.add(liq, lip);

  const o = { h, b, body, tex, lab, lip, liq, capsule, seam, ctx: cv.getContext("2d"), cv, sig: -1, i, foil: foilPhoto };
  if (opts.finished) drawLabel(o, 1, true);
  return o;
}

/* ---------- Studio environment: soft-box strips over a dark floor, pre-filtered ---------- */
export function studioEnv(renderer) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#a2a2a4"); g.addColorStop(0.55, "#2c2c2e"); g.addColorStop(1, "#050505");
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  x.filter = "blur(5px)";
  x.fillStyle = "#ffffff";
  [[80, 60, 68, 380], [340, 40, 44, 400], [600, 60, 120, 340], [880, 80, 52, 360]].forEach(a => x.fillRect(a[0], a[1], a[2], a[3]));
  x.fillStyle = "#dcdcdc"; x.fillRect(0, 0, 1024, 30);
  x.filter = "none";
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return env;
}

/* Key + two rims + ambient, in physical units */
export function addLights(scene, key = 1.25) {
  const A_ = new THREE.AmbientLight(0xffffff, 0.12 * LU);
  const K_ = new THREE.DirectionalLight(0xffffff, key * LU);
  const R1 = new THREE.DirectionalLight(0xffffff, 1.4 * LU);
  const R2 = new THREE.DirectionalLight(0xffffff, 1.1 * LU);
  K_.position.set(-3, 5, 6); R1.position.set(6, 2, -4); R2.position.set(-6, 1, -5);
  scene.add(A_, K_, R1, R2);
  return { A_, K_, R1, R2 };
}

/* Soft elliptical contact shadow (a blurred radial gradient on a floor plane) */
let SH_TEX = null;
export function contactShadow(size = 2.6, opacity = 0.42) {
  if (!SH_TEX) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,.85)"); g.addColorStop(0.35, "rgba(0,0,0,.45)"); g.addColorStop(0.7, "rgba(0,0,0,.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    SH_TEX = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: SH_TEX, transparent: true, depthWrite: false, opacity, toneMapped: false }));
  m.rotation.x = -PI / 2;
  return m;
}
