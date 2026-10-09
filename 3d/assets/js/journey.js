/* Orientation-adaptive tour (layout v2).
   A line-up of four finished bottles → each bottle printed by its technology
   → the line-up again. On wide screens the tour travels sideways, on tall
   screens it travels downwards; rotating a device re-lays it live.

   The DOM panels (text) and the 3D bottles are kept in register: during travel
   the camera moves exactly one visible width (or height) per panel, at the same
   rate the panel track is translated, so each bottle stays in its panel's slot. */
import {
  THREE, PI, CL, ct, sm, ss, A, LU, reduceMotion,
  makeRenderer, makeBottle, drawLabel, studioEnv, addLights, foilMaps, contactShadow
} from "./bottles.js";
import { mkProps } from "./props.js";

const $ = id => document.getElementById(id);
const html = document.documentElement;
const R = [-9, 12, 0, -14];                     // tilt of each bottle during the tour (deg)
const TAN = Math.tan((15 * PI) / 180);          // half the 30° vertical field of view
const BOTTLE_H = 5.9, SP = 1.9;                 // bottle height, line-up spacing
const LABEL = [1.5, 1.5, 3.235, 1.5];           // printed area height per technology
const PO = [1, 1, 1.09, 1];                     // printed area centre below the bottle origin

/* Scroll timeline, in screens */
const LEN = { hero: 0.25, intro: 0.95, park: 1.75, travel: 0.8, outro: 0.95, end: 0.4 };
const PARK = { in: 0.14, proc: 0.62, det: 0.74, hold: 0.86 };   // phases inside a park
function timeline() {
  const segs = []; let s = 0;
  const add = (k, len, i = -1) => { segs.push({ k, i, s, e: s + len, len }); s += len; };
  add("hero", LEN.hero); add("intro", LEN.intro);
  for (let i = 0; i < 4; i++) { add("park", LEN.park, i); if (i < 3) add("travel", LEN.travel, i); }
  add("outro", LEN.outro); add("end", LEN.end);
  return { segs, total: s };
}

/* A framing = camera centre (x, y), visible height H, roll r (deg) */
const lerpF = (a, b, k) => ({
  x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k,
  H: Math.exp(Math.log(a.H) + (Math.log(b.H) - Math.log(a.H)) * k), r: a.r + (b.r - a.r) * k
});
const mix = (a, b, k) => a + (b - a) * k;

