/* WebAR business-card experience.
   Point the camera at the back of the printed card (compiled into
   public/ar/card.mind) and a story emerges FROM the card: the JK monogram
   rises bar by bar out of the paper, then — mirroring the site's StoryHero —
   an angular 3D button is assembled from flying blocks above a recessed socket
   in the card, gaining reality through the way Josef builds, ending as a
   tappable "Napiš mi →" that presses down into its hole (mailto).

   Anti-jitter WITHOUT lag: content lives in a scene-level group whose pose is
   smoothed toward the detected anchor with an ADAPTIVE factor — heavy damping
   when the card is still, snappy tracking when the phone moves — and it hides
   whenever the card leaves the frame (never floats loose in space).
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
const FILTER_MIN_CF = 0.0001; // MindAR One-Euro: lower = steadier when still
const FILTER_BETA = 3;
const MISS_TOLERANCE = 5;
const WARMUP_TOLERANCE = 3;
// adaptive pose low-pass: k = clamp(MIN + change*GAIN, MIN, 1) per frame.
// MIN governs stillness (low = no jitter); GAIN governs catch-up on real motion.
const SMOOTH_MIN = 0.1;
const POS_GAIN = 16;
const ROT_GAIN = 8;
const RISE_MS = 1100; // monogram grow-in (bars staggered within)
const BAR_STAGGER_MS = 130;
const STEP_MS = 1400; // per story beat
const TYPE_MS = 42; // typewriter speed per character
const HOVER_AMP = 0.01;
const HOVER_HZ = 0.32;

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
const MONO_DEPTH = 0.06;
const MONO_Y = 0.14; // upper area of the card

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

// angular button sitting above a recessed socket, lower-centre on the card
const BTN_W = 0.34;
const BTN_H = 0.12;
const BTN_DEPTH = 0.05;
const BTN_Y = -0.1;
const BTN_LIFT = 0.07; // rest height above the socket
const BTN_SUNK = 0.012; // height when pressed into the hole
const SOCKET_M = 0.05; // socket margin around the button

const BLOCK_COUNT = 6;
const SPARK_COUNT = 46;
const AMBIENT_COUNT = 60;
const BURST_MS = 900;
const BURST_EVERY_MS = 2600;

type Handle = { stop: () => void };
type Ctx2D = CanvasRenderingContext2D;

/** Shrink the font until `text` fits `maxW`; sets ctx.font and returns px. */
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
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    new THREE.LineBasicMaterial({ color }),
  );
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
      emissive: isAccent ? VERMILION : CREAM, // intensity 0 until it seats / ships
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, MONO_DEPTH), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    mesh.scale.z = 0.001;
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

/** Angular button + a recessed socket ("hole") it presses into. */
function build3DButton() {
  const group = new THREE.Group();

  // socket: a dark inset in the card with a bright rim — reads as a hole/slot
  const socket = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W + SOCKET_M, BTN_H + SOCKET_M),
    new THREE.MeshBasicMaterial({ color: SOCKET }),
  );
  floor.position.z = 0.001;
  const rim = rectOutline(BTN_W + SOCKET_M, BTN_H + SOCKET_M, CREAM);
  rim.position.z = 0.003;
  const innerRim = rectOutline(BTN_W + 0.012, BTN_H + 0.012, '#3a3733');
  innerRim.position.z = 0.002;
  socket.add(floor, rim, innerRim);

  // the button itself — a sharp box (brand rule: 90° edges, no rounding)
  const geo = new THREE.BoxGeometry(BTN_W, BTN_H, BTN_DEPTH);
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
  solid.scale.setScalar(0.001);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: CREAM }),
  );
  edges.position.z = BTN_LIFT;

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
  solid.add(label.mesh); // rides the button (incl. into the hole on press)
  label.mesh.visible = true;

  group.add(socket, solid, edges, ring, halo);
  group.position.set(0, BTN_Y, 0);
  return { group, socket, solid, edges, ring, halo, labelMesh: label.mesh };
}

