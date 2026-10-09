/* Shared site UI used by every layout: language, reveals, header, menu,
   segmented controls, accordion, counters, quote form, toast, preloader. */
import { applyLang, t } from "./i18n.js";

/* Contact details & form endpoint. Set formEndpoint (e.g. a Formspree URL) to receive
   requests directly; without it the form opens the visitor's email app. */
export const CONFIG = {
  email: "info@aag.md",
  phone: "",
  web: "aag.md",
  formEndpoint: ""
};

export const $ = id => document.getElementById(id);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;
const HERO = "[data-hero]";

/* ---------- Words → masked spans for headline reveals ---------- */
export function splitWords(el) {
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  let n = 0;
  el.innerHTML = lines.map(line => {
    const tmp = document.createElement("div"); tmp.innerHTML = line;
    const words = tmp.textContent.trim().split(/\s+/).filter(Boolean);
    return words.map(w => `<span class="w"><span style="--wi:${n++}">${w.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span></span>`).join(" ");
  }).join("<br>");
  el.classList.add("split");
}
const splitAll = () => $$("[data-split]").forEach(splitWords);

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); } });
}, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
export function observeReveals() {
  $$("[data-reveal], [data-split]").forEach(el => {
    if (el.closest(HERO)) return;               // the hero is revealed after the preloader
    if (!el.classList.contains("is-in")) revealIO.observe(el);
  });
}

/* ---------- Segmented controls: sliding thumb ---------- */
export function syncSeg(seg) {
  let th = seg.querySelector(".seg__thumb");
  if (!th) { th = document.createElement("span"); th.className = "seg__thumb"; th.setAttribute("aria-hidden", "true"); seg.prepend(th); }
  const on = seg.querySelector('button[aria-pressed="true"]');
  if (!on || !seg.offsetParent) return;
  th.style.width = on.offsetWidth + "px";
  th.style.transform = `translateX(${on.offsetLeft}px)`;
}
export const syncSegs = () => $$(".seg").forEach(syncSeg);

/* ---------- Meters (1–5) ---------- */
export function renderMeters() {
  $$(".meter[data-v]").forEach(m => {
    const v = +m.dataset.v;
    m.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("");
    m.setAttribute("role", "img");
    m.setAttribute("aria-label", `${v} ${t("ui.of5")}`);
  });
}

/* ---------- Contact details ---------- */
export function fillContacts() {
  $$('[data-contact="email"]').forEach(a => { a.href = `mailto:${CONFIG.email}`; a.textContent = CONFIG.email; });
  const phoneRow = document.querySelector('[data-contact-row="phone"]');
  if (phoneRow) {
    phoneRow.hidden = !CONFIG.phone;
    const a = phoneRow.querySelector("a");
    if (CONFIG.phone && a) { a.href = `tel:${CONFIG.phone.replace(/[^+\d]/g, "")}`; a.textContent = CONFIG.phone; }
  }
}

/* ---------- Language ---------- */
export function setLang(l) {
  applyLang(l);
  splitAll();
  $$("[data-split]").forEach(el => {
    if (el.closest(HERO) ? html.classList.contains("is-loaded") : el.dataset.seen) el.classList.add("is-in");
  });
  renderMeters();
  fillContacts();
  requestAnimationFrame(syncSegs);
}

/* ---------- Toast ---------- */
let toastTimer;
export function toast(msg) {
  const el = $("toast"); el.querySelector("span").textContent = msg;
  el.classList.add("is-on"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 3600);
}

/* ---------- Header: solid on scroll, hides while reading down, page progress ---------- */
export function initHeader({ onScroll } = {}) {
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
    if (onScroll) onScroll(y);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  hdr.addEventListener("focusin", () => { hdr.classList.remove("is-hidden"); html.classList.remove("hdr-hidden"); });
  update();

  // Active section in the nav
  const links = $$(".hdr__nav a");
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const alias = { top: "tech", industries: "services", process: "about" };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.remove("is-active"));
    const a = map.get(e.target.id) || map.get(alias[e.target.id]);
    if (a && !(e.target.id === "top" && scrollY < innerHeight * 0.6)) a.classList.add("is-active");
  }), { rootMargin: "-45% 0px -50% 0px" });
  ["top", "compare", "studio", "services", "industries", "about", "process", "faq", "contact"].forEach(id => { const s = $(id); if (s) io.observe(s); });
}

