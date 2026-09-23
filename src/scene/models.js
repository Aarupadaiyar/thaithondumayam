// Procedural stand-ins for the 3D assets. Each one is replaced automatically
// when the matching .glb exists in /public/models (see loadOverride).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const gold = () =>
  new THREE.MeshPhysicalMaterial({ color: 0xe8b04a, metalness: 1, roughness: 0.22, clearcoat: 0.4 });

/* ------------------------------------------------------------------ */
/* Shiva lingam: polished granite with tripundra, on a golden avudaiyar */
/* ------------------------------------------------------------------ */
function lingamTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1715';
  g.fillRect(0, 0, c.width, c.height);
  // faint stone grain
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = `rgba(255,240,220,${Math.random() * 0.04})`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  // tripundra: three bands of vibhuti on the front face (u ≈ 0.25 faces +Z)
  const cx = c.width * 0.25;
  g.fillStyle = '#f4efe6';
  [0.44, 0.52, 0.6].forEach((v) => {
    g.beginPath();
    g.roundRect(cx - 150, c.height * v - 10, 300, 20, 10);
    g.fill();
  });
  // kumkum pottu
  g.fillStyle = '#d0142f';
  g.beginPath();
  g.arc(cx, c.height * 0.52, 18, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildShiva() {
  const group = new THREE.Group();
  group.name = 'shiva-placeholder';

  // Avudaiyar (yoni base): tiered lathe profile
  const base = [
    [0, 0], [0.95, 0], [0.95, 0.08], [0.85, 0.12], [0.85, 0.2], [1.05, 0.26], [1.05, 0.36],
    [0.8, 0.42], [0.72, 0.5], [0.72, 0.58], [0.9, 0.64], [0.9, 0.72], [0, 0.72],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const baseMesh = new THREE.Mesh(new THREE.LatheGeometry(base, 96), gold());
  group.add(baseMesh);

  // spout (gomukhi) pointing forward-right
  const spoutShape = new THREE.Shape();
  spoutShape.moveTo(-0.22, 0);
  spoutShape.lineTo(0.22, 0);
  spoutShape.quadraticCurveTo(0.16, 0.7, 0, 0.85);
  spoutShape.quadraticCurveTo(-0.16, 0.7, -0.22, 0);
  const spout = new THREE.Mesh(
    new THREE.ExtrudeGeometry(spoutShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }),
    gold()
  );
  spout.rotation.x = -Math.PI / 2;
  spout.rotation.z = -Math.PI / 4;
  spout.position.set(0.55, 0.64, 0.55);
  group.add(spout);

  // Lingam: smooth rounded pillar
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = t * 1.35;
    const r = t < 0.72 ? 0.48 : 0.48 * Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.28) ** 2));
    pts.push(new THREE.Vector2(r, y));
  }
  const lingam = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 96),
    new THREE.MeshPhysicalMaterial({ map: lingamTexture(), roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 })
  );
  lingam.position.y = 0.66;
  lingam.rotation.y = Math.PI / 2;
  group.add(lingam);

  // Golden crescent (Chandra) floating above
  const moonShape = new THREE.Shape();
  moonShape.absarc(0, 0, 0.26, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0.1, 0.07, 0.23, 0, Math.PI * 2, true);
  moonShape.holes.push(hole);
  const moon = new THREE.Mesh(
    new THREE.ExtrudeGeometry(moonShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 48 }),
    gold()
  );
  moon.position.set(0, 2.35, 0);
  moon.rotation.z = 0.5;
  moon.name = 'moon';
  group.add(moon);

  group.position.y = -1.1;
  const wrap = new THREE.Group();
  wrap.add(group);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Trishula with damaru                                                */
/* ------------------------------------------------------------------ */
export function buildTrident() {
  const g = new THREE.Group();
  g.name = 'trident-placeholder';
  const metal = gold();
  const bronze = new THREE.MeshPhysicalMaterial({ color: 0x8a4b1c, metalness: 1, roughness: 0.35 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.7 });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.3, 32), metal);
  shaft.position.y = -0.35;
  g.add(shaft);

  [-1.6, -0.6, 0.6, 1.05].forEach((y) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 12, 40), bronze);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  });

  const foot = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 24), metal);
  foot.rotation.x = Math.PI;
  foot.position.y = -2.15;
  g.add(foot);

  // lotus hub
  const hubPts = [[0, 0], [0.1, 0.02], [0.16, 0.1], [0.12, 0.2], [0.06, 0.26], [0, 0.27]].map(([x, y]) => new THREE.Vector2(x, y));
  const hub = new THREE.Mesh(new THREE.LatheGeometry(hubPts, 48), metal);
  hub.position.y = 1.3;
  g.add(hub);

  // blade shape reused for all three tips
  const blade = (len, w) => {
    const s = new THREE.Shape();
    s.moveTo(-w * 0.35, 0);
    s.quadraticCurveTo(-w, len * 0.35, 0, len);
    s.quadraticCurveTo(w, len * 0.35, w * 0.35, 0);
    s.lineTo(-w * 0.35, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 24 });
    geo.translate(0, 0, -0.0175);
    return new THREE.Mesh(geo, metal);
  };

  const mid = blade(1.05, 0.16);
  mid.position.y = 1.5;
  g.add(mid);

  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(side * 0.3, 1.47, 0),
      new THREE.Vector3(side * 0.5, 1.7, 0),
      new THREE.Vector3(side * 0.5, 2.05, 0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035, 12), metal));
    const tip = blade(0.55, 0.11);
    tip.position.set(side * 0.5, 2.02, 0);
    g.add(tip);
  });

  // damaru tied below the hub
  const damaru = new THREE.Group();
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x7a3b16, roughness: 0.55 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.03, 0.2, 32), drumMat);
  top.position.y = 0.1;
  const bottom = top.clone();
  bottom.rotation.x = Math.PI;
  bottom.position.y = -0.1;
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.8 });
  const skinA = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), skinMat);
  skinA.rotation.x = -Math.PI / 2;
  skinA.position.y = 0.201;
  const skinB = skinA.clone();
  skinB.rotation.x = Math.PI / 2;
  skinB.position.y = -0.201;
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.015, 8, 24), cloth);
  tie.rotation.x = Math.PI / 2;
  damaru.add(top, bottom, skinA, skinB, tie);
  damaru.position.set(0.24, 0.95, 0);
  damaru.rotation.z = 0.35;
  g.add(damaru);

  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 12, 32), cloth);
  ribbon.rotation.x = Math.PI / 2;
  ribbon.position.y = 1.2;
  g.add(ribbon);

  g.scale.setScalar(0.9);
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Swap in a real model when /models/<name>.glb exists                  */
/* ------------------------------------------------------------------ */
let loader;
function gltf() {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
  }
  return loader;
}

/**
 * Loads /models/<file>, normalises it to `height` world units, centres it
 * and replaces the children of `wrap`. Resolves with the gltf, or null when
 * the file is missing or broken (the built in model then stays).
 */
export function loadOverride(wrap, file, height, onProgress) {
  const url = `${import.meta.env.BASE_URL}models/${file}`;
  return new Promise((resolve) => {
    gltf().load(
      url,
      (res) => {
        const model = res.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = height / (size.y || 1);
        model.scale.setScalar(s);
        model.position.sub(center.multiplyScalar(s));
        wrap.clear();
        wrap.add(model);
        resolve(res);
      },
      (e) => e.total && onProgress?.(e.loaded / e.total),
      (err) => {
        console.warn(`[3d] could not load ${file}, keeping the built in model`, err);
        resolve(null);
      }
    );
  });
}
