# Agro Alim Grup — portfolio website

Static portfolio site for **Agroalimgrup S.R.L. (AAG)**, a glass-decoration factory in Chișinău, Moldova: screen printing, hot stamping, coating, bottle painting, cliché making, pad printing and decals.

Live (GitHub Pages): https://anatoliyvolkoff.github.io/AAG/

## Pages

| page | contents |
| --- | --- |
| `index.html` | Hero with a photo crossfade, statement and key figures, showreel banner, service index, selected work, about/heritage, company profile, contact form |
| `services.html` | Six service sections, each with a photo and specs, a sticky service sub-nav, and a pinned horizontal process |
| `portfolio.html` | Product showcase. Each product has its own **photo carousel** (arrows, thumbnails, swipe, keyboard), **zoom on hover** that follows the cursor, a **fullscreen lightbox**, and an **information panel beside the photos** (technique, container, finish, colours, "Request a similar project"). Filter by technique. Deep links go to a product: `portfolio.html#p3`. |
| `admin.html` | Content editor (see below) |

There is no 3D or WebGL code in the site.

## Design system

- **Grid.** Desktop uses 8 columns of 108 px with a 16 px gutter, centred, for a 976 px container. Tablet uses the same 8 columns fluidly; phones use 4 columns. Press **G** (or add `?grid` to the URL) to show the red column overlay.
- **Type.** One family: Gotham, with Montserrat as the fallback. Weights are 400, 500 and 600. The scale is 64 / 44 / 24 / 20 / 16 / 14 / 12, with uppercase tracked labels.
- **Colour.** Monochrome: ink `#111`, paper `#f4f4f4`, surface `#ebebeb`, white, and night `#0c0c0c`.
- **Radius.** 32 px for components, 40 px for panels and images, and pills for controls.
- **Hovers.** Every hover uses one easing, `--ease-back`: a gentle ease-in-out-back, `cubic-bezier(.68, -0.2, .32, 1.2)`, over `--hover` (0.6 s). Hovers are simple — colour, opacity, background, or a 2–8 px shift or small zoom. They are all defined in one place, the **HOVERS** section of `assets/css/motion.css`.
- **Motion.** Opening loader (once per session), a curtain page transition, Lenis smooth scroll (`assets/vendor/lenis`, MIT), letter and line reveals, masked image reveals with light parallax, a scroll-velocity marquee, and a banner that expands as it scrolls into view. Everything respects `prefers-reduced-motion`.
- EN / RO / RU language switch.

## Photos

`assets/photos/` currently holds **concept visualisations**: studio-style images of the seven concept products (front, angle, close-up and back views). They are placeholders until real photos are available, and the site labels them "Concept visualisation".

To replace them with real, freely licensed photos of decorated bottles (screen printing, hot stamping, coating, painting, decals), run:

```bash
node tools/fetch-photos.mjs          # add --dry to preview, --per 6 for more photos
python3 tools/build.py
```

