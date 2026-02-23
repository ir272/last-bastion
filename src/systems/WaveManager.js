// ===== Wave Manager: spawns enemies in waves with escalating difficulty =====
import { GAME, ENEMIES } from '../utils/constants.js';
import { Enemy } from '../enemies/Enemy.js';

// Hand-tuned wave compositions
const WAVE_DEFINITIONS = [
  // Wave 1-5: Tutorial ramp
  { enemies: [{ type: 'grunt', count: 6 }], desc: 'A few grunts approach...' },
  { enemies: [{ type: 'grunt', count: 10 }], desc: 'More grunts!' },
  { enemies: [{ type: 'grunt', count: 8 }, { type: 'swarm', count: 10 }], desc: 'They bring tiny friends.' },
  { enemies: [{ type: 'grunt', count: 10 }, { type: 'brute', count: 2 }], desc: 'Heavy armor detected.' },
  { enemies: [{ type: 'boss', count: 1 }, { type: 'grunt', count: 6 }], desc: 'BOSS WAVE!' },

  // Wave 6-10: Midgame
  { enemies: [{ type: 'swarm', count: 20 }, { type: 'grunt', count: 5 }], desc: 'Swarm incoming!' },
  { enemies: [{ type: 'brute', count: 5 }, { type: 'healer', count: 2 }], desc: 'They heal each other.' },
  { enemies: [{ type: 'grunt', count: 15 }, { type: 'healer', count: 3 }], desc: 'Reinforced assault.' },
  { enemies: [{ type: 'swarm', count: 30 }, { type: 'brute', count: 3 }], desc: 'The horde grows.' },
  { enemies: [{ type: 'boss', count: 1 }, { type: 'brute', count: 4 }, { type: 'healer', count: 2 }], desc: 'BOSS WAVE!' },

  // Wave 11-15: Hard
  { enemies: [{ type: 'grunt', count: 20 }, { type: 'swarm', count: 20 }], desc: 'Full assault.' },
  { enemies: [{ type: 'brute', count: 8 }, { type: 'healer', count: 4 }], desc: 'Armored healers.' },
  { enemies: [{ type: 'swarm', count: 40 }], desc: 'MEGA SWARM!' },
  { enemies: [{ type: 'brute', count: 6 }, { type: 'grunt', count: 15 }, { type: 'healer', count: 3 }], desc: 'Mixed battalion.' },
  { enemies: [{ type: 'boss', count: 2 }, { type: 'grunt', count: 10 }], desc: 'DOUBLE BOSS!' },

  // Wave 16-20: Endgame
  { enemies: [{ type: 'swarm', count: 50 }, { type: 'healer', count: 5 }], desc: 'Healing swarm!' },
  { enemies: [{ type: 'brute', count: 10 }, { type: 'healer', count: 5 }], desc: 'Unstoppable wall.' },
  { enemies: [{ type: 'grunt', count: 25 }, { type: 'brute', count: 5 }, { type: 'swarm', count: 30 }], desc: 'Everything at once.' },
  { enemies: [{ type: 'brute', count: 8 }, { type: 'healer', count: 6 }, { type: 'swarm', count: 30 }], desc: 'The final push.' },
  { enemies: [{ type: 'boss', count: 3 }, { type: 'brute', count: 5 }, { type: 'healer', count: 4 }], desc: 'THE LAST WAVE!' },
];

export class WaveManager {
  constructor() {
    this.currentWave = 0; // 0-indexed
    this.totalWaves = GAME.TOTAL_WAVES;
    this.state = 'prep'; // 'prep' | 'spawning' | 'active' | 'complete' | 'victory'
    this.prepTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.5; // seconds between spawns
    this.spawnQueue = [];
    this.activeEnemies = [];
    this.allEnemiesSpawned = false;

    // Stats
    this.totalKills = 0;
    this.totalGoldEarned = 0;
  }

