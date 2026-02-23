// ===== LAST BASTION — Main Entry Point =====
// A 3D tower defense game with bioluminescent dark fantasy aesthetic

import { GameScene } from './scene.js';
import { GameMap } from './map.js';
import { Tower } from './towers/Tower.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { WaveManager } from './systems/WaveManager.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { InputManager } from './systems/InputManager.js';
import { UIManager } from './ui/UIManager.js';
import { TOWERS, GAME, QUALITY } from './utils/constants.js';
import { worldToGrid } from './utils/helpers.js';
import * as THREE from 'three';

class Game {
  constructor() {
    this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'victory' | 'defeat'
    this.gameSpeed = 1; // 1 or 2
    this.towers = [];
    this.selectedTowerType = null;
    this.selectedTower = null; // existing tower being inspected
    this.hoveredNode = null;

    // Init systems
    const canvas = document.getElementById('game-canvas');
    this.gameScene = new GameScene(canvas);
    this.particleSystem = new ParticleSystem(this.gameScene.scene);
    this.audioSystem = new AudioSystem();
    this.waveManager = new WaveManager();
    this.economy = new EconomySystem();
    this.input = new InputManager(canvas, this.gameScene.camera);
    this.ui = new UIManager();

    // Map (built once, rebuilt on restart)
    this.map = null;

    this._setupCallbacks();
    this._startMenuScene();
    this._gameLoop();
  }

  _setupCallbacks() {
    // UI callbacks
    this.ui.onStart = () => this._startGame();
    this.ui.onResume = () => this._resume();
    this.ui.onQuit = () => this._quitToMenu();
    this.ui.onRestart = () => this._startGame();
    this.ui.onSpeedToggle = () => this._toggleSpeed();
    this.ui.onSendWave = () => this._sendWave();
    this.ui.onTowerSelect = (type) => this._selectTowerType(type);
    this.ui.onUpgrade = () => this._upgradeTower();
    this.ui.onSell = () => this._sellTower();
    this.ui.onQualityChange = (q) => this._setQuality(q);
    this.ui.onSoundToggle = (on) => this.audioSystem.setEnabled(on);

    // Input callbacks
    this.input.onLeftClick = () => this._onLeftClick();
    this.input.onHover = () => this._onHover();
    this.input.onPan = (dx, dz) => this.gameScene.panCamera(dx, dz);
    this.input.onZoom = (delta) => this.gameScene.zoomCamera(delta);
    this.input.onKeyDown = (key) => this._onKeyDown(key);
  }

  _startMenuScene() {
    // Build a pretty menu background scene
    if (!this.map) {
      this.map = new GameMap(this.gameScene.scene);
      this.gameScene.crystalLight.position.copy(this.map.getCrystalPosition());
      if (this.map.crystalLightMesh) {
        this.gameScene.addGodRays(this.map.crystalLightMesh);
      }
    }
    this.ui.showMainMenu();
    this.state = 'menu';
  }

  _startGame() {
    // Initialize audio on first user interaction
    this.audioSystem.init();
    this.audioSystem.playButtonClick();

    // Reset game state
    this._clearGameState();

    this.state = 'playing';
    this.ui.showHUD();

    // Setup economy
    this.economy.reset();
    this.ui.updateGold(this.economy.gold);
    this.ui.updateLives(this.economy.lives);
    this.ui.updateWave(0, GAME.TOTAL_WAVES);
    this.ui.updateSpeed(this.gameSpeed);

    // Setup wave manager
    this.waveManager = new WaveManager();
    this.waveManager._path = this.map.pathWorldPoints;
    this.waveManager.state = 'prep';
    this.waveManager.prepTimer = 5; // Short first prep

    // Show wave preview
    this.ui.showWavePreview(this.waveManager.getWavePreview());
    this.ui.showNextWaveButton(true);
  }

  _clearGameState() {
    // Remove existing towers
    this.towers.forEach((t) => t.destroy());
    this.towers = [];
    this.selectedTowerType = null;
    this.selectedTower = null;
    this.ui.clearTowerSelection();
    this.ui.hideTowerInfo();
    this._hideGhostTower();
    document.getElementById('game-canvas').classList.remove('placing');

    // Clear enemies
    if (this.waveManager) {
      this.waveManager.clearAll(this.gameScene.scene);
    }

    // Reset build nodes
    if (this.map) {
      this.map.buildNodes.forEach((n) => {
        n.occupied = false;
        n.tower = null;
      });
      this.map.resetNodeHighlights();
    }

    // Reset map state
    if (this.map) {
      this.map.crystalHealth = 1;
    }

    // Reset speed
    this.gameSpeed = 1;

    // Remove floating gold text elements
    document.querySelectorAll('.gold-float').forEach((el) => el.remove());
  }

  _resume() {
    this.audioSystem.playButtonClick();
    this.state = 'playing';
    this.ui.hidePause();
  }

  _pause() {
    this.state = 'paused';
    this.ui.showPause();
  }

  _quitToMenu() {
    this.audioSystem.playButtonClick();
    this._clearGameState();
    this.state = 'menu';
    this.ui.showMainMenu();
  }

