/**
 * ASTRA — Mars Surface Reconnaissance Module
 * High-performance 3D surface view of Mars featuring terrain displacement,
 * interactive controllable rover, terrain collision, first-person/chase camera switching,
 * selectable scientific points of interest, rock formations, and dust storm simulation.
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

import {MARS_POIS} from './missionInterface.js';

export class MarsSurface {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = null;
    this.camera = null;
    this.orbitControls = null;
    this.dustParticles = null;
    this.particlePositions = null;
    this.dustStormActive = false;
    this.temperatureDropActive = false;
    this.terrainMesh = null;
    this.sunLight = null;
    this.ambientLight = null;

    // Rover Vehicle System
    this.rover = null;
    this.roverState = {
      x: 0,
      z: 3,
      y: 0,
      heading: 0, // radians, 0 is facing -Z
      speed: 0, // m/s
      maxSpeed: 7.5, // ~27 km/h
      reverseSpeed: -3.0,
      acceleration: 6.5,
      deceleration: 8.0,
      steeringAngle: 0,
      maxSteer: 0.65,
      steerSpeed: 2.5,
      pitch: 0,
      roll: 0,
    };

    // Control Inputs
    this.inputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
    };

    // Camera Modes: 'chase' | 'cockpit' | 'orbit'
    this.cameraMode = 'chase';
    this.cameraOffsetChase = new THREE.Vector3(0, 3.2, 7.5);
    this.cameraOffsetCockpit = new THREE.Vector3(0, 1.45, 0.4);

    // Selected Scientific POI
    this.pois = MARS_POIS;
    this.activePOI = null;
    this.poiMarkers = new Map();

    this.initScene();
    this.bindKeyboard();
  }

  initScene() {
    this.scene = new THREE.Scene();

    // Mars atmospheric sky color and density
    this.normalSkyColor = new THREE.Color(0xb55a36);
    this.stormSkyColor = new THREE.Color(0x782810);
    this.frostSkyColor = new THREE.Color(0x946050);

    this.scene.background = this.normalSkyColor.clone();
    this.scene.fog = new THREE.FogExp2(0xb55a36, 0.012);

    // Dedicated surface camera
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(0, 4.0, 12);

    // OrbitControls for free spectator inspection
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 1.5;
    this.orbitControls.maxDistance = 80;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.orbitControls.minPolarAngle = 0.1;
    this.orbitControls.target.set(0, 1.5, 0);

    this.setupLighting();
    this.createTerrain();
    this.createRockFormations();
    this.createHabitatOutpost();
    this.createRover();
    this.createPOIMarkers();
    this.createDustParticles();
  }

  setupLighting() {
    this.sunLight = new THREE.DirectionalLight(0xffeedb, 2.4);
    this.sunLight.position.set(120, 70, -140);
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x8a452a, 0.85);
    this.scene.add(this.ambientLight);

    const groundLight = new THREE.DirectionalLight(0x5c2b18, 0.5);
    groundLight.position.set(0, -10, 0);
    this.scene.add(groundLight);
  }

  createTerrain() {
    const size = 320;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, this.getTerrainHeight(x, z));
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xc14b24,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.terrainMesh);
  }

  getTerrainHeight(x, z) {
    const d1 = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.5;
    const d2 = Math.sin(x * 0.09 + 1.2) * Math.sin(z * 0.08) * 1.2;
    const d3 = Math.cos((x * x + z * z) * 0.0003) * 2.0;
    const craterDepression = -Math.exp(-(x * x + z * z) * 0.0008) * 2.5;
    return d1 + d2 + d3 + craterDepression;
  }

  createRockFormations() {
    const rockGeoBase = new THREE.DodecahedronGeometry(1, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6e2f1c,
      roughness: 0.95,
      metalness: 0.05,
    });

    const rockCount = 90;
    for (let i = 0; i < rockCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 85;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const rock = new THREE.Mesh(rockGeoBase, rockMat);
      const scaleX = 0.5 + Math.random() * 2.0;
      const scaleY = (0.4 + Math.random() * 1.5) * 0.7;
      const scaleZ = 0.5 + Math.random() * 2.0;

      rock.scale.set(scaleX, scaleY, scaleZ);
      rock.position.set(x, y + scaleY * 0.4, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.scene.add(rock);
    }
  }

  createHabitatOutpost() {
    const outpostGroup = new THREE.Group();
    outpostGroup.position.set(0, this.getTerrainHeight(0, -6), -6);

    // Hab dome
    const domeGeo = new THREE.SphereGeometry(3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      roughness: 0.4,
      metalness: 0.6,
    });
    outpostGroup.add(new THREE.Mesh(domeGeo, domeMat));

    // Airlock
    const airlockGeo = new THREE.BoxGeometry(1.6, 1.8, 2.2);
    const airlockMat = new THREE.MeshStandardMaterial({color: 0x94a3b8, roughness: 0.5});
    const airlock = new THREE.Mesh(airlockGeo, airlockMat);
    airlock.position.set(0, 0.9, 3.2);
    outpostGroup.add(airlock);

    // Comms Mast & Dish
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 5, 8);
    const mastMat = new THREE.MeshStandardMaterial({color: 0xcbd5e1, metalness: 0.8});
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(-2.5, 2.5, -2);
    outpostGroup.add(mast);

    const dishGeo = new THREE.ConeGeometry(0.8, 0.4, 16, 1, true);
    dishGeo.rotateX(Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, mastMat);
    dish.position.set(-2.5, 5.0, -2);
    outpostGroup.add(dish);

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(4.0, 0.08, 1.8);
    const panelMat = new THREE.MeshStandardMaterial({color: 0x1e3a8a, roughness: 0.2, metalness: 0.9});
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(4.5, 1.2, 0);
    panel.rotation.x = 0.25;
    outpostGroup.add(panel);

    // Beacon light
    const beacon = new THREE.PointLight(0x38bdf8, 1.8, 25);
    beacon.position.set(-2.5, 5.2, -2);
    outpostGroup.add(beacon);

    this.scene.add(outpostGroup);
  }

  /**
   * Constructs the 3D ASTRA Mars Rover with chassis, 6 wheels, mastcam, and headlights
   */
  createRover() {
    this.rover = new THREE.Group();

    // 1. Chassis Body
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.55, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.7,
      roughness: 0.3,
    });
    const chassis = new THREE.Mesh(bodyGeo, bodyMat);
    chassis.position.y = 0.65;
    this.rover.add(chassis);

    // Equipment Deck / Power Unit
    const deckGeo = new THREE.BoxGeometry(1.2, 0.2, 1.4);
    const deckMat = new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.5});
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 0.95, -0.2);
    this.rover.add(deck);

    // RTG Cylinder (Rear power source)
    const rtgGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12);
    const rtgMat = new THREE.MeshStandardMaterial({color: 0x64748b, metalness: 0.8});
    const rtg = new THREE.Mesh(rtgGeo, rtgMat);
    rtg.rotation.x = Math.PI / 2;
    rtg.position.set(0, 0.95, -1.05);
    this.rover.add(rtg);

    // Mastcam & Sensor Head (Forward Cockpit Viewpoint)
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8);
    const mast = new THREE.Mesh(mastGeo, deckMat);
    mast.position.set(0.35, 1.35, 0.6);
    this.rover.add(mast);

    const headGeo = new THREE.BoxGeometry(0.35, 0.2, 0.3);
    const headMat = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.2});
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0.35, 1.85, 0.6);
    this.rover.add(head);

    // High Gain Antenna
    const antGeo = new THREE.CylinderGeometry(0.015, 0.02, 1.4, 6);
    const ant = new THREE.Mesh(antGeo, deckMat);
    ant.position.set(-0.45, 1.5, -0.6);
    this.rover.add(ant);

    // 6 Rocker-Bogie Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.8});

    const wheelOffsets = [
      {x: -0.9, y: 0.32, z: 0.8},
      {x: 0.9, y: 0.32, z: 0.8},
      {x: -0.95, y: 0.32, z: 0.0},
      {x: 0.95, y: 0.32, z: 0.0},
      {x: -0.9, y: 0.32, z: -0.8},
      {x: 0.9, y: 0.32, z: -0.8},
    ];

    this.wheels = [];
    wheelOffsets.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos.x, pos.y, pos.z);
      this.rover.add(wheel);
      this.wheels.push(wheel);
    });

    // Rover Headlights
    const headlightL = new THREE.SpotLight(0xfff7ed, 2.5, 30, Math.PI / 6, 0.5);
    headlightL.position.set(-0.4, 0.7, 1.15);
    headlightL.target.position.set(-0.4, 0.2, 8.0);
    this.rover.add(headlightL);
    this.rover.add(headlightL.target);

    const headlightR = new THREE.SpotLight(0xfff7ed, 2.5, 30, Math.PI / 6, 0.5);
    headlightR.position.set(0.4, 0.7, 1.15);
    headlightR.target.position.set(0.4, 0.2, 8.0);
    this.rover.add(headlightR);
    this.rover.add(headlightR.target);

    // Initial position on terrain
    const initialY = this.getTerrainHeight(this.roverState.x, this.roverState.z);
    this.rover.position.set(this.roverState.x, initialY, this.roverState.z);
    this.scene.add(this.rover);
  }

  /**
   * Creates 3D Holographic Waypoint Markers for Scientific Points of Interest
   */
  createPOIMarkers() {
    this.pois.forEach((poi) => {
      const markerGroup = new THREE.Group();
      const y = this.getTerrainHeight(poi.coordinates.x, poi.coordinates.z);
      markerGroup.position.set(poi.coordinates.x, y, poi.coordinates.z);

      // Floating holographic diamond
      const diamondGeo = new THREE.OctahedronGeometry(1.0, 0);
      const diamondMat = new THREE.MeshBasicMaterial({
        color: poi.id === 'outpost-alpha' ? 0x38bdf8 : 0xfbbf24,
        wireframe: true,
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.y = 3.5;
      markerGroup.add(diamond);

      // Vertical beacon light beam
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.0, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: poi.id === 'outpost-alpha' ? 0x38bdf8 : 0xfbbf24,
        transparent: true,
        opacity: 0.45,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 3.0;
      markerGroup.add(beam);

      markerGroup.userData = {poi};
      this.scene.add(markerGroup);
      this.poiMarkers.set(poi.id, {group: markerGroup, diamond});
    });
  }

  createDustParticles() {
    const count = 1400;
    this.particlePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.particlePositions[idx] = (Math.random() - 0.5) * 160;
      this.particlePositions[idx + 1] = Math.random() * 25 + 0.5;
      this.particlePositions[idx + 2] = (Math.random() - 0.5) * 160;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xd97746,
      size: 0.28,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        this.inputs.forward = true;
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.inputs.backward = true;
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        this.inputs.left = true;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        this.inputs.right = true;
      }
      if (e.code === 'Space') {
        this.inputs.handbrake = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        this.inputs.forward = false;
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.inputs.backward = false;
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        this.inputs.left = false;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        this.inputs.right = false;
      }
      if (e.code === 'Space') {
        this.inputs.handbrake = false;
      }
    });
  }

  setCameraMode(mode) {
    if (['chase', 'cockpit', 'orbit'].includes(mode)) {
      this.cameraMode = mode;
      if (mode === 'orbit') {
        this.orbitControls.enabled = true;
        this.orbitControls.target.copy(this.rover.position);
      } else {
        this.orbitControls.enabled = false;
      }
    }
  }

  selectPOI(poiId) {
    const poi = this.pois.find((p) => p.id === poiId);
    if (poi) {
      this.activePOI = poi;
    }
    return poi;
  }

  clearActivePOI() {
    this.activePOI = null;
  }

  setDustStorm(active) {
    this.dustStormActive = active;

    if (active) {
      this.scene.background = this.stormSkyColor;
      this.scene.fog.density = 0.042;
      this.scene.fog.color = this.stormSkyColor;
      this.dustParticles.material.size = 0.55;
      this.dustParticles.material.opacity = 0.9;
      this.sunLight.intensity = 0.7;
      this.ambientLight.intensity = 0.5;
    } else {
      this.scene.background = this.temperatureDropActive ? this.frostSkyColor : this.normalSkyColor;
      this.scene.fog.density = 0.012;
      this.scene.fog.color = this.scene.background;
      this.dustParticles.material.size = 0.28;
      this.dustParticles.material.opacity = 0.65;
      this.sunLight.intensity = this.temperatureDropActive ? 1.4 : 2.4;
      this.ambientLight.intensity = this.temperatureDropActive ? 0.6 : 0.85;
    }
  }

  setTemperatureDrop(active) {
    this.temperatureDropActive = active;

    if (active) {
      if (!this.dustStormActive) {
        this.scene.background = this.frostSkyColor;
        this.scene.fog.color = this.frostSkyColor;
      }
      this.sunLight.color.setHex(0xcbd5e1);
      this.sunLight.intensity = 1.4;
      this.ambientLight.color.setHex(0x566075);
    } else {
      if (!this.dustStormActive) {
        this.scene.background = this.normalSkyColor;
        this.scene.fog.color = this.normalSkyColor;
      }
      this.sunLight.color.setHex(0xffeedb);
      this.sunLight.intensity = this.dustStormActive ? 0.7 : 2.4;
      this.ambientLight.color.setHex(0x8a452a);
    }
  }

  /**
   * Rover driving mechanics and terrain surface alignment
   */
  updateRover(delta) {
    const state = this.roverState;

    // 1. Steering
    let targetSteer = 0;
    if (this.inputs.left) {
      targetSteer += state.maxSteer;
    }
    if (this.inputs.right) {
      targetSteer -= state.maxSteer;
    }
    state.steeringAngle = THREE.MathUtils.lerp(state.steeringAngle, targetSteer, delta * state.steerSpeed);

    // Apply heading change proportional to speed and steering
    if (Math.abs(state.speed) > 0.05) {
      state.heading += state.steeringAngle * (state.speed / state.maxSpeed) * delta * 2.5;
    }

    // 2. Acceleration / Braking
    if (this.inputs.handbrake) {
      state.speed = THREE.MathUtils.lerp(state.speed, 0, delta * 12.0);
    } else if (this.inputs.forward) {
      state.speed = Math.min(state.maxSpeed, state.speed + state.acceleration * delta);
    } else if (this.inputs.backward) {
      state.speed = Math.max(state.reverseSpeed, state.speed - state.deceleration * delta);
    } else {
      // Natural rolling resistance
      state.speed = THREE.MathUtils.lerp(state.speed, 0, delta * 2.8);
    }

    // 3. Position Translation
    const forwardVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    state.x += forwardVector.x * state.speed * delta;
    state.z += forwardVector.z * state.speed * delta;

    // Boundary constraints (clamped within active map radius)
    state.x = THREE.MathUtils.clamp(state.x, -130, 130);
    state.z = THREE.MathUtils.clamp(state.z, -130, 130);

    // 4. Terrain Height & Surface Normal Alignment
    const centerH = this.getTerrainHeight(state.x, state.z);
    const forwardH = this.getTerrainHeight(state.x + forwardVector.x * 1.5, state.z + forwardVector.z * 1.5);
    const rightVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    const rightH = this.getTerrainHeight(state.x + rightVector.x * 1.0, state.z + rightVector.z * 1.0);

    state.y = centerH;
    state.pitch = Math.atan2(centerH - forwardH, 1.5);
    state.roll = Math.atan2(rightH - centerH, 1.0);

    // Apply transforms to Rover 3D Object
    this.rover.position.set(state.x, state.y, state.z);
    this.rover.rotation.set(0, state.heading, 0, 'YXZ');
    this.rover.rotateX(state.pitch);
    this.rover.rotateZ(state.roll);

    // Rotate wheels
    if (this.wheels) {
      const wheelSpin = (state.speed * delta) / 0.32;
      this.wheels.forEach((w) => w.rotateX(wheelSpin));
    }
  }

  /**
   * Updates camera position based on current camera mode (chase, cockpit, orbit)
   */
  updateCamera() {
    if (!this.rover) {
      return;
    }

    if (this.cameraMode === 'chase') {
      const roverForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.roverState.heading
      );
      const targetCamPos = this.rover.position
        .clone()
        .sub(roverForward.clone().multiplyScalar(this.cameraOffsetChase.z))
        .add(new THREE.Vector3(0, this.cameraOffsetChase.y, 0));

      this.camera.position.lerp(targetCamPos, 0.12);
      const lookTarget = this.rover.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      this.camera.lookAt(lookTarget);
    } else if (this.cameraMode === 'cockpit') {
      const roverForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.roverState.heading
      );
      const eyePos = this.rover.position
        .clone()
        .add(new THREE.Vector3(0, this.cameraOffsetCockpit.y, 0))
        .add(roverForward.clone().multiplyScalar(this.cameraOffsetCockpit.z));

      this.camera.position.copy(eyePos);
      const cockpitLookTarget = eyePos
        .clone()
        .add(roverForward.clone().multiplyScalar(20.0))
        .add(new THREE.Vector3(0, -0.2, 0));
      this.camera.lookAt(cockpitLookTarget);
    } else if (this.cameraMode === 'orbit') {
      this.orbitControls.update();
    }
  }

  update(delta) {
    this.updateRover(delta);
    this.updateCamera();

    // Animate POI markers (gentle rotation)
    this.poiMarkers.forEach(({diamond}) => {
      diamond.rotation.y += delta * 1.5;
    });

    // Animate swirling dust particles
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array;
      const speed = this.dustStormActive ? 28.0 : 5.0;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += delta * speed;
        positions[i + 2] += Math.sin(positions[i] * 0.08) * delta * 2.0;

        if (positions[i] > 80) {
          positions[i] = -80;
        }
        if (positions[i + 2] > 80) {
          positions[i + 2] = -80;
        }
        if (positions[i + 2] < -80) {
          positions[i + 2] = 80;
        }
      }

      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  resetCamera() {
    this.roverState.x = 0;
    this.roverState.z = 3;
    this.roverState.speed = 0;
    this.roverState.heading = 0;
    this.setCameraMode('chase');
  }

  getRoverTelemetry() {
    const s = this.roverState;
    const speedKmH = Math.abs(s.speed * 3.6).toFixed(1);
    const headingDeg = Math.round((THREE.MathUtils.radToDeg(-s.heading) + 360) % 360);

    // Find nearest POI
    let nearest = null;
    let minDistance = Infinity;

    this.pois.forEach((poi) => {
      const dist = Math.hypot(s.x - poi.coordinates.x, s.z - poi.coordinates.z);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = {
          poi,
          distanceMeters: Math.round(dist),
          inRange: dist <= 18,
        };
      }
    });

    return {
      coordinates: `X: ${s.x >= 0 ? '+' : ''}${s.x.toFixed(1)}m, Z: ${s.z >= 0 ? '+' : ''}${s.z.toFixed(1)}m`,
      elevation: `${s.y >= 0 ? '+' : ''}${s.y.toFixed(1)}m`,
      speedKmH: `${speedKmH} km/h`,
      speedRaw: Math.abs(s.speed * 3.6),
      headingDeg: `${headingDeg}°`,
      cameraMode: this.cameraMode,
      nearestPOI: nearest,
      activePOI: this.activePOI,
    };
  }
}
