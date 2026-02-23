// ===== UI Manager: all HUD updates, menus, overlays =====
import { TOWERS, ENEMIES } from '../utils/constants.js';

export class UIManager {
  constructor() {
    // Cache DOM elements
    this.el = {
      mainMenu: document.getElementById('main-menu'),
      hud: document.getElementById('hud'),
      pauseMenu: document.getElementById('pause-menu'),
      settingsMenu: document.getElementById('settings-menu'),
      victoryScreen: document.getElementById('victory-screen'),
      defeatScreen: document.getElementById('defeat-screen'),

      // HUD
      goldValue: document.getElementById('gold-value'),
      livesValue: document.getElementById('lives-value'),
      waveValue: document.getElementById('wave-value'),
      waveTotal: document.getElementById('wave-total'),
      speedBtn: document.getElementById('btn-speed'),
      nextWaveBtn: document.getElementById('btn-next-wave'),
      waveTimer: document.getElementById('wave-timer'),

      // Wave banner
      waveBanner: document.getElementById('wave-banner'),
      bannerWaveNum: document.getElementById('banner-wave-num'),
      bannerWaveDesc: document.getElementById('banner-wave-desc'),

      // Tower panel
      towerPanel: document.getElementById('tower-panel'),
      towerSlots: document.querySelectorAll('.tower-slot'),

      // Tower info
      towerInfo: document.getElementById('tower-info'),
      infoTowerName: document.getElementById('info-tower-name'),
      infoTowerLevel: document.getElementById('info-tower-level'),
      infoDamage: document.getElementById('info-damage'),
      infoRange: document.getElementById('info-range'),
      infoSpeed: document.getElementById('info-speed'),
      upgradeBtn: document.getElementById('btn-upgrade'),
      upgradeCost: document.getElementById('upgrade-cost'),
      sellBtn: document.getElementById('btn-sell'),
      sellValue: document.getElementById('sell-value'),
      upgradePreview: document.getElementById('upgrade-preview'),
      previewDamage: document.getElementById('preview-damage'),
      previewRange: document.getElementById('preview-range'),
      previewSpeed: document.getElementById('preview-speed'),

      // Wave preview
      wavePreview: document.getElementById('wave-preview'),
      wavePreviewEnemies: document.getElementById('wave-preview-enemies'),

      // End screens
      victoryWaves: document.getElementById('victory-waves'),
      victoryKills: document.getElementById('victory-kills'),
      victoryGold: document.getElementById('victory-gold'),
      defeatWaves: document.getElementById('defeat-waves'),
      defeatKills: document.getElementById('defeat-kills'),
      defeatGold: document.getElementById('defeat-gold'),
    };

    // Callbacks (set by Game)
    this.onStart = null;
    this.onResume = null;
    this.onQuit = null;
    this.onRestart = null;
    this.onSpeedToggle = null;
    this.onSendWave = null;
    this.onTowerSelect = null;
    this.onUpgrade = null;
    this.onSell = null;
    this.onQualityChange = null;
    this.onSoundToggle = null;

    this._previousSettingsParent = null;
    this._setupButtons();
  }

