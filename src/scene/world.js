// One fixed WebGL stage behind every page. Pages drive it through `state`
// (the home page scrubs it with GSAP ScrollTrigger). Models stream in one
// after another by priority, so the page never waits on them.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildShiva, buildTrident, loadOverride } from './models.js';
import { buildFireRing, buildDust, setFireIntensity } from './fire.js';

const FOV = 35;
const CAM_Z = 9;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 *   mode         'home' | 'page'
 *   state        shared numbers from ./state.js
 *   anchor       (page) element the fire halo frames
 *   templeAnchor (home) element the lingam sits in
 *   onModel      called with a model name once it is on screen
 */
export function createWorld(canvas, { mode = 'home', state, anchor = null, templeAnchor = null, onModel = () => {} } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xf2b632, 0.6));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff7a2a, 1.4);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  // ---------- objects ----------
  const dust = buildDust(small ? 180 : 420);
  scene.add(dust);

  const shivaRoot = new THREE.Group();
  const shiva = new THREE.Group(); // filled when the statue arrives
  const ring = buildFireRing({ count: small ? 1600 : 3200 });
  ring.position.set(0, 0.15, -0.5);
  shivaRoot.add(ring, shiva);

  const trident = buildTrident();
  const tridentRoot = new THREE.Group();
  tridentRoot.add(trident);

  const lingam = new THREE.Group();
  const lingamRoot = new THREE.Group();
  lingamRoot.add(lingam);
  lingamRoot.visible = false;
  let lingamIn = 0;
  let lingamReady = false;

  let pageRing = null;
  if (mode === 'home') {
    scene.add(shivaRoot, tridentRoot, lingamRoot);
  } else {
    pageRing = buildFireRing({ count: small ? 1200 : 2400, radius: 1.75, height: 0.5, tongues: 36 });
    scene.add(pageRing);
  }

  // ---------- models, in priority order ----------
  if (mode === 'home') {
    (async () => {
      const got = await loadOverride(shiva, 'shiva.glb', 2.8);
      if (!got) shiva.add(buildShiva()); // offline or missing: procedural lingam
      onModel('shiva');
      await loadOverride(trident, 'trident.glb', 4.2);
      onModel('trident');
      if (templeAnchor && (await loadOverride(lingam, 'lingam.glb', 2.4))) {
        lingamReady = true;
        onModel('lingam');
      }
    })();
  }

  // ---------- sizing ----------
  let w = 0, h = 0, halfH = 0, halfW = 0, narrow = false;
  const pr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    halfW = halfH * camera.aspect;
    narrow = camera.aspect < 0.9;
    [ring, pageRing].forEach((r) => r && (r.userData.mat.uniforms.uPixelRatio.value = pr));
    dust.material.uniforms.uPixelRatio.value = pr;
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- pointer parallax ----------
  const pointer = new THREE.Vector2();
  const look = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  }, { passive: true });

  const nav = document.querySelector('.nav');

  // DOM rect → world position on the z = 0 plane
  const toWorld = (r) => [
    (((r.left + r.width / 2) / w) * 2 - 1) * halfW,
    -(((r.top + r.height / 2) / h) * 2 - 1) * halfH,
  ];
  const pxToWorld = (px) => px * ((2 * halfH) / h);

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += reduced ? dt * 0.25 : dt;
    look.lerp(pointer, 0.05);

    dust.material.uniforms.uTime.value = t;
    dust.material.uniforms.uScroll.value = state.dustScroll;
    dust.rotation.y = look.x * 0.08;

    if (mode === 'home') {
      let k = Math.min(1, halfW / 5.2 + 0.2);
      let baseY = 0;
      if (narrow) {
        // phones: fit the flame ring into the gap between the floating nav
        // and the hero text (which starts at 40svh), never underneath the nav
        const OUTER = 2.35; // ring radius + flame height, in model units
        // offsets ignore the hide on scroll transform, so Shiva does not jump
        const navBottom = (nav ? nav.offsetTop + nav.offsetHeight : 80) + 12;
        const textTop = h * 0.4 - 8;
        const room = pxToWorld(textTop - navBottom);
        k = Math.min(0.48, halfW / 2.6, room / (OUTER * 2));
        baseY = halfH - pxToWorld(navBottom) - OUTER * k - 0.1;
      }
      shivaRoot.position.set(narrow ? 0 : state.shiva.xf * halfW, state.shiva.y + baseY, 0);
      shivaRoot.scale.setScalar(state.shiva.s * k);
      shivaRoot.visible = state.shiva.s > 0.02 && state.shiva.y < 6;
      shiva.scale.setScalar(Math.max(0.001, state.shivaIn));
      shiva.position.y = (1 - state.shivaIn) * -0.6;
      shiva.rotation.y = Math.sin(t * 0.35) * 0.35 + look.x * 0.4;
      shiva.rotation.x = look.y * 0.12;
      ring.rotation.z = t * 0.05;
      ring.rotation.y = look.x * 0.15;
      ring.userData.mat.uniforms.uTime.value = t;
      setFireIntensity(ring, state.fire);

      const tk = narrow ? 0.7 : 1;
      tridentRoot.position.set(state.trident.xf * halfW * (narrow ? 0.45 : 1), state.trident.y, 0.5);
      tridentRoot.rotation.set(look.y * 0.1, state.trident.ry + t * 0.25, state.trident.rz);
      tridentRoot.scale.setScalar(state.trident.s * tk);
      tridentRoot.visible = state.trident.y < 7 && state.trident.y > -7;

      if (templeAnchor) {
        const r = templeAnchor.getBoundingClientRect();
        const onScreen = r.bottom > 0 && r.top < h;
        lingamIn += ((lingamReady && onScreen ? 1 : 0) - lingamIn) * 0.06;
        lingamRoot.visible = lingamIn > 0.01;
        if (lingamRoot.visible) {
          const [x, y] = toWorld(r);
          lingamRoot.position.set(x, y, 0);
          lingamRoot.scale.setScalar((pxToWorld(r.height) / 2.4) * 0.78 * (0.85 + lingamIn * 0.15));
          lingam.rotation.y = t * 0.3 + look.x * 0.3;
          lingam.rotation.x = 0.12 + look.y * 0.08;
          lingam.position.y = (1 - lingamIn) * -0.5;
        }
      }
    } else if (pageRing && anchor) {
      const r = anchor.getBoundingClientRect();
      const visible = r.bottom > -100 && r.top < h + 100;
      pageRing.visible = visible;
      if (visible) {
        const [x, y] = toWorld(r);
        pageRing.position.set(x, y, -0.5);
        // hug the photo: slightly inside its half diagonal so flames lick the corners
        pageRing.scale.setScalar((pxToWorld(Math.hypot(r.width, r.height) / 2) * 0.86) / 1.75);
        pageRing.rotation.z = t * 0.04;
        pageRing.userData.mat.uniforms.uTime.value = t;
        setFireIntensity(pageRing, 0.9);
      }
    }

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  // pause the GPU when the tab is hidden
  document.addEventListener('visibilitychange', () =>
    renderer.setAnimationLoop(document.hidden ? null : frame)
  );

  return { renderer };
}
