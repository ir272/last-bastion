// ===== Base Tower Class =====
import * as THREE from 'three';
import { TOWERS, COLORS } from '../utils/constants.js';
import { distXZ } from '../utils/helpers.js';

export class Tower {
  constructor(type, gridNode, scene) {
    const def = TOWERS[type];
    this.type = type;
    this.definition = def;
    this.level = 0; // 0-indexed, max 2
    this.stats = { ...def.levels[0] };
    this.gridNode = gridNode;
    this.scene = scene;
    this.position = gridNode.mesh.position.clone();
    this.position.y = 0;

    // Combat state
    this.cooldown = 0;
    this.target = null;
    this.totalDamageDealt = 0;

    // Laser specific
    this.laserBeam = null;
    this.chainBeams = [];

    // Visual
    this._buildMesh();
    this._buildRangeIndicator();

    // Mark node occupied
    gridNode.occupied = true;
    gridNode.tower = this;
  }

  _buildMesh() {
    const def = this.definition;
    const h = this.stats.height;

    // Tower group
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Base (cylinder)
    const baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.5,
      metalness: 0.7,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.15, 0.25, h - 0.4, 6);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      roughness: 0.4,
      metalness: 0.6,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.4 + (h - 0.4) / 2;
    shaft.castShadow = true;
    this.group.add(shaft);
    this._shaft = shaft;

    // Head (different per tower type)
    let headGeo;
    switch (this.type) {
      case 'frost':
        headGeo = new THREE.OctahedronGeometry(0.3, 0);
        break;
      case 'cannon':
        headGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
        break;
      case 'laser':
        headGeo = new THREE.ConeGeometry(0.25, 0.5, 6);
        break;
      default: // arrow
        headGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
    }

    this._headMaterial = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.head = new THREE.Mesh(headGeo, this._headMaterial);
    this.head.position.y = h;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Tower point light
    this.towerLight = new THREE.PointLight(def.color, 0.8, 4);
    this.towerLight.position.y = h + 0.3;
    this.group.add(this.towerLight);

    this.scene.add(this.group);

