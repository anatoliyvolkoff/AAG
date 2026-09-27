/* =========================================================
   Agro Alim Grup — motion layer
   Smooth scroll (Lenis) · opening loader · page-transition curtain ·
   char/line splits · masked reveals · parallax · velocity marquee ·
   banner expand
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AAG = window.AAG || (window.AAG = {});
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    html.classList.add("has-lenis");
    AAG.lenis = lenis;
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  AAG.scrollTo = (target, opts = {}) => {
    const el = typeof target === "string" ? $(target) : target;
    if (lenis) return lenis.scrollTo(el ?? target, { offset: el && el !== document.body ? -24 : 0, duration: 1.4, ...opts });
    if (typeof target === "number") scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
    else if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  /* ---------- splits ---------- */
  function splitChars() {
    $$("[data-split-chars]").forEach((el) => {
      if (el.dataset.splitDone === el.textContent) return;
      const text = el.textContent;
      el.innerHTML = [...text].map((c, i) => `<span class="ch" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
      el.dataset.splitDone = el.textContent;
      el.setAttribute("aria-label", text);
    });
  }
  // subpage display headings: split <br> lines into masked lines
  function splitLines() {
    $$(".page-hero .display").forEach((el) => {
      const parts = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = parts.map((p) => `<span class="split-line"><span>${p}</span></span>`).join("");
    });
  }
  function prepare() { splitChars(); splitLines(); }
  prepare();
  window.addEventListener("aag:lang", () => {
    prepare();
    $$(".page-hero .split-line").forEach((l) => l.classList.add("in"));
    $$(".sec-en, .cta-big__word").forEach((el) => { if (el.dataset.seen) el.classList.add("in"); });
  });

  /* ---------- reveal observers ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.dataset.seen = "1";
      io.unobserve(e.target);
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
  const observeReveals = () => $$(".sec-en, .cta-big__word, .mask").forEach((el) => io.observe(el));

  /* ---------- parallax + marquee (one rAF loop) ---------- */
  const shots = $$(".shot");
  const track = $("[data-marquee]");
  let mx = 0, dir = 1, lastY = scrollY, vel = 0;
  function loop() {
    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    vel += (dy - vel) * 0.1;
    if (dy !== 0) dir = dy > 0 ? 1 : -1;
    const vh = innerHeight;

    if (!reduced) {
      for (const s of shots) {
        const r = s.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const off = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        s.style.setProperty("--py", `${(-off * 3).toFixed(2)}%`);
      }
      if (track) {
        const half = track.scrollWidth / 2;
        mx -= (0.6 + Math.min(Math.abs(vel) * 0.35, 14)) * dir;
        if (mx <= -half) mx += half;
        if (mx > 0) mx -= half;
        track.style.transform = `translate3d(${mx.toFixed(2)}px,0,0)`;
      }
    }
    // banner: frame expands as it scrolls into view
    if (banner) {
      const r = banner.getBoundingClientRect();
      const bp = reduced ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh * .75)));
      banner.style.setProperty("--b", bp.toFixed(3));
    }
    // nav state
    nav && nav.classList.toggle("is-scrolled", y > 40);
    requestAnimationFrame(loop);
  }
  const nav = $(".nav");
  const banner = $(".banner__frame");
  requestAnimationFrame(loop);

  /* ---------- links: anchors + page transitions ---------- */
  const curtain = $(".curtain");
  const samePage = (url) => url.pathname.replace(/index\.html$/, "") === location.pathname.replace(/index\.html$/, "");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (/^(mailto|tel):/.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;

    if (samePage(url)) {
      if (!url.hash) return;
      e.preventDefault();
      if (document.body.classList.contains("menu-open")) $(".nav__burger").click();
      AAG.scrollTo(url.hash === "#top" ? 0 : url.hash);
      history.replaceState(null, "", url.hash === "#top" ? location.pathname : url.hash);
      return;
    }
    if (reduced) return;
    e.preventDefault();
    store.set("aag-pt", "1");
    lenis && lenis.stop();
    curtain.classList.remove("is-out");
    curtain.classList.add("is-in");
    setTimeout(() => { location.href = url.href; }, 720);
  });
  // returning via back/forward cache: clear the curtain
  addEventListener("pageshow", (e) => {
    if (e.persisted) { curtain.classList.remove("is-in"); lenis && lenis.start(); }
  });

  /* ---------- intro: loader / curtain out ---------- */
  function ready() {
    document.body.classList.add("loaded");
    $$(".page-hero .split-line").forEach((l) => l.classList.add("in"));
    observeReveals();
    lenis && lenis.start();
    // honour #hash on arrival
    if (location.hash && /^#[\w-]+$/.test(location.hash) && !/^#p\d+$/.test(location.hash)) {
      const t = $(location.hash);
      if (t) setTimeout(() => AAG.scrollTo(t, { immediate: true }), 50);
    }
    window.dispatchEvent(new Event("aag:ready"));
  }
  store.set("aag-visited", "1");
  const arriving = html.classList.contains("pt-arrive");
  const first = html.classList.contains("is-first");
  store.del("aag-pt");

  if (arriving) {
    lenis && lenis.stop();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add("is-out");
      setTimeout(() => { html.classList.remove("pt-arrive"); curtain.classList.remove("is-out", "is-in"); }, 950);
      setTimeout(ready, 250);
    }));
  } else if (first) {
    lenis && lenis.stop();
    const loader = $(".loader");
    const count = $(".loader__count", loader);
    const bar = $(".loader__bar", loader);
    const t0 = performance.now();
    const dur = 1700;
    let fontsReady = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => (fontsReady = true));
    setTimeout(() => (fontsReady = true), 2500);
    (function tick(now) {
      let k = Math.min(1, (now - t0) / dur);
      if (!fontsReady) k = Math.min(k, 0.9);
      const eased = 1 - Math.pow(1 - k, 3);
      count.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      bar.style.setProperty("--lp", eased.toFixed(3));
      if (k < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add("is-done");
        setTimeout(ready, 350);
        setTimeout(() => html.classList.remove("is-first"), 1200);
      }, 200);
    })(t0);
  } else {
    ready();
  }
})();
