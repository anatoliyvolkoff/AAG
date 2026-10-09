/* Sticky scroll story: floating hero bottles → four print processes → line-up.
   Also renders the rotating bottles of the comparison cards. */
import {
  THREE, PI, CL, ct, sm, mx, ss, A, LU, reduceMotion,
  makeRenderer, makeBottle, drawLabel, studioEnv, addLights, foilMaps, contactShadow
} from "./bottles.js";
import { mkProps } from "./props.js";

const S = [1, -1, 0, 1];            // side of each showcase bottle
const R = [-9, 12, 0, -14];         // tilt (deg)
const G = 9;                        // vertical spacing between showcase bottles
const X = S.map(s => s * 2.1);
const PO = 1;                       // label centre below bottle origin
const $ = id => document.getElementById(id);

export function initStory({ onReady } = {}) {
  const track = $("top"), stage = $("stage"), canvas = $("gl"), hero = $("hero"), vig = $("vig");
  const end = $("storyEnd"), reel = $("reel"), rv = $("reelv"), chapnav = $("chapnav"), skip = $("skipStory");
  const chaps = [...document.querySelectorAll(".chap")];
  // .chap__done is left to CSS (.is-complete) so the stagger doesn't force it visible
  const cardKids = chaps.map(c => [...c.children].filter(n => !n.classList.contains("chap__done")));
  const steps = chaps.map(c => [...c.querySelectorAll(".chap__steps li")].map(li => ({ li, at: parseFloat(li.dataset.at) })));
  const navBtns = [...chapnav.querySelectorAll("button")];
  const navBars = navBtns.map(b => b.querySelector(".bar b"));
  const claims = [...document.querySelectorAll(".cw")].map(e => [e, +e.dataset.c, +e.dataset.k]);

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  try { scene.environment = studioEnv(renderer); } catch (_) {}
  const LG = addLights(scene);
  const SP = new THREE.SpotLight(0xffffff, 0, 28, 0.5, 0.7, 0); SP.position.set(3, 6, 7); scene.add(SP, SP.target);
  const LP = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 7, 0); scene.add(l); return l; });
  const UVL = LP[1]; UVL.color.setHex(0xb8c8ff);

  const F = foilMaps();
  const MB = [0, 1, 2, 3].map(i => {
    const o = makeBottle(i, { foilPhoto: i === 2 });
    o.h.position.set(X[i], -i * G, 0); scene.add(o.h); o.pr = mkProps(o, i);
    return o;
  });
  const HP_LAND = [[-4.75, 1.15, -0.5, 0.56], [-3.15, -2.65, 1, 0.46], [4.8, 1.0, -0.8, 0.58], [3.3, -2.6, 0.5, 0.46]];
  const HP_PORT = [[-1.15, 2.55, -0.5, 0.4], [1.3, 2.2, 0.5, 0.36], [-1.25, -2.75, 1, 0.38], [1.2, -2.45, -0.8, 0.44]];
  const HB = [0, 1, 2, 3].map(k => { const o = makeBottle(k, { finished: true, foilPhoto: k === 2 }); scene.add(o.h); return o; });

  /* ---------- Layout + camera keyframes ---------- */
  let asp = 1, port = false, mob = false, K = [], HP = HP_LAND;
  function build() {
    const vh = s => 7 / s, vw = s => (7 / s) * asp;
    mob = innerWidth <= 760;
    // hot-foil chapter: centre the bottle between its card and the reel
    let pf = 0;
    if (!mob) {
      const W = innerWidth, c2 = chaps[2];
      const cardR = c2.offsetLeft + c2.offsetWidth, reelL = W - 24 - reel.offsetWidth;
      pf = 0.5 - (cardR + reelL) / 2 / W;
    }
    const fs = port ? 1.05 : 1.25, ps = port ? 1.5 : 2.9, ds = port ? 2.3 : 4.6;
    K = [];
    const z = () => [0, 0, 0, 0], one = (i, v) => { const a = z(); a[i] = v; return a; };
    const add = (p, x, y, s, c, w, r = 0) => K.push({ p, x, y, s, c, w, r });
    add(0, 0, 0, 1, z(), z()); add(0.08, 0, 0, 1, z(), z());
    for (let i = 0; i < 4; i++) {
      const base = 0.1 + i * 0.2, by = -i * G, phi = (-R[i] * PI) / 180, e = i === 2;
      const k = e && mob ? 0.13 : port ? 0.114 : S[i] ? 0 : 0.06;
      const fz = e && mob ? 0.66 : fs, pz = e ? (port ? 1 : 1.45) : ps, dz = e ? (mob ? 1.12 : port ? 1.05 : 1.9) : ds, po = e ? 1.09 : PO;
      const fy = by - k * vh(fz), fx = e ? X[i] + pf * vw(fz) : port ? X[i] : 0;
      const px = X[i] + Math.sin(phi) * po + (e ? pf * vw(pz) : -(port ? 0 : S[i] * 0.055 * vw(pz))), py = by - Math.cos(phi) * po - k * vh(pz);
      const dx = X[i] + Math.sin(phi) * po + (e ? pf * vw(dz) : -(port ? 0 : S[i] * 0.16 * vw(dz))), dy = by - Math.cos(phi) * po - k * vh(dz);
      add(base + 0.03, fx, fy, fz, one(i, 1), z(), -R[i] * 0.35);
      add(base + 0.045, fx, fy, fz, one(i, 1), z(), -R[i] * 0.35);
      add(base + 0.06, px, py, pz, one(i, 1), z(), -R[i] * 0.6);
      add(base + 0.13, px, py, pz, one(i, 1), z(), -R[i] * 0.6);
      add(base + 0.16, dx, dy, dz, one(i, 1), one(i, 1), -R[i]);
      add(base + 0.19, dx, dy, dz, one(i, 1), one(i, 1), -R[i]);
    }
    // Line-up: bottles to the right of the closing line on wide screens, above it on tall ones
    const se = port ? 0.15 : 0.2, xe = port ? 0 : -0.19 * vw(se), ye = port ? -18.5 : -13.5;
    add(0.95, xe, ye, se, z(), z()); add(1, xe, ye, se, z(), z());
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); asp = w / h; port = asp < 0.95; HP = port ? HP_PORT : HP_LAND;
    cam.aspect = asp; cam.updateProjectionMatrix(); build();
  }

  let cur = { r: 0, x: 0, y: 0, s: 1 }, tgt = { r: 0, x: 0, y: 0, s: 1 }, p = 0;
  function target() {
    let k = 0; while (k < K.length - 2 && p >= K[k + 1].p) k++;
    const a = K[k], b = K[k + 1], t = ss((p - a.p) / (b.p - a.p || 1)), L = (u, v) => u + (v - u) * t;
    tgt = { r: L(a.r, b.r), x: L(a.x, b.x), y: L(a.y, b.y), s: Math.exp(L(Math.log(a.s), Math.log(b.s))) };
    return { c: a.c.map((v, i) => L(v, b.c[i])) };
  }

  /* ---------- Navigation ---------- */
  const span = () => Math.max(1, track.offsetHeight - innerHeight);
  function goTo(i) {
    const top = i < 0 ? track.offsetTop : track.offsetTop + (0.1 + 0.2 * i + 0.06) * span();
    scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }
  addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    if (scrollY > track.offsetTop + span() + 10) return;
    const idx = p < 0.14 ? -1 : Math.min(3, Math.floor((p - 0.1) / 0.2)), n = idx + (e.key === "ArrowRight" ? 1 : -1);
    if (n > 3) return;
    e.preventDefault(); goTo(n);
  });

  /* ---------- Loop ---------- */
  let lp = 0, vel = 0, PX = 0, tPX = 0, LT = 0, pS = 0, ready = false, readyAt = 0, lastNav = -2;
  addEventListener("pointermove", e => { tPX = e.clientX / innerWidth - 0.5; }, { passive: true });
  const stepState = (i, q) => {
    const list = steps[i];
    let act = -1;
    if (q > 0) list.forEach((s, k) => { if (q >= s.at) act = k; });
    list.forEach((s, k) => {
      const done = q >= 1 || (k < act);
      s.li.classList.toggle("is-done", done);
      s.li.classList.toggle("is-active", !done && k === act);
    });
    chaps[i].classList.toggle("is-complete", q >= 1);
  };

  F.ready.then(() => { ready = true; });
  setTimeout(() => { ready = true; }, 3500);

  function frame(t = 0) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - LT) / 1000 || 0.016); LT = t;
    const tr = span(), pr = CL((scrollY - track.offsetTop) / tr);
    pS += (pr - pS) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6)); p = pS;
    vel = vel * 0.9 + (p - lp) * 0.1; lp = p;
    const sway = reduceMotion ? 0 : Math.max(-4, Math.min(4, vel * 1300));
    const st = target(), f = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
    cur.x += (tgt.x - cur.x) * f; cur.y += (tgt.y - cur.y) * f; cur.s += (tgt.s - cur.s) * f; cur.r += (tgt.r - cur.r) * f;

    const inView = scrollY < track.offsetTop + tr + innerHeight;
    if (inView) {
      // Hero copy lifts away as the story begins
      const hv0 = sm(p / 0.07);
      hero.style.opacity = 1 - hv0;
      hero.style.transform = `translateY(${-hv0 * 70}px) scale(${1 - hv0 * 0.04})`;
      hero.style.visibility = hv0 > 0.99 ? "hidden" : "visible";

      const Q = [0, 1, 2, 3].map(i => CL((p - (0.16 + i * 0.2)) / 0.07));
      chaps.forEach((card, i) => {
        const c = st.c[i], on = c > 0.002;
        card.classList.toggle("is-on", on);
        card.setAttribute("aria-hidden", String(c < 0.5));
        if (!on) return;
        const q0 = sm(c);
        card.style.opacity = q0;
        card.style.transform = `translateY(${(1 - q0) * 26}px) scale(${0.965 + 0.035 * q0})`;
        cardKids[i].forEach((n, k) => {
          const q = sm(CL((c - k * 0.1) / (1 - k * 0.1)));
          n.style.opacity = q; n.style.transform = `translateY(${(1 - q) * (14 + k * 8)}px)`;
        });
        stepState(i, Q[i]);
      });

      claims.forEach(([e, i, k]) => {
        const b = 0.1 + i * 0.2, s0 = b + 0.03 + 0.03 * k, inn = sm(ct(p, s0, s0 + 0.03)), out = sm(ct(p, b + 0.15, b + 0.185)), v = inn * (1 - out), sd = k % 2 ? 1 : -1;
        e.style.opacity = v * (k === 2 ? 0.9 : 1);
        e.style.transform = `translateX(${sd * ((1 - inn) * 140 - out * 110)}px) scale(${0.92 + 0.08 * inn})`;
      });

      const eo = sm((p - 0.955) / 0.035);
      end.style.opacity = eo; end.style.pointerEvents = eo > 0.5 ? "auto" : "none";
      end.style.transform = `translateY(${(1 - eo) * 24}px)`;

      // chapter navigator
      const navIdx = p > 0.1 && p < 0.95 ? Math.min(3, Math.floor((p - 0.1) / 0.2)) : -1;
      chapnav.classList.toggle("is-on", navIdx >= 0);
      if (navIdx !== lastNav) { navBtns.forEach((b, i) => { b.classList.toggle("is-on", i === navIdx); b.setAttribute("aria-current", i === navIdx ? "step" : "false"); }); lastNav = navIdx; }
      if (navIdx >= 0) navBars[navIdx].style.transform = `scaleX(${CL((p - (0.1 + navIdx * 0.2)) / 0.2)})`;
      skip.classList.toggle("is-on", p > 0.03 && p < 0.93);

      PX += (tPX - PX) * 0.08;
      const hv = sm(p / 0.1), hx = Math.max(0.35, Math.min(1, asp / 1.78)), hs = port ? 1 : 1;
      HB.forEach((o, k) => {
        const a = HP[k], sd = k % 2 ? 1 : -1;
        o.h.visible = hv < 0.995;
        o.h.position.set(a[0] * (port ? 1 : hx) + sd * hv * 8, a[1] + Math.sin(t / 900 + k * 1.9) * 0.25 * A + hv * 6, a[2] + hv * 3);
        o.h.scale.setScalar(Math.max(0.001, a[3] * hs * (1 - hv)));
        o.h.rotation.z = sd * (0.35 + Math.sin(t / 1400 + k) * 0.08 * A);
        o.b.rotation.y = (t / 1800) * sd * A * (1 + k * 0.3) + p * 30;
      });
      MB.forEach((o, i) => {
        const th = (p * 38 * A + i * 1.7) * (1 - st.c[i]) + PX * 0.5 * st.c[i], q = Q[i];
        o.b.rotation.y = th;
        o.h.position.y = -i * G + Math.sin(t / 1000 + i * 1.7) * 0.07 * A;
        o.h.rotation.z = (-(R[i] + Math.sin(t / 1300 + i) * 1.2 * A) * PI) / 180;
        o.h.scale.setScalar(i === 0 ? 0.001 + 0.999 * sm((p - 0.02) / 0.08) : 1);
        drawLabel(o, q); o.pr.u(q, t); o.pr.g.visible = q > 0.001 && q < 0.999;
      });

      // Lighting follows the active chapter: darker key, stronger rims and a spot for close-ups
      const ai = st.c.indexOf(Math.max(...st.c)), ac = st.c[ai], qa = Q[ai], by = -ai * G;
      LP[0].position.set(X[ai] + Math.sin((t / 650) * A) * 1.1, by - 1 + Math.cos((t / 900) * A) * 0.5, 1.6);
      LP[0].intensity = ac * ct(qa, 0.9, 1) * (A ? 2.6 : 1.3) * 0.8 * LU;
      UVL.position.set(X[3], -3 * G - 0.25 - 1.5 * ct(Q[3], 0.1, 0.85) + 0.25, 1.1);
      UVL.intensity = ai === 3 ? ac * ct(Q[3], 0.05, 0.12) * (1 - ct(Q[3], 0.9, 1)) * 1.8 * 0.8 * LU : 0;
      const dr = Math.max(...st.c), a2 = st.c.indexOf(dr), e = sm(dr);
      LG.K_.intensity = mx(1.25, 0.8, e) * LU; LG.R1.intensity = mx(1.5, 2.5, e) * LU; LG.R2.intensity = mx(1.2, 2.1, e) * LU; LG.A_.intensity = mx(0.12, 0.05, e) * LU;
      SP.position.set(X[a2] + 2.5, -a2 * G + 5, 7); SP.target.position.set(X[a2], -a2 * G - 1, 0);
      SP.intensity = e * (A ? 3.4 : 2.5) * 0.64 * LU;
      renderer.toneMappingExposure = mx(1.1, 0.9, e);
      vig.style.opacity = 0.5 + 0.5 * e;
      LP[2].position.set(X[2], -2 * G - 1.09, 1.3);
      LP[2].intensity = ai === 2 ? ac * ct(Q[2], 0.5, 0.58) * (1 - ct(Q[2], 0.66, 0.8)) * 2 * 0.8 * LU : 0;

      cam.position.set(cur.x, cur.y, 13.06 / cur.s); cam.rotation.z = ((cur.r + sway) * PI) / 180;
      renderer.render(scene, cam);

      // Live reel for the hot-foil chapter
      const rs = sm(st.c[2]);
      reel.style.opacity = rs;
      reel.style.transform = mob ? `translateY(${(1 - rs) * -16}px) scale(${0.92 + 0.08 * rs})` : `translateX(${(1 - rs) * 110}%)`;
      if (rs > 0.03) { if (rv.paused) rv.play().catch(() => {}); } else if (!rv.paused) rv.pause();
    }

    if (ready && !readyAt) { readyAt = t; onReady && onReady(); }
  }

  resize();
  addEventListener("resize", resize);
  if ("ResizeObserver" in window) new ResizeObserver(() => resize()).observe(stage);  // rotation can lay out after its resize event
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { MB.forEach(o => (o.sig = -1)); HB.forEach(o => drawLabel(o, 1, true)); });
  requestAnimationFrame(frame);
  return { goTo };
}

