/* =========================================================
   Agro Alim Grup — photo galleries
   · hero photo crossfade (home)
   · featured work cards (home)
   · product showcase (portfolio): per-product photo carousel,
     zoom on hover, fullscreen lightbox, info panel, filters
   Everything is rendered from content/content.json (see content.js).
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const AAG = window.AAG || (window.AAG = {});
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const t = (k) => (AAG.t ? AAG.t(k) : k);
  const pick = (o) => (o && typeof o === "object" ? o[AAG.lang] || o.en || "" : o || "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ICON = {
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  let content = AAG.content || null;

  /* =========================================================
     HERO — gentle crossfade between photos
     ========================================================= */
  const heroBox = $("[data-hero-slides]");
  let heroTimer = null, heroIndex = 0;
  function renderHero() {
    if (!heroBox || !content || !content.hero || !Array.isArray(content.hero.images) || !content.hero.images.length) return;
    const imgs = content.hero.images;
    const current = $$("img", heroBox).map((i) => i.getAttribute("src"));
    if (current.join("|") !== imgs.join("|")) {
      heroBox.innerHTML = imgs.map((src, i) => `<img src="${esc(src)}" alt="" class="${i === 0 ? "is-active" : ""}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async">`).join("");
      heroIndex = 0;
    }
    startHero();
  }
  function showHero(i) {
    const imgs = $$("img", heroBox);
    if (!imgs.length) return;
    heroIndex = (i + imgs.length) % imgs.length;
    imgs.forEach((img, k) => img.classList.toggle("is-active", k === heroIndex));
    const c = $("[data-hero-count]");
    if (c) c.textContent = `${pad(heroIndex + 1)} / ${pad(imgs.length)}`;
    const bar = $(".hero__bar span");
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
  }
  function startHero() {
    clearInterval(heroTimer);
    if (!heroBox || reduced || $$("img", heroBox).length < 2) return;
    heroTimer = setInterval(() => { if (!document.hidden) showHero(heroIndex + 1); }, 4800);
  }
  if (heroBox) { showHero(0); startHero(); }

  /* =========================================================
     FEATURED CARDS (home)
     ========================================================= */
  function renderFeatured() {
    if (!content) return;
    $$("[data-item]").forEach((card) => {
      const item = content.portfolio[+card.dataset.item];
      if (!item) { card.hidden = true; return; }
      $$("[data-p]", card).forEach((el) => { el.textContent = pick(item[el.dataset.p]); });
      const img = $("img", card);
      const src = item.photos && item.photos[0] && item.photos[0].src;
      if (img && src && img.getAttribute("src") !== src) img.src = src;
      if (img) img.alt = pick(item.title);
    });
  }

  /* =========================================================
     PRODUCTS (portfolio)
     ========================================================= */
  const list = $("[data-products]");
  const SERVICE_KEYS = ["screen", "hot", "coat", "paint", "cliche", "pad"];

  function productHTML(item, idx, total) {
    const tech = SERVICE_KEYS.includes(item.tech) ? item.tech : "screen";
    const photos = (item.photos || []).filter((p) => p && p.src);
    const title = pick(item.title);
    const slides = photos.map((p, i) => `<figure class="gallery__slide${i === 0 ? " is-active" : ""}" data-i="${i}" aria-hidden="${i === 0 ? "false" : "true"}"><div class="zoom"><img src="${esc(p.src)}" alt="${esc(title)} — ${i + 1}" loading="${idx === 0 && i === 0 ? "eager" : "lazy"}" decoding="async" width="1200" height="1500"></div></figure>`).join("");
    const thumbs = photos.map((p, i) => `<button class="gallery__thumb${i === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${i === 0}" aria-label="${esc(t("ui.photo"))} ${i + 1}"><img src="${esc(p.src)}" alt="" loading="lazy" decoding="async"></button>`).join("");
    const specs = item.specs || {};
    return `<article class="product reveal" id="p${idx + 1}" data-index="${idx}" data-tech="${tech}">
      <div class="wrap grid product__grid">
      <div class="gallery" data-gallery aria-roledescription="carousel" aria-label="${esc(title)}">
        <div class="gallery__stage" tabindex="0">
          <div class="gallery__slides">${slides || `<div class="gallery__empty">${esc(t("pf.nophoto"))}</div>`}</div>
          <button class="gallery__btn gallery__btn--prev" type="button" data-i18n-aria="ui.prev" aria-label="Previous photo">${ICON.left}</button>
          <button class="gallery__btn gallery__btn--next" type="button" data-i18n-aria="ui.next" aria-label="Next photo">${ICON.right}</button>
          <button class="gallery__expand" type="button" data-i18n-aria="ui.expand" aria-label="Open full screen">${ICON.expand}</button>
          <span class="gallery__count" aria-live="polite"><b>01</b> / ${pad(photos.length || 0)}</span>
        </div>
        <div class="gallery__thumbs" role="tablist" aria-label="Photos">${thumbs}</div>
      </div>
      <div class="product__info">
        <span class="label product__n">${pad(idx + 1)} / ${pad(total)} · <span data-i18n="svc.${tech}.t"></span></span>
        <h2 class="h2 product__title" data-p="title">${esc(title)}</h2>
        <p class="product__kind" data-p="kind">${esc(pick(item.kind))}</p>
        <p class="product__text" data-p="text">${esc(pick(item.text))}</p>
        <dl class="specs product__specs">
          <div><dt data-i18n="spec.technique"></dt><dd data-i18n="svc.${tech}.t"></dd></div>
          <div><dt data-i18n="spec.container"></dt><dd data-p="specs.container">${esc(pick(specs.container))}</dd></div>
          <div><dt data-i18n="spec.finish"></dt><dd data-p="specs.finish">${esc(pick(specs.finish))}</dd></div>
          <div><dt data-i18n="spec.colours"></dt><dd data-p="specs.colours">${esc(pick(specs.colours))}</dd></div>
        </dl>
        <a class="btn btn--dark" href="index.html#contact" data-service="${tech}"><span data-i18n="pf.request"></span>${ICON.arrow}</a>
        <p class="product__note" data-note></p>
      </div>
      </div>
    </article>`;
  }

  const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

  function renderProducts({ rebuild } = {}) {
    if (!list || !content || !Array.isArray(content.portfolio)) return;
    const items = content.portfolio;
    if (rebuild) {
      list.innerHTML = items.map((it, i) => productHTML(it, i, items.length)).join("\n");
      if (AAG.translate) AAG.translate(list);
      $$(".product", list).forEach((p) => p.classList.add("in")); // already on screen: no re-reveal flash
      initGalleries();
      applyFilter(currentFilter);
    } else {
      // language change: update texts in place, keep carousel positions
      $$(".product", list).forEach((el) => {
        const item = items[+el.dataset.index];
        if (!item) return;
        $$("[data-p]", el).forEach((n) => { n.textContent = pick(get(item, n.dataset.p)); });
        const g = $("[data-gallery]", el);
        if (g) g.setAttribute("aria-label", pick(item.title));
        updateNote(el);
      });
    }
  }
  // photo credit / visualisation note for the active photo
  function updateNote(product) {
    const note = $("[data-note]", product);
    if (!note || !content) return;
    const item = content.portfolio[+product.dataset.index];
    const g = $("[data-gallery]", product);
    const i = g && g._index ? g._index : 0;
    const photo = item && item.photos ? item.photos.filter((p) => p && p.src)[i] : null;
    note.textContent = photo ? (photo.credit ? `${t("ui.photo")}: ${photo.credit}` : photo.visual ? t("pf.visual") : "") : "";
  }

  /* ---------- carousel ---------- */
  function initGalleries() {
    $$("[data-gallery]").forEach((g) => {
      if (g._ready) return;
      g._ready = true;
      g._index = 0;
      const slides = $$(".gallery__slide", g);
      const thumbs = $$(".gallery__thumb", g);
      const stage = $(".gallery__stage", g);
      const count = $(".gallery__count b", g);
      const product = g.closest(".product");
      const single = slides.length < 2;
      g.classList.toggle("is-single", single);

      const go = (i) => {
        if (!slides.length) return;
        const n = (i + slides.length) % slides.length;
        g._index = n;
        slides.forEach((s, k) => {
          s.classList.toggle("is-active", k === n);
          s.setAttribute("aria-hidden", String(k !== n));
          $(".zoom", s).classList.remove("is-zoomed");
        });
        thumbs.forEach((b, k) => { b.classList.toggle("is-active", k === n); b.setAttribute("aria-selected", String(k === n)); });
        if (count) count.textContent = pad(n + 1);
        if (product) updateNote(product);
      };
      g._go = go;
      $(".gallery__btn--prev", g).addEventListener("click", () => go(g._index - 1));
      $(".gallery__btn--next", g).addEventListener("click", () => go(g._index + 1));
      thumbs.forEach((b, k) => b.addEventListener("click", () => go(k)));
      stage.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); go(g._index - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(g._index + 1); }
        if (e.key === "Enter") { e.preventDefault(); openLightbox(g); }
      });

      // zoom on hover (desktop): image magnifies and follows the pointer
      if (fine) {
        stage.addEventListener("pointermove", (e) => {
          if (e.target.closest("button")) return zoomOff();
          const z = $(".gallery__slide.is-active .zoom", g);
          if (!z) return;
          const r = z.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          const img = $("img", z);
          img.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
          z.classList.add("is-zoomed");
        });
        const zoomOff = () => $$(".zoom", g).forEach((z) => z.classList.remove("is-zoomed"));
        stage.addEventListener("pointerleave", zoomOff);
      }

      // swipe (touch)
      let sx = null, sy = 0;
      stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { sx = e.clientX; sy = e.clientY; } });
      stage.addEventListener("pointerup", (e) => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { g._swiped = true; go(g._index + (dx < 0 ? 1 : -1)); }
      });

      // open fullscreen
      stage.addEventListener("click", (e) => {
        if (e.target.closest(".gallery__btn")) return;
        if (g._swiped) { g._swiped = false; return; }
        openLightbox(g);
      });
      if (product) updateNote(product);
    });
  }

  /* ---------- lightbox ---------- */
  const lb = $(".lightbox");
  let lbGallery = null, lbIndex = 0, lbReturn = null;
  function lbShow(i) {
    const slides = $$(".gallery__slide img", lbGallery);
    if (!slides.length) return;
    lbIndex = (i + slides.length) % slides.length;
    const img = $(".lightbox__fig img", lb);
    img.classList.remove("is-in");
    img.src = slides[lbIndex].currentSrc || slides[lbIndex].src;
    img.alt = slides[lbIndex].alt;
    $(".lightbox__cap", lb).textContent = `${slides[lbIndex].alt.split(" — ")[0]} · ${pad(lbIndex + 1)} / ${pad(slides.length)}`;
    requestAnimationFrame(() => img.classList.add("is-in"));
    lb.classList.toggle("is-single", slides.length < 2);
  }
  function openLightbox(g) {
    if (!lb || !$$(".gallery__slide", g).length) return;
    lbGallery = g;
    lbReturn = document.activeElement;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add("is-open"));
    lbShow(g._index || 0);
    document.body.classList.add("lb-open");
    if (AAG.lenis) AAG.lenis.stop();
    $(".lightbox__close", lb).focus();
  }
  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove("is-open");
    document.body.classList.remove("lb-open");
    if (AAG.lenis) AAG.lenis.start();
    if (lbGallery && lbGallery._go) lbGallery._go(lbIndex); // keep the carousel in sync
    setTimeout(() => { lb.hidden = true; }, reduced ? 0 : 450);
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  if (lb) {
    $(".lightbox__close", lb).addEventListener("click", closeLightbox);
    $(".lightbox__btn--prev", lb).addEventListener("click", () => lbShow(lbIndex - 1));
    $(".lightbox__btn--next", lb).addEventListener("click", () => lbShow(lbIndex + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lightbox__fig")) closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
      if (e.key === "ArrowRight") lbShow(lbIndex + 1);
      if (e.key === "Tab") { // keep focus inside the dialog
        const f = $$("button", lb).filter((b) => b.offsetParent !== null);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    let lx = null;
    lb.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") lx = e.clientX; });
    lb.addEventListener("pointerup", (e) => {
      if (lx === null) return;
      const dx = e.clientX - lx; lx = null;
      if (Math.abs(dx) > 40) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- filters ---------- */
  let currentFilter = "all";
  function applyFilter(f) {
    currentFilter = f;
    let visible = 0;
    $$(".product", list || document).forEach((p) => {
      const show = f === "all" || p.dataset.tech === f;
      p.hidden = !show;
      if (show) visible++;
    });
    const empty = $("[data-empty]");
    if (empty) empty.hidden = visible > 0;
    $$("[data-filter]").forEach((b) => {
      const on = b.dataset.filter === f;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    applyFilter(b.dataset.filter);
    if (list && AAG.scrollTo) {
      const top = list.getBoundingClientRect().top;
      if (top < 0) AAG.scrollTo(list, { offset: -160 });
    }
  }));

  /* ---------- deep link: portfolio.html#p3 ---------- */
  function scrollToHash() {
    const m = location.hash.match(/^#p(\d+)$/);
    if (!m) return;
    const el = document.getElementById(`p${m[1]}`);
    if (!el) return;
    applyFilter("all");
    const bar = $(".pf-filters");
    const offset = -((bar ? bar.getBoundingClientRect().height : 0) + (innerWidth <= 720 ? 96 : 112));
    if (AAG.scrollTo) AAG.scrollTo(el, { immediate: true, offset });
    else el.scrollIntoView();
  }

  /* ---------- boot ---------- */
  initGalleries();
  if (list) $$(".product", list).forEach(updateNote);
  window.addEventListener("aag:content", (e) => {
    content = e.detail;
    renderHero();
    renderFeatured();
    renderProducts({ rebuild: true });
    if (document.body.classList.contains("loaded")) scrollToHash();
  });
  window.addEventListener("aag:lang", () => {
    renderFeatured();
    renderProducts();
  });
  window.addEventListener("aag:ready", scrollToHash);
  if (content) { renderHero(); renderFeatured(); renderProducts({ rebuild: true }); }
})();