  _toggleSpeed() {
    this.audioSystem.playButtonClick();
    this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
    this.ui.updateSpeed(this.gameSpeed);
  }

  _sendWave() {
    this.audioSystem.playButtonClick();
    if (this.waveManager.state === 'prep') {
      this.waveManager.skipPrep();
      this.waveManager.startWave(this.map.pathWorldPoints);
      this.audioSystem.playWaveStart();
      this.ui.showWaveBanner(this.waveManager.currentWave + 1, this.waveManager.getWaveDesc());
      this.ui.showNextWaveButton(false);
      this.ui.hideWavePreview();

      // Interest
      const interest = this.economy.applyInterest();
      this.ui.updateGold(this.economy.gold);
    }
  }

  _selectTowerType(type) {
    this.audioSystem.playButtonClick();
    const canvas = document.getElementById('game-canvas');
    if (this.selectedTowerType === type) {
      // Deselect
      this.selectedTowerType = null;
      this.ui.clearTowerSelection();
      canvas.classList.remove('placing');
    } else {
      this.selectedTowerType = type;
      this.selectedTower = null;
      this.ui.selectTowerSlot(type);
      this.ui.hideTowerInfo();
      canvas.classList.add('placing');
    }
  }

  _onLeftClick() {
    if (this.state !== 'playing') return;

    // If placing tower
    if (this.selectedTowerType && this.hoveredNode) {
      this._placeTower(this.selectedTowerType, this.hoveredNode);
      return;
    }

    // Check if clicking an existing tower
    const towerMeshes = this.towers.flatMap((t) => [t.group]);
    const hits = this.input.raycastObjects(towerMeshes);
    if (hits.length > 0) {
      // Find the tower
      let obj = hits[0].object;
      while (obj && !obj.userData.tower) {
        obj = obj.parent;
      }
      if (obj && obj.userData.tower) {
        this._selectExistingTower(obj.userData.tower);
        return;
      }
    }

    // Deselect
    this.selectedTower = null;
    this.selectedTowerType = null;
    this.ui.clearTowerSelection();
    this.ui.hideTowerInfo();
    this.towers.forEach((t) => t.showRange(false));
    document.getElementById('game-canvas').classList.remove('placing');
  }

  _selectExistingTower(tower) {
    this.selectedTower = tower;
    this.selectedTowerType = null;
    this.ui.clearTowerSelection();
    this.ui.showTowerInfo(tower);
    // Show range
    this.towers.forEach((t) => t.showRange(false));
    tower.showRange(true);
  }

  _onHover() {
    if (this.state !== 'playing') return;
    if (!this.selectedTowerType) {
      this.map.resetNodeHighlights();
      this.hoveredNode = null;
      this._hideGhostTower();
      return;
    }

    // Raycast to ground to find grid position
    const worldPos = this.input.getWorldPosition(this.map.groundMesh);
    if (!worldPos) {
      this.map.resetNodeHighlights();
      this.hoveredNode = null;
      this._hideGhostTower();
      return;
    }

    const { gx, gz } = worldToGrid(worldPos.x, worldPos.z);
    const node = this.map.getBuildNode(gx, gz);

    this.map.resetNodeHighlights();
    this.hoveredNode = null;
    this._hideGhostTower();

    if (node && !node.occupied) {
      const canAfford = this.economy.canBuyTower(this.selectedTowerType);
      this.map.highlightNode(node, canAfford);
      this.hoveredNode = node;
      if (canAfford) {
        this._showGhostTower(node, this.selectedTowerType);
      }
    }
  }

