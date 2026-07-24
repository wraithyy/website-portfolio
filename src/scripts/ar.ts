/* "It snaps back" — the JK monogram as a physical toy you cannot break.

   The card's QR opens /ar. The printed mark rises off the paper into five solid
   machined bars. Grab any bar and throw it — it springs back into its slot with
   a wobble and a haptic click. Double-tap scatters all five; the mark reassembles
   itself. Drag empty space to spin the whole mark (with inertia); tilt the phone
   (or move the mouse) to rake a vermilion light across it. Pure three.js — no
   camera, no WebXR, no physics engine: art-directed springs. Loaded lazily from
   ar.astro. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clamp01, easeOutBack, easeOutCubic, isTap, lerp } from './ar-math';

const CREAM = '#e8e4dc';
const VERMILION = '#ff5a3c';

// --- calibration knobs (tune on-device; the "wow" lives here, not in the code) ---
const DRAG_SENS = 0.006; // pointer px → radians of whole-mark spin
const FRICTION = 0.94; // post-release spin decay per frame (higher = longer coast)
const SPRING_K = 30; // bar return-spring stiffness (1/s²)
const SPRING_DAMP = 7.0; // < critical (2·√K) → one confident overshoot, then seated
const ROT_K = 30; // torque pulling a tumbling bar back upright
const ROT_DAMP = 7.5;
const BEVEL = 0.009; // chamfered edges — machined objects have chamfers, and the
const BEVEL_T = 0.01; // rim light needs an edge to catch
const SEAT_POS_EPS = 0.01; // "close enough" to click home
const SEAT_VEL_EPS = 0.06;
const GRAB_FOLLOW = 0.55; // grabbed bar → finger follow per frame (1 = rigid)
const GRAB_RANGE = 2.4; // how far a bar can be dragged from centre (world units)
const THROW_TUMBLE = 0.9; // how much a throw sets the bar tumbling
const SCATTER_SPEED = 3.0; // double-tap explosion speed
const TILT_GAIN = 0.4; // how far the object leans with the phone (rad at full tilt)
const LIGHT_RAKE = 2.4; // how far the vermilion rim light travels with tilt (world x)
const TILT_EMA = 0.12; // tilt low-pass (lower = smoother, reads as heft not jitter)
const BAR_ROUGHNESS = 0.55; // cream bars: matte-machined
const ACCENT_ROUGHNESS = 0.34; // accent spine: sharper specular so the light "catches"
const BAR_DEPTH = 0.2; // extrusion depth — deep enough to read as a machined solid
const RISE_MS = 1400; // per-bar rise/thicken duration
const RISE_STAGGER = 140; // ms between successive bars seating
const RISE_DELAY = 550; // ms of "flat / printed" before the rise fires
const DOLLY_FROM = 4.3; // camera z at load…
const DOLLY_TO = 3.3; // …dollying in as the mark rises
const IDLE_AMP = 0.32; // slow auto-lean amplitude when idle & no gyro (rad ratio)
const IDLE_HZ = 0.07; // auto-lean frequency
const MOUSE_GAIN = 0.9; // desktop: pointer position drives the lean (no gyro there)
const TAP_MOVE_PX = 8; // pointer travel under which an up counts as a tap, not a drag
const TAP_MS = 350; // and under this duration
const DOUBLE_TAP_MS = 320; // two taps within this = scatter

// JK monogram bars, from the logo SVG (viewBox 0 0 132 168); 3rd bar is the accent.
const BARS: readonly [number, number, number, number, boolean][] = [
  [0, 89, 25, 79, false],
  [36, 0, 25, 168, false],
  [71, 0, 25, 168, true],
  [107, 0, 25, 79, false],
  [107, 89, 25, 79, false],
];
const VB_W = 132;
const VB_H = 168;
const MONO_WIDTH = 1.12; // world units — the mark is the hero, it fills the frame

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* haptics unsupported (iOS) — silently ignored */
  }
};

type OrientationPermissionApi = {
  requestPermission?: () => Promise<PermissionState | 'granted' | 'denied'>;
};

export type StartOpts = {
  reduceMotion?: boolean;
  label?: string;
  /** A thrown/scattered bar just clicked home. `attempts` = throws + scatters. */
  onSettle?: (attempts: number, allHome: boolean) => void;
  /** Double-tap blew the mark apart. */
  onScatter?: () => void;
};

