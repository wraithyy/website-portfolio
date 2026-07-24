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
const ACCENT_K_MUL = 3.4; // the opinion bar: returns much faster…
const ACCENT_DAMP_MUL = 1.7; // …and lands decisively, without the wobble
const RAGE_N = 3; // this many throws…
const RAGE_WINDOW_MS = 5000; // …within this window = the mark shakes its head
const COLOR_LERP = 4; // per-second rate for the finale colour morph
// the forge: after the finale blast, the cream bars strike the button one by
// one from behind — each impact kicks the camera, spikes the light and grows
// the button a step. The capabilities literally forge the button.
const FORGE_DELAY = 750; // ms of scattered suspense before the first strike
const FORGE_GAP = 260; // ms after a strike lands before the next bar launches
const FORGE_KICK = 0.09; // camera punch-in per impact (world units)
const FORGE_SPIKE = 2.4; // rim-light surge per impact
const GROW_MS = 300; // per-strike button growth tween (easeOutBack, fixed length)
const TILT_GRAV = 1.7; // phone tilt (or mouse) = gravity for loose bars — they slide
const SHAKE_THRESHOLD = 14; // m/s² of device shake that triggers a scatter
const SHAKE_DEBOUNCE_MS = 1600;
const SPILL_ON = 0.55; // gyro lean beyond this breaks the seated bars loose…
const SPILL_OFF = 0.38; // …and levelling back under this snaps them home
const SPILL_GRAV = 4.2; // downhill acceleration while spilled
const SPILL_RANGE = 1.5; // how far the spilled bars may slide
const HOVER_LIFT = 0.12; // hovered button face rises toward the viewer
const HOVER_GLOW = 0.9; // extra rim light while hovered
const BEVEL = 0.009; // chamfered edges — machined objects have chamfers, and the
const BEVEL_T = 0.01; // rim light needs an edge to catch
const SEAT_POS_EPS = 0.01; // "close enough" to click home
const SEAT_VEL_EPS = 0.06;
const GRAB_RANGE = 2.4; // how far a bar can be dragged from centre (world units)
// held-bar rigid body: a stiff spring pins the GRIP POINT to the finger; the
// constraint force also torques the bar (τ = r × F), so off-centre grabs swing
// and circular finger motion genuinely spins it up — short bars spin faster
// (smaller moment of inertia), the real thing
const GRIP_K = 140; // grip-to-finger spring stiffness (1/s²)
const GRIP_LIN_DAMP = 9; // linear damping while held (tracks without oscillating)
const GRIP_ANG_DAMP = 1.1; // angular damping while held — low, so spins persist
const ACCENT_MASS = 2.4; // the opinion bar is heavier to swing and to spin
const ANGVEL_MAX = 22; // rad/s cap so a wild fling can't spin-blur the bar
const HOME_PULL = 3.4; // a held bar strains toward its slot — you feel it resist
const FINALE_AT = 10; // double-taps before the mark concedes the button
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
const IDENTITY_Q = new THREE.Quaternion();

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

export type SceneMode = 'mark' | 'button';

export type StartOpts = {
  reduceMotion?: boolean;
  label?: string;
  /** A thrown/scattered bar just clicked home. `attempts` = throws + scatters. */
  onSettle?: (attempts: number, allHome: boolean) => void;
  /** Double-tap blew the mark apart; `count` = how many double-taps so far. */
  onScatter?: (count: number) => void;
  /** First throw of the vermilion accent bar (the opinion). */
  onAccentThrow?: () => void;
  /** Rapid-fire throws — the mark just shook its head. */
  onRage?: () => void;
  /** The bars finished reassembling into a new shape (mark ⇄ button). */
  onMode?: (mode: SceneMode) => void;
};

