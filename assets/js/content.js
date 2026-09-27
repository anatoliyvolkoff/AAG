/* =========================================================
   Agro Alim Grup — editable content
   Loads content/content.json (edited via admin.html) and applies:
   banner media + texts, photo overrides for service / portfolio
   images, and contact details.
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AAG = window.AAG || (window.AAG = {});
  let content = null;

  const pick = (obj) => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[AAG.lang] || obj.en || "";
  };
  const esc = (u) => String(u || "").replace(/"/g, "&quot;");

  /* ---------- banner ---------- */
  const section = $(".banner");
  const frame = $(".banner__frame");
  const toggle = $(".banner__toggle");
  let video = null;

  function bindVideo(v) {
    video = v;
    if (!video) { frame && frame.parentElement.classList.add("banner--still"); return; }
    frame.parentElement.classList.remove("banner--still");
    video.muted = true;
    if (reduced) { video.removeAttribute("autoplay"); video.pause(); setPressed(true); }
    // play only while visible
    new IntersectionObserver(([e]) => {
      if (!video || toggle.getAttribute("aria-pressed") === "true") return;
      e.isIntersecting ? video.play().catch(() => {}) : video.pause();
    }, { threshold: 0.1 }).observe(frame);
  }
  function setPressed(paused) {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play video" : "Pause video");
  }
  if (toggle) {
    toggle.addEventListener("click", () => {
      if (!video) return;
      const paused = toggle.getAttribute("aria-pressed") === "true";
      if (paused) { video.play().catch(() => {}); setPressed(false); } else { video.pause(); setPressed(true); }
    });
  }

  function applyBanner(b) {
    if (!section) return;
    if (!b || b.enabled === false || !b.src) { section.hidden = true; return; }
    section.hidden = false;
    const media = $("[data-banner-media]", section);
    const link = $("[data-banner-link]", section);
    if (link) link.setAttribute("href", b.link || "portfolio.html");
    if (b.type === "video") {
      const sources = [
        b.srcWebm ? `<source src="${esc(b.srcWebm)}" type="video/webm">` : "",
        `<source src="${esc(b.src)}" type="${/\.webm$/i.test(b.src) ? "video/webm" : "video/mp4"}">`
      ].join("");
      const current = $("video", media);
      const same = current && current.dataset.src === b.src;
      if (!same) {
        media.innerHTML = `<video ${reduced ? "" : "autoplay"} muted loop playsinline preload="metadata" ${b.poster ? `poster="${esc(b.poster)}"` : ""} data-src="${esc(b.src)}">${sources}</video>`;
      }
      bindVideo($("video", media));
    } else {
      // gif or still image
      media.innerHTML = `<img src="${esc(b.src)}" alt="" decoding="async">`;
      bindVideo(null);
    }
    applyBannerText();
  }
  function applyBannerText() {
    if (!content || !content.banner || !section) return;
    $$("[data-banner]", section).forEach((el) => {
      const val = pick(content.banner[el.dataset.banner]);
      if (el.classList.contains("roll")) {
        el.textContent = val;
        const i = document.createElement("span"); i.className = "roll__i"; i.textContent = val;
        el.textContent = ""; el.appendChild(i);
      } else el.textContent = val;
    });
    const title = pick(content.banner.title);
    const media = $("[data-banner-media] img", section);
    if (media) media.alt = title;
  }

  /* ---------- photo overrides ---------- */
  function setPhoto(shot, src, alt) {
    if (!shot) return;
    if (!src) return; // keep the 3D render
    shot.dataset.photo = src;
    shot.innerHTML = "";
    const img = new Image();
    img.decoding = "async";
    img.alt = alt || "";
    img.src = src;
    img.onload = () => shot.classList.add("shot-ready");
    shot.appendChild(img);
    shot.classList.add("is-photo");
  }
  function applyPhotos(c) {
    const items = (AAG.t && AAG.t("items")) || [];
    const svc = c.services || {};
    Object.keys(svc).forEach((k) => {
      const shot = $(`.svc-block#${k} .shot`);
      setPhoto(shot, svc[k] && svc[k].image, AAG.t ? AAG.t(`svc.${k}.t`) : k);
    });
    (c.portfolio || []).forEach((p, i) => {
      if (!p || !p.image) return;
      const alt = items[i] ? items[i].t : "";
      $$(`[data-item="${i}"] .shot, .pf-grid .work[data-index="${i}"] .shot`).forEach((s) => setPhoto(s, p.image, alt));
    });
  }

  /* ---------- contact ---------- */
  function applyContact(ct) {
    if (!ct) return;
    const cfg = AAG.config || {};
    ["email", "phone", "address", "formEndpoint"].forEach((k) => { if (typeof ct[k] === "string") cfg[k] = ct[k]; });
    $$('[data-contact="email"]').forEach((el) => { el.textContent = cfg.email; el.href = "mailto:" + cfg.email; });
    $$('[data-contact="address"]').forEach((el) => { el.textContent = cfg.address; });
    $$('[data-contact="phone"]').forEach((el) => {
      el.hidden = !cfg.phone;
      if (cfg.phone) { el.textContent = cfg.phone; el.href = "tel:" + cfg.phone.replace(/[^\d+]/g, ""); }
    });
    $$('[data-contact-row="phone"]').forEach((el) => (el.hidden = !cfg.phone));
  }

  /* ---------- load ---------- */
  if (section) bindVideo($("video", section)); // default markup works without JSON
  fetch("content/content.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((c) => {
      content = c;
      AAG.content = c;
      applyContact(c.contact);
      applyBanner(c.banner);
      applyPhotos(c);
      window.dispatchEvent(new CustomEvent("aag:content", { detail: c }));
    })
    .catch(() => { /* keep built-in defaults */ });
  window.addEventListener("aag:lang", applyBannerText);
})();
