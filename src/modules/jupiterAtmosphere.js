/**
 * ASTRA — Jupiter Atmospheric Exploration Module
 * Simulates high-velocity conceptual flight within Jupiter's deep hydrogen-helium atmosphere.
 * Features multi-layered 3D cloud decks, Great Red Spot storm vortex reconstruction,
 * controllable ASTRA Jovian Aeroskimmer vessel, thermodynamic depth modeling, and envelope warnings.
 *
 * NOTE: The Jovian Aeroskimmer is a conceptual research vehicle operating on simplified
 * aerothermodynamic heuristics for educational simulation. Jupiter has no solid surface.
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export class JupiterAtmosphere {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = null;
    this.camera = null;
    this.orbitControls = null;

    // Vehicle Flight System
    this.vessel = null;
    this.vesselState = {
      x: 0,
      y: 0, // altitude index: 0 corresponds to 1.0 bar ammonia deck
      z: 0,
      heading: 0, // yaw in radians
      pitch: 0, // pitch in radians
      roll: 0,
      throttle: 0.5, // 0.0 to 1.0
      speed: 120, // m/s (~432 km/h)
      energy: 100.0,
      hullStress: 18.0, // percentage
    };

    // Environmental / Pressure Depth Model
    // y = 0 -> 1.0 bar (ammonia cloud deck)
    // y > 0 -> lower pressure (stratospheric haze, e.g. y = +40 -> 0.1 bar)
    // y < 0 -> higher pressure (crush depths, e.g. y = -30 -> 5.0 bar, y = -60 -> 12.0 bar)
    this.currentPressureBar = 1.0;
    this.currentTempC = -110;
    this.currentDensityKgM3 = 0.16;
    this.currentWindSpeedKmH = 460;

    // Camera Modes: 'chase' | 'cockpit' | 'orbit'
    this.cameraMode = 'chase';
    this.cameraOffsetChase = new THREE.Vector3(0, 3.8, 12.0);
    this.cameraOffsetCockpit = new THREE.Vector3(0, 0.8, 1.2);

    // Dynamic Cloud Decks & Storms
    this.cloudLayers = [];
    this.stormVortex = null;
    this.lightningLight = null;
    this.lightningTimer = 0;

    // User Inputs
    this.inputs = {
      throttleUp: false,
      throttleDown: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
    };

    this.initScene();
    this.bindKeyboard();
  }

  initScene() {
    this.scene = new THREE.Scene();

    // Jovian upper cloud-deck background & exponential fog
    this.ambientSkyColor = new THREE.Color(0xb57c50);
    this.scene.background = this.ambientSkyColor.clone();
    this.scene.fog = new THREE.FogExp2(0xb57c50, 0.008);

    // Dedicated atmospheric camera
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 4.0, 15);

    // OrbitControls for free vessel inspection
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 3.0;
    this.orbitControls.maxDistance = 120;
    this.orbitControls.target.set(0, 0, 0);

    this.setupLighting();
    this.createLayeredClouds();
    this.createGreatRedSpotVortex();
    this.createAeroskimmerVehicle();
  }

  setupLighting() {
    // Heavily filtered solar illumination passing through upper stratospheric haze
    this.sunLight = new THREE.DirectionalLight(0xffecd4, 1.6);
    this.sunLight.position.set(200, 150, -200);
    this.scene.add(this.sunLight);

    // Intense multi-directional internal cloud radiance
    this.ambientLight = new THREE.AmbientLight(0x9a5832, 0.9);
    this.scene.add(this.ambientLight);

    // Stochastic lightning discharge flash
    this.lightningLight = new THREE.PointLight(0xa5f3fc, 0, 150);
    this.lightningLight.position.set(0, -20, -50);
    this.scene.add(this.lightningLight);
  }

  /**
   * Creates multi-altitude layered 3D cloud decks representing Jovian atmospheric bands
   */
  createLayeredClouds() {
    const layerConfigs = [
      {y: 35, color: 0xd6a77a, opacity: 0.45, size: 800, count: 600}, // Upper haze
      {y: 0, color: 0xc48455, opacity: 0.65, size: 800, count: 1200}, // Ammonia deck (1 bar)
      {y: -25, color: 0x8a3c1e, opacity: 0.75, size: 800, count: 1000}, // Ammonium hydrosulfide
      {y: -50, color: 0x3d2015, opacity: 0.85, size: 800, count: 800}, // Deep water-ice / crush zone
    ];

    layerConfigs.forEach((cfg) => {
      const positions = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const idx = i * 3;
        positions[idx] = (Math.random() - 0.5) * cfg.size;
        positions[idx + 1] = cfg.y + (Math.random() - 0.5) * 12;
        positions[idx + 2] = (Math.random() - 0.5) * cfg.size;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: cfg.color,
        size: 2.2,
        transparent: true,
        opacity: cfg.opacity,
        sizeAttenuation: true,
      });

      const layer = new THREE.Points(geo, mat);
      this.scene.add(layer);
      this.cloudLayers.push({points: layer, baseY: cfg.y});
    });
  }

  /**
   * Reconstruction of the Great Red Spot storm vortex feature
   */
  createGreatRedSpotVortex() {
    const vortexGroup = new THREE.Group();
    vortexGroup.position.set(40, -10, -90);

    // Oval storm core
    const coreGeo = new THREE.CylinderGeometry(28, 38, 12, 32);
    coreGeo.scale(1.6, 1.0, 1.0); // Jovian anticyclonic oval elongation
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Deep crimson carmine
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    vortexGroup.add(core);

    // Outer counter-clockwise swirling cloud ring
    const ringGeo = new THREE.RingGeometry(35, 55, 32);
    ringGeo.rotateX(-Math.PI / 2);
    ringGeo.scale(1.5, 1.0, 1.0);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xb45309,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 5.5;
    vortexGroup.add(ring);

    this.stormVortex = {group: vortexGroup, ring};
    this.scene.add(vortexGroup);
  }

  /**
   * Constructs the ASTRA Jovian Aeroskimmer conceptual atmospheric research vehicle
   */
  createAeroskimmerVehicle() {
    this.vessel = new THREE.Group();

    // 1. Aerodynamic Lifting-Body Hull
    const hullGeo = new THREE.ConeGeometry(1.6, 5.0, 5);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.4, 0.45, 1.0);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.8,
      roughness: 0.25,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    this.vessel.add(hull);

    // 2. Ablative Heat Shield Underbelly (Black carbon-phenolic)
    const shieldGeo = new THREE.BoxGeometry(2.4, 0.15, 4.2);
    const shieldMat = new THREE.MeshStandardMaterial({color: 0x09090b, roughness: 0.9});
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(0, -0.22, 0.2);
    this.vessel.add(shield);

    // 3. Cockpit Sensor Bubble (Gold-coated quartz visor)
    const visorGeo = new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    visorGeo.scale(0.9, 0.5, 1.3);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.25, 0.8);
    this.vessel.add(visor);

    // 4. Canted Twin Vertical Stabilizers
    const finGeo = new THREE.BoxGeometry(0.08, 0.9, 1.1);
    const finL = new THREE.Mesh(finGeo, hullMat);
    finL.position.set(-1.1, 0.5, -1.5);
    finL.rotation.z = -0.35;
    this.vessel.add(finL);

    const finR = new THREE.Mesh(finGeo, hullMat);
    finR.position.set(1.1, 0.5, -1.5);
    finR.rotation.z = 0.35;
    this.vessel.add(finR);

    // 5. Magnetospheric Sensor Booms
    const boomGeo = new THREE.CylinderGeometry(0.02, 0.03, 2.5, 6);
    boomGeo.rotateZ(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, shieldMat);
    boom.position.set(0, 0.1, -0.5);
    this.vessel.add(boom);

    // 6. Dual Ion Propulsion Exhaust Glow
    const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 12);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshBasicMaterial({color: 0x38bdf8});

    const thrusterL = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterL.position.set(-0.55, 0, -2.3);
    this.vessel.add(thrusterL);

    const thrusterR = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterR.position.set(0.55, 0, -2.3);
    this.vessel.add(thrusterR);

    // Exhaust light glow
    const thrusterLight = new THREE.PointLight(0x38bdf8, 2.0, 15);
    thrusterLight.position.set(0, 0, -2.6);
    this.vessel.add(thrusterLight);
    this.thrusterLight = thrusterLight;

    this.vessel.position.set(this.vesselState.x, this.vesselState.y, this.vesselState.z);
    this.scene.add(this.vessel);
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['KeyW', 'ArrowUp'].includes(e.code)) {
        this.inputs.pitchDown = true;
      } // flight pitch down
      if (['KeyS', 'ArrowDown'].includes(e.code)) {
        this.inputs.pitchUp = true;
      } // flight pitch up
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        this.inputs.yawLeft = true;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        this.inputs.yawRight = true;
      }
      if (e.code === 'KeyE') {
        this.inputs.throttleUp = true;
      }
      if (e.code === 'KeyQ') {
        this.inputs.throttleDown = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['KeyW', 'ArrowUp'].includes(e.code)) {
        this.inputs.pitchDown = false;
      }
      if (['KeyS', 'ArrowDown'].includes(e.code)) {
        this.inputs.pitchUp = false;
      }
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        this.inputs.yawLeft = false;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        this.inputs.yawRight = false;
      }
      if (e.code === 'KeyE') {
        this.inputs.throttleUp = false;
      }
      if (e.code === 'KeyQ') {
        this.inputs.throttleDown = false;
      }
    });
  }

  setCameraMode(mode) {
    if (['chase', 'cockpit', 'orbit'].includes(mode)) {
      this.cameraMode = mode;
      if (mode === 'orbit') {
        this.orbitControls.enabled = true;
        this.orbitControls.target.copy(this.vessel.position);
      } else {
        this.orbitControls.enabled = false;
      }
    }
  }

  setThrottle(value) {
    this.vesselState.throttle = THREE.MathUtils.clamp(value, 0.1, 1.0);
  }

  /**
   * Flight physics & thermodynamic atmospheric depth calculation
   */
  updateFlight(delta) {
    const s = this.vesselState;

    // 1. Throttle adjustment
    if (this.inputs.throttleUp) {
      s.throttle = Math.min(1.0, s.throttle + delta * 0.4);
    }
    if (this.inputs.throttleDown) {
      s.throttle = Math.max(0.1, s.throttle - delta * 0.4);
    }
    s.speed = 60 + s.throttle * 140; // 60 to 200 m/s

    // 2. Pitch & Yaw rotation
    const turnRate = 1.6;
    if (this.inputs.yawLeft) {
      s.heading += turnRate * delta;
      s.roll = THREE.MathUtils.lerp(s.roll, 0.4, delta * 4.0);
    } else if (this.inputs.yawRight) {
      s.heading -= turnRate * delta;
      s.roll = THREE.MathUtils.lerp(s.roll, -0.4, delta * 4.0);
    } else {
      s.roll = THREE.MathUtils.lerp(s.roll, 0, delta * 3.0);
    }

    const pitchRate = 1.2;
    if (this.inputs.pitchUp) {
      s.pitch = Math.min(0.6, s.pitch + pitchRate * delta); // climb
    } else if (this.inputs.pitchDown) {
      s.pitch = Math.max(-0.6, s.pitch - pitchRate * delta); // dive
    } else {
      s.pitch = THREE.MathUtils.lerp(s.pitch, 0, delta * 2.0);
    }

    // 3. Movement vector
    const forwardX = Math.sin(s.heading) * Math.cos(s.pitch);
    const forwardY = Math.sin(s.pitch);
    const forwardZ = -Math.cos(s.heading) * Math.cos(s.pitch);

    s.x += forwardX * s.speed * delta;
    s.y += forwardY * s.speed * delta * 0.6; // altitude change
    s.z += forwardZ * s.speed * delta;

    // Clamp altitude between upper stratospheric boundary (+45) and extreme crush depth (-60)
    s.y = THREE.MathUtils.clamp(s.y, -60, 45);

    // Apply transformation to 3D vessel object
    this.vessel.position.set(s.x, s.y, s.z);
    this.vessel.rotation.set(0, s.heading, 0, 'YXZ');
    this.vessel.rotateX(-s.pitch);
    this.vessel.rotateZ(s.roll);

    // Dynamic thruster glow
    if (this.thrusterLight) {
      this.thrusterLight.intensity = 1.0 + s.throttle * 2.5;
    }

    // 4. Atmospheric Thermodynamic & Pressure Model
    // Linear-exponential depth mapping:
    // y = 45 -> 0.1 bar, y = 0 -> 1.0 bar, y = -25 -> 3.0 bar, y = -50 -> 8.0 bar, y = -60 -> 14.0 bar
    const depth = -s.y;
    if (depth < 0) {
      // Stratosphere (above 1 bar)
      this.currentPressureBar = Number((1.0 - (Math.abs(depth) / 45) * 0.9).toFixed(2));
      this.currentTempC = Math.round(-110 - (Math.abs(depth) / 45) * 50);
      this.currentDensityKgM3 = Number((0.16 * (this.currentPressureBar / 1.0)).toFixed(2));
    } else {
      // Troposphere / Deep atmosphere (below 1 bar)
      this.currentPressureBar = Number((1.0 + Math.pow(depth / 16, 1.8)).toFixed(2));
      this.currentTempC = Math.round(-110 + depth * 3.2);
      this.currentDensityKgM3 = Number((0.16 * this.currentPressureBar).toFixed(2));
    }

    // Wind speeds & jet stream turbulence (Great Red Spot zone increases wind)
    const distToSpot = Math.hypot(s.x - 40, s.z - -90);
    const inSpot = distToSpot < 45;
    this.currentWindSpeedKmH = inSpot
      ? Math.round(520 + Math.sin(s.x * 0.1) * 35)
      : Math.round(440 + Math.cos(s.z * 0.05) * 40);

    // 5. Vehicle Hull Stress & Energy Consumption
    let targetStress = 10.0 + (this.currentPressureBar / 10.0) * 65.0;
    if (inSpot) {
      targetStress += 18.0;
    }
    s.hullStress = THREE.MathUtils.lerp(s.hullStress, targetStress, delta * 0.8);

    // Energy drain proportional to thruster throttle and depth heating
    const drain = (0.04 + s.throttle * 0.06 + Math.max(0, depth) * 0.001) * delta;
    s.energy = Math.max(0, s.energy - drain);

    // 6. Atmospheric Visual Fog & Lighting Adjustment with Depth
    if (depth > 0) {
      // Deepening darkness and dense brownish-red haze
      const depthFactor = Math.min(1.0, depth / 50.0);
      this.scene.background.lerpColors(this.ambientSkyColor, new THREE.Color(0x2d140b), depthFactor * 0.05);
      this.scene.fog.density = 0.008 + depthFactor * 0.024;
      this.sunLight.intensity = Math.max(0.2, 1.6 - depthFactor * 1.3);
    } else {
      this.scene.background.copy(this.ambientSkyColor);
      this.scene.fog.density = 0.008;
      this.sunLight.intensity = 1.6;
    }
  }

  updateCamera() {
    if (!this.vessel) {
      return;
    }

    if (this.cameraMode === 'chase') {
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.vessel.rotation);
      const targetPos = this.vessel.position
        .clone()
        .sub(forward.clone().multiplyScalar(this.cameraOffsetChase.z))
        .add(new THREE.Vector3(0, this.cameraOffsetChase.y, 0));

      this.camera.position.lerp(targetPos, 0.14);
      this.camera.lookAt(this.vessel.position.clone().add(forward.clone().multiplyScalar(10.0)));
    } else if (this.cameraMode === 'cockpit') {
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.vessel.rotation);
      const eyePos = this.vessel.position
        .clone()
        .add(forward.clone().multiplyScalar(this.cameraOffsetCockpit.z))
        .add(new THREE.Vector3(0, this.cameraOffsetCockpit.y, 0));

      this.camera.position.copy(eyePos);
      this.camera.lookAt(eyePos.clone().add(forward.clone().multiplyScalar(50.0)));
    } else if (this.cameraMode === 'orbit') {
      this.orbitControls.update();
    }
  }

  update(delta) {
    this.updateFlight(delta);
    this.updateCamera();

    // Rotate storm vortex
    if (this.stormVortex) {
      this.stormVortex.ring.rotation.z -= delta * 0.6; // anticyclonic rotation
    }

    // Occasional lightning flash
    this.lightningTimer += delta;
    if (this.lightningTimer > 4.5 + Math.random() * 4.0) {
      this.lightningTimer = 0;
      this.lightningLight.intensity = 4.5;
      this.lightningLight.position.set(
        this.vesselState.x + (Math.random() - 0.5) * 60,
        this.vesselState.y - 15,
        this.vesselState.z - 40
      );
      setTimeout(() => {
        if (this.lightningLight) {
          this.lightningLight.intensity = 0;
        }
      }, 120);
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

  resetFlight() {
    this.vesselState.x = 0;
    this.vesselState.y = 0;
    this.vesselState.z = 0;
    this.vesselState.heading = 0;
    this.vesselState.pitch = 0;
    this.vesselState.roll = 0;
    this.vesselState.throttle = 0.5;
    this.vesselState.hullStress = 18.0;
    this.setCameraMode('chase');
  }

  /**
   * Operating Envelope Warning & Telemetry Evaluation
   */
  getAtmosphericTelemetry() {
    const s = this.vesselState;
    const warnings = [];

    // Documented Operating Envelope Violations
    if (this.currentPressureBar >= 8.0) {
      warnings.push({
        code: 'CRUSH_DEPTH_CRITICAL',
        level: 'CRITICAL',
        title: 'CRITICAL: SUPERCRITICAL CRUSH PRESSURE',
        detail: 'Atmospheric pressure exceeds 8.0 bar. Titanium-composite hull deformation imminent.',
      });
    } else if (this.currentPressureBar >= 4.0) {
      warnings.push({
        code: 'HULL_STRAIN_HIGH',
        level: 'WARNING',
        title: 'WARNING: HIGH AERODYNAMIC PRESSURE',
        detail: 'Ascent to upper cloud deck recommended to prevent hull fatigue.',
      });
    }

    const distToSpot = Math.hypot(s.x - 40, s.z - -90);
    if (distToSpot < 45) {
      warnings.push({
        code: 'GREAT_RED_SPOT_SHEAR',
        level: 'WARNING',
        title: 'CAUTION: GREAT RED SPOT CYCLONIC SHEAR',
        detail: 'Entering anticyclonic vortex periphery. Wind speeds exceed 500 km/h.',
      });
    }

    if (this.currentPressureBar <= 0.25) {
      warnings.push({
        code: 'RADIATION_BELT_TORUS',
        level: 'HAZARD',
        title: 'HAZARD: LEADING JUPITER RADIATION BELT',
        detail: 'Exiting dense atmospheric shielding. Cosmic ray and synchrotron electron flux elevated.',
      });
    }

    const canAscendToOrbit = this.currentPressureBar <= 3.0 && s.hullStress < 80.0;

    return {
      pressureBar: `${this.currentPressureBar.toFixed(2)} bar`,
      pressureRaw: this.currentPressureBar,
      temperatureC: `${this.currentTempC}°C`,
      densityKgM3: `${this.currentDensityKgM3} kg/m³`,
      windSpeedKmH: `${this.currentWindSpeedKmH} km/h`,
      speedKmH: `${Math.round(s.speed * 3.6)} km/h`,
      throttlePercent: `${Math.round(s.throttle * 100)}%`,
      hullStressPercent: `${Math.round(s.hullStress)}%`,
      energyPercent: `${Math.round(s.energy)}%`,
      warnings,
      canAscendToOrbit,
      cameraMode: this.cameraMode,
    };
  }
}
