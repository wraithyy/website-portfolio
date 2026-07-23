/* WebAR business-card experience.
   Point the camera at the back of the printed card (compiled into
   public/ar/card.mind) and a story plays out anchored to the paper:
   the JK monogram rises, then — mirroring the site's StoryHero — a real 3D
   button gains reality through the way Josef builds (architecture, types,
   states, a11y, review, delivery), ending as a tappable "Napiš mi →" (mailto).
   Everything hovers close to the card and gently floats. Loaded lazily from
   ar.astro, mirroring the Konami egg. */
import * as THREE from 'three';
// mind-ar treats `three` as a peer dep, so this shares the app's single THREE instance
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { email } from '../data/site';

const CREAM = '#e8e4dc';
const VERMILION = '#ff5a3c';
const INK = '#121110';

// --- tuning knobs (safe to tweak on-device) ---------------------------------
// One-Euro pose filter: lower minCF = steadier when still (less jitter, more lag).
const FILTER_MIN_CF = 0.0001;
const FILTER_BETA = 3;
const MISS_TOLERANCE = 5; // frames of lost detection tolerated before "lost" (kills flicker)
const WARMUP_TOLERANCE = 3;
const RISE_MS = 900; // monogram grow-in
const STEP_MS = 1400; // per story beat
const HOVER_AMP = 0.015; // float bob amplitude (world units)
const HOVER_HZ = 0.35; // float bob speed

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
const MONO_WIDTH = 0.28;
const MONO_DEPTH = 0.07;

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

// button geometry (world units), hovering just above the monogram, close to the card
const BTN_W = 0.4;
const BTN_H = 0.15;
const BTN_R = 0.03;
const BTN_DEPTH = 0.07;
const BTN_Y = 0.3;
const BTN_Z = 0.09;

type Handle = { stop: () => void };
type Ctx2D = CanvasRenderingContext2D;

function buildMonogram() {
  const group = new THREE.Group();
  const s = MONO_WIDTH / VB_W;
  let accent: THREE.MeshStandardMaterial | null = null;
  for (const [x, y, w, h, isAccent] of BARS) {
    const mat = new THREE.MeshStandardMaterial({
      color: isAccent ? VERMILION : CREAM,
      roughness: 0.4,
      metalness: 0.05,
      emissive: isAccent ? VERMILION : '#000000',
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, MONO_DEPTH), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    if (isAccent) accent = mat;
  }
  if (!accent) throw new Error('monogram: accent bar missing');
  return { group, accent };
}

function roundedRectShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** A plane textured from a repaintable 2D canvas. */
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

function build3DButton() {
  const group = new THREE.Group();

  const shape = roundedRectShape(BTN_W, BTN_H, BTN_R);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: BTN_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  geo.center();
  const solid = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: VERMILION,
      roughness: 0.35,
      metalness: 0.1,
      emissive: VERMILION,
      emissiveIntensity: 0,
    }),
  );
  solid.scale.setScalar(0.001);

  // wireframe outline for the "being drawn" stages
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: CREAM }),
  );

  // focus ring (a11y) — a larger flat outline that pops in behind the face
  const ringShape = roundedRectShape(BTN_W + 0.06, BTN_H + 0.06, BTN_R + 0.03);
  const ring = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ShapeGeometry(ringShape)),
    new THREE.LineBasicMaterial({ color: VERMILION }),
  );
  ring.position.z = BTN_DEPTH / 2 + 0.001;
  ring.visible = false;

  // CTA label on the front face
  const label = makeCanvasPlane(BTN_W * 0.92, 512, Math.round((512 * BTN_H) / BTN_W));
  label.paint((c) => {
    c.fillStyle = INK;
    c.font = "150px 'Instrument Serif', Georgia, serif";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(CTA_LABEL, c.canvas.width / 2, c.canvas.height / 2 + 8);
  });
  label.mesh.position.z = BTN_DEPTH / 2 + 0.02;
  label.mesh.visible = false;

  group.add(solid, edges, ring, label.mesh);
  return { group, solid, edges, ring, labelMesh: label.mesh };
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

  const { group: monogram, accent } = buildMonogram();
  monogram.scale.z = 0.001;
  anchor.group.add(monogram);

  const btn = build3DButton();
  btn.group.position.set(0, BTN_Y, BTN_Z);
  btn.group.visible = false;
  anchor.group.add(btn.group);

  // step caption below the monogram — close to the card, so it stays steady
  const caption = makeCanvasPlane(0.5, 640, 150);
  caption.mesh.position.set(0, -0.3, 0.03);
  caption.mesh.visible = false;
  anchor.group.add(caption.mesh);

  let found = false;
  let clock = 0;
  let last = 0;
  let painted = -1;
  let complete = false;

  anchor.onTargetFound = () => {
    found = true;
    last = performance.now();
  };
  anchor.onTargetLost = () => {
    found = false;
  };

  const raycaster = new THREE.Raycaster();
  const onTap = (e: PointerEvent) => {
    if (!complete) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(p, camera);
    if (raycaster.intersectObject(btn.solid, false).length > 0) {
      window.location.href = `mailto:${email}`;
    }
  };
  renderer.domElement.addEventListener('pointerdown', onTap);

  const paintCaption = (step: (typeof STEPS)[number]) =>
    caption.paint((c) => {
      c.textAlign = 'center';
      c.fillStyle = VERMILION;
      c.font = "40px 'JetBrains Mono', monospace";
      c.textBaseline = 'top';
      c.fillText(step.label.toUpperCase(), c.canvas.width / 2, 6);
      c.fillStyle = CREAM;
      c.font = "54px 'Instrument Serif', Georgia, serif";
      c.fillText(step.note, c.canvas.width / 2, 66);
    });

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const bob = Math.sin(now / 1000 * HOVER_HZ * Math.PI * 2) * HOVER_AMP;
    const sway = Math.sin(now / 1000 * HOVER_HZ * Math.PI) * 0.05;

    if (found) {
      clock += now - last;
    }
    last = now;

    // monogram rises, then floats
    const rise = clamp01(clock / RISE_MS);
    monogram.scale.z = Math.max(0.001, easeOutBack(rise));
    monogram.position.z = (MONO_DEPTH / 2) * monogram.scale.z + bob * rise;
    monogram.rotation.y = sway * rise;

    const stageF = (clock - RISE_MS) / STEP_MS; // fractional stage
    const stage = Math.floor(stageF);
    const shown = Math.min(STEPS.length - 1, Math.max(0, stage));
    complete = stage >= STEPS.length - 1;

    const active = clock >= RISE_MS;
    btn.group.visible = active;
    caption.mesh.visible = active;

    if (active) {
      if (shown !== painted) {
        painted = shown;
        paintCaption(STEPS[shown]);
      }
      // 3D button assembly: wireframe until stage 2, then the solid grows in
      btn.solid.scale.setScalar(stage >= 2 ? easeOutBack(clamp01(stageF - 2)) : 0.001);
      btn.solid.visible = stage >= 2;
      btn.edges.visible = stage < 2;
      btn.labelMesh.visible = stage >= 2;
      btn.ring.visible = stage >= 3;

      // float + gentle tumble
      btn.group.position.z = BTN_Z + bob;
      btn.group.rotation.y = sway;
      btn.group.rotation.x = bob * 0.5;

      const mat = btn.solid.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.emissiveIntensity = complete ? 0.45 + 0.35 * Math.sin(now / 300) : 0;
      }
      accent.emissiveIntensity = complete ? 0.5 + 0.4 * Math.sin(now / 300) : rise * 0.25;
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
