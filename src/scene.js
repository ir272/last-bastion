// ===== Scene Setup: Three.js renderer, camera, lighting, post-processing =====
import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass, SMAAEffect, GodRaysEffect, KernelSize } from 'postprocessing';
import { COLORS, QUALITY } from './utils/constants.js';

export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = 'medium';
    this.clock = new THREE.Clock();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLighting();
    this._initFog();
    this._initPostProcessing();
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());
  }

  _initRenderer() {
    const q = QUALITY[this.quality];
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // SMAA handles this
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(q.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.FOG);
    this._addStarfield();
  }

  _addStarfield() {
    // Background stars for atmosphere
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const teal = new THREE.Color(0x00f5d4);
    const purple = new THREE.Color(0xb388ff);
    const white = new THREE.Color(0xaabbcc);

    for (let i = 0; i < starCount; i++) {
      // Distribute on a large sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4; // upper hemisphere
      const r = 60 + Math.random() * 40;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

      const c = Math.random() < 0.15 ? teal : Math.random() < 0.1 ? purple : white;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    // Isometric-ish angle — higher and pulled back to see whole map
    this.camera.position.set(2, 22, 16);
    this.camera.lookAt(2, 0, 2);

    // Camera control state
    this.cameraTarget = new THREE.Vector3(2, 0, 2);
    this.cameraOffset = new THREE.Vector3(0, 22, 14);
    this.zoomLevel = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2.0;
  }

  _initLighting() {
    // Ambient — dim, cool tones
    this.ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, 0.4);
    this.scene.add(this.ambientLight);

    // Main directional (moonlight feel)
    this.dirLight = new THREE.DirectionalLight(0x4466aa, 0.6);
    this.dirLight.position.set(8, 15, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 15;
    this.dirLight.shadow.camera.bottom = -15;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 40;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // Accent rim light from opposite side
    const rimLight = new THREE.DirectionalLight(0x6633aa, 0.3);
    rimLight.position.set(-6, 10, -8);
    this.scene.add(rimLight);

    // Point light at the crystal base position (will be moved when map is built)
    this.crystalLight = new THREE.PointLight(COLORS.TEAL, 2, 12);
    this.crystalLight.position.set(0, 2, 0);
    this.scene.add(this.crystalLight);
  }

  _initFog() {
    this.scene.fog = new THREE.FogExp2(COLORS.FOG, 0.025);
  }

  _initPostProcessing() {
    const q = QUALITY[this.quality];
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom
    if (q.bloom) {
      this.bloomEffect = new BloomEffect({
        intensity: 1.5,
        luminanceThreshold: 0.3,
        luminanceSmoothing: 0.7,
        mipmapBlur: true,
        kernelSize: KernelSize.LARGE,
      });
      this.composer.addPass(new EffectPass(this.camera, this.bloomEffect));
    }

    // SMAA anti-aliasing
    const smaaEffect = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.camera, smaaEffect));

    // Store the god rays light mesh for later
    this.godRaysMesh = null;
  }

  // Add god rays from crystal position (called after map builds crystal)
  addGodRays(lightMesh) {
    const q = QUALITY[this.quality];
    if (!q.godRays) return;
    this.godRaysMesh = lightMesh;
    try {
      const godRaysEffect = new GodRaysEffect(this.camera, lightMesh, {
        density: 0.96,
        decay: 0.92,
        weight: 0.3,
        samples: 60,
        kernelSize: KernelSize.SMALL,
      });
      this.composer.addPass(new EffectPass(this.camera, godRaysEffect));
    } catch (e) {
      // GodRays may fail on some GPUs, just skip
      console.warn('GodRays not supported:', e);
    }
  }

  setQuality(level) {
    this.quality = level;
    const q = QUALITY[level];
    this.renderer.setPixelRatio(q.pixelRatio);
    this.renderer.shadowMap.enabled = q.shadows;
    // Rebuild post-processing
    this.composer.removeAllPasses();
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (q.bloom) {
      this.bloomEffect = new BloomEffect({
        intensity: 1.5,
        luminanceThreshold: 0.3,
        luminanceSmoothing: 0.7,
        mipmapBlur: true,
      });
      this.composer.addPass(new EffectPass(this.camera, this.bloomEffect));
    }
    const smaaEffect = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.camera, smaaEffect));
    if (q.godRays && this.godRaysMesh) {
      this.addGodRays(this.godRaysMesh);
    }
  }

  // Camera controls
  panCamera(dx, dz) {
    this.cameraTarget.x += dx;
    this.cameraTarget.z += dz;
    // Clamp to map bounds
    this.cameraTarget.x = THREE.MathUtils.clamp(this.cameraTarget.x, -12, 12);
    this.cameraTarget.z = THREE.MathUtils.clamp(this.cameraTarget.z, -12, 12);
  }

  zoomCamera(delta) {
    this.zoomLevel = THREE.MathUtils.clamp(
      this.zoomLevel + delta * 0.1,
      this.minZoom,
      this.maxZoom
    );
  }

  updateCamera() {
    const scaledOffset = this.cameraOffset.clone().multiplyScalar(1 / this.zoomLevel);
    const targetPos = this.cameraTarget.clone().add(scaledOffset);
    this.camera.position.lerp(targetPos, 0.08);
    this.camera.lookAt(this.cameraTarget);
  }

  _handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  render() {
    this.composer.render();
  }

  getDelta() {
    return this.clock.getDelta();
  }

  getElapsed() {
    return this.clock.getElapsedTime();
  }
}
