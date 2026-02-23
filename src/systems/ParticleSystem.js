// ===== Particle System: trails, explosions, frost nova, spores =====
import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';

class Particle {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.color = new THREE.Color();
    this.size = 1;
    this.life = 0;
    this.maxLife = 1;
    this.active = false;
  }
}

export class ParticleSystem {
  constructor(scene, maxParticles = 2000) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.activeCount = 0;

    // Pre-allocate particles
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle());
    }

    // Shared geometry
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    // Laser beam lines (reused)
    this._laserLines = [];
    this._laserLinePool = [];

    // Shockwave rings
    this._shockwaves = [];
  }

  _getParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].active) {
        this.particles[i].active = true;
        return this.particles[i];
      }
    }
    return null;
  }

  // Arrow / cannonball projectile trail
  spawnProjectileTrail(from, to, color, count = 8) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    dir.normalize();

    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;
      const t = i / count;
      p.position.lerpVectors(from, to, t);
      // Slight random offset
      p.position.x += (Math.random() - 0.5) * 0.1;
      p.position.y += (Math.random() - 0.5) * 0.1;
      p.position.z += (Math.random() - 0.5) * 0.1;
      p.velocity.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      p.color.copy(c);
      p.size = 0.1 + Math.random() * 0.1;
      p.life = 0.3 + Math.random() * 0.2;
      p.maxLife = p.life;
    }
  }

  // Frost nova AoE effect
  spawnFrostNova(center, radius, count = 30) {
    const c = new THREE.Color(0x88ccff);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;
      const angle = (i / count) * Math.PI * 2;
      const r = Math.random() * radius;
      p.position.set(
        center.x + Math.cos(angle) * r,
        center.y + 0.2 + Math.random() * 0.5,
        center.z + Math.sin(angle) * r
      );
      p.velocity.set(
        Math.cos(angle) * 2,
        Math.random() * 1.5,
        Math.sin(angle) * 2
      );
      p.color.copy(c);
      p.size = 0.15;
      p.life = 0.5 + Math.random() * 0.3;
      p.maxLife = p.life;
    }

    // Shockwave ring
    this._spawnShockwave(center, radius, 0x88ccff);
  }

  // Cannon explosion
  spawnExplosion(center, radius, count = 40) {
    const colors = [new THREE.Color(0xff8800), new THREE.Color(0xffcc00), new THREE.Color(0xff4400)];
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;
      p.position.copy(center);
      p.position.y += 0.2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      p.velocity.set(
        Math.cos(angle) * speed,
        1 + Math.random() * 3,
        Math.sin(angle) * speed
      );
      p.color.copy(colors[Math.floor(Math.random() * colors.length)]);
      p.size = 0.15 + Math.random() * 0.15;
      p.life = 0.4 + Math.random() * 0.4;
      p.maxLife = p.life;
    }

    // Shockwave ring
    this._spawnShockwave(center, radius, 0xff8800);
  }

  // Enemy death burst
  spawnDeathBurst(position, color, count = 20) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;
      p.position.copy(position);
      p.velocity.set(
        (Math.random() - 0.5) * 4,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      p.color.copy(c);
      p.size = 0.1 + Math.random() * 0.15;
      p.life = 0.5 + Math.random() * 0.5;
      p.maxLife = p.life;
    }
  }

  // Crystal hit effect
  spawnCrystalHit(position) {
    this.spawnExplosion(position, 0.5, 15);
  }

  // Laser beam drawing (line between points, refreshed each frame)
  drawLaserBeam(from, to, color, opacity = 1) {
    let line;
    if (this._laserLinePool.length > 0) {
      line = this._laserLinePool.pop();
      const positions = line.geometry.attributes.position.array;
      positions[0] = from.x; positions[1] = from.y; positions[2] = from.z;
      positions[3] = to.x; positions[4] = to.y; positions[5] = to.z;
      line.geometry.attributes.position.needsUpdate = true;
      line.material.color.setHex(color);
      line.material.opacity = opacity * 0.8;
      line.visible = true;
    } else {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity * 0.8,
        linewidth: 2,
      });
      line = new THREE.Line(geo, mat);
      this.scene.add(line);
    }
    this._laserLines.push(line);
  }

  // Shockwave ring
  _spawnShockwave(center, maxRadius, color) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, 0.1, center.z);
    this.scene.add(ring);
    this._shockwaves.push({
      mesh: ring,
      maxRadius: maxRadius,
      currentRadius: 0.1,
      life: 0.4,
    });
  }

  update(dt) {
    const posAttr = this.geometry.attributes.position;
    const colorAttr = this.geometry.attributes.color;
    const sizeAttr = this.geometry.attributes.size;
    let count = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Physics
      p.velocity.y -= 3 * dt; // gravity
      p.position.add(p.velocity.clone().multiplyScalar(dt));

      // Fade
      const lifeRatio = p.life / p.maxLife;

      // Write to buffer
      posAttr.array[count * 3] = p.position.x;
      posAttr.array[count * 3 + 1] = p.position.y;
      posAttr.array[count * 3 + 2] = p.position.z;
      colorAttr.array[count * 3] = p.color.r * lifeRatio;
      colorAttr.array[count * 3 + 1] = p.color.g * lifeRatio;
      colorAttr.array[count * 3 + 2] = p.color.b * lifeRatio;
      sizeAttr.array[count] = p.size * lifeRatio;
      count++;
    }

    // Zero out remaining
    for (let i = count; i < this.maxParticles; i++) {
      posAttr.array[i * 3 + 1] = -100; // move off screen
      sizeAttr.array[i] = 0;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, count);

    // Clean up laser lines (hide them, re-pool)
    this._laserLines.forEach((l) => {
      l.visible = false;
      this._laserLinePool.push(l);
    });
    this._laserLines.length = 0;

    // Update shockwaves
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      sw.life -= dt;
      sw.currentRadius += dt * sw.maxRadius * 3;
      sw.mesh.scale.setScalar(sw.currentRadius);
      sw.mesh.material.opacity = Math.max(0, sw.life / 0.4) * 0.6;

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this._shockwaves.splice(i, 1);
      }
    }
  }

  setMaxParticles(count) {
    this.maxParticles = Math.min(count, this.particles.length);
  }
}
