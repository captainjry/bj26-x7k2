// One procedural scene per trip day, all in the talk's blue-hour look. world.js keeps one alive at a time.
// A scene builder returns { root, env, update(t, dt), shot(t, narrow) -> { pos, look, follow? }, variant? }.
// Geometry only from three.js primitives: no models, textures or network.
import {
  Group, Mesh, InstancedMesh, Object3D, Points, Line, BufferGeometry, BufferAttribute, Float32BufferAttribute,
  PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, IcosahedronGeometry, DodecahedronGeometry,
  CircleGeometry, ExtrudeGeometry, Shape, Path, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  PointsMaterial, Color, Vector3, Quaternion, Matrix4, AdditiveBlending, InstancedBufferAttribute,
} from './vendor/three.module.min.js';

const PI = Math.PI;
const V = (x, y, z) => new Vector3(x, y, z);
const std = (color, o = {}) => new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...o });
const lit = (color, o = {}) => new MeshBasicMaterial({ color, ...o });
const glowPoints = (dot, color, size, o = {}) => new PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending: AdditiveBlending, ...o });
const rand = (a, b) => a + Math.random() * (b - a);
const dummy = new Object3D();

// ---------- noise + terrain (from the talk) ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { let s = 0, a = 1, f = 1; for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2; } return s / 1.94; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// groomed run down the middle (downhill = +z), peaks on the sides
export function valleyH(x, z) {
  const run = fbm(x * 0.04 + 10, z * 0.04) * 3;
  const peaks = Math.pow(fbm(x * 0.015, z * 0.015), 1.6) * 90 + Math.abs(x) * 0.25;
  return -z * 0.3 + run + (peaks - run) * smooth(12, 45, Math.abs(x));
}

