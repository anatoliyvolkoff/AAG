/* 3D print tools for each technology, animated by process progress q (0..1). */
import { THREE, PI, ct, mx, A } from "./bottles.js";

/* ---------- 3D print tools, animated by process progress q ---------- */
const M = (c, e) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.4, transparent: true, emissive: e || 0x000000, emissiveIntensity: 0 });

export function mkProps(o, i) {
  const g = new THREE.Group(); g.visible = false; o.h.add(g); let u;
  if (i === 0) { // screen frame + squeegee + ink bead
    const fc = document.createElement("canvas"); fc.width = fc.height = 256;
    const f = fc.getContext("2d");
    f.strokeStyle = "rgba(255,255,255,.6)"; f.lineWidth = 1;
    for (let k = 0; k <= 256; k += 8) { f.beginPath(); f.moveTo(k, 0); f.lineTo(k, 256); f.moveTo(0, k); f.lineTo(256, k); f.stroke(); }
    f.lineWidth = 14; f.strokeStyle = "#d8d8d8"; f.strokeRect(7, 7, 242, 242);
    const fm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9), fm); fr.position.y = -1;
    const sq = new THREE.Group(), hd = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.14), M(0x8a8a8a)); hd.position.y = 1.1;
    sq.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.95, 0.1), M(0xe8e8e8)), hd);
    const bead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.75, 14), M(0xf2f2f2));
    g.add(fr, sq, bead);
    u = q => {
      const lo = ct(q, 0, 0.15) - ct(q, 0.85, 1), s = ct(q, 0.15, 0.85);
      bead.position.set(-0.67 + 1.2 * s, -1, 0.72); bead.visible = lo > 0.5 && s < 0.98;
      fr.position.z = 0.75 + 0.6 * (1 - lo); fm.opacity = lo;
      sq.position.set(-0.6 + 1.2 * s, -1, 0.8 + 0.6 * (1 - lo)); sq.visible = lo > 0.02;
    };
  } else if (i === 1) { // cliché plate + silicone pad
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.08), M(0x555555)), ink = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.02), M(0xf2f2f2));
    pl.position.set(-1.35, -1, 0.72); ink.position.set(-1.35, -1, 0.77);
    const pad = new THREE.Group(), pm = M(0xb0b0b0), dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 16, 0, 6.2832, 0, 1.5708), pm);
    dome.rotation.x = -1.5708;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 16), M(0x8a8a8a)); stem.rotation.x = 1.5708; stem.position.z = 0.65;
    pad.add(dome, stem); g.add(pl, ink, pad);
    u = q => {
      let px = 0, pz = 2, sc = 1;
      if (q < 0.12) px = mx(-2.2, -1.35, q / 0.12);
      else if (q < 0.28) { px = -1.35; const d = Math.sin(PI * ct(q, 0.12, 0.24)); pz = 2 - 0.78 * d; sc = 1 - 0.2 * d; }
      else if (q < 0.55) px = mx(-1.35, 0, ct(q, 0.28, 0.55));
      else if (q < 0.68) { const d = ct(q, 0.55, 0.68); pz = 2 - 0.9 * d; sc = 1 - 0.25 * d; }
      else if (q < 0.8) { const d = 1 - ct(q, 0.68, 0.8); pz = 2 - 0.9 * d; sc = 1 - 0.25 * d; }
      else px = mx(0, -2.2, ct(q, 0.8, 1));
      pad.position.set(px, -1, pz); dome.scale.y = sc;
      pm.color.setHex(q > 0.24 && q < 0.64 ? 0xf4f4f4 : 0xb0b0b0);
      ink.material.opacity = 1 - 0.7 * ct(q, 0.14, 0.24);
    };
  } else if (i === 2) { // heated die + foil ribbon
    const dm = M(0x9a9a9a, 0xffffff), die = new THREE.Group();
    die.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.35), dm));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.4), M(0x666666)); arm.position.z = 0.85; die.add(arm);
    const sc = document.createElement("canvas"); sc.width = 64; sc.height = 512;
    const s2 = sc.getContext("2d"), sg = s2.createLinearGradient(0, 0, 64, 0);
    sg.addColorStop(0, "#8a7238"); sg.addColorStop(0.5, "#fff3cf"); sg.addColorStop(1, "#9a8040");
    s2.fillStyle = sg; s2.fillRect(0, 0, 64, 512); s2.fillStyle = "#222";
    for (let k = 0; k < 16; k++) s2.fillRect(0, k * 32 + 14, 64, 3);
    const st = new THREE.CanvasTexture(sc); st.wrapT = THREE.RepeatWrapping; st.colorSpace = THREE.SRGBColorSpace;
    const fm = new THREE.MeshBasicMaterial({ map: st, transparent: true, side: THREE.DoubleSide, opacity: 0.85 });
    const foil = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3), fm);
    foil.position.set(0, -1.09, 0.95); foil.scale.set(1.5, 1.3, 1); die.scale.set(1.55, 2.5, 1);
    g.add(foil, die);
    u = (q, t) => {
      let dz;
      if (q < 0.3) dz = mx(2.6, 1.7, q / 0.3);
      else if (q < 0.42) dz = 1.7;
      else if (q < 0.58) dz = mx(1.7, 0.86, ct(q, 0.42, 0.58));
      else if (q < 0.66) dz = 0.86;
      else if (q < 0.85) dz = mx(0.86, 1.7, ct(q, 0.66, 0.85));
      else dz = mx(1.7, 2.6, ct(q, 0.85, 1));
      die.position.set(0, -1.09, dz); foil.position.z = Math.min(0.95, dz - 0.185);
      fm.opacity = 0.85 * (1 - ct(q, 0.9, 1)); st.offset.y = 0.5 * ct(q, 0.7, 1);
      dm.emissiveIntensity = (0.12 + 0.12 * Math.sin(t / 180 * A)) * (q < 0.66 ? 1 : 0.3);
    };
  } else { // UV print head on rails + lamp
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.06), M(0x777777)), rr = rl.clone();
    rl.position.set(-0.85, -1, 0.72); rr.position.set(0.85, -1, 0.72);
    const hd = new THREE.Group(); hd.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.3), M(0x8a8a8a)));
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.12), new THREE.MeshBasicMaterial({ color: 0xc9d8ff })); lamp.position.y = 0.14; hd.add(lamp);
    g.add(rl, rr, hd);
    u = q => { hd.position.set(0, -0.25 - 1.5 * ct(q, 0.1, 0.85), 0.82); };
  }
  return { g, u };
}
