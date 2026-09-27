/* =========================================================
   Agro Alim Grup — 3D bottles (hero + portfolio carousel)
   Every bottle is modelled procedurally (lathe geometry) and
   decorated with canvas-drawn layers: ink, foil, paint, relief.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEX = 1024; // decoration texture size
const TAU = Math.PI * 2;

/* ---------------- shapes ---------------- */
const SHAPES = {
  bordeaux: {
    pts: [[0, 0], [.46, 0], [.53, .02], [.56, .08], [.56, 1.95], [.55, 2.07], [.5, 2.2], [.38, 2.38], [.26, 2.52], [.2, 2.66], [.185, 2.8], [.185, 3.1], [.2, 3.13], [.205, 3.2], [.19, 3.25], [0, 3.25]],
    r: .56, cap: { y0: 2.72, y1: 3.27, r: .215 }
  },
  vodka: {
    pts: [[0, 0], [.44, 0], [.49, .02], [.5, .08], [.5, 2.25], [.49, 2.35], [.42, 2.5], [.28, 2.62], [.18, 2.72], [.16, 2.82], [.16, 3.2], [0, 3.2]],
    r: .5, cap: { y0: 2.9, y1: 3.45, r: .2 }
  },
  ice: {
    pts: [[0, 0], [.47, 0], [.52, .05], [.53, .2], [.53, 2.05], [.51, 2.2], [.42, 2.32], [.24, 2.42], [.17, 2.5], [.17, 2.95], [0, 2.95]],
    r: .53, cap: { y0: 2.7, y1: 3.2, r: .205 }
  },
  flute: {
    pts: [[0, 0], [.45, 0], [.5, .05], [.5, 1.3], [.49, 1.6], [.44, 2.0], [.34, 2.4], [.22, 2.75], [.18, 2.95], [.18, 3.3], [.2, 3.33], [.2, 3.4], [0, 3.4]],
    r: .5, cap: { y0: 2.95, y1: 3.42, r: .215 }
  },
  gin: {
    pts: [[0, 0], [.58, 0], [.62, .04], [.62, 1.8], [.58, 1.95], [.4, 2.1], [.2, 2.2], [.18, 2.3], [.18, 2.55], [0, 2.55]],
    r: .62, seg: 8, cap: { y0: 2.4, y1: 2.85, r: .26 }
  },
  flask: {
    pts: [[0, 0], [.5, 0], [.58, .05], [.62, .3], [.64, .9], [.62, 1.5], [.55, 1.8], [.4, 2.0], [.24, 2.15], [.2, 2.3], [.2, 2.5], [0, 2.5]],
    r: .64, cap: { y0: 2.35, y1: 2.7, r: .215 }
  },
  jar: {
    pts: [[0, 0], [.78, 0], [.82, .05], [.82, 1.0], [.78, 1.06], [.7, 1.08], [.7, 1.12], [0, 1.12]],
    r: .82, cap: { y0: 1.04, y1: 1.44, r: .835 }
  }
};

function heightOf(shape) { return shape.pts[shape.pts.length - 1][1]; }

function latheGeo(shape, radialScale = 1, maxY = Infinity) {
  let pts = shape.pts.filter((p) => p[1] <= maxY);
  if (maxY !== Infinity) pts = [...pts, [pts[pts.length - 1][0], maxY], [0, maxY]];
  const v = pts.map(([r, y]) => new THREE.Vector2(Math.max(r * radialScale, 0.0001), y));
  const seg = shape.seg || 72;
  let geo = new THREE.LatheGeometry(v, seg, -Math.PI, TAU); // u = .5 faces +z (front)
  // remap v to world height so textures are drawn in real proportions
  const H = heightOf(shape);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / H);
  if (shape.seg) { geo = geo.toNonIndexed(); geo.computeVertexNormals(); }
  return geo;
}

