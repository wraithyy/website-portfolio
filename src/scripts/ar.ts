/* WebAR business-card experience.
   Point the camera at the back of the printed card (compiled into
   public/ar/card.mind) and a story emerges FROM the card: the JK monogram
   rises up through the paper surface, then — mirroring the site's StoryHero —
   an angular button is assembled from flying blocks and lifts out of a recessed
   socket, ending as a tappable "Napiš mi →" that presses back into the hole.

   Architecture notes (learned the hard way):
   - Content lives INSIDE anchor.group — MindAR owns the pose (its One-Euro
     filter is well tuned) and auto-hides the group when the card leaves frame.
     No hand-rolled smoothing layer fighting it.
   - A depth-only occluder plane on the card surface hides whatever is "below"
     it, so objects rising from under z=0 genuinely appear to come out of the card.
   Loaded lazily from ar.astro, mirroring the Konami egg. */
import * as THREE from 'three';
// mind-ar treats `three` as a peer dep, so this shares the app's single THREE instance
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { email } from '../data/site';

const CREAM = '#e8e4dc';
const VERMILION = '#ff5a3c';
const INK = '#121110';
const SOCKET = '#050504';

// --- tuning knobs (safe to tweak on-device) ---------------------------------
// MindAR One-Euro pose filter. Lower minCF = steadier when still; lower beta =
// smoother during motion (more lag). These are the real anti-jitter controls now.
const FILTER_MIN_CF = 0.0001;
const FILTER_BETA = 2;
const MISS_TOLERANCE = 5;
const WARMUP_TOLERANCE = 3;
// timings run at ~80% speed (slowed from the first cut)
const RISE_MS = 1375; // monogram grow-in (bars staggered within)
const BAR_STAGGER_MS = 165;
const STEP_MS = 1750; // per story beat
const TYPE_MS = 53; // typewriter speed per character
const HOVER_AMP = 0.008;
const HOVER_HZ = 0.3;

// --- JK monogram bars, straight from the logo SVG (viewBox 0 0 132 168) ---
const BARS: [number, number, number, number, boolean][] = [
  [0, 89, 25, 79, false],
  [36, 0, 25, 168, false],
  [71, 0, 25, 168, true],
  [107, 0, 25, 79, false],
  [107, 89, 25, 79, false],
];
const VB_W = 132;
const VB_H = 168;
const MONO_WIDTH = 0.24;
const MONO_DEPTH = 0.11; // tall enough that rising out of the card reads clearly
const MONO_Y = 0.13;

// --- story beats (condensed from src/data/story.ts, CS to match the card) ---
const STEPS = [
  { label: '01 — Architektura', note: 'nejdřív nakreslím hranici' },
  { label: '02 — TypeScript', note: 'otypuju, jak komunikuje' },
  { label: '03 — Design systémy', note: 'každý stav rozhodnutý jednou' },
  { label: '04 — Přístupnost', note: 'funguje pro každou ruku' },
  { label: '05 — Review & AI', note: 'renders ✓ klávesnice ✓ kontrast ✓' },
  { label: '06 — Dodávka', note: 'nasazeno. zmáčkni tlačítko.' },
];
const CTA_LABEL = 'Napiš mi →';

const BTN_W = 0.34;
const BTN_H = 0.12;
const BTN_DEPTH = 0.06;
const BTN_Y = -0.11;
const BTN_LIFT = 0.08; // hover height above the socket when built
const SOCKET_M = 0.05;

const BLOCK_COUNT = 6;
const SPARK_COUNT = 46;
const AMBIENT_COUNT = 55;
const BURST_MS = 900;
const BURST_EVERY_MS = 2600;

type Handle = { stop: () => void };
type Ctx2D = CanvasRenderingContext2D;

function fitFont(ctx: Ctx2D, text: string, family: string, maxW: number, startPx: number) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > 10) {
    px -= 3;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

function rectOutline(w: number, h: number, color: string) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    new THREE.LineBasicMaterial({ color }),
  );
  return line;
}

/** Invisible depth-only plane on the card surface — anything behind it (below
    the paper) is culled, so risen content appears to emerge from the card. */
function makeOccluder() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.1),
    new THREE.MeshBasicMaterial({ colorWrite: false }),
  );
  mesh.position.z = -0.001;
  mesh.renderOrder = -1;
  return mesh;
}