The script searches [Openverse](https://openverse.org), which covers Wikimedia Commons, Flickr and other sources, for photos licensed for commercial use and modification. It downloads them to `assets/photos/web/` with full attribution (`credits.json`) and rebuilds the portfolio as technique showcases. Credits appear under each photo and in the footer's **Photo credits**. It needs network access to `api.openverse.org` and the image hosts. **Review every photo and licence before publishing.** The best option is still AAG's own photos, uploaded through the admin.

## Banner (video / GIF / image)

The home page has a full-width showreel banner. The default is a 22-second photo slideshow (`assets/media/banner.mp4`, `banner.webm`, and `banner-poster.jpg` as the poster). It autoplays muted, pauses when off-screen, has a pause button, and stays paused on the poster for reduced-motion visitors. You can replace it in the admin with any MP4, GIF or image.

## Content admin (`admin.html`)

Editable content lives in `content/content.json`. `admin.html` edits it and publishes through the GitHub API. `tools/build.py` renders the same file into the static HTML, and the browser re-renders from it at runtime, so published changes appear without a rebuild.

| section | what you can change |
| --- | --- |
| Banner | show or hide it; video, GIF or image; upload or URL; poster; link; texts in EN / RO / RU |
| Hero slideshow | the photos that crossfade in the home hero: add, reorder, remove |
| Service images | one photo per service |
| Portfolio | products: add, delete, reorder; technique; title, subtitle, description and specs in EN / RO / RU; a **photo list** per product (add several, reorder, remove, credit/licence per photo) |
| Contact details | email, phone, address, form endpoint |

**How to use it**

1. Open `https://<your-site>/admin.html`. It isn't linked from the site, and `robots.txt` keeps it out of search engines.
2. Create a **fine-grained GitHub token** with access to this repository only and the permission **Contents: Read and write**. The panel has step-by-step instructions.
3. Paste the token, click **Connect**, and pick the branch your hosting deploys from.
4. Edit, then click **Publish changes**. Uploads go to `assets/uploads/`, then `content.json` is committed. GitHub Pages redeploys automatically.

The token stays in that browser and is never written into the site. Without a token you can still edit and use **Download JSON**.

## Quality agents

`.claude/agents/` contains two reusable agents for Claude Code:

- **qa-bug-hunter** runs an end-to-end browser test of every page, the galleries, lightbox, filters, form, menu, i18n, reduced motion and the admin, and reports bugs with file and line.
- **design-system-auditor** measures the pages against the grid, type scale, colour tokens, radii and the single hover easing, and reports inconsistencies with concrete fixes.

Run them after changes: *"use the qa-bug-hunter agent"* or *"run the design-system-auditor"*.

## Versions

| branch | version |
| --- | --- |
| `release/v2.0-grid-design` | Approved grid redesign (frozen) |
| `release/v3.0-motion` | v2 + motion layer |
| `release/v3.1-banner-admin` | v3 + media banner + content admin |
| `release/v4.0-photo-portfolio` | Photos instead of 3D, product carousels with zoom and info panel, unified hover easing, QA fixes |

## Run locally

```bash
npx http-server -p 8080 .   # or: python3 -m http.server 8080
```

Open http://localhost:8080. A local server is required because the pages load `content/content.json`. After editing templates or `content.json`, regenerate the pages with `python3 tools/build.py`.

## Configure

Contact details and the form endpoint live in `content/content.json` (editable in the admin). `AAG_CONFIG` at the top of `assets/js/main.js` holds the same values as a fallback. The public email `info@aag.md` **still needs confirming with AAG.** Interface texts live in `assets/js/i18n.js`.

## Fonts

The site uses a single family, **Gotham**. It is a commercial font, so **Montserrat** (Google Fonts) stands in for it. To use the licensed files, add them to `assets/fonts/` and uncomment the `@font-face` block at the top of `assets/css/style.css`.

## Deploy

Plain static files. GitHub Pages is enabled on this repository and republishes on every push to the branch selected under **Settings → Pages**. Any static host works as well.

## Company information used (public sources)

- AGROALIMGRUP S.R.L., IDNO 1004600008087, registered on 11 Oct 2000 in Chișinău, with 10–49 employees. Website: aag.md.
- Founder and director: Serghei Drăguțanu. The company was the first in Moldova to decorate glass containers for wine and the beverage industry.
- Techniques: painting, decal transfer, tampography (pad printing), serigraphy (screen printing), and decoration of glass and ceramic containers.
- Notable work: taking part in promoting and producing EXCLUSIV vodka for the US market, design and production of HUNTER premium vodka, and 3D volumetric decoration for ICE vodka.

Sources: ZoomInfo and LinkedIn company/founder profiles, the informer.md company registry, and the Agroalimgrup Facebook page.

**To confirm with the client before launch:** the public email and phone, the street address of the production site, and real portfolio photos or brand permissions.