/* ---------------- canvas helpers ---------------- */
// Returns a canvas whose 2D context is set to "design units": 100 = 1 world unit,
// x = 0 at the front of the bottle, y grows upward from the base.
function surface(shape, bg = null) {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  const ctx = c.getContext("2d");
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, TEX, TEX); }
  const ppx = TEX / (TAU * shape.r);
  const ppy = TEX / heightOf(shape);
  ctx.setTransform(ppx / 100, 0, 0, -ppy / 100, TEX / 2, TEX); // flip y: up is positive
  ctx.circ = TAU * shape.r * 100; // circumference in design units
  // text helper (text must be drawn un-flipped)
  ctx.text = (str, x, y, { size = 30, font = "600", family = "Montserrat, sans-serif", color = "#fff", spacing = 0, align = "center" } = {}) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, -1);
    ctx.font = `${font} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  };
  return { c, ctx };
}

function tex(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function dataTex(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const SERIF = "'Instrument Serif', Didot, Georgia, serif";
const SANS = "Montserrat, 'Helvetica Neue', sans-serif";

function crest(ctx, x, y, s) {
  // simple shield + laurel crest in design units
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, 26); ctx.lineTo(22, 26); ctx.lineTo(22, -2);
  ctx.quadraticCurveTo(22, -22, 0, -32); ctx.quadraticCurveTo(-22, -22, -22, -2); ctx.closePath();
  ctx.stroke();
  for (let side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + side * (0.5 + i * 0.32);
      ctx.beginPath();
      ctx.ellipse(side * Math.abs(Math.cos(a) * 40), -Math.sin(a) * 36, 7, 3, a + Math.PI / 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------------- designs ---------------- */
function buildDesigns() {
  return [
    { // 1 — Cabernet Reserve
      shape: "bordeaux",
      body: { kind: "glass", color: "#5f9a72", attenuation: "#1f5a36" },
      liquid: { color: "#3a0610", fill: 1.9 },
      cap: { color: "#6b1024", metal: .7, rough: .35 },
      ink(ctx) {
        ctx.strokeStyle = "#f4efe4"; ctx.lineWidth = 2.5;
        ctx.strokeRect(-70, 45, 140, 125);
        ctx.lineWidth = 1; ctx.strokeRect(-64, 51, 128, 113);
        ctx.text("CABERNET", 0, 118, { size: 22, font: "400", family: SERIF, color: "#f4efe4", spacing: 3 });
        ctx.text("R E S E R V E", 0, 96, { size: 8, font: "600", family: SANS, color: "#f4efe4", spacing: 2 });
        ctx.text("2021", 0, 68, { size: 11, font: "400", family: SERIF, color: "#f4efe4" });
        ctx.text("MOLDOVA · CHIȘINĂU", 0, 22, { size: 6, font: "600", family: SANS, color: "#f4efe4", spacing: 2 });
      },
      foil(ctx) {
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
        crest(ctx, 0, 145, .42);
        ctx.fillRect(-44, 83, 88, 1.8);
        ctx.fillRect(-44, 80, 88, .7);
        ctx.fillRect(-70, 182, 140, 3);
      },
      foilColor: "#d8b46a"
    },
    { // 2 — Noir Foil
      shape: "vodka",
      body: { kind: "coat", color: "#050506", rough: .5, sheen: "#3a3a3a", env: .35 },
      cap: { color: "#d4b16a", metal: 1, rough: .22 },
      ink(ctx) {
        ctx.text("SINCE 2000 · CHIȘINĂU", 0, 28, { size: 6, font: "600", family: SANS, color: "#8c8c90", spacing: 2.5 });
        ctx.text("40% vol · 0.7 L", 0, 16, { size: 5, font: "500", family: SANS, color: "#6c6c70", spacing: 1 });
      },
      foil(ctx) {
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
        crest(ctx, 0, 180, .6);
        ctx.text("NOIR", 0, 118, { size: 34, font: "400", family: SERIF, spacing: 4 });
        ctx.fillRect(-36, 94, 72, 1.6);
        ctx.text("P R E M I U M   V O D K A", 0, 82, { size: 6, font: "600", family: SANS, spacing: 1 });
        ctx.fillRect(-36, 70, 72, 1.6);
        // collar band
        ctx.fillRect(-ctx.circ / 2, 218, ctx.circ, 4);
        ctx.fillRect(-ctx.circ / 2, 212, ctx.circ, 1);
      },
      foilColor: "#dcb96f"
    },
    { // 3 — Ice
      shape: "ice",
      body: { kind: "frost", color: "#e8f0f6" },
      cap: { color: "#dfe3e8", metal: 1, rough: .25 },
      relief: true,
      ink(ctx) {
        // crystal pattern all around
        ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.4;
        for (let i = 0; i < 26; i++) {
          const x = -ctx.circ / 2 + (i / 26) * ctx.circ, y = 30 + ((i * 37) % 150);
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = k * Math.PI / 3;
            ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
          }
          ctx.stroke();
        }
        ctx.text("ICE", 0, 118, { size: 70, font: "700", family: SANS, color: "#ffffff", spacing: -2 });
        ctx.text("V O D K A", 0, 76, { size: 9, font: "600", family: SANS, color: "#ffffff", spacing: 2 });
      },
      inkTint: "#ffffff"
    },
    { // 4 — Rosé Dégradé
      shape: "flute",
      body: { kind: "glass", color: "#ffffff", attenuation: "#ffe9ee" },
      liquid: { color: "#f3a3ad", fill: 2.25, opacity: .9 },
      cap: { color: "#d9a193", metal: 1, rough: .3 },
      paint(ctx, c) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const g = ctx.createLinearGradient(0, TEX, 0, 0);
        g.addColorStop(0, "rgba(233,120,150,1)");
        g.addColorStop(.18, "rgba(240,150,172,.95)");
        g.addColorStop(.48, "rgba(248,196,208,.35)");
        g.addColorStop(.62, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, TEX, TEX);
      },
      ink(ctx) {
        ctx.text("Rosé", 0, 78, { size: 46, font: "italic 400", family: SERIF, color: "#ffffff" });
        ctx.text("D É G R A D É", 0, 46, { size: 7, font: "600", family: SANS, color: "#ffffff", spacing: 1.5 });
      }
    },
    { // 5 — Botanica
      shape: "gin",
      body: { kind: "glass", color: "#eef6f5", attenuation: "#d8efe9" },
      liquid: { color: "#eaf6f2", fill: 1.9, opacity: .25 },
      cap: { color: "#8a5a36", metal: 0, rough: .7 },
      ink(ctx) {
        const C = ctx.circ;
        // vine of leaves wrapping the bottle — 4 registered colours
        for (let i = 0; i < 44; i++) {
          const x = -C / 2 + (i / 44) * C;
          const y = 60 + Math.sin(i * .7) * 40 + (i % 3) * 18;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(i) * 1.2);
          ctx.fillStyle = i % 2 ? "#2f7d5b" : "#5aa37a";
          ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, TAU); ctx.fill();
          ctx.restore();
          if (i % 4 === 0) { ctx.fillStyle = "#f08a24"; ctx.beginPath(); ctx.arc(x + 8, y + 16, 7, 0, TAU); ctx.fill(); }
          if (i % 5 === 2) { ctx.fillStyle = "#5b3f8c"; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 6 + k * 5, y - 14 + (k % 2) * 4, 2.6, 0, TAU); ctx.fill(); } }
        }
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.fillRect(-48, 96, 96, 44);
        ctx.text("BOTANICA", 0, 124, { size: 15, font: "700", family: SANS, color: "#1d1d1f", spacing: 2 });
        ctx.text("small batch gin", 0, 106, { size: 9, font: "italic 400", family: SERIF, color: "#2f7d5b" });
      }
    },
    { // 6 — Heritage Flask (ceramic decal)
      shape: "flask",
      body: { kind: "ceramic", color: "#f5f1ea" },
      cap: { color: "#b98b5c", metal: 0, rough: .85 },
      ink(ctx) {
        const C = ctx.circ;
        // Moldovan-style folk ornament bands (red / black rhombus motifs)
        const band = (y, s, col) => {
          const n = Math.round(C / (s * 2.2));
          for (let i = 0; i < n; i++) {
            const x = -C / 2 + (i + .5) * (C / n);
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#f5f1ea";
            ctx.beginPath(); ctx.moveTo(x, y + s * .45); ctx.lineTo(x + s * .45, y); ctx.lineTo(x, y - s * .45); ctx.lineTo(x - s * .45, y); ctx.closePath(); ctx.fill();
          }
        };
        band(40, 9, "#b3202a"); band(162, 9, "#b3202a");
        ctx.fillStyle = "#1d1d1f"; ctx.fillRect(-C / 2, 26, C, 2); ctx.fillRect(-C / 2, 176, C, 2);
        // central medallion (photographic-style decal)
        const g = ctx.createRadialGradient(0, 102, 4, 0, 102, 46);
        g.addColorStop(0, "#f4c46a"); g.addColorStop(.6, "#c8543b"); g.addColorStop(1, "#6b1d2a");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 102, 44, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2f5d3a";
        for (let k = 0; k < 8; k++) { ctx.save(); ctx.translate(0, 102); ctx.rotate(k * Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, 24, 5, 13, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = "#f5f1ea"; ctx.beginPath(); ctx.arc(0, 102, 9, 0, TAU); ctx.fill();
        ctx.text("HERITAGE", 0, 196, { size: 10, font: "700", family: SANS, color: "#1d1d1f", spacing: 3 });
      }
    },
    { // 7 — Aura (cosmetic jar)
      shape: "jar",
      scale: 1.35,
      body: { kind: "coat", color: "#cdbfe0", rough: .75, sheen: "#ffffff", env: .9 },
      cap: { color: "#f2f0f5", metal: .1, rough: .35 },
      ink(ctx) {
        ctx.text("hydrating cream · 50 ml", 0, 28, { size: 6, font: "500", family: SANS, color: "#6e5a8a", spacing: 1 });
      },
      foil(ctx) {
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 66, 26, 0, TAU); ctx.stroke();
        ctx.text("AURA", 0, 66, { size: 16, font: "400", family: SERIF, spacing: 3 });
        ctx.fillRect(-ctx.circ / 2, 94, ctx.circ, 1.5);
      },
      foilColor: "#e6e8ee"
    }
  ];
}

/* ---------------- bottle factory ---------------- */
function makeBottle(design, renderer) {
  const shape = SHAPES[design.shape];
  const H = heightOf(shape);
  const g = new THREE.Group();
  const b = design.body;

  // body
  let bodyMat;
  if (b.kind === "glass") {
    bodyMat = new THREE.MeshPhysicalMaterial({
      color: b.color, transmission: 1, thickness: .6, roughness: .04, ior: 1.5,
      attenuationColor: new THREE.Color(b.attenuation || b.color), attenuationDistance: .9,
      clearcoat: 1, clearcoatRoughness: .05, specularIntensity: 1, envMapIntensity: 1.4
    });
  } else if (b.kind === "frost") {
    bodyMat = new THREE.MeshPhysicalMaterial({
      color: b.color, transmission: .75, thickness: .8, roughness: .55, ior: 1.5,
      attenuationColor: new THREE.Color("#cfe2ee"), attenuationDistance: 2, envMapIntensity: 1.2
    });
  } else if (b.kind === "ceramic") {
    bodyMat = new THREE.MeshPhysicalMaterial({ color: b.color, roughness: .28, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1 });
  } else {
    bodyMat = new THREE.MeshPhysicalMaterial({ color: b.color, roughness: b.rough ?? .6, metalness: 0, sheen: .25, sheenColor: new THREE.Color(b.sheen || "#8a8a8a"), sheenRoughness: .6, envMapIntensity: b.env ?? .55 });
  }
  const body = new THREE.Mesh(latheGeo(shape), bodyMat);
  g.add(body);

  // liquid
  if (design.liquid) {
    const lm = new THREE.MeshPhysicalMaterial({
      color: design.liquid.color, roughness: .1, transparent: design.liquid.opacity !== undefined,
      opacity: design.liquid.opacity ?? 1, envMapIntensity: .6
    });
    const liquid = new THREE.Mesh(latheGeo(shape, .9, design.liquid.fill), lm);
    liquid.position.y = .04;
    g.add(liquid);
  }

  // paint layer (gradient bottle painting)
  if (design.paint) {
    const { c, ctx } = surface(shape);
    design.paint(ctx, c);
    const m = new THREE.MeshPhysicalMaterial({ map: tex(c, renderer), transparent: true, roughness: .35, clearcoat: .8, depthWrite: false });
    g.add(new THREE.Mesh(latheGeo(shape, 1.004), m));
  }

  // ink layer (screen printing / decals / relief)
  if (design.ink) {
    const { c, ctx } = surface(shape);
    design.ink(ctx);
    const opts = { map: tex(c, renderer), transparent: true, roughness: .45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 };
    if (design.relief) { opts.bumpMap = dataTex(c, renderer); opts.bumpScale = 6; opts.roughness = .3; }
    g.add(new THREE.Mesh(latheGeo(shape, 1.006), new THREE.MeshStandardMaterial(opts)));
  }

  // foil layer (hot stamping)
  if (design.foil) {
    const { c, ctx } = surface(shape, "#000");
    design.foil(ctx);
    const m = new THREE.MeshStandardMaterial({
      color: design.foilColor, metalness: 1, roughness: .16, alphaMap: dataTex(c, renderer), alphaTest: .45,
      envMapIntensity: 2.2, polygonOffset: true, polygonOffsetFactor: -4
    });
    g.add(new THREE.Mesh(latheGeo(shape, 1.009), m));
  }

  // cap / capsule
  const cp = shape.cap;
  const capMat = new THREE.MeshPhysicalMaterial({ color: design.cap.color, metalness: design.cap.metal, roughness: design.cap.rough, clearcoat: .5, envMapIntensity: 1.6 });
  // open-ended sleeve (no bottom disc, which would show through clear glass) + top disc
  const capGeo = new THREE.CylinderGeometry(cp.r, cp.r * 1.02, cp.y1 - cp.y0, 64, 1, true);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = (cp.y0 + cp.y1) / 2;
  g.add(cap);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(cp.r, 64), capMat);
  disc.rotation.x = -Math.PI / 2; disc.position.y = cp.y1;
  g.add(disc);
  // cap bevel
  const top = new THREE.Mesh(new THREE.TorusGeometry(cp.r * .96, cp.r * .06, 12, 64), capMat);
  top.rotation.x = Math.PI / 2; top.position.y = cp.y1;
  g.add(top);

  const s = design.scale || 1;
  g.scale.setScalar(s);
  g.userData.height = Math.max(H, cp.y1) * s;
  return g;
}

function blob(color, alpha) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${color},${alpha})`);
  gr.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function envFor(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();
}