// Flat-shaded terrain, snow on gentle slopes and rock on steep ones.
function terrain(H, size = 560, seg = 200, snow = 0xd9e2f2, rock = 0x4a5368) {
  const g = new PlaneGeometry(size, size, seg, seg);
  g.rotateX(-PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, cols = new Float32Array(p.count * 3), s = new Color(snow), r = new Color(rock), c = new Color();
  for (let i = 0; i < p.count; i++) { c.copy(r).lerp(s, smooth(0.62, 0.8, n.getY(i))); cols.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new BufferAttribute(cols, 3));
  return new Mesh(g, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
}

// Instanced mesh from a list of { p: [x,y,z], s?: [sx,sy,sz], r?: [rx,ry,rz], c?: hex }.
function instances(geo, mat, list) {
  const m = new InstancedMesh(geo, mat, list.length);
  list.forEach((it, i) => {
    dummy.position.set(...it.p);
    dummy.rotation.set(...(it.r || [0, 0, 0]));
    dummy.scale.set(...(it.s || [1, 1, 1]));
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
    if (it.c !== undefined) m.setColorAt(i, new Color(it.c));
  });
  return m;
}

// Triangular prism lying along z with a vertex up: a gable roof. Base at y = 0, ridge at y = 1, width 1.
function gableGeo() {
  const g = new CylinderGeometry(1, 1, 1, 3);
  g.rotateX(-PI / 2); // axis along z, one vertex at +y
  g.translate(0, 0.5, 0); // apex 1.5, eaves 0
  g.scale(0.58, 0.667, 1);
  return g; // width 1, ridge at y 1, eaves at y 0
}

const BASE_ENV = { fog: 0x16233b, near: 50, far: 230, sky: 0x9fbfff, ground: 0x2a3550, hemi: 0.55, sun: 0xffb38a, sunI: 0.85, sunPos: [-80, 60, -40] };

// ---------- valley: the talk's carving snowboarder (countdown, 10 Dec, the end) ----------
function makeBoard() {
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
  g.rotateX(-PI / 2); g.rotateY(PI / 2);
  const board = new Mesh(g, [std(0xff6a2b, { roughness: 0.4, metalness: 0.1, flatShading: false }), std(0x1a1f2b, { roughness: 0.3, metalness: 0.6 })]);
  const dark = std(0x1a1f2b, { roughness: 0.6 });
  for (const [z, a] of [[0.24, 0.26], [-0.24, -0.1]]) {
    const b = new Group();
    const base = new Mesh(new BoxGeometry(0.24, 0.03, 0.12), dark); base.position.y = 0.035;
    const high = new Mesh(new BoxGeometry(0.22, 0.16, 0.02), dark); high.position.set(0, 0.11, -0.06);
    b.add(base, high); b.position.z = z; b.rotation.y = PI / 2 + a; board.add(b);
  }
  const roll = new Group(); roll.add(board);
  const root = new Group(); root.rotation.order = 'YXZ'; root.add(roll);
  root.userData.roll = roll;
  return root;
}

const VALLEY_SHOTS = {
  title: { follow: V(-6, 2.5, 7) },
  ski: { follow: V(2.5, 2.6, -7) },
  vista: { pos: V(-100, 70, 150), look: V(0, 10, 0) },
};

function valley(ctx, variant = 'title') {
  const root = new Group();
  root.add(terrain(valleyH, 560, 220));
  const A = 8, W = 0.08, Z0 = -120, Z1 = 120;
  const pathX = (z) => A * Math.sin(W * z);
  const rider = makeBoard();
  rider.scale.setScalar(1.6);
  root.add(rider);
  const TRAIL = 240;
  const trailGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trail = new Line(trailGeo, new LineBasicMaterial({ color: 0x4f6a98 }));
  trail.frustumCulled = false;
  root.add(trail);
  let rz = Z0 + 60;
  let shot = VALLEY_SHOTS[variant];
  return {
    root, env: BASE_ENV,
    variant(v) { shot = VALLEY_SHOTS[v] || shot; },
    update(t, dt) {
      rz += dt * 14; if (rz > Z1) rz = Z0;
      const x = pathX(rz), dx = A * W * Math.cos(W * rz), xpp = -A * W * W * Math.sin(W * rz);
      rider.position.set(x, valleyH(x, rz) + 0.12, rz);
      rider.rotation.set(Math.atan(0.3), Math.atan2(dx, 1), 0);
      rider.userData.roll.rotation.z = -12 * xpp;
      const ta = trailGeo.attributes.position;
      for (let i = 0; i < TRAIL; i++) { const z = Math.max(Z0, rz - i * 0.2), xx = pathX(z); ta.setXYZ(i, xx, valleyH(xx, z) + 0.06, z); }
      ta.needsUpdate = true;
    },
    shot(t, narrow) {
      if (shot.follow) {
        return { pos: rider.position.clone().addScaledVector(shot.follow, narrow ? (shot === VALLEY_SHOTS.title ? 1.6 : 1.25) : 1), look: rider.position.clone().add(V(0, 0.5, 2)), follow: true };
      }
      return { pos: shot.pos.clone().add(V(Math.sin(t * 0.1) * 8, 0, 0)), look: shot.look };
    },
  };
}

// ---------- 7 Dec: hutong alley at night, red lanterns, glowing gate ----------
function hutong(ctx) {
  const root = new Group();
  const LEN = 110, HALF = 3.2;
  const ground = new Mesh(new PlaneGeometry(40, LEN + 40), std(0x8f9bb0));
  ground.rotation.x = -PI / 2; ground.position.z = -LEN / 2;
  const lane = new Mesh(new PlaneGeometry(3.2, LEN + 40), std(0x566074));
  lane.rotation.x = -PI / 2; lane.position.set(0, 0.01, -LEN / 2);
  root.add(ground, lane);

  const walls = [], roofs = [], ridges = [], doors = [];
  for (const s of [-1, 1]) {
    for (let z = 4, k = 0; z > -LEN + 6; z -= 6, k++) {
      const h = 2.4 + hash(k, s) * 0.6;
      walls.push({ p: [s * HALF, h / 2, z - 3], s: [0.5, h, 5.6] });
      roofs.push({ p: [s * (HALF + 0.5), h, z - 3], s: [2.4, 0.9, 5.9] });
      ridges.push({ p: [s * (HALF + 0.5), h + 0.62, z - 3], s: [0.42, 0.12, 5.9] });
      if (k % 2 === 0) doors.push({ p: [s * (HALF - 0.27), 0.95, z - 3 + hash(s, k) * 2 - 1], s: [0.06, 1.9, 1.15] });
    }
  }
  root.add(instances(new BoxGeometry(1, 1, 1), std(0x5d6577), walls));
  root.add(instances(gableGeo(), std(0x343b4b), roofs));
  root.add(instances(new BoxGeometry(1, 1, 1), std(0xe8eef8), ridges)); // snow on the ridges
  root.add(instances(new BoxGeometry(1, 1, 1), std(0x7a1a15), doors));

  // lanterns on a wire each side; swaying is done per frame on the instance matrices
  const anchors = [];
  for (const s of [-1, 1]) for (let z = 2; z > -LEN + 4; z -= 2.6) anchors.push([s * 2.7, 2.75, z]);
  const lanterns = new InstancedMesh(new SphereGeometry(0.17, 10, 8), lit(0xff3b2f), anchors.length);
  const glowGeo = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(anchors.length * 3), 3));
  const glow = new Points(glowGeo, glowPoints(ctx.dot, 0xff6a3a, 1.1, { opacity: 0.55 }));
  glow.frustumCulled = false;
  for (const s of [-1, 1]) {
    root.add(new Line(new BufferGeometry().setFromPoints([V(s * 2.7, 2.9, 4), V(s * 2.7, 2.9, -LEN)]), new LineBasicMaterial({ color: 0x1a1f2b })));
  }
  root.add(lanterns, glow);

  // the gate at the end: red body, gold band, double roof, warm glow
  const gate = new Group();
  gate.position.z = -LEN - 2;
  const body = new Mesh(new BoxGeometry(10, 4.4, 2), std(0x8a1f1a)); body.position.y = 2.2;
  const arch = new Mesh(new BoxGeometry(2.4, 3.2, 2.1), lit(0xffb347)); arch.position.y = 1.6;
  const band = new Mesh(new BoxGeometry(10.4, 0.35, 2.2), lit(0xd9a33a)); band.position.y = 4.55;
  const roof1 = new Mesh(gableGeo(), std(0x343b4b)); roof1.rotation.y = PI / 2; roof1.scale.set(4.2, 1.6, 12); roof1.position.y = 4.7;
  const roof2 = new Mesh(gableGeo(), std(0x343b4b)); roof2.rotation.y = PI / 2; roof2.scale.set(3, 1.3, 7.5); roof2.position.y = 6.2;
  const snowRidge = new Mesh(new BoxGeometry(7.6, 0.18, 0.5), std(0xe8eef8)); snowRidge.position.y = 7.5;
  gate.add(body, arch, band, roof1, roof2, snowRidge);
  const gateGlow = new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([0, 2, 1.5, -3, 4.6, 1.3, 3, 4.6, 1.3], 3)), glowPoints(ctx.dot, 0xffa860, 9, { opacity: 0.55 }));
  gate.add(gateGlow);
  root.add(gate);

  return {
    root,
    env: { ...BASE_ENV, near: 12, far: 150, hemi: 0.42, sunI: 0.4, sunPos: [20, 60, -60] },
    update(t) {
      const gp = glowGeo.attributes.position;
      anchors.forEach(([x, y, z], i) => {
        const a = Math.sin(t * 1.3 + i * 0.7) * 0.12;
        const px = x + Math.sin(a) * 0.35, py = y - Math.cos(a) * 0.35;
        dummy.position.set(px, py, z); dummy.rotation.set(0, 0, a); dummy.scale.set(1, 1.25, 1); dummy.updateMatrix();
        lanterns.setMatrixAt(i, dummy.matrix);
        gp.setXYZ(i, px, py, z);
      });
      lanterns.instanceMatrix.needsUpdate = true;
      gp.needsUpdate = true;
    },
    shot(t) {
      const z = -40 - 28 * Math.sin(t * 0.035);
      return { pos: V(0, 1.9, z), look: V(0, 2.6, z - 14) };
    },
  };
}