export type Handle = {
  /** Enable device-tilt lighting. On iOS this must run inside a user gesture
      (it triggers the permission prompt); elsewhere it just attaches the listener. */
  enableTilt: () => Promise<boolean>;
  /** Whether tilt needs a user gesture first (iOS 13+). */
  needsTiltGesture: boolean;
  /** Tear down: stop the loop, dispose GPU resources, remove listeners. */
  stop: () => void;
};

type BarSim = {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  home: THREE.Vector3;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  live: boolean; // under spring physics (thrown / scattered / released)
  grabbed: boolean;
};

function disposeTree(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const mat = node.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}

/** A bar as a chamfered slab (ExtrudeGeometry): outer footprint w×h×BAR_DEPTH,
    centered on the origin, with a small 45° bevel that gives the rim light an
    edge to catch — raw boxes read as plastic. */
function barGeometry(w: number, h: number): THREE.ExtrudeGeometry {
  const iw = w / 2 - BEVEL;
  const ih = h / 2 - BEVEL;
  const shape = new THREE.Shape();
  shape.moveTo(-iw, -ih);
  shape.lineTo(iw, -ih);
  shape.lineTo(iw, ih);
  shape.lineTo(-iw, ih);
  shape.closePath();
  const depth = BAR_DEPTH - 2 * BEVEL_T;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL_T,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function buildMonogram(): { group: THREE.Group; bars: BarSim[]; accentMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const s = MONO_WIDTH / VB_W;
  const bars: BarSim[] = [];
  let accentMesh: THREE.Mesh | null = null;
  for (const [x, y, w, h, accent] of BARS) {
    const mat = new THREE.MeshStandardMaterial({
      color: accent ? VERMILION : CREAM,
      roughness: accent ? ACCENT_ROUGHNESS : BAR_ROUGHNESS,
      metalness: accent ? 0.15 : 0.05,
      // temper the room-env ceiling reflection so the accent stays vermilion at
      // rest — the moving hot streak comes from the raking rim light instead
      envMapIntensity: accent ? 0.55 : 1,
    });
    const mesh = new THREE.Mesh(barGeometry(w * s, h * s), mat);
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    bars.push({
      mesh,
      mat,
      home: mesh.position.clone(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      live: false,
      grabbed: false,
    });
    if (accent) accentMesh = mesh;
  }
  if (!accentMesh) throw new Error('monogram: accent bar missing');
  return { group, bars, accentMesh };
}

/** Soft radial contact shadow on a floor plane below the mark — grounds the
    floating object so it reads as placed, not pasted. */
function makeContactShadow(): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  const g = ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, px);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.95;
  return { mesh, mat };
}

type Tilt = {
  needsGesture: boolean;
  enableTilt: () => Promise<boolean>;
  /** Smoothed lean in [-1,1] per axis, or null while tilt is not active. */
  getLean: () => { gamma: number; beta: number } | null;
  dispose: () => void;
};