  // Get current wave definition (with HP scaling)
  getWaveDef(waveIndex) {
    if (waveIndex >= WAVE_DEFINITIONS.length) {
      // Fallback for extra waves
      return WAVE_DEFINITIONS[WAVE_DEFINITIONS.length - 1];
    }
    return WAVE_DEFINITIONS[waveIndex];
  }

  // HP multiplier scales with wave number
  getWaveMultiplier() {
    return 1 + this.currentWave * 0.12;
  }

  // Get preview of next wave enemies
  getWavePreview() {
    if (this.currentWave >= this.totalWaves) return [];
    const def = this.getWaveDef(this.currentWave);
    return def.enemies.map((e) => ({
      type: e.type,
      count: e.count,
      name: ENEMIES[e.type].name,
    }));
  }

  // Start a new wave
  startWave(path) {
    if (this.currentWave >= this.totalWaves) {
      this.state = 'victory';
      return;
    }

    const def = this.getWaveDef(this.currentWave);
    const mult = this.getWaveMultiplier();

    // Build spawn queue
    this.spawnQueue = [];
    def.enemies.forEach((entry) => {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ type: entry.type, multiplier: mult });
      }
    });

    // Shuffle spawn queue slightly for variety
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }

    this.state = 'spawning';
    this.spawnTimer = 0;
    this.allEnemiesSpawned = false;
    this._path = path;
  }

  // Skip prep timer
  skipPrep() {
    if (this.state === 'prep') {
      this.prepTimer = 0;
    }
  }

  // Update wave state
  update(dt, scene, particleSystem, audioSystem, onEnemyDeath, onEnemyReachEnd) {
    switch (this.state) {
      case 'prep':
        this.prepTimer -= dt;
        if (this.prepTimer <= 0) {
          this.startWave(this._path);
          if (audioSystem) audioSystem.playWaveStart();
        }
        break;

      case 'spawning':
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
          const entry = this.spawnQueue.shift();
          const enemy = new Enemy(entry.type, this._path, entry.multiplier);
          enemy.addToScene(scene);
          this.activeEnemies.push(enemy);
          this.spawnTimer = this.spawnInterval;

          // Faster spawning for swarms
          if (entry.type === 'swarm') {
            this.spawnTimer = 0.15;
          }
        }
        if (this.spawnQueue.length === 0) {
          this.allEnemiesSpawned = true;
          this.state = 'active';
        }
        break;

      case 'active':
        // Check if wave is cleared
        if (this.allEnemiesSpawned && this.activeEnemies.length === 0) {
          this.currentWave++;
          if (this.currentWave >= this.totalWaves) {
            this.state = 'victory';
          } else {
            this.state = 'prep';
            this.prepTimer = GAME.PREP_TIME;
          }
        }
        break;
    }

    // Update all enemies
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      enemy.update(dt, this.activeEnemies);

      if (!enemy.alive) {
        if (enemy.reachedEnd) {
          // Enemy reached crystal
          if (onEnemyReachEnd) onEnemyReachEnd(enemy);
        } else {
          // Enemy killed
          this.totalKills++;
          if (onEnemyDeath) onEnemyDeath(enemy);
          if (particleSystem) particleSystem.spawnDeathBurst(enemy.position.clone(), enemy.color);
          if (audioSystem) audioSystem.playEnemyDeath();
        }
        enemy.removeFromScene(scene);
        this.activeEnemies.splice(i, 1);
      }
    }
  }

  // Get wave description
  getWaveDesc() {
    if (this.currentWave >= WAVE_DEFINITIONS.length) return '';
    return WAVE_DEFINITIONS[this.currentWave].desc;
  }

  // Check if it's a boss wave
  isBossWave(wave) {
    return (wave + 1) % GAME.BOSS_INTERVAL === 0;
  }

  // Clear all enemies (for reset)
  clearAll(scene) {
    this.activeEnemies.forEach((e) => e.removeFromScene(scene));
    this.activeEnemies = [];
    this.spawnQueue = [];
  }
}
