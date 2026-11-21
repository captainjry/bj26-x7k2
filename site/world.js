// The world behind the itinerary, in the look of the owner's snowboard talk: blue-hour sky and fog,
// alpenglow, flat-shaded low-poly, snow around the camera. Each day has its own scene (scenes.js); a day
// switch cuts through the fog like a slide change. Decoration only: the CSS dusk gradient is the fallback.
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Color, Fog, HemisphereLight,
  DirectionalLight, Points, PointsMaterial, CanvasTexture, Vector3, ColorManagement, LinearSRGBColorSpace,
} from './vendor/three.module.min.js';
import { SCENES, sceneFor } from './scenes.js';

// The talk ran on three r128: no colour management, lights not scaled by PI. Match it.
ColorManagement.enabled = false;
const PI = Math.PI;
const FRAME_MS = 1000 / 30;
const WIDE = 900; // px: desktop layout, text panel on the left
const CUT_OUT = 0.45, CUT_IN = 0.8; // seconds of the fog cut between scenes
const STILL_T = 9; // reduced motion: the moment each scene is frozen at

function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => m.dispose()); // the shared snow texture is not owned by any scene
  });
}

export function startWorld(host, trip, onAlt, { still = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const fog = new Fog(0x16233b, 50, 230);
  scene.fog = fog;
  scene.background = fog.color;
  const camera = new PerspectiveCamera(55, 1, 0.1, 900);
  const hemi = new HemisphereLight(0x9fbfff, 0x2a3550, 1);
  const sun = new DirectionalLight(0xffb38a, 1);
  scene.add(hemi, sun);

  const flake = document.createElement('canvas');
  flake.width = flake.height = 32;
  const fx = flake.getContext('2d'), gr = fx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  fx.fillStyle = gr; fx.fillRect(0, 0, 32, 32);
  const dot = new CanvasTexture(flake);

  // snowfall that follows the camera; fewer flakes on phones
  const SN = innerWidth >= WIDE ? 3500 : 2000;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN * 3; i++) sp[i] = (Math.random() - 0.5) * 60;
  const snowGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(sp, 3));
  const snow = new Points(snowGeo, new PointsMaterial({ size: 0.25, map: dot, transparent: true, depthWrite: false, opacity: 0.85 }));
  snow.frustumCulled = false;
  scene.add(snow);

  // ---------- scenes ----------
  let current = null; // { name, s: built scene }
  let wanted = null; // [name, variant]
  let cut = null; // { phase: 'out' | 'in', k, from: {near, far, color} }
  let env = null;
  let narrow = innerWidth < WIDE;
  let t = 0, first = true;
  const camPos = new Vector3(-60, 80, -60), camLook = new Vector3();

  function applyEnv(e) {
    env = e;
    hemi.color.set(e.sky); hemi.groundColor.set(e.ground); hemi.intensity = e.hemi * PI;
    sun.color.set(e.sun); sun.intensity = e.sunI * PI; sun.position.set(...e.sunPos);
  }
  function build([name, variant]) {
    if (current) { scene.remove(current.s.root); dispose(current.s.root); }
    const s = SCENES[name]({ dot }, variant);
    scene.add(s.root);
    current = { name, s };
    applyEnv(s.env);
    first = true;
  }
  function show(view) {
    const next = sceneFor(trip, view);
    wanted = next;
    if (!current) { build(next); setFog(1); if (still) frameOnce(); else wake(); return; }
    if (current.name === next[0]) { current.s.variant?.(next[1]); if (still) frameOnce(); return; } // same place: just a new shot
    if (still) { build(next); setFog(1); frameOnce(); return; }
    if (!cut) cut = { phase: 'out', k: 0, from: { near: fog.near, far: fog.far, color: fog.color.clone() } };
    else if (cut.phase === 'in') cut = { phase: 'out', k: 0, from: { near: fog.near, far: fog.far, color: fog.color.clone() } };
    wake();
  }
  const DENSE = { near: 0.1, far: 6 };
  // k = 1: the scene's own fog; k = 0: dense fog the colour of the sky
  function setFog(k) {
    fog.near = DENSE.near + (env.near - DENSE.near) * k;
    fog.far = DENSE.far + (env.far - DENSE.far) * k;
    fog.color.set(env.fog);
  }
  function stepCut(dt) {
    if (!cut) return;
    if (cut.phase === 'out') {
      cut.k = Math.min(cut.k + dt / CUT_OUT, 1);
      const e = cut.k * cut.k;
      fog.near = cut.from.near + (DENSE.near - cut.from.near) * e;
      fog.far = cut.from.far + (DENSE.far - cut.from.far) * e;
      if (cut.k >= 1) { build(wanted); cut = { phase: 'in', k: 0 }; setFog(0); }
    } else {
      cut.k = Math.min(cut.k + dt / CUT_IN, 1);
      setFog(1 - (1 - cut.k) ** 3);
      if (cut.k >= 1) cut = null;
    }
  }

  const resize = () => {
    const w = canvas.clientWidth || host.clientWidth, h = canvas.clientHeight || host.clientHeight;
    if (!w || !h) return;
    narrow = w < WIDE;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide: push the subject right of the text panel. Phone: lift it above the title scrim.
    if (w >= WIDE) camera.setViewOffset(w, h, -w * 0.14, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    camera.updateProjectionMatrix();
    if (still) frameOnce();
  };

  let frames = 0;
  function step(dt) {
    t += dt;
    stepCut(dt);
    const s = current.s;
    s.update(t, dt);
    const shot = s.shot(t, narrow);
    const k = first ? 1 : 1 - Math.exp(-dt * (shot.follow ? 3 : 1.6));
    first = false;
    camPos.lerp(shot.pos, k); camLook.lerp(shot.look, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    snow.position.copy(camPos);
    const p = snowGeo.attributes.position;
    for (let i = 0; i < SN; i++) {
      let y = p.getY(i) - dt * 2.5;
      if (y < -30) y += 60;
      p.setXY(i, p.getX(i) + Math.sin(t + i) * dt * 0.4, y);
    }
    p.needsUpdate = true;
    if (onAlt && ++frames % 6 === 0) onAlt(Math.max(0, Math.round(1200 + camPos.y * 12)));
    renderer.render(scene, camera);
  }

  // reduced motion: one still frame per screen, no loop
  function frameOnce() {
    if (!current) return;
    t = STILL_T; first = true;
    current.s.update(STILL_T, 0.016);
    step(0);
  }

  // ---------- loop: 30 fps cap, paused when hidden or scrolled off ----------
  let inView = true, lost = false, raf = 0, last = 0, prev = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    last = now;
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    step(dt);
  };
  function wake() {
    if (still) return;
    const run = !lost && inView && document.visibilityState === 'visible';
    if (run && !raf) { prev = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  canvas.addEventListener('webglcontextlost', () => { lost = true; wake(); });

  host.prepend(canvas);
  resize();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  return { show, canvas };
}
