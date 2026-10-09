# Agro Alim Grup — glass printing website

Marketing site for **Agroalimgrup S.R.L.**, a glass-decoration factory in Chișinău, Moldova (screen printing, pad printing, hot foil stamping, UV printing, coating, painting, decals, in-house tooling).

A static site with an interactive three.js story: scroll through the four print processes on 3D bottles, compare the technologies, and try your own text or logo on a bottle in the configurator. Russian, Romanian and English.

There are two layouts of the same site, sharing the design system, texts, 3D and configurator:

- **Classic** (`/`) — a vertical scroll story.
- **New** (`/v2/`) — a tour that runs **sideways on landscape screens and downwards on portrait screens**, switching live when the device rotates, plus horizontal sections (swipeable comparison table, services gallery, moving industries band).

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Classic layout: hero, scroll story, comparison, configurator, services, industries, about, process, FAQ, quote form, footer |
| `v2/index.html` | New layout (same sections and features, orientation-aware tour, horizontal sections) |
| `design-system.html` | Living reference for tokens and components (colour, type, spacing, motion, buttons, fields, cards, icons) |
| `404.html` | Not-found page used by GitHub Pages |

## Sections (classic layout)

1. **Hero** — floating 3D bottles behind a bold headline, two calls to action.
2. **Scroll story** (sticky stage) — four chapters. Each one zooms in on a bottle while the tool prints it: screen frame and squeegee, silicone pad, heated die with foil ribbon (with live footage from the print line), UV head and lamp. A glass card lists the process steps and ticks them off as they happen. A chapter navigator at the top jumps between chapters; ← → keys work too.
3. **Compare** — four cards, each with a rotating bottle and the essentials: colours, detail, effect, run size, tooling, best use.
4. **Configurator** — bottle shape, technology, glass, text or uploaded logo; rotates in 3D; download a PNG preview; "request a quote" carries the mock-up into the form.
5. **Services** — design & 3D, coating, painting, decals, clichés and tooling.
6. **Industries** — wine, spirits, beer, water, cosmetics, gifts.
7. **About** — key figures, company profile and notable projects.
8. **Process** — six steps from brief to delivery; the rail draws as you scroll.
9. **FAQ** — accordion.
10. **Contact** — quote form (validation, technology chips, run size, configurator mock-up).

## New layout (`/v2/`)

1. **Tour** — one sticky stage. The four technologies sit side by side on wide screens and one above the other on tall ones; scrolling moves the camera and the text panels together, so each bottle stops in its own slot next to its copy (never under it). Hero and finale show all four bottles in a line-up with numbered tags; the tags, a navigator bar (bottom on landscape, right edge on portrait), ← → keys and sideways trackpad/touch swipes all move through the tour. Rotating a phone or tablet keeps you on the same step.
2. **Compare** — one table with a rotating bottle per column and a "Try it" button that opens the configurator with that technology selected. On phones it swipes sideways with the row labels pinned.
3. **Configurator** — numbered steps; on phones and tablets the 3D preview stays pinned at the top and the request button stays pinned at the bottom while you change options.
4. **Services** — horizontal gallery (swipe, drag, arrows, progress bar).
5. **Industries** — two rows moving in opposite directions (static wrap with reduced motion).
6. **About**, **Process** (timeline runs across on wide landscape screens, down otherwise), **FAQ**, **Contact** — as in the classic layout.

## Design system

Defined in `assets/css/ds.css` and documented on `design-system.html`.

- **Colour** — cool neutral ramp (`--gray-0 … --gray-1000`), one action blue, one foil gold. Components use semantic roles (`--bg`, `--card`, `--ink`, `--mute`, `--line`, `--accent`); `.section--dark` / `.theme-dark` re-map them.
- **Type** — Inter (variable, optical sizes), self-hosted in `assets/fonts/`. Fluid scale: display, h1–h4, lead, body, small, caption, eyebrow.
- **Space & shape** — 4 px rhythm (`--space-1 … --space-10`), radii 8 / 12 / 18 / 28 / 40 / pill, four elevation levels.
- **Motion** — `--ease-out` for entrances, `--ease-in-out` for curtains, `--ease-spring` for toggles; durations 150–1100 ms. Everything respects `prefers-reduced-motion`.
- **Components** — buttons, links, chips, segmented control, fields, checkbox, switch, drop zone, cards, badges, tags, meter, accordion, toast.

## Code

```
assets/
  css/fonts.css      self-hosted Inter
  css/ds.css         design system
  css/site.css       page layout
  css/v2.css         new layout
  js/ui.js           shared UI: config, language, reveals, header, menu, FAQ, counters, form, preloader
  js/main.js         classic layout entry
  js/v2.js           new layout entry: gallery, marquee, compare → configurator, process rail
  js/i18n.js         RU / RO / EN texts
  js/bottles.js      shared 3D: bottle profiles, label art, studio lighting, shadows
  js/props.js        print-tool props (screen frame, pad, foil die, UV head)
  js/story.js        classic scroll story + comparison bottles
  js/journey.js      new layout's sideways/downwards tour
  js/studio.js       configurator
  vendor/three/      three.js r169 (MIT)
  media/             foil texture + bump map, print-line footage
```

No build step. `three` is resolved with an import map; the 3D modules load lazily, and the site still works (without 3D) where WebGL isn't available.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080 (classic) or http://localhost:8080/v2/ (new layout)
```

Language: `?lang=ru`, `?lang=ro` or `?lang=en` (the choice is remembered).

## Configure

At the top of `assets/js/ui.js` (used by both layouts):

```js
export const CONFIG = {
  email: "info@aag.md",
  phone: "",          // shown in Contact when filled in
  web: "aag.md",
  formEndpoint: ""    // e.g. a Formspree URL; empty = the form opens the visitor's email app
};
```

## Deploy

Any static host works: serve the folder as is (`.nojekyll` is included for GitHub Pages). The live preview is on Vercel: https://agrialimgrup.vercel.app (classic) and https://agrialimgrup.vercel.app/v2/ (new layout).

## To confirm with the client before launch

- Brand spelling: the registry name is **Agroalimgrup S.R.L.**; the site uses "Agro Alim Grup" (the earlier 3D draft said "AgriAlimGrup").
- Public email (`info@aag.md`) and phone; street address of the production site.
- Comparison values (colour counts, run sizes) and FAQ answers are written from general industry practice and the company's public description. Check them against what the factory actually offers.
- The hot-foil example uses a Medusa Vodka reference texture; make sure there is permission to show it.

Company facts (founded 11 October 2000 in Chișinău by engineer Serghei Drăguțanu; first decorator of wine glass in Moldova; EXCLUSIV, HUNTER and ICE vodka projects) come from public sources collected for the earlier AAG portfolio site.