  _setupButtons() {
    // Main menu
    document.getElementById('btn-start').addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    document.getElementById('btn-settings-menu').addEventListener('click', () => {
      this._previousSettingsParent = 'mainMenu';
      this.el.mainMenu.classList.add('hidden');
      this.el.settingsMenu.classList.remove('hidden');
    });

    // Pause
    document.getElementById('btn-resume').addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });
    document.getElementById('btn-settings-pause').addEventListener('click', () => {
      this._previousSettingsParent = 'pauseMenu';
      this.el.pauseMenu.classList.add('hidden');
      this.el.settingsMenu.classList.remove('hidden');
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      if (this.onQuit) this.onQuit();
    });

    // Settings
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      this.el.settingsMenu.classList.add('hidden');
      if (this._previousSettingsParent === 'mainMenu') {
        this.el.mainMenu.classList.remove('hidden');
      } else {
        this.el.pauseMenu.classList.remove('hidden');
      }
    });

    document.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-quality]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onQualityChange) this.onQualityChange(btn.dataset.quality);
      });
    });

    document.querySelectorAll('[data-sound]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-sound]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onSoundToggle) this.onSoundToggle(btn.dataset.sound === 'on');
      });
    });

    // Speed
    this.el.speedBtn.addEventListener('click', () => {
      if (this.onSpeedToggle) this.onSpeedToggle();
    });

    // Send wave
    this.el.nextWaveBtn.addEventListener('click', () => {
      if (this.onSendWave) this.onSendWave();
    });

    // Tower selection
    this.el.towerSlots.forEach((slot) => {
      slot.addEventListener('click', () => {
        const type = slot.dataset.tower;
        if (this.onTowerSelect) this.onTowerSelect(type);
      });
    });

    // Upgrade / sell
    this.el.upgradeBtn.addEventListener('click', () => {
      if (this.onUpgrade) this.onUpgrade();
    });
    this.el.sellBtn.addEventListener('click', () => {
      if (this.onSell) this.onSell();
    });

    // Victory / Defeat
    document.getElementById('btn-victory-restart').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    document.getElementById('btn-victory-menu').addEventListener('click', () => {
      if (this.onQuit) this.onQuit();
    });
    document.getElementById('btn-defeat-restart').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    document.getElementById('btn-defeat-menu').addEventListener('click', () => {
      if (this.onQuit) this.onQuit();
    });
  }

  // State transitions
  showMainMenu() {
    this._hideAll();
    this.el.mainMenu.classList.remove('hidden');
  }

  showHUD() {
    this._hideAll();
    this.el.hud.classList.remove('hidden');
  }

  showPause() {
    this.el.pauseMenu.classList.remove('hidden');
  }

  hidePause() {
    this.el.pauseMenu.classList.add('hidden');
  }

  showVictory(waves, kills, gold) {
    this.el.victoryWaves.textContent = waves;
    this.el.victoryKills.textContent = kills;
    this.el.victoryGold.textContent = gold;
    this.el.victoryScreen.classList.remove('hidden');
  }

  showDefeat(waves, kills, gold) {
    this.el.defeatWaves.textContent = waves;
    this.el.defeatKills.textContent = kills;
    this.el.defeatGold.textContent = gold;
    this.el.defeatScreen.classList.remove('hidden');
  }

  _hideAll() {
    this.el.mainMenu.classList.add('hidden');
    this.el.hud.classList.add('hidden');
    this.el.pauseMenu.classList.add('hidden');
    this.el.settingsMenu.classList.add('hidden');
    this.el.victoryScreen.classList.add('hidden');
    this.el.defeatScreen.classList.add('hidden');
    this.el.towerInfo.classList.add('hidden');
    this.el.waveBanner.classList.add('hidden');
    this.el.wavePreview.classList.add('hidden');
  }

  // HUD updates
  updateGold(amount) {
    this.el.goldValue.textContent = amount;
    // Flash effect
    this.el.goldValue.style.transform = 'scale(1.2)';
    setTimeout(() => { this.el.goldValue.style.transform = 'scale(1)'; }, 150);
  }

  updateLives(amount) {
    this.el.livesValue.textContent = amount;
    if (amount <= 5) {
      this.el.livesValue.style.color = '#ff4757';
    }
  }

  updateWave(current, total) {
    this.el.waveValue.textContent = current + 1;
    this.el.waveTotal.textContent = `/${total}`;
  }

  updateSpeed(multiplier) {
    this.el.speedBtn.textContent = `${multiplier}x`;
  }

  updatePrepTimer(seconds) {
    if (seconds > 0) {
      this.el.waveTimer.classList.remove('hidden');
      this.el.waveTimer.textContent = `${Math.ceil(seconds)}s`;
    } else {
      this.el.waveTimer.classList.add('hidden');
    }
  }

  showNextWaveButton(show) {
    this.el.nextWaveBtn.style.display = show ? 'block' : 'none';
  }

  // Wave banner
  showWaveBanner(waveNum, desc) {
    this.el.bannerWaveNum.textContent = waveNum;
    this.el.bannerWaveDesc.textContent = desc;
    this.el.waveBanner.classList.remove('hidden');
    setTimeout(() => {
      this.el.waveBanner.classList.add('hidden');
    }, 2500);
  }

  // Tower selection highlight
  selectTowerSlot(type) {
    this.el.towerSlots.forEach((slot) => {
      slot.classList.toggle('selected', slot.dataset.tower === type);
    });
  }

  clearTowerSelection() {
    this.el.towerSlots.forEach((slot) => slot.classList.remove('selected'));
  }

  // Update tower slot affordability
  updateTowerSlots(gold) {
    this.el.towerSlots.forEach((slot) => {
      const type = slot.dataset.tower;
      const cost = parseInt(slot.querySelector('.tower-cost').textContent);
      slot.classList.toggle('disabled', gold < cost);
    });
  }

  // Tower info panel
  showTowerInfo(tower) {
    const def = tower.definition;
    const stats = tower.stats;
    this.el.infoTowerName.textContent = def.name;
    this.el.infoTowerLevel.textContent = `Lv ${tower.level + 1}`;
    this.el.infoDamage.textContent = stats.damage;
    this.el.infoRange.textContent = stats.range;
    this.el.infoSpeed.textContent = `${stats.speed}s`;

    if (tower.level < 2) {
      const nextStats = def.levels[tower.level + 1];
      const cost = tower.getUpgradeCost();
      this.el.upgradeBtn.disabled = false;
      this.el.upgradeCost.textContent = `${cost}g`;
      this.el.upgradePreview.classList.remove('hidden');
      this.el.previewDamage.textContent = `→ ${nextStats.damage}`;
      this.el.previewRange.textContent = `→ ${nextStats.range}`;
      this.el.previewSpeed.textContent = `→ ${nextStats.speed}s`;
    } else {
      this.el.upgradeBtn.disabled = true;
      this.el.upgradeCost.textContent = 'MAX';
      this.el.upgradePreview.classList.add('hidden');
    }

    this.el.sellValue.textContent = `${tower.getSellValue()}g`;
    this.el.towerInfo.classList.remove('hidden');
  }

  hideTowerInfo() {
    this.el.towerInfo.classList.add('hidden');
  }

  // Wave preview
  showWavePreview(enemies) {
    this.el.wavePreviewEnemies.innerHTML = '';
    enemies.forEach((e) => {
      const chip = document.createElement('div');
      chip.className = 'enemy-preview-chip';
      chip.innerHTML = `<span class="count">${e.count}x</span> ${e.name}`;
      this.el.wavePreviewEnemies.appendChild(chip);
    });
    this.el.wavePreview.classList.remove('hidden');
  }

  hideWavePreview() {
    this.el.wavePreview.classList.add('hidden');
  }
}
