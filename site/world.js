// The world behind the itinerary, from the owner's snowboard talk: a blue-hour alpine valley with fog,
// alpenglow and a snowboard carving S-turns down a groomed run. Each screen is a camera "shot", like a
// slide change. Decoration only: app.js loads this lazily; the CSS dusk gradient is the full fallback.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, BufferGeometry, BufferAttribute, Color, Fog,
  HemisphereLight, DirectionalLight, Mesh, MeshStandardMaterial, Shape, ExtrudeGeometry, BoxGeometry, Group,
  Line, LineBasicMaterial, Points, PointsMaterial, CanvasTexture, Vector3, ColorManagement, LinearSRGBColorSpace,
} from './vendor/three.module.min.js';

// The talk ran on three r128: no colour management, lights not scaled by PI. Match it.
ColorManagement.enabled = false;
const PI = Math.PI;

const NIGHT = 0x16233b;
const FRAME_MS = 1000 / 30;
const WIDE = 900; // px: desktop layout, text panel on the left

// ---------- terrain: groomed run down the middle (downhill = +z), peaks on the sides ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { let s = 0, a = 1, f = 1; for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2; } return s / 1.94; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function H(x, z) {
  const run = fbm(x * 0.04 + 10, z * 0.04) * 3;
  const peaks = Math.pow(fbm(x * 0.015, z * 0.015), 1.6) * 90 + Math.abs(x) * 0.25;
  return -z * 0.3 + run + (peaks - run) * smooth(12, 45, Math.abs(x));
}

function makeBoard(scene) {
  const L = 0.775, e = L - 0.12, waist = 0.125, tipW = 0.15, s = new Shape();
  const w = (x) => waist + (tipW - waist) * (x / e) ** 2;
  s.moveTo(-e, -w(-e));
  for (let x = -e; x <= e; x += 0.05) s.lineTo(x, -w(x));
  s.lineTo(e, -w(e));
  s.quadraticCurveTo(L + 0.03, -tipW * 0.9, L + 0.03, 0);
  s.quadraticCurveTo(L + 0.03, tipW * 0.9, e, w(e));
  for (let x = e; x >= -e; x -= 0.05) s.lineTo(x, w(x));
  s.lineTo(-e, w(-e));
  s.quadraticCurveTo(-L - 0.03, tipW * 0.9, -L - 0.03, 0);
  s.quadraticCurveTo(-L - 0.03, -tipW * 0.9, -e, -w(-e));
  const g = new ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1, curveSegments: 10 });
  g.rotateX(-PI / 2); g.rotateY(PI / 2); // length along +z, flat on y
  const top = new MeshStandardMaterial({ color: 0xff6a2b, roughness: 0.4, metalness: 0.1 });
  const edge = new MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.3, metalness: 0.6 });
  const board = new Mesh(g, [top, edge]);
  const dark = new MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.6 });
  for (const [z, a] of [[0.24, 0.26], [-0.24, -0.1]]) {
    const b = new Group();
    const base = new Mesh(new BoxGeometry(0.24, 0.03, 0.12), dark); base.position.y = 0.035;
    const high = new Mesh(new BoxGeometry(0.22, 0.16, 0.02), dark); high.position.set(0, 0.11, -0.06);
    b.add(base, high); b.position.z = z; b.rotation.y = PI / 2 + a; board.add(b);
  }
  const roll = new Group(); roll.add(board);
  const root = new Group(); root.rotation.order = 'YXZ'; root.add(roll);
  root.userData.roll = roll;
  scene.add(root);
  return root;
}

// ---------- shots ----------
const V = (x, y, z) => new Vector3(x, y, z);
const SHOT = {
  title: { mode: 'follow', off: V(-6, 2.5, 7) },
  behind: { mode: 'follow', off: V(0, 3.5, -9) },
  low: { mode: 'follow', off: V(3, 1, 2.5) },
  high: { mode: 'follow', off: V(5, 6, -6) },
  aerial: { mode: 'fixed', pos: V(0, 140, -90), look: V(0, 0, 40) },
  vistaA: { mode: 'fixed', pos: V(90, 55, 110), look: V(0, 0, 0) },
  vistaB: { mode: 'fixed', pos: V(-100, 70, 150), look: V(0, 10, 0) },
};
const SKI = ['behind', 'low', 'high'];
const CITY = ['vistaA', 'vistaB'];

// Beijing days: a fixed dusk vista; Chongli ski days: follow the rider; travel days (A -> B): aerial.
export function shotFor(trip, view) {
  if (view.day === null || view.day === undefined) return view.end ? 'vistaB' : 'title';
  const label = trip.days[view.day]?.label || '';
  if (/->/.test(label)) return 'aerial';
  if (/chongli/i.test(label)) return SKI[view.day % SKI.length];
  return CITY[view.day % CITY.length];
}

