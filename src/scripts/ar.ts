/* WebAR business-card experience.
   Scan the printed card's QR → this page → point the camera at the card back
   (asymmetric editorial target compiled into public/ar/card.mind). The JK
   monogram and an angular "napiš mi" button rise out of the card, built the way
   Josef builds software; the button is tappable (mailto), tapping the monogram
   replays it.

   Stability model (learned across many iterations):
   - Content is parented to a scene-level `holder`, NOT to anchor.group. Each
     frame we READ MindAR's pose and drive the holder — position direct, rotation
     damped (EMA/slerp). Writing back into anchor.group fought MindAR; reading out
     does not. Rotation is the noisiest DOF, so damping it kills most jitter.
   - Content sits LOW on the card (small elevation). Elevation multiplies angular
     pose noise into lateral wobble, so we keep it flat and sell "rising" with an
     occluder reveal + a contact shadow instead of height.
   - Layout uses the card's wide (landscape) axis and stays inside the tracked
     area; nothing overflows the weak top/bottom edges.
   Loaded lazily from ar.astro. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
// mind-ar treats `three` as a peer dep → single shared THREE instance
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { email } from '../data/site';

const CREAM = '#e8e4dc';
const VERMILION = '#ff5a3c';
const INK = '#121110';

// --- tuning knobs (safe to tweak on-device) ---------------------------------
const FILTER_MIN_CF = 0.0001; // MindAR One-Euro: lower = steadier when still
const FILTER_BETA = 1;
const MISS_TOLERANCE = 10; // ride through brief blur without blinking out
const WARMUP_TOLERANCE = 3;
const SMOOTH_ROT = 0.35; // rotation EMA on the holder (lower = steadier, more lag)
const RISE_MS = 1000; // monogram grow-in
const BAR_STAGGER_MS = 130;
const STEP_MS = 1100; // per story beat
const TYPE_MS = 40; // typewriter speed per char
const HOVER_AMP = 0.004; // float bob (kept tiny — it reads as instability if large)
const HOVER_HZ = 0.28;
const SWEEP_MS = 750; // the single vermilion hairline payoff

// --- JK monogram bars, from the logo SVG (viewBox 0 0 132 168) ---
const BARS: [number, number, number, number, boolean][] = [
  [0, 89, 25, 79, false],
  [36, 0, 25, 168, false],
  [71, 0, 25, 168, true],
  [107, 0, 25, 79, false],
  [107, 89, 25, 79, false],
];
const VB_W = 132;
const VB_H = 168;
// landscape layout: monogram dominant on the left, button on the right
const MONO_WIDTH = 0.3;
const MONO_DEPTH = 0.05;
const MONO_X = -0.26;
const MONO_Y = 0.0;

const STEPS = [
  { label: '01 — Architektura', note: 'nejdřív nakreslím hranici' },
  { label: '02 — TypeScript', note: 'otypuju, jak komunikuje' },
  { label: '03 — Design systémy', note: 'každý stav rozhodnutý jednou' },
  { label: '04 — Přístupnost', note: 'funguje pro každou ruku' },
  { label: '05 — Review & AI', note: 'renders ✓ klávesnice ✓ kontrast ✓' },
  { label: '06 — Dodávka', note: 'nasazeno. zmáčkni tlačítko.' },
];
const CTA_LABEL = 'NAPIŠ MI →';

const BTN_W = 0.26;
const BTN_H = 0.1;
const BTN_DEPTH = 0.04;
const BTN_X = 0.24;
const BTN_Y = -0.02;
const BTN_LIFT = 0.03;
const SOCKET_M = 0.045;

const BLOCK_COUNT = 6;

type Handle = { stop: () => void; replay: () => void; skip: () => void };
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
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    new THREE.LineBasicMaterial({ color }),
  );
}

/** Invisible depth-only plane on the card surface so content below it is culled
    → risen geometry appears to emerge from the card. */
function makeOccluder() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.1),
    new THREE.MeshBasicMaterial({ colorWrite: false }),
  );
  mesh.position.z = -0.001;
  mesh.renderOrder = -1;
  return mesh;
}