// render only while visible
function visibility(el, cb) {
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) cb(); }, { rootMargin: "100px" }).observe(el);
  return () => visible;
}

/* =========================================================
   HERO
   ========================================================= */
function initHero(designs) {
  const canvas = document.getElementById("hero-canvas");
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  envFor(renderer, scene);
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(-4, 3, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .3));

  const bottle = makeBottle(designs[1], renderer);
  const pivot = new THREE.Group();
  bottle.position.y = -bottle.userData.height / 2;
  pivot.add(bottle);
  scene.add(pivot);
  const shadow = blob("0,0,0", .35);
  shadow.scale.set(2.2, 2.2, 1);
  shadow.position.y = -bottle.userData.height / 2 - .01;
  scene.add(shadow);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, .3, w / h < .75 ? 13 : 10.5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); }, { passive: true });

  const isVisible = visibility(canvas, () => {});
  const clock = new THREE.Clock();
  let spin = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05);
    if (!isVisible()) return;
    const p = window.AAG?.heroProgress || 0;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    if (!reduced) spin += dt * .35;
    pivot.rotation.y = spin + p * Math.PI * 2 + mx * .6;
    pivot.rotation.x = my * .15;
    pivot.rotation.z = Math.sin(spin * .8) * .04 - mx * .05;
    pivot.position.y = reduced ? 0 : Math.sin(spin * 1.6) * .08;
    const s = 1 + p * .25;
    pivot.scale.setScalar(s);
    renderer.render(scene, camera);
  });
}