// ---------- 8 Dec: fireworks over a dark lake, reflected ----------
function fireworks(ctx) {
  const root = new Group();
  const lake = new Mesh(new PlaneGeometry(500, 400), std(0x0c1629, { roughness: 0.3, metalness: 0.4, flatShading: false }));
  lake.rotation.x = -PI / 2;
  root.add(lake);
  // far shore: low hills, trees, a few lit buildings (nothing branded)
  const hills = [], trees = [], blocks = [];
  for (let i = 0; i < 18; i++) hills.push({ p: [-180 + i * 22 + rand(-6, 6), 0, -150 + rand(-10, 10)], s: [rand(24, 40), rand(8, 22), 16] });
  for (let i = 0; i < 90; i++) trees.push({ p: [rand(-150, 150), 0, rand(-128, -112)], s: [1, rand(3, 6), 1] });
  for (let i = 0; i < 14; i++) blocks.push({ p: [rand(-90, 90), 0, rand(-124, -116)], s: [rand(4, 10), rand(3, 9), rand(3, 6)] });
  const hillGeo = new ConeGeometry(1, 1, 7); hillGeo.translate(0, 0.5, 0);
  root.add(instances(hillGeo, std(0x1d2a44), hills));
  const treeGeo = new ConeGeometry(1, 1, 6); treeGeo.translate(0, 0.5, 0);
  root.add(instances(treeGeo, std(0x15203a), trees));
  const blockGeo = new BoxGeometry(1, 1, 1); blockGeo.translate(0, 0.5, 0);
  root.add(instances(blockGeo, std(0x222f4c), blocks));
  const windows = [];
  blocks.forEach(({ p, s }) => { for (let k = 0; k < 6; k++) windows.push(p[0] + rand(-s[0] / 2, s[0] / 2), rand(1, s[1] - 0.5), p[2] + s[2] / 2 + 0.1); });
  root.add(new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(windows, 3)), glowPoints(ctx.dot, 0xffc070, 0.9, { opacity: 0.8 })));

  // bursts: one Points cloud, CPU-updated; its mirror under the waterline is the reflection
  const BURSTS = 9, PER = 150, N = BURSTS * PER, LIFE = 2.8;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const bursts = Array.from({ length: BURSTS }, (_, b) => ({ start: -b * 0.9, c: V(), color: new Color() }));
  const PALETTE = [0xffd27a, 0xff6a2b, 0x7fb2ff, 0xff4f6d, 0xeef3fa, 0xffb347];
  function relaunch(b) {
    b.c.set(rand(-45, 45), rand(24, 44), rand(-75, -60));
    b.color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    for (let i = 0; i < PER; i++) {
      const k = b.index * PER + i;
      const u = rand(-1, 1), a = rand(0, 2 * PI), r = Math.sqrt(1 - u * u), sp = rand(10, 14);
      vel.set([Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp], k * 3);
    }
  }
  bursts.forEach((b, i) => { b.index = i; relaunch(b); b.start = rand(0, LIFE); });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  const mat = new PointsMaterial({ size: 2.2, map: ctx.dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false });
  const sky = new Points(geo, mat);
  const mirror = new Points(geo, new PointsMaterial({ size: 2.6, map: ctx.dot, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending, fog: false }));
  mirror.scale.y = -1;
  sky.frustumCulled = mirror.frustumCulled = false;
  root.add(sky, mirror);

  return {
    root,
    env: { ...BASE_ENV, fog: 0x101a30, near: 60, far: 320, hemi: 0.35, sunI: 0.25 },
    update(t, dt) {
      bursts.forEach((b) => {
        b.start += dt;
        if (b.start > LIFE) { b.start = -rand(0.2, 1.6); relaunch(b); }
        const age = Math.max(b.start, 0), on = b.start > 0;
        const fade = on ? Math.pow(1 - age / LIFE, 1.6) : 0;
        for (let i = 0; i < PER; i++) {
          const k = b.index * PER + i;
          const drag = 1 - age * 0.18;
          pos[k * 3] = b.c.x + vel[k * 3] * age * drag;
          pos[k * 3 + 1] = b.c.y + vel[k * 3 + 1] * age * drag - 3.2 * age * age;
          pos[k * 3 + 2] = b.c.z + vel[k * 3 + 2] * age * drag;
          col[k * 3] = b.color.r * fade; col[k * 3 + 1] = b.color.g * fade; col[k * 3 + 2] = b.color.b * fade;
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
    shot(t) { return { pos: V(Math.sin(t * 0.05) * 8, 4, 30), look: V(0, 18, -70) }; },
  };
}

// ---------- 9 Dec: white bullet train through snowy hills; the world slides past it ----------
function train(ctx) {
  const root = new Group();
  const ground = new Mesh(new PlaneGeometry(800, 800), std(0xd9e2f2));
  ground.rotation.x = -PI / 2;
  const bank = new Mesh(new BoxGeometry(800, 0.5, 5), std(0x6b7488)); bank.position.y = 0.25;
  root.add(ground, bank);
  for (const z of [-0.72, 0.72]) { const rail = new Mesh(new BoxGeometry(800, 0.08, 0.1), std(0x2a3040, { metalness: 0.6, roughness: 0.4 })); rail.position.set(0, 0.54, z); root.add(rail); }

  // the train stands still at the origin, pointing +x
  const CARS = 7, CAR = 5;
  const bodyList = [], windowList = [], stripeList = [];
  for (let i = 0; i < CARS; i++) {
    const x = -i * (CAR + 0.2);
    bodyList.push({ p: [x, 1.45, 0], s: [CAR, 1.7, 1.55] });
    windowList.push({ p: [x, 1.8, 0], s: [CAR - 0.5, 0.36, 1.58] });
    stripeList.push({ p: [x, 1.08, 0], s: [CAR, 0.14, 1.58] });
  }
  const box = new BoxGeometry(1, 1, 1);
  root.add(instances(box, std(0xeef3fa, { roughness: 0.5 }), bodyList));
  root.add(instances(box, std(0x1a2233, { roughness: 0.3 }), windowList));
  root.add(instances(box, lit(0xff6a2b), stripeList));
  const nose = new Mesh(new SphereGeometry(1, 20, 14), std(0xeef3fa, { roughness: 0.5 }));
  nose.scale.set(3.2, 0.85, 0.775); nose.position.set(CAR / 2, 1.42, 0);
  const cab = new Mesh(new SphereGeometry(1, 16, 10), std(0x1a2233, { roughness: 0.3 }));
  cab.scale.set(1.4, 0.4, 0.62); cab.position.set(CAR / 2 + 0.9, 1.85, 0);
  const tailNose = nose.clone(); tailNose.position.x = -(CARS - 1) * (CAR + 0.2) - CAR / 2; tailNose.scale.x = -3.2;
  root.add(nose, cab, tailNose);
  const lamps = new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([CAR / 2 + 3, 1.2, 0.45, CAR / 2 + 3, 1.2, -0.45], 3)), glowPoints(ctx.dot, 0xfff1c9, 2.2));
  root.add(lamps);

  // scenery bands; all move at train speed, perspective gives the parallax
  const SPEED = 45;
  const bands = [];
  function band(geo, mat, n, zMin, zMax, span, scale) {
    const list = Array.from({ length: n }, () => ({ x: rand(-span, span), z: rand(zMin, zMax), s: scale() }));
    const mesh = new InstancedMesh(geo, mat, n);
    bands.push({ mesh, list, span });
    root.add(mesh);
  }
  const cone = new ConeGeometry(1, 1, 7); cone.translate(0, 0.5, 0);
  const tree = new ConeGeometry(1, 1, 6); tree.translate(0, 0.5, 0);
  const mast = new BoxGeometry(0.25, 1, 0.25); mast.translate(0, 0.5, 0);
  band(mast, std(0x3a4356), 14, -3.2, -3.2, 84, () => [1, 6.5, 1]);
  band(tree, std(0x26364a), 140, -12, -70, 160, () => { const h = rand(4, 9); return [h * 0.32, h, h * 0.32]; });
  band(cone, std(0xc9d4e8), 26, -90, -170, 260, () => { const h = rand(10, 26); return [h * 2.2, h, h * 1.4]; });
  band(cone, std(0x8f9db6), 12, -230, -300, 420, () => { const h = rand(45, 80); return [h * 1.5, h, h]; });
  let shift = 0;
  return {
    root,
    env: { ...BASE_ENV, near: 40, far: 320, hemi: 0.6 },
    update(t, dt) {
      shift += dt * SPEED;
      bands.forEach(({ mesh, list, span }) => {
        list.forEach((it, i) => {
          const x = ((((it.x - shift) + span) % (2 * span)) + 2 * span) % (2 * span) - span;
          dummy.position.set(x, 0, it.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(...it.s); dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      });
    },
    shot(t, narrow) {
      const bob = Math.sin(t * 0.7) * 0.15;
      return narrow ? { pos: V(18, 5 + bob, 20), look: V(-6, 2, 0) } : { pos: V(15, 3.8 + bob, 15), look: V(-4, 1.8, 0) };
    },
  };
}

// ---------- 11 Dec: gondolas over the valley at dusk, steam off a hot-spring pool ----------
function gondola(ctx) {
  const root = new Group();
  const POOL = V(-12, 0, 72);
  POOL.y = valleyH(POOL.x, POOL.z);
  const H = (x, z) => { const d = Math.hypot(x - POOL.x, z - POOL.z); return valleyH(x, z) * smooth(5, 9, d) + POOL.y * (1 - smooth(5, 9, d)); };
  root.add(terrain(H, 560, 200));

  // two cable lines from the valley floor up the far side, towers every ~30 units
  const A0 = V(8, 0, 40), A1 = V(30, 0, -110);
  const towers = [], tops = [];
  for (let i = 0; i <= 6; i++) {
    const p = A0.clone().lerp(A1, i / 6);
    const g = H(p.x, p.z), h = 10 + (i % 2) * 2;
    towers.push({ p: [p.x, g + h / 2, p.z], s: [0.6, h, 0.6] }, { p: [p.x, g + h, p.z], s: [4, 0.35, 0.35], r: [0, Math.atan2(A1.x - A0.x, A1.z - A0.z) + PI / 2, 0] });
    tops.push(V(p.x, g + h, p.z));
  }
  root.add(instances(new BoxGeometry(1, 1, 1), std(0x2a3550), towers));
  const side = new Vector3().subVectors(A1, A0).cross(V(0, 1, 0)).normalize().multiplyScalar(1.6);
  const cables = [tops.map((p) => p.clone().add(side)), tops.map((p) => p.clone().sub(side))];
  const cableMat = new LineBasicMaterial({ color: 0x1a1f2b });
  cables.forEach((pts) => root.add(new Line(new BufferGeometry().setFromPoints(pts), cableMat)));
  const lengths = cables.map((pts) => pts.slice(1).reduce((s, p, i) => s + p.distanceTo(pts[i]), 0));
  const along = (pts, total, u) => {
    let d = (((u % 1) + 1) % 1) * total;
    for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); if (d <= l) return pts[i - 1].clone().lerp(pts[i], d / l); d -= l; }
    return pts[pts.length - 1].clone();
  };
  const PER = 9, CABINS = PER * 2;
  const cabins = new InstancedMesh(new BoxGeometry(1.5, 1.35, 1.5), std(0xffffff, { roughness: 0.5 }), CABINS);
  const panes = new InstancedMesh(new BoxGeometry(1.56, 0.45, 1.56), lit(0xffcf8a), CABINS);
  const hangers = new InstancedMesh(new BoxGeometry(0.08, 1.2, 0.08), std(0x1a1f2b), CABINS);
  for (let i = 0; i < CABINS; i++) cabins.setColorAt(i, new Color(i % 3 === 0 ? 0xeef3fa : 0xff6a2b));
  root.add(cabins, panes, hangers);

  // the onsen: warm water, rocks, rising steam
  const water = new Mesh(new CircleGeometry(4.2, 28), lit(0x8fd3ff));
  water.rotation.x = -PI / 2; water.position.copy(POOL).add(V(0, 0.12, 0));
  const rocks = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 2 * PI; rocks.push({ p: [POOL.x + Math.cos(a) * 4.6, POOL.y + 0.2, POOL.z + Math.sin(a) * 4.6], s: [rand(0.6, 1.1), rand(0.5, 0.9), rand(0.6, 1.1)], r: [rand(0, 3), rand(0, 3), 0] }); }
  root.add(water, instances(new DodecahedronGeometry(1, 0), std(0x4a5368), rocks));
  const STEAM = 180;
  const sp = new Float32Array(STEAM * 3), sAge = new Float32Array(STEAM);
  const seed = (i) => { const a = rand(0, 2 * PI), r = rand(0, 3.6); sp.set([POOL.x + Math.cos(a) * r, POOL.y + 0.3, POOL.z + Math.sin(a) * r], i * 3); };
  for (let i = 0; i < STEAM; i++) { seed(i); sAge[i] = rand(0, 4); sp[i * 3 + 1] += sAge[i] * 1.2; }
  const steamGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(sp, 3));
  const steam = new Points(steamGeo, new PointsMaterial({ color: 0xeef3fa, size: 1.7, map: ctx.dot, transparent: true, opacity: 0.22, depthWrite: false }));
  steam.frustumCulled = false;
  root.add(steam);

  return {
    root,
    env: { ...BASE_ENV, sun: 0xff8a4a, sunI: 1.0, sunPos: [-90, 22, -70], hemi: 0.5 },
    update(t, dt) {
      for (let c = 0; c < 2; c++) {
        for (let k = 0; k < PER; k++) {
          const i = c * PER + k;
          const u = k / PER + (c ? -1 : 1) * t * 0.012;
          const p = along(cables[c], lengths[c], u);
          dummy.rotation.set(0, Math.atan2(A1.x - A0.x, A1.z - A0.z), 0); dummy.scale.set(1, 1, 1);
          dummy.position.set(p.x, p.y - 1.9, p.z); dummy.updateMatrix(); cabins.setMatrixAt(i, dummy.matrix);
          dummy.position.set(p.x, p.y - 1.65, p.z); dummy.updateMatrix(); panes.setMatrixAt(i, dummy.matrix);
          dummy.position.set(p.x, p.y - 0.6, p.z); dummy.updateMatrix(); hangers.setMatrixAt(i, dummy.matrix);
        }
      }
      cabins.instanceMatrix.needsUpdate = panes.instanceMatrix.needsUpdate = hangers.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < STEAM; i++) {
        sAge[i] += dt;
        if (sAge[i] > 4) { sAge[i] = 0; seed(i); }
        sp[i * 3 + 1] += dt * 1.2;
        sp[i * 3] += Math.sin(t * 0.6 + i) * dt * 0.3;
      }
      steamGeo.attributes.position.needsUpdate = true;
    },
    shot(t, narrow) {
      const back = narrow ? 1.35 : 1;
      return { pos: POOL.clone().add(V(-6 * back + Math.sin(t * 0.08) * 2, 6 * back, 13 * back)), look: V(14, POOL.y + 14, 0) };
    },
  };
}

