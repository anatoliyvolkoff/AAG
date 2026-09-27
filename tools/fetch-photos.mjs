#!/usr/bin/env node
/* =========================================================
   Fetch freely licensed decoration photos into the site.

   Searches Openverse (Wikimedia Commons, Flickr, … — CC licences that
   allow commercial use and modification), downloads the best matches
   per technique, records attribution, and rebuilds the portfolio as
   technique showcases (one product per technique, photo carousel +
   credits). The concept visualisations are replaced; nothing else in
   content.json changes.

   Usage:
     node tools/fetch-photos.mjs              # 4 photos per technique
     node tools/fetch-photos.mjs --per 6      # more photos
     node tools/fetch-photos.mjs --dry        # list candidates only
   Then: python3 tools/build.py

   Needs network access to api.openverse.org and the image hosts
   (upload.wikimedia.org, live.staticflickr.com, …). Always review the
   downloaded photos and their licences before publishing.
   ========================================================= */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const API = process.env.OPENVERSE_API || "https://api.openverse.org/v1";
const args = process.argv.slice(2);
const PER = +(args[args.indexOf("--per") + 1] || 0) || 4;
const DRY = args.includes("--dry");
const OUT_DIR = path.join(ROOT, "assets", "photos", "web");
const CONTENT = path.join(ROOT, "content", "content.json");

const L = (en, ro, ru) => ({ en, ro, ru });
const TECHNIQUES = [
  { tech: "screen", queries: ["screen printed wine bottle", "silk screen printed glass bottle", "printed glass bottle label"],
    title: L("Screen printing on glass", "Serigrafie pe sticlă", "Шелкография на стекле"),
    kind: L("Screen printing · ceramic & UV inks", "Serigrafie · cerneluri ceramice și UV", "Шелкография · керамические и УФ-краски"),
    text: L("Examples of direct screen printing on wine and spirits bottles — crisp, permanent decoration without a paper label.",
            "Exemple de serigrafie directă pe sticle de vin și spirtoase — decor clar și permanent, fără etichetă de hârtie.",
            "Примеры прямой шелкографии на бутылках для вина и крепких напитков — чёткий вечный декор без бумажной этикетки."),
    specs: { container: L("Wine & spirits bottles", "Sticle de vin și spirtoase", "Бутылки для вина и крепких напитков"), finish: L("Fired ceramic or UV inks", "Cerneluri ceramice coapte sau UV", "Керамические (обжиг) или УФ-краски"), colours: L("Up to 6", "Până la 6", "До 6") } },
  { tech: "hot", queries: ["gold foil bottle", "hot foil stamping bottle", "embossed gold vodka bottle"],
    title: L("Hot stamping", "Ștanțare la cald", "Горячее тиснение"),
    kind: L("Gold & silver foil on glass", "Folie aurie și argintie pe sticlă", "Золотая и серебряная фольга на стекле"),
    text: L("Examples of metallic foil decoration — mirror-bright crests, logotypes and fine lines on premium bottles.",
            "Exemple de decor cu folie metalică — blazoane, logouri și linii fine strălucitoare pe sticle premium.",
            "Примеры декора металлизированной фольгой — зеркальные гербы, логотипы и тонкие линии на премиальных бутылках."),
    specs: { container: L("Spirits, wine, cosmetics", "Spirtoase, vin, cosmetică", "Крепкие напитки, вино, косметика"), finish: L("Hot-stamped foil", "Folie ștanțată la cald", "Фольга горячим тиснением"), colours: L("Gold, silver, copper, holographic", "Auriu, argintiu, cupru, holografic", "Золото, серебро, медь, голография") } },
  { tech: "coat", queries: ["frosted glass bottle", "matte black bottle", "coated glass bottle"],
    title: L("Coating", "Acoperire", "Покрытие"),
    kind: L("Matte, frost & soft-touch finishes", "Finisaje mate, frost și soft-touch", "Матовые, фрост и soft-touch покрытия"),
    text: L("Examples of full-body coatings that turn standard glass into an exclusive bottle — matte, frosted or soft-touch.",
            "Exemple de acoperiri integrale care transformă sticla standard într-o sticlă exclusivă — mat, frost sau soft-touch.",
            "Примеры сплошных покрытий, превращающих стандартное стекло в эксклюзивную бутылку — мат, фрост или soft-touch."),
    specs: { container: L("Bottles & jars", "Sticle și borcane", "Бутылки и банки"), finish: L("Matte · frost · soft-touch · gloss", "Mat · frost · soft-touch · lucios", "Мат · фрост · soft-touch · глянец"), colours: L("Any brand colour", "Orice culoare de brand", "Любой цвет бренда") } },
  { tech: "paint", queries: ["painted glass bottle", "colored glass bottle gradient", "pink rose wine bottle"],
    title: L("Bottle painting", "Vopsirea sticlelor", "Покраска бутылок"),
    kind: L("Solid & gradient painting", "Vopsire uniformă și în degrade", "Сплошная и градиентная покраска"),
    text: L("Examples of sprayed colour on glass — solid tones and smooth gradients that keep the liquid visible.",
            "Exemple de vopsire prin pulverizare pe sticlă — tonuri uniforme și degrade fine care lasă lichidul vizibil.",
            "Примеры напыления цвета на стекло — сплошные тона и плавные градиенты, сохраняющие видимость напитка."),
    specs: { container: L("Clear & tinted glass", "Sticlă transparentă și colorată", "Прозрачное и цветное стекло"), finish: L("Sprayed paint", "Vopsea pulverizată", "Напыление краски"), colours: L("Solid · gradient", "Uniform · degrade", "Сплошной · градиент") } },
  { tech: "pad", queries: ["decorated ceramic bottle", "ceramic flask decal", "decorated glass decanter"],
    title: L("Pad printing & decals", "Tampografie și decalcomanie", "Тампопечать и деколи"),
    kind: L("Multi-colour decoration on curved surfaces", "Decor multicolor pe suprafețe curbe", "Многоцветный декор на изогнутых поверхностях"),
    text: L("Examples of pad-printed and decal decoration on glass and ceramics — photographic detail on complex shapes.",
            "Exemple de decor prin tampografie și decaluri pe sticlă și ceramică — detalii fotografice pe forme complexe.",
            "Примеры тампопечати и деколей на стекле и керамике — фотографичная детализация на сложных формах."),
    specs: { container: L("Glass, ceramics, porcelain", "Sticlă, ceramică, porțelan", "Стекло, керамика, фарфор"), finish: L("Fired decal · pad print", "Decal copt · tampografie", "Деколь с обжигом · тампопечать"), colours: L("Full colour", "Policromie", "Полноцвет") } }
];