  _showGhostTower(node, type) {
    const def = TOWERS[type];
    if (!this._ghostMesh) {
      const geo = new THREE.CylinderGeometry(0.15, 0.25, 1.5, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      this._ghostMesh = new THREE.Mesh(geo, mat);
      this.gameScene.scene.add(this._ghostMesh);
    }
    this._ghostMesh.material.color.setHex(def.color);
    this._ghostMesh.position.set(node.mesh.position.x, 0.75, node.mesh.position.z);
    this._ghostMesh.visible = true;
  }

  _hideGhostTower() {
    if (this._ghostMesh) {
      this._ghostMesh.visible = false;
    }
  }

  _placeTower(type, node) {
    if (!this.economy.canBuyTower(type)) return;
    if (node.occupied) return;

    this.economy.buyTower(type);
    const tower = new Tower(type, node, this.gameScene.scene);
    this.towers.push(tower);

    this.ui.updateGold(this.economy.gold);
    this.ui.updateTowerSlots(this.economy.gold);
    this.audioSystem.playPlaceTower();

    // Stay in placement mode
    this.map.resetNodeHighlights();
    this.hoveredNode = null;
  }

  _upgradeTower() {
    if (!this.selectedTower) return;
    if (!this.economy.canUpgradeTower(this.selectedTower)) return;

    this.economy.upgradeTower(this.selectedTower);
    this.ui.updateGold(this.economy.gold);
    this.ui.showTowerInfo(this.selectedTower);
    this.ui.updateTowerSlots(this.economy.gold);
    this.audioSystem.playUpgrade();

    // Update range indicator
    this.selectedTower.showRange(true);
  }

  _sellTower() {
    if (!this.selectedTower) return;

    const value = this.economy.sellTower(this.selectedTower);
    const idx = this.towers.indexOf(this.selectedTower);
    if (idx !== -1) this.towers.splice(idx, 1);
    this.selectedTower.destroy();
    this.selectedTower = null;

    this.ui.updateGold(this.economy.gold);
    this.ui.hideTowerInfo();
    this.ui.updateTowerSlots(this.economy.gold);
    this.audioSystem.playSell();
  }

  _onKeyDown(key) {
    if (key === 'escape') {
      if (this.state === 'playing') {
        this._pause();
      } else if (this.state === 'paused') {
        this._resume();
      }
    }

    if (this.state !== 'playing') return;

    // Number keys select towers
    const towerKeys = { '1': 'arrow', '2': 'frost', '3': 'cannon', '4': 'laser' };
    if (towerKeys[key]) {
      this._selectTowerType(towerKeys[key]);
    }
  }

  _setQuality(level) {
    this.audioSystem.playButtonClick();
    this.gameScene.setQuality(level);
    const q = QUALITY[level];
    this.particleSystem.setMaxParticles(q.particles);
  }

  _onWaveAutoStart(waveNum) {
    // Called when a wave starts from prep timer expiring
    this.ui.showWaveBanner(waveNum + 1, this.waveManager.getWaveDesc());
    this.ui.showNextWaveButton(false);
    this.ui.hideWavePreview();
    // Apply interest
    const interest = this.economy.applyInterest();
    this.ui.updateGold(this.economy.gold);
  }

  _onEnemyDeath(enemy) {
    this.economy.earn(enemy.reward);
    this.waveManager.totalGoldEarned += enemy.reward;
    this.ui.updateGold(this.economy.gold);
    this.ui.updateTowerSlots(this.economy.gold);

    // Floating gold text at enemy's screen position
    const pos = enemy.position.clone();
    pos.project(this.gameScene.camera);
    const screenX = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    this.ui.showFloatingGold(enemy.reward, screenX, screenY);
  }

  _onEnemyReachEnd(enemy) {
    const dead = this.economy.loseLife(enemy.damage);
    this.ui.updateLives(this.economy.lives);

    // Crystal takes damage
    this.map.crystalHealth = this.economy.lives / GAME.STARTING_LIVES;
    this.particleSystem.spawnCrystalHit(this.map.getCrystalPosition());
    this.audioSystem.playCrystalHit();

    if (dead) {
      this.state = 'defeat';
      this.audioSystem.playDefeat();
      this.ui.showDefeat(
        this.waveManager.currentWave,
        this.waveManager.totalKills,
        this.waveManager.totalGoldEarned
      );
    }
  }

  _gameLoop() {
    requestAnimationFrame(() => this._gameLoop());

    const rawDt = this.gameScene.getDelta();
    const dt = this.state === 'playing' ? Math.min(rawDt, 0.05) * this.gameSpeed : rawDt;
    const elapsed = this.gameScene.getElapsed();

    // Always update visuals
    this.map.update(elapsed, rawDt);
    this.particleSystem.update(rawDt);
    this.gameScene.updateCamera();

    if (this.state === 'playing') {
      // Wave manager
      this.waveManager.update(
        dt,
        this.gameScene.scene,
        this.particleSystem,
        this.audioSystem,
        (enemy) => this._onEnemyDeath(enemy),
        (enemy) => this._onEnemyReachEnd(enemy),
        (waveNum) => this._onWaveAutoStart(waveNum)
      );

      // Update towers
      this.towers.forEach((tower) => {
        tower.update(dt, this.waveManager.activeEnemies, this.particleSystem, this.audioSystem);
      });

      // UI updates
      this.ui.updateWave(this.waveManager.currentWave, GAME.TOTAL_WAVES);
      this.ui.updateTowerSlots(this.economy.gold);
      if (this.selectedTower) {
        this.ui.updateUpgradeAffordability(this.economy.gold, this.selectedTower);
      }

      // Prep phase UI
      if (this.waveManager.state === 'prep') {
        this.ui.updatePrepTimer(this.waveManager.prepTimer);
        this.ui.showNextWaveButton(true);
        this.ui.showWavePreview(this.waveManager.getWavePreview());
      } else {
        this.ui.updatePrepTimer(0);
        this.ui.showNextWaveButton(false);
      }

      // Wave transitions
      if (this.waveManager.state === 'spawning' || this.waveManager.state === 'active') {
        this.ui.hideWavePreview();
      }

      // Victory check
      if (this.waveManager.state === 'victory') {
        this.state = 'victory';
        this.audioSystem.playVictory();
        this.ui.showVictory(
          GAME.TOTAL_WAVES,
          this.waveManager.totalKills,
          this.waveManager.totalGoldEarned
        );
      }
    }

    // Render
    this.gameScene.render();
  }
}

// Start!
const game = new Game();