// ---------- 12 Dec: the Great Wall snaking over snowy ridges ----------
function wall(ctx) {
  const root = new Group();
  const ridgeX = (z) => 18 * Math.sin(z * 0.025) + 6 * Math.sin(z * 0.07);
  const H = (x, z) => {
    const dx = x - ridgeX(z);
    return 26 * Math.exp(-((dx / 24) ** 2)) + Math.pow(fbm(x * 0.02 + 4, z * 0.02), 1.5) * 40 + Math.abs(dx) * 0.05 - 8;
  };
  root.add(terrain(H, 520, 210));
  const crest = (z) => { const x = ridgeX(z); return V(x, H(x, z), z); };
  const merlons = [], towers = [], towerRoofs = [];
  const SEG = 0.9;
  const q = new Quaternion(), m = new Matrix4(), up = V(0, 1, 0);
  const bodyMesh = [], topMesh = [];
  for (let z = 200, k = 0; z > -200; z -= SEG, k++) {
    const a = crest(z), b = crest(z - SEG), mid = a.clone().lerp(b, 0.5);
    const dir = b.clone().sub(a).normalize();
    m.lookAt(a, b, up); q.setFromRotationMatrix(m);
    bodyMesh.push({ mid, q, len: a.distanceTo(b) + 0.05 });
    const yaw = Math.atan2(dir.x, dir.z);
    if (k % 2 === 0) for (const s of [-1, 1]) merlons.push({ p: [mid.x + Math.cos(yaw) * s * 0.62, mid.y + 1.65, mid.z - Math.sin(yaw) * s * 0.62], s: [0.22, 0.5, 0.4], r: [0, yaw, 0] });
    if (k % 50 === 25) { towers.push({ p: [mid.x, mid.y + 1.8, mid.z], s: [3.6, 4.2, 3.6], r: [0, yaw, 0] }); towerRoofs.push({ p: [mid.x, mid.y + 4.05, mid.z], s: [4, 0.35, 4], r: [0, yaw, 0] }); }
  }
  const wallBody = new InstancedMesh(new BoxGeometry(1.2, 2.6, 1), std(0xb3a58c), bodyMesh.length);
  const walkway = new InstancedMesh(new BoxGeometry(1.26, 0.12, 1), std(0xe8eef8), bodyMesh.length);
  bodyMesh.forEach(({ mid, q: qq, len }, i) => {
    m.compose(mid.clone().add(V(0, 0.2, 0)), qq, V(1, 1, len)); wallBody.setMatrixAt(i, m);
    m.compose(mid.clone().add(V(0, 1.56, 0)), qq, V(1, 1, len)); walkway.setMatrixAt(i, m);
  });
  root.add(wallBody, walkway);
  root.add(instances(new BoxGeometry(1, 1, 1), std(0xb3a58c), merlons));
  root.add(instances(new BoxGeometry(1, 1, 1), std(0xa8987d), towers));
  root.add(instances(new BoxGeometry(1, 1, 1), std(0xe8eef8), towerRoofs));
  const trees = [];
  for (let i = 0; i < 360; i++) {
    const z = rand(-180, 180), x = ridgeX(z) + (Math.random() < 0.5 ? -1 : 1) * rand(8, 70), h = rand(2.5, 5);
    trees.push({ p: [x, H(x, z) - 0.3, z], s: [h * 0.35, h, h * 0.35] });
  }
  const tg = new ConeGeometry(1, 1, 6); tg.translate(0, 0.5, 0);
  root.add(instances(tg, std(0x26364a), trees));
  return {
    root,
    env: { ...BASE_ENV, near: 40, far: 260 },
    update() {},
    shot(t, narrow) {
      const zc = 20 - 120 * Math.sin(t * 0.02);
      const c = crest(zc), ahead = crest(zc - 30);
      const back = narrow ? 1.3 : 1;
      return { pos: V(c.x + 20 * back, c.y + 11 * back, c.z + 14 * back), look: V(ahead.x, ahead.y + 1, ahead.z) };
    },
  };
}

