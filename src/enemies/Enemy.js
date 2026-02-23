// ===== Base Enemy Class =====
import * as THREE from 'three';
import { ENEMIES, COLORS } from '../utils/constants.js';
import { distXZ, lerp } from '../utils/helpers.js';

export class Enemy {
  constructor(type, path, waveMultiplier = 1) {
    const def = ENEMIES[type];
    this.type = type;
    this.name = def.name;
    this.maxHp = Math.floor(def.hp * waveMultiplier);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.speed = def.speed;
    this.armor = def.armor;
    this.reward = def.reward;
    this.damage = def.damage;
    this.color = def.color;
    this.scale = def.scale;
    this.alive = true;
    this.reachedEnd = false;

    // Path following
    this.path = path;
    this.pathIndex = 0;
    this.position = path[0].clone();
    this.position.y = 0.3;

    // Slow debuff
    this.slowFactor = 1;
    this.slowTimer = 0;

    // Healer special
    this.healRadius = def.healRadius || 0;
    this.healRate = def.healRate || 0;

    // Visual
    this._buildMesh();

    // Damage flash
    this._flashTimer = 0;

    // HP bar
    this._buildHPBar();
  }

  _buildMesh() {
    let geo;
    switch (this.type) {
      case 'brute':
        geo = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'swarm':
        geo = new THREE.TetrahedronGeometry(0.5, 0);
        break;
      case 'healer':
        geo = new THREE.OctahedronGeometry(0.5, 0);
        break;
      case 'boss':
        geo = new THREE.DodecahedronGeometry(0.7, 1);
        break;
      default: // grunt
        geo = new THREE.SphereGeometry(0.5, 8, 6);
    }

    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.4,
      roughness: 0.5,
      metalness: 0.3,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.scale.setScalar(this.scale);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;

    // Point light per enemy (dim glow)
    this.glow = new THREE.PointLight(this.color, 0.5, 3);
    this.mesh.add(this.glow);

    // Store reference for raycasting
    this.mesh.userData.enemy = this;
  }

  _buildHPBar() {
    // Use canvas textures for HP bar sprites (auto-billboard)
    this._hpCanvas = document.createElement('canvas');
    this._hpCanvas.width = 64;
    this._hpCanvas.height = 8;
    this._hpCtx = this._hpCanvas.getContext('2d');
    this._hpTexture = new THREE.CanvasTexture(this._hpCanvas);
    this._hpTexture.minFilter = THREE.NearestFilter;

    const mat = new THREE.SpriteMaterial({
      map: this._hpTexture,
      transparent: true,
      depthTest: false,
    });
    this.hpSprite = new THREE.Sprite(mat);
    this.hpSprite.scale.set(0.8, 0.1, 1);
    this.hpSprite.position.y = this.scale + 0.5;
    this.mesh.add(this.hpSprite);
    this._updateHPBar(1);
  }

  _updateHPBar(ratio) {
    const ctx = this._hpCtx;
    const w = 64, h = 8;
    ctx.clearRect(0, 0, w, h);
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    // Fill
    const fillW = Math.max(1, Math.floor(w * ratio));
    if (ratio > 0.5) ctx.fillStyle = '#00ff88';
    else if (ratio > 0.25) ctx.fillStyle = '#ffcc00';
    else ctx.fillStyle = '#ff4444';
    ctx.fillRect(0, 0, fillW, h);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    this._hpTexture.needsUpdate = true;
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }

  takeDamage(amount) {
    const effectiveDamage = Math.max(1, amount - this.armor);
    this.hp -= effectiveDamage;
    this._flashTimer = 0.1;

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  applySlow(factor, duration) {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  update(dt, allEnemies) {
    if (!this.alive) return;

    // Slow debuff decay
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1;
      }
    }

    // Move along path
    this.speed = this.baseSpeed * this.slowFactor;
    const moveAmount = this.speed * dt;

    if (this.pathIndex < this.path.length - 1) {
      const target = this.path[this.pathIndex + 1];
      const dist = distXZ(this.position, target);

      if (dist < moveAmount) {
        this.pathIndex++;
        this.position.copy(target);
        this.position.y = 0.3;
      } else {
        const dir = new THREE.Vector3().subVectors(target, this.position).normalize();
        this.position.x += dir.x * moveAmount;
        this.position.z += dir.z * moveAmount;

        // Face movement direction
        this.mesh.lookAt(target.x, this.mesh.position.y, target.z);
      }
    } else {
      // Reached the crystal
      this.reachedEnd = true;
      this.alive = false;
    }

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Healer: heal nearby enemies
    if (this.healRadius > 0 && allEnemies) {
      allEnemies.forEach((e) => {
        if (e !== this && e.alive && distXZ(this.position, e.position) < this.healRadius) {
          e.heal(this.healRate * dt);
        }
      });
    }

    // Damage flash
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      this.material.emissiveIntensity = 1.5;
    } else {
      // Pulse glow based on HP
      const hpRatio = this.hp / this.maxHp;
      this.material.emissiveIntensity = 0.3 + (1 - hpRatio) * 0.5 + Math.sin(Date.now() * 0.005) * 0.1;
    }

    // Slow visual: tint blue
    if (this.slowFactor < 1) {
      this.material.emissive.setHex(0x4488ff);
    } else {
      this.material.emissive.setHex(this.color);
    }

    // Update HP bar (canvas-based sprite, auto-billboards)
    const hpRatio = this.hp / this.maxHp;
    this._updateHPBar(hpRatio);
  }

  // Get progress along path (0-1) for targeting priority
  getProgress() {
    return this.pathIndex / (this.path.length - 1);
  }
}