function createTilt(): Tilt {
  let enabled = false;
  let gamma = 0;
  let beta = 0;
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    const g = THREE.MathUtils.clamp(e.gamma / 45, -1, 1); // left/right
    const b = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1); // front/back around upright
    gamma = lerp(gamma, g, TILT_EMA);
    beta = lerp(beta, b, TILT_EMA);
  };
  const api: OrientationPermissionApi =
    typeof DeviceOrientationEvent !== 'undefined'
      ? // iOS-only static method, absent from the DOM lib typings — cast is unavoidable
        (DeviceOrientationEvent as unknown as OrientationPermissionApi)
      : {};
  const needsGesture = typeof api.requestPermission === 'function';

  const enableTilt = async (): Promise<boolean> => {
    if (enabled) return true;
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    if (needsGesture && api.requestPermission) {
      try {
        if ((await api.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    window.addEventListener('deviceorientation', onOrient);
    enabled = true;
    return true;
  };

  return {
    needsGesture,
    enableTilt,
    getLean: () => (enabled ? { gamma, beta } : null),
    dispose: () => window.removeEventListener('deviceorientation', onOrient),
  };
}

type GrabControls = {
  hasInteracted: () => boolean;
  /** Advance whole-mark spin inertia; call once per frame with the frame dt. */
  applySpinInertia: (dt: number) => void;
  dispose: () => void;
};

/** Pointer input: grab a bar (drag it, throw it), spin the mark from empty
    space (with inertia), double-tap to scatter. */
function createGrabControls(
  el: HTMLElement,
  camera: THREE.Camera,
  spinner: THREE.Object3D,
  monogram: THREE.Object3D,
  bars: BarSim[],
  opts: { canGrab: () => boolean; onThrow: () => void; onDoubleTap: () => void },
): GrabControls {
  let interacted = false;
  let spinDragging = false;
  let activePointer: number | null = null; // first finger wins; others ignored
  let grabbedBar: BarSim | null = null;
  const grabOffset = new THREE.Vector3();
  const lastLocal = new THREE.Vector3();
  let lastMoveAt = 0;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let lastTapAt = -1e9;
  let vX = 0;
  let vY = 0;
  const qx = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hitPoint = new THREE.Vector3();

  const spin = (dx: number, dy: number) => {
    qy.setFromAxisAngle(axisY, dx);
    qx.setFromAxisAngle(axisX, dy);
    spinner.quaternion.premultiply(qy).premultiply(qx);
  };
  const capture = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* pointer capture is best-effort; some engines throw on edge cases */
    }
  };
  const setRay = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
  };
  /** Pointer ray → point on the z=0 world plane, in monogram-local space. */
  const localPoint = (e: PointerEvent): THREE.Vector3 | null => {
    setRay(e);
    if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return null;
    return monogram.worldToLocal(hitPoint.clone());
  };

  const onDown = (e: PointerEvent) => {
    if (activePointer !== null) return; // a second finger must not steal the grab
    activePointer = e.pointerId;
    interacted = true;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    downAt = performance.now();
    vX = vY = 0;
    capture(() => el.setPointerCapture(e.pointerId));

    if (opts.canGrab()) {
      setRay(e);
      const hits = raycaster.intersectObjects(
        bars.map((b) => b.mesh),
        false,
      );
      const mesh = hits[0]?.object;
      const bar = mesh ? bars.find((b) => b.mesh === mesh) : undefined;
      if (bar) {
        grabbedBar = bar;
        bar.grabbed = true;
        bar.live = true;
        bar.vel.set(0, 0, 0);
        bar.angVel.set(0, 0, 0);
        const p = localPoint(e);
        if (p) {
          grabOffset.copy(p).sub(bar.mesh.position);
          lastLocal.copy(p);
        }
        lastMoveAt = performance.now();
        buzz(6);
        return;
      }
    }
    spinDragging = true;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    if (grabbedBar) {
      const p = localPoint(e);
      if (!p) return;
      const now = performance.now();
      const dt = Math.max(1 / 240, (now - lastMoveAt) / 1000);
      const target = p.clone().sub(grabOffset);
      if (target.length() > GRAB_RANGE) target.setLength(GRAB_RANGE);
      const before = grabbedBar.mesh.position.clone();
      // event-rate-independent follow (120Hz pointers compose to the same feel)
      const alpha = 1 - (1 - GRAB_FOLLOW) ** (dt * 60);
      grabbedBar.mesh.position.lerp(target, alpha);
      // finger velocity, half-smoothed — this becomes the throw
      grabbedBar.vel.lerp(grabbedBar.mesh.position.clone().sub(before).divideScalar(dt), 0.5);
      lastLocal.copy(p);
      lastMoveAt = now;
      return;
    }
    if (!spinDragging) return;
    const dx = (e.clientX - lastX) * DRAG_SENS;
    const dy = (e.clientY - lastY) * DRAG_SENS;
    spin(dx, dy);
    vX = dx;
    vY = dy;
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    capture(() => el.releasePointerCapture(e.pointerId));
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const tap = isTap(moved, performance.now() - downAt, TAP_MOVE_PX, TAP_MS);

    if (grabbedBar) {
      const bar = grabbedBar;
      grabbedBar = null;
      bar.grabbed = false;
      if (tap) {
        // a poke, not a throw — nudge it so it wobbles in place
        bar.vel.set(0, 0, 1.2);
        bar.angVel.set(0.6, 0.6, 0);
      } else {
        // tumble around the axis perpendicular to the motion — deterministic,
        // the return of a well-built thing is never random
        bar.angVel.set(bar.vel.y, -bar.vel.x, 0).multiplyScalar(THROW_TUMBLE);
        opts.onThrow();
      }
    }
    spinDragging = false;

    if (tap) {
      const now = performance.now();
      if (now - lastTapAt < DOUBLE_TAP_MS) {
        lastTapAt = -1e9;
        opts.onDoubleTap();
      } else {
        lastTapAt = now;
      }
      vX = vY = 0;
    }
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return {
    hasInteracted: () => interacted,
    applySpinInertia: (dt: number) => {
      if (spinDragging || grabbedBar) return;
      if (Math.abs(vX) < 1e-4 && Math.abs(vY) < 1e-4) return;
      spin(vX, vY);
      const decay = FRICTION ** (dt * 60); // frame-rate independent coast
      vX *= decay;
      vY *= decay;
    },
    dispose: () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    },
  };
}

