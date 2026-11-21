// The hero scene: a stylised snowy terrain of Beijing → Chongli with the trip drawn on it.
// Each day is a glowing route over the land; the camera flies to the day you look at.
// Decoration only: app.js loads this lazily, and the cover photo under it is the complete fallback.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, BufferGeometry, BufferAttribute, Float32BufferAttribute,
  MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, ShaderMaterial, Mesh, Points, Vector3, Color, FogExp2,
  HemisphereLight, DirectionalLight, CatmullRomCurve3, TubeGeometry, CanvasTexture, AdditiveBlending,
} from './vendor/three.module.min.js';
import { hotelTonight } from './logic.js';

// [lon, lat] per place id. places.json has no coordinates; a place missing here is simply not drawn.
const LONLAT = {
  'crystal-orange': [116.465, 39.938], 'thaiwoo-nanshanli': [115.39, 40.92], 'pek': [116.615, 40.052],
  'qinghe-station': [116.326, 40.04], 'lama-temple': [116.417, 39.947], 'universal-beijing': [116.676, 39.853],
  'feidachu': [116.455, 39.934], '16mm-cafe': [116.403, 39.937], 'tiananmen-square': [116.3975, 39.903],
  'qianmen-street': [116.398, 39.893], 'peking-chamber': [116.403, 39.913], 'jindingxuan': [116.417, 39.958],
  'shuiguo-spa': [116.497, 39.907], 'mutianyu': [116.566, 40.437], 'carbo': [116.447, 39.909],
  'wangfujing': [116.411, 39.913], 'long-time-ago': [116.455, 39.937], 'forbidden-city': [116.397, 39.918],
  'fangzhuanchang-69': [116.404, 39.94], 'summer-palace': [116.273, 39.999], 'hu-teahouse-hotpot': [116.449, 39.932],
  'sanlitun-taikoo-li': [116.455, 39.934], 'temple-of-heaven': [116.411, 39.882], 'voyage-coffee': [116.401, 39.878],
  'grandmas-home': [116.411, 39.915],
};
const K = 10; // world units per degree of longitude
const toX = (lon) => (lon - 116) * K;
const toZ = (lat) => -(lat - 40.4) * K * 1.31; // a degree of latitude is ~1.31x a degree of longitude here

const FLIGHT_MS = 1600;
const FLIGHT_FRAME_MS = 1000 / 30;
const IDLE_FRAME_MS = 1000 / 24; // only snow and a slow drift move when idle
const SNOW_COUNT = 360;

// ---------- terrain height: Beijing plain to the south-east, Yanshan mountains north, Chongli plateau north-west ----------
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a, b, t) => { const k = Math.min(Math.max((t - a) / (b - a), 0), 1); return k * k * (3 - 2 * k); };
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function ridged(x, y) {
  let sum = 0, amp = 0.55, f = 1;
  for (let o = 0; o < 5; o++) { sum += amp * (1 - Math.abs(noise(x * f, y * f) * 2 - 1)); f *= 2.03; amp *= 0.5; }
  return sum;
}
function height(x, z) {
  const lon = x / K + 116;
  const lat = 40.4 - z / (K * 1.31);
  const plain = smooth(115.95, 116.3, lon) * smooth(40.55, 40.22, lat);
  const lift = 0.45 + 0.9 * smooth(116.0, 115.3, lon);
  const r = ridged(x * 0.3 + 3.1, z * 0.3 - 1.7);
  return (1 - plain) * lift * Math.pow(r, 1.8) * 1.25 + plain * 0.03 * noise(x * 2, z * 2);
}

const THEMES = {
  light: { fog: 0xd9dee5, low: 0xb9c0c9, high: 0xffffff, sky: 0xeef2f7, ground: 0x7d746c, hemi: 1.6, sun: 0xffd2a8, sunI: 1.6,
    lights: 0xffb36b, lightsOpacity: 0.55, route: 0xc7271d, routeDim: 0x8f6a64, stars: 0 },
  dark: { fog: 0x0e1424, low: 0x2a3445, high: 0xdde6f2, sky: 0x40506e, ground: 0x0a0c12, hemi: 0.9, sun: 0x9fb8e6, sunI: 1.3,
    lights: 0xffb060, lightsOpacity: 0.95, route: 0xff6a4d, routeDim: 0x6b4a46, stars: 1 },
};

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

