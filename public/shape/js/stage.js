/**
 * Molecular Shapes 3D Stage Engine
 * Built on Three.js (v128+)
 * Renders CPK atom spheres, bond cylinders, translucent lone pair electron clouds,
 * bond angle arcs, and molecular dipole vectors.
 * Zero-CJK compliant.
 */

import { CPK_COLORS, ATOM_RADII } from "./data.js";
import { getDomainCoordinates, calculateVSEPR } from "./vsepr.js";

export class MoleculeStage {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.THREE = window.THREE;
    if (!this.THREE) {
      console.error("Three.js is not loaded.");
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.moleculeGroup = null;
    this.lonePairGroup = null;
    this.angleGroup = null;
    this.dipoleGroup = null;

    // Display flags
    this.showLonePairs = true;
    this.showAngles = true;
    this.showDipole = false;
    this.autoRotate = false;

    // Interaction state
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.rotation = { x: 0.3, y: 0.4 };
    this.zoom = 5.5;
    this.targetZoom = 5.5;

    this.animId = null;

    this.initScene();
    this.bindEvents();
    this.start();
  }

  initScene() {
    const THREE = this.THREE;
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, this.zoom);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.45);
    dirLight2.position.set(-6, -8, -5);
    this.scene.add(dirLight2);

    // 5. Molecule root groups
    this.moleculeGroup = new THREE.Group();
    this.lonePairGroup = new THREE.Group();
    this.angleGroup = new THREE.Group();
    this.dipoleGroup = new THREE.Group();

    this.moleculeGroup.add(this.lonePairGroup);
    this.moleculeGroup.add(this.angleGroup);
    this.moleculeGroup.add(this.dipoleGroup);
    this.scene.add(this.moleculeGroup);
  }

  bindEvents() {
    const dom = this.renderer.domElement;

    // Drag to rotate
    dom.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.prevMouse = { x: e.clientX, y: e.clientY };

      this.rotation.y += dx * 0.008;
      this.rotation.x += dy * 0.008;
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Touch support
    dom.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener("touchmove", (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      this.rotation.y += dx * 0.008;
      this.rotation.x += dy * 0.008;
    });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
    });

    // Wheel zoom
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetZoom += e.deltaY * 0.004;
      this.targetZoom = Math.max(2.5, Math.min(12, this.targetZoom));
    }, { passive: false });

    // Resize
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    const renderLoop = () => {
      this.animId = requestAnimationFrame(renderLoop);

      // Auto rotation
      if (this.autoRotate && !this.isDragging) {
        this.rotation.y += 0.006;
      }

      // Smooth zoom interpolation
      this.zoom += (this.targetZoom - this.zoom) * 0.1;
      this.camera.position.z = this.zoom;

      // Apply rotation to molecule group
      this.moleculeGroup.rotation.x = this.rotation.x;
      this.moleculeGroup.rotation.y = this.rotation.y;

      this.renderer.render(this.scene, this.camera);
    };
    renderLoop();
  }

  clearMolecule() {
    const THREE = this.THREE;
    // Remove all meshes from moleculeGroup
    while (this.moleculeGroup.children.length > 0) {
      const obj = this.moleculeGroup.children[0];
      this.moleculeGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    this.lonePairGroup = new THREE.Group();
    this.angleGroup = new THREE.Group();
    this.dipoleGroup = new THREE.Group();

    this.moleculeGroup.add(this.lonePairGroup);
    this.moleculeGroup.add(this.angleGroup);
    this.moleculeGroup.add(this.dipoleGroup);
  }

  /**
   * Render real molecule from chemical database
   */
  renderRealMolecule(mol) {
    this.clearMolecule();
    const THREE = this.THREE;
    if (!mol || !mol.atoms) return;

    // 1. Central & terminal atoms
    const atomMeshes = [];
    mol.atoms.forEach((atom, idx) => {
      const radius = ATOM_RADII[atom.elem] || 0.5;
      const color = CPK_COLORS[atom.elem] || 0xcccccc;

      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.35,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(atom.x, atom.y, atom.z);
      this.moleculeGroup.add(mesh);
      atomMeshes.push(mesh);
    });

    // 2. Bonds (cylinders between connected atoms)
    const central = mol.atoms[0];
    for (let i = 1; i < mol.atoms.length; i++) {
      const target = mol.atoms[i];
      this.createBondCylinder(
        new THREE.Vector3(central.x, central.y, central.z),
        new THREE.Vector3(target.x, target.y, target.z),
        0.12
      );
    }

    // 3. Dipole Moment Vector Arrow
    if (mol.dipole > 0) {
      const dir = new THREE.Vector3(0, 1, 0).normalize();
      const origin = new THREE.Vector3(0, 0, 0);
      const length = Math.min(2.5, 0.8 + mol.dipole * 0.6);
      const arrow = new THREE.ArrowHelper(dir, origin, length, 0xf59e0b, 0.35, 0.2);
      this.dipoleGroup.add(arrow);
    }
    this.dipoleGroup.visible = this.showDipole;

    // 4. Angle Label
    if (mol.atoms.length >= 3) {
      this.renderAngleBadge(mol.bondAngle);
    }
  }

  /**
   * Render theoretical VSEPR Model with dynamic bonding pairs and lone pairs
   */
  renderVseprModel(bondingCount, lonePairCount) {
    this.clearMolecule();
    const THREE = this.THREE;

    // Central Atom A (Purple Sphere)
    const centralRadius = 0.62;
    const centralGeo = new THREE.SphereGeometry(centralRadius, 36, 36);
    const centralMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Violet central atom
      roughness: 0.3,
      metalness: 0.15
    });
    const centralMesh = new THREE.Mesh(centralGeo, centralMat);
    this.moleculeGroup.add(centralMesh);

    // Get 3D vectors for domains
    const domains = getDomainCoordinates(bondingCount, lonePairCount);
    const bondDistance = 1.95;

    let terminalIndex = 0;
    domains.forEach((dom) => {
      const dir = new THREE.Vector3(dom.x, dom.y, dom.z).normalize();
      const pos = dir.clone().multiplyScalar(bondDistance);

      if (dom.type === "bond") {
        // Bonding Terminal Atom X (White/silver sphere)
        const termGeo = new THREE.SphereGeometry(0.44, 28, 28);
        const termMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.3,
          metalness: 0.2
        });
        const termMesh = new THREE.Mesh(termGeo, termMat);
        termMesh.position.copy(pos);
        this.moleculeGroup.add(termMesh);

        // Bond Cylinder
        this.createBondCylinder(new THREE.Vector3(0, 0, 0), pos, 0.1);
        terminalIndex++;
      } else {
        // Translucent Lone Pair Balloon / Cloud Bubble
        const lpMesh = this.createLonePairCloud(dir, bondDistance * 0.88);
        this.lonePairGroup.add(lpMesh);
      }
    });

    this.lonePairGroup.visible = this.showLonePairs;

    // Angle Arc
    const vsepr = calculateVSEPR(bondingCount, lonePairCount);
    if (vsepr.isValid && bondingCount >= 2) {
      this.renderAngleBadge(`${vsepr.idealAngle}°`);
    }
  }

  createBondCylinder(p1, p2, radius = 0.1) {
    const THREE = this.THREE;
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const geo = new THREE.CylinderGeometry(radius, radius, len, 18);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.2
    });

    const cylinder = new THREE.Mesh(geo, mat);
    cylinder.position.copy(mid);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.moleculeGroup.add(cylinder);
  }

  createLonePairCloud(dir, distance) {
    const THREE = this.THREE;
    const lpGroup = new THREE.Group();

    // 1. Translucent tear-drop shaped cloud
    const geo = new THREE.SphereGeometry(0.48, 24, 24);
    geo.scale(0.8, 0.8, 1.4); // elongate along z

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15, // Golden yellow electron cloud
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.5,
      ior: 1.2
    });

    const cloud = new THREE.Mesh(geo, mat);
    cloud.position.copy(dir.clone().multiplyScalar(distance * 0.9));
    cloud.lookAt(dir.clone().multiplyScalar(distance * 2));
    lpGroup.add(cloud);

    // 2. Two small glowing electron dots inside
    const eGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const eMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const e1 = new THREE.Mesh(eGeo, eMat);
    e1.position.set(0.12, 0, distance * 0.95);
    const e2 = new THREE.Mesh(eGeo, eMat);
    e2.position.set(-0.12, 0, distance * 0.95);

    // Orient electrons with cloud
    const eWrapper = new THREE.Group();
    eWrapper.add(e1);
    eWrapper.add(e2);
    eWrapper.lookAt(dir);
    lpGroup.add(eWrapper);

    return lpGroup;
  }

  renderAngleBadge(angleText) {
    const THREE = this.THREE;
    // Create text sprite on canvas
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.roundRect(4, 4, 152, 56, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(angleText, 80, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.55, 1);
    sprite.position.set(0, 1.6, 0);

    this.angleGroup.add(sprite);
    this.angleGroup.visible = this.showAngles;
  }

  setShowLonePairs(val) {
    this.showLonePairs = !!val;
    if (this.lonePairGroup) this.lonePairGroup.visible = this.showLonePairs;
  }

  setShowAngles(val) {
    this.showAngles = !!val;
    if (this.angleGroup) this.angleGroup.visible = this.showAngles;
  }

  setShowDipole(val) {
    this.showDipole = !!val;
    if (this.dipoleGroup) this.dipoleGroup.visible = this.showDipole;
  }

  setAutoRotate(val) {
    this.autoRotate = !!val;
  }

  resetView() {
    this.rotation = { x: 0.3, y: 0.4 };
    this.targetZoom = 5.5;
  }

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener("resize", this.resize);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