/* ---------- Comparison cards: one offscreen renderer drawn into four 2D canvases ---------- */
export function initCompare() {
  const canvases = [...document.querySelectorAll(".cmp__canvas")];
  if (!canvases.length) return;
  const W = 520, H = 640;
  const c2 = document.createElement("canvas"); c2.width = W; c2.height = H;
  const r2 = makeRenderer(c2, { preserveDrawingBuffer: false });
  r2.setPixelRatio(1); r2.setSize(W, H, false);
  const sc = new THREE.Scene();
  try { sc.environment = studioEnv(r2); } catch (_) {}
  addLights(sc);
  const pl = new THREE.PointLight(0xffffff, 0, 14, 0); sc.add(pl);
  const cam2 = new THREE.PerspectiveCamera(30, W / H, 0.1, 50); cam2.position.set(0, 0.15, 14);
  const sh = contactShadow(2.8, 0.5); sh.position.y = -3.02; sc.add(sh);
  const CB = [0, 1, 2, 3].map(i => {
    const b = makeBottle(i, { finished: true, foilPhoto: i === 2 });
    b.h.rotation.z = (-R[i] * 0.5 * PI) / 180; b.h.visible = false; sc.add(b.h);
    return b;
  });
  const cards = canvases.map((cv, i) => {
    const q = { cv, cx: cv.getContext("2d"), th: 0, tg: 0, hv: 0, gl: 0, vis: false, i: +cv.dataset.bottle };
    const io = new IntersectionObserver(es => es.forEach(e => (q.vis = e.isIntersecting)), { rootMargin: "80px" });
    io.observe(cv);
    cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); q.hv = 1; q.tg = ((e.clientX - r.left) / r.width - 0.5) * 7; });
    cv.addEventListener("pointerleave", () => { q.hv = 0; });
    return q;
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => CB.forEach(o => drawLabel(o, 1, true)));
  foilMaps(() => {});
  function frame(t = 0) {
    requestAnimationFrame(frame);
    cards.forEach((c, k) => {
      if (!c.vis) return;
      if (!c.hv) c.tg = Math.sin(t / 1500 + k) * 0.45 * A;
      c.th += (c.tg - c.th) * 0.1;
      c.gl += ((c.hv ? 1.6 : 0.35) - c.gl) * 0.1;
      pl.position.set((c.th / 3.5) * 2.4, 0.6, 3.2); pl.intensity = c.gl * 0.8 * LU;
      sh.material.opacity = c.i === 2 ? 0.7 : 0.45;
      const b = CB[c.i]; b.h.visible = true; b.b.rotation.y = c.th;
      r2.render(sc, cam2);
      c.cx.clearRect(0, 0, W, H); c.cx.drawImage(r2.domElement, 0, 0);
      b.h.visible = false;
    });
  }
  requestAnimationFrame(frame);
}
