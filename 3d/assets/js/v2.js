/* Layout v2: shared UI + orientation-adaptive 3D tour + horizontal sections. */
import { detectLang } from "./i18n.js";
import { $, $$, reduce, initCommon, initHeader, initJumps, initPreloader, lazyStudio, studioFallback } from "./ui.js";

const html = document.documentElement;
const CL = v => Math.max(0, Math.min(1, v));
let journey = null;

/* Process: the rail fills as you read (across on wide landscape screens, down otherwise) */
const acrossMQ = matchMedia("(orientation: landscape) and (min-width: 1000px)");
let rail = null;
function updateRail() {
  if (!rail) { const s = $("steps"); if (!s) return; rail = { s, b: $("stepsRail"), items: $$(".step2", s) }; }
  const r = rail.s.getBoundingClientRect();
  const k = CL((innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.1));
  rail.b.style.transform = acrossMQ.matches ? `scaleX(${k})` : `scaleY(${k})`;
  rail.items.forEach((it, i) => it.classList.toggle("is-lit", k >= (i + 0.35) / rail.items.length || k >= 0.999));
}

/* Services: native horizontal scroller + arrows, progress and mouse drag */
function initGallery() {
  const track = document.querySelector(".hs__track"); if (!track) return;
  const bar = $("hsBar"), prev = document.querySelector("[data-hs-prev]"), next = document.querySelector("[data-hs-next]");
  const update = () => {
    const max = track.scrollWidth - track.clientWidth, vis = Math.min(1, track.clientWidth / track.scrollWidth);
    const k = max > 0 ? track.scrollLeft / max : 0;
    bar.style.width = `${vis * 100}%`;
    bar.style.transform = `translateX(${k * (1 / vis - 1) * 100}%)`;
    prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > max - 4;
  };
  track.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update); update();
  const step = dir => {
    const card = track.querySelector(".hs__card:not(.hs__card--wide)");
    track.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: reduce ? "auto" : "smooth" });
  };
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  let down = false, x0 = 0, s0 = 0;
  track.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; x0 = e.clientX; s0 = track.scrollLeft; });
  addEventListener("pointermove", e => {
    if (!down) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 4) track.classList.add("is-drag");
    if (track.classList.contains("is-drag")) track.scrollLeft = s0 - dx;
  });
  addEventListener("pointerup", () => { if (!down) return; down = false; requestAnimationFrame(() => track.classList.remove("is-drag")); });
}

/* Industries: repeat each row until it is wider than the screen, then double it for a seamless loop */
function initMarquee() {
  $$("[data-mq]").forEach(row => {
    const items = [...row.children];
    const clone = it => { const c = it.cloneNode(true); c.setAttribute("aria-hidden", "true"); return c; };
    let guard = 0;
    while (row.scrollWidth < innerWidth * 1.1 && guard++ < 8) items.forEach(it => row.appendChild(clone(it)));
    [...row.children].forEach(it => row.appendChild(clone(it)));
  });
}

/* Compare → configurator: "Try it" pre-selects the technology */
function initPicks() {
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-pick]"); if (!b) return;
    const group = document.querySelector('[data-studio="tech"]');
    const chip = group.querySelector(`[data-v="${b.dataset.pick}"]`);
    group.querySelectorAll("[data-v]").forEach(c => c.setAttribute("aria-pressed", String(c === chip)));
    chip.click();                                     // applies it if the configurator is already running
    $("studio").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });
}

async function init3D(finish) {
  const { hasWebGL } = await import("./bottles.js");
  if (!hasWebGL()) throw new Error("no webgl");
  const { initJourney } = await import("./journey.js");
  journey = initJourney({ onReady: () => setTimeout(finish, 150) });
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  idle(async () => { try { (await import("./story.js")).initCompare(); } catch (e) { console.warn(e); } });
  lazyStudio();
}

initCommon(detectLang());
initHeader({ onScroll: updateRail });
initJumps(() => journey);
initGallery(); initMarquee(); initPicks();
const finish = initPreloader();
init3D(finish).catch(err => {
  console.warn("3D disabled:", err);
  html.classList.add("no-gl"); studioFallback();
  finish();
});
