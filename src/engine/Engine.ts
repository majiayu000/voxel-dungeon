import * as THREE from 'three';

/**
 * 引擎薄封装：渲染器 / 场景 / 相机 / 自适应尺寸 / 固定步长主循环。
 * 逻辑以固定 60Hz 步长更新（可预测、可测），渲染每帧执行。
 */
export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private readonly step = 1 / 60;
  private acc = 0;
  private last = 0;

  /** 固定步长逻辑更新回调。 */
  onLogic: (dt: number) => void = () => {};

  constructor(container: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err) {
      // 常见于浏览器 WebGL 上下文耗尽（热重载泄漏 / 标签页过多），给出可读提示而非黑屏。
      throw new Error(
        'WebGL 上下文创建失败：请硬刷新页面（Cmd/Ctrl+Shift+R），或关闭其他占用显卡的标签页后重试。',
        { cause: err },
      );
    }
    this.renderer = renderer;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 相机加入场景，使其子物体（如火把光）参与渲染。
    this.scene.add(this.camera);
    addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  };

  start(): void {
    this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.renderer.setAnimationLoop(null);
  }

  private frame = (time: number): void => {
    if (this.last === 0) this.last = time;
    let dt = (time - this.last) / 1000;
    this.last = time;
    dt = Math.min(dt, 0.1); // 钳制，防切后台回来爆冲
    this.acc += dt;
    while (this.acc >= this.step) {
      this.onLogic(this.step);
      this.acc -= this.step;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.stop();
    removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
