/* Classic layout (v1): shared UI + vertical 3D story. 3D modules load lazily. */
import { detectLang } from "./i18n.js";
import { $, $$, initCommon, initHeader, initJumps, initPreloader, lazyStudio, studioFallback } from "./ui.js";

const html = document.documentElement;
let story = null;

/* Process rail draws as you scroll */
let railEls = null;
function updateRail() {
  if (!railEls) {
    const steps = $("steps"); if (!steps) return;
    railEls = { steps, b: $("stepsRail"), items: $$(".step", steps) };
  }
  const { steps, b, items } = railEls, r = steps.getBoundingClientRect();
  const vertical = innerWidth <= 1000;
  const k = Math.max(0, Math.min(1, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.1)));
  b.style.transform = vertical ? `scaleY(${k})` : `scaleX(${k})`;
  items.forEach((it, i) => it.classList.toggle("is-lit", k >= (i + 0.35) / items.length || k >= 0.999));
}

async function init3D(finishLoading) {
  const { hasWebGL } = await import("./bottles.js");
  if (!hasWebGL()) throw new Error("no webgl");
  const mod = await import("./story.js");
  story = mod.initStory({ onReady: () => setTimeout(finishLoading, 150) });
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  idle(() => { try { mod.initCompare(); } catch (e) { console.warn(e); } });
  lazyStudio();
}

initCommon(detectLang());
initHeader({ onScroll: updateRail });
initJumps(() => story);
const finishLoading = initPreloader();
init3D(finishLoading).catch(err => {
  console.warn("3D disabled:", err);
  html.classList.add("no-gl"); studioFallback();
  finishLoading();
});
