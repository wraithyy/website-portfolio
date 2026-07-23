// mind-ar ships no type declarations; declare the slice of the image-three
// entry we use. Kept minimal on purpose — widen only when we touch more API.
declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type * as THREE from 'three';

  interface MindARAnchor {
    group: THREE.Group;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  }

  interface MindARThreeOptions {
    container: HTMLElement;
    imageTargetSrc: string;
    uiScanning?: string;
    uiLoading?: string;
    uiError?: string;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    readonly renderer: THREE.WebGLRenderer;
    readonly scene: THREE.Scene;
    readonly camera: THREE.Camera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