// Places of a day in visiting order, starting where they woke up.
function dayPlaces(trip, i) {
  const ids = [];
  if (i > 0) {
    const woke = hotelTonight(trip.hotels, trip.days[i - 1].date);
    if (woke) ids.push(woke.place);
  }
  trip.days[i].items.forEach((it) => { if (it.place && LONLAT[it.place] && ids[ids.length - 1] !== it.place) ids.push(it.place); });
  return ids.filter((id) => LONLAT[id]);
}
const pointOf = (id) => { const [lon, lat] = LONLAT[id]; const x = toX(lon), z = toZ(lat); return new Vector3(x, height(x, z), z); };

// Camera framing: look at the middle of the points from the south-east, far enough to fit them.
function framing(points, overview) {
  const c = new Vector3();
  points.forEach((p) => c.add(p));
  c.divideScalar(Math.max(points.length, 1));
  const extent = Math.max(1.3, ...points.map((p) => Math.hypot(p.x - c.x, p.z - c.z)));
  const dir = overview ? new Vector3(0.45, 0.42, 1).normalize() : new Vector3(0.35, 0.8, 1).normalize();
  const dist = 0.9 + extent * (overview ? 1.9 : 2.3);
  const target = c.clone().add(new Vector3(0, overview ? extent * 0.25 : 0, 0));
  return { target, pos: target.clone().addScaledVector(dir, dist), dist };
}