    // Store reference for raycasting
    this.group.userData.tower = this;
    base.userData.tower = this;
    shaft.userData.tower = this;
    this.head.userData.tower = this;
  }

  _buildRangeIndicator() {
    const rangeGeo = new THREE.RingGeometry(this.stats.range - 0.05, this.stats.range, 64);
    const rangeMat = new THREE.MeshBasicMaterial({
      color: this.definition.color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.rangeIndicator = new THREE.Mesh(rangeGeo, rangeMat);
    this.rangeIndicator.rotation.x = -Math.PI / 2;
    this.rangeIndicator.position.copy(this.position);
    this.rangeIndicator.position.y = 0.05;
    this.scene.add(this.rangeIndicator);
  }

  showRange(show) {
    this.rangeIndicator.material.opacity = show ? 0.2 : 0;
  }

  upgrade() {
    if (this.level >= 2) return false;
    this.level++;
    this.stats = { ...this.definition.levels[this.level] };

    // Visual upgrades: taller, brighter
    const h = this.stats.height;
    this._shaft.scale.y = (h - 0.4) / (this.definition.levels[0].height - 0.4);
    this._shaft.position.y = 0.4 + (h - 0.4) / 2 * this._shaft.scale.y;
    this.head.position.y = h;
    this.towerLight.position.y = h + 0.3;
    this.towerLight.intensity = 0.8 + this.level * 0.4;
    this._headMaterial.emissiveIntensity = 0.5 + this.level * 0.3;

    // Update range indicator
    this.scene.remove(this.rangeIndicator);
    this._buildRangeIndicator();

    return true;
  }

  getUpgradeCost() {
    if (this.level >= 2) return Infinity;
    return this.definition.upgradeCosts[this.level];
  }

  getSellValue() {
    let totalSpent = this.definition.cost;
    for (let i = 0; i < this.level; i++) {
      totalSpent += this.definition.upgradeCosts[i];
    }
    return Math.floor(totalSpent * 0.6);
  }

  findTarget(enemies) {
    // Target the enemy furthest along the path within range
    let bestTarget = null;
    let bestProgress = -1;

    enemies.forEach((e) => {
      if (!e.alive) return;
      const dist = distXZ(this.position, e.position);
      if (dist <= this.stats.range) {
        const prog = e.getProgress();
        if (prog > bestProgress) {
          bestProgress = prog;
          bestTarget = e;
        }
      }
    });

    return bestTarget;
  }

  update(dt, enemies, particleSystem, audioSystem) {
    this.cooldown -= dt;

    // Find target
    this.target = this.findTarget(enemies);

    // Rotate head toward target
    if (this.target) {
      const dir = new THREE.Vector3().subVectors(this.target.position, this.position);
      const angle = Math.atan2(dir.x, dir.z);
      this.head.rotation.y = angle;
    }

    // Laser tower: continuous beam
    if (this.definition.isContinuous) {
      this._updateLaser(dt, enemies, particleSystem);
      return;
    }

    // Fire when ready
    if (this.cooldown <= 0 && this.target) {
      this.fire(this.target, enemies, particleSystem, audioSystem);
      this.cooldown = this.stats.speed;
    }
  }

  fire(target, enemies, particleSystem, audioSystem) {
    const origin = this.position.clone();
    origin.y = this.stats.height;

    switch (this.type) {
      case 'arrow':
        this._fireArrow(origin, target, particleSystem);
        break;
      case 'frost':
        this._fireFrost(origin, target, enemies, particleSystem);
        break;
      case 'cannon':
        this._fireCannon(origin, target, enemies, particleSystem);
        break;
    }

    if (audioSystem) audioSystem.playShot(this.type);
  }

  _fireArrow(origin, target, particleSystem) {
    // Instant hit + trail particle
    target.takeDamage(this.stats.damage);
    this.totalDamageDealt += this.stats.damage;
    if (particleSystem) {
      particleSystem.spawnProjectileTrail(origin, target.position.clone(), this.definition.color);
    }
  }

  _fireFrost(origin, target, enemies, particleSystem) {
    // AoE slow + damage
    const aoeRadius = this.definition.aoERadius;
    enemies.forEach((e) => {
      if (e.alive && distXZ(target.position, e.position) < aoeRadius) {
        e.takeDamage(this.stats.damage);
        e.applySlow(this.stats.slowFactor, this.stats.slowDuration);
        this.totalDamageDealt += this.stats.damage;
      }
    });
    if (particleSystem) {
      particleSystem.spawnFrostNova(target.position.clone(), aoeRadius);
    }
  }

  _fireCannon(origin, target, enemies, particleSystem) {
    // AoE splash
    const splashRadius = this.stats.splashRadius;
    enemies.forEach((e) => {
      if (e.alive && distXZ(target.position, e.position) < splashRadius) {
        e.takeDamage(this.stats.damage);
        this.totalDamageDealt += this.stats.damage;
      }
    });
    if (particleSystem) {
      particleSystem.spawnExplosion(target.position.clone(), splashRadius);
      particleSystem.spawnProjectileTrail(origin, target.position.clone(), this.definition.color);
    }
  }

  _updateLaser(dt, enemies, particleSystem) {
    // Continuous damage to target
    if (this.target) {
      const dps = this.stats.damage / this.stats.speed;
      this.target.takeDamage(dps * dt);
      this.totalDamageDealt += dps * dt;

      // Draw laser beam
      if (particleSystem) {
        const origin = this.position.clone();
        origin.y = this.stats.height;
        particleSystem.drawLaserBeam(origin, this.target.position.clone(), this.definition.color);

        // Chain to nearby enemies at max level
        if (this.stats.chainCount > 0) {
          let chainTarget = this.target;
          for (let i = 0; i < this.stats.chainCount; i++) {
            let nearest = null;
            let nearestDist = 3; // chain range
            enemies.forEach((e) => {
              if (e.alive && e !== chainTarget && e !== this.target) {
                const d = distXZ(chainTarget.position, e.position);
                if (d < nearestDist) {
                  nearestDist = d;
                  nearest = e;
                }
              }
            });
            if (nearest) {
              nearest.takeDamage(dps * dt * 0.5);
              particleSystem.drawLaserBeam(
                chainTarget.position.clone(),
                nearest.position.clone(),
                this.definition.color,
                0.5
              );
              chainTarget = nearest;
            }
          }
        }
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.scene.remove(this.rangeIndicator);
    this.gridNode.occupied = false;
    this.gridNode.tower = null;
  }
}
