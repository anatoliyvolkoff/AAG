#!/usr/bin/env python3
"""Generates index.html, services.html and portfolio.html.

Shared header, footer and navigation live here so the three pages never drift
apart. Product galleries, service images and hero photos are rendered from
content/content.json (the same file the admin panel edits); the browser
re-renders them from that file at runtime, so this build only provides the
initial HTML (fast first paint, works without JavaScript, indexable).

Usage:  python3 tools/build.py
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = json.load(open(os.path.join(ROOT, "content", "content.json"), encoding="utf-8"))
I18N_EN = {  # English defaults for server-rendered labels (runtime text comes from assets/js/i18n.js)
    "svc.screen.t": "Screen printing", "svc.hot.t": "Hot stamping", "svc.coat.t": "Coating",
    "svc.paint.t": "Bottle painting", "svc.cliche.t": "Cliché making", "svc.pad.t": "Pad printing & decals",
}

ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
EXPAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>'
LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#111"/>'
        '<path d="M14 7h4v5c0 1.5 3 3 3 7v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 11 25v-6c0-4 3-5.5 3-7z" '
        'fill="none" stroke="#fff" stroke-width="1.4"/></svg>')
NAV = [("services.html", "nav.services", "services", "Services"),
       ("portfolio.html", "nav.portfolio", "portfolio", "Portfolio"),
       ("index.html#about", "nav.about", "about", "About"),
       ("index.html#contact", "nav.contact", "contact", "Contact")]
SVC = [("screen", "01"), ("hot", "02"), ("coat", "03"), ("paint", "04"), ("cliche", "05"), ("pad", "06")]
TECHS = ["screen", "hot", "coat", "paint", "pad", "cliche"]


def e(s):
    return html.escape(str(s or ""), quote=True)


def en(obj):
    if isinstance(obj, dict):
        return obj.get("en", "")
    return obj or ""


def sec_en(word, n):
    return (f'<div class="sec-en" aria-hidden="true"><span class="sec-en__n">({n})</span>'
            f'<span class="sec-en__w" data-split-chars>{word}</span></div>')


def head(title, desc):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#f4f4f4">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="assets/media/banner-poster.jpg">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='10' fill='%23111'/%3E%3Cpath d='M14 7h4v5c0 1.5 3 3 3 7v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 11 25v-6c0-4 3-5.5 3-7z' fill='none' stroke='%23fff' stroke-width='1.4'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/motion.css">
  <script>try{{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){{if(sessionStorage.getItem("aag-pt"))document.documentElement.classList.add("pt-arrive");else if(!sessionStorage.getItem("aag-visited"))document.documentElement.classList.add("is-first")}}}}catch(e){{}}</script>
</head>'''


def header(page):
    active = ' class="is-active"'
    links = "\n        ".join(
        f'<a href="{h}"{active if page == p else ""} data-i18n="{k}">{t}</a>' for h, k, p, t in NAV)
    menu = "\n        ".join(
        f'<a href="{h}"><span class="menu__n">0{i + 1}</span><span class="menu__t" data-i18n="{k}">{t}</span>{ARROW}</a>'
        for i, (h, k, p, t) in enumerate(NAV))
    return f'''<body data-page="{page}" id="top">
  <a class="skip" href="#main" data-i18n="ui.skip">Skip to content</a>
  <div class="progress" aria-hidden="true"><span></span></div>
  <div class="grid-overlay" aria-hidden="true"><div class="wrap grid">{"<span></span>" * 8}</div></div>

  <header class="nav">
    <div class="wrap nav__bar">
      <a class="nav__logo" href="index.html" aria-label="Agro Alim Grup — home">{LOGO}<span>AGRO ALIM GRUP</span></a>
      <nav class="nav__links" aria-label="Main">
        {links}
      </nav>
      <div class="nav__right">
        <div class="lang" role="group" aria-label="Language">
          <button type="button" data-lang="en">EN</button><button type="button" data-lang="ro">RO</button><button type="button" data-lang="ru">RU</button>
        </div>
        <a href="index.html#contact" class="btn btn--dark btn--sm" data-i18n="nav.cta">Request a quote</a>
        <button class="nav__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" id="menu" aria-hidden="true">
    <div class="wrap grid menu__grid">
      <nav class="menu__links" aria-label="Menu">
        {menu}
      </nav>
      <div class="menu__side">
        <span class="label">Agroalimgrup S.R.L.</span>
        <p class="muted" data-i18n="ft.about">Glass decoration factory in Chișinău, Moldova. Since 2000.</p>
        <a data-contact="email" href="mailto:{e(CONTENT["contact"]["email"])}">{e(CONTENT["contact"]["email"])}</a>
        <a href="https://aag.md" target="_blank" rel="noopener">aag.md</a>
      </div>
    </div>
  </div>

  <div class="loader" aria-hidden="true">
    <div class="loader__mark">{LOGO}<span>AGRO ALIM GRUP</span></div>
    <div class="loader__bottom"><span class="loader__tag">Glass decoration · Chișinău · 2000</span><span class="loader__count">000</span></div>
    <div class="loader__bar"><span></span></div>
  </div>
  <div class="curtain" aria-hidden="true"><div class="curtain__mark">{LOGO}</div></div>
'''


def footer(extra_scripts=""):
    svc_links = "".join(f'<a href="services.html#{k}" data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</a>' for k, _ in SVC)
    email = e(CONTENT["contact"]["email"])
    return f'''
  <footer class="footer">
    <div class="wrap">
      <div class="grid footer__top">
        <div class="footer__brand">
          <a class="nav__logo" href="index.html">{LOGO}<span>AGRO ALIM GRUP</span></a>
          <p data-i18n="ft.about">Glass decoration factory in Chișinău, Moldova. Since 2000.</p>
        </div>
        <div class="footer__col">
          <span class="label" data-i18n="ft.nav">Company</span>
          {"".join(f'<a href="{h}" data-i18n="{k}">{t}</a>' for h, k, p, t in NAV)}
        </div>
        <div class="footer__col">
          <span class="label" data-i18n="ft.svc">Services</span>
          {svc_links}
        </div>
        <div class="footer__col">
          <span class="label" data-i18n="ft.contact">Contact</span>
          <a data-contact="email" href="mailto:{email}">{email}</a>
          <a data-contact="phone" href="#" hidden>—</a>
          <a href="https://aag.md" target="_blank" rel="noopener">aag.md</a>
          <span class="muted" data-contact="address">{e(CONTENT["contact"]["address"])}</span>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© <span data-year>2026</span> Agroalimgrup S.R.L. <span data-i18n="ft.rights">All rights reserved.</span></span>
        <details class="credits" data-credits hidden><summary data-i18n="ft.credits">Photo credits</summary><ul></ul></details>
        <a href="#top" class="to-top"><span data-i18n="ft.top">Back to top</span><span class="to-top__c"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></span></a>
      </div>
    </div>
  </footer>

  <script src="assets/vendor/lenis/lenis.min.js"></script>
  <script src="assets/js/i18n.js"></script>
  <script src="assets/js/main.js"></script>
  <script src="assets/js/content.js"></script>{extra_scripts}
  <script src="assets/js/motion.js"></script>
</body>
</html>
'''


CTA = f'''
    <section class="cta-big">
      <a class="cta-big__link" href="index.html#contact">
        <span class="wrap grid cta-big__inner">
          <span class="label cta-big__label" data-i18n="cta.title">Have a bottle in mind?</span>
          <span class="cta-big__word" data-split-chars>Contact</span>
          <span class="cta-big__circle">{ARROW}</span>
        </span>
      </a>
    </section>
'''


# ---------------------------------------------------------------- products
def gallery(item, idx):
    photos = item.get("photos") or []
    title = e(en(item.get("title")))
    slides = "".join(
        f'<figure class="gallery__slide{" is-active" if i == 0 else ""}" data-i="{i}" aria-hidden="{"false" if i == 0 else "true"}">'
        f'<div class="zoom"><img src="{e(p["src"])}" alt="{title} — {i + 1}" loading="{"eager" if (idx == 0 and i == 0) else "lazy"}" decoding="async" width="1200" height="1500"></div></figure>'
        for i, p in enumerate(photos))
    thumbs = "".join(
        f'<button class="gallery__thumb{" is-active" if i == 0 else ""}" type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" aria-label="Photo {i + 1}"><img src="{e(p["src"])}" alt="" loading="lazy" decoding="async"></button>'
        for i, p in enumerate(photos))
    n = len(photos)
    return f'''<div class="gallery" data-gallery aria-roledescription="carousel" aria-label="{title}">
        <div class="gallery__stage" tabindex="0">
          <div class="gallery__slides">{slides}</div>
          <button class="gallery__btn gallery__btn--prev" type="button" data-i18n-aria="ui.prev" aria-label="Previous photo">{CHEV_L}</button>
          <button class="gallery__btn gallery__btn--next" type="button" data-i18n-aria="ui.next" aria-label="Next photo">{CHEV_R}</button>
          <button class="gallery__expand" type="button" data-i18n-aria="ui.expand" aria-label="Open full screen">{EXPAND}</button>
          <span class="gallery__count" aria-live="polite"><b>01</b> / {n:02d}</span>
        </div>
        <div class="gallery__thumbs" role="tablist" aria-label="Photos">{thumbs}</div>
      </div>'''


def product(item, idx, total):
    tech = item.get("tech", "screen")
    specs = item.get("specs", {})
    visual = any(p.get("visual") for p in item.get("photos", []))
    credit = next((p.get("credit") for p in item.get("photos", []) if p.get("credit")), "")
    note = e(credit) if credit else ("Concept visualisation" if visual else "")
    return f'''    <article class="product reveal" id="p{idx + 1}" data-index="{idx}" data-tech="{e(tech)}">
      <div class="wrap grid product__grid">
      {gallery(item, idx)}
      <div class="product__info">
        <span class="label product__n">{idx + 1:02d} / {total:02d} · <span data-i18n="svc.{e(tech)}.t">{I18N_EN.get("svc." + tech + ".t", tech)}</span></span>
        <h2 class="h2 product__title" data-p="title">{e(en(item.get("title")))}</h2>
        <p class="product__kind" data-p="kind">{e(en(item.get("kind")))}</p>
        <p class="product__text" data-p="text">{e(en(item.get("text")))}</p>
        <dl class="specs product__specs">
          <div><dt data-i18n="spec.technique">Technique</dt><dd data-i18n="svc.{e(tech)}.t">{I18N_EN.get("svc." + tech + ".t", tech)}</dd></div>
          <div><dt data-i18n="spec.container">Container</dt><dd data-p="specs.container">{e(en(specs.get("container")))}</dd></div>
          <div><dt data-i18n="spec.finish">Finish</dt><dd data-p="specs.finish">{e(en(specs.get("finish")))}</dd></div>
          <div><dt data-i18n="spec.colours">Colours</dt><dd data-p="specs.colours">{e(en(specs.get("colours")))}</dd></div>
        </dl>
        <a class="btn btn--dark" href="index.html#contact" data-service="{e(tech)}"><span data-i18n="pf.request">Request a similar project</span>{ARROW}</a>
        <p class="product__note" data-note>{note}</p>
      </div>
      </div>
    </article>'''


def work_card(item, idx):
    photo = (item.get("photos") or [{}])[0].get("src", "")
    tech = item.get("tech", "screen")
    return f'''<a class="work reveal" href="portfolio.html#p{idx + 1}" data-item="{idx}">
            <div class="shot"><img src="{e(photo)}" alt="{e(en(item.get("title")))}" loading="lazy" decoding="async"></div>
            <div class="work__meta"><span class="work__t" data-p="title">{e(en(item.get("title")))}</span><span class="work__k" data-i18n="svc.{e(tech)}.t">{I18N_EN.get("svc." + tech + ".t", tech)}</span></div>
          </a>'''


def partner_card(p):
    name = e(p.get("name"))
    logo = f'<img src="{e(p["logo"])}" alt="{name}" loading="lazy">' if p.get("logo") else f'<span class="partner__word">{name}</span>'
    tag, href = ("a", f' href="{e(p["url"])}" target="_blank" rel="noopener"') if p.get("url") else ("div", "")
    return f'''<{tag} class="partner reveal"{href} title="{name}"><span class="partner__logo">{logo}</span><span class="partner__note" data-pn>{e(en(p.get("note")))}</span></{tag}>'''


PARTNER_CTA = f'''<a class="partner partner--cta reveal" href="#contact"><span class="partner__plus" aria-hidden="true">+</span><span class="partner__note" data-i18n="pt.cta">Become a partner</span></a>'''


def bottle(it, i):
    tech = it.get("tech") or "screen"
    name = e(it.get("name"))
    return f'''<figure class="bottle" data-i="{i}" style="--k:{i}"><div class="bottle__stage"><img src="{e(it.get("src"))}" alt="{name}" loading="eager" decoding="async" draggable="false"></div><figcaption class="bottle__cap"><span class="bottle__n">{name}</span><span class="bottle__k" data-i18n="svc.{e(tech)}.t">{I18N_EN.get("svc." + tech + ".t", tech)}</span></figcaption></figure>'''


# ---------------------------------------------------------------- pages
def build_index():
    items = CONTENT["portfolio"]
    svc_rows = "\n".join(f'''          <a class="svc-row reveal" href="services.html#{k}">
            <span class="svc-row__n">{n}</span>
            <span class="svc-row__t" data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</span>
            <span class="svc-row__d" data-i18n="svc.{k}.d"></span>
            <span class="svc-row__a">{ARROW}</span>
          </a>''' for k, n in SVC)
    cards = "\n          ".join(work_card(it, i) for i, it in enumerate(items))
    partners = "\n          ".join(partner_card(p) for p in CONTENT.get("partners", [])) + "\n          " + PARTNER_CTA
    showcase = CONTENT.get("showcase", [])
    bottles = "\n          ".join(bottle(it, i) for i, it in enumerate(showcase))
    b = CONTENT["banner"]
    return head("Agro Alim Grup — Glass decoration, Chișinău",
                "Agro Alim Grup (AAG) — glass decoration factory in Chișinău, Moldova since 2000. Screen printing, hot stamping, coating, bottle painting and cliché making.") + header("home") + f'''
  <main id="main">
    <section class="hero hero--wide" id="hero">
      <div class="wrap grid hero__head">
        <span class="label hero__label" data-i18n="hero.label">Glass decoration · Chișinău · Since 2000</span>
        <h1 class="display hero__title">
          <span class="split-line"><span data-i18n="hero.l1">Glass decoration</span></span>
          <span class="split-line"><span data-i18n="hero.l2">for brands</span></span>
          <span class="split-line"><span data-i18n="hero.l3">that last.</span></span>
        </h1>
        <div class="hero__side">
          <p class="lead" data-i18n="hero.lead"></p>
          <div class="hero__cta">
            <a href="portfolio.html" class="btn btn--dark"><span data-i18n="pf.open">Open portfolio</span>{ARROW}</a>
            <a href="#contact" class="btn btn--line" data-i18n="hero.cta2">Request a quote</a>
          </div>
        </div>
      </div>
    </section>

    <section class="banner banner--hero" id="reel" aria-label="Showreel">
      <div class="banner__frame">
        <a class="banner__link" href="{e(b.get("link") or "portfolio.html")}" data-banner-link>
          <div class="banner__media" data-banner-media>
            <video autoplay muted loop playsinline preload="metadata" poster="{e(b.get("poster"))}" data-src="{e(b.get("src"))}">
              {f'<source src="{e(b.get("srcWebm"))}" type="video/webm">' if b.get("srcWebm") else ""}
              <source src="{e(b.get("src"))}" type="video/mp4">
            </video>
          </div>
          <div class="banner__shade" aria-hidden="true"></div>
          <div class="wrap grid banner__overlay">
            <span class="label banner__label" data-banner="label">{e(en(b.get("label")))}</span>
            <h2 class="h2 banner__title" data-banner="title">{e(en(b.get("title")))}</h2>
            <p class="banner__text" data-banner="text">{e(en(b.get("text")))}</p>
            <span class="banner__cta"><span data-banner="cta">{e(en(b.get("cta")))}</span><span class="banner__circle">{ARROW}</span></span>
          </div>
        </a>
        <button class="banner__toggle" type="button" aria-label="Pause video" aria-pressed="false">
          <svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>
          <svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
        </button>
      </div>
    </section>

    <section class="section" id="intro">
      <div class="wrap">
        <div class="grid"><p class="statement" data-split></p></div>
        <div class="grid stats">
          <div class="stat reveal"><span class="stat__num" data-count="2000" data-from="1974">2000</span><span class="stat__label" data-i18n="stats.founded"></span></div>
          <div class="stat reveal"><span class="stat__num"><span data-count="25">25</span>+</span><span class="stat__label" data-i18n="stats.years"></span></div>
          <div class="stat reveal"><span class="stat__num" data-count="6">6</span><span class="stat__label" data-i18n="stats.tech"></span></div>
          <div class="stat reveal"><span class="stat__num">No. 1</span><span class="stat__label" data-i18n="stats.first"></span></div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee__track" data-marquee>
      {"".join(f'<span data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</span><i></i>' for k, _ in SVC) * 2}
    </div></div>

    <section class="section section--tight" id="services">
      <div class="wrap">
        {sec_en("Service", "01")}
        <div class="grid sec-head">
          <span class="label reveal" data-i18n="svc.label">Services</span>
          <h2 class="h2 reveal" data-i18n-html="svc.title"></h2>
          <p class="lead reveal" data-i18n="svc.lead"></p>
        </div>
        <div class="svc-index">
{svc_rows}
        </div>
        <div class="grid sec-foot"><a class="link-arrow sec-link reveal" href="services.html"><span data-i18n="svc.all">All services</span>{ARROW}</a></div>
      </div>
    </section>

    <section class="panel section" id="work">
      <div class="wrap">
        {sec_en("Works", "02")}
        <div class="grid sec-head">
          <span class="label reveal" data-i18n="pf.label">Portfolio</span>
          <h2 class="h2 reveal" data-i18n="pf.fullTitle">The full portfolio</h2>
          <p class="lead reveal" data-i18n="pf.fullLead"></p>
        </div>
        <div class="grid work-grid work-grid--all" data-portfolio-grid>
          {cards}
        </div>
        <div class="grid cta-row reveal">
          <a class="btn btn--light" href="portfolio.html"><span data-i18n="pf.openFull">Open full portfolio</span>{ARROW}</a>
          <a class="btn btn--ghost-light" href="#contact" data-i18n="hero.cta2">Request a quote</a>
        </div>
      </div>
    </section>

    <section class="section showcase" id="closeup">
      <div class="wrap">
        {sec_en("Close-up", "03")}
        <div class="grid sec-head">
          <span class="label reveal" data-i18n="sc.label">Collection</span>
          <h2 class="h2 reveal" data-i18n="sc.title">Look closer.</h2>
          <p class="lead reveal" data-i18n="sc.lead"></p>
        </div>
      </div>
      <div class="showcase__viewport" data-showcase tabindex="0" role="region" aria-roledescription="carousel" data-i18n-aria="sc.label" aria-label="Collection">
        <div class="showcase__track">
          {bottles}
        </div>
        <span class="sc-cursor" aria-hidden="true"><span data-i18n="sc.drag">Drag</span></span>
      </div>
      <div class="wrap">
        <div class="grid showcase__bar reveal">
          <span class="showcase__progress" aria-hidden="true"><i data-sc-bar></i></span>
          <span class="showcase__hint" data-sc-hint data-i18n="sc.hint">Hover a bottle to zoom 3×</span>
          <div class="showcase__nav">
            <button class="sc-btn" type="button" data-sc-prev data-i18n-aria="ui.prev" aria-label="Previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
            <button class="sc-btn" type="button" data-sc-next data-i18n-aria="ui.next" aria-label="Next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="about">
      <div class="wrap">
        {sec_en("About", "04")}
        <div class="grid sec-head">
          <span class="label reveal" data-i18n="ab.label">About</span>
          <h2 class="h2 reveal" data-i18n="ab.title">A quarter-century on glass.</h2>
        </div>
        <div class="grid">
          <div class="about-text lead reveal">
            <p data-i18n="ab.p1"></p>
            <p data-i18n="ab.p2"></p>
          </div>
        </div>
        <div class="heritage">
          <div class="grid heritage__row reveal"><span class="heritage__k" data-i18n="ab.k1"></span><span class="heritage__t">EXCLUSIV</span><p class="heritage__d" data-i18n="ab.h1"></p></div>
          <div class="grid heritage__row reveal"><span class="heritage__k" data-i18n="ab.k2"></span><span class="heritage__t">HUNTER</span><p class="heritage__d" data-i18n="ab.h2"></p></div>
          <div class="grid heritage__row reveal"><span class="heritage__k" data-i18n="ab.k3"></span><span class="heritage__t">ICE</span><p class="heritage__d" data-i18n="ab.h3"></p></div>
          <div class="grid heritage__row heritage__row--last reveal">
            <span class="heritage__k" data-i18n="ab.ind">Industries</span>
            <ul class="industries">
              <li data-i18n="ind.wine"></li><li data-i18n="ind.spirits"></li><li data-i18n="ind.bev"></li><li data-i18n="ind.cos"></li><li data-i18n="ind.gift"></li>
            </ul>
          </div>
        </div>

        <div class="company" id="company">
          {sec_en("Company", "05")}
          <div class="grid sec-head">
            <span class="label reveal" data-i18n="co.label">Company</span>
            <h2 class="h2 reveal" data-i18n="co.title">Company profile</h2>
          </div>
          <dl class="co-table">
            <div class="grid co-row reveal"><dt data-i18n="co.name">Company name</dt><dd>Agroalimgrup S.R.L. (AAG)</dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.founded">Founded</dt><dd data-i18n="co.foundedV">11 October 2000</dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.director">Founder &amp; Director</dt><dd data-i18n="co.directorV">Serghei Drăguțanu</dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.loc">Location</dt><dd data-i18n="co.locV">Chișinău, Republic of Moldova</dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.biz">Business</dt><dd data-i18n="co.bizV"></dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.staff">Team</dt><dd data-i18n="co.staffV">10–49 employees</dd></div>
            <div class="grid co-row reveal"><dt>IDNO</dt><dd>1004600008087</dd></div>
            <div class="grid co-row reveal"><dt data-i18n="co.web">Website</dt><dd><a href="https://aag.md" target="_blank" rel="noopener">aag.md</a></dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section class="section" id="partners">
      <div class="wrap">
        {sec_en("Partners", "06")}
        <div class="grid sec-head">
          <span class="label reveal" data-i18n="pt.label">Our partners</span>
          <h2 class="h2 reveal" data-i18n="pt.title">Clients who trust our glass.</h2>
          <p class="lead reveal" data-i18n="pt.lead"></p>
        </div>
        <div class="grid partners logo-wall" data-partners>
          {partners}
        </div>
        <div class="grid cta-row reveal">
          <a class="btn btn--dark" href="#contact"><span data-i18n="pt.cta">Become a partner</span>{ARROW}</a>
          <a class="btn btn--line" href="services.html" data-i18n="svc.all">All services</a>
        </div>
      </div>
    </section>

    <section class="section section--flush-top" id="contact">
      <div class="wrap">{sec_en("Contact", "07")}</div>
      <div class="wrap grid">
        <div class="contact__intro reveal">
          <span class="label" data-i18n="ct.label">Contact</span>
          <h2 class="h2" data-i18n="ct.title">Start a project.</h2>
          <p class="muted" data-i18n="ct.lead"></p>
          <ul class="contact__info">
            <li><span class="ci-k" data-i18n="ct.addr">Address</span><span class="ci-v" data-contact="address">{e(CONTENT["contact"]["address"])}</span></li>
            <li><span class="ci-k" data-i18n="ct.mail">Email</span><a class="ci-v" data-contact="email" href="mailto:{e(CONTENT["contact"]["email"])}">{e(CONTENT["contact"]["email"])}</a></li>
            <li data-contact-row="phone" hidden><span class="ci-k" data-i18n="ct.phone">Phone</span><a class="ci-v" data-contact="phone" href="#">—</a></li>
            <li><span class="ci-k" data-i18n="ct.web">Web</span><a class="ci-v" href="https://aag.md" target="_blank" rel="noopener">aag.md</a></li>
          </ul>
        </div>

        <form class="form reveal" id="contact-form" novalidate>
          <fieldset class="form__services">
            <legend data-i18n="f.interest">I'm interested in</legend>
            {"".join(f'<label class="pill"><input type="checkbox" name="services" value="{k}"><span data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</span></label>' for k, _ in SVC)}
          </fieldset>
          <div class="form__row">
            <div class="field">
              <input id="f-name" name="name" type="text" autocomplete="name" placeholder=" " required aria-describedby="e-name">
              <label for="f-name" data-i18n="f.name">Your name</label>
              <small class="field__err" id="e-name" data-i18n="f.err.name"></small>
            </div>
            <div class="field">
              <input id="f-company" name="company" type="text" autocomplete="organization" placeholder=" ">
              <label for="f-company" data-i18n="f.company">Company</label>
            </div>
          </div>
          <div class="form__row">
            <div class="field">
              <input id="f-email" name="email" type="email" autocomplete="email" placeholder=" " required aria-describedby="e-email">
              <label for="f-email" data-i18n="f.email">Email</label>
              <small class="field__err" id="e-email" data-i18n="f.err.email"></small>
            </div>
            <div class="field">
              <input id="f-phone" name="phone" type="tel" autocomplete="tel" placeholder=" ">
              <label for="f-phone" data-i18n="f.phone">Phone</label>
            </div>
          </div>
          <div class="field field--select">
            <select id="f-qty" name="quantity" aria-label="Estimated run size">
              <option value="" data-i18n="f.qty.0">Estimated run size</option>
              <option value="< 1,000">&lt; 1,000</option>
              <option value="1,000 – 10,000">1,000 – 10,000</option>
              <option value="10,000 – 100,000">10,000 – 100,000</option>
              <option value="100,000+">100,000+</option>
            </select>
          </div>
          <div class="field">
            <textarea id="f-msg" name="message" rows="4" placeholder=" " required aria-describedby="e-msg"></textarea>
            <label for="f-msg" data-i18n="f.msg">Tell us about your project</label>
            <small class="field__err" id="e-msg" data-i18n="f.err.msg"></small>
          </div>
          <label class="consent"><input type="checkbox" name="consent" required><span data-i18n="f.consent"></span></label>
          <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
          <button class="btn btn--dark" type="submit"><span data-i18n="f.send">Send request</span>{ARROW}</button>
          <p class="form__status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
  </main>
''' + footer('\n  <script src="assets/js/gallery.js"></script>')


def build_services():
    blocks = []
    for idx, (k, n) in enumerate(SVC):
        img = CONTENT.get("services", {}).get(k, {}).get("image", "")
        flip = " svc-block--flip" if idx % 2 else ""
        blocks.append(f'''      <article class="grid svc-block{flip}" id="{k}">
        <div class="shot reveal mask"><img src="{e(img)}" alt="{I18N_EN["svc." + k + ".t"]}" loading="{"eager" if idx == 0 else "lazy"}" decoding="async" data-svc-img="{k}"></div>
        <div class="svc-block__body reveal">
          <span class="label">{n} / 06</span>
          <h2 class="h2" data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</h2>
          <p data-i18n="svc.{k}.long"></p>
          <dl class="specs">
            <div><dt data-i18n="spec.app">Applications</dt><dd data-i18n="svc.{k}.app"></dd></div>
            <div><dt data-i18n="spec.sub">Surfaces</dt><dd data-i18n="svc.{k}.sub"></dd></div>
            <div><dt data-i18n="spec.fin">Finish</dt><dd data-i18n="svc.{k}.fin"></dd></div>
          </dl>
          <a class="btn btn--line" href="index.html#contact" data-service="{k}"><span data-i18n="cta.btn">Request a quote</span>{ARROW}</a>
        </div>
      </article>''')
    steps = "\n".join(
        f'''          <article class="step"><span class="step__n">0{i} / 06</span><div><h3 data-i18n="pr.s{i}.t"></h3><p data-i18n="pr.s{i}.d"></p></div></article>'''
        for i in range(1, 7))
    return head("Services — Agro Alim Grup",
                "Screen printing, hot stamping, coating, bottle painting, cliché making, pad printing and decals on glass — Agro Alim Grup, Chișinău.") + header("services") + f'''
  <main id="main">
    <section class="page-hero">
      <div class="wrap grid">
        <span class="label" data-i18n="svc.label">Services</span>
        <h1 class="display" data-i18n-html="sv.hero">Six technologies<br>under one roof.</h1>
        <p class="lead reveal" data-i18n="sv.lead"></p>
      </div>
    </section>

    <div class="svc-nav">
      <div class="wrap"><nav class="svc-nav__inner" aria-label="Services">
        {"".join(f'<a href="#{k}" data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</a>' for k, _ in SVC)}
      </nav></div>
    </div>

    <section class="wrap">
{chr(10).join(blocks)}
    </section>

    <section class="process" id="process">
      <div class="process__sticky">
        <div class="wrap">{sec_en("Process", "07")}</div>
        <div class="wrap grid sec-head process__head">
          <span class="label" data-i18n="pr.label">Process</span>
          <h2 class="h2" data-i18n="pr.title">From sketch to shelf.</h2>
        </div>
        <div class="process__track">
{steps}
        </div>
        <div class="wrap"><div class="process__bar"><span></span></div></div>
      </div>
    </section>
{CTA}
  </main>
''' + footer()


def build_portfolio():
    items = CONTENT["portfolio"]
    filters = ('<button type="button" class="is-active" data-filter="all" aria-pressed="true" data-i18n="pf.all">All</button>' +
               "".join(f'<button type="button" data-filter="{k}" aria-pressed="false" data-i18n="svc.{k}.t">{I18N_EN["svc." + k + ".t"]}</button>' for k in TECHS))
    products = "\n".join(product(it, i, len(items)) for i, it in enumerate(items))
    return head("Portfolio — Agro Alim Grup",
                "Selected glass decoration work by Agro Alim Grup: screen printing, hot stamping, coating, bottle painting and decals.") + header("portfolio") + f'''
  <main id="main">
    <section class="page-hero">
      <div class="wrap grid">
        <span class="label" data-i18n="pf.label">Portfolio</span>
        <h1 class="display" data-i18n-html="pf.hero">Selected<br>work.</h1>
        <p class="lead reveal" data-i18n="pf.lead"></p>
      </div>
    </section>

    <div class="svc-nav pf-filters">
      <div class="wrap"><div class="svc-nav__inner filters" role="group" aria-label="Filter by technique">{filters}</div></div>
    </div>

    <section class="products" data-products>
{products}
    </section>
    <p class="wrap products__empty" data-empty hidden data-i18n="pf.empty">No projects for this technique yet.</p>
{CTA}
  </main>

  <div class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
    <button class="lightbox__close" type="button" data-i18n-aria="ui.close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <button class="lightbox__btn lightbox__btn--prev" type="button" data-i18n-aria="ui.prev" aria-label="Previous photo">{CHEV_L}</button>
    <figure class="lightbox__fig"><img alt=""><figcaption class="lightbox__cap"></figcaption></figure>
    <button class="lightbox__btn lightbox__btn--next" type="button" data-i18n-aria="ui.next" aria-label="Next photo">{CHEV_R}</button>
  </div>
''' + footer('\n  <script src="assets/js/gallery.js"></script>')


if __name__ == "__main__":
    for name, fn in [("index.html", build_index), ("services.html", build_services), ("portfolio.html", build_portfolio)]:
        with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
            f.write(fn())
    print("built index.html, services.html, portfolio.html")
