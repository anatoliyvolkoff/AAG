/* Site UI: language, motion, navigation, forms. 3D modules load lazily. */
import { applyLang, detectLang, t } from "./i18n.js";

/* Contact details & form endpoint. Set formEndpoint (e.g. a Formspree URL) to receive
   requests directly; without it the form opens the visitor's email app. */
export const CONFIG = {
  email: "info@aag.md",
  phone: "",
  web: "aag.md",
  formEndpoint: ""
};

const $ = id => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;
let story = null;

/* ---------- Words → masked spans for headline reveals ---------- */
function splitWords(el) {
  const src = el.innerHTML;
  const lines = src.split(/<br\s*\/?>/i);
  let n = 0;
  el.innerHTML = lines.map(line => {
    const tmp = document.createElement("div"); tmp.innerHTML = line;
    const words = tmp.textContent.trim().split(/\s+/).filter(Boolean);
    return words.map(w => `<span class="w"><span style="--wi:${n++}">${w.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span></span>`).join(" ");
  }).join("<br>");
  el.classList.add("split");
}
function splitAll() { $$("[data-split]").forEach(splitWords); }

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); } });
}, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
function observeReveals() {
  $$("[data-reveal], [data-split]").forEach(el => {
    if (el.closest(".hero")) return;           // hero is revealed after the preloader
    if (!el.classList.contains("is-in")) revealIO.observe(el);
  });
}

/* ---------- Segmented controls: sliding thumb ---------- */
function syncSeg(seg) {
  let th = seg.querySelector(".seg__thumb");
  if (!th) { th = document.createElement("span"); th.className = "seg__thumb"; th.setAttribute("aria-hidden", "true"); seg.prepend(th); }
  const on = seg.querySelector('button[aria-pressed="true"]');
  if (!on || !seg.offsetParent) return;
  th.style.width = on.offsetWidth + "px";
  th.style.transform = `translateX(${on.offsetLeft}px)`;
}
const syncSegs = () => $$(".seg").forEach(syncSeg);

/* ---------- Language ---------- */
function setLang(l) {
  applyLang(l);
  splitAll();
  $$("[data-split]").forEach(el => { if (el.closest(".hero") ? html.classList.contains("is-loaded") : el.dataset.seen) el.classList.add("is-in"); });
  renderMeters();
  fillContacts();
  requestAnimationFrame(syncSegs);
}

/* ---------- Meters (1–5) ---------- */
function renderMeters() {
  $$(".meter[data-v]").forEach(m => {
    const v = +m.dataset.v;
    m.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("");
    m.setAttribute("role", "img");
    m.setAttribute("aria-label", `${v} ${t("ui.of5")}`);
  });
}

/* ---------- Contact details ---------- */
function fillContacts() {
  $$('[data-contact="email"]').forEach(a => { a.href = `mailto:${CONFIG.email}`; a.textContent = CONFIG.email; });
  const phoneRow = document.querySelector('[data-contact-row="phone"]');
  if (phoneRow) {
    phoneRow.hidden = !CONFIG.phone;
    const a = phoneRow.querySelector("a");
    if (CONFIG.phone && a) { a.href = `tel:${CONFIG.phone.replace(/[^+\d]/g, "")}`; a.textContent = CONFIG.phone; }
  }
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $("toast"); el.querySelector("span").textContent = msg;
  el.classList.add("is-on"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 3600);
}
document.addEventListener("toast", e => toast(e.detail));

/* ---------- Header: solid on scroll, hides while reading down, progress ---------- */
function initHeader() {
  const hdr = $("hdr"), bar = $("progress"), menu = $("menu");
  let lastY = scrollY, ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle("is-solid", y > 8);
    const down = y > lastY + 4, up = y < lastY - 6;
    if (!menu.classList.contains("is-open")) {
      if (down && y > 160) { hdr.classList.add("is-hidden"); html.classList.add("hdr-hidden"); }
      else if (up || y < 160) { hdr.classList.remove("is-hidden"); html.classList.remove("hdr-hidden"); }
    }
    if (Math.abs(y - lastY) > 4) lastY = y;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    updateRail();
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  hdr.addEventListener("focusin", () => { hdr.classList.remove("is-hidden"); html.classList.remove("hdr-hidden"); });
  update();

  // Active section in the nav
  const links = $$(".hdr__nav a");
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.remove("is-active"));
    const id = e.target.id === "top" ? "tech" : e.target.id;
    const a = map.get(id) || (e.target.id === "industries" ? map.get("services") : e.target.id === "process" ? map.get("about") : null);
    if (a && !(e.target.id === "top" && scrollY < innerHeight * 0.6)) a.classList.add("is-active");
  }), { rootMargin: "-45% 0px -50% 0px" });
  ["top", "compare", "studio", "services", "industries", "about", "process", "faq", "contact"].forEach(id => { const s = $(id); if (s) io.observe(s); });
}

