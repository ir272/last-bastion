import * as THREE from 'three';

// Lerp a value
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Clamp
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Distance between two 3D positions (ignoring Y)
export function distXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Convert grid coords to world position
export function gridToWorld(gx, gz, gridOriginX = -10, gridOriginZ = -10) {
  return new THREE.Vector3(gridOriginX + gx + 0.5, 0, gridOriginZ + gz + 0.5);
}

// Convert world position to grid coords
export function worldToGrid(wx, wz, gridOriginX = -10, gridOriginZ = -10) {
  return {
    gx: Math.floor(wx - gridOriginX),
    gz: Math.floor(wz - gridOriginZ),
  };
}

// Smoothstep
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Random float in range
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Random int in range [min, max)
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Create a point light with color
export function createPointLight(color, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance);
  return light;
}

// Ease out cubic
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Ease in out quad
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Simple object pool
export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 20) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get() {
    let obj = this.pool.pop();
    if (!obj) obj = this.createFn();
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }
}
