# LAST BASTION

A 3D tower defense game with a bioluminescent dark fantasy aesthetic, built with Three.js.

![Game Screenshot](https://img.shields.io/badge/status-v1.0-00f5d4?style=flat-square)

## Play

```bash
npm install
npm run dev
```

Or build for production:
```bash
npm run build
npm run preview
```

## Game Overview

Defend your crystal base from waves of enemies marching along a winding path. Place and upgrade towers strategically to survive 20 increasingly challenging waves. Earn gold from kills, collect interest between waves, and build the ultimate defense.

## Features

### Towers (4 types, 3 upgrade levels each)
- **Arrow Tower** (50g) — Fast single-target damage
- **Frost Tower** (75g) — AoE slow + damage in a radius
- **Cannon Tower** (100g) — Massive AoE splash damage with shockwaves
- **Laser Tower** (125g) — Continuous beam, chains between enemies at max level

### Enemies (5 types)
- **Grunt** — Standard medium-speed unit
- **Brute** — Slow, high HP, armored (flat damage reduction)
- **Swarm** — Tiny, very fast, low HP, comes in groups of 10+
- **Healer** — Regenerates nearby enemies' HP
- **Boss** — Massive, appears every 5 waves

### Systems
- **20 hand-tuned waves** with escalating enemy compositions and boss fights
- **Economy**: Gold from kills, 5% interest per wave, 60% tower sell refund
- **Tower upgrades**: 3 levels per tower with visual progression (taller, brighter)
- **Wave preview**: See incoming enemy types before each wave

### Visuals
- **Bioluminescent dark fantasy aesthetic**: Deep blacks, glowing teal/purple/gold
- **Post-processing**: Bloom, SMAA anti-aliasing, optional god rays
- **Particle effects**: Projectile trails, explosions, frost nova rings, shockwaves, death bursts
- **Dynamic lighting**: Colored point lights on towers, crystal glow, spawn portal
- **Ambient atmosphere**: Floating spores, starfield, animated rune circles
- **3 quality presets**: Low / Medium / High (shadow, particle, bloom control)

### Audio
- **Synthesized sound effects** via Web Audio API (no asset files needed)
- Unique sounds per tower type, enemy death, crystal hit, wave start horn
- Victory/defeat musical stings

## Controls

| Input | Action |
|-------|--------|
| **Left Click** | Select tower / Place tower / Select existing tower |
| **Right Click + Drag** | Pan camera |
| **Scroll Wheel** | Zoom in/out |
| **1-4** | Quick-select tower types |
| **ESC** | Pause / Resume |

## Architecture

```
src/
  main.js              # Game loop, state management, input handling
  scene.js             # Three.js renderer, camera, lighting, post-processing
  map.js               # Path generation, build nodes, crystal, terrain
  towers/Tower.js      # Tower base class with all 4 types
  enemies/Enemy.js     # Enemy base class with all 5 types
  systems/
    ParticleSystem.js   # Particle effects (trails, explosions, nova, beams)
    AudioSystem.js      # Web Audio API synthesized sounds
    WaveManager.js      # Wave definitions, spawning, state management
    EconomySystem.js    # Gold, lives, transactions, interest
    InputManager.js     # Mouse, keyboard, raycasting, camera controls
  ui/UIManager.js      # All HUD, menus, overlays
  utils/
    constants.js        # Game balance, tower/enemy stats, colors, quality presets
    helpers.js          # Math utilities, grid conversion, object pooling
```

## Tech Stack

- **Three.js** — 3D rendering
- **postprocessing** — Bloom, SMAA, god rays
- **Vite** — Build tool and dev server
- **Vanilla JS** — No frameworks