/* ---------- Mobile menu ---------- */
function initMenu() {
  const btn = $("burger"), menu = $("menu");
  $$(".menu__nav a").forEach((a, i) => a.style.setProperty("--i", i));
  const open = () => {
    menu.hidden = false; btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", t("nav.close"));
    btn.querySelector("use").setAttribute("href", "#i-close");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => { menu.classList.add("is-open"); syncSegs(); });
  };
  const close = () => {
    menu.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", t("nav.menu"));
    btn.querySelector("use").setAttribute("href", "#i-menu");
    document.body.style.overflow = "";
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 420);
  };
  btn.addEventListener("click", () => (menu.classList.contains("is-open") ? close() : open()));
  menu.addEventListener("click", e => { if (e.target.closest("a")) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && menu.classList.contains("is-open")) { close(); btn.focus(); } });
  addEventListener("resize", () => { if (innerWidth > 1080 && menu.classList.contains("is-open")) close(); });
}

/* ---------- In-story jumps ---------- */
function initJumps() {
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-go]");
    if (!a || !story) return;
    e.preventDefault();
    story.goTo(+a.dataset.go);
  });
}

/* ---------- Accordion ---------- */
function initAccordion() {
  $$(".acc__btn").forEach(btn => {
    const panel = $(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      const h = panel.firstElementChild.offsetHeight;
      if (open) {
        panel.style.height = h + "px";
        panel.addEventListener("transitionend", function te() { if (btn.getAttribute("aria-expanded") === "true") panel.style.height = "auto"; panel.removeEventListener("transitionend", te); });
      } else {
        panel.style.height = h + "px"; panel.offsetHeight; panel.style.height = "0px";
      }
    });
  });
}

/* ---------- Count-up numbers ---------- */
function initCounters() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, from = +(el.dataset.from || 0);
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), d = 1600;
    const step = now => {
      const k = Math.min(1, (now - t0) / d), v = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(from + (to - from) * v);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach(el => io.observe(el));
}

/* ---------- Process rail draws as you scroll ---------- */
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

