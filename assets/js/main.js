/* =========================================================
   Agro Alim Grup — page interactions (shared by all pages)
   ========================================================= */

/* ---- Site configuration: edit these values ---- */
const AAG_CONFIG = {
  email: "info@aag.md",             // TODO: confirm the public inbox with AAG
  phone: "",                        // e.g. "+373 22 000 000" — hidden while empty
  address: "Chișinău, Republic of Moldova",
  // Optional form backend (Formspree, Getform, own API…). When empty, the form opens a prefilled email.
  formEndpoint: ""
};

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dict = window.AAG_I18N;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- i18n ---------- */
  let lang = "en";
  try { lang = localStorage.getItem("aag-lang") || (navigator.language || "en").slice(0, 2); } catch (e) {}
  if (!dict[lang]) lang = "en";
  const t = (key) => (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
  window.AAG = { t, get lang() { return lang; }, config: AAG_CONFIG, heroProgress: 0 };

  // translate a subtree (also used for markup rendered later, e.g. product galleries)
  function translate(root = document) {
    $$("[data-i18n]", root).forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]", root).forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$("[data-i18n-aria]", root).forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  }
  window.AAG.translate = translate;

  function applyLang(next) {
    lang = dict[next] ? next : "en";
    document.documentElement.lang = lang;
    translate();
    $$(".lang button").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.lang === lang);
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    splitStatement();
    try { localStorage.setItem("aag-lang", lang); } catch (e) {}
    window.dispatchEvent(new CustomEvent("aag:lang", { detail: lang }));
  }
  $$(".lang button").forEach((b) => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* ---------- contact details ---------- */
  $$('[data-contact="email"]').forEach((el) => { el.textContent = AAG_CONFIG.email; el.href = "mailto:" + AAG_CONFIG.email; });
  $$('[data-contact="address"]').forEach((el) => { el.textContent = AAG_CONFIG.address; });
  if (AAG_CONFIG.phone) {
    $$('[data-contact="phone"]').forEach((el) => {
      el.textContent = AAG_CONFIG.phone;
      el.href = "tel:" + AAG_CONFIG.phone.replace(/[^\d+]/g, "");
      el.hidden = false;
    });
    $$('[data-contact-row="phone"]').forEach((el) => (el.hidden = false));
  }
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- grid overlay: press G (or add ?grid to the URL) ---------- */
  if (/[?&]grid\b/.test(location.search)) document.body.classList.add("show-grid");
  addEventListener("keydown", (e) => {
    if ((e.key === "g" || e.key === "G") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !e.metaKey && !e.ctrlKey) {
      document.body.classList.toggle("show-grid");
    }
  });

  /* ---------- statement word split ---------- */
  const statement = $("[data-split]");
  let words = [];
  function splitStatement() {
    if (!statement) return;
    statement.innerHTML = t("intro.statement").split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    words = $$(".w", statement);
    onScroll();
  }

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const burger = $(".nav__burger");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    $(".mobile-menu").setAttribute("aria-hidden", !open);
    if (window.AAG.lenis) open ? window.AAG.lenis.stop() : window.AAG.lenis.start();
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$(".mobile-menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); burger.focus(); }
  });

  // home page: highlight About / Contact links while those sections are in view
  const homeLinks = $$('.nav__links a[href^="index.html#"]');
  const homeSections = document.body.dataset.page === "home" ? homeLinks.map((a) => $(a.hash)) : [];

  // services page: sub-navigation
  const svcLinks = $$(".svc-nav a");
  const svcBlocks = svcLinks.map((a) => $(a.hash));

  /* ---------- scroll-linked effects ---------- */
  const progress = $(".progress span");
  const hero = $(".hero");
  const heroSticky = $(".hero__sticky");
  const process = $(".process");
  const track = $(".process__track");
  const steps = $$(".step");
  const bar = $(".process__bar");
  let lastY = scrollY;
  let ticking = false;

  function onScroll() {
    const y = scrollY;
    const vh = innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    if (!document.body.classList.contains("menu-open")) nav.classList.toggle("is-hidden", y > lastY && y > 300);
    lastY = y;

    if (hero && heroSticky) {
      const hp = clamp(y / Math.max(1, hero.offsetHeight - vh));
      heroSticky.style.setProperty("--p", hp.toFixed(4));
      window.AAG.heroProgress = hp;
    }

    if (words.length) {
      const r = statement.getBoundingClientRect();
      const sp = clamp((vh * .85 - r.top) / (r.height + vh * .35));
      const n = Math.round(sp * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }

    if (process && getComputedStyle(track).flexDirection === "row") {
      const r = process.getBoundingClientRect();
      const pp = clamp(-r.top / Math.max(1, process.offsetHeight - vh));
      const maxX = track.scrollWidth - innerWidth;
      track.style.setProperty("--x", (-pp * Math.max(0, maxX)).toFixed(1));
      bar.style.setProperty("--pp", pp.toFixed(4));
      const active = Math.min(steps.length - 1, Math.floor(pp * steps.length));
      steps.forEach((s, i) => s.classList.toggle("is-on", i === active && pp > 0));
    }

    if (homeSections.length) {
      let cur = -1;
      homeSections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .4) cur = i; });
      homeLinks.forEach((a, i) => a.classList.toggle("is-active", i === cur));
    }

    if (svcBlocks.length) {
      let cur = 0;
      svcBlocks.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .45) cur = i; });
      svcLinks.forEach((a, i) => {
        const on = i === cur;
        if (on && !a.classList.contains("is-active")) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        a.classList.toggle("is-active", on);
      });
    }
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const sibs = $$(":scope > .reveal", el.parentElement);
      el.style.transitionDelay = reduced ? "0s" : `${Math.min(Math.max(sibs.indexOf(el), 0), 4) * 0.07}s`;
      el.classList.add("in");
      setTimeout(() => (el.style.transitionDelay = ""), 1200);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
  // lets later-rendered markup join the reveal animation
  window.AAG.observe = (root) => $$(".reveal", root).forEach((el) => (reduced ? el.classList.add("in") : io.observe(el)));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      const start = +(el.dataset.from || 0);
      const t0 = performance.now();
      const dur = reduced ? 1 : 1600;
      const tick = (now) => {
        const k = clamp((now - t0) / dur);
        el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- contact form ---------- */
  const form = $("#contact-form");
  // preselect a service when arriving from a "Request a quote" link
  function preselect() {
    if (!form) return;
    try {
      const pre = sessionStorage.getItem("aag-service");
      if (pre) {
        const box = $(`input[name="services"][value="${pre}"]`, form);
        if (box) box.checked = true;
        sessionStorage.removeItem("aag-service");
      }
    } catch (e) {}
  }
  if (form) {
    const status = $(".form__status", form);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    preselect();

    const validate = () => {
      let ok = true;
      const mark = (name, bad) => {
        form.elements[name].closest(".field, .consent").classList.toggle("invalid", bad);
        if (bad) ok = false;
      };
      mark("name", !form.elements.name.value.trim());
      mark("email", !emailRe.test(form.elements.email.value.trim()));
      mark("message", form.elements.message.value.trim().length < 5);
      mark("consent", !form.elements.consent.checked);
      return ok;
    };
    ["name", "email", "message"].forEach((n) =>
      form.elements[n].addEventListener("input", () => {
        if (form.elements[n].closest(".field").classList.contains("invalid")) validate();
      })
    );
    form.elements.consent.addEventListener("change", () => form.elements.consent.closest(".consent").classList.remove("invalid"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form__status";
      if (form.elements._gotcha.value) return;
      if (!validate()) {
        status.textContent = t("f.check");
        status.classList.add("err");
        const first = $(".invalid input, .invalid textarea", form);
        if (first) first.focus();
        return;
      }
      const services = $$('input[name="services"]:checked', form).map((i) => dict.en[`svc.${i.value}.t`]);
      const data = {
        name: form.elements.name.value.trim(),
        company: form.elements.company.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        quantity: form.elements.quantity.value,
        services: services.join(", "),
        message: form.elements.message.value.trim(),
        language: lang
      };

      if (AAG_CONFIG.formEndpoint) {
        status.textContent = t("f.sending");
        try {
          const res = await fetch(AAG_CONFIG.formEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error(res.status);
          status.textContent = t("f.ok");
          status.classList.add("ok");
          form.reset();
        } catch (err) {
          status.textContent = `${t("f.fail")} ${AAG_CONFIG.email}`;
          status.classList.add("err");
        }
        return;
      }

      const lines = [
        `Name: ${data.name}`,
        data.company && `Company: ${data.company}`,
        `Email: ${data.email}`,
        data.phone && `Phone: ${data.phone}`,
        data.services && `Services: ${data.services}`,
        data.quantity && `Run size: ${data.quantity}`
      ].filter(Boolean).concat("", data.message);
      const subject = `Project request — ${data.company || data.name}`;
      location.href = `mailto:${AAG_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      status.textContent = t("f.mailto");
      status.classList.add("ok");
    });
  }
  // "Request a quote / similar project" links preselect the service (delegated: galleries render later)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-service]");
    if (!a) return;
    try { sessionStorage.setItem("aag-service", a.dataset.service); } catch (err) {}
    if (form && a.getAttribute("href").endsWith("#contact") && document.body.dataset.page === "home") preselect();
  });

  /* ---------- boot ---------- */
  applyLang(lang);
  onScroll();
  // motion.js adds "loaded" after the intro; this is only a fallback
  setTimeout(() => document.body.classList.add("loaded"), 4000);
})();