export type Handle = {
  /** Enable device-tilt lighting. On iOS this must run inside a user gesture
      (it triggers the permission prompt); elsewhere it just attaches the listener. */
  enableTilt: () => Promise<boolean>;
  /** Whether tilt needs a user gesture first (iOS 13+). */
  needsTiltGesture: boolean;
  /** Hovering the CTA label lifts the 3D button face and brightens the light. */
  setCtaHover: (hover: boolean) => void;
  /** Tear down: stop the loop, dispose GPU resources, remove listeners. */
  stop: () => void;
};

type BarSim = {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  accent: boolean;
  home: THREE.Vector3; // current target slot (mark or button formation)
  homeQuat: THREE.Quaternion;
  markHome: THREE.Vector3; // the monogram slot, to restore after the finale
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  baseEnv: number;
  targetEnv: number;
  targetScale: THREE.Vector3; // button formation stretches the short bars
  kMul: number; // per-bar spring stiffness multiplier (the opinion bar is stiffer)
  dampMul: number;
  mass: number;
  invI: number; // inverse moment of inertia — short bars spin up faster
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  live: boolean; // under spring physics (thrown / scattered / released)
  launchAt: number; // forge choreography: the spring engages only after this
  grabbed: boolean;
  /** While held: finger point + grip offset (bar frame) driving the swing. */
  grip: { target: THREE.Vector3; offset: THREE.Vector3 } | null;
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
    // clearcoat over matte body = lacquered ceramic, not raw CG plastic
    const mat = new THREE.MeshPhysicalMaterial({
      color: accent ? VERMILION : CREAM,
      roughness: accent ? ACCENT_ROUGHNESS : BAR_ROUGHNESS,
      metalness: accent ? 0.15 : 0.05,
      clearcoat: accent ? 0.9 : 0.55,
      clearcoatRoughness: 0.28,
      // temper the room-env ceiling reflection so the accent stays vermilion at
      // rest — the moving hot streak comes from the raking rim light instead
      envMapIntensity: accent ? 0.55 : 1,
    });
    const mesh = new THREE.Mesh(barGeometry(w * s, h * s), mat);
    mesh.castShadow = true;
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    group.add(mesh);
    bars.push({
      mesh,
      mat,
      accent,
      home: mesh.position.clone(),
      homeQuat: new THREE.Quaternion(),
      markHome: mesh.position.clone(),
      baseColor: mat.color.clone(),
      targetColor: mat.color.clone(),
      baseEnv: mat.envMapIntensity,
      targetEnv: mat.envMapIntensity,
      targetScale: new THREE.Vector3(1, 1, 1),
      kMul: accent ? ACCENT_K_MUL : 1,
      dampMul: accent ? ACCENT_DAMP_MUL : 1,
      mass: accent ? ACCENT_MASS : 1,
      // slender-rod approximation: I ∝ (length² + depth²) / 12
      invI: 12 / ((h * s) ** 2 + BAR_DEPTH ** 2),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      live: false,
      launchAt: -1e9,
      grabbed: false,
      grip: null,
    });
    if (accent) accentMesh = mesh;
  }
  if (!accentMesh) throw new Error('monogram: accent bar missing');
  return { group, bars, accentMesh };
}

/** Real cast shadows on an invisible floor — bars in flight throw moving
    shadows, which is what makes them read as objects instead of CG sprites. */