/* ---------- Quote form ---------- */
function initForm() {
  const form = $("quote"), status = $("fStatus"), send = $("fSend");
  const techChips = $$("#fTech .chip");
  techChips.forEach(c => c.addEventListener("click", () => c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"))));

  // Mock-up handed over from the configurator
  const row = $("fMockupRow"), mock = $("fMockup");
  document.addEventListener("studio:cta", e => {
    mock.textContent = e.detail.summary; row.hidden = false;
    const tech = ["0", "1", "2", "3"].find(v => e.detail.summary.startsWith(t(`tech.${v}.name`)));
    if (tech) techChips.forEach(c => { if (c.dataset.v === tech) c.setAttribute("aria-pressed", "true"); });
  });
  $("fMockupClear").addEventListener("click", () => { row.hidden = true; mock.textContent = ""; });

  const rules = {
    name: v => v.trim().length > 1,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    msg: v => v.trim().length > 4,
    consent: (_, el) => el.checked
  };
  const inputOf = f => f.querySelector("input, textarea");
  const check = f => {
    const key = f.dataset.f, el = inputOf(f), ok = rules[key](el.value, el);
    f.classList.toggle("is-invalid", !ok);
    const err = f.querySelector(".field__error"); if (err) err.hidden = ok;
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  };
  $$("[data-f]", form).forEach(f => {
    const el = inputOf(f);
    el.addEventListener("blur", () => { if (el.value || f.dataset.f === "consent") check(f); });
    el.addEventListener("input", () => { if (f.classList.contains("is-invalid")) check(f); });
    el.addEventListener("change", () => { if (f.classList.contains("is-invalid")) check(f); });
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const fields = $$("[data-f]", form), bad = fields.filter(f => !check(f));
    if (bad.length) { status.textContent = t("f.check"); inputOf(bad[0]).focus(); return; }
    const techs = techChips.filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent.trim());
    const qtySel = $("fQty"), qty = qtySel.value ? qtySel.options[qtySel.selectedIndex].text : "";
    const data = {
      name: $("fName").value.trim(), company: $("fCompany").value.trim(), email: $("fEmail").value.trim(), phone: $("fPhone").value.trim(),
      technologies: techs.join(", "), run: qty, mockup: row.hidden ? "" : mock.textContent, message: $("fMsg").value.trim(), lang: html.lang
    };
    if (CONFIG.formEndpoint) {
      send.disabled = true; status.textContent = t("f.sending");
      try {
        const r = await fetch(CONFIG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        status.textContent = ""; toast(t("f.ok")); form.reset(); techChips.forEach(c => c.setAttribute("aria-pressed", "false")); row.hidden = true;
      } catch (_) {
        status.innerHTML = `${t("f.fail")} <a class="link" href="mailto:${CONFIG.email}">${CONFIG.email}</a>`;
      } finally { send.disabled = false; }
      return;
    }
    const lines = [
      [t("f.name"), data.name], [t("f.company"), data.company], [t("f.email"), data.email], [t("f.phone"), data.phone],
      [t("f.tech"), data.technologies], [t("f.qty"), data.run], [t("f.mockup"), data.mockup], ["", ""], [t("f.msg"), ""], ["", data.message]
    ].filter(([k, v]) => v || !k).map(([k, v]) => (k ? `${k}: ${v}` : v));
    const subject = `${t("f.subject")} — ${data.company || data.name}`;
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    status.textContent = t("f.mailto");
  });
}

/* ---------- Preloader & hero entrance ---------- */
let loaded = false;
function finishLoading() {
  if (loaded) return; loaded = true;
  const pre = $("pre"), b = pre.querySelector(".pre__bar b");
  b.style.transform = "scaleX(1)";
  setTimeout(() => {
    pre.classList.add("is-done");
    html.classList.add("is-loaded");
    const title = document.querySelector(".hero [data-split]");
    if (title) setTimeout(() => title.classList.add("is-in"), 180);
  }, 260);
}
function startPreloader() {
  const b = $("pre").querySelector(".pre__bar b"), t0 = performance.now();
  const tick = now => { if (loaded) return; b.style.transform = `scaleX(${Math.min(0.9, (now - t0) / 1400)})`; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(finishLoading, 4500); // never hold the page hostage
}

/* ---------- 3D (lazy) ---------- */
async function init3D() {
  const { hasWebGL } = await import("./bottles.js");
  if (!hasWebGL()) throw new Error("no webgl");
  const mod = await import("./story.js");
  story = mod.initStory({ onReady: () => setTimeout(finishLoading, 150) });
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  idle(() => { try { mod.initCompare(); } catch (e) { console.warn(e); } });
  const studioEl = $("studio");
  const io = new IntersectionObserver(async es => {
    if (!es.some(e => e.isIntersecting)) return; io.disconnect();
    try { (await import("./studio.js")).initStudio(); }
    catch (e) { console.warn(e); studioFallback(); }
  }, { rootMargin: "600px" });
  io.observe(studioEl);
}
function studioFallback() {
  const v = document.querySelector(".studio__view");
  v.querySelector("canvas").hidden = true; v.querySelector(".studio__hud").hidden = true;
  v.querySelector(".studio__fallback").hidden = false;
}

/* ---------- Boot ---------- */
function boot() {
  $("year").textContent = new Date().getFullYear();
  setLang(detectLang());
  observeReveals();
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang);
  });
  $$(".seg").forEach(seg => seg.addEventListener("click", () => requestAnimationFrame(() => syncSeg(seg))));
  addEventListener("resize", syncSegs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncSegs);
  // Mark split headings as seen so a language switch keeps them visible
  const seenIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.dataset.seen = "1"; } }), { threshold: 0.18 });
  $$("[data-split]").forEach(el => seenIO.observe(el));

  initHeader(); initMenu(); initJumps(); initAccordion(); initCounters(); initForm();
  startPreloader();
  init3D().catch(err => {
    console.warn("3D disabled:", err);
    html.classList.add("no-gl"); studioFallback();
    $$(".cmp__stage").forEach(s => s.classList.add("is-static"));
    finishLoading();
  });
}
boot();