const LICENCE_NAMES = { by: "CC BY", "by-sa": "CC BY-SA", cc0: "CC0", pdm: "Public Domain", "by-nd": "CC BY-ND" };

async function search(q) {
  const url = `${API}/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&mature=false&page_size=20`;
  const res = await fetch(url, { headers: { "User-Agent": "aag-site-photo-fetch/1.0" } });
  if (!res.ok) throw new Error(`Openverse ${res.status} for "${q}"`);
  return (await res.json()).results || [];
}
function credit(r) {
  const lic = `${LICENCE_NAMES[r.license] || (r.license || "").toUpperCase()} ${r.license_version || ""}`.trim();
  const by = r.creator ? ` by ${r.creator}` : "";
  return `“${(r.title || "Untitled").slice(0, 80)}”${by} · ${lic} · ${r.foreign_landing_url || r.url}`;
}
function ffmpegBin() {
  for (const b of ["ffmpeg"]) { try { execFileSync(b, ["-version"], { stdio: "ignore" }); return b; } catch (e) {} }
  return null;
}

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ff = ffmpegBin();
  const seen = new Set();
  const library = [];
  for (const t of TECHNIQUES) {
    const picked = [];
    for (const q of t.queries) {
      if (picked.length >= PER) break;
      let results = [];
      try { results = await search(q); } catch (e) { console.warn("  !", e.message); continue; }
      for (const r of results) {
        if (picked.length >= PER) break;
        if (seen.has(r.id) || !r.url || (r.width && r.width < 900)) continue;
        seen.add(r.id);
        picked.push(r);
      }
    }
    console.log(`${t.tech}: ${picked.length} photos`);
    const photos = [];
    for (const [i, r] of picked.entries()) {
      const file = `${t.tech}-${i + 1}.jpg`;
      console.log(`  ${file}  ${credit(r)}`);
      if (DRY) continue;
      try {
        const res = await fetch(r.url);
        if (!res.ok) throw new Error(res.status);
        const tmp = path.join(OUT_DIR, `_${file}`);
        fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
        const out = path.join(OUT_DIR, file);
        if (ff) { // normalise: max 1600px, progressive JPEG
          execFileSync(ff, ["-y", "-loglevel", "error", "-i", tmp, "-vf", "scale='min(1600,iw)':-2", "-q:v", "4", out]);
          fs.unlinkSync(tmp);
        } else fs.renameSync(tmp, out);
        photos.push({ src: `assets/photos/web/${file}`, credit: credit(r), visual: false, source: r.foreign_landing_url || r.url, license: r.license, license_url: r.license_url || "" });
      } catch (e) { console.warn(`  ! download failed (${e.message}) — skipped`); }
    }
    library.push({ ...t, photos });
  }
  if (DRY) return;
  fs.writeFileSync(path.join(OUT_DIR, "credits.json"), JSON.stringify(library.map((l) => ({ tech: l.tech, photos: l.photos })), null, 2) + "\n");

  const content = JSON.parse(fs.readFileSync(CONTENT, "utf8"));
  const withPhotos = library.filter((l) => l.photos.length);
  if (!withPhotos.length) { console.log("No photos downloaded — content.json left unchanged."); return; }
  content.portfolio = withPhotos.map((l) => ({ id: `technique-${l.tech}`, tech: l.tech, title: l.title, kind: l.kind, text: l.text, specs: l.specs, photos: l.photos.map(({ src, credit, visual }) => ({ src, credit, visual })) }));
  // services + hero reuse the first photo of each technique
  const first = Object.fromEntries(withPhotos.map((l) => [l.tech, l.photos[0]]));
  for (const k of Object.keys(content.services || {})) if (first[k]) content.services[k] = { image: first[k].src, credit: first[k].credit, visual: false };
  content.hero = { images: withPhotos.map((l) => l.photos[0].src) };
  fs.writeFileSync(CONTENT, JSON.stringify(content, null, 2) + "\n");
  console.log(`Updated content.json with ${withPhotos.reduce((n, l) => n + l.photos.length, 0)} photos. Now run: python3 tools/build.py`);
};
main().catch((e) => { console.error(e); process.exit(1); });
