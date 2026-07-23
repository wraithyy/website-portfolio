/* WebAR business-card experience.
   Point the camera at the back of the printed card (the QR side, compiled into
   public/ar/card.mind) and the JK monogram rises out of the paper in 3D, the
   accent bar glowing. Loaded lazily from ar.astro, mirroring the Konami egg. */
import * as THREE from 'three';
// mind-ar treats `three` as a peer dep, so this shares the app's single THREE instance
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

// JK monogram bars, straight from the logo SVG (viewBox 0 0 132 168).
// [x, y, w, h, accent?] — y is SVG-space (down-positive), converted below.
const BARS: [number, number, number, number, boolean][] = [
  [0, 89, 25, 79, false],
  [36, 0, 25, 168, false],
  [71, 0, 25, 168, true], // the one accent bar
  [107, 0, 25, 79, false],
  [107, 89, 25, 79, false],
];

const VB_W = 132;
const VB_H = 168;
const CREAM = 0xe8e4dc;
const VERMILION = 0xff5a3c;

const MONO_WIDTH = 0.34; // world units across the ~1-unit-wide target image
const DEPTH = 0.09; // how far the bars stand off the paper
const RISE_MS = 900; // grow-in duration

type Handle = { stop: () => void };

function buildMonogram(): { group: THREE.Group; accent: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const s = MONO_WIDTH / VB_W;
  let accentMat!: THREE.MeshStandardMaterial;

  for (const [x, y, w, h, isAccent] of BARS) {
    const geo = new THREE.BoxGeometry(w * s, h * s, DEPTH);
    const mat = new THREE.MeshStandardMaterial({
      color: isAccent ? VERMILION : CREAM,
      roughness: 0.45,
      metalness: 0.0,
      emissive: isAccent ? VERMILION : 0x000000,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // SVG -> world: x centered on VB_W/2, y flipped and centered on VB_H/2
    mesh.position.x = (x + w / 2 - VB_W / 2) * s;
    mesh.position.y = -(y + h / 2 - VB_H / 2) * s;
    mesh.position.z = 0; // pivots on the paper; z-scale grows the depth
    group.add(mesh);
    if (isAccent) accentMat = mat;
  }
  return { group, accent: accentMat };
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export async function start(container: HTMLElement): Promise<Handle> {
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
  const { group, accent } = buildMonogram();
  group.scale.z = 0.001;
  anchor.group.add(group);

  let found = false;
  let riseStart = 0;
  anchor.onTargetFound = () => {
    found = true;
    riseStart = 0;
  };
  anchor.onTargetLost = () => {
    found = false;
  };

  let raf = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    if (found) {
      if (!riseStart) riseStart = now;
      const t = Math.min(1, (now - riseStart) / RISE_MS);
      group.scale.z = Math.max(0.001, easeOutBack(t));
      // bars pivot from the paper: shift out so the base stays at z=0
      group.position.z = (DEPTH / 2) * group.scale.z;
      // accent bar pulses once risen
      accent.emissiveIntensity = t * (0.5 + 0.5 * Math.sin(now / 320));
    } else {
      group.scale.z = 0.001;
      accent.emissiveIntensity = 0;
    }
    renderer.render(scene, camera);
  });

  await mindarThree.start(); // prompts for camera

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      renderer.setAnimationLoop(null);
      mindarThree.stop();
      // release the camera stream
      const video = container.querySelector('video');
      const stream = video && (video.srcObject as MediaStream | null);
      stream?.getTracks().forEach((tr) => tr.stop());
    },
  };
}