/** Damped-spring step for one live bar; returns true the frame it seats home. */
function stepBar(bar: BarSim, dt: number): boolean {
  const { mesh, home, vel, angVel } = bar;
  // position spring toward home
  const acc = home.clone().sub(mesh.position).multiplyScalar(SPRING_K);
  acc.addScaledVector(vel, -SPRING_DAMP);
  vel.addScaledVector(acc, dt);
  mesh.position.addScaledVector(vel, dt);
  // torque spring back upright
  const q = mesh.quaternion;
  const angle = 2 * Math.acos(THREE.MathUtils.clamp(q.w, -1, 1));
  if (angle > 1e-4) {
    const s = Math.sqrt(Math.max(1e-12, 1 - q.w * q.w));
    const axis = new THREE.Vector3(q.x / s, q.y / s, q.z / s);
    const wrapped = angle > Math.PI ? angle - 2 * Math.PI : angle;
    angVel.addScaledVector(axis, -wrapped * ROT_K * dt);
  }
  angVel.multiplyScalar(Math.max(0, 1 - ROT_DAMP * dt));
  const w = angVel.length();
  if (w > 1e-5) {
    const dq = new THREE.Quaternion().setFromAxisAngle(
      angVel.clone().divideScalar(w),
      w * dt,
    );
    mesh.quaternion.premultiply(dq).normalize();
  }
  // seated?
  if (
    mesh.position.distanceTo(home) < SEAT_POS_EPS &&
    vel.length() < SEAT_VEL_EPS &&
    angle < 0.04 &&
    w < 0.12
  ) {
    mesh.position.copy(home);
    mesh.quaternion.identity();
    vel.set(0, 0, 0);
    angVel.set(0, 0, 0);
    bar.live = false;
    return true;
  }
  return false;
}