// ---------- 13 Dec: golden palace roofs in snow, then a frozen lake at sunset with the long bridge ----------
function hipRoof(w, d, h, color) {
  const g = new CylinderGeometry(0.42, 1, 1, 4, 1);
  g.rotateY(PI / 4);
  g.scale(w / 1.414, h, d / 1.414);
  g.translate(0, h / 2, 0);
  return new Mesh(g, std(color, { metalness: 0.25, roughness: 0.6 }));
}
function hall(x, z, w, d, double) {
  const g = new Group();
  g.position.set(x, 0, z);
  const terrace = new Mesh(new BoxGeometry(w * 1.25, 1.2, d * 1.4), std(0xe8ecf3)); terrace.position.y = 0.6;
  const body = new Mesh(new BoxGeometry(w * 0.86, 3.4, d * 0.8), std(0x8f2a1f)); body.position.y = 2.9;
  const roof = hipRoof(w * 1.05, d * 1.1, 2.4, 0xd9a33a); roof.position.y = 4.6;
  const snow = hipRoof(w * 0.66, d * 0.7, 1.2, 0xeef3fa); snow.position.y = 5.85;
  g.add(terrace, body, roof, snow);
  if (double) {
    const r2 = hipRoof(w * 0.8, d * 0.85, 2, 0xd9a33a); r2.position.y = 6.6;
    const s2 = hipRoof(w * 0.5, d * 0.55, 1, 0xeef3fa); s2.position.y = 7.65;
    g.add(r2, s2);
  }
  return g;
}
function palace(ctx) {
  const root = new Group();
  const ground = new Mesh(new PlaneGeometry(700, 700), std(0xd9e2f2)); ground.rotation.x = -PI / 2;
  root.add(ground);
  const halls = new Group();
  halls.add(hall(-40, -20, 16, 9, true), hall(-40, 8, 11, 7, false), hall(-40, 30, 13, 8, true), hall(-62, 5, 9, 6, false), hall(-18, 5, 9, 6, false));
  halls.scale.setScalar(1.7); halls.position.set(28, 0, -6);
  root.add(halls);
  const redWall = std(0x8f2a1f);
  for (const [x, z, w, d] of [[-40, -38, 54, 1.2], [-40, 46, 54, 1.2], [-68, 4, 1.2, 84], [-12, 4, 1.2, 84]]) {
    const b = new Mesh(new BoxGeometry(w, 2.2, d), redWall); b.position.set(x, 1.1, z);
    const cap = new Mesh(new BoxGeometry(w + 0.6, 0.35, d + 0.6), std(0xd9a33a)); cap.position.set(x, 2.35, z);
    halls.add(b, cap);
  }
  // the lake: ice, the long arched bridge, skaters
  const ice = new Mesh(new PlaneGeometry(220, 200), std(0xc9d8ea, { roughness: 0.35, flatShading: false }));
  ice.rotation.x = -PI / 2; ice.position.set(90, 0.05, -60);
  root.add(ice);
  const ARCHES = 17, LEN = 70, Hh = 4.2, span = LEN / (ARCHES + 1);
  const shape = new Shape();
  shape.moveTo(-LEN / 2, 0); shape.lineTo(LEN / 2, 0); shape.lineTo(LEN / 2, Hh); shape.lineTo(-LEN / 2, Hh); shape.lineTo(-LEN / 2, 0);
  for (let i = 0; i < ARCHES; i++) {
    const cx = -LEN / 2 + span * (i + 1), r = span * 0.32 * (1 - Math.abs(i - 8) * 0.03), hole = new Path();
    hole.moveTo(cx + r, 0); hole.lineTo(cx + r, Hh * 0.35); hole.absarc(cx, Hh * 0.35, r, 0, PI, false); hole.lineTo(cx - r, 0); hole.lineTo(cx + r, 0);
    shape.holes.push(hole);
  }
  const bridgeGeo = new ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
  bridgeGeo.translate(0, 0, -1.5);
  const bridge = new Mesh(bridgeGeo, std(0xe8ecf3));
  bridge.position.set(70, 0, -70); bridge.rotation.y = -0.35;
  root.add(bridge);
  const SK = 16;
  const skaters = new InstancedMesh(new CylinderGeometry(0.16, 0.24, 1.2, 6), std(0x1a2233), SK);
  const hats = new InstancedMesh(new SphereGeometry(0.2, 8, 6), std(0xffffff), SK);
  const PAL = [0xff6a2b, 0x7fb2ff, 0xff4f6d, 0xffd27a];
  const paths = Array.from({ length: SK }, (_, i) => ({ cx: rand(40, 110), cz: rand(-45, -10), rx: rand(5, 16), rz: rand(3, 9), w: rand(0.2, 0.45) * (i % 2 ? 1 : -1), ph: rand(0, 2 * PI) }));
  paths.forEach((_, i) => hats.setColorAt(i, new Color(PAL[i % PAL.length])));
  root.add(skaters, hats);
  const sun = new Mesh(new CircleGeometry(14, 32), lit(0xffb060, { fog: false }));
  sun.position.set(220, 14, -300); sun.lookAt(0, 10, 60);
  const sunGlow = new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([220, 14, -298], 3)), glowPoints(ctx.dot, 0xff8a4a, 120, { opacity: 0.5, fog: false }));
  root.add(sun, sunGlow);
  return {
    root,
    env: { ...BASE_ENV, fog: 0x1d2a47, near: 60, far: 340, sun: 0xff8a4a, sunI: 1.05, sunPos: [160, 28, -220], hemi: 0.5 },
    update(t) {
      paths.forEach((p, i) => {
        const a = p.ph + t * p.w, x = p.cx + Math.cos(a) * p.rx, z = p.cz + Math.sin(a) * p.rz;
        dummy.position.set(x, 0.65, z); dummy.rotation.set(0, -a, Math.sign(p.w) * 0.25); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        skaters.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x - Math.sign(p.w) * 0.15, 1.38, z); dummy.updateMatrix();
        hats.setMatrixAt(i, dummy.matrix);
      });
      skaters.instanceMatrix.needsUpdate = hats.instanceMatrix.needsUpdate = true;
    },
    shot(t, narrow) {
      const w = 0.5 - 0.5 * Math.cos(t * 0.06); // roofs → lake → roofs
      const look = V(-36, 8, -6).lerp(V(75, 3, -60), w);
      const back = narrow ? 1.3 : 1;
      return { pos: V(14 * back, 18 * back, 60 * back), look };
    },
  };
}

