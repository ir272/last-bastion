// ===== Audio System: Web Audio API synthesized sounds =====

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) {
      console.warn('AudioContext not available');
      this.enabled = false;
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  _playTone(freq, duration, type = 'sine', volume = 0.3, detune = 0) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(duration, volume = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playShot(towerType) {
    if (!this.enabled) return;
    switch (towerType) {
      case 'arrow':
        // Short twang
        this._playTone(800, 0.08, 'triangle', 0.15);
        this._playTone(600, 0.05, 'triangle', 0.1);
        break;
      case 'frost':
        // Icy whoosh
        this._playNoise(0.2, 0.08);
        this._playTone(1200, 0.15, 'sine', 0.1);
        break;
      case 'cannon':
        // Deep boom
        this._playTone(80, 0.3, 'sine', 0.4);
        this._playNoise(0.15, 0.15);
        break;
      case 'laser':
        // Continuous hum (short burst)
        this._playTone(440, 0.1, 'sawtooth', 0.05, 50);
        break;
    }
  }

  playEnemyDeath() {
    if (!this.enabled) return;
    this._playTone(300, 0.15, 'square', 0.1);
    this._playTone(200, 0.1, 'square', 0.08);
  }

  playCrystalHit() {
    if (!this.enabled) return;
    this._playTone(200, 0.3, 'sawtooth', 0.2);
    this._playTone(150, 0.4, 'sine', 0.15);
  }

  playWaveStart() {
    if (!this.enabled) return;
    // Ascending horn
    this._playTone(220, 0.2, 'sawtooth', 0.15);
    setTimeout(() => this._playTone(330, 0.2, 'sawtooth', 0.15), 150);
    setTimeout(() => this._playTone(440, 0.3, 'sawtooth', 0.2), 300);
  }

  playPlaceTower() {
    if (!this.enabled) return;
    this._playTone(500, 0.1, 'sine', 0.15);
    this._playTone(700, 0.1, 'sine', 0.1);
  }

  playUpgrade() {
    if (!this.enabled) return;
    this._playTone(400, 0.1, 'sine', 0.12);
    setTimeout(() => this._playTone(600, 0.1, 'sine', 0.12), 80);
    setTimeout(() => this._playTone(800, 0.15, 'sine', 0.15), 160);
  }

  playSell() {
    if (!this.enabled) return;
    this._playTone(600, 0.1, 'triangle', 0.1);
    this._playTone(400, 0.12, 'triangle', 0.08);
  }

  playVictory() {
    if (!this.enabled) return;
    const notes = [262, 330, 392, 523];
    notes.forEach((f, i) => {
      setTimeout(() => this._playTone(f, 0.3, 'sine', 0.2), i * 200);
    });
  }

  playDefeat() {
    if (!this.enabled) return;
    this._playTone(200, 0.5, 'sawtooth', 0.15);
    setTimeout(() => this._playTone(150, 0.6, 'sawtooth', 0.12), 300);
    setTimeout(() => this._playTone(100, 0.8, 'sawtooth', 0.1), 600);
  }

  playButtonClick() {
    if (!this.enabled) return;
    this._playTone(600, 0.05, 'sine', 0.08);
  }
}