export function startWorld(host, trip, onAlt) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  scene.background = new Color(NIGHT);
  scene.fog = new Fog(NIGHT, 50, 230);
  const camera = new PerspectiveCamera(55, 1, 0.1, 600);
  scene.add(new HemisphereLight(0x9fbfff, 0x2a3550, 0.55 * PI));
  const sun = new DirectionalLight(0xffb38a, 0.85 * PI); // alpenglow
  sun.position.set(-80, 60, -40);
  scene.add(sun);

  const SIZE = 560, SEG = 220;
  const tg = new PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  const cols = new Float32Array(tp.count * 3), tn = tg.attributes.normal;
  const snowC = new Color(0xd9e2f2), rockC = new Color(0x4a5368), c = new Color();
  for (let i = 0; i < tp.count; i++) {
    c.copy(rockC).lerp(snowC, smooth(0.62, 0.8, tn.getY(i)));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new BufferAttribute(cols, 3));
  scene.add(new Mesh(tg, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 })));

  // rider: S-curves down the groomed run, with a fading trail
  const A = 8, W = 0.08, Z0 = -120, Z1 = 120;
  const pathX = (z) => A * Math.sin(W * z);
  const rider = makeBoard(scene);
  rider.scale.setScalar(1.6);
  const TRAIL = 240;
  const trailGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trail = new Line(trailGeo, new LineBasicMaterial({ color: 0x4f6a98 }));
  trail.frustumCulled = false;
  scene.add(trail);
  let rz = Z0 + Math.random() * 120;

  // snowfall that follows the camera; fewer flakes on phones
  const SN = innerWidth >= WIDE ? 3500 : 2000;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN * 3; i++) sp[i] = (Math.random() - 0.5) * 60;
  const flake = document.createElement('canvas');
  flake.width = flake.height = 32;
  const fx = flake.getContext('2d'), gr = fx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  fx.fillStyle = gr; fx.fillRect(0, 0, 32, 32);
  const snowGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(sp, 3));
  const snow = new Points(snowGeo, new PointsMaterial({ size: 0.25, map: new CanvasTexture(flake), transparent: true, depthWrite: false, opacity: 0.85 }));
  snow.frustumCulled = false;
  scene.add(snow);

  // ---------- camera ----------
  let shot = SHOT.title;
  let first = true;
  const camPos = V(-60, 80, -60), camLook = V(0, 0, 0), tPos = V(), tLook = V();
  function show(view) { shot = SHOT[shotFor(trip, view)]; }

  let narrow = innerWidth < WIDE;
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
  };

  let t = 0, last = 0, prev = 0, frames = 0;
  function step(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    t += dt;
    rz += dt * 14; if (rz > Z1) rz = Z0;
    const x = pathX(rz), dx = A * W * Math.cos(W * rz), xpp = -A * W * W * Math.sin(W * rz);
    rider.position.set(x, H(x, rz) + 0.12, rz);
    rider.rotation.set(Math.atan(0.3), Math.atan2(dx, 1), 0);
    rider.userData.roll.rotation.z = -12 * xpp;
    const ta = trailGeo.attributes.position;
    for (let i = 0; i < TRAIL; i++) {
      const z = Math.max(Z0, rz - i * 0.2), xx = pathX(z);
      ta.setXYZ(i, xx, H(xx, z) + 0.06, z);
    }
    ta.needsUpdate = true;

    // phones: pull follow shots back so the board is not a close-up behind the title
    if (shot.mode === 'follow') { tLook.copy(rider.position).add(V(0, 0.5, 2)); tPos.copy(rider.position).addScaledVector(shot.off, narrow ? 1.6 : 1); }
    else { tLook.copy(shot.look); tPos.copy(shot.pos).add(V(Math.sin(t * 0.1) * 8, 0, 0)); }
    const k = first ? 1 : 1 - Math.exp(-dt * (shot.mode === 'follow' ? 3 : 1.6));
    first = false;
    camPos.lerp(tPos, k); camLook.lerp(tLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);

    snow.position.copy(camPos);
    const p = snowGeo.attributes.position;
    for (let i = 0; i < SN; i++) {
      let y = p.getY(i) - dt * 2.5;
      if (y < -30) y += 60;
      p.setXY(i, p.getX(i) + Math.sin(t + i) * dt * 0.4, y);
    }
    p.needsUpdate = true;
    if (onAlt && ++frames % 6 === 0) onAlt(Math.round(1200 + camPos.y * 12));
    renderer.render(scene, camera);
  }

  // ---------- loop: 30 fps cap, paused when hidden or scrolled off ----------
  let inView = true, lost = false, raf = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    last = now;
    step(now);
  };
  function wake() {
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
  wake();
  return { show, canvas };
}
