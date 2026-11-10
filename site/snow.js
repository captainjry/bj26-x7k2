// Falling snow behind the hero header. Decoration only: app.js loads this lazily and the
// CSS gradient under it is the complete fallback.
import { WebGLRenderer, Scene, Camera, BufferGeometry, BufferAttribute, ShaderMaterial, Points, AdditiveBlending } from './vendor/three.module.min.js';

const COUNT = 420;
const FRAME_MS = 1000 / 30; // 30 fps is plenty for snow and halves GPU wakeups

const vertexShader = `
  attribute float aDepth;
  attribute float aPhase;
  uniform float uTime;
  uniform float uScroll;
  uniform float uPx;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float speed = mix(0.035, 0.16, aDepth);
    // near flakes fall faster and move more with scroll: depth without a real camera
    p.y = mod(p.y - uTime * speed + uScroll * mix(0.15, 0.9, aDepth) + 1.1, 2.2) - 1.1;
    p.x += sin(uTime * (0.3 + aPhase * 0.4) + aPhase * 6.28) * mix(0.015, 0.06, aDepth);
    gl_Position = vec4(p.xy, 0.0, 1.0);
    gl_PointSize = mix(1.6, 7.0, aDepth * aDepth) * uPx;
    vAlpha = mix(0.35, 0.85, aDepth) * (aDepth > 0.93 ? 0.45 : 1.0);
  }`;

const fragmentShader = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    gl_FragColor = vec4(0.93, 0.97, 1.0, a);
  }`;

export function startSnow(host) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.className = 'snow';
  canvas.setAttribute('aria-hidden', 'true');

  const pos = new Float32Array(COUNT * 3);
  const depth = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = Math.random() * 2.2 - 1.1;
    pos[i * 3 + 1] = Math.random() * 2.2 - 1.1;
    depth[i] = Math.pow(Math.random(), 1.6); // mostly distant small flakes, a few close ones
    phase[i] = Math.random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('aDepth', new BufferAttribute(depth, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 1));

  const uniforms = { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: 1 } };
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const points = new Points(geometry, material);
  points.frustumCulled = false; // positions are clip-space; the camera is unused
  const scene = new Scene();
  scene.add(points);
  const camera = new Camera();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    uniforms.uPx.value = dpr;
  };
  resize();
  new ResizeObserver(resize).observe(host);
  host.prepend(canvas);

  let inView = true;
  let raf = 0;
  let last = 0;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (t - last < FRAME_MS) return;
    last = t;
    uniforms.uTime.value = t / 1000;
    uniforms.uScroll.value = Math.min(window.scrollY / Math.max(host.clientHeight, 1), 1.5);
    renderer.render(scene, camera);
  };
  const update = () => {
    const run = inView && document.visibilityState === 'visible';
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }).observe(host);
  document.addEventListener('visibilitychange', update);
  update();
  requestAnimationFrame(() => canvas.classList.add('on')); // fade in
}
