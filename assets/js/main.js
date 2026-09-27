/* =========================================================
   Agro Alim Grup — page interactions
   ========================================================= */

/* ---- Site configuration: edit these values ---- */
const AAG_CONFIG = {
  email: "info@aag.md",             // TODO: confirm the public inbox with AAG
  phone: "",                        // e.g. "+373 22 000 000" — row stays hidden while empty
  address: "Chișinău, Republic of Moldova",
  // Optional form backend (Formspree, Getform, own API…). When empty, the form opens a prefilled email.
  formEndpoint: ""
};

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const dict = window.AAG_I18N;

  /* ---------- i18n ---------- */
  let lang = "en";
  try { lang = localStorage.getItem("aag-lang") || (navigator.language || "en").slice(0, 2); } catch (e) {}
  if (!dict[lang]) lang = "en";

  const t = (key) => (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
  window.AAG = { t, get lang() { return lang; }, config: AAG_CONFIG };

  function applyLang(next) {
    lang = dict[next] ? next : "en";
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$(".lang button").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === lang));
    splitStatement();
    try { localStorage.setItem("aag-lang", lang); } catch (e) {}
    window.dispatchEvent(new CustomEvent("aag:lang", { detail: lang }));
  }
  $$(".lang button").forEach((b) => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* ---------- contact details ---------- */
  const emailEl = $('[data-contact="email"]');
  emailEl.textContent = AAG_CONFIG.email;
  emailEl.href = "mailto:" + AAG_CONFIG.email;
  $('[data-contact="address"]').textContent = AAG_CONFIG.address;
  if (AAG_CONFIG.phone) {
    const ph = $('[data-contact="phone"]');
    ph.textContent = AAG_CONFIG.phone;
    ph.href = "tel:" + AAG_CONFIG.phone.replace(/[^\d+]/g, "");
    $('[data-contact-row="phone"]').hidden = false;
  }
  $("#year").textContent = new Date().getFullYear();

  /* ---------- statement word split ---------- */
  const statement = $("[data-split]");
  let words = [];
  function splitStatement() {
    const text = t("intro.statement");
    statement.innerHTML = text.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    words = $$(".w", statement);
    onScroll();
  }

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const burger = $(".nav__burger");
  burger.addEventListener("click", () => {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    $(".mobile-menu").setAttribute("aria-hidden", !open);
  });
  $$(".mobile-menu a").forEach((a) => a.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
  }));

  const navLinks = $$(".nav__links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href")));

  /* ---------- scroll-linked effects ---------- */
  const progress = $(".progress span");
  const hero = $(".hero");
  const heroSticky = $(".hero__sticky");
  const process = $(".process");
  const track = $(".process__track");
  const steps = $$(".step");
  const bar = $(".process__bar");
  let lastY = 0;
  let ticking = false;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function onScroll() {
    const y = scrollY;
    const vh = innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    // hide nav when scrolling down, show on up
    if (!document.body.classList.contains("menu-open")) nav.classList.toggle("is-hidden", y > lastY && y > 400);
    lastY = y;

    // hero progress 0..1
    const hp = clamp(y / Math.max(1, hero.offsetHeight - vh));
    heroSticky.style.setProperty("--p", hp.toFixed(4));
    window.AAG.heroProgress = hp;

    // statement word highlight
    if (words.length) {
      const r = statement.getBoundingClientRect();
      const sp = clamp((vh * .85 - r.top) / (r.height + vh * .35));
      const n = Math.round(sp * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }

    // horizontal process
    if (getComputedStyle(track).flexDirection === "row") {
      const r = process.getBoundingClientRect();
      const total = process.offsetHeight - vh;
      const pp = clamp(-r.top / Math.max(1, total));
      const maxX = track.scrollWidth - innerWidth;
      track.style.setProperty("--x", (-pp * Math.max(0, maxX)).toFixed(1));
      bar.style.setProperty("--pp", pp.toFixed(4));
      const active = Math.min(steps.length - 1, Math.floor(pp * steps.length));
      steps.forEach((s, i) => s.classList.toggle("is-on", i === active && pp > 0 && pp < 1.001));
    }

    // active nav link
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .4) current = i; });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === current));

    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const siblings = $$(".reveal", el.parentElement);
      el.style.transitionDelay = reduced ? "0s" : `${Math.min(siblings.indexOf(el), 5) * 0.08}s`;
      el.classList.add("in");
      setTimeout(() => (el.style.transitionDelay = ""), 1400);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      const start = el.hasAttribute("data-plain") ? end - 26 : 0;
      const t0 = performance.now();
      const dur = reduced ? 1 : 1800;
      const tick = (now) => {
        const k = clamp((now - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(start + (end - start) * eased);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- pointer effects (desktop) ---------- */
  if (finePointer && !reduced) {
    const glow = $(".cursor-glow");
    let gx = -999, gy = -999, cx = gx, cy = gy;
    addEventListener("pointermove", (e) => { gx = e.clientX; gy = e.clientY; if (cx < -900) { cx = gx; cy = gy; } }, { passive: true });
    (function loop() {
      cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();

    // magnetic buttons
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });

    // tilt cards
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", `${px * 7}deg`);
        el.style.setProperty("--rx", `${-py * 7}deg`);
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
    });
  }

  /* ---------- contact form ---------- */
  const form = $("#contact-form");
  const status = $(".form__status", form);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    let ok = true;
    const mark = (name, bad) => {
      const field = form.elements[name].closest(".field, .consent");
      field.classList.toggle("invalid", bad);
      if (bad) ok = false;
    };
    mark("name", !form.elements.name.value.trim());
    mark("email", !emailRe.test(form.elements.email.value.trim()));
    mark("message", form.elements.message.value.trim().length < 5);
    mark("consent", !form.elements.consent.checked);
    return ok;
  }
  ["name", "email", "message"].forEach((n) =>
    form.elements[n].addEventListener("input", () => {
      const f = form.elements[n].closest(".field");
      if (f.classList.contains("invalid")) validate();
    })
  );
  form.elements.consent.addEventListener("change", () => form.elements.consent.closest(".consent").classList.remove("invalid"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form__status";
    if (form.elements._gotcha.value) return; // bot
    if (!validate()) {
      status.textContent = t("f.check");
      status.classList.add("err");
      const first = $(".invalid input, .invalid textarea", form);
      if (first) first.focus();
      return;
    }
    const data = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      quantity: form.elements.quantity.value,
      services: $$('input[name="services"]:checked', form).map((i) => i.value).join(", "),
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
        form.classList.add("sent");
        form.reset();
      } catch (err) {
        status.innerHTML = `${t("f.fail")} <a href="mailto:${AAG_CONFIG.email}">${AAG_CONFIG.email}</a>`;
        status.classList.add("err");
      }
      return;
    }

    // Fallback: open a prefilled email
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
    form.classList.add("sent");
  });

  /* ---------- boot ---------- */
  applyLang(lang);
  requestAnimationFrame(() => document.body.classList.add("loaded"));
})();