/* ---------- Mobile menu ---------- */
export function initMenu() {
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
  addEventListener("resize", () => { if (innerWidth > 1240 && menu.classList.contains("is-open")) close(); });
}

/* ---------- Links that jump inside the 3D story ([data-go]) ---------- */
export function initJumps(getStory) {
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-go]");
    const story = getStory();
    if (!a || !story) return;
    e.preventDefault();
    story.goTo(+a.dataset.go);
  });
}

/* ---------- Accordion ---------- */
export function initAccordion() {
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
export function initCounters() {
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

/* ---------- Quote form ---------- */
export function initForm() {
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
export function initPreloader() {
  let loaded = false;
  const pre = $("pre"), bar = pre.querySelector(".pre__bar b"), t0 = performance.now();
  const finish = () => {
    if (loaded) return; loaded = true;
    bar.style.transform = "scaleX(1)";
    setTimeout(() => {
      pre.classList.add("is-done");
      html.classList.add("is-loaded");
      const title = document.querySelector(`${HERO} [data-split]`);
      if (title) setTimeout(() => title.classList.add("is-in"), 180);
    }, 260);
  };
  const tick = now => { if (loaded) return; bar.style.transform = `scaleX(${Math.min(0.9, (now - t0) / 1400)})`; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(finish, 4500); // never hold the page hostage
  return finish;
}

/* ---------- Configurator text before the 3D studio boots (or when it can't): follows the language ---------- */
function initStudioText() {
  const sum = $("stSum"), input = $("stText"); if (!sum) return;
  if (input) input.addEventListener("input", () => { input.dataset.edited = "1"; });
  const pick = k => +(document.querySelector(`[data-studio="${k}"] [aria-pressed="true"]`)?.dataset.v || 0);
  const sync = () => {
    if (sum.dataset.live) return;                     // studio.js has taken over
    const edited = input && input.dataset.edited;
    const text = edited ? input.value.trim() : t("st.default");
    if (input && !edited) input.value = text;
    sum.textContent = `${t(`tech.${pick("tech")}.name`)} · ${t(`st.glass.${pick("glass")}`)} · ${t(`st.shape.${pick("shape")}`)} · «${text}»`;
  };
  sync(); document.addEventListener("langchange", sync);
}

/* ---------- Everything every page needs ---------- */
export function initCommon(lang) {
  const y = $("year"); if (y) y.textContent = new Date().getFullYear();
  setLang(lang);
  initStudioText();
  observeReveals();
  document.addEventListener("click", e => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });
  document.addEventListener("toast", e => toast(e.detail));
  $$(".seg").forEach(seg => seg.addEventListener("click", () => requestAnimationFrame(() => syncSeg(seg))));
  addEventListener("resize", syncSegs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncSegs);
  // Split headings that were seen stay visible after a language switch
  const seenIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.dataset.seen = "1"; }), { threshold: 0.18 });
  $$("[data-split]").forEach(el => seenIO.observe(el));
  initMenu(); initAccordion(); initCounters(); initForm();
}

export function studioFallback() {
  const v = document.querySelector(".studio__view");
  if (!v) return;
  v.querySelector("canvas").hidden = true;
  const hud = v.querySelector(".studio__hud"); if (hud) hud.hidden = true;
  v.querySelector(".studio__fallback").hidden = false;
}

/* Load the configurator when its section approaches the viewport */
export function lazyStudio() {
  const el = $("studio"); if (!el) return;
  const io = new IntersectionObserver(async es => {
    if (!es.some(e => e.isIntersecting)) return; io.disconnect();
    try { (await import("./studio.js")).initStudio(); }
    catch (e) { console.warn(e); studioFallback(); }
  }, { rootMargin: "600px" });
  io.observe(el);
}