export function initJourney({ onReady } = {}) {
  const section = $("top"), stage = $("jstage"), canvas = $("jgl");
  const track = $("jtrack"), back = $("jback"), hero = $("jhero"), end = $("jend"), vig = $("jvig");
  const nav = $("jnav"), reelV = $("jreelv"), heroScroll = hero.querySelector(".jhero__scroll");
  const panels = [...track.querySelectorAll(".jpanel")];
  const bodies = panels.map(p => p.querySelector(".jpanel__body"));
  const kids = bodies.map(b => [...b.children].filter(n => !n.classList.contains("jpanel__done")));
  const dones = bodies.map(b => b.querySelector(".jpanel__done"));
  const steps = panels.map(p => [...p.querySelectorAll(".jsteps li")].map(li => ({ li, at: parseFloat(li.dataset.at) })));
  const words = [...back.querySelectorAll(".jback__panel")].map(p => [...p.querySelectorAll(".jw")]);
  const tagsEl = $("jtags"), tags = [...tagsEl.querySelectorAll(".jtag")];
  const navBtns = [...nav.querySelectorAll("button")];
  const navBars = navBtns.map(b => b.querySelector(".bar b"));
  const { segs, total } = timeline();
  section.style.setProperty("--screens", total.toFixed(3));

  /* ---------- 3D scene ---------- */
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  try { scene.environment = studioEnv(renderer); } catch (_) {}
  const LG = addLights(scene);
  const SPOT = new THREE.SpotLight(0xffffff, 0, 40, 0.5, 0.7, 0); scene.add(SPOT, SPOT.target);
  const SWEEP = new THREE.PointLight(0xffffff, 0, 7, 0);
  const UVL = new THREE.PointLight(0xb8c8ff, 0, 7, 0);
  const DIE = new THREE.PointLight(0xffe6b0, 0, 7, 0);
  scene.add(SWEEP, UVL, DIE);
  const F = foilMaps();
  const B = [0, 1, 2, 3].map(i => {
    const o = makeBottle(i, { foilPhoto: i === 2, finished: true });
    o.pr = mkProps(o, i);
    o.shadow = contactShadow(2.7, 0.5);
    scene.add(o.h, o.shadow);
    return o;
  });

  /* ---------- Layout (measured from the DOM, re-done on resize/rotation) ---------- */
  let W = 1, H = 1, asp = 1, axis = "x", H0 = 10, W0 = 16;
  let JP = [], LP = [], EP = [], CH, CE, PF = [], CN;
  const rectIn = (el, parentW, parentH) => ({
    cx: (el.offsetLeft + el.offsetWidth / 2) / parentW, cy: (el.offsetTop + el.offsetHeight / 2) / parentH,
    w: el.offsetWidth / parentW, h: el.offsetHeight / parentH
  });
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight; asp = W / H;
    axis = asp >= 1 ? "x" : "y";
    html.classList.toggle("j-x", axis === "x"); html.classList.toggle("j-y", axis === "y");
    renderer.setSize(W, H, false); cam.aspect = asp; cam.updateProjectionMatrix();

    const slots = panels.map(p => rectIn(p.querySelector(".jpanel__slot"), W, H));
    const minH = Math.min(...slots.map(s => s.h)), minW = Math.min(...slots.map(s => s.w));
    // Neutral framing: the bottle fills ~80% of its slot (and never overflows its width)
    H0 = Math.max(BOTTLE_H / (0.8 * minH), 2.4 / (0.86 * minW * asp));
    W0 = H0 * asp;
    CN = i => (axis === "x" ? { x: i * W0, y: 0, H: H0, r: 0 } : { x: 0, y: -i * H0, H: H0, r: 0 });
    JP = slots.map((s, i) => axis === "x"
      ? new THREE.Vector3(i * W0 + (s.cx - 0.5) * W0, (0.5 - s.cy) * H0, 0)
      : new THREE.Vector3((s.cx - 0.5) * W0, -i * H0 + (0.5 - s.cy) * H0, 0));

    // Park framings: neutral → process (print area centred in the slot) → detail
    const rollK = axis === "x" ? 1 : 0.5;
    PF = slots.map((s, i) => {
      const th = (-R[i] * PI) / 180, p = JP[i];
      const L = { x: p.x + PO[i] * Math.sin(th), y: p.y - PO[i] * Math.cos(th) };
      const foil = i === 2;
      const H1 = LABEL[i] / (s.h * (foil ? 0.6 : 0.5)), H2 = LABEL[i] / (s.h * (foil ? 0.95 : 0.9));
      const at = Hn => ({ x: L.x - (s.cx - 0.5) * Hn * asp, y: L.y - (0.5 - s.cy) * Hn });
      return [CN(i), { ...at(H1), H: H1, r: -R[i] * 0.6 * rollK }, { ...at(H2), H: H2, r: -R[i] * rollK }];
    });

    // Line-ups for the hero and the outro, fitted to their stage areas
    const lineup = (stageEl, base) => {
      const st = rectIn(stageEl, W, H);
      const LW = 3 * SP + 1.4, LH = BOTTLE_H + 1.1;
      const Hn = Math.max(LW / (0.9 * st.w * asp), LH / (0.92 * st.h));
      const C = { x: base.x, y: base.y, H: Hn, r: 0 };
      const ox = C.x + (st.cx - 0.5) * Hn * asp, oy = C.y + (0.5 - st.cy) * Hn + 0.5;
      return { C, P: [0, 1, 2, 3].map(i => new THREE.Vector3(ox + (i - 1.5) * SP, oy, 0)) };
    };
    const hl = lineup(hero.querySelector(".jhero__stage"), CN(0)); CH = hl.C; LP = hl.P;
    const el = lineup(end.querySelector(".jend__stage"), CN(3)); CE = el.C; EP = el.P;
    // Labels show names only when the bottles are far enough apart on screen
    const gapPx = Math.min(SP / (CH.H * asp), SP / (CE.H * asp)) * W;
    tagsEl.classList.toggle("is-compact", gapPx < (axis === "x" ? 104 : 86));
  }

  /* ---------- Scroll → timeline state ---------- */
  const span = () => stage.clientHeight || innerHeight;
  const progress = () => CL((scrollY - section.offsetTop) / span() / total) * total;
  function stateAt(S) {
    const seg = segs.find(g => S < g.e) || segs[segs.length - 1];
    const u = CL((S - seg.s) / seg.len);
    const st = { seg, u, h: 1, o: 0, t: 0, park: -1, pu: 0, q: 0, depth: 0 };
    if (seg.k === "hero") st.h = 0;
    else if (seg.k === "intro") st.h = ss(u);
    else if (seg.k === "park") { st.park = seg.i; st.pu = u; st.t = seg.i; }
    else if (seg.k === "travel") st.t = seg.i + ss(u);
    else if (seg.k === "outro") { st.o = ss(u); st.t = 3; }
    else { st.o = 1; st.t = 3; }
    if (st.park >= 0) {
      const p = st.pu;
      st.q = CL((p - PARK.in) / (PARK.proc - PARK.in));
      st.depth = p < PARK.in ? 0.5 * sm(p / PARK.in) : p < PARK.proc ? 0.5 : p < PARK.det ? 0.5 + 0.5 * sm((p - PARK.proc) / (PARK.det - PARK.proc)) : p < PARK.hold ? 1 : 1 - sm((p - PARK.hold) / (1 - PARK.hold));
    }
    return st;
  }
  function framing(st) {
    const k = st.seg.k;
    if (k === "hero") return CH;
    if (k === "intro") return lerpF(CH, CN(0), st.h);
    if (k === "park") {
      const [f0, f1, f2] = PF[st.park], p = st.pu;
      if (p < PARK.in) return lerpF(f0, f1, ss(p / PARK.in));
      if (p < PARK.proc) return f1;
      if (p < PARK.det) return lerpF(f1, f2, ss((p - PARK.proc) / (PARK.det - PARK.proc)));
      if (p < PARK.hold) return f2;
      return lerpF(f2, f0, ss((p - PARK.hold) / (1 - PARK.hold)));
    }
    if (k === "travel") return axis === "x" ? { x: st.t * W0, y: 0, H: H0, r: 0 } : { x: 0, y: -st.t * H0, H: H0, r: 0 };
    if (k === "outro") return lerpF(CN(3), CE, st.o);
    return CE;
  }
  const processOf = (st, i) => {
    const k = st.seg.k;
    if (k === "outro" || k === "end") return 1;
    if (k === "hero" || k === "intro") return 0;
    if (k === "travel") return i <= st.seg.i ? 1 : 0;
    return i < st.park ? 1 : i === st.park ? st.q : 0;
  };

  /* ---------- Navigation ---------- */
  const startOf = i => segs.find(g => g.k === "park" && g.i === i).s + LEN.park * PARK.in;
  function goTo(i) {
    const S = i < 0 ? 0 : startOf(i);
    scrollTo({ top: section.offsetTop + S * span(), behavior: reduceMotion ? "auto" : "smooth" });
  }
  addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const S = progress();
    if (scrollY > section.offsetTop + total * span() + 10 || scrollY < section.offsetTop - 10) return;
    const cur = cache.st ? cache.st.t : 0, n = Math.round(cur) + (e.key === "ArrowRight" ? 1 : -1);
    if (n > 3 || (n < 0 && S < 0.01)) return;
    e.preventDefault(); goTo(n);
  });
  // Sideways gestures drive the sideways tour: trackpad swipes and touch drags
  stage.addEventListener("wheel", e => {
    if (axis !== "x" || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); scrollBy(0, e.deltaX);
  }, { passive: false });
  let tx0 = null, ty0 = 0, sy0 = 0, horiz = null;
  stage.addEventListener("touchstart", e => { const p = e.touches[0]; tx0 = p.clientX; ty0 = p.clientY; sy0 = scrollY; horiz = null; }, { passive: true });
  stage.addEventListener("touchmove", e => {
    if (axis !== "x" || tx0 === null) return;
    const p = e.touches[0], dx = p.clientX - tx0, dy = p.clientY - ty0;
    if (horiz === null && Math.hypot(dx, dy) > 8) horiz = Math.abs(dx) > Math.abs(dy) * 1.2;
    if (horiz) scrollTo(0, sy0 - dx * 1.8);
  }, { passive: true });
  stage.addEventListener("touchend", () => { tx0 = null; }, { passive: true });

  /* ---------- Frame ---------- */
  const cache = { st: null, pres: [-1, -1, -1, -1], words: [-1, -1, -1, -1], nav: -2, hero: -1, end: -1, tags: -1 };
  const v3 = new THREE.Vector3();
  const lift = [0, 0, 0, 0]; let hoverI = -1;
  tags.forEach((tg, i) => {
    tg.addEventListener("pointerenter", () => { hoverI = i; });
    tg.addEventListener("pointerleave", () => { if (hoverI === i) hoverI = -1; });
    tg.addEventListener("focus", () => { hoverI = i; });
    tg.addEventListener("blur", () => { if (hoverI === i) hoverI = -1; });
  });
  let pS = 0, LT = 0, PX = 0, tPX = 0, ready = false, readyFired = false;
  addEventListener("pointermove", e => { tPX = e.clientX / innerWidth - 0.5; }, { passive: true });
  F.ready.then(() => { ready = true; });
  setTimeout(() => { ready = true; }, 3500);

  function setSteps(i, q) {
    let act = -1;
    if (q > 0) steps[i].forEach((s, k) => { if (q >= s.at) act = k; });
    steps[i].forEach((s, k) => {
      const done = q >= 1 || k < act;
      s.li.classList.toggle("is-done", done);
      s.li.classList.toggle("is-active", !done && k === act);
    });
    dones[i].classList.toggle("is-hidden", q < 1);
  }

  function frame(time = 0) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (time - LT) / 1000 || 0.016); LT = time;
    const S = progress();
    pS += (S - pS) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 7));
    if (Math.abs(S - pS) < 1e-4) pS = S;
    const inView = scrollY < section.offsetTop + (total + 1) * span() && scrollY + innerHeight > section.offsetTop;
    if (!inView) { if (!reelV.paused) reelV.pause(); return; }
    const st = stateAt(pS); cache.st = st;
    PX += (tPX - PX) * 0.08;

    /* DOM: tracks */
    const along = axis === "x" ? W : H;
    const tr = axis === "x" ? `translate3d(${-st.t * W}px,0,0)` : `translate3d(0,${-st.t * H}px,0)`;
    track.style.transform = tr; back.style.transform = tr;

    /* DOM: panel bodies fade/slide in as they arrive */
    for (let i = 0; i < 4; i++) {
      let p = CL(1 - Math.abs(st.t - i) * 1.25);
      if (i === 0) p *= sm((st.h - 0.55) / 0.45);
      if (i === 3) p *= 1 - sm(st.o * 1.6);
      if (Math.abs(p - cache.pres[i]) > 0.001) {
        cache.pres[i] = p;
        kids[i].forEach((n, k) => {
          const q = sm(CL((p - k * 0.07) / (1 - k * 0.07))), d = (1 - q) * (18 + k * 6);
          n.style.opacity = q;
          n.style.transform = axis === "x" ? `translate3d(${d}px,0,0)` : `translate3d(0,${d}px,0)`;
        });
        bodies[i].style.visibility = p > 0.001 ? "visible" : "hidden";
      }
      const Qi = processOf(st, i);
      setSteps(i, Qi);
      // big words behind the bottle while it is printed
      const wv = st.park === i ? st.depth : 0;
      if (Math.abs(wv - cache.words[i]) > 0.001) {
        cache.words[i] = wv;
        words[i].forEach((w, k) => {
          const inn = sm(CL((wv - 0.1 - k * 0.12) / 0.3)), sd = k % 2 ? 1 : -1;
          w.style.opacity = inn * (k === 2 ? 0.9 : 1);
          w.style.transform = axis === "x" ? `translate3d(${sd * (1 - inn) * 120}px,0,0)` : `translate3d(${sd * (1 - inn) * 60}px,0,0)`;
        });
      }
    }

    /* DOM: hero, outro, tags, navigator */
    const hv = 1 - sm(st.h * 2.4);
    if (Math.abs(hv - cache.hero) > 0.001) {
      cache.hero = hv;
      hero.style.opacity = hv;
      hero.style.transform = axis === "x" ? `translate3d(${-(1 - hv) * 60}px,0,0)` : `translate3d(0,${-(1 - hv) * 40}px,0)`;
      hero.style.visibility = hv < 0.01 ? "hidden" : "visible";
    }
    heroScroll.style.opacity = pS < 0.05 && html.classList.contains("is-loaded") ? "" : "0";
    const ev = sm((st.o - 0.45) / 0.55);
    if (Math.abs(ev - cache.end) > 0.001) {
      cache.end = ev;
      end.style.opacity = ev; end.style.pointerEvents = ev > 0.5 ? "auto" : "none";
      end.style.transform = `translate3d(0,${(1 - ev) * 24}px,0)`;
    }
    const navIdx = st.h > 0.6 && st.o < 0.5 ? Math.max(0, Math.min(3, Math.round(st.t))) : -1;
    if (navIdx !== cache.nav) {
      cache.nav = navIdx;
      nav.classList.toggle("is-on", navIdx >= 0);
      navBtns.forEach((b, i) => { b.classList.toggle("is-on", i === navIdx); b.setAttribute("aria-current", i === navIdx ? "step" : "false"); });
    }
    if (navIdx >= 0) {
      const fill = st.park === navIdx ? st.pu : st.t > navIdx ? 1 : 0;
      navBars[navIdx].style.transform = axis === "x" ? `scaleX(${fill})` : `scaleY(${fill})`;
    }

    /* 3D: bottles */
    for (let i = 0; i < 4; i++) {
      const o = B[i], stg = 0.07 * i;
      let p, tilt, arc;
      if (st.h < 1) { const k = ss(CL((st.h - stg) / (1 - 3 * 0.07))); p = v3.copy(LP[i]).lerp(JP[i], k); tilt = mix(0, -R[i], k); arc = Math.sin(PI * k); }
      else if (st.o > 0) { const k = ss(CL((st.o - (0.21 - stg)) / (1 - 3 * 0.07))); p = v3.copy(JP[i]).lerp(EP[i], k); tilt = mix(-R[i], 0, k); arc = Math.sin(PI * k); }
      else { p = v3.copy(JP[i]); tilt = -R[i]; arc = 0; }
      const lineupK = st.h < 1 ? 1 - st.h : st.o;
      o.h.position.set(p.x, p.y + Math.sin(time / 1000 + i * 1.7) * 0.05 * A * (1 - lineupK), p.z + arc * 1.4);
      o.h.rotation.z = ((tilt + Math.sin(time / 1300 + i) * 1.2 * A * (1 - lineupK)) * PI) / 180;
      const f = CL(1 - Math.abs(st.t - i)) * st.h * (1 - st.o);
      const thJ = (pS * 2.3 * A + i * 1.7) * (1 - f) + PX * 0.5 * f;
      // Line-up sway; a hovered label turns its bottle to face you and lifts it
      lift[i] += ((hoverI === i ? 1 : 0) - lift[i]) * 0.12;
      const thT = Math.sin(time / 2400 + i * 1.3) * 0.55 * A * (1 - lift[i]);
      o.b.rotation.y = st.h < 1 ? mix(thT, thJ, st.h) : st.o > 0 ? mix(thJ, thT, st.o) : thJ;
      o.h.position.y += lift[i] * 0.3 * lineupK;

      const Q = processOf(st, i);
      const shown = st.seg.k === "hero" || st.seg.k === "intro" ? 1 : Q;
      drawLabel(o, shown);
      const fade = st.seg.k === "intro" ? 1 - sm(CL((st.u - 0.1) / 0.55)) : 1;   // finished prints dissolve as the tour begins
      if (o.foil) o.lab.material.opacity *= fade; else o.lab.material.opacity = fade;
      o.pr.u(Q, time); o.pr.g.visible = st.park === i && Q > 0.001 && Q < 0.999;

      o.shadow.position.set(o.h.position.x, o.h.position.y - 2.98, o.h.position.z);
      o.shadow.material.opacity = 0.5 * Math.max(1 - sm(st.h * 2.2), sm((st.o - 0.6) / 0.4));
      o.shadow.visible = o.shadow.material.opacity > 0.01;
    }

    /* 3D: camera */
    const fr = framing(st);
    cam.position.set(fr.x, fr.y, fr.H / (2 * TAN));
    cam.rotation.set(0, 0, (fr.r * PI) / 180);
    cam.updateMatrixWorld();

    /* 3D: light follows the depth of the close-up */
    const e = sm(st.depth), fi = st.park >= 0 ? st.park : Math.max(0, Math.min(3, Math.round(st.t)));
    const fb = B[fi].h.position;
    LG.K_.intensity = mix(1.25, 0.8, e) * LU; LG.R1.intensity = mix(1.5, 2.5, e) * LU; LG.R2.intensity = mix(1.2, 2.1, e) * LU; LG.A_.intensity = mix(0.12, 0.05, e) * LU;
    SPOT.position.set(fb.x + 2.5, fb.y + 5, 7); SPOT.target.position.set(fb.x, fb.y - 1, 0); SPOT.target.updateMatrixWorld();
    SPOT.intensity = e * (A ? 3.4 : 2.5) * 0.64 * LU;
    renderer.toneMappingExposure = mix(1.1, 0.9, e);
    vig.style.opacity = 0.4 + 0.45 * e;
    const Qa = st.park >= 0 ? st.q : 0;
    SWEEP.position.set(fb.x + Math.sin((time / 650) * A) * 1.1, fb.y - 1 + Math.cos((time / 900) * A) * 0.5, 1.6);
    SWEEP.intensity = st.park >= 0 ? ct(Qa, 0.9, 1) * (st.depth > 0.5 ? 1 : 0.5) * (A ? 2.6 : 1.3) * 0.8 * LU : 0;
    UVL.position.set(B[3].h.position.x, B[3].h.position.y - 1.5 * ct(Qa, 0.1, 0.85), 1.1);
    UVL.intensity = st.park === 3 ? ct(Qa, 0.05, 0.12) * (1 - ct(Qa, 0.9, 1)) * 1.8 * 0.8 * LU : 0;
    DIE.position.set(B[2].h.position.x, B[2].h.position.y - 1.09, 1.3);
    DIE.intensity = st.park === 2 ? ct(Qa, 0.5, 0.58) * (1 - ct(Qa, 0.66, 0.8)) * 2 * 0.8 * LU : 0;

    renderer.render(scene, cam);

    /* DOM: labels under the line-up bottles */
    const tv = st.seg.k === "hero" || st.seg.k === "intro" ? 1 - sm(st.h * 2.5) : st.seg.k === "outro" || st.seg.k === "end" ? sm((st.o - 0.55) / 0.45) : 0;
    if (tv > 0.001 || cache.tags > 0.001) {
      cache.tags = tv;
      tags.forEach((tg, i) => {
        const P = B[i].h.position;
        v3.set(P.x, P.y - BOTTLE_H / 2 - 0.25, P.z).project(cam);
        const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
        tg.style.transform = `translate3d(${x}px,${y}px,0) translateX(-50%)`;
        tg.style.opacity = tv;
        tg.style.pointerEvents = tv > 0.5 ? "auto" : "none";
        tg.tabIndex = tv > 0.5 ? 0 : -1;
      });
    }

    /* Live reel plays only while the foil panel is on screen */
    if (cache.pres[2] > 0.6) { if (reelV.paused) reelV.play().catch(() => {}); } else if (!reelV.paused) reelV.pause();

    if (ready && !readyFired) { readyFired = true; onReady && onReady(); }
  }

  /* ---------- Resize / rotation: keep the reader at the same point of the tour ---------- */
  // The page has already reflowed when this runs, so where the reader was is measured with the
  // geometry that was on screen until now (the section is one screen tall per step of the tour).
  let lastAxis = null, lastSpan = 0, lastTop = 0;
  const remember = () => { lastAxis = axis; lastSpan = span(); lastTop = section.offsetTop; };
  function onResize() {
    const S = CL((scrollY - lastTop) / lastSpan / total) * total;
    const inside = scrollY >= lastTop && scrollY <= lastTop + total * lastSpan;
    layout();
    cache.pres = [-1, -1, -1, -1]; cache.words = [-1, -1, -1, -1]; cache.hero = -1; cache.end = -1; cache.nav = -2;
    if (inside && (lastAxis !== axis || Math.abs(lastSpan - span()) > 1 || Math.abs(lastTop - section.offsetTop) > 1)) {
      pS = S; scrollTo(0, section.offsetTop + S * span());
    }
    remember();
  }
  // A rotation's resize event can arrive before the new size is laid out; the observer fires once it is
  let rz = 0;
  const schedule = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(onResize); };
  addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(stage);
  layout(); remember();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { B.forEach(o => { o.sig = -1; }); layout(); });
  requestAnimationFrame(frame);
  return { goTo };
}