/** A thin ink slab under the whole reveal: gives cream geometry guaranteed
    contrast over any camera background and makes it read as placed, not floating. */
function makeGround(w: number, h: number) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0 }),
  );
  mesh.renderOrder = 0;
  return mesh;
}

function makeContactShadow(worldW: number, worldH: number) {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  // offset toward the light-opposite corner (key light is +x,+y) and soften
  const g = ctx.createRadialGradient(px * 0.42, px * 0.58, 0, px * 0.5, px * 0.5, px * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, px);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW, worldH),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }),
  );
  mesh.renderOrder = 1;
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
      roughness: 0.6,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, MONO_DEPTH), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    bars.push(mesh);
    barMats.push(mat);
  }
  group.position.set(MONO_X, MONO_Y, 0);
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
  texture.anisotropy = 8;
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

function roundRectPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function build3DButton() {
  const group = new THREE.Group();

  const socket = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W + SOCKET_M, BTN_H + SOCKET_M),
    new THREE.MeshBasicMaterial({ color: '#050504' }),
  );
  const rim = rectOutline(BTN_W + SOCKET_M, BTN_H + SOCKET_M, CREAM);
  rim.position.z = 0.002;
  socket.add(floor, rim);

  const geo = new THREE.BoxGeometry(BTN_W, BTN_H, BTN_DEPTH); // sharp 90° edges (brand)
  const solidMat = new THREE.MeshStandardMaterial({ color: VERMILION, roughness: 0.5, metalness: 0 });
  const solid = new THREE.Mesh(geo, solidMat);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: CREAM }),
  );

  const label = makeCanvasPlane(BTN_W * 0.92, 512, Math.round((512 * BTN_H) / BTN_W));
  label.paint((c) => {
    c.fillStyle = INK;
    fitFont(c, CTA_LABEL, "'JetBrains Mono', monospace", c.canvas.width * 0.82, 120);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(CTA_LABEL, c.canvas.width / 2, c.canvas.height / 2 + 4);
  });
  label.mesh.position.z = BTN_DEPTH / 2 + 0.003;
  solid.add(label.mesh);

  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W * 1.5, BTN_H * 2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.z = BTN_DEPTH / 2 + 0.01;
  solid.add(hit);

  group.add(socket, solid, edges);
  group.position.set(BTN_X, BTN_Y, 0);
  return { group, solid, solidMat, edges, hit };
}

function makeAssembly() {
  const group = new THREE.Group();
  const blocks: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; from: THREE.Vector3 }[] = [];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.6, metalness: 0, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), mat);
    const a = (i / BLOCK_COUNT) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a) * 0.16, Math.sin(a) * 0.1, 0.12 + (i % 3) * 0.04);
    group.add(mesh);
    blocks.push({ mesh, mat, from });
  }
  group.position.z = BTN_LIFT;
  group.visible = false;
  return { group, blocks };
}

/** The single editorial payoff: a crisp vermilion hairline sweeps across the
    card once (a 3D echo of the card's rule / the site's reveal wipe). */
function makeSweep() {
  const mat = new THREE.MeshBasicMaterial({ color: VERMILION, transparent: true, opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.5), mat);
  mesh.position.z = 0.02;
  mesh.renderOrder = 3;
  mesh.visible = false;
  return { mesh, mat };
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* haptics unsupported */
  }
};