/** Returns null when WebGL is unavailable so the caller can show a static fallback. */
export function start(container: HTMLElement, opts: StartOpts = {}): Handle | null {
  const reduce = opts.reduceMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // rolls off the hot accent face
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none'; // we own the gesture
  canvas.setAttribute('role', 'img');
  if (opts.label) canvas.setAttribute('aria-label', opts.label);
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.05, DOLLY_FROM);
  camera.lookAt(0, 0, 0);

  // premium matte reflections from the bundled room env — no external HDRI asset
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  disposeTree(room); // throwaway meshes, rendered once into the PMREM target

  // darker ambient: the mark is carved out of the ink by the moving lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x171512, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(0.6, 1.0, 1.0);
  scene.add(key);
  // vermilion rim light — its position is driven by device tilt to rake the accent bar
  const rim = new THREE.DirectionalLight(0xff5a3c, 1.6);
  rim.position.set(0, 0.3, 1.4);
  scene.add(rim);

  // pivot (tilt/idle lean) → spinner (user drag + inertia) → monogram
  const pivot = new THREE.Group();
  const spinner = new THREE.Group();
  pivot.add(spinner);
  scene.add(pivot);

  const { group: monogram, bars } = buildMonogram();
  spinner.add(monogram);

  const shadow = makeContactShadow();
  scene.add(shadow.mesh);

  const riseStart = reduce ? -1e9 : performance.now() + RISE_DELAY; // -inf ⇒ seated
  let riseDone = reduce;
  const riseSpan = RISE_MS + BARS.length * RISE_STAGGER;
  let attempts = 0; // throws + scatters — attempts to break it, not bars seated

  // desktop has no gyro — the pointer position stands in for the tilt
  let mouseX = 0;
  let mouseY = 0;
  let mouseSeen = false;
  const onMouse = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    mouseSeen = true;
    mouseX = (e.clientX / innerWidth) * 2 - 1;
    mouseY = (e.clientY / innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMouse);

  const scatter = () => {
    if (!riseDone) return;
    for (const bar of bars) {
      if (bar.grabbed) continue;
      const dir = bar.home
        .clone()
        .setZ(0)
        .normalize()
        .multiplyScalar(SCATTER_SPEED * (0.75 + Math.random() * 0.5));
      dir.z = 0.8 + Math.random() * 1.2; // pop toward the viewer
      bar.vel.copy(dir);
      bar.angVel.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );
      bar.live = true;
    }
    attempts += 1;
    buzz([18, 30, 18, 30, 28]);
    opts.onScatter?.();
  };

  const controls = createGrabControls(canvas, camera, spinner, monogram, bars, {
    canGrab: () => riseDone,
    onThrow: () => {
      attempts += 1;
      buzz(10);
    },
    onDoubleTap: scatter,
  });
  const tilt = createTilt();
  if (!tilt.needsGesture) void tilt.enableTilt(); // non-iOS fires without a prompt

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let lastFrame = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(1 / 30, (now - lastFrame) / 1000); // clamp tab-switch jumps
    lastFrame = now;

    if (!riseDone) {
      // rise: each bar thickens + lifts toward the viewer, overshooting as it seats
      let allUp = true;
      for (let i = 0; i < bars.length; i++) {
        const t = clamp01((now - riseStart - i * RISE_STAGGER) / RISE_MS);
        const e = easeOutBack(t);
        bars[i].mesh.scale.z = Math.max(0.02, lerp(0.02, 1, e));
        bars[i].mesh.position.z = lerp(-0.3, 0, e);
        if (t < 1) allUp = false;
      }
      if (allUp) {
        riseDone = true;
        for (const b of bars) {
          b.mesh.scale.z = 1;
          b.mesh.position.copy(b.home);
        }
      }
    } else {
      // bar spring physics: anything live chases its home slot
      for (const bar of bars) {
        if (!bar.live || bar.grabbed) continue;
        if (stepBar(bar, dt)) {
          buzz(8); // clicked home
          const allHome = bars.every((b) => !b.live);
          opts.onSettle?.(attempts, allHome);
        }
      }
    }
    const risen = clamp01((now - riseStart) / riseSpan);
    shadow.mat.opacity = risen * 0.65;
    camera.position.z = lerp(DOLLY_FROM, DOLLY_TO, easeOutCubic(risen)); // slow push-in

    controls.applySpinInertia(dt);

    // lean ratio in [-1,1] per axis, by priority: gyro (phone) > mouse (desktop)
    // > slow idle auto-lean; driven directly (never divide by a knob)
    let leanY = 0;
    let leanX = 0;
    const lean = tilt.getLean();
    if (lean) {
      leanY = lean.gamma;
      leanX = -lean.beta;
    } else if (mouseSeen) {
      leanY = mouseX * MOUSE_GAIN;
      leanX = -mouseY * MOUSE_GAIN * 0.5;
    } else if (!reduce && !controls.hasInteracted()) {
      const phase = (now / 1000) * IDLE_HZ * Math.PI * 2;
      leanY = Math.sin(phase) * IDLE_AMP;
      leanX = Math.cos(phase) * IDLE_AMP * 0.4;
    }
    pivot.rotation.y = leanY * TILT_GAIN;
    pivot.rotation.x = leanX * TILT_GAIN;
    rim.position.x = leanY * LIGHT_RAKE;
    rim.position.y = 0.3 + leanX * 0.8;

    renderer.render(scene, camera);
  });

  return {
    enableTilt: tilt.enableTilt,
    needsTiltGesture: tilt.needsGesture,
    stop: () => {
      renderer.setAnimationLoop(null);
      controls.dispose();
      tilt.dispose();
      window.removeEventListener('pointermove', onMouse);
      ro.disconnect();
      for (const b of bars) {
        b.mesh.geometry.dispose();
        b.mat.dispose();
      }
      shadow.mesh.geometry.dispose();
      shadow.mat.map?.dispose();
      shadow.mat.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
