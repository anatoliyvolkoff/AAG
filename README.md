# Agro Alim Grup — portfolio website

Static, dependency-free portfolio site for **Agroalimgrup S.R.L. (AAG)**, a glass-decoration factory in Chișinău, Moldova. It covers screen printing, hot stamping, coating, bottle painting, cliché making, pad printing and decals.

## Pages

| page | contents |
| --- | --- |
| `index.html` | Hero with a scroll-driven 3D bottle, statement and key figures, service index, selected work, about/heritage, contact form |
| `services.html` | Six service sections (screen printing, hot stamping, coating, bottle painting, cliché making, pad printing & decals), each with a rendered product image and specs, a sticky service sub-nav, and a pinned horizontal process |
| `portfolio.html` | Interactive 3D carousel (drag, arrows, keys, dots; autoplay when idle), plus a filterable project grid that opens each project in the 3D viewer |

## Design system

- **Grid.** Desktop uses 8 columns of 108 px with a 16 px gutter, centred, for a 976 px container. Tablet uses the same 8 columns fluidly; phones use 4 columns. Every section is placed on column lines. Press **G** (or add `?grid` to the URL) to show the red column overlay.
- **Type.** One family: Gotham, with Montserrat as the fallback. Weights are 400, 500 and 600. The scale is 64 / 44 / 24 / 20 / 16 / 14 / 12, with uppercase tracked labels. There is no display serif and no italics.
- **Colour.** Monochrome: ink `#111`, paper `#f4f4f4`, white, and night `#0c0c0c`. There are no gradients.
- **Radius.** 32 px for components, 40 px for panels, and pills for controls.
- **Imagery.** Product images are rendered live from the same 3D models as the carousel, including a mirrored metal cliché plate. No illustrations are used.
- **Motion.** Line reveals, fade-up on scroll, word-by-word statement, counters, the scroll-driven hero bottle, the pinned process section and the 3D carousel. `prefers-reduced-motion` is respected.
- EN / RO / RU language switch.

## Motion layer (v3)

v3 adds the following, inspired by Japanese corporate-agency sites (reference: bright-avenue.jp). The code is in `assets/js/motion.js` and `assets/css/motion.css`.

- **Opening loader.** Shown on the first visit of a session: logo reveal, a 000→100 counter, a progress line, then a wipe.
- **Page transitions.** A dark curtain covers the page on internal navigation and lifts on the next page.
- **Smooth scroll.** Uses [Lenis](https://github.com/darkroomengineering/lenis), included locally in `assets/vendor/lenis` (MIT). In-page anchors glide to their target.
- **Giant English section titles** (Service, Works, About, Company, Contact) with letter-by-letter reveals, numbered `(01)` to `(05)`.
- **Masked image reveals and parallax** on every product image.
- **Hovers:**
  - text roll on all links and buttons
  - fill wipe and arrow swap on buttons
  - ink wipe on service rows
  - zoom, dim and underline on project cards
  - underline sweep on company-profile rows
  - circle-fill on the big contact block
- **Cursor labels** ("View", "Drag", "Open", "Contact") over interactive areas, desktop only.
- **Marquee** of service names whose speed and direction follow your scrolling.
- **Fullscreen menu** with numbered links and staggered entry.
- **Company profile table** built from public registry data.
- **Scroll indicator** in the hero, and a **back-to-top** control in the footer.

All of these are disabled when the visitor has `prefers-reduced-motion` set.

## Versions

| branch | version |
| --- | --- |
| `release/v2.0-grid-design` | Approved grid redesign (frozen) |
| `release/v3.0-motion` | v2 + motion layer |

## Run locally

```bash
npx http-server -p 8080 .   # or: python3 -m http.server 8080
```

Open http://localhost:8080. The page uses ES modules, so a local server is required; opening the file directly won't work. Three.js 0.165 is included in `assets/vendor/three/` (MIT), so no CDN is needed.

## Configure

Edit the `AAG_CONFIG` object at the top of `assets/js/main.js`:

| key | purpose |
| --- | --- |
| `email` | Public inbox. Currently `info@aag.md`, **which still needs confirming with AAG.** |
| `phone` | Shown only when filled in. |
| `address` | Address shown in the contact block. |
| `formEndpoint` | URL of a form backend (for example Formspree `https://formspree.io/f/xxxx`) that receives JSON. If empty, the form opens a prefilled email instead. |

Texts live in `assets/js/i18n.js`. Portfolio bottles are defined in `buildDesigns()` in `assets/js/scene.js`.

## Fonts

The site uses a single family, **Gotham**. It is a commercial font, so **Montserrat** (Google Fonts) stands in for it. To use the licensed files, add them to `assets/fonts/` and uncomment the `@font-face` block at the top of `assets/css/style.css`. Instrument Serif is loaded only for the printed artwork on the 3D bottle labels.

## Deploy

The site is plain static files, so any static host works: GitHub Pages, Netlify, Vercel or cPanel. Upload the repository contents as they are.

## Company information used (public sources)

- AGROALIMGRUP S.R.L., IDNO 1004600008087, registered on 11 Oct 2000 in Chișinău, with 10–49 employees. Website: aag.md.
- Founder and director: Serghei Drăguțanu. The company was the first in Moldova to decorate glass containers for wine and the beverage industry.
- Techniques: painting, decal transfer, tampography (pad printing), serigraphy (screen printing), and decoration of glass and ceramic containers.
- Notable work: taking part in promoting and producing EXCLUSIV vodka for the US market, design and production of HUNTER premium vodka, and 3D volumetric decoration for ICE vodka.

Sources: ZoomInfo and LinkedIn company/founder profiles, the informer.md company registry, and the Agroalimgrup Facebook page.

**To confirm with the client before launch:** the public email and phone, the street address of the production site, and real portfolio photos or brand permissions. The 3D bottles are illustrative concepts, not client work.
