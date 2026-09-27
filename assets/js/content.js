/* =========================================================
   Agro Alim Grup — editable content
   Loads content/content.json (edited via admin.html) and applies
   banner media + texts, service photos and contact details.
   Portfolio / hero / featured photos are rendered by gallery.js
   from the same data ("aag:content" event).
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
      el.textContent = val;
    });
    const title = pick(content.banner.title);
    const media = $("[data-banner-media] img", section);
    if (media) media.alt = title;
  }

  /* ---------- service photos ---------- */
  function applyPhotos(c) {
    const svc = c.services || {};
    Object.keys(svc).forEach((k) => {
      const src = svc[k] && svc[k].image;
      $$(`[data-svc-img="${k}"]`).forEach((img) => { if (src && img.getAttribute("src") !== src) img.src = src; });
    });
  }

  /* ---------- photo credits (footer) ---------- */
  function applyCredits(c) {
    const box = $("[data-credits]");
    if (!box) return;
    const seen = new Map();
    const add = (p) => { if (p && p.src && p.credit && !seen.has(p.src)) seen.set(p.src, p.credit); };
    (c.portfolio || []).forEach((it) => (it.photos || []).forEach(add));
    Object.values(c.services || {}).forEach((s) => add(s && { src: s.image, credit: s.credit }));
    const ul = $("ul", box);
    ul.innerHTML = "";
    [...new Set(seen.values())].forEach((txt) => {
      const li = document.createElement("li");
      const m = txt.match(/https?:\/\/\S+$/);
      if (m) {
        li.append(document.createTextNode(txt.slice(0, m.index)));
        const a = document.createElement("a");
        a.href = m[0]; a.target = "_blank"; a.rel = "noopener"; a.textContent = "source";
        li.appendChild(a);
      } else li.textContent = txt;
      ul.appendChild(li);
    });
    box.hidden = !ul.children.length;
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
      applyCredits(c);
      window.dispatchEvent(new CustomEvent("aag:content", { detail: c }));
    })
    .catch(() => { /* keep built-in defaults */ });
  window.addEventListener("aag:lang", applyBannerText);
})();
