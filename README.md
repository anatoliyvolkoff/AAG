# Agro Alim Grup — portfolio website

Static, dependency-free portfolio site for **Agroalimgrup S.R.L. (AAG)**, a glass-decoration factory in Chișinău, Moldova. It covers screen printing, hot stamping, coating, bottle painting, cliché making, pad printing and decals.

## Features

- **Minimal, motion-heavy layout.** Sticky hero with a scroll-driven 3D bottle, word-by-word statement reveal, animated counters, a marquee, tilt and magnetic hover, and a pinned horizontal "process" section.
- **3D portfolio carousel** (Three.js). Seven bottles are modelled in code, each showing one finish: screen print, gold foil, matte coating, frost with relief, gradient paint, ceramic decal and soft-touch jar. You can drag or swipe to spin it, use the arrows, dots or keyboard, or click a bottle to bring it forward. It autoplays when idle.
- **Contact form** with service chips, validation, a honeypot field and a success state. It can post to any form backend, or fall back to opening a prefilled email.
- **EN / RO / RU** language switch, which also translates the carousel captions.
- Corner radii of 32–64 px throughout, responsive down to 360 px, and support for `prefers-reduced-motion`.

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

The brief asked for **Gotham** (body) and **Marbley** (display). Both are commercial fonts, so the site currently uses the closest free Google Fonts:

- Gotham → **Montserrat**
- Marbley → **Instrument Serif** (italic accents)

To use the licensed fonts, add the `.woff2` files to `assets/fonts/` and uncomment the `@font-face` block at the top of `assets/css/style.css`. The font stacks already list `Gotham` and `Marbley` first.

## Deploy

The site is plain static files, so any static host works: GitHub Pages, Netlify, Vercel or cPanel. Upload the repository contents as they are.

## Company information used (public sources)

- AGROALIMGRUP S.R.L., IDNO 1004600008087, registered on 11 Oct 2000 in Chișinău, with 10–49 employees. Website: aag.md.
- Founder and director: Serghei Drăguțanu. The company was the first in Moldova to decorate glass containers for wine and the beverage industry.
- Techniques: painting, decal transfer, tampography (pad printing), serigraphy (screen printing), and decoration of glass and ceramic containers.
- Notable work: taking part in promoting and producing EXCLUSIV vodka for the US market, design and production of HUNTER premium vodka, and 3D volumetric decoration for ICE vodka.

Sources: ZoomInfo and LinkedIn company/founder profiles, the informer.md company registry, and the Agroalimgrup Facebook page.

**To confirm with the client before launch:** the public email and phone, the street address of the production site, and real portfolio photos or brand permissions. The 3D bottles are illustrative concepts, not client work.
