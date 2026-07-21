import * as THREE from 'three';

/**
 * 地牢氛围光照：指数雾 + 低环境光 + 跟随玩家视角的火把点光。
 * 火把挂在相机下随视角移动（相机已加入场景）。阴影投射在 P4 细化。
 */
export class Lighting {
  readonly torch: THREE.PointLight;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.05);
    scene.background = new THREE.Color(0x0a0a12);
    scene.add(new THREE.AmbientLight(0x33334a, 0.6));
    scene.add(new THREE.HemisphereLight(0x404060, 0x101018, 0.4));

    this.torch = new THREE.PointLight(0xffaa55, 60, 24, 1.8);
    this.torch.position.set(0, -0.2, 0);
    camera.add(this.torch);
  }
}
