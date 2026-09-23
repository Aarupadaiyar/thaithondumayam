// Plain numbers the page animates (GSAP) and the 3D world reads every frame.
// Kept separate so page code can run before three.js has downloaded.
export const state = {
  shiva: { xf: 0.36, y: 0.1, s: 1 },
  shivaIn: 0, // 0 → 1 once the statue has streamed in
  fire: 1,
  trident: { xf: 0.62, y: 8, ry: 0, rz: 0.28, s: 1 },
  dustScroll: 0,
};
