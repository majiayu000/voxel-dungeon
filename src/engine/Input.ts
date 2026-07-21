import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * 输入层：PointerLock 鼠标视角 + WASD 键状态 + 鼠标左键状态。
 * onLockChange 通知锁定状态变化；onLockError 通知锁定被浏览器拒绝
 * （常见于 Esc 退出后的 ~1.25s 冷却期），上层可据此重试。
 */
export class Input {
  readonly controls: PointerLockControls;
  private keys = new Set<string>();
  private _mouseDown = false;

  /** 指针锁定状态变化时触发。 */
  onLockChange: (locked: boolean) => void = () => {};
  /** 锁定请求被浏览器拒绝时触发。 */
  onLockError: () => void = () => {};

  constructor(
    camera: THREE.Camera,
    private dom: HTMLElement,
  ) {
    this.controls = new PointerLockControls(camera, dom);
    this.controls.addEventListener('lock', () => this.onLockChange(true));
    this.controls.addEventListener('unlock', () => this.onLockChange(false));

    dom.ownerDocument.addEventListener('pointerlockerror', this.onPointerLockError);
    dom.addEventListener('mousedown', this.onMouseDown);
    addEventListener('mouseup', this.onMouseUp);
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
  }

  get isLocked(): boolean {
    return this.controls.isLocked;
  }

  get mouseDown(): boolean {
    return this._mouseDown;
  }

  key(code: string): boolean {
    return this.keys.has(code);
  }

  /** 请求指针锁定；被拒绝时不抛错，走 onLockError。 */
  lock(): void {
    try {
      this.controls.lock();
    } catch {
      this.onLockError();
    }
  }

  private onPointerLockError = (): void => {
    this.onLockError();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this._mouseDown = true;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this._mouseDown = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  dispose(): void {
    this.dom.ownerDocument.removeEventListener('pointerlockerror', this.onPointerLockError);
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    removeEventListener('mouseup', this.onMouseUp);
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    this.controls.dispose();
  }
}