function buildMonogram() {
  const group = new THREE.Group();
  const s = MONO_WIDTH / VB_W;
  const bars: THREE.Mesh[] = [];
  const barMats: THREE.MeshStandardMaterial[] = [];
  for (const [x, y, w, h, isAccent] of BARS) {
    const mat = new THREE.MeshStandardMaterial({
      color: isAccent ? VERMILION : CREAM,
      roughness: 0.4,
      metalness: 0.05,
      emissive: isAccent ? VERMILION : CREAM,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, MONO_DEPTH), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    bars.push(mesh);
    barMats.push(mat);
  }
  group.position.y = MONO_Y;
  return { group, bars, barMats, accent: barMats[2] };
}

function makeCanvasPlane(worldW: number, pxW: number, pxH: number) {
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW, (worldW * pxH) / pxW),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );
  const paint = (draw: (c: Ctx2D) => void) => {
    ctx.clearRect(0, 0, pxW, pxH);
    draw(ctx);
    texture.needsUpdate = true;
  };
  return { mesh, paint };
}

/** Angular button + recessed socket + a generous invisible tap target. */
function build3DButton() {
  const group = new THREE.Group();

  const socket = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W + SOCKET_M, BTN_H + SOCKET_M),
    new THREE.MeshBasicMaterial({ color: SOCKET }),
  );
  const rim = rectOutline(BTN_W + SOCKET_M, BTN_H + SOCKET_M, CREAM);
  rim.position.z = 0.002;
  socket.add(floor, rim);

  const geo = new THREE.BoxGeometry(BTN_W, BTN_H, BTN_DEPTH); // sharp: brand 90° edges
  const solid = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: VERMILION,
      roughness: 0.28,
      metalness: 0.3,
      emissive: VERMILION,
      emissiveIntensity: 0,
    }),
  );

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: CREAM }),
  );

  const ring = rectOutline(BTN_W + 0.04, BTN_H + 0.04, VERMILION);
  ring.visible = false;

  const halo = rectOutline(BTN_W, BTN_H, VERMILION);
  const haloMat = halo.material;
  if (haloMat instanceof THREE.LineBasicMaterial) haloMat.transparent = true;
  halo.visible = false;

  const label = makeCanvasPlane(BTN_W * 0.9, 512, Math.round((512 * BTN_H) / BTN_W));
  label.paint((c) => {
    c.fillStyle = INK;
    fitFont(c, CTA_LABEL, "'Instrument Serif', Georgia, serif", c.canvas.width * 0.84, 150);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(CTA_LABEL, c.canvas.width / 2, c.canvas.height / 2 + 6);
  });
  label.mesh.position.z = BTN_DEPTH / 2 + 0.004;
  solid.add(label.mesh);

  // large invisible plane so the button is easy to tap even with wobble
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W * 1.5, BTN_H * 2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.z = BTN_DEPTH / 2 + 0.01;
  solid.add(hit);

  group.add(socket, solid, edges, ring, halo);
  group.position.set(0, BTN_Y, 0);
  return { group, socket, solid, edges, ring, halo, hit };
}

function makeAssembly() {
  const group = new THREE.Group();
  const blocks: { mesh: THREE.Mesh; from: THREE.Vector3 }[] = [];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.5, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), mat);
    const a = (i / BLOCK_COUNT) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a) * 0.18, Math.sin(a) * 0.12, 0.14 + (i % 3) * 0.05);
    group.add(mesh);
    blocks.push({ mesh, from });
  }
  group.position.z = BTN_LIFT;
  group.visible = false;
  return { group, blocks };
}

function makeSparks() {
  const dirs: THREE.Vector3[] = [];
  const speeds: number[] = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    const a = (i / SPARK_COUNT) * Math.PI * 2;
    const tilt = ((i % 5) - 2) * 0.35;
    dirs.push(new THREE.Vector3(Math.cos(a), Math.sin(a), tilt).normalize());
    speeds.push(0.26 + (i % 7) * 0.03);
  }
  const positions = new Float32Array(SPARK_COUNT * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: VERMILION,
    size: 0.018,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  const update = (age: number) => {
    const t = age / BURST_MS;
    if (t >= 1) {
      mat.opacity = 0;
      return;
    }
    const ease = 1 - (1 - t) ** 2;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const d = dirs[i];
      const r = speeds[i] * ease;
      positions[i * 3] = d.x * r;
      positions[i * 3 + 1] = d.y * r;
      positions[i * 3 + 2] = d.z * r;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 1 - t;
  };
  return { points, update };
}

