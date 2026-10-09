# Agro Alim Grup — glass printing website

Marketing site for **Agroalimgrup S.R.L.**, a glass-decoration factory in Chișinău, Moldova (screen printing, pad printing, hot foil stamping, UV printing, coating, painting, decals, in-house tooling).

A static site with an interactive three.js story: scroll through the four print processes on 3D bottles, compare the technologies, and try your own text or logo on a bottle in the configurator. Russian, Romanian and English.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | The website: hero, scroll story, comparison, configurator, services, industries, about, process, FAQ, quote form, footer |
| `design-system.html` | Living reference for tokens and components (colour, type, spacing, motion, buttons, fields, cards, icons) |
| `404.html` | Not-found page used by GitHub Pages |

## Sections on the home page

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
  js/main.js         UI: language, reveals, header, menu, FAQ, counters, form, preloader
  js/i18n.js         RU / RO / EN texts
  js/bottles.js      shared 3D: bottle profiles, label art, studio lighting, shadows
  js/story.js        scroll story + comparison bottles
  js/studio.js       configurator
  vendor/three/      three.js r169 (MIT)
  media/             foil texture + bump map, print-line footage
```

No build step. `three` is resolved with an import map; the 3D modules load lazily, and the site still works (without 3D) where WebGL isn't available.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Language: `?lang=ru`, `?lang=ro` or `?lang=en` (the choice is remembered).

## Configure

At the top of `assets/js/main.js`:

```js
export const CONFIG = {
  email: "info@aag.md",
  phone: "",          // shown in Contact when filled in
  web: "aag.md",
  formEndpoint: ""    // e.g. a Formspree URL; empty = the form opens the visitor's email app
};
```

## Deploy

GitHub Pages serves the repository root (`.nojekyll` is included). Any static host works.

## To confirm with the client before launch

- Brand spelling: the registry name is **Agroalimgrup S.R.L.**; the site uses "Agro Alim Grup" (the earlier 3D draft said "AgriAlimGrup").
- Public email (`info@aag.md`) and phone; street address of the production site.
- Comparison values (colour counts, run sizes) and FAQ answers are written from general industry practice and the company's public description. Check them against what the factory actually offers.
- The hot-foil example uses a Medusa Vodka reference texture; make sure there is permission to show it.

Company facts (founded 11 October 2000 in Chișinău by engineer Serghei Drăguțanu; first decorator of wine glass in Moldova; EXCLUSIV, HUNTER and ICE vodka projects) come from public sources collected for the earlier AAG portfolio site.