export async function start(
  container: HTMLElement,
  opts: { onComplete?: () => void; onFound?: () => void; onLost?: () => void } = {},
): Promise<Handle> {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    await document.fonts.ready;
  } catch {
    /* fonts API optional */
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

  // soft environment reflections → matte materials read premium, not plastic
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(0.4, 0.8, 1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-0.6, -0.3, 0.8);
  scene.add(fill);

  const anchor = mindarThree.addAnchor(0);
  anchor.group.add(makeOccluder()); // occluder tracks the card exactly

  // everything else lives in a holder we drive from the (rotation-damped) pose
  const holder = new THREE.Group();
  holder.visible = false;
  scene.add(holder);

  const ground = makeGround(0.78, 0.42);
  ground.position.z = 0.001;
  holder.add(ground);

  const shadow = makeContactShadow(0.85, 0.5);
  shadow.position.z = 0.0015;
  holder.add(shadow);

  const { group: monogram, bars, barMats, accent } = buildMonogram();
  holder.add(monogram);

  const btn = build3DButton();
  btn.group.visible = false;
  holder.add(btn.group);

  const assembly = makeAssembly();
  btn.group.add(assembly.group);

  const sweep = makeSweep();
  holder.add(sweep.mesh);

  const caption = makeCanvasPlane(0.5, 720, 190);
  caption.mesh.position.set(BTN_X, BTN_Y - 0.16, 0.01);
  caption.mesh.renderOrder = 2;
  caption.mesh.visible = false;
  holder.add(caption.mesh);

  let found = false;
  let clock = 0;
  let last = 0;
  let painted = -1;
  let stepShownAt = 0;
  let lastReveal = -1;
  let complete = false;
  let buzzedComplete = false;
  let sweepAt = -1;
  let tappable = false;
  let pressing = 0;
  const landAt = bars.map(() => -1);
  const TOTAL_MS = RISE_MS + STEPS.length * STEP_MS;

  anchor.onTargetFound = () => {
    found = true;
    last = performance.now();
    opts.onFound?.();
  };
  anchor.onTargetLost = () => {
    found = false;
    opts.onLost?.();
  };

  const raycaster = new THREE.Raycaster();
  const monoHitTargets = monogram.children;
  const onTap = (e: PointerEvent) => {
    if (!found || !holder.visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(p, camera);
    if (tappable && raycaster.intersectObjects([btn.solid, btn.hit], true).length > 0) {
      pressing = performance.now();
      buzz(18);
      setTimeout(() => {
        window.location.href = `mailto:${email}`;
      }, 200);
    } else if (complete && raycaster.intersectObjects(monoHitTargets, false).length > 0) {
      handle.replay(); // tapping the monogram replays the build
      buzz(10);
    }
  };
  window.addEventListener('pointerdown', onTap, true);

  const paintCaption = (step: (typeof STEPS)[number], chars: number) =>
    caption.paint((c) => {
      const w = c.canvas.width;
      const h = c.canvas.height;
      // ink plate for guaranteed legibility over the camera feed
      c.fillStyle = 'rgba(18,17,16,0.82)';
      roundRectPath(c, 10, 10, w - 20, h - 20, 10);
      c.fill();
      c.textAlign = 'center';
      c.fillStyle = VERMILION;
      c.font = "36px 'JetBrains Mono', monospace";
      c.textBaseline = 'top';
      c.fillText(step.label.toUpperCase(), w / 2, 34);
      c.fillStyle = CREAM;
      fitFont(c, step.note, "'Instrument Serif', Georgia, serif", w * 0.9, 58);
      c.fillText(step.note.slice(0, chars), w / 2, 96);
    });

  const tPos = new THREE.Vector3();
  const tQuat = new THREE.Quaternion();
  const tScale = new THREE.Vector3();

  const resetStory = () => {
    clock = 0;
    last = performance.now();
    landAt.fill(-1);
    painted = -1;
    lastReveal = -1;
    stepShownAt = 0;
    complete = false;
    buzzedComplete = false;
    sweepAt = -1;
    tappable = false;
    pressing = 0;
    sweep.mesh.visible = false;
  };

  const handle: Handle = {
    replay: resetStory,
    skip: () => {
      clock = Math.max(clock, TOTAL_MS); // jump to the finished state
    },
    stop: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('pointerdown', onTap, true);
      mindarThree.stop();
      pmrem.dispose();
      const video = container.querySelector('video');
      const stream = video && video.srcObject instanceof MediaStream ? video.srcObject : null;
      stream?.getTracks().forEach((t) => t.stop());
    },
  };

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    if (found) clock += reduceMotion ? TOTAL_MS : now - last; // reduced motion → jump to end
    last = now;

    // --- drive the holder from the pose: position direct, rotation damped ---
    holder.visible = anchor.group.visible && found;
    if (holder.visible) {
      anchor.group.matrix.decompose(tPos, tQuat, tScale);
      holder.position.copy(tPos);
      holder.scale.copy(tScale);
      holder.quaternion.slerp(tQuat, SMOOTH_ROT);
    }
    if (!holder.visible) {
      renderer.render(scene, camera);
      return;
    }

    const bob = Math.sin(((now / 1000) * HOVER_HZ) * Math.PI * 2) * HOVER_AMP;
    const rise = clamp01(clock / RISE_MS);
    if (shadow.material instanceof THREE.MeshBasicMaterial) shadow.material.opacity = rise * 0.55;
    if (ground.material instanceof THREE.MeshBasicMaterial) ground.material.opacity = rise * 0.9;

    // monogram: bars rise up through the surface, flash as they seat
    for (let i = 0; i < bars.length; i++) {
      const r = clamp01((clock - i * BAR_STAGGER_MS) / RISE_MS);
      const e = easeOutCubic(r);
      bars[i].position.z = lerp(-MONO_DEPTH / 2, MONO_DEPTH / 2, e) + bob * r;
      if (r >= 1 && landAt[i] < 0) {
        landAt[i] = clock;
        buzz(8);
      }
      barMats[i].emissiveIntensity = 0;
    }

    // story / button
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
        buzz(12);
      }
      const note = STEPS[shown].note;
      const reveal = Math.min(note.length, Math.floor((clock - stepShownAt) / TYPE_MS));
      if (reveal !== lastReveal) {
        lastReveal = reveal;
        paintCaption(STEPS[shown], reveal);
      }

      const emerge = step >= 2 ? clamp01(stageF - 2) : 0;
      btn.solid.visible = step >= 2;
      btn.edges.visible = step < 2;
      tappable = step >= 2 && emerge > 0.8;

      const press = pressing ? Math.max(0, 1 - (now - pressing) / 200) : 0;
      btn.solid.position.z = lerp(-BTN_DEPTH / 2, BTN_LIFT, easeOutCubic(emerge)) + bob - press * (BTN_LIFT + BTN_DEPTH / 2);

      const conv = clamp01(stageF - 1);
      const solidFull = step >= 2 && emerge > 0.85;
      assembly.group.visible = (step === 1 || step === 2) && !solidFull;
      for (const { mesh, mat, from } of assembly.blocks) {
        const spread = 1 - conv;
        mesh.position.set(from.x * spread, from.y * spread, from.z * spread);
        mesh.scale.setScalar(Math.max(0.001, step >= 2 ? 1 - emerge : 0.25 + 0.75 * conv));
        mat.opacity = step >= 2 ? 1 - emerge : 1;
      }

      if (complete && !buzzedComplete) {
        buzzedComplete = true;
        sweepAt = clock;
        buzz([16, 45, 24]);
        opts.onComplete?.();
      }
    }

    // single hairline sweep payoff
    if (sweepAt >= 0) {
      const t = clamp01((clock - sweepAt) / SWEEP_MS);
      sweep.mesh.visible = t < 1;
      sweep.mesh.position.x = lerp(-0.42, 0.42, easeOutCubic(t));
      sweep.mat.opacity = Math.sin(t * Math.PI); // fade in/out across the pass
    }

    renderer.render(scene, camera);
  });

  await mindarThree.start(); // prompts for camera

  // sharpen tracking: continuous autofocus + a decent resolution (iOS ignores unknown keys)
  const video = container.querySelector('video');
  const track =
    video?.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : null;
  await track
    ?.applyConstraints({ advanced: [{ focusMode: 'continuous' }, { width: 1280, height: 720 }] })
    .catch(() => {});

  // recompute MindAR's cover-size once the video actually has dimensions and on
  // orientation/resize — fixes the intermittent letterbox.
  const kick = () => window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(kick);
  for (const t of [250, 800, 1500]) setTimeout(kick, t);
  video?.addEventListener('loadedmetadata', kick);
  video?.addEventListener('playing', kick);
  addEventListener('orientationchange', kick);

  return handle;
}