function makeAmbient() {
  const positions = new Float32Array(AMBIENT_COUNT * 3);
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    positions[i * 3] = (((i * 37) % 100) / 100 - 0.5) * 0.8;
    positions[i * 3 + 1] = (((i * 53) % 100) / 100 - 0.5) * 0.7;
    positions[i * 3 + 2] = (((i * 29) % 100) / 100) * 0.18 + 0.02;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: CREAM,
      size: 0.005,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  );
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export async function start(container: HTMLElement): Promise<Handle> {
  try {
    await document.fonts.ready;
  } catch {
    /* fonts API optional; canvas falls back to system fonts */
  }

  const mindarThree = new MindARThree({
    container,
    imageTargetSrc: '/ar/card.mind',
    uiScanning: 'no',
    uiLoading: 'no',
    uiError: 'no',
    filterMinCF: FILTER_MIN_CF,
    filterBeta: FILTER_BETA,
    missTolerance: MISS_TOLERANCE,
    warmupTolerance: WARMUP_TOLERANCE,
  });
  const { renderer, scene, camera } = mindarThree;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(0.4, 0.8, 1);
  scene.add(key);

  const anchor = mindarThree.addAnchor(0);
  const root = anchor.group; // MindAR poses this and toggles its visibility

  root.add(makeOccluder());

  const { group: monogram, bars, barMats, accent } = buildMonogram();
  root.add(monogram);

  const btn = build3DButton();
  btn.group.visible = false;
  root.add(btn.group);

  const assembly = makeAssembly();
  btn.group.add(assembly.group);

  const sparks = makeSparks();
  sparks.points.position.set(0, BTN_Y, BTN_LIFT);
  sparks.points.visible = false;
  root.add(sparks.points);

  root.add(makeAmbient());

  const caption = makeCanvasPlane(0.46, 640, 150);
  caption.mesh.position.set(0, -0.31, 0.02);
  caption.mesh.visible = false;
  root.add(caption.mesh);

  let found = false;
  let clock = 0;
  let last = 0;
  let painted = -1;
  let stepShownAt = 0;
  let lastReveal = -1;
  let complete = false;
  let tappable = false; // true once the button has emerged (independent of story end)
  let lastBurst = -BURST_EVERY_MS;
  let pressing = 0;
  const landAt = bars.map(() => -1);

  anchor.onTargetFound = () => {
    found = true;
    last = performance.now();
  };
  anchor.onTargetLost = () => {
    found = false;
  };

  const raycaster = new THREE.Raycaster();
  // Listen on window (capture) so a tap is never swallowed by MindAR's video /
  // overlay sitting above the WebGL canvas — the recurring "button won't click".
  const onTap = (e: PointerEvent) => {
    if (!found || !tappable) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(p, camera);
    if (raycaster.intersectObjects([btn.solid, btn.hit], true).length > 0) {
      pressing = performance.now();
      setTimeout(() => {
        window.location.href = `mailto:${email}`;
      }, 220);
    }
  };
  window.addEventListener('pointerdown', onTap, true);

  const paintCaption = (step: (typeof STEPS)[number], chars: number) =>
    caption.paint((c) => {
      c.textAlign = 'center';
      c.fillStyle = VERMILION;
      c.font = "40px 'JetBrains Mono', monospace";
      c.textBaseline = 'top';
      c.fillText(step.label.toUpperCase(), c.canvas.width / 2, 6);
      c.fillStyle = CREAM;
      fitFont(c, step.note, "'Instrument Serif', Georgia, serif", c.canvas.width * 0.94, 54);
      c.fillText(step.note.slice(0, chars), c.canvas.width / 2, 70);
    });

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    if (found) clock += now - last;
    last = now;

    const bob = Math.sin(((now / 1000) * HOVER_HZ) * Math.PI * 2) * HOVER_AMP;

    // --- monogram bars rise UP through the card surface (occluder hides the
    //     sub-surface part), flashing as they clear ---
    for (let i = 0; i < bars.length; i++) {
      const r = clamp01((clock - i * BAR_STAGGER_MS) / RISE_MS);
      const e = easeOutBack(r);
      // centre travels from fully sunk (top at surface) to sitting on the card
      bars[i].position.z = lerp(-MONO_DEPTH / 2, MONO_DEPTH / 2, e) + bob * r;
      if (r >= 1 && landAt[i] < 0) landAt[i] = clock;
      barMats[i].emissiveIntensity = landAt[i] < 0 ? 0 : clamp01(1 - (clock - landAt[i]) / 320) * 0.9;
    }

    const stageF = (clock - RISE_MS) / STEP_MS;
    const step = Math.floor(stageF);
    const shown = Math.min(STEPS.length - 1, Math.max(0, step));
    complete = step >= STEPS.length - 1;
    const active = clock >= RISE_MS;

    btn.group.visible = active;
    caption.mesh.visible = active;

    if (active) {
      if (shown !== painted) {
        painted = shown;
        stepShownAt = clock;
        lastReveal = -1;
      }
      const note = STEPS[shown].note;
      const reveal = Math.min(note.length, Math.floor((clock - stepShownAt) / TYPE_MS));
      if (reveal !== lastReveal) {
        lastReveal = reveal;
        paintCaption(STEPS[shown], reveal);
      }

      // blocks gather (step 1); solid rises out of the socket (step 2+)
      const emerge = step >= 2 ? clamp01(stageF - 2) : 0;
      btn.solid.visible = step >= 2;
      btn.edges.visible = step < 2;
      btn.ring.visible = step >= 3;
      btn.ring.position.z = BTN_LIFT;
      tappable = step >= 2 && emerge > 0.8; // clickable as soon as it's up

      const press = pressing ? Math.max(0, 1 - (now - pressing) / 220) : 0;
      // centre travels from inside the hole up to hover height
      const z = lerp(-BTN_DEPTH / 2, BTN_LIFT, easeOutBack(emerge)) + bob * (emerge > 0 ? 1 : 0);
      btn.solid.position.z = z - press * (BTN_LIFT + BTN_DEPTH / 2);

      const conv = clamp01(stageF - 1);
      const solidFull = step >= 2 && emerge > 0.85;
      assembly.group.visible = (step === 1 || step === 2) && !solidFull;
      for (const { mesh, from } of assembly.blocks) {
        const spread = 1 - conv;
        mesh.position.set(from.x * spread, from.y * spread, from.z * spread);
        const sc = step >= 2 ? 1 - emerge : 0.25 + 0.75 * conv;
        mesh.scale.setScalar(Math.max(0.001, sc));
        const bmat = mesh.material;
        if (bmat instanceof THREE.MeshStandardMaterial) bmat.opacity = step >= 2 ? 1 - emerge : 1;
      }

      const smat = btn.solid.material;
      if (smat instanceof THREE.MeshStandardMaterial) {
        smat.emissiveIntensity = complete ? 0.5 + 0.35 * Math.sin(now / 280) : 0;
      }
      if (complete) accent.emissiveIntensity = 0.5 + 0.4 * Math.sin(now / 280);

      if (complete) {
        if (clock - lastBurst >= BURST_EVERY_MS) lastBurst = clock;
        const age = clock - lastBurst;
        sparks.points.visible = true;
        sparks.update(age);
        const ht = clamp01(age / (BURST_MS * 0.8));
        btn.halo.visible = ht < 1;
        btn.halo.position.z = BTN_LIFT;
        btn.halo.scale.setScalar(1 + ht * 1.6);
        const hmat = btn.halo.material;
        if (hmat instanceof THREE.LineBasicMaterial) hmat.opacity = 1 - ht;
      }
    }

    renderer.render(scene, camera);
  });

  await mindarThree.start(); // prompts for camera

  // MindAR computes the cover-size once at start; if the container wasn't fully
  // laid out yet the video letterboxes. Kick a resize once things settle so it
  // recomputes against the real full-screen dimensions.
  const kickResize = () => window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(kickResize);
  for (const t of [250, 800, 1500]) setTimeout(kickResize, t);

  return {
    stop: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('pointerdown', onTap, true);
      mindarThree.stop();
      const video = container.querySelector('video');
      const stream = video && video.srcObject instanceof MediaStream ? video.srcObject : null;
      stream?.getTracks().forEach((track) => track.stop());
    },
  };
}