// ---------- 14 Dec: the round triple-roofed temple at dawn, a plane climbing into the clouds ----------
function temple(ctx) {
  const root = new Group();
  const ground = new Mesh(new PlaneGeometry(700, 700), std(0xd9e2f2)); ground.rotation.x = -PI / 2;
  root.add(ground);
  const marble = std(0xe8ecf3), red = std(0x8f2a1f), blue = std(0x2a4a8a, { roughness: 0.6 }), white = std(0xeef3fa), gold = std(0xd9a33a, { metalness: 0.4, roughness: 0.5 });
  const cyl = (rt, rb, h, y, mat, seg = 32) => { const m = new Mesh(new CylinderGeometry(rt, rb, h, seg), mat); m.position.y = y + h / 2; root.add(m); return m; };
  cyl(22, 23, 1.2, 0, marble); cyl(17, 18, 1.2, 1.2, marble); cyl(12, 13, 1.2, 2.4, marble);
  cyl(6.6, 6.6, 5.2, 3.6, red);
  // three roofs: blue eaves, snow on the upper part, gold bands between
  const roof = (rb, rt, h, y) => { cyl(rt, rb, h, y, blue); cyl(rt * 1.03, (rt + (rb - rt) * 0.55) * 1.03, h * 0.55, y + h * 0.45 + 0.04, white); };
  roof(9.4, 5.6, 2.2, 8.8); cyl(5.3, 5.3, 2.6, 11, red); cyl(5.4, 5.4, 0.35, 13.6, gold);
  roof(7.4, 4.2, 2, 13.95); cyl(3.9, 3.9, 2.2, 15.95, red); cyl(4, 4, 0.3, 18.15, gold);
  roof(5.6, 0.5, 3.4, 18.45);
  const fin = new Mesh(new SphereGeometry(0.8, 12, 10), gold); fin.position.y = 22.4; root.add(fin);
  // dawn sun behind, clouds above
  const sun = new Mesh(new CircleGeometry(16, 32), lit(0xffb38a, { fog: false }));
  sun.position.set(-60, 8, -320); sun.lookAt(0, 10, 60);
  root.add(sun, new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([-60, 8, -318], 3)), glowPoints(ctx.dot, 0xff9a7a, 140, { opacity: 0.45, fog: false })));
  const clouds = [];
  for (let i = 0; i < 46; i++) clouds.push({ p: [rand(-160, 200), rand(62, 84), rand(-260, -120)], s: [rand(10, 22), rand(3, 6), rand(8, 16)], r: [0, rand(0, 3), 0] });
  root.add(instances(new IcosahedronGeometry(1, 1), std(0xb9c6dc, { roughness: 1 }), clouds));
  // the plane: fuselage, wings, tail
  const plane = new Group();
  const fus = new Mesh(new CylinderGeometry(0.55, 0.45, 9, 12), white); fus.rotation.z = PI / 2;
  const noseCone = new Mesh(new SphereGeometry(0.55, 12, 8), white); noseCone.position.x = 4.5; noseCone.scale.x = 1.6;
  const wing = new Mesh(new BoxGeometry(1.6, 0.12, 10), white); wing.position.x = 0.3;
  const tail = new Mesh(new BoxGeometry(1.3, 1.8, 0.12), std(0xff6a2b)); tail.position.set(-4, 1, 0);
  const stab = new Mesh(new BoxGeometry(0.9, 0.1, 3.4), white); stab.position.set(-4, 0.2, 0);
  const beacon = new Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([0.3, 0, 5.1, 0.3, 0, -5.1, -4.3, 1.9, 0], 3)), glowPoints(ctx.dot, 0xff4f4f, 3));
  plane.add(fus, noseCone, wing, tail, stab, beacon);
  plane.scale.setScalar(1.4);
  root.add(plane);
  const P0 = V(-150, 18, -150), P1 = V(150, 105, -210), CYCLE = 22;
  return {
    root,
    env: { ...BASE_ENV, fog: 0x24304f, near: 70, far: 360, sun: 0xff9a7a, sunI: 0.95, sunPos: [-40, 20, -200], hemi: 0.6 },
    update(t) {
      const k = (t % CYCLE) / CYCLE;
      plane.position.copy(P0).lerp(P1, k);
      plane.rotation.set(0, Math.atan2(-(P1.z - P0.z), P1.x - P0.x), Math.atan2(P1.y - P0.y, P1.distanceTo(P0)) * 0.9);
      beacon.material.opacity = Math.sin(t * 6) > 0.6 ? 1 : 0.15;
    },
    shot(t, narrow) {
      const a = Math.sin(t * 0.05) * 0.18, r = narrow ? 58 : 44;
      return { pos: V(Math.sin(a) * r, narrow ? 8 : 6, Math.cos(a) * r), look: V(0, narrow ? 19 : 15, 0) };
    },
  };
}

export const SCENES = { valley, hutong, fireworks, train, gondola, wall, palace, temple };

// Which scene and variant a screen shows, by the day's Beijing date.
const BY_DATE = {
  '2026-12-07': ['hutong'], '2026-12-08': ['fireworks'], '2026-12-09': ['train'], '2026-12-10': ['valley', 'ski'],
  '2026-12-11': ['gondola'], '2026-12-12': ['wall'], '2026-12-13': ['palace'], '2026-12-14': ['temple'],
};
export function sceneFor(trip, view) {
  if (view.day === null || view.day === undefined) return view.end ? ['valley', 'vista'] : ['valley', 'title'];
  return BY_DATE[trip.days[view.day]?.date] || ['valley', 'title'];
}
