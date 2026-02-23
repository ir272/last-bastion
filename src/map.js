// ===== Map: Path, build nodes, terrain, crystal =====
import * as THREE from 'three';
import { COLORS, GRID } from './utils/constants.js';

// Handcrafted S-curve path (grid coordinates: col, row)
// Enemies enter at the top-left and wind down to the crystal at bottom-right
const PATH_POINTS = [
  [1, 0],   // entry (top edge)
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
  [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
  [8, 5], [8, 4], [8, 3], [8, 2],
  [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2],
  [14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10],
  [13, 10], [12, 10], [11, 10], [10, 10], [9, 10], [8, 10], [7, 10], [6, 10],
  [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14], [9, 14], [10, 14], [11, 14], [12, 14], [13, 14],
  [13, 15], [13, 16], [13, 17],
  [12, 17], [11, 17], [10, 17], [9, 17],
  [9, 18], [9, 19], // crystal position at end
];

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.pathCells = new Set();
    this.buildNodes = []; // { gx, gz, mesh, occupied }
    this.pathWorldPoints = []; // THREE.Vector3 along path center for enemy navigation
    this.crystalMesh = null;
    this.crystalLightMesh = null; // for god rays
    this.spawnPoint = null;
    this.crystalHealth = 1; // 0-1

    this._buildGround();
    this._buildPath();
    this._buildBuildNodes();
    this._buildCrystal();
    this._buildRuneMarkings();
    this._buildAmbientSpores();
  }

  _buildGround() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(GRID.MAP_WIDTH + 4, GRID.MAP_HEIGHT + 4);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLORS.GROUND,
      roughness: 0.95,
      metalness: 0.1,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.01;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Subtle terrain undulation around edges (decorative hills)
    const hillGeo = new THREE.SphereGeometry(2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x0c0c1a, roughness: 1 });
    const hillPositions = [
      [-8, 0, -8], [7, 0, -7], [-6, 0, 8], [9, 0, 9],
      [-9, 0, 2], [10, 0, -3],
    ];
    hillPositions.forEach(([x, y, z]) => {
      const hill = new THREE.Mesh(hillGeo, hillMat);
      const scale = 0.5 + Math.random() * 1;
      hill.scale.set(scale, scale * 0.3, scale);
      hill.position.set(x, y, z);
      hill.receiveShadow = true;
      this.scene.add(hill);
    });
  }

  _buildPath() {
    const originX = -GRID.MAP_WIDTH / 2;
    const originZ = -GRID.MAP_HEIGHT / 2;

    // Register path cells
    PATH_POINTS.forEach(([gx, gz]) => {
      this.pathCells.add(`${gx},${gz}`);
    });

    // Build 3D path meshes (slightly raised, glowing edges)
    const pathGeo = new THREE.BoxGeometry(1, 0.08, 1);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a3a,
      roughness: 0.6,
      metalness: 0.3,
      emissive: 0x0d2a2a,
      emissiveIntensity: 0.6,
    });

    PATH_POINTS.forEach(([gx, gz]) => {
      const mesh = new THREE.Mesh(pathGeo, pathMat);
      mesh.position.set(originX + gx + 0.5, 0.04, originZ + gz + 0.5);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });

    // Build smooth catmull-rom path for enemy navigation
    const rawPoints = PATH_POINTS.map(([gx, gz]) =>
      new THREE.Vector3(originX + gx + 0.5, 0.3, originZ + gz + 0.5)
    );

    // Subdivide path for smoother movement
    const curve = new THREE.CatmullRomCurve3(rawPoints, false, 'catmullrom', 0.3);
    this.pathWorldPoints = curve.getPoints(PATH_POINTS.length * 4);

    // Spawn point
    this.spawnPoint = this.pathWorldPoints[0].clone();
    this.spawnPoint.y = 0.3;

    // Glowing edge lines along path
    const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.TEAL, transparent: true, opacity: 0.35 });
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(this.pathWorldPoints);
    const edgeLine = new THREE.Line(edgeGeo, edgeMat);
    this.scene.add(edgeLine);
  }

  _buildBuildNodes() {
    const originX = -GRID.MAP_WIDTH / 2;
    const originZ = -GRID.MAP_HEIGHT / 2;

    // Build nodes: cells adjacent to path but not on path
    const adjacent = new Set();
    PATH_POINTS.forEach(([gx, gz]) => {
      const neighbors = [
        [gx - 1, gz], [gx + 1, gz], [gx, gz - 1], [gx, gz + 1],
      ];
      neighbors.forEach(([nx, nz]) => {
        if (
          nx >= 0 && nx < GRID.MAP_WIDTH &&
          nz >= 0 && nz < GRID.MAP_HEIGHT &&
          !this.pathCells.has(`${nx},${nz}`)
        ) {
          adjacent.add(`${nx},${nz}`);
        }
      });
    });

    const nodeGeo = new THREE.BoxGeometry(0.9, 0.06, 0.9);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x151530,
      roughness: 0.6,
      metalness: 0.3,
      emissive: 0x0a1a1a,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7,
    });

    // Build node border ring for visibility
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.92, 0.06, 0.92));
    const borderMat = new THREE.LineBasicMaterial({
      color: COLORS.TEAL,
      transparent: true,
      opacity: 0.25,
    });

    adjacent.forEach((key) => {
      const [gx, gz] = key.split(',').map(Number);
      const mesh = new THREE.Mesh(nodeGeo, nodeMat.clone());
      mesh.position.set(originX + gx + 0.5, 0.03, originZ + gz + 0.5);
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Border outline
      const border = new THREE.LineSegments(borderGeo, borderMat.clone());
      border.position.copy(mesh.position);
      this.scene.add(border);

      this.buildNodes.push({ gx, gz, mesh, border, occupied: false, tower: null });
    });
  }

  _buildCrystal() {
    const lastPt = this.pathWorldPoints[this.pathWorldPoints.length - 1];

    // Crystal geometry — icosahedron
    const crystalGeo = new THREE.IcosahedronGeometry(0.6, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: COLORS.CRYSTAL_BASE,
      emissive: COLORS.CRYSTAL_BASE,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.9,
    });

    this.crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystalMesh.position.set(lastPt.x, 1.2, lastPt.z);
    this.crystalMesh.castShadow = true;
    this.scene.add(this.crystalMesh);

    // Light mesh for god rays (small sphere)
    const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: COLORS.CRYSTAL_BASE, transparent: true, opacity: 0.8 });
    this.crystalLightMesh = new THREE.Mesh(lightGeo, lightMat);
    this.crystalLightMesh.position.copy(this.crystalMesh.position);
    this.scene.add(this.crystalLightMesh);

    // Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.5,
      metalness: 0.6,
      emissive: COLORS.TEAL,
      emissiveIntensity: 0.1,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(lastPt.x, 0.25, lastPt.z);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
  }

  _buildRuneMarkings() {
    // Glowing rune circles on the ground near the crystal and spawn
    const runeGeo = new THREE.RingGeometry(1.2, 1.4, 32);
    const runeMat = new THREE.MeshBasicMaterial({
      color: COLORS.PATH_RUNE,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    const lastPt = this.pathWorldPoints[this.pathWorldPoints.length - 1];
    const rune1 = new THREE.Mesh(runeGeo, runeMat);
    rune1.rotation.x = -Math.PI / 2;
    rune1.position.set(lastPt.x, 0.05, lastPt.z);
    this.scene.add(rune1);
    this._runeRing1 = rune1;

    const rune2 = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 1.95, 32),
      runeMat.clone()
    );
    rune2.material.opacity = 0.08;
    rune2.rotation.x = -Math.PI / 2;
    rune2.position.set(lastPt.x, 0.05, lastPt.z);
    this.scene.add(rune2);
    this._runeRing2 = rune2;
  }

  _buildAmbientSpores() {
    // Floating bioluminescent particles (spores) around the map
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const tealColor = new THREE.Color(COLORS.TEAL);
    const purpleColor = new THREE.Color(COLORS.PURPLE);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = 0.5 + Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;

      const c = Math.random() > 0.5 ? tealColor : purpleColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sporesMesh = new THREE.Points(geo, mat);
    this.scene.add(this.sporesMesh);
    this._sporePositions = positions;
  }

  // Animate crystal pulse and rune rotation
  update(time, dt) {
    if (this.crystalMesh) {
      // Pulse glow based on health
      const pulse = Math.sin(time * 3) * 0.2 + 0.8;
      const healthColor = new THREE.Color().lerpColors(
        new THREE.Color(COLORS.CRYSTAL_CRACK),
        new THREE.Color(COLORS.CRYSTAL_BASE),
        this.crystalHealth
      );
      this.crystalMesh.material.emissive.copy(healthColor);
      this.crystalMesh.material.emissiveIntensity = pulse * this.crystalHealth;
      this.crystalMesh.rotation.y += dt * 0.5;
      this.crystalMesh.position.y = 1.2 + Math.sin(time * 2) * 0.1;
    }

    // Rune rings rotate slowly
    if (this._runeRing1) this._runeRing1.rotation.z += dt * 0.3;
    if (this._runeRing2) this._runeRing2.rotation.z -= dt * 0.2;

    // Animate spores (gentle float)
    if (this.sporesMesh) {
      const pos = this._sporePositions;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += Math.sin(time + i) * dt * 0.15;
        // Wrap vertically
        if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = 0.5;
        if (pos[i * 3 + 1] < 0.3) pos[i * 3 + 1] = 4.5;
      }
      this.sporesMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Get build node at grid position
  getBuildNode(gx, gz) {
    return this.buildNodes.find((n) => n.gx === gx && n.gz === gz);
  }

  // Get crystal world position
  getCrystalPosition() {
    return this.crystalMesh ? this.crystalMesh.position.clone() : new THREE.Vector3(0, 0, 0);
  }

  // Highlight build node under cursor
  highlightNode(node, canAfford) {
    if (node && !node.occupied) {
      const color = canAfford ? COLORS.BUILD_HOVER : COLORS.RED;
      node.mesh.material.emissive = new THREE.Color(color);
      node.mesh.material.emissiveIntensity = 0.8;
      node.mesh.material.opacity = 0.9;
      if (node.border) {
        node.border.material.color.setHex(color);
        node.border.material.opacity = 0.8;
      }
    }
  }

  // Reset all node highlights
  resetNodeHighlights() {
    this.buildNodes.forEach((n) => {
      if (!n.occupied) {
        n.mesh.material.emissive = new THREE.Color(0x0a1a1a);
        n.mesh.material.emissiveIntensity = 0.4;
        n.mesh.material.opacity = 0.7;
        if (n.border) {
          n.border.material.color.setHex(COLORS.TEAL);
          n.border.material.opacity = 0.25;
        }
      }
    });
  }
}
