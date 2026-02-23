// ===== GAME CONSTANTS =====

export const GAME = {
  STARTING_GOLD: 150,
  STARTING_LIVES: 20,
  TOTAL_WAVES: 20,
  PREP_TIME: 15, // seconds between waves
  INTEREST_RATE: 0.05, // 5% gold interest per wave
  SELL_REFUND: 0.6, // 60% refund
  BOSS_INTERVAL: 5, // boss every N waves
};

export const GRID = {
  SIZE: 1, // world units per cell
  MAP_WIDTH: 20,
  MAP_HEIGHT: 20,
};

// Colors used throughout (Three.js hex)
export const COLORS = {
  TEAL: 0x00f5d4,
  TEAL_DIM: 0x00a88e,
  PURPLE: 0xb388ff,
  PURPLE_DIM: 0x7c4dff,
  GOLD: 0xffd700,
  GOLD_DIM: 0xb8960f,
  RED: 0xff4757,
  GROUND: 0x0a0a14,
  PATH: 0x1a1a2e,
  PATH_RUNE: 0x00f5d4,
  BUILD_NODE: 0x151528,
  BUILD_HOVER: 0x00f5d4,
  CRYSTAL_BASE: 0x00f5d4,
  CRYSTAL_CRACK: 0xff4757,
  FOG: 0x050510,
  AMBIENT: 0x111133,
};

// Tower definitions
export const TOWERS = {
  arrow: {
    name: 'Arrow Tower',
    cost: 50,
    color: 0x00f5d4,
    levels: [
      { damage: 10, range: 5, speed: 1.0, height: 1.5 },
      { damage: 18, range: 5.5, speed: 0.85, height: 2.0 },
      { damage: 30, range: 6.5, speed: 0.7, height: 2.5 },
    ],
    upgradeCosts: [75, 150],
    projectileType: 'arrow',
  },
  frost: {
    name: 'Frost Tower',
    cost: 75,
    color: 0x88ccff,
    levels: [
      { damage: 5, range: 4, speed: 1.5, height: 1.8, slowFactor: 0.5, slowDuration: 2 },
      { damage: 8, range: 4.5, speed: 1.3, height: 2.3, slowFactor: 0.35, slowDuration: 2.5 },
      { damage: 14, range: 5.5, speed: 1.0, height: 2.8, slowFactor: 0.2, slowDuration: 3 },
    ],
    upgradeCosts: [100, 200],
    projectileType: 'frost',
    isAoE: true,
    aoERadius: 2,
  },
  cannon: {
    name: 'Cannon Tower',
    cost: 100,
    color: 0xffd700,
    levels: [
      { damage: 30, range: 4.5, speed: 2.5, height: 1.6, splashRadius: 1.5 },
      { damage: 50, range: 5, speed: 2.2, height: 2.1, splashRadius: 2 },
      { damage: 80, range: 6, speed: 1.8, height: 2.6, splashRadius: 2.5 },
    ],
    upgradeCosts: [125, 250],
    projectileType: 'cannonball',
    isAoE: true,
  },
  laser: {
    name: 'Laser Tower',
    cost: 125,
    color: 0xb388ff,
    levels: [
      { damage: 8, range: 6, speed: 0.1, height: 2.0, chainCount: 0 },
      { damage: 12, range: 6.5, speed: 0.1, height: 2.5, chainCount: 1 },
      { damage: 18, range: 7.5, speed: 0.1, height: 3.0, chainCount: 3 },
    ],
    upgradeCosts: [150, 300],
    projectileType: 'laser',
    isContinuous: true,
  },
};

// Enemy definitions
export const ENEMIES = {
  grunt: {
    name: 'Grunt',
    hp: 50,
    speed: 2,
    armor: 0,
    reward: 10,
    color: 0x44ff88,
    scale: 0.4,
    damage: 1,
  },
  brute: {
    name: 'Brute',
    hp: 200,
    speed: 1,
    armor: 5, // flat damage reduction
    reward: 25,
    color: 0xff8844,
    scale: 0.7,
    damage: 2,
  },
  swarm: {
    name: 'Swarm',
    hp: 15,
    speed: 4,
    armor: 0,
    reward: 3,
    color: 0xccff44,
    scale: 0.2,
    damage: 1,
  },
  healer: {
    name: 'Healer',
    hp: 60,
    speed: 1.5,
    armor: 0,
    reward: 20,
    color: 0x44ffcc,
    scale: 0.45,
    damage: 1,
    healRadius: 3,
    healRate: 5, // HP/s to nearby enemies
  },
  boss: {
    name: 'Boss',
    hp: 800,
    speed: 0.8,
    armor: 10,
    reward: 100,
    color: 0xff44ff,
    scale: 1.2,
    damage: 5,
  },
};

// Quality presets
export const QUALITY = {
  low: {
    shadows: false,
    particles: 50,
    bloom: false,
    godRays: false,
    pixelRatio: 0.75,
  },
  medium: {
    shadows: true,
    particles: 200,
    bloom: true,
    godRays: false,
    pixelRatio: 1,
  },
  high: {
    shadows: true,
    particles: 500,
    bloom: true,
    godRays: true,
    pixelRatio: window.devicePixelRatio || 1,
  },
};
