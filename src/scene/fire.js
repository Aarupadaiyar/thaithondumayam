// GPU particle fire: a Nataraja style prabha (ring of flames) plus drifting
// golden dust. Tuned for a light background, so it uses normal blending.
import * as THREE from 'three';

const fireVert = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  uniform float uHeight;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aAngle;
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aTall;
  varying float vLife;
  varying float vSeed;

  void main() {
    float life = fract(uTime * aSpeed + aSeed);
    float a = aAngle + sin(uTime * 0.7 + aSeed * 40.0) * 0.015;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 side = vec2(-dir.y, dir.x);
    float h = life * uHeight * aTall;
    // tongues narrow and curl as they rise
    float sway = sin(life * 7.0 - uTime * 4.0 + aSeed * 30.0) * 0.07 * life;
    vec2 p = dir * (uRadius + h) + side * sway * (1.0 - life * 0.3);
    p.y += life * life * 0.12;
    vec3 pos = vec3(p, (fract(aSeed * 13.7) - 0.5) * 0.18);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * pow(1.0 - life, 0.8) * (0.55 + fract(aSeed * 7.3) * 0.8);
    gl_PointSize = size * uPixelRatio * (8.0 / -mv.z);
    vLife = life;
    vSeed = aSeed;
  }
`;

const fireFrag = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float soft = smoothstep(0.5, 0.0, d);
    vec3 core = vec3(1.0, 0.93, 0.62);
    vec3 mid = vec3(1.0, 0.58, 0.1);
    vec3 tip = vec3(0.84, 0.12, 0.1);
    vec3 col = mix(core, mid, smoothstep(0.0, 0.35, vLife));
    col = mix(col, tip, smoothstep(0.35, 0.9, vLife));
    float alpha = soft * pow(1.0 - vLife, 1.3) * uIntensity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function buildFireRing({ count = 3200, radius = 1.75, height = 0.55, tongues = 42 } = {}) {
  const angle = new Float32Array(count);
  const seed = new Float32Array(count);
  const speed = new Float32Array(count);
  const tall = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i % tongues;
    const base = (t / tongues) * Math.PI * 2;
    angle[i] = base + (Math.random() - 0.5) * ((Math.PI * 2) / tongues) * 0.7;
    seed[i] = Math.random();
    speed[i] = 0.35 + Math.random() * 0.45;
    // every other tongue is taller, like the carved prabha
    tall[i] = (t % 2 ? 0.7 : 1.1) * (0.6 + Math.random() * 0.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aTall', new THREE.BufferAttribute(tall, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + height * 2);

  const mat = new THREE.ShaderMaterial({
    vertexShader: fireVert,
    fragmentShader: fireFrag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uHeight: { value: height },
      uSize: { value: 26 },
      uIntensity: { value: 1 },
      uPixelRatio: { value: 1 },
    },
  });
  const points = new THREE.Points(geo, mat);

  // the golden hoop the flames grow from
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.045, 24, 180),
    new THREE.MeshPhysicalMaterial({ color: 0xe8b04a, metalness: 1, roughness: 0.2, transparent: true })
  );
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.12, 0.018, 16, 180),
    new THREE.MeshPhysicalMaterial({ color: 0xc8102e, metalness: 0.4, roughness: 0.4, transparent: true })
  );

  const group = new THREE.Group();
  group.add(points, hoop, inner);
  group.userData = { mat, hoop, inner };
  return group;
}

export function setFireIntensity(ring, v) {
  const { mat, hoop, inner } = ring.userData;
  mat.uniforms.uIntensity.value = v;
  hoop.material.opacity = Math.min(1, v * 1.2);
  inner.material.opacity = Math.min(1, v * 1.2);
  ring.visible = v > 0.01;
}

/* drifting vibhuti / gold dust */
export function buildDust(count = 420) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScroll: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixelRatio; uniform float uScroll;
      attribute float aSeed; varying float vSeed;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.05 + aSeed * 0.12) + uScroll * (0.4 + aSeed) + 5.0, 10.0) - 5.0;
        p.x += sin(uTime * 0.3 + aSeed * 20.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed * 5.0) * uPixelRatio * (8.0 / -mv.z);
        vSeed = aSeed;
      }`,
    fragmentShader: /* glsl */ `
      varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * (0.35 + vSeed * 0.5);
        vec3 c = mix(vec3(0.95, 0.62, 0.12), vec3(0.78, 0.06, 0.18), step(0.82, vSeed));
        gl_FragColor = vec4(c, a);
      }`,
  });
  return new THREE.Points(geo, mat);
}
