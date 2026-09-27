/* =========================================================
   Agro Alim Grup — content admin
   Edits content/content.json and uploads images/videos to
   assets/uploads/ through the GitHub Contents API.
   The access token stays in this browser only.
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const I18N = window.AAG_I18N || { en: {} };
  const CONTENT_PATH = "content/content.json";
  const MAX_MB = 50;
  const SVC = ["screen", "hot", "coat", "paint", "cliche", "pad"];

  /* ---------- state ---------- */
  let content = null;           // working copy
  let gh = null;                // { repo, token, branch }
  let dirty = false;
  let lang = "en";
  const pending = new Map();    // token -> { file, url }
  const PENDING = "pending:";

  /* ---------- UI helpers ---------- */
  const statusEl = $("#status");
  function setStatus(text, kind = "") {
    statusEl.textContent = text;
    statusEl.className = "adm-pill" + (kind ? " is-" + kind : "");
  }
  let toastT;
  function toast(html, ms = 5000) {
    const t = $("#toast");
    t.innerHTML = html;
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-on"), ms);
  }
  function markDirty() {
    dirty = true;
    setStatus("Unsaved changes", "dirty");
    $("#btn-publish").disabled = !gh;
  }
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // preview URL for a stored path
  function previewUrl(path) {
    if (!path) return "";
    if (path.startsWith(PENDING)) return pending.get(path)?.url || "";
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return path; // relative to the site root (admin.html lives there)
  }
  function rawUrl(path) {
    return gh ? `https://raw.githubusercontent.com/${gh.repo}/${encodeURIComponent(gh.branch)}/${path}` : "";
  }
  function imgWithFallback(path, alt = "") {
    const img = new Image();
    img.alt = alt;
    img.src = previewUrl(path);
    img.onerror = () => { const r = rawUrl(path); if (r && img.src !== r && !path.startsWith(PENDING)) img.src = r; };
    return img;
  }

  function stagedFile(file) {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`That file is ${(file.size / 1048576).toFixed(1)} MB. Please keep uploads under ${MAX_MB} MB, or host it elsewhere and paste the URL.`, 8000);
      return null;
    }
    if (file.size > 12 * 1024 * 1024) toast("Large file — it will work, but a compressed MP4 under 10 MB loads much faster for visitors.", 7000);
    const key = PENDING + Math.random().toString(36).slice(2);
    pending.set(key, { file, url: URL.createObjectURL(file) });
    return key;
  }
  function pickFile(accept) {
    return new Promise((res) => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = accept;
      inp.onchange = () => res(inp.files[0] || null);
      inp.click();
    });
  }

  /* ---------- rendering ---------- */
  function render() {
    renderBanner();
    renderHero();
    renderServices();
    renderProducts();
    renderContact();
  }

  // banner
  function renderBanner() {
    const b = content.banner;
    $("#b-enabled").checked = b.enabled !== false;
    $$('input[name="b-type"]').forEach((r) => (r.checked = r.value === (b.type || "video")));
    $("#b-link").value = b.link || "";
    $("#b-url").value = /^https?:/.test(b.src || "") ? b.src : "";
    const pv = $("#b-preview");
    pv.innerHTML = "";
    const src = previewUrl(b.src);
    if (!src) pv.textContent = "No media";
    else if (b.type === "video") {
      const v = document.createElement("video");
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      if (b.poster) v.poster = previewUrl(b.poster);
      v.src = src;
      v.onerror = () => { const r = rawUrl(b.src); if (r && !b.src.startsWith(PENDING) && v.src !== r) v.src = r; };
      pv.appendChild(v);
    } else pv.appendChild(imgWithFallback(b.src));
    $("#b-name").textContent = b.src ? (b.src.startsWith(PENDING) ? pending.get(b.src).file.name + " (not published yet)" : b.src) : "—";
    const accept = { video: "video/mp4,video/webm", gif: "image/gif", image: "image/jpeg,image/png,image/webp" }[b.type || "video"];
    $("#b-file").accept = accept;
    $("#b-hint").textContent = { video: "Drop an MP4 / WebM here or click to upload", gif: "Drop a GIF here or click to upload", image: "Drop a JPG / PNG / WebP here or click to upload" }[b.type || "video"];
    // poster
    $("#b-poster-wrap").hidden = b.type !== "video";
    const pt = $("#b-poster");
    const purl = previewUrl(b.poster);
    pt.style.backgroundImage = purl ? `url("${purl}")` : "";
    pt.classList.toggle("has-img", !!purl);
    pt.querySelector("span").textContent = purl ? "Replace poster" : "Upload poster";
    // texts
    $$("[data-bt]").forEach((el) => { el.value = (b[el.dataset.bt] || {})[lang] || ""; });
  }

  /* ---------- single image tile (services) ---------- */
  function tile({ label, path, onUpload }) {
    const wrap = document.createElement("div");
    wrap.className = "adm-tile";
    const box = document.createElement("div");
    box.className = "adm-tile__img";
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", `Replace photo for ${label}`);
    if (path) { box.appendChild(imgWithFallback(path, label)); if (path.startsWith(PENDING)) box.classList.add("is-pending"); }
    else box.textContent = "No photo";
    const open = async () => { const f = await pickFile("image/jpeg,image/png,image/webp"); if (f) onUpload(f); };
    box.addEventListener("click", open);
    box.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    enableDrop(box, (f) => /^image\//.test(f.type) && onUpload(f));
    const meta = document.createElement("div");
    meta.className = "adm-tile__meta";
    meta.innerHTML = `<b></b>`;
    meta.querySelector("b").textContent = label;
    wrap.append(box, meta);
    return wrap;
  }
  function renderServices() {
    const sg = $("#svc-grid"); sg.innerHTML = "";
    SVC.forEach((k) => {
      content.services[k] = content.services[k] || { image: "" };
      sg.appendChild(tile({
        label: I18N.en[`svc.${k}.t`] || k,
        path: content.services[k].image,
        onUpload: (f) => { const key = stagedFile(f); if (key) { content.services[k] = { image: key, credit: "", visual: false }; markDirty(); renderServices(); } }
      }));
    });
  }

  /* ---------- photo list editor (hero + products) ----------
     list: array of { src, credit, visual }  ·  onChange(): re-render */
  function photoList(list, { onChange, credits = true, label = "photo" }) {
    const box = document.createElement("div");
    box.className = "adm-photos";
    list.forEach((ph, i) => {
      const cell = document.createElement("div");
      cell.className = "adm-photo" + (ph.src.startsWith(PENDING) ? " is-pending" : "");
      const fig = document.createElement("div");
      fig.className = "adm-photo__img";
      fig.appendChild(imgWithFallback(ph.src, `${label} ${i + 1}`));
      if (ph.visual) { const b = document.createElement("span"); b.className = "adm-badge"; b.textContent = "Visualisation"; fig.appendChild(b); }
      const bar = document.createElement("div");
      bar.className = "adm-photo__bar";
      const mk = (txt, title, fn, dis) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.title = title; b.setAttribute("aria-label", `${title} (${label} ${i + 1})`); b.disabled = !!dis; b.addEventListener("click", fn); return b; };
      bar.append(
        mk("←", "Move left", () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; markDirty(); onChange(); }, i === 0),
        mk("→", "Move right", () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; markDirty(); onChange(); }, i === list.length - 1),
        mk("✕", "Remove", () => { list.splice(i, 1); markDirty(); onChange(); })
      );
      cell.append(fig, bar);
      if (credits) {
        const inp = document.createElement("input");
        inp.type = "text"; inp.className = "adm-photo__credit"; inp.placeholder = "Credit / licence (optional)";
        inp.value = ph.credit || "";
        inp.addEventListener("input", () => { ph.credit = inp.value; markDirty(); });
        cell.appendChild(inp);
      }
      box.appendChild(cell);
    });
    const add = document.createElement("button");
    add.type = "button"; add.className = "adm-photo adm-photo--add";
    add.innerHTML = "<span>+ Add photos</span><small>JPG · PNG · WebP · drop here</small>";
    const addFiles = (files) => {
      let n = 0;
      [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type)).forEach((f) => { const key = stagedFile(f); if (key) { list.push({ src: key, credit: "", visual: false }); n++; } });
      if (n) { markDirty(); onChange(); } else toast("Please choose JPG, PNG or WebP images.");
    };
    add.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/jpeg,image/png,image/webp"; inp.multiple = true;
      inp.onchange = () => addFiles(inp.files);
      inp.click();
    });
    add.addEventListener("dragover", (e) => { e.preventDefault(); add.classList.add("is-over"); });
    add.addEventListener("dragleave", () => add.classList.remove("is-over"));
    add.addEventListener("drop", (e) => { e.preventDefault(); add.classList.remove("is-over"); addFiles(e.dataTransfer.files); });
    box.appendChild(add);
    return box;
  }

  /* ---------- hero slideshow ---------- */
  function renderHero() {
    content.hero = content.hero || { images: [] };
    const objs = (content.hero.images || []).map((src) => ({ src }));
    const sync = () => { content.hero.images = objs.map((o) => o.src); renderHero(); };
    const host = $("#hero-list"); host.innerHTML = "";
    host.appendChild(photoList(objs, { onChange: sync, credits: false, label: "Hero photo" }));
  }

  /* ---------- products ---------- */
  const TECHS = ["screen", "hot", "coat", "paint", "pad", "cliche"];
  const PFIELDS = [["title", "Title", "input"], ["kind", "Subtitle (technique · detail)", "input"], ["text", "Description", "textarea"],
    ["specs.container", "Container", "input"], ["specs.finish", "Finish", "input"], ["specs.colours", "Colours", "input"]];
  const openCards = new Set([0]);
  const getP = (o, path) => path.split(".").reduce((a, k) => (a ? a[k] : undefined), o);
  const setP = (o, path, lng, v) => {
    const ks = path.split(".");
    let cur = o;
    ks.forEach((k, i) => { if (i === ks.length - 1) { cur[k] = cur[k] && typeof cur[k] === "object" ? cur[k] : {}; cur[k][lng] = v; } else { cur[k] = cur[k] || {}; cur = cur[k]; } });
  };
  function renderProducts() {
    const host = $("#pf-list"); host.innerHTML = "";
    content.portfolio.forEach((item, idx) => {
      item.photos = Array.isArray(item.photos) ? item.photos : [];
      const card = document.createElement("details");
      card.className = "adm-prod";
      card.open = openCards.has(idx);
      card.addEventListener("toggle", () => (card.open ? openCards.add(idx) : openCards.delete(idx)));
      const sum = document.createElement("summary");
      const thumb = item.photos[0] ? `<img src="${previewUrl(item.photos[0].src)}" alt="">` : "";
      sum.innerHTML = `<span class="adm-prod__thumb">${thumb}</span><span class="adm-prod__name"></span><span class="adm-prod__meta"></span>`;
      sum.querySelector(".adm-prod__name").textContent = `${String(idx + 1).padStart(2, "0")} · ${(item.title && (item.title.en || item.title[lang])) || "Untitled"}`;
      sum.querySelector(".adm-prod__meta").textContent = `${I18N.en[`svc.${item.tech}.t`] || item.tech || ""} · ${item.photos.length} photo${item.photos.length === 1 ? "" : "s"}`;
      card.appendChild(sum);

      const body = document.createElement("div");
      body.className = "adm-prod__body";
      // technique
      const tech = document.createElement("label");
      tech.className = "adm-field";
      tech.innerHTML = `<span>Technique (used for the portfolio filters)</span><select>${TECHS.map((k) => `<option value="${k}">${I18N.en[`svc.${k}.t`] || k}</option>`).join("")}</select>`;
      const sel = tech.querySelector("select");
      sel.value = item.tech || "screen";
      sel.addEventListener("change", () => { item.tech = sel.value; markDirty(); renderProducts(); });
      body.appendChild(tech);
      // texts in the current language
      const fields = document.createElement("div");
      fields.className = "adm-fields adm-fields--2";
      PFIELDS.forEach(([path, lab, kind]) => {
        const l = document.createElement("label");
        l.className = "adm-field" + (kind === "textarea" || path === "title" ? " adm-field--wide" : "");
        l.innerHTML = `<span>${lab} · ${lang.toUpperCase()}</span>`;
        const inp = document.createElement(kind);
        if (kind === "textarea") inp.rows = 3; else inp.type = "text";
        inp.value = (getP(item, path) || {})[lang] || "";
        inp.addEventListener("input", () => { setP(item, path, lang, inp.value); markDirty(); });
        l.appendChild(inp);
        fields.appendChild(l);
      });
      body.appendChild(fields);
      // photos
      const ph = document.createElement("div");
      ph.className = "adm-field__l";
      ph.textContent = "Photos — the first one is the cover. Use ← → to reorder.";
      body.append(ph, photoList(item.photos, { onChange: renderProducts, label: "Photo" }));
      // actions
      const acts = document.createElement("div");
      acts.className = "adm-row adm-prod__acts";
      const act = (txt, fn, dis) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn btn--line btn--sm"; b.textContent = txt; b.disabled = !!dis; b.addEventListener("click", fn); return b; };
      acts.append(
        act("Move up", () => { [content.portfolio[idx - 1], content.portfolio[idx]] = [content.portfolio[idx], content.portfolio[idx - 1]]; markDirty(); renderProducts(); }, idx === 0),
        act("Move down", () => { [content.portfolio[idx + 1], content.portfolio[idx]] = [content.portfolio[idx], content.portfolio[idx + 1]]; markDirty(); renderProducts(); }, idx === content.portfolio.length - 1),
        act("Delete product", () => {
          const name = (item.title && item.title.en) || "this product";
          if (!confirm(`Delete "${name}" from the portfolio?`)) return;
          content.portfolio.splice(idx, 1); openCards.clear(); markDirty(); renderProducts();
        })
      );
      body.appendChild(acts);
      card.appendChild(body);
      host.appendChild(card);
    });
  }
  $("#pf-add").addEventListener("click", () => {
    content.portfolio.push({ id: "project-" + Date.now().toString(36), tech: "screen", title: { en: "New project" }, kind: {}, text: {}, specs: {}, photos: [] });
    openCards.clear(); openCards.add(content.portfolio.length - 1);
    markDirty(); renderProducts();
    const last = $("#pf-list .adm-prod:last-child");
    if (last) last.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $$(".adm-langs--pf button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.l;
    $$(".adm-langs button").forEach((x) => x.classList.toggle("is-active", x.dataset.l === lang));
    renderBanner(); renderProducts();
  }));

  function renderContact() {
    $$("[data-ct]").forEach((el) => { el.value = content.contact[el.dataset.ct] || ""; });
  }

  /* ---------- banner events ---------- */
  $("#b-enabled").addEventListener("change", (e) => { content.banner.enabled = e.target.checked; markDirty(); });
  $$('input[name="b-type"]').forEach((r) => r.addEventListener("change", () => {
    const b = content.banner;
    if (b.type === r.value) return;
    b.type = r.value;
    // media from another type no longer fits
    b.src = ""; b.srcWebm = "";
    if (r.value !== "video") b.poster = "";
    markDirty(); renderBanner();
  }));
  function setBannerFile(f) {
    const b = content.banner;
    const type = b.type || "video";
    const ok = type === "video" ? /^video\/(mp4|webm)$/.test(f.type) : type === "gif" ? f.type === "image/gif" : /^image\/(jpeg|png|webp)$/.test(f.type);
    if (!ok) return toast(`That file doesn't match the selected type (${type}).`);
    const key = stagedFile(f);
    if (!key) return;
    b.src = key; b.srcWebm = "";
    markDirty(); renderBanner();
  }
  const drop = $("#b-drop");
  drop.addEventListener("click", () => $("#b-file").click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#b-file").click(); } });
  $("#b-file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) setBannerFile(f); e.target.value = ""; });
  enableDrop(drop, setBannerFile);
  $("#b-url").addEventListener("change", (e) => {
    const v = e.target.value.trim();
    if (!v) return;
    content.banner.src = v; content.banner.srcWebm = "";
    markDirty(); renderBanner();
  });
  const poster = $("#b-poster");
  const openPoster = () => $("#b-poster-file").click();
  poster.addEventListener("click", openPoster);
  poster.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPoster(); } });
  $("#b-poster-file").addEventListener("change", (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const key = stagedFile(f);
    if (key) { content.banner.poster = key; markDirty(); renderBanner(); }
  });
  $("#b-link").addEventListener("input", (e) => { content.banner.link = e.target.value.trim(); markDirty(); });
  $$(".adm-langs--banner button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.l;
    $$(".adm-langs button").forEach((x) => x.classList.toggle("is-active", x.dataset.l === lang));
    renderBanner(); renderProducts();
  }));
  $$("[data-bt]").forEach((el) => el.addEventListener("input", () => {
    const k = el.dataset.bt;
    content.banner[k] = content.banner[k] || {};
    content.banner[k][lang] = el.value;
    markDirty();
  }));
  $$("[data-ct]").forEach((el) => el.addEventListener("input", () => { content.contact[el.dataset.ct] = el.value.trim(); markDirty(); }));

  function enableDrop(el, onFile) {
    el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("is-over"); });
    el.addEventListener("dragleave", () => el.classList.remove("is-over"));
    el.addEventListener("drop", (e) => {
      e.preventDefault(); el.classList.remove("is-over");
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    });
  }

  /* ---------- nav highlight ---------- */
  const navLinks = $$(".adm-nav a");
  addEventListener("scroll", () => {
    let cur = 0;
    navLinks.forEach((a, i) => { const s = $(a.hash); if (s && s.getBoundingClientRect().top < 160) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === cur));
  }, { passive: true });

  /* ---------- GitHub API ---------- */
  async function api(path, opts = {}) {
    const url = path.startsWith("https://") ? path : `https://api.github.com/repos/${gh.repo}/${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${gh.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {})
      }
    });
    if (!res.ok) {
      let msg = res.status + "";
      try { msg = (await res.json()).message || msg; } catch (e) {}
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const b64encodeText = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64decodeText = (b64) => decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
  const fileToB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  async function getSha(path) {
    try { return (await api(`contents/${path}?ref=${encodeURIComponent(gh.branch)}`)).sha; }
    catch (e) { if (e.status === 404) return null; throw e; }
  }

  async function connect() {
    const repo = $("#repo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
    const token = $("#token").value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return toast("Repository should look like owner/name.");
    if (!token) return toast("Paste an access token first.");
    gh = { repo, token, branch: "" };
    setStatus("Connecting…");
    try {
      const info = await api("https://api.github.com/repos/" + repo);
      if (info.permissions && !info.permissions.push) throw Object.assign(new Error("This token can read but not write to the repository."), { status: 403 });
      const branches = await api("branches?per_page=100");
      const sel = $("#branch");
      sel.innerHTML = "";
      branches.map((b) => b.name).sort((a, b) => (a === info.default_branch ? -1 : b === info.default_branch ? 1 : a.localeCompare(b)))
        .forEach((n) => { const o = document.createElement("option"); o.value = o.textContent = n + (n === info.default_branch ? " (default)" : ""); o.value = n; sel.appendChild(o); });
      const saved = loadSaved();
      sel.value = saved && saved.repo === repo && saved.branch && branches.some((b) => b.name === saved.branch) ? saved.branch : info.default_branch;
      sel.disabled = false;
      gh.branch = sel.value;
      $("#btn-connect").hidden = true;
      $("#btn-disconnect").hidden = false;
      persist();
      $("#toast").classList.remove("is-on");
      await loadFromGitHub();
    } catch (e) {
      gh = null;
      setStatus("Connection failed", "err");
      toast(e.status === 401 ? "The token was rejected. Check that it's copied fully and not expired." :
            e.status === 404 ? "Repository not found, or the token has no access to it." : "GitHub: " + e.message, 8000);
    }
  }
  async function loadFromGitHub() {
    if (dirty && !confirm("Loading from GitHub will discard your unsaved changes. Continue?")) return;
    setStatus("Loading…");
    try {
      const f = await api(`contents/${CONTENT_PATH}?ref=${encodeURIComponent(gh.branch)}`);
      content = normalize(JSON.parse(b64decodeText(f.content)));
      pending.clear();
      dirty = false;
      render();
      setStatus(`Connected · ${gh.branch}`, "ok");
      $("#btn-publish").disabled = true;
    } catch (e) {
      if (e.status === 404) {
        setStatus(`Connected · ${gh.branch}`, "ok");
        toast(`This branch has no ${CONTENT_PATH} yet. Publishing will create it.`, 7000);
      } else { setStatus("Load failed", "err"); toast("GitHub: " + e.message, 8000); }
    }
  }
  $("#branch").addEventListener("change", (e) => {
    gh.branch = e.target.value;
    persist();
    loadFromGitHub();
  });
  $("#btn-connect").addEventListener("click", connect);
  $("#token").addEventListener("keydown", (e) => { if (e.key === "Enter") connect(); });
  $("#btn-disconnect").addEventListener("click", () => {
    gh = null;
    try { localStorage.removeItem("aag-admin"); sessionStorage.removeItem("aag-admin"); } catch (e) {}
    $("#token").value = "";
    $("#branch").innerHTML = "<option>Connect first</option>"; $("#branch").disabled = true;
    $("#btn-connect").hidden = false; $("#btn-disconnect").hidden = true;
    $("#btn-publish").disabled = true;
    setStatus("Not connected");
  });

  function persist() {
    const data = JSON.stringify({ repo: gh.repo, token: gh.token, branch: gh.branch });
    try {
      if ($("#remember").checked) { localStorage.setItem("aag-admin", data); sessionStorage.removeItem("aag-admin"); }
      else { sessionStorage.setItem("aag-admin", data); localStorage.removeItem("aag-admin"); }
    } catch (e) {}
  }
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem("aag-admin") || sessionStorage.getItem("aag-admin") || "null"); } catch (e) { return null; }
  }

  /* ---------- publish ---------- */
  function slug(s) { return String(s).toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file"; }
  function stamp() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

  async function publish() {
    if (!gh) return toast("Connect to GitHub first — or use Download JSON.");
    if (/^release\//.test(gh.branch) && !confirm(`"${gh.branch}" is a frozen release snapshot. Publish to it anyway?`)) return;
    const btn = $("#btn-publish");
    btn.disabled = true;
    try {
      // 1. upload staged files that are still referenced
      const out = JSON.parse(JSON.stringify(content));
      const refs = [];
      const walk = (obj) => { for (const k in obj) { const v = obj[k]; if (typeof v === "string" && v.startsWith(PENDING)) refs.push([obj, k, v]); else if (v && typeof v === "object") walk(v); } };
      walk(out);
      const uploaded = new Map();
      let n = 0;
      for (const [obj, k, key] of refs) {
        if (!uploaded.has(key)) {
          const { file } = pending.get(key);
          n++;
          setStatus(`Uploading ${n}/${new Set(refs.map((r) => r[2])).size}…`);
          const ext = (file.name.split(".").pop() || "bin").toLowerCase();
          const path = `assets/uploads/${slug(file.name.replace(/\.[^.]+$/, ""))}-${stamp()}.${ext}`;
          await api(`contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `Admin: upload ${file.name}`, content: await fileToB64(file), branch: gh.branch }) });
          uploaded.set(key, path);
        }
        obj[k] = uploaded.get(key);
      }
      // 2. write content.json
      setStatus("Saving content…");
      const sha = await getSha(CONTENT_PATH);
      const res = await api(`contents/${CONTENT_PATH}`, {
        method: "PUT",
        body: JSON.stringify({ message: "Admin: update site content", content: b64encodeText(JSON.stringify(out, null, 2) + "\n"), branch: gh.branch, ...(sha ? { sha } : {}) })
      });
      content = out;
      pending.forEach((p) => URL.revokeObjectURL(p.url));
      pending.clear();
      dirty = false;
      render();
      setStatus(`Published · ${gh.branch}`, "ok");
      toast(`Published. The live site updates after your host redeploys (usually about a minute). <a href="${res.commit.html_url}" target="_blank" rel="noopener">View commit</a>`, 9000);
    } catch (e) {
      setStatus("Publish failed", "err");
      toast(e.status === 409 ? "Someone else changed the content meanwhile. Reload from GitHub and try again." : "GitHub: " + e.message, 9000);
      btn.disabled = false;
    }
  }
  $("#btn-publish").addEventListener("click", publish);

  /* ---------- download ---------- */
  $("#btn-download").addEventListener("click", () => {
    if (pending.size) toast("Note: files you uploaded here aren't inside the JSON — publish via GitHub to include them.", 7000);
    const clean = JSON.parse(JSON.stringify(content), (k, v) => (typeof v === "string" && v.startsWith(PENDING) ? "" : v));
    const blob = new Blob([JSON.stringify(clean, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "content.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- boot ---------- */
  function normalize(c) {
    c = c || {};
    c.version = c.version || 1;
    c.contact = Object.assign({ email: "", phone: "", address: "", formEndpoint: "" }, c.contact);
    c.banner = Object.assign({ enabled: true, type: "video", src: "", srcWebm: "", poster: "", link: "portfolio.html", label: {}, title: {}, text: {}, cta: {} }, c.banner);
    c.services = c.services || {};
    c.hero = c.hero && Array.isArray(c.hero.images) ? c.hero : { images: [] };
    c.portfolio = (Array.isArray(c.portfolio) ? c.portfolio : []).filter((p) => p && typeof p === "object" && !("image" in p && !p.photos));
    return c;
  }
  (async () => {
    try {
      const r = await fetch(CONTENT_PATH, { cache: "no-store" });
      content = normalize(r.ok ? await r.json() : {});
    } catch (e) { content = normalize({}); }
    render();
    const saved = loadSaved();
    if (saved) {
      $("#repo").value = saved.repo || $("#repo").value;
      $("#token").value = saved.token || "";
      $("#remember").checked = !!localStorage.getItem("aag-admin");
      if (saved.token) connect();
    }
  })();
})();
