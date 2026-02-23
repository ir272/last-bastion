// ===== Input Manager: mouse, keyboard, camera controls =====
import * as THREE from 'three';
import { GRID } from '../utils/constants.js';

export class InputManager {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseScreen = new THREE.Vector2();

    // Camera pan state
    this.isPanning = false;
    this.panStart = new THREE.Vector2();
    this.panSpeed = 0.03;

    // Key state
    this.keys = {};

    // Callbacks
    this.onLeftClick = null;
    this.onRightClick = null;
    this.onHover = null;
    this.onKeyDown = null;
    this.onZoom = null;

    this._setupListeners();
  }

  _setupListeners() {
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (this.onKeyDown) this.onKeyDown(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen.set(e.clientX, e.clientY);
    this.mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    if (this.isPanning) {
      const dx = (e.clientX - this.panStart.x) * this.panSpeed;
      const dy = (e.clientY - this.panStart.y) * this.panSpeed;
      this.panStart.set(e.clientX, e.clientY);
      if (this.onPan) this.onPan(-dx, dy);
    }

    if (this.onHover) this.onHover();
  }

  _onMouseDown(e) {
    if (e.button === 2) {
      // Right click: start pan
      this.isPanning = true;
      this.panStart.set(e.clientX, e.clientY);
    } else if (e.button === 0) {
      if (this.onLeftClick) this.onLeftClick();
    }
  }

  _onMouseUp(e) {
    if (e.button === 2) {
      this.isPanning = false;
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    if (this.onZoom) this.onZoom(delta);
  }

  // Raycast against ground plane to get world position
  getWorldPosition(groundPlane) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(groundPlane);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  // Raycast against arbitrary objects
  raycastObjects(objects) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  isKeyDown(key) {
    return !!this.keys[key.toLowerCase()];
  }
}