function makeShadowFloor(): { mesh: THREE.Mesh; mat: THREE.ShadowMaterial } {
  const mat = new THREE.ShadowMaterial({ opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.95;
  mesh.receiveShadow = true;
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
  opts: {
    canGrab: () => boolean;
    canSpin: () => boolean;
    onThrow: (accent: boolean) => void;
    onDoubleTap: () => void;
  },
): GrabControls {
  let interacted = false;
  let spinDragging = false;
  let activePointer: number | null = null; // first finger wins; others ignored
  let grabbedBar: BarSim | null = null;
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
        const p = localPoint(e);
        if (!p) return;
        grabbedBar = bar;
        bar.grabbed = true;
        bar.live = true;
        bar.vel.set(0, 0, 0);
        // grip offset in the BAR's frame — grabbing an end makes it swing there
        const offset = p
          .clone()
          .sub(bar.mesh.position)
          .applyQuaternion(bar.mesh.quaternion.clone().invert());
        bar.grip = { target: p.clone(), offset };
        buzz(6);
        return;
      }
    }
    if (opts.canSpin()) spinDragging = true;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    if (grabbedBar?.grip) {
      const p = localPoint(e);
      if (p) grabbedBar.grip.target.copy(p); // the loop integrates the swing
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
      bar.grip = null;
      if (tap) {
        // a poke, not a throw — nudge it so it wobbles in place
        bar.vel.set(0, 0, 1.2);
        bar.angVel.set(0.6, 0.6, 0);
      } else {
        // the swing already gave it real velocity + spin — release as-is
        opts.onThrow(bar.accent);
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

/** One frame of a HELD bar — a small rigid body pinned to the finger by a
    stiff spring at the GRIP POINT. The constraint force both drags the centre
    and torques the bar (τ = r × F): grab an end and it hangs and swings; move
    the finger in circles and it genuinely spins up. Release keeps the momentum. */
function gripStep(bar: BarSim, dt: number) {
  const grip = bar.grip;
  if (!grip) return;
  const { mesh, vel, angVel } = bar;
  const worldOffset = grip.offset.clone().applyQuaternion(mesh.quaternion);
  const gripPos = mesh.position.clone().add(worldOffset);
  const force = grip.target.clone().sub(gripPos).multiplyScalar(GRIP_K);
  vel.addScaledVector(force, dt / bar.mass);
  // not gravity — homesickness: the bar strains back toward its slot, so you
  // feel it resist the grip and lean home the moment you loosen up
  vel.addScaledVector(bar.home.clone().sub(mesh.position), (HOME_PULL * dt) / bar.mass);
  vel.multiplyScalar(Math.max(0, 1 - GRIP_LIN_DAMP * dt));
  angVel.addScaledVector(
    worldOffset.clone().cross(force),
    (dt * bar.invI) / bar.mass,
  );
  angVel.multiplyScalar(Math.max(0, 1 - GRIP_ANG_DAMP * dt));
  angVel.clampLength(0, ANGVEL_MAX);
  mesh.position.addScaledVector(vel, dt);
  if (mesh.position.length() > GRAB_RANGE) mesh.position.setLength(GRAB_RANGE);
  const w = angVel.length();
  if (w > 1e-5) {
    const dq = new THREE.Quaternion().setFromAxisAngle(angVel.clone().divideScalar(w), w * dt);
    mesh.quaternion.premultiply(dq).normalize();
  }
}

/** Damped-spring step for one live bar; returns true the frame it seats home. */
function stepBar(bar: BarSim, dt: number): boolean {
  const { mesh, home, homeQuat, vel, angVel } = bar;
  // position spring toward home
  const acc = home.clone().sub(mesh.position).multiplyScalar(SPRING_K * bar.kMul);
  acc.addScaledVector(vel, -SPRING_DAMP * bar.dampMul);
  vel.addScaledVector(acc, dt);
  mesh.position.addScaledVector(vel, dt);
  // torque spring toward the target orientation
  const qErr = mesh.quaternion.clone().multiply(homeQuat.clone().invert());
  const angle = 2 * Math.acos(THREE.MathUtils.clamp(qErr.w, -1, 1));
  if (angle > 1e-4) {
    const s = Math.sqrt(Math.max(1e-12, 1 - qErr.w * qErr.w));
    const axis = new THREE.Vector3(qErr.x / s, qErr.y / s, qErr.z / s);
    const wrapped = angle > Math.PI ? angle - 2 * Math.PI : angle;
    angVel.addScaledVector(axis, -wrapped * ROT_K * bar.kMul * dt);
  }
  angVel.multiplyScalar(Math.max(0, 1 - ROT_DAMP * bar.dampMul * dt));
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
    mesh.quaternion.copy(homeQuat);
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(0.9, 1.6, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.2;
  key.shadow.camera.right = 2.2;
  key.shadow.camera.top = 2.2;
  key.shadow.camera.bottom = -2.2;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 8;
  key.shadow.radius = 6; // soft penumbra
  key.shadow.bias = -0.0005;
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

  const shadow = makeShadowFloor();
  scene.add(shadow.mesh);

  const riseStart = reduce ? -1e9 : performance.now() + RISE_DELAY; // -inf ⇒ seated
  let riseDone = reduce;
  const riseSpan = RISE_MS + BARS.length * RISE_STAGGER;
  let attempts = 0; // throws + scatters — attempts to break it, not bars seated
  let mode: SceneMode = 'mark';
  let pendingMode: SceneMode | null = null;
  let scatterCount = 0; // double-taps so far; the FINALE_AT-th one earns the button
  let accentThrown = false;
  let shakeAt = -1e9; // defiant head-shake timestamp (rage response)
  let timeScale = 1; // finale slow-motion: drops to ~0.25, eases back to 1
  let flashAt = -1e9; // coronation light flash timestamp
  let impactAt = -1e9; // last forge strike (camera kick + light spike)
  let absorbed = 0; // cream bars forged into the button so far
  let lastShake = -1e9;
  let spilling = false; // gyro tilt past SPILL_ON: the bars slide downhill
  let ctaHover = false;
  let hoverGlow = 0; // smoothed 0..1 hover state driving the lift + light
  let forgeQueue: BarSim[] = []; // strike order — each launches when the previous lands
  // per-strike growth tween: fixed-length easeOutBack, immune to frame rate
  let growStart = -1e9;
  const growFrom = new THREE.Vector3(1, 1, 1);
  const growTo = new THREE.Vector3(1, 1, 1);
  const throwTimes: number[] = [];

  // the finale formation: THE OPINION BECOMES THE BUTTON. The vermilion bar
  // turns 90° and stretches into the button face; the other four visibly tuck
  // into a neat depth-stack behind it, swallowed by the thing they built.
  const zRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  const BUTTON_SLOTS: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }[] = [
    // shorts + tall → hide in a tidy stack behind the face, front to back
    { pos: new THREE.Vector3(0, 0.05, -0.46), quat: zRot.clone(), scale: new THREE.Vector3(1, 1, 0.9) },
    { pos: new THREE.Vector3(0, 0, -0.32), quat: zRot.clone(), scale: new THREE.Vector3(0.9, 0.92, 0.9) },
    // the accent IS the button: widened cross-section, deeper body
    { pos: new THREE.Vector3(0, 0, 0), quat: zRot.clone(), scale: new THREE.Vector3(2.3, 1, 1.5) },
    { pos: new THREE.Vector3(0, -0.05, -0.46), quat: zRot.clone(), scale: new THREE.Vector3(1, 1, 0.9) },
    { pos: new THREE.Vector3(0, 0, -0.6), quat: zRot.clone(), scale: new THREE.Vector3(1, 1, 0.9) },
  ];
  // deeper than the token — the white key/hemisphere lights lift it back up to
  // brand vermilion on screen (targeting #ff5a3c directly renders salmon)
  const vermilion = new THREE.Color('#d13a1e');

  const BTN_SCALE_FROM = new THREE.Vector3(1.15, 1, 1.1); // pre-forge button size…
  const BTN_SCALE_TO = BUTTON_SLOTS[2].scale.clone(); // …grows a step per strike

  const setTargets = (m: SceneMode) => {
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      if (m === 'button') {
        bar.home.copy(BUTTON_SLOTS[i].pos);
        bar.homeQuat.copy(BUTTON_SLOTS[i].quat);
        // only the accent deepens (stays saturated under the white lights);
        // the hidden four keep their cream — they're visibly tucked away, not dyed
        if (bar.accent) {
          bar.targetColor.copy(vermilion);
          bar.targetEnv = 0.3;
          // starts small — each forge strike grows it toward BTN_SCALE_TO
          bar.targetScale.copy(BTN_SCALE_FROM);
        } else {
          bar.targetScale.copy(BUTTON_SLOTS[i].scale);
        }
      } else {
        bar.home.copy(bar.markHome);
        bar.homeQuat.identity();
        bar.targetColor.copy(bar.baseColor);
        bar.targetEnv = bar.baseEnv;
        bar.targetScale.set(1, 1, 1);
      }
    }
  };

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

  const blast = () => {
    for (const bar of bars) {
      if (bar.grabbed) continue;
      const dir = bar.markHome
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
  };

  const scatter = () => {
    if (!riseDone) return;
    attempts += 1;
    scatterCount += 1;
    const now = performance.now();
    for (const bar of bars) bar.launchAt = now; // default: springs engage at once
    if (mode === 'button') {
      // once the button exists, double-tap toggles the two shapes
      pendingMode = 'mark';
      setTargets('mark');
    } else if (scatterCount >= FINALE_AT) {
      // the tenth attempt earns the button — slow the world, then FORGE it:
      // the accent forms the face first, the cream bars strike it one by one
      pendingMode = 'button';
      absorbed = 0;
      setTargets('button');
      if (!reduce) {
        timeScale = 0.25;
        // strike chain: only the first cream bar launches now — each next one
        // waits until the previous strike has landed and grown the button
        forgeQueue = bars.filter((b) => !b.accent);
        forgeQueue.forEach((b, i) => {
          b.launchAt = i === 0 ? now + FORGE_DELAY : Number.POSITIVE_INFINITY;
        });
      }
    }
    blast();
    buzz([18, 30, 18, 30, 28]);
    opts.onScatter?.(scatterCount);
  };

  // shake the phone = scatter. devicemotion is permission-free where we attach
  // it (Android/desktop); iOS gates it behind a prompt, so it simply stays off.
  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.acceleration;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    if (Math.hypot(a.x, a.y, a.z) < SHAKE_THRESHOLD) return;
    const now = performance.now();
    if (now - lastShake < SHAKE_DEBOUNCE_MS) return;
    lastShake = now;
    scatter();
  };
  const motionGated =
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as OrientationPermissionApi).requestPermission ===
      'function';
  if (typeof DeviceMotionEvent !== 'undefined' && !motionGated) {
    window.addEventListener('devicemotion', onMotion);
  }
  /** iOS gates motion + orientation behind one system prompt; called from the
      first user gesture it unlocks tilt light, spill and shake in one go. */
  const enableMotionAndTilt = async (): Promise<boolean> => {
    const ok = await tilt.enableTilt();
    if (motionGated) {
      try {
        // same static-method shape as DeviceOrientationEvent — cast unavoidable
        const api = DeviceMotionEvent as unknown as OrientationPermissionApi;
        if ((await api.requestPermission?.()) === 'granted') {
          window.addEventListener('devicemotion', onMotion);
        }
      } catch {
        /* denied — shake stays off, everything else keeps working */
      }
    }
    return ok;
  };

  const controls = createGrabControls(canvas, camera, spinner, monogram, bars, {
    // the button is a button — no grabbing, no spinning; the mark is the toy
    canGrab: () => riseDone && mode !== 'button' && pendingMode !== 'button',
    canSpin: () => mode === 'mark' && pendingMode !== 'button',
    onThrow: (accent) => {
      attempts += 1;
      buzz(10);
      if (accent && !accentThrown) {
        accentThrown = true;
        opts.onAccentThrow?.();
      }
      // rapid-fire throws → the mark shakes its head at you
      const now = performance.now();
      throwTimes.push(now);
      while (throwTimes.length && now - throwTimes[0] > RAGE_WINDOW_MS) throwTimes.shift();
      if (throwTimes.length >= RAGE_N) {
        throwTimes.length = 0;
        shakeAt = now;
        buzz([12, 40, 12]);
        opts.onRage?.();
      }
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

    const buttonish = mode === 'button' || pendingMode === 'button';

    // lean ratio in [-1,1] per axis, by priority: gyro (phone) > mouse (desktop)
    // > slow idle auto-lean; drives the pivot, the rim light AND loose-bar gravity.
    // The button always keeps a slow idle sway so its depth stays visible.
    let leanY = 0;
    let leanX = 0;
    const lean = tilt.getLean();
    if (lean) {
      leanY = lean.gamma;
      leanX = -lean.beta;
    } else if (mouseSeen) {
      leanY = mouseX * MOUSE_GAIN;
      leanX = -mouseY * MOUSE_GAIN * 0.5;
    } else if (!reduce && (!controls.hasInteracted() || buttonish)) {
      const phase = (now / 1000) * IDLE_HZ * Math.PI * 2;
      leanY = Math.sin(phase) * IDLE_AMP;
      leanX = Math.cos(phase) * IDLE_AMP * 0.4;
    }
    // gyro spill: tilt the phone hard and the seated bars break loose and
    // slide downhill; level it back and they fly home and click in — the
    // "it snaps back" thesis you can feel in your wrist. Gyro only (a mouse
    // lean would spill constantly), with hysteresis so it never flutters.
    if (lean && riseDone && mode === 'mark' && !pendingMode) {
      const leanMag = Math.hypot(leanY, leanX);
      if (!spilling && leanMag > SPILL_ON) {
        spilling = true;
        buzz(14);
        for (const bar of bars) {
          if (!bar.grabbed) bar.live = true; // break the whole mark loose
        }
      } else if (spilling && leanMag < SPILL_OFF) {
        spilling = false; // the springs take over and carry them home
      }
    } else {
      spilling = false;
    }

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
      // finale slow-motion eases back to real time
      timeScale = lerp(timeScale, 1, Math.min(1, dt * 0.9));
      const dtSim = dt * timeScale;
      // bar physics: held bars swing on the grip; loose live bars chase home
      const buttonForge = pendingMode === 'button';
      for (const bar of bars) {
        if (bar.grabbed) {
          gripStep(bar, dtSim);
          continue;
        }
        if (!bar.live) continue;
        // phone tilt (or the mouse) is gravity for anything loose — it slides
        bar.vel.x += leanY * TILT_GRAV * dtSim;
        bar.vel.y += leanX * TILT_GRAV * dtSim;
        if (spilling) {
          // no homing while spilled — pure downhill slide inside a soft bound
          bar.vel.x += leanY * SPILL_GRAV * dtSim;
          bar.vel.y += leanX * SPILL_GRAV * dtSim;
          bar.vel.multiplyScalar(Math.max(0, 1 - 1.4 * dtSim));
          bar.mesh.position.addScaledVector(bar.vel, dtSim);
          if (bar.mesh.position.length() > SPILL_RANGE) bar.mesh.position.setLength(SPILL_RANGE);
          continue;
        }
        if (now < bar.launchAt) {
          // forge suspense: hang scattered, coasting, until this bar's strike
          bar.vel.multiplyScalar(Math.max(0, 1 - 1.6 * dtSim));
          bar.mesh.position.addScaledVector(bar.vel, dtSim);
          continue;
        }
        if (stepBar(bar, dtSim)) {
          buzz(8); // clicked home
          if (buttonForge && !bar.accent) {
            // a forge strike: the button takes the hit and grows — a fixed
            // 300ms overshoot tween from wherever it is to the next step
            absorbed += 1;
            impactAt = now;
            buzz(26);
            const accent = bars[2];
            growFrom.copy(accent.mesh.scale);
            growTo.lerpVectors(BTN_SCALE_FROM, BTN_SCALE_TO, absorbed / 4);
            accent.targetScale.copy(growTo);
            growStart = now;
            const next = forgeQueue[absorbed];
            if (next) next.launchAt = now + FORGE_GAP; // release the next striker
          }
          const allHome = bars.every((b) => !b.live);
          if (allHome && pendingMode) {
            mode = pendingMode;
            pendingMode = null;
            if (mode === 'button' && !reduce) flashAt = now; // coronation surge
            opts.onMode?.(mode);
          }
          opts.onSettle?.(attempts, allHome);
        }
      }
      // finale morph: colour, reflections and shape tween while the bars fly —
      // on REAL time, so each strike pumps the button up even during slow-mo
      const cl = Math.min(1, COLOR_LERP * dt);
      const growT = (now - growStart) / GROW_MS;
      for (const bar of bars) {
        if (!bar.mat.color.equals(bar.targetColor)) bar.mat.color.lerp(bar.targetColor, cl);
        bar.mat.envMapIntensity = lerp(bar.mat.envMapIntensity, bar.targetEnv, cl);
        if (bar.accent && growT <= 1) {
          // the strike tween owns the button's scale while it runs
          bar.mesh.scale.lerpVectors(growFrom, growTo, easeOutBack(clamp01(growT)));
        } else {
          bar.mesh.scale.lerp(bar.targetScale, cl);
        }
      }
    }
    const risen = clamp01((now - riseStart) / riseSpan);
    shadow.mat.opacity = risen * 0.38;
    // slow push-in + a punch toward the button on every forge strike
    const kick = FORGE_KICK * Math.exp(-(now - impactAt) / 140);
    camera.position.z = lerp(DOLLY_FROM, DOLLY_TO, easeOutCubic(risen)) - kick;

    controls.applySpinInertia(dt);

    // button mode: unwind any user spin so the slab faces the camera dead-on
    if (buttonish) spinner.quaternion.slerp(IDENTITY_Q, Math.min(1, 2.5 * dt));

    // the button leans gently — enough to keep reading as a 3D object
    const leanScale = buttonish ? 0.45 : 1;
    pivot.rotation.y = leanY * TILT_GAIN * leanScale;
    pivot.rotation.x = leanX * TILT_GAIN * leanScale;
    // defiant head-shake after rapid-fire throws — a decaying roll wiggle
    const shakeAge = now - shakeAt;
    pivot.rotation.z =
      shakeAge < 900 ? Math.sin(shakeAge / 45) * 0.055 * Math.exp(-shakeAge / 260) : 0;
    rim.position.x = leanY * LIGHT_RAKE;
    rim.position.y = 0.3 + leanX * 0.8;
    // hover: the button face rises toward the viewer and the light leans in
    hoverGlow = lerp(hoverGlow, ctaHover && mode === 'button' ? 1 : 0, Math.min(1, 10 * dt));
    const accentBar = bars[2];
    if (mode === 'button' && !accentBar.live && !accentBar.grabbed) {
      accentBar.mesh.position.z = accentBar.home.z + hoverGlow * HOVER_LIFT;
    }

    // coronation flash (long surge when the button completes) + a sharp spike
    // per forge strike + the hover glow
    const flashAge = now - flashAt;
    const surge = flashAge < 2400 ? 4.2 * Math.sin(Math.min(1, flashAge / 2400) * Math.PI) : 0;
    const spike = FORGE_SPIKE * Math.exp(-(now - impactAt) / 160);
    rim.intensity = 1.6 + surge + spike + hoverGlow * HOVER_GLOW;

    renderer.render(scene, camera);
  });

  return {
    enableTilt: enableMotionAndTilt,
    needsTiltGesture: tilt.needsGesture,
    setCtaHover: (hover: boolean) => {
      ctaHover = hover;
    },
    stop: () => {
      renderer.setAnimationLoop(null);
      controls.dispose();
      tilt.dispose();
      window.removeEventListener('pointermove', onMouse);
      window.removeEventListener('devicemotion', onMotion);
      ro.disconnect();
      for (const b of bars) {
        b.mesh.geometry.dispose();
        b.mat.dispose();
      }
      shadow.mesh.geometry.dispose();
      shadow.mat.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