/* =========================================================
   PORTFOLIO CAROUSEL
   ========================================================= */
function initCarousel(designs) {
  const wrap = document.getElementById("carousel");
  const canvas = document.getElementById("carousel-canvas");
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  envFor(renderer, scene);
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);

  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(4, 6, 6); scene.add(key);
  const rimL = new THREE.DirectionalLight(0xffffff, 2.4); rimL.position.set(-6, 3, -2); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xffffff, 1.4); rimR.position.set(6, 2, -3); scene.add(rimR);
  scene.add(new THREE.AmbientLight(0xffffff, .25));

  const N = designs.length;
  const R = 4.4;
  const ring = new THREE.Group();
  scene.add(ring);

  const items = designs.map((d, i) => {
    const a = (i / N) * TAU;
    const holder = new THREE.Group();
    holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    holder.rotation.y = a;
    const spinner = new THREE.Group();
    const bottle = makeBottle(d, renderer);
    bottle.position.y = -1.6;
    spinner.add(bottle);
    holder.add(spinner);
    const glow = blob("255,255,255", .14);
    glow.scale.set(2.6, 2.6, 1);
    glow.position.y = -1.61;
    holder.add(glow);
    ring.add(holder);
    bottle.traverse((o) => { if (o.isMesh) o.userData.index = i; });
    return { holder, spinner, glow, spin: 0 };
  });

  // pedestal ring
  const ped = new THREE.Mesh(
    new THREE.TorusGeometry(R, .006, 8, 200),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .12 })
  );
  ped.rotation.x = Math.PI / 2; ped.position.y = -1.6;
  scene.add(ped);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w / h < 1.1;
    camera.fov = narrow ? 42 : 30;
    camera.position.set(0, 1.9, R + (narrow ? 6.6 : 7.8));
    camera.lookAt(0, narrow ? -.1 : -.45, R - 3.2);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* --- state --- */
  let pos = 0;        // current (float) index
  let target = 0;     // snapped index (may exceed N; wraps)
  let dragging = false, moved = 0, lastX = 0, vel = 0;
  let autoTimer = 0;

  const ui = {
    idx: document.getElementById("pf-idx"),
    total: document.getElementById("pf-total"),
    title: document.getElementById("pf-title"),
    tech: document.getElementById("pf-tech"),
    desc: document.getElementById("pf-desc"),
    info: document.querySelector(".pf-info"),
    dots: document.getElementById("pf-dots")
  };
  ui.total.textContent = String(N).padStart(2, "0");
  const dots = designs.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Item ${i + 1}`);
    b.addEventListener("click", () => goTo(i));
    ui.dots.appendChild(b);
    return b;
  });

  const mod = (n) => ((n % N) + N) % N;
  let shown = -1;
  function updateInfo(force) {
    const i = mod(Math.round(pos));
    if (i === shown && !force) return;
    shown = i;
    const item = (window.AAG ? window.AAG.t("items") : [])[i] || {};
    ui.info.classList.add("swap");
    clearTimeout(updateInfo.t);
    updateInfo.t = setTimeout(() => {
      ui.idx.textContent = String(i + 1).padStart(2, "0");
      ui.title.textContent = item.t || "";
      ui.tech.textContent = item.k || "";
      ui.desc.textContent = item.d || "";
      ui.info.classList.remove("swap");
    }, force ? 0 : 220);
    dots.forEach((d, k) => d.setAttribute("aria-selected", k === i));
  }
  window.addEventListener("aag:lang", () => updateInfo(true));

  function goTo(i) {
    // choose shortest path to index i
    const cur = mod(Math.round(target));
    let diff = i - cur;
    if (diff > N / 2) diff -= N;
    if (diff < -N / 2) diff += N;
    target = Math.round(target) + diff;
    autoTimer = 0;
  }
  window.AAG_CAROUSEL = { goTo };
  document.getElementById("pf-prev").addEventListener("click", () => { target = Math.round(target) - 1; autoTimer = 0; });
  document.getElementById("pf-next").addEventListener("click", () => { target = Math.round(target) + 1; autoTimer = 0; });
  wrap.tabIndex = 0;
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { target = Math.round(target) - 1; autoTimer = 0; }
    if (e.key === "ArrowRight") { target = Math.round(target) + 1; autoTimer = 0; }
  });

  /* --- drag --- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; lastX = e.clientX; vel = 0;
    canvas.setPointerCapture(e.pointerId);
    wrap.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    const k = dx / (canvas.clientWidth * .28);
    pos -= k; target = pos;
    vel = -k;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove("is-dragging");
    autoTimer = 0;
    if (moved < 6) {
      // click: raycast to pick a bottle
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(ring.children, true).find((h) => h.object.userData.index !== undefined);
      if (hit) goTo(hit.object.userData.index);
      target = Math.round(target);
      return;
    }
    target = Math.round(pos + vel * 8);
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  /* --- loop --- */
  const isVisible = visibility(wrap, () => {});
  const clock = new THREE.Clock();
  updateInfo(true);
  requestAnimationFrame(() => wrap.classList.add("ready"));

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05);
    if (!isVisible()) return;

    // autoplay after idle
    if (!dragging && !reduced) {
      autoTimer += dt;
      if (autoTimer > 5.5) { target = Math.round(target) + 1; autoTimer = 0; }
    }
    if (!dragging) pos += (target - pos) * (reduced ? 1 : Math.min(1, dt * 5));
    ring.rotation.y = -(pos / N) * TAU;
    updateInfo();

    const front = mod(Math.round(pos));
    items.forEach((it, i) => {
      // distance from front (0..N/2)
      let d = Math.abs(mod(i - pos + N / 2) - N / 2);
      const f = Math.max(0, 1 - d);            // 1 at the front
      const s = .78 + f * .32;
      it.holder.scale.setScalar(it.holder.scale.x + (s - it.holder.scale.x) * .15);
      it.holder.position.y = f * .12;
      if (i === front && !reduced) it.spin += dt * .45;
      else it.spin += (Math.round(it.spin / TAU) * TAU - it.spin) * Math.min(1, dt * 3);
      it.spinner.rotation.y = it.spin;
      it.glow.material.opacity = .25 + f * .75;
    });
    ped.rotation.z = ring.rotation.y;
    renderer.render(scene, camera);
  });
}


/* =========================================================
   CLICHÉ PLATE (mirrored relief, as a real stamping die)
   ========================================================= */
function makePlate(renderer) {
  const w = 3.2, h = 2.2, rad = .28;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + rad, -h / 2);
  shape.lineTo(w / 2 - rad, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
  shape.lineTo(w / 2, h / 2 - rad); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2);
  shape.lineTo(-w / 2 + rad, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad);
  shape.lineTo(-w / 2, -h / 2 + rad); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 24 });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);

  // relief artwork — mirrored, as engraved on a real cliché
  const c = document.createElement("canvas");
  c.width = 1024; c.height = Math.round(1024 * h / w);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width, 0); ctx.scale(-1, 1);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
  ctx.lineWidth = 10;
  ctx.strokeRect(90, 90, c.width - 180, c.height - 180);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "600 220px Montserrat, sans-serif";
  ctx.fillText("AAG", c.width / 2, c.height / 2 - 30);
  ctx.font = "500 44px Montserrat, sans-serif";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "18px";
  ctx.fillText("CHIȘINĂU · 2000", c.width / 2, c.height / 2 + 130);
  const bump = new THREE.CanvasTexture(c);

  const mat = new THREE.MeshPhysicalMaterial({
    color: "#c7c8cc", metalness: 1, roughness: .32, bumpMap: bump, bumpScale: 10,
    clearcoat: .4, envMapIntensity: 1.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  mesh.position.z = -.07;
  g.add(mesh);
  return g;
}

/* =========================================================
   STILL SHOTS — renders product images for cards
   <div data-shot="0..6 | plate" data-bg="#hex" data-view="front|close|angle">
   ========================================================= */
function renderShots(designs) {
  const targets = [...document.querySelectorAll("[data-shot]")];
  if (!targets.length) return;
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(1);
  const W = 900, H = 1100;
  renderer.setSize(W, H, false);

  const scene = new THREE.Scene();
  envFor(renderer, scene);
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2); rim.position.set(-5, 3, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const camera = new THREE.PerspectiveCamera(26, W / H, .1, 100);

  const cache = new Map();
  targets.forEach((el) => {
    const id = el.dataset.shot;
    const bg = el.dataset.bg || "#ededed";
    const view = el.dataset.view || "front";
    const key = `${id}|${bg}|${view}`;
    if (!cache.has(key)) {
      const obj = id === "plate" ? makePlate(renderer) : makeBottle(designs[+id], renderer);
      const pivot = new THREE.Group();
      pivot.add(obj);
      scene.add(pivot);
      scene.background = new THREE.Color(bg);
      const dark = new THREE.Color(bg).getHSL({}).l < .3;
      const shadow = blob(dark ? "255,255,255" : "0,0,0", dark ? .1 : .22);

      if (id === "plate") {
        pivot.rotation.set(-.9, 0, -.28);
        camera.position.set(0, 0, 11);
        camera.lookAt(0, 0, 0);
      } else {
        const hgt = obj.userData.height;
        obj.position.y = -hgt / 2;
        shadow.scale.set(2.4, 2.4, 1); shadow.position.y = -hgt / 2 - .01; scene.add(shadow);
        pivot.rotation.y = view === "angle" ? -.55 : view === "close" ? -.15 : -.25;
        if (view === "close") { camera.position.set(0, .2, 5.2); camera.lookAt(0, -.3, 0); }
        else { camera.position.set(0, .6, 9.6); camera.lookAt(0, 0, 0); }
      }
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      cache.set(key, canvas.toDataURL("image/jpeg", .9));
      scene.remove(pivot); scene.remove(shadow);
      obj.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((m) => { Object.values(m).forEach((v) => v && v.isTexture && v.dispose()); m.dispose(); }); } });
    }
    const img = new Image();
    img.alt = el.dataset.alt || "";
    img.decoding = "async";
    img.src = cache.get(key);
    el.appendChild(img);
    requestAnimationFrame(() => el.classList.add("shot-ready"));
  });
  renderer.dispose();
}

/* =========================================================
   boot
   ========================================================= */
function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch (e) { return false; }
}

async function boot() {
  const carousel = document.getElementById("carousel");
  const hero = document.getElementById("hero-canvas");
  if (!webglOK()) {
    if (carousel) { carousel.querySelector(".carousel__fallback").hidden = false; carousel.classList.add("ready"); }
    return;
  }
  // wait for web fonts so canvas text uses them
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  await Promise.all([
    document.fonts.load("400 40px 'Instrument Serif'"),
    document.fonts.load("italic 400 40px 'Instrument Serif'"),
    document.fonts.load("700 40px Montserrat"),
    document.fonts.load("600 40px Montserrat"),
    document.fonts.load("500 40px Montserrat")
  ].map((p) => p.catch(() => {})));

  const designs = buildDesigns();
  renderShots(designs);
  if (hero) initHero(designs);
  if (carousel) initCarousel(designs);
}
boot();
