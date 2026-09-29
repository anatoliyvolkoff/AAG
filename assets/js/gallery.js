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
     HOME — full portfolio grid + partners
     ========================================================= */
  const grid = $("[data-portfolio-grid]");
  function renderGrid() {
    if (!grid || !content || !Array.isArray(content.portfolio)) return;
    const items = content.portfolio;
    const same = $$(".work", grid).length === items.length &&
      items.every((it, i) => { const img = $(`.work[data-item="${i}"] img`, grid); return img && img.getAttribute("src") === ((it.photos || [])[0] || {}).src; });
    if (!same) {
      grid.innerHTML = items.map((it, i) => {
        const tech = it.tech || "screen";
        const src = ((it.photos || [])[0] || {}).src || "";
        return `<a class="work reveal in" href="portfolio.html#p${i + 1}" data-item="${i}">
            <div class="shot">${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : ""}</div>
            <div class="work__meta"><span class="work__t" data-p="title"></span><span class="work__k" data-i18n="svc.${esc(tech)}.t"></span></div>
          </a>`;
      }).join("");
      if (AAG.translate) AAG.translate(grid);
    }
    $$(".work", grid).forEach((card) => {
      const it = items[+card.dataset.item];
      if (!it) return;
      $("[data-p=title]", card).textContent = pick(it.title);
      const img = $("img", card);
      if (img) img.alt = pick(it.title);
    });
  }

  const partnersBox = $("[data-partners]");
  function renderPartners() {
    if (!partnersBox || !content || !Array.isArray(content.partners)) return;
    const cta = $(".partner--cta", partnersBox);
    $$(".partner:not(.partner--cta)", partnersBox).forEach((n) => n.remove());
    content.partners.forEach((pt) => {
      const el = document.createElement(pt.url ? "a" : "div");
      el.className = "partner reveal in";
      if (pt.url) { el.href = pt.url; el.target = "_blank"; el.rel = "noopener"; }
      el.title = pt.name || "";
      el.innerHTML = `<span class="partner__logo">${pt.logo ? `<img src="${esc(pt.logo)}" alt="${esc(pt.name)}" loading="lazy">` : `<span class="partner__word">${esc(pt.name)}</span>`}</span><span class="partner__note">${esc(pick(pt.note))}</span>`;
      partnersBox.insertBefore(el, cta);
    });
  }

  /* =========================================================
     HOME — close-up collection
     An endless, gently drifting row of transparent bottles.
     · drift slows to a stop while the pointer is over the row
     · drag / throw with inertia (mouse, pen, touch), wheel, arrows, keys
     · the row leans a little with its speed
     · rest to zoom: hovering primes a bottle (it lifts, the others dim)
       and the cursor turns into a ring that fills while the pointer rests;
       when it closes the bottle glides to 3× around the cursor. Skimming
       across the row never zooms; a click zooms at once. The origin eases
       after the pointer, so moving over a zoomed bottle pans the label.
     · a cursor bubble says "Drag" between bottles.
       Touch: tap to zoom (with a tiny haptic tick), tap again to release.
     ========================================================= */
  const sc = $("[data-showcase]");
  const scTrack = sc && $(".showcase__track", sc);
  const scSection = sc && sc.closest("section");
  const scBar = scSection && $("[data-sc-bar]", scSection);
  const scCursor = sc && $(".sc-cursor", sc);
  const S = { items: [], copies: 0, setW: 0, step: 1, x: 0, target: 0, v: 0, drift: 1, over: false, drag: null, visible: false, raf: 0, lastT: 0, idleAt: 0 };
  const DRIFT = 0.42;          // px per frame at 60fps
  const DWELL = 1100;          // ms of resting on a bottle before it zooms
  const DWELL_WARM = 420;      // …shorter right after another bottle was zoomed
  const mod = (n, m) => ((n % m) + m) % m;

  function bottleHTML(it, i, clone) {
    const tech = SERVICE_KEYS.includes(it.tech) ? it.tech : "screen";
    return `<figure class="bottle" data-i="${i}" style="--k:${i}"${clone ? ' aria-hidden="true"' : ""}><div class="bottle__stage"><img src="${esc(it.src)}" alt="${clone ? "" : esc(it.name)}" loading="eager" decoding="async" draggable="false"></div><figcaption class="bottle__cap"><span class="bottle__n">${esc(it.name)}</span><span class="bottle__k" data-i18n="svc.${tech}.t"></span></figcaption></figure>`;
  }
  function scCopies() {
    const n = S.items.length || 1;
    const cell = (scTrack.firstElementChild && scTrack.firstElementChild.offsetWidth) || 248;
    const setW = n * (cell + 16);
    return Math.max(2, Math.ceil((sc.clientWidth * 2) / setW) + 1);
  }
  function renderShowcase(force) {
    if (!scTrack) return;
    const items = (content && Array.isArray(content.showcase) ? content.showcase : S.dom || []).filter((it) => it && it.src);
    const sig = JSON.stringify(items);
    scSection.hidden = !items.length;
    if (!items.length) { scTrack.innerHTML = ""; S.items = []; return; }
    const copies = scCopies();
    if (!force && scTrack.dataset.sig === sig && S.copies === copies) return scMeasure();
    setPrime(null);
    S.items = items; S.copies = copies;
    let html = "";
    for (let c = 0; c < copies; c++) html += items.map((it, i) => bottleHTML(it, i, c > 0)).join("");
    scTrack.innerHTML = html;
    scTrack.dataset.sig = sig;
    if (AAG.translate) AAG.translate(scTrack);
    $$("img", scTrack).forEach((img) => img.complete || img.addEventListener("load", scMeasure, { once: true }));
    scMeasure();
  }
  function scMeasure() {
    const all = $$(".bottle", scTrack);
    const n = S.items.length;
    if (!n || all.length < n * 2) return;
    S.step = all[1] ? all[1].offsetLeft - all[0].offsetLeft : 248;
    S.setW = all[n].offsetLeft - all[0].offsetLeft;
    if (scCopies() > S.copies) renderShowcase(true);
  }
  const snap = (v) => Math.round(v / S.step) * S.step;
  function nudge(dir) {
    setPrime(null);
    S.target = snap(S.target) - dir * S.step;
    S.idleAt = performance.now();
    wake();
  }

  function frame(t) {
    S.raf = 0;
    const dt = Math.min(3, (t - (S.lastT || t)) / 16.67 || 1);
    S.lastT = t;
    // drift eases out while the row is hovered, dragged, zoomed, or just touched
    const idle = !S.over && !S.drag && !zoomed && t - S.idleAt > 2400 && !reduced;
    S.drift += ((idle ? 1 : 0) - S.drift) * 0.04 * dt;
    if (S.drift > 0.001) S.target -= DRIFT * S.drift * dt;
    const k = S.drag ? 0.35 : 0.075;
    const prev = S.x;
    S.x += (S.target - S.x) * Math.min(1, k * dt);
    if (Math.abs(S.target - S.x) < 0.05) S.x = S.target;
    S.v += ((S.x - prev) / dt - S.v) * 0.2;
    if (S.setW) {
      const shown = mod(S.x, S.setW) - S.setW;
      scTrack.style.transform = `translate3d(${shown.toFixed(2)}px,0,0)`;
      const lean = reduced ? 0 : Math.max(-5, Math.min(5, -S.v * 0.22));
      scTrack.style.setProperty("--lean", `${lean.toFixed(2)}deg`);
      if (scBar) {
        const n = S.items.length;
        scBar.style.setProperty("--w", `${100 / n}%`);
        scBar.style.setProperty("--p", `${(mod(-S.x, S.setW) / S.setW) * n * 100}%`);
      }
    }
    const focusing = tickFocus(dt);
    moveCursor();
    const moving = focusing || S.drift > 0.001 || Math.abs(S.target - S.x) > 0.05 || Math.abs(S.v) > 0.01 || cur.show !== cur.s;
    if (S.visible && moving) S.raf = requestAnimationFrame(frame);
    else S.lastT = 0;
  }
  function wake() { if (!S.raf && S.visible) S.raf = requestAnimationFrame(frame); }

  // cursor bubble
  const cur = { x: 0, y: 0, tx: 0, ty: 0, s: 0, show: 0 };
  function moveCursor() {
    if (!scCursor) return;
    cur.x += (cur.tx - cur.x) * 0.22;
    cur.y += (cur.ty - cur.y) * 0.22;
    cur.s += (cur.show - cur.s) * 0.2;
    if (Math.abs(cur.show - cur.s) < 0.01) cur.s = cur.show;
    scCursor.style.transform = `translate3d(${cur.x.toFixed(1)}px,${cur.y.toFixed(1)}px,0)`;
    scCursor.style.opacity = cur.s.toFixed(3);
    scCursor.style.setProperty("--ring", zoomed ? 1 : Math.max(0, F.dwell).toFixed(3));
  }
  function cursorState() {
    if (!scCursor) return;
    scCursor.classList.toggle("is-prime", !!primed && !zoomed && !S.drag);
    scCursor.classList.toggle("is-zoom", !!zoomed && !S.drag);
    scCursor.classList.toggle("is-drag", !!S.drag);
  }

  // focus — prime on hover, zoom after resting; the origin eases after the pointer
  let primed = null, zoomed = null, zTarget = [50, 50], zNow = [50, 50];
  const F = { dwell: 0, speed: 0, px: 0, py: 0, pt: 0, warmUntil: 0, lock: null };
  function originFrom(bottle, e) {
    const stage = $(".bottle__stage", bottle), img = $("img", bottle);
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left - img.offsetLeft) / (img.offsetWidth || 1);
    const y = (e.clientY - r.top - img.offsetTop) / (img.offsetHeight || 1);
    return [Math.max(0, Math.min(1, x)) * 100, Math.max(0, Math.min(1, y)) * 100];
  }
  function setOrigin(img, o) { img.style.setProperty("--ox", `${o[0].toFixed(2)}%`); img.style.setProperty("--oy", `${o[1].toFixed(2)}%`); }
  function setPrime(b, e) {
    if (primed === b) return;
    if (zoomed && zoomed !== b) unzoom();
    if (primed) primed.classList.remove("is-primed");
    primed = b;
    F.dwell = 0;
    F.lock = null;
    if (b) {
      if (e) { zTarget = originFrom(b, e); zNow = zTarget.slice(); setOrigin($("img", b), zNow); }
      b.classList.add("is-primed");
    }
    if (scTrack) scTrack.classList.toggle("has-prime", !!b);
    cursorState();
    wake();
  }
  function zoomIn(bottle, e) {
    if (primed !== bottle) setPrime(bottle, e);
    if (e) zTarget = originFrom(bottle, e);
    if (zoomed === bottle) return;
    zoomed = bottle;
    F.dwell = 1;
    bottle.classList.add("is-zoomed");
    scTrack.classList.add("has-zoom");
    cursorState();
    wake();
  }
  function unzoom(cooldown) {
    if (!zoomed) return;
    zoomed.classList.remove("is-zoomed");
    zoomed = null;
    F.warmUntil = cooldown ? 0 : performance.now() + 900;
    F.dwell = 0;
    F.lock = cooldown ? [F.px, F.py] : null;   // after a click-out, zoom again only once the pointer moves on
    if (scTrack) scTrack.classList.remove("has-zoom");
    cursorState();
    wake();
  }
  function tickFocus(dt) {
    if (!primed) return false;
    const ms = dt * 16.67;
    F.speed *= Math.pow(0.7, dt);           // no events = the pointer is resting
    if (!zoomed && !S.drag && !F.lock) {
      const dur = performance.now() < F.warmUntil ? DWELL_WARM : DWELL;
      F.dwell = F.speed < 0.35 ? F.dwell + ms / dur : Math.max(0, F.dwell - ms / 500);
      if (F.dwell >= 1) zoomIn(primed);
    }
    zNow[0] += (zTarget[0] - zNow[0]) * Math.min(1, 0.12 * dt);
    zNow[1] += (zTarget[1] - zNow[1]) * Math.min(1, 0.12 * dt);
    setOrigin($("img", primed), zNow);
    return !zoomed || Math.abs(zTarget[0] - zNow[0]) + Math.abs(zTarget[1] - zNow[1]) > 0.05;
  }

  function initShowcase() {
    if (!sc || !scTrack) return;
    S.dom = $$(".bottle", scTrack).map((f) => ({ src: $("img", f).getAttribute("src"), name: $(".bottle__n", f).textContent, tech: ($(".bottle__k", f).dataset.i18n || "").split(".")[1] }));
    const hint = scSection && $("[data-sc-hint]", scSection);
    if (hint && !fine) { hint.setAttribute("data-i18n", "sc.hintTouch"); if (AAG.translate) AAG.translate(hint.parentNode); }
    const bottleAt = (e) => { const st = e.target.closest && e.target.closest(".bottle__stage"); return st && st.parentElement; };

    // visibility drives the loop; the first reveal plays the staggered entrance
    sc.classList.add("sc-armed");
    new IntersectionObserver((ents) => ents.forEach((en) => {
      S.visible = en.isIntersecting;
      if (S.visible) {
        if (!sc.classList.contains("sc-in")) { sc.classList.add("sc-in"); setTimeout(() => sc.classList.add("sc-live"), 1800); }
        wake();
      }
    }), { threshold: 0.15 }).observe(sc);

    const local = (e) => { const r = sc.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    sc.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      S.over = true;
      [cur.tx, cur.ty] = local(e); cur.x = cur.tx; cur.y = cur.ty; cur.show = 1;
      wake();
    });
    sc.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      S.over = false; cur.show = 0; S.idleAt = performance.now() - 1600;
      if (!S.drag) setPrime(null);
      wake();
    });
    sc.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") { [cur.tx, cur.ty] = local(e); wake(); }
      if (S.drag) {
        const dx = e.clientX - S.drag.x0;
        if (!S.drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - S.drag.y0)) {
          S.drag.moved = true; setPrime(null); sc.classList.add("is-dragging"); cursorState();
          try { sc.setPointerCapture(e.pointerId); } catch (err) {}
        }
        if (S.drag.moved) {
          const now = performance.now();
          const v = Math.max(-48, Math.min(48, (e.clientX - S.drag.lx) / Math.max(8, now - S.drag.lt) * 16.67));
          S.drag.vel += (v - S.drag.vel) * 0.5;
          S.drag.lx = e.clientX; S.drag.lt = now;
          S.target = S.drag.t0 + dx;
          wake();
          return;
        }
      }
      if (fine && e.pointerType === "mouse" && !(S.drag && S.drag.moved)) {
        const b = bottleAt(e);
        const now = performance.now();
        if (F.pt) {
          const sp = Math.hypot(e.clientX - F.px, e.clientY - F.py) / Math.max(4, now - F.pt);
          F.speed += (sp - F.speed) * 0.5;
        }
        F.px = e.clientX; F.py = e.clientY; F.pt = now;
        if (F.lock && Math.hypot(F.px - F.lock[0], F.py - F.lock[1]) > 24) F.lock = null;
        setPrime(b || null, e);
        if (b) zTarget = originFrom(b, e);
      }
    });
    sc.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      S.drag = { x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), t0: S.target, vel: 0, moved: false, type: e.pointerType };
      S.target = S.x; S.drag.t0 = S.x;     // catch the row where it is
      wake();
    });
    const release = (e) => {
      if (!S.drag) return;
      const d = S.drag;
      S.drag = null;
      sc.classList.remove("is-dragging");
      if (d.moved) {
        S.swipedAt = Date.now();
        const fresh = performance.now() - d.lt < 90;  // a pause before letting go = no throw
        S.target = snap(S.target + (fresh ? d.vel * 12 : 0));   // throw, then settle on a bottle
        S.idleAt = performance.now();
      }
      cursorState();
      if (e && fine && e.pointerType === "mouse" && e.type === "pointerup" && !d.moved) {
        const b = bottleAt(e);
        if (b && b === zoomed) unzoom(true); else if (b) zoomIn(b, e);   // click = no waiting
      }
      wake();
    };
    sc.addEventListener("pointerup", release);
    sc.addEventListener("pointercancel", release);
    sc.addEventListener("lostpointercapture", () => S.drag && S.drag.moved && release());

    sc.addEventListener("click", (e) => {
      if (fine || Date.now() - (S.swipedAt || 0) < 350) return;
      const b = bottleAt(e);
      S.idleAt = performance.now();
      if (!b || b === zoomed) { setPrime(null); return; }
      zoomIn(b, e);
      if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) {}
    });
    sc.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      setPrime(null);
      S.target -= e.deltaX;
      S.idleAt = performance.now();
      clearTimeout(S.wheelT);
      S.wheelT = setTimeout(() => { S.target = snap(S.target); wake(); }, 160);
      wake();
    }, { passive: false });
    sc.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
      else if (e.key === "Escape") setPrime(null);
    });
    const prev = scSection && $("[data-sc-prev]", scSection), next = scSection && $("[data-sc-next]", scSection);
    if (prev) prev.addEventListener("click", () => nudge(-1));
    if (next) next.addEventListener("click", () => nudge(1));
    let rz = 0;
    window.addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { renderShowcase(); scMeasure(); wake(); }); });
    renderShowcase(true);
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
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { g._swipedAt = Date.now(); go(g._index + (dx < 0 ? 1 : -1)); }
      });

      // open fullscreen
      stage.addEventListener("click", (e) => {
        if (e.target.closest(".gallery__btn")) return;
        if (Date.now() - (g._swipedAt || 0) < 350) return; // the click synthesised by the swipe itself
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
  // show only technique chips that have at least one project
  function syncChips() {
    const techs = new Set($$(".product", list || document).map((p) => p.dataset.tech));
    $$("[data-filter]").forEach((b) => { if (b.dataset.filter !== "all") b.hidden = !techs.has(b.dataset.filter); });
  }
  function applyFilter(f) {
    syncChips();
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
  initShowcase();
  if (list) syncChips();
  if (list) $$(".product", list).forEach(updateNote);
  window.addEventListener("aag:content", (e) => {
    content = e.detail;
    renderGrid(); renderPartners(); renderShowcase();
    renderProducts({ rebuild: true });
    if (document.body.classList.contains("loaded")) scrollToHash();
  });
  window.addEventListener("aag:lang", () => {
    renderGrid(); renderPartners();
    renderProducts();
  });
  window.addEventListener("aag:ready", scrollToHash);
  if (content) { renderGrid(); renderPartners(); renderShowcase(); renderProducts({ rebuild: true }); }
})();