function makeAssembly() {
  const group = new THREE.Group();
  const blocks: { mesh: THREE.Mesh; from: THREE.Vector3 }[] = [];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.5, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), mat);
    const a = (i / BLOCK_COUNT) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a) * 0.18, Math.sin(a) * 0.12, 0.12 + (i % 3) * 0.05);
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
    positions[i * 3 + 2] = (((i * 29) % 100) / 100) * 0.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: CREAM,
      size: 0.005,
      transparent: true,
      opacity: 0.3,
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

  const stage = new THREE.Group();
  stage.visible = false;
  scene.add(stage);

  const { group: monogram, bars, barMats, accent } = buildMonogram();
  stage.add(monogram);

  const btn = build3DButton();
  btn.group.visible = false;
  stage.add(btn.group);

  const assembly = makeAssembly();
  btn.group.add(assembly.group);

  const sparks = makeSparks();
  sparks.points.position.set(0, BTN_Y, BTN_LIFT);
  sparks.points.visible = false;
  stage.add(sparks.points);

  stage.add(makeAmbient());

  const caption = makeCanvasPlane(0.46, 640, 150);
  caption.mesh.position.set(0, -0.33, 0.02);
  caption.mesh.visible = false;
  stage.add(caption.mesh);

  let found = false;
  let posed = false;
  let clock = 0;
  let last = 0;
  let painted = -1;
  let stepShownAt = 0;
  let lastReveal = -1;
  let complete = false;
  let lastBurst = -BURST_EVERY_MS;
  let pressing = 0;
  const landAt = bars.map(() => -1);

  anchor.onTargetFound = () => {
    found = true;
    posed = false;
    last = performance.now();
  };
  anchor.onTargetLost = () => {
    found = false;
  };

  const raycaster = new THREE.Raycaster();
  const onTap = (e: PointerEvent) => {
    if (!complete || !stage.visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(p, camera);
    if (raycaster.intersectObject(btn.solid, false).length > 0) {
      pressing = performance.now();
      setTimeout(() => {
        window.location.href = `mailto:${email}`;
      }, 200);
    }
  };
  renderer.domElement.addEventListener('pointerdown', onTap);

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

  const tPos = new THREE.Vector3();
  const tQuat = new THREE.Quaternion();
  const tScale = new THREE.Vector3();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const bob = Math.sin(((now / 1000) * HOVER_HZ) * Math.PI * 2) * HOVER_AMP;
    const sway = Math.sin(((now / 1000) * HOVER_HZ) * Math.PI) * 0.04;

    // --- adaptive anti-jitter; hide entirely when the card is gone ---
    if (found) {
      clock += now - last;
      anchor.group.matrix.decompose(tPos, tQuat, tScale);
      if (!posed) {
        stage.position.copy(tPos);
        stage.quaternion.copy(tQuat);
        posed = true;
      } else {
        const posK = THREE.MathUtils.clamp(
          SMOOTH_MIN + stage.position.distanceTo(tPos) * POS_GAIN,
          SMOOTH_MIN,
          1,
        );
        const rotK = THREE.MathUtils.clamp(
          SMOOTH_MIN + stage.quaternion.angleTo(tQuat) * ROT_GAIN,
          SMOOTH_MIN,
          1,
        );
        stage.position.lerp(tPos, posK);
        stage.quaternion.slerp(tQuat, rotK);
      }
      stage.scale.copy(tScale);
      stage.visible = true;
    } else {
      stage.visible = false; // never leave content floating loose in space
    }
    last = now;

    if (!stage.visible) {
      renderer.render(scene, camera);
      return;
    }

    // --- monogram: bars rise out of the card, flash as they seat ---
    for (let i = 0; i < bars.length; i++) {
      const r = clamp01((clock - i * BAR_STAGGER_MS) / RISE_MS);
      const sz = Math.max(0.001, easeOutBack(r));
      bars[i].scale.z = sz;
      bars[i].position.z = (MONO_DEPTH / 2) * sz;
      if (r >= 1 && landAt[i] < 0) landAt[i] = clock;
      barMats[i].emissiveIntensity = landAt[i] < 0 ? 0 : clamp01(1 - (clock - landAt[i]) / 320) * 0.9;
    }
    const monoRise = clamp01(clock / RISE_MS);
    monogram.position.z = bob * monoRise;
    monogram.rotation.y = sway * monoRise;

    // --- story / button ---
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

      // button assembly: blocks gather (step 1), sharp solid rises from the hole (step 2)
      const grow = step >= 2 ? easeOutBack(clamp01(stageF - 2)) : 0.001;
      btn.solid.scale.setScalar(grow);
      btn.solid.visible = step >= 2;
      btn.edges.visible = step < 2;
      btn.ring.visible = step >= 3;
      btn.ring.position.z = BTN_LIFT;

      const conv = clamp01(stageF - 1);
      const solidFull = step >= 2 && grow > 0.9;
      assembly.group.visible = (step === 1 || step === 2) && !solidFull;
      for (const { mesh, from } of assembly.blocks) {
        const spread = 1 - conv;
        mesh.position.set(from.x * spread, from.y * spread, from.z * spread);
        const sc = step >= 2 ? 1 - grow : 0.25 + 0.75 * conv;
        mesh.scale.setScalar(Math.max(0.001, sc));
        const bmat = mesh.material;
        if (bmat instanceof THREE.MeshStandardMaterial) bmat.opacity = step >= 2 ? 1 - grow : 1;
      }

      // rise out of the hole while forming, then hover; press sinks it in
      const press = pressing ? Math.max(0, 1 - (now - pressing) / 200) : 0;
      const restZ = BTN_LIFT * (step >= 2 ? Math.min(1, grow) : 0) + bob * monoRise;
      btn.solid.position.z = restZ - press * (BTN_LIFT - BTN_SUNK);

      const smat = btn.solid.material;
      if (smat instanceof THREE.MeshStandardMaterial) {
        smat.emissiveIntensity = complete ? 0.5 + 0.35 * Math.sin(now / 280) : 0;
      }
      if (complete) accent.emissiveIntensity = 0.5 + 0.4 * Math.sin(now / 280);

      // --- ship payoff: looping spark burst + expanding square halo ---
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

  return {
    stop: () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', onTap);
      mindarThree.stop();
      const video = container.querySelector('video');
      const stream = video && video.srcObject instanceof MediaStream ? video.srcObject : null;
      stream?.getTracks().forEach((track) => track.stop());
    },
  };
}
