/* WebAR business-card experience.
   Point the camera at the back of the printed card (compiled into
   public/ar/card.mind) and a story plays out anchored to the paper:
   the JK monogram rises, then — mirroring the site's StoryHero — a button
   gains reality through the way Josef builds (architecture, types, states,
   a11y, review, delivery), ending as a real, tappable "Napiš mi →" (mailto).
   Loaded lazily from ar.astro, mirroring the Konami egg. */
import * as THREE from 'three';
// mind-ar treats `three` as a peer dep, so this shares the app's single THREE instance
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { email } from '../data/site';

const CREAM = '#e8e4dc';
const VERMILION = '#ff5a3c';
const INK = '#121110';
const MUTED = '#918c84';

// --- JK monogram bars, straight from the logo SVG (viewBox 0 0 132 168) ---
// [x, y, w, h, accent?]
const BARS: [number, number, number, number, boolean][] = [
  [0, 89, 25, 79, false],
  [36, 0, 25, 168, false],
  [71, 0, 25, 168, true],
  [107, 0, 25, 79, false],
  [107, 89, 25, 79, false],
];
const VB_W = 132;
const VB_H = 168;
const MONO_WIDTH = 0.3;
const MONO_DEPTH = 0.08;

// --- story beats (condensed from src/data/story.ts, CS to match the card) ---
const STEPS = [
  { label: '01 — Architektura', note: 'nejdřív nakreslím hranici' },
  { label: '02 — TypeScript', note: 'otypuju, jak komunikuje' },
  { label: '03 — Design systémy', note: 'každý stav rozhodnutý jednou' },
  { label: '04 — Přístupnost', note: 'funguje pro každou ruku' },
  { label: '05 — Review & AI', note: 'každý řádek se obhájí' },
  { label: '06 — Dodávka', note: 'nasazeno. zmáčkni.' },
];

const RISE_MS = 900;
const STEP_MS = 1250;
const CTA_LABEL = 'Napiš mi →';

type Handle = { stop: () => void };
type Ctx2D = CanvasRenderingContext2D;

function buildMonogram(): { group: THREE.Group; accent: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const s = MONO_WIDTH / VB_W;
  let accentMat: THREE.MeshStandardMaterial | null = null;
  for (const [x, y, w, h, isAccent] of BARS) {
    const mat = new THREE.MeshStandardMaterial({
      color: isAccent ? VERMILION : CREAM,
      roughness: 0.45,
      emissive: isAccent ? VERMILION : '#000000',
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, MONO_DEPTH), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    if (isAccent) accentMat = mat;
  }
  if (!accentMat) throw new Error('monogram: accent bar missing');
  return { group, accent: accentMat };
}

/** A camera-readable plane textured from a 2D canvas we can repaint. */
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

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Paint the button at a given story stage (0 = wireframe … 5+ = shipped CTA). */
function paintButton(ctx: Ctx2D, stage: number) {
  const W = 720;
  const H = 300;
  const bx = 90;
  const by = 90;
  const bw = 540;
  const bh = 120;
  const r = 14;

  // 04 — focus ring (drawn behind)
  if (stage >= 3) {
    ctx.strokeStyle = VERMILION;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    roundRect(ctx, bx - 16, by - 16, bw + 32, bh + 32, r + 10);
    ctx.stroke();
  }

  // 03+ — filled; 01–02 — wireframe only
  if (stage >= 2) {
    ctx.fillStyle = VERMILION;
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
  } else {
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3;
    ctx.setLineDash(stage >= 1 ? [] : [12, 10]);
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 02 — typed signature above the button
  if (stage >= 1) {
    ctx.fillStyle = MUTED;
    ctx.font = "28px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('<Button onPress={mailTo} />', W / 2, 58);
  }

  // label inside the button
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (stage >= 2) {
    ctx.fillStyle = INK;
    ctx.font = "64px 'Instrument Serif', Georgia, serif";
    ctx.fillText(CTA_LABEL, W / 2, by + bh / 2 + 4);
  }

  // 05 — review checks below
  if (stage >= 4) {
    ctx.fillStyle = MUTED;
    ctx.font = "26px 'JetBrains Mono', monospace";
    ctx.fillText('renders ✓   klávesnice ✓   kontrast ✓', W / 2, by + bh + 46);
  }
}

function paintLabel(ctx: Ctx2D, step: { label: string; note: string } | null) {
  if (!step) return;
  const W = 720;
  ctx.textAlign = 'center';
  ctx.fillStyle = VERMILION;
  ctx.font = "30px 'JetBrains Mono', monospace";
  ctx.textBaseline = 'top';
  ctx.fillText(step.label.toUpperCase(), W / 2, 12);
  ctx.fillStyle = CREAM;
  ctx.font = "40px 'Instrument Serif', Georgia, serif";
  ctx.fillText(step.note, W / 2, 60);
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export async function start(container: HTMLElement): Promise<Handle> {
  // brand fonts must be ready before we rasterise them onto canvases
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
  });
  const { renderer, scene, camera } = mindarThree;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(0.5, 1, 1);
  scene.add(key);

  const anchor = mindarThree.addAnchor(0);

  const { group: monogram, accent } = buildMonogram();
  monogram.scale.z = 0.001;
  anchor.group.add(monogram);

  // button + label float above the top edge of the card (card spans y ~ ±0.32)
  const button = makeCanvasPlane(0.6, 720, 300);
  button.mesh.position.set(0, 0.62, 0.04);
  button.mesh.visible = false;
  anchor.group.add(button.mesh);

  const label = makeCanvasPlane(0.6, 720, 110);
  label.mesh.position.set(0, 0.96, 0.04);
  label.mesh.visible = false;
  anchor.group.add(label.mesh);

  let found = false;
  let clock = 0; // ms of story time, advances only while the card is tracked
  let last = 0;
  let paintedStage = -2;
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
    const point = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(point, camera);
    if (raycaster.intersectObject(button.mesh, false).length > 0) {
      window.location.href = `mailto:${email}`;
    }
  };
  renderer.domElement.addEventListener('pointerdown', onTap);

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    if (found) {
      clock += now - last;
      last = now;

      const rise = Math.min(1, clock / RISE_MS);
      monogram.scale.z = Math.max(0.001, easeOutBack(rise));
      monogram.position.z = (MONO_DEPTH / 2) * monogram.scale.z;

      // stage index: -1 before the story, 0..5 across the six beats
      const stage = Math.floor((clock - RISE_MS) / STEP_MS);
      const shown = Math.min(STEPS.length - 1, stage);
      complete = stage >= STEPS.length - 1;

      button.mesh.visible = stage >= 0;
      label.mesh.visible = stage >= 0;
      if (shown !== paintedStage && stage >= 0) {
        paintedStage = shown;
        button.paint((c) => paintButton(c, shown));
        label.paint((c) => paintLabel(c, STEPS[shown]));
      }
      // accent bar glows once the button ships
      accent.emissiveIntensity = complete ? 0.5 + 0.5 * Math.sin(now / 320) : rise * 0.3;
    } else {
      last = now;
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