export function startRoute(host, trip) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.05, 120);
  const fog = new FogExp2(0, 0.03);
  scene.fog = fog;

  // terrain
  const SIZE = 48, SEG = 240;
  const terrainGeo = new PlaneGeometry(SIZE, SIZE, SEG, SEG);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  const heights = new Float32Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    heights[v] = height(pos.getX(v), pos.getZ(v));
    pos.setY(v, heights[v]);
  }
  terrainGeo.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3);
  terrainGeo.setAttribute('color', new BufferAttribute(colors, 3));
  const terrain = new Mesh(terrainGeo, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  scene.add(terrain);

  const hemi = new HemisphereLight(0xffffff, 0x000000, 1);
  const sun = new DirectionalLight(0xffffff, 1);
  sun.position.set(-6, 5, 8);
  scene.add(hemi, sun);

  const dot = dotTexture();

  // city glow: warm lights scattered on the plain, densest in the centre of Beijing; a small cluster at Chongli
  const lightPts = [];
  const scatter = (lon, lat, n, spread) => {
    for (let k = 0; k < n; k++) {
      const r = spread * Math.sqrt(-2 * Math.log(Math.random() + 1e-6)) * 0.6;
      const a = Math.random() * Math.PI * 2;
      const x = toX(lon) + Math.cos(a) * r, z = toZ(lat) + Math.sin(a) * r * 0.85;
      lightPts.push(x, height(x, z) + 0.01, z);
    }
  };
  scatter(116.40, 39.92, 1400, 1.3);
  scatter(116.65, 39.88, 160, 0.4);
  scatter(115.40, 40.94, 90, 0.25);
  const lightsGeo = new BufferGeometry();
  lightsGeo.setAttribute('position', new Float32BufferAttribute(lightPts, 3));
  const lightsMat = new PointsMaterial({ size: 3, sizeAttenuation: false, map: dot, transparent: true, depthWrite: false, blending: AdditiveBlending });
  scene.add(new Points(lightsGeo, lightsMat));

  // stars, dark theme only
  const starPts = [];
  for (let k = 0; k < 700; k++) {
    const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.9, r = Math.sqrt(1 - y * y);
    starPts.push(Math.cos(a) * r * 80, y * 80, Math.sin(a) * r * 80);
  }
  const starsGeo = new BufferGeometry();
  starsGeo.setAttribute('position', new Float32BufferAttribute(starPts, 3));
  const starsMat = new PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xdfe8ff, map: dot, transparent: true, fog: false, depthWrite: false });
  const stars = new Points(starsGeo, starsMat);
  scene.add(stars);

  // the trip: one route per day, plus a dot per place
  const days = trip.days.map((_, i) => dayPlaces(trip, i).map(pointOf));
  const allPoints = days.flat();
  const routeMat = new MeshBasicMaterial({ fog: false });
  const routeDimMat = new MeshBasicMaterial({ transparent: true, opacity: 0.75 });
  const routes = days.map(() => { const m = new Mesh(new BufferGeometry(), routeDimMat); scene.add(m); return m; });
  const markerGeo = new BufferGeometry();
  markerGeo.setAttribute('position', new Float32BufferAttribute(allPoints.flatMap((p) => [p.x, p.y + 0.02, p.z]), 3));
  const markerMat = new PointsMaterial({ size: 7, sizeAttenuation: false, map: dot, transparent: true, depthWrite: false });
  scene.add(new Points(markerGeo, markerMat));
  const activeGeo = new BufferGeometry();
  const activeMat = new PointsMaterial({ size: 18, sizeAttenuation: false, map: dot, transparent: true, depthWrite: false, depthTest: false, fog: false });
  const activeMarkers = new Points(activeGeo, activeMat);
  activeMarkers.renderOrder = 2;
  scene.add(activeMarkers);

  // Drape a polyline over the land so it reads as a road, not a laser.
  function drapedTube(points, radius) {
    if (points.length < 2) return new BufferGeometry();
    const samples = [];
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const steps = Math.max(2, Math.ceil(a.distanceTo(b) / 0.08));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        samples.push(new Vector3(x, height(x, z) + radius * 2 + 0.01, z));
      }
    }
    const last = points[points.length - 1];
    samples.push(new Vector3(last.x, last.y + radius * 2 + 0.01, last.z));
    return new TubeGeometry(new CatmullRomCurve3(samples), Math.min(samples.length * 3, 1500), radius, 5, false);
  }

  // snowfall in clip space, in front of everything (from the old snow.js)
  const snowPos = new Float32Array(SNOW_COUNT * 3), snowDepth = new Float32Array(SNOW_COUNT), snowPhase = new Float32Array(SNOW_COUNT);
  for (let k = 0; k < SNOW_COUNT; k++) {
    snowPos[k * 3] = Math.random() * 2.2 - 1.1;
    snowPos[k * 3 + 1] = Math.random() * 2.2 - 1.1;
    snowDepth[k] = Math.pow(Math.random(), 1.6);
    snowPhase[k] = Math.random();
  }
  const snowGeo = new BufferGeometry();
  snowGeo.setAttribute('position', new BufferAttribute(snowPos, 3));
  snowGeo.setAttribute('aDepth', new BufferAttribute(snowDepth, 1));
  snowGeo.setAttribute('aPhase', new BufferAttribute(snowPhase, 1));
  const snowUniforms = { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: 1 }, uColor: { value: new Color(0xffffff) } };
  const snow = new Points(snowGeo, new ShaderMaterial({
    uniforms: snowUniforms, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `
      attribute float aDepth; attribute float aPhase;
      uniform float uTime; uniform float uScroll; uniform float uPx;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * mix(0.035, 0.16, aDepth) + uScroll * mix(0.15, 0.9, aDepth) + 1.1, 2.2) - 1.1;
        p.x += sin(uTime * (0.3 + aPhase * 0.4) + aPhase * 6.28) * mix(0.015, 0.06, aDepth);
        gl_Position = vec4(p.xy, 0.0, 1.0);
        gl_PointSize = mix(1.6, 6.5, aDepth * aDepth) * uPx;
        vAlpha = mix(0.35, 0.85, aDepth);
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, smoothstep(0.5, 0.08, d) * vAlpha); }`,
  }));
  snow.frustumCulled = false;
  snow.renderOrder = 3;
  scene.add(snow);

  // ---------- theme ----------
  const dark = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const t = THEMES[dark.matches ? 'dark' : 'light'];
    const low = new Color(t.low), high = new Color(t.high), c = new Color();
    for (let v = 0; v < pos.count; v++) {
      c.copy(low).lerp(high, smooth(0.05, 0.9, heights[v]));
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b;
    }
    terrainGeo.attributes.color.needsUpdate = true;
    fog.color.set(t.fog);
    hemi.color.set(t.sky); hemi.groundColor.set(t.ground); hemi.intensity = t.hemi;
    sun.color.set(t.sun); sun.intensity = t.sunI;
    lightsMat.color.set(t.lights); lightsMat.opacity = t.lightsOpacity;
    routeMat.color.set(t.route); routeDimMat.color.set(t.routeDim);
    markerMat.color.set(t.routeDim); activeMat.color.set(t.route);
    stars.visible = t.stars === 1;
    snowUniforms.uColor.value.set(dark.matches ? 0xeef4ff : 0xffffff);

  }
  dark.addEventListener('change', applyTheme);

  // ---------- camera flight ----------
  let from = null, to = null, flightStart = 0, flying = false;
  let activeIndex = -2;
  const camPos = new Vector3(), camTarget = new Vector3();

  // view: { day: index } for one day, or { day: null } for the whole trip
  function show(view) {
    const index = view.day ?? -1;
    if (index === activeIndex) return;
    activeIndex = index;
    const points = index >= 0 && days[index].length ? days[index] : allPoints;
    const next = framing(points, index < 0);
    const radius = next.dist * 0.0045;
    routes.forEach((m, k) => {
      m.geometry.dispose();
      m.geometry = drapedTube(days[k], k === index ? radius * 1.6 : radius);
      m.material = k === index ? routeMat : routeDimMat;
      m.renderOrder = k === index ? 1 : 0;
    });
    const act = index >= 0 ? days[index] : [];
    activeGeo.setAttribute('position', new Float32BufferAttribute(act.flatMap((p) => [p.x, p.y + 0.02, p.z]), 3));
    fog.density = 0.5 / (next.dist + 6);
    if (!to) { // first view: no flight, appear in place
      from = next; to = next; camPos.copy(next.pos); camTarget.copy(next.target);
    } else {
      from = { pos: camPos.clone(), target: camTarget.clone() };
      to = next;
      flightStart = performance.now();
      flying = true;
    }

    wake();
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function place(t) {
    if (flying) {
      const k = Math.min((t - flightStart) / FLIGHT_MS, 1);
      const e = ease(k);
      camPos.lerpVectors(from.pos, to.pos, e);
      camTarget.lerpVectors(from.target, to.target, e);
      // rise a little mid-flight so long hops clear the mountains
      camPos.y += Math.sin(Math.PI * e) * from.pos.distanceTo(to.pos) * 0.18;
      if (k >= 1) flying = false;
    }
    // slow sideways drift around the target
    const drift = Math.sin(t / 7000) * 0.06;
    const off = camPos.clone().sub(camTarget);
    off.applyAxisAngle(new Vector3(0, 1, 0), drift);
    camera.position.copy(camTarget).add(off);
    camera.lookAt(camTarget);
  }

  // ---------- loop ----------
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    // The lower part of the hero sits under the title scrim: aim at a point higher up the canvas.
    camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    camera.updateProjectionMatrix();
    snowUniforms.uPx.value = dpr;

  };

  let inView = true, raf = 0, last = 0;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (t - last < (flying ? FLIGHT_FRAME_MS : IDLE_FRAME_MS)) return;
    last = t;
    snowUniforms.uTime.value = t / 1000;
    snowUniforms.uScroll.value = Math.min(window.scrollY / Math.max(host.clientHeight, 1), 1.5);
    place(t);
    renderer.render(scene, camera);
  };
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => { lost = true; wake(); });
  function wake() {
    const run = !lost && inView && document.visibilityState === 'visible';
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  applyTheme();
  resize();
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; wake(); }).observe(host);
  document.addEventListener('visibilitychange', wake);
  host.prepend(canvas);

  return { show, canvas };
}
