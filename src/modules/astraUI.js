/**
 * ASTRA — Beyond Earth UI Architecture
 * Handles mission landing introduction, top mission bar,
 * Mars surface rover telemetry & POI reconnaissance,
 * Jupiter atmospheric flight HUD with operating envelope warnings,
 * interactive life-support equipment controls, and attribution dialogs.
 */

import {getPlanetData} from '../data/planetData.js';
import {MARS_POIS} from './missionInterface.js';
import {EQUIPMENT_DESCRIPTIONS} from './survivalEngine.js';

export class AstraUI {
  constructor(options = {}) {
    this.onEnterSystem = options.onEnterSystem || (() => {});
    this.onExplorePlanet = options.onExplorePlanet || (() => {});
    this.onReturnToSystem = options.onReturnToSystem || (() => {});
    this.onPlanetSelected = options.onPlanetSelected || (() => {});
    this.onEquipmentChange = options.onEquipmentChange || (() => {});
    this.onEventToggle = options.onEventToggle || (() => {});
    this.onResetEquipment = options.onResetEquipment || (() => {});
    this.onViewModeChange = options.onViewModeChange || (() => {});
    this.onRoverControl = options.onRoverControl || (() => {});
    this.onCameraModeChange = options.onCameraModeChange || (() => {});
    this.onJupiterFlightControl = options.onJupiterFlightControl || (() => {});

    this.isExplorationMode = false;
    this.currentPlanet = 'earth';
    this.viewMode = 'surface'; // 'surface' | 'orbit'

    this.initDOM();
  }

  initDOM() {
    this.createLandingModal();
    this.createTopMissionBar();
    this.createExplorationHUD();
    this.createPOIModal();
    this.createCreditsModal();
  }

  createLandingModal() {
    const modal = document.createElement('div');
    modal.id = 'astra-landing-modal';
    modal.className = 'astra-modal astra-landing-modal';

    modal.innerHTML = `
      <div class="astra-landing-card">
        <div class="astra-badge">
          <span class="astra-badge__dot"></span>
          <span>PROJECT ASTRA // MISSION RECON</span>
        </div>

        <h1 class="astra-landing-title">ASTRA</h1>
        <p class="astra-landing-sub">BEYOND EARTH — 3D SOLAR SYSTEM &amp; HUMAN SURVIVAL SIMULATOR</p>

        <div class="astra-landing-desc">
          <p>
            Welcome, Commander. ASTRA is a high-fidelity 3D interplanetary explorer and bio-environmental simulator.
            Navigate through Keplerian elliptical orbits, conduct surface reconnaissance, and simulate human life-support viability
            across hostile extraterrestrial surfaces.
          </p>
        </div>

        <div class="astra-features-grid">
          <div class="astra-feature-item">
            <div class="astra-feature-icon">🪐</div>
            <div class="astra-feature-title">Keplerian Orbits</div>
            <div class="astra-feature-text">Real J2000 orbital mechanics solved via Newton's equation.</div>
          </div>
          <div class="astra-feature-item">
            <div class="astra-feature-icon">🚙</div>
            <div class="astra-feature-title">Mars Surface Rover</div>
            <div class="astra-feature-text">Controllable rover with terrain collision, POIs, and chase/cockpit cams.</div>
          </div>
          <div class="astra-feature-item">
            <div class="astra-feature-icon">🌪️</div>
            <div class="astra-feature-title">Jupiter Atmospheric Flight</div>
            <div class="astra-feature-text">Conceptual Aeroskimmer dive probe through Jovian cloud bands and Great Red Spot.</div>
          </div>
        </div>

        <div class="astra-landing-actions">
          <button id="astra-enter-btn" class="astra-btn astra-btn--primary astra-btn--glow">
            ENTER SOLAR SYSTEM &rarr;
          </button>
        </div>

        <div class="astra-landing-footer">
          <span>Textures by Solar System Scope (CC BY 4.0) &bull; Three.js &bull; Vanilla JS</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.landingModal = modal;

    const enterBtn = modal.querySelector('#astra-enter-btn');
    enterBtn.addEventListener('click', () => {
      this.dismissLandingModal();
    });

    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      modal.classList.add('astra-modal--dismissed');
      modal.style.display = 'none';
    }
  }

  dismissLandingModal() {
    if (!this.landingModal) {
      return;
    }
    this.landingModal.classList.add('astra-modal--dismissed');
    setTimeout(() => {
      this.landingModal.style.display = 'none';
      this.onEnterSystem();
    }, 400);
  }

  showLandingModal() {
    if (!this.landingModal) {
      return;
    }
    this.landingModal.style.display = 'flex';
    void this.landingModal.offsetHeight;
    this.landingModal.classList.remove('astra-modal--dismissed');
  }

  createTopMissionBar() {
    const bar = document.createElement('header');
    bar.id = 'astra-top-bar';
    bar.className = 'astra-top-bar';

    bar.innerHTML = `
      <div class="astra-top-bar__left">
        <div class="astra-brand">
          <span class="astra-brand__symbol">&#9672;</span>
          <span class="astra-brand__name">ASTRA</span>
          <span class="astra-brand__separator">/</span>
          <span class="astra-brand__tag">BEYOND EARTH</span>
        </div>
      </div>

      <div class="astra-top-bar__center">
        <div id="astra-mode-badge" class="astra-status-badge astra-status-badge--system">
          <span class="astra-status-badge__dot"></span>
          <span id="astra-mode-text">ORBITAL SYSTEM OVERVIEW</span>
        </div>
      </div>

      <div class="astra-top-bar__right">
        <button id="astra-return-btn" class="astra-btn astra-btn--return" style="display: none;">
          &larr; RETURN TO SOLAR SYSTEM
        </button>
        <button id="astra-briefing-btn" class="astra-btn astra-btn--ghost" title="Mission Briefing">
          MISSION INTEL
        </button>
        <button id="astra-credits-btn" class="astra-btn astra-btn--ghost" title="Third-Party Attributions &amp; License">
          CREDITS
        </button>
      </div>
    `;

    document.body.appendChild(bar);
    this.topBar = bar;

    this.returnBtn = bar.querySelector('#astra-return-btn');
    this.modeBadge = bar.querySelector('#astra-mode-badge');
    this.modeText = bar.querySelector('#astra-mode-text');

    this.returnBtn.addEventListener('click', () => {
      this.setExplorationMode(false);
      this.onReturnToSystem();
    });

    bar.querySelector('#astra-briefing-btn').addEventListener('click', () => {
      this.showLandingModal();
    });

    bar.querySelector('#astra-credits-btn').addEventListener('click', () => {
      this.showCreditsModal();
    });
  }

  createExplorationHUD() {
    const hud = document.createElement('aside');
    hud.id = 'astra-exploration-hud';
    hud.className = 'astra-exploration-hud';
    hud.setAttribute('aria-label', 'Planetary Exploration and Survival Telemetry');

    hud.innerHTML = `
      <div class="astra-hud-header">
        <div>
          <div id="astra-hud-caption" class="astra-hud-caption">SURFACE RECONNAISSANCE</div>
          <h2 id="astra-hud-planet-name" class="astra-hud-title">MARS</h2>
          <div id="astra-hud-tagline" class="astra-hud-tagline">The Red Frontier</div>
        </div>
        <button id="astra-hud-close" class="astra-hud-close" title="Exit Exploration">&times;</button>
      </div>

      <!-- Surface vs Orbit View Switcher (for Mars) -->
      <div id="astra-view-mode-bar" class="astra-view-mode-bar">
        <button id="astra-view-surface-btn" class="astra-view-mode-btn astra-view-mode-btn--active" data-view="surface">
          🔴 SURFACE RECON
        </button>
        <button id="astra-view-orbit-btn" class="astra-view-mode-btn" data-view="orbit">
          🛰️ ORBITAL RECON
        </button>
      </div>

      <!-- Camera Mode Switcher (Chase, Cockpit, Orbit) -->
      <div id="astra-cam-mode-bar" class="astra-cam-mode-bar">
        <span class="astra-cam-label">CAMERA:</span>
        <button class="astra-cam-btn astra-cam-btn--active" data-cam="chase">CHASE</button>
        <button class="astra-cam-btn" data-cam="cockpit">COCKPIT</button>
        <button class="astra-cam-btn" data-cam="orbit">FREE ORBIT</button>
      </div>

      <div class="astra-hud-body">
        <!-- MARS SPECIFIC: Rover Telemetry & On-Screen Driving Controls -->
        <div id="astra-rover-section" class="astra-hud-section astra-hud-section--rover">
          <div class="astra-section-label">
            <span>ASTRA MARS ROVER TELEMETRY</span>
            <span class="astra-status-pill astra-status-pill--active">TRANSMITTING</span>
          </div>

          <div class="astra-telemetry-grid">
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">COORDINATES</span>
              <span id="astra-rover-coords" class="astra-stat-box__val">X: +0.0m, Z: +3.0m</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">SPEED</span>
              <span id="astra-rover-speed" class="astra-stat-box__val">0.0 km/h</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">ELEVATION</span>
              <span id="astra-rover-elevation" class="astra-stat-box__val">+0.0m</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">HEADING</span>
              <span id="astra-rover-heading" class="astra-stat-box__val">0°</span>
            </div>
          </div>

          <!-- On-screen Virtual Drive Controls -->
          <div class="astra-drive-pad">
            <div class="astra-drive-pad__hint">DRIVE: [W/A/S/D] OR TOUCH PAD</div>
            <div class="astra-drive-grid">
              <div></div>
              <button class="astra-drive-btn" data-drive="forward" title="Drive Forward (W)">▲</button>
              <div></div>
              <button class="astra-drive-btn" data-drive="left" title="Steer Left (A)">◄</button>
              <button class="astra-drive-btn astra-drive-btn--brake" data-drive="handbrake" title="Brake (Space)">⬚</button>
              <button class="astra-drive-btn" data-drive="right" title="Steer Right (D)">►</button>
              <div></div>
              <button class="astra-drive-btn" data-drive="backward" title="Reverse (S)">▼</button>
              <div></div>
            </div>
          </div>

          <!-- Mars Scientific Points of Interest (POIs) -->
          <div class="astra-poi-section">
            <div class="astra-section-label">
              <span>SCIENTIFIC TARGETS (POIs)</span>
              <span id="astra-poi-proximity" class="astra-poi-prox">NEAREST: 35m</span>
            </div>
            <div class="astra-poi-list">
              ${MARS_POIS.map(
                (poi) => `
                <button class="astra-poi-item" data-poi="${poi.id}">
                  <span class="astra-poi-item__icon">&#9670;</span>
                  <div class="astra-poi-item__info">
                    <span class="astra-poi-item__title">${poi.title}</span>
                    <span class="astra-poi-item__cat">${poi.category}</span>
                  </div>
                </button>
              `
              ).join('')}
            </div>
          </div>
        </div>

        <!-- JUPITER SPECIFIC: Aeroskimmer Flight HUD & Envelope Warnings -->
        <div id="astra-jupiter-section" class="astra-hud-section astra-hud-section--jupiter" style="display: none;">
          <div class="astra-section-label">
            <span>AEROSKIMMER FLIGHT TELEMETRY</span>
            <span class="astra-status-pill astra-status-pill--active">ATMOSPHERIC DIVE</span>
          </div>

          <!-- Conceptual vehicle honesty notice -->
          <div class="astra-notice-card">
            <span>⚠️ JUPITER HAS NO SOLID SURFACE &bull; CONCEPTUAL AEROSKIMMER DIVE PROBE</span>
          </div>

          <!-- Operating Envelope Warnings Banner -->
          <div id="astra-jup-warnings-box" class="astra-warnings-box" style="display: none;">
            <!-- Rendered dynamically -->
          </div>

          <div class="astra-telemetry-grid">
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">PRESSURE DEPTH</span>
              <span id="astra-jup-pressure" class="astra-stat-box__val">1.00 bar</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">AIRSPEED</span>
              <span id="astra-jup-speed" class="astra-stat-box__val">432 km/h</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">HULL STRESS</span>
              <span id="astra-jup-stress" class="astra-stat-box__val">18%</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">ZONAL WINDS</span>
              <span id="astra-jup-wind" class="astra-stat-box__val">460 km/h</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">AMBIENT TEMP</span>
              <span id="astra-jup-temp" class="astra-stat-box__val">-110°C</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">GAS DENSITY</span>
              <span id="astra-jup-density" class="astra-stat-box__val">0.16 kg/m³</span>
            </div>
          </div>

          <!-- Flight Controls Pad -->
          <div class="astra-drive-pad">
            <div class="astra-drive-pad__hint">FLIGHT: [W/S] PITCH &bull; [A/D] YAW &bull; [Q/E] THROTTLE</div>
            <div class="astra-flight-controls-grid">
              <button class="astra-flight-btn" data-flight="pitchUp">CLIMB / ASCEND [S]</button>
              <button class="astra-flight-btn" data-flight="pitchDown">DIVE DEEPER [W]</button>
              <button class="astra-flight-btn" data-flight="throttleUp">THROTTLE UP [E]</button>
              <button class="astra-flight-btn" data-flight="throttleDown">THROTTLE DOWN [Q]</button>
            </div>
          </div>
        </div>

        <!-- Physical Environment Grid (General) -->
        <div class="astra-hud-section">
          <div class="astra-section-label">PLANETARY ENVIRONMENT</div>
          <div class="astra-telemetry-grid">
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">SURFACE GRAVITY</span>
              <span id="astra-stat-gravity" class="astra-stat-box__val">3.72 m/s² (0.38g)</span>
            </div>
            <div class="astra-stat-box">
              <span class="astra-stat-box__label">MEAN TEMP</span>
              <span id="astra-stat-temp" class="astra-stat-box__val">-63°C</span>
            </div>
            <div class="astra-stat-box astra-stat-box--full">
              <span class="astra-stat-box__label">ATMOSPHERIC PRESSURE</span>
              <span id="astra-stat-pressure" class="astra-stat-box__val">6.36 mbar (Sub-Armstrong)</span>
            </div>
          </div>
        </div>

        <!-- Atmospheric Composition -->
        <div class="astra-hud-section">
          <div class="astra-section-label">ATMOSPHERIC COMPOSITION</div>
          <div id="astra-atmosphere-bars" class="astra-atmosphere-bars"></div>
        </div>

        <!-- Human Survival Vitals Display -->
        <div class="astra-hud-section astra-hud-section--survival">
          <div class="astra-section-label">
            <span>HUMAN BIO-VITALS</span>
            <span id="astra-vitals-status" class="astra-vitals-badge astra-vitals-badge--optimal">OPTIMAL</span>
          </div>

          <div class="astra-vitals-bars">
            <div class="astra-vital-row">
              <div class="astra-vital-label">
                <span>EVA SUIT INTEGRITY</span>
                <span id="astra-val-suit">100%</span>
              </div>
              <div class="astra-vital-track">
                <div id="astra-bar-suit" class="astra-vital-fill astra-vital-fill--suit" style="width: 100%"></div>
              </div>
            </div>

            <div class="astra-vital-row">
              <div class="astra-vital-label">
                <span>O₂ OXYGEN RESERVE</span>
                <span id="astra-val-o2">100%</span>
              </div>
              <div class="astra-vital-track">
                <div id="astra-bar-o2" class="astra-vital-fill astra-vital-fill--o2" style="width: 100%"></div>
              </div>
            </div>

            <div class="astra-vital-row">
              <div class="astra-vital-label">
                <span>SUIT BATTERY / POWER</span>
                <span id="astra-val-power">100%</span>
              </div>
              <div class="astra-vital-track">
                <div id="astra-bar-power" class="astra-vital-fill astra-vital-fill--power" style="width: 100%"></div>
              </div>
            </div>

            <div class="astra-vital-row">
              <div class="astra-vital-label">
                <span>THERMAL REGULATION (CORE: <span id="astra-val-core-temp">37.0</span>°C)</span>
                <span id="astra-val-thermal">100%</span>
              </div>
              <div class="astra-vital-track">
                <div id="astra-bar-thermal" class="astra-vital-fill astra-vital-fill--thermal" style="width: 100%"></div>
              </div>
            </div>
          </div>

          <!-- Radiation & Hazard Metrics -->
          <div class="astra-hazard-metrics">
            <div class="astra-hazard-item">
              <span class="astra-hazard-item__key">RADIATION DOSE:</span>
              <span id="astra-val-rad-rate" class="astra-hazard-item__val">0.028 mSv/h</span>
            </div>
            <div class="astra-hazard-item">
              <span class="astra-hazard-item__key">ACCUMULATED:</span>
              <span id="astra-val-rad-accum" class="astra-hazard-item__val">0.000 mSv</span>
            </div>
            <div class="astra-hazard-item astra-hazard-item--full">
              <span class="astra-hazard-item__key">UNSHIELDED EVA LIMIT:</span>
              <span id="astra-val-eva-limit" class="astra-hazard-item__val">&lt; 90 seconds</span>
            </div>
          </div>
        </div>

        <!-- Interactive Life Support Equipment Controls -->
        <div class="astra-hud-section astra-hud-section--controls">
          <div class="astra-section-label">
            <span>LIFE-SUPPORT EQUIPMENT CONTROLS</span>
          </div>

          <div class="astra-control-group">
            <div class="astra-control-header">
              <span class="astra-control-title">O₂ SUPPLY MODE</span>
              <span id="astra-equip-desc-o2" class="astra-control-hint">Standard compressed O₂ cylinder</span>
            </div>
            <div class="astra-toggle-row">
              <button class="astra-toggle-btn astra-toggle-btn--active" data-equip="oxygenMode" data-val="PRIMARY">
                Primary O₂
              </button>
              <button class="astra-toggle-btn" data-equip="oxygenMode" data-val="MOXIE_REBREATHER" title="Extract O₂ from Martian CO₂">
                MOXIE Rebreather
              </button>
              <button class="astra-toggle-btn astra-toggle-btn--danger" data-equip="oxygenMode" data-val="OFF">
                O₂ Off
              </button>
            </div>
          </div>

          <div class="astra-control-group">
            <div class="astra-control-header">
              <span class="astra-control-title">PRESSURE SUIT ENVELOPE</span>
              <span id="astra-equip-desc-pressure" class="astra-control-hint">Nominal 29.6 kPa counter-pressure</span>
            </div>
            <div class="astra-toggle-row">
              <button class="astra-toggle-btn astra-toggle-btn--active" data-equip="pressureSuit" data-val="SEALED">
                Sealed (29.6 kPa)
              </button>
              <button class="astra-toggle-btn astra-toggle-btn--danger" data-equip="pressureSuit" data-val="EMERGENCY_DEPRESS" title="Decompression puncture">
                Depressurize
              </button>
            </div>
          </div>

          <div class="astra-control-group">
            <div class="astra-control-header">
              <span class="astra-control-title">THERMAL REGULATION</span>
              <span id="astra-equip-desc-thermal" class="astra-control-hint">Liquid garment active heating loop</span>
            </div>
            <div class="astra-toggle-row">
              <button class="astra-toggle-btn astra-toggle-btn--active" data-equip="thermalReg" data-val="ACTIVE">
                Active Heating
              </button>
              <button class="astra-toggle-btn" data-equip="thermalReg" data-val="STANDBY">
                Standby Eco
              </button>
              <button class="astra-toggle-btn astra-toggle-btn--danger" data-equip="thermalReg" data-val="OFF">
                Heaters Off
              </button>
            </div>
          </div>

          <div class="astra-control-group">
            <div class="astra-control-header">
              <span class="astra-control-title">RADIATION SHIELDING</span>
              <span id="astra-equip-desc-radiation" class="astra-control-hint">Polyethylene &amp; active EM shield (-80%)</span>
            </div>
            <div class="astra-toggle-row">
              <button class="astra-toggle-btn astra-toggle-btn--active" data-equip="radiationShield" data-val="ACTIVE">
                Shield Active
              </button>
              <button class="astra-toggle-btn" data-equip="radiationShield" data-val="OFF">
                Unprotected
              </button>
            </div>
          </div>

          <div class="astra-control-group">
            <div class="astra-control-header">
              <span class="astra-control-title">POWER SOURCE</span>
              <span id="astra-equip-desc-power" class="astra-control-hint">Standard Li-ion life-support battery</span>
            </div>
            <div class="astra-toggle-row">
              <button class="astra-toggle-btn astra-toggle-btn--active" data-equip="powerMode" data-val="NORMAL">
                Main Battery
              </button>
              <button class="astra-toggle-btn" data-equip="powerMode" data-val="AUX_RTG" title="Nuclear RTG trickle generator">
                Aux RTG Feed
              </button>
              <button class="astra-toggle-btn" data-equip="powerMode" data-val="ECO_SAVER">
                Eco-Saver
              </button>
            </div>
          </div>
        </div>

        <!-- Dynamic Environmental Hazard Events -->
        <div class="astra-hud-section astra-hud-section--events">
          <div class="astra-section-label">
            <span>ENVIRONMENTAL HAZARD SIMULATION</span>
          </div>
          <div class="astra-events-grid">
            <button id="astra-event-storm-btn" class="astra-event-btn" data-event="dustStorm">
              <span class="astra-event-btn__icon">🌪️</span>
              <span class="astra-event-btn__text">Dust Storm: <strong>OFF</strong></span>
            </button>
            <button id="astra-event-temp-btn" class="astra-event-btn" data-event="temperatureDrop">
              <span class="astra-event-btn__icon">❄️</span>
              <span class="astra-event-btn__text">Night Cold (-125°C): <strong>OFF</strong></span>
            </button>
          </div>
        </div>

        <!-- Educational Risk Meter & Disclaimer -->
        <div class="astra-hud-section astra-hud-section--risk">
          <div class="astra-section-label">
            <span>EDUCATIONAL RISK HEURISTIC</span>
            <span id="astra-risk-label" class="astra-risk-badge astra-risk-badge--emerald">NOMINAL</span>
          </div>

          <div class="astra-risk-bar-container">
            <div class="astra-risk-track">
              <div id="astra-risk-fill" class="astra-risk-fill" style="width: 0%"></div>
            </div>
            <span id="astra-risk-score" class="astra-risk-score">0%</span>
          </div>
          <p id="astra-risk-note" class="astra-risk-note">
            All life support systems operational. Environmental vectors successfully mitigated.
          </p>
          <div class="astra-disclaimer">
            * Educational simulation heuristic for educational study; does not claim to predict clinical human survival time.
          </div>
        </div>

        <div class="astra-hud-actions">
          <button id="astra-equip-reset-btn" class="astra-btn astra-btn--ghost astra-btn--full" style="margin-bottom: 8px;">
            &#8634; RESET EQUIPMENT &amp; VITALS
          </button>
          <button id="astra-hud-return-btn" class="astra-btn astra-btn--primary astra-btn--full">
            &larr; RETURN TO SOLAR SYSTEM
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(hud);
    this.explorationHUD = hud;

    // Bind Close & Return actions
    hud.querySelector('#astra-hud-close').addEventListener('click', () => {
      this.setExplorationMode(false);
      this.onReturnToSystem();
    });

    hud.querySelector('#astra-hud-return-btn').addEventListener('click', () => {
      this.setExplorationMode(false);
      this.onReturnToSystem();
    });

    // Bind Surface vs Orbit view toggle buttons
    const surfaceBtn = hud.querySelector('#astra-view-surface-btn');
    const orbitBtn = hud.querySelector('#astra-view-orbit-btn');

    surfaceBtn.addEventListener('click', () => {
      this.setViewMode('surface');
      this.onViewModeChange('surface');
    });

    orbitBtn.addEventListener('click', () => {
      this.setViewMode('orbit');
      this.onViewModeChange('orbit');
    });

    // Bind Camera mode buttons
    const camButtons = hud.querySelectorAll('[data-cam]');
    camButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        camButtons.forEach((b) => b.classList.remove('astra-cam-btn--active'));
        btn.classList.add('astra-cam-btn--active');
        this.onCameraModeChange(btn.dataset.cam);
      });
    });

    // Bind Rover Virtual Drive controls
    const driveButtons = hud.querySelectorAll('[data-drive]');
    driveButtons.forEach((btn) => {
      const cmd = btn.dataset.drive;
      const start = (e) => {
        e.preventDefault();
        this.onRoverControl(cmd, true);
      };
      const stop = (e) => {
        e.preventDefault();
        this.onRoverControl(cmd, false);
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      btn.addEventListener('touchstart', start, {passive: false});
      btn.addEventListener('touchend', stop, {passive: false});
    });

    // Bind Flight controls
    const flightButtons = hud.querySelectorAll('[data-flight]');
    flightButtons.forEach((btn) => {
      const cmd = btn.dataset.flight;
      const start = (e) => {
        e.preventDefault();
        this.onJupiterFlightControl(cmd, true);
      };
      const stop = (e) => {
        e.preventDefault();
        this.onJupiterFlightControl(cmd, false);
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      btn.addEventListener('touchstart', start, {passive: false});
      btn.addEventListener('touchend', stop, {passive: false});
    });

    // Bind POI list clicks
    const poiButtons = hud.querySelectorAll('[data-poi]');
    poiButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const poiId = btn.dataset.poi;
        this.showPOIModal(poiId);
      });
    });

    // Bind Equipment toggle buttons
    const equipButtons = hud.querySelectorAll('[data-equip]');
    equipButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const system = btn.dataset.equip;
        const val = btn.dataset.val;

        const groupButtons = hud.querySelectorAll(`[data-equip="${system}"]`);
        groupButtons.forEach((b) => b.classList.remove('astra-toggle-btn--active'));
        btn.classList.add('astra-toggle-btn--active');

        this.onEquipmentChange(system, val);
      });
    });

    // Bind Environmental Event buttons
    const stormBtn = hud.querySelector('#astra-event-storm-btn');
    const tempBtn = hud.querySelector('#astra-event-temp-btn');

    stormBtn.addEventListener('click', () => {
      const active = stormBtn.classList.toggle('astra-event-btn--active');
      stormBtn.querySelector('strong').textContent = active ? 'ACTIVE' : 'OFF';
      this.onEventToggle('dustStorm', active);
    });

    tempBtn.addEventListener('click', () => {
      const active = tempBtn.classList.toggle('astra-event-btn--active');
      tempBtn.querySelector('strong').textContent = active ? 'ACTIVE' : 'OFF';
      this.onEventToggle('temperatureDrop', active);
    });

    // Bind Reset Equipment & Vitals button
    hud.querySelector('#astra-equip-reset-btn').addEventListener('click', () => {
      this.resetEquipmentUI();
      this.onResetEquipment();
    });
  }

  createPOIModal() {
    const modal = document.createElement('div');
    modal.id = 'astra-poi-modal';
    modal.className = 'astra-modal astra-poi-modal astra-modal--dismissed';

    modal.innerHTML = `
      <div class="astra-poi-card">
        <div class="astra-poi-header">
          <div>
            <span class="astra-badge__text">MARS SCIENTIFIC RECON TARGET</span>
            <h3 id="astra-poi-title" class="astra-poi-title">Jezero Delta</h3>
            <span id="astra-poi-cat" class="astra-poi-category">Astrobiology</span>
          </div>
          <button id="astra-poi-close" class="astra-hud-close">&times;</button>
        </div>

        <div class="astra-poi-body">
          <p id="astra-poi-summary" class="astra-poi-summary"></p>

          <div class="astra-poi-samples-box">
            <span class="astra-poi-samples-label">TARGET SAMPLES IDENTIFIED:</span>
            <ul id="astra-poi-samples-list" class="astra-poi-samples-list"></ul>
          </div>

          <div class="astra-poi-specs">
            <div><strong>LOCAL RADIATION:</strong> <span id="astra-poi-rad">0.026 mSv/h</span></div>
            <div><strong>HAZARD RATING:</strong> <span id="astra-poi-hazard">MODERATE</span></div>
          </div>
        </div>

        <div class="astra-poi-footer">
          <button id="astra-poi-collect-btn" class="astra-btn astra-btn--primary">
            ✓ LOG TARGET &amp; CLOSE
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.poiModal = modal;

    const closeModal = () => {
      modal.classList.add('astra-modal--dismissed');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };

    modal.querySelector('#astra-poi-close').addEventListener('click', closeModal);
    modal.querySelector('#astra-poi-collect-btn').addEventListener('click', closeModal);
  }

  showPOIModal(poiId) {
    const poi = MARS_POIS.find((p) => p.id === poiId);
    if (!poi || !this.poiModal) {
      return;
    }

    this.poiModal.querySelector('#astra-poi-title').textContent = poi.title;
    this.poiModal.querySelector('#astra-poi-cat').textContent = poi.category;
    this.poiModal.querySelector('#astra-poi-summary').textContent = poi.summary;
    this.poiModal.querySelector('#astra-poi-rad').textContent = poi.radiationLevel;
    this.poiModal.querySelector('#astra-poi-hazard').textContent = poi.hazardRating;

    const list = this.poiModal.querySelector('#astra-poi-samples-list');
    list.innerHTML = poi.samples.map((s) => `<li>${s}</li>`).join('');

    this.poiModal.style.display = 'flex';
    void this.poiModal.offsetHeight;
    this.poiModal.classList.remove('astra-modal--dismissed');
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const surfaceBtn = this.explorationHUD.querySelector('#astra-view-surface-btn');
    const orbitBtn = this.explorationHUD.querySelector('#astra-view-orbit-btn');

    if (surfaceBtn && orbitBtn) {
      surfaceBtn.classList.toggle('astra-view-mode-btn--active', mode === 'surface');
      orbitBtn.classList.toggle('astra-view-mode-btn--active', mode === 'orbit');
    }

    if (this.modeText) {
      const planetDisplay = getPlanetData(this.currentPlanet).displayName.toUpperCase();
      this.modeText.textContent =
        mode === 'surface' ? `SURFACE RECON: ${planetDisplay}` : `ORBITAL RECON: ${planetDisplay}`;
    }
  }

  resetEquipmentUI() {
    if (!this.explorationHUD) {
      return;
    }

    const defaults = {
      oxygenMode: 'PRIMARY',
      pressureSuit: 'SEALED',
      thermalReg: 'ACTIVE',
      radiationShield: 'ACTIVE',
      powerMode: 'NORMAL',
    };

    Object.entries(defaults).forEach(([system, val]) => {
      const groupButtons = this.explorationHUD.querySelectorAll(`[data-equip="${system}"]`);
      groupButtons.forEach((b) => {
        b.classList.toggle('astra-toggle-btn--active', b.dataset.val === val);
      });
    });

    const stormBtn = this.explorationHUD.querySelector('#astra-event-storm-btn');
    const tempBtn = this.explorationHUD.querySelector('#astra-event-temp-btn');

    if (stormBtn) {
      stormBtn.classList.remove('astra-event-btn--active');
      stormBtn.querySelector('strong').textContent = 'OFF';
    }
    if (tempBtn) {
      tempBtn.classList.remove('astra-event-btn--active');
      tempBtn.querySelector('strong').textContent = 'OFF';
    }
  }

  enrichExistingPlanetPanel(uiElements) {
    if (!uiElements || !uiElements.panel) {
      return;
    }

    const planetInfoSection = uiElements.panel.querySelector('.ui__planet-info');
    if (!planetInfoSection) {
      return;
    }

    const specContainer = document.createElement('div');
    specContainer.id = 'astra-quick-specs';
    specContainer.className = 'astra-quick-specs';

    const exploreBtn = document.createElement('button');
    exploreBtn.id = 'astra-explore-action-btn';
    exploreBtn.className = 'astra-btn astra-btn--primary astra-btn--full astra-btn--explore';
    exploreBtn.innerHTML = `<span>EXPLORE PLANET</span> <span class="astra-btn__icon">&rarr;</span>`;
    exploreBtn.addEventListener('click', () => {
      this.setExplorationMode(true);
      this.onExplorePlanet(this.currentPlanet);
    });

    const followBtn = uiElements.followButton;
    planetInfoSection.insertBefore(specContainer, followBtn);
    planetInfoSection.insertBefore(exploreBtn, followBtn);

    this.quickSpecsContainer = specContainer;
    this.exploreActionButton = exploreBtn;

    this.updateQuickSpecs(this.currentPlanet);
  }

  updateQuickSpecs(planetName) {
    this.currentPlanet = planetName;
    const data = getPlanetData(planetName);

    if (this.quickSpecsContainer) {
      this.quickSpecsContainer.innerHTML = `
        <div class="astra-quick-specs-grid">
          <div class="astra-spec-chip">
            <span class="astra-spec-chip__label">GRAVITY</span>
            <span class="astra-spec-chip__value">${data.gravityEarthG}g</span>
          </div>
          <div class="astra-spec-chip">
            <span class="astra-spec-chip__label">TEMP</span>
            <span class="astra-spec-chip__value">${data.surfaceTempMeanC}°C</span>
          </div>
          <div class="astra-spec-chip">
            <span class="astra-spec-chip__label">HAZARD</span>
            <span class="astra-spec-chip__value astra-spec-chip__value--${data.survivalProfile.hazardLevel.toLowerCase().replace(/\s+/g, '-')}">${data.survivalProfile.hazardLevel}</span>
          </div>
        </div>
      `;
    }

    if (this.exploreActionButton) {
      const verb = planetName === 'jupiter' ? 'EXPLORE ATMOSPHERE OF' : 'EXPLORE';
      this.exploreActionButton.querySelector('span').textContent = `${verb} ${data.displayName.toUpperCase()}`;
    }

    // Toggle sections based on planet
    const viewModeBar = this.explorationHUD?.querySelector('#astra-view-mode-bar');
    const camModeBar = this.explorationHUD?.querySelector('#astra-cam-mode-bar');
    const roverSection = this.explorationHUD?.querySelector('#astra-rover-section');
    const jupiterSection = this.explorationHUD?.querySelector('#astra-jupiter-section');

    if (viewModeBar) {
      viewModeBar.style.display = planetName === 'mars' ? 'grid' : 'none';
    }
    if (camModeBar) {
      camModeBar.style.display = ['mars', 'jupiter'].includes(planetName) ? 'flex' : 'none';
    }
    if (roverSection) {
      roverSection.style.display = planetName === 'mars' ? 'block' : 'none';
    }
    if (jupiterSection) {
      jupiterSection.style.display = planetName === 'jupiter' ? 'block' : 'none';
    }

    this.updateExplorationContent(data);
  }

  updateExplorationContent(data) {
    if (!this.explorationHUD) {
      return;
    }

    const nameEl = this.explorationHUD.querySelector('#astra-hud-planet-name');
    const taglineEl = this.explorationHUD.querySelector('#astra-hud-tagline');
    const captionEl = this.explorationHUD.querySelector('#astra-hud-caption');
    const gravityEl = this.explorationHUD.querySelector('#astra-stat-gravity');
    const tempEl = this.explorationHUD.querySelector('#astra-stat-temp');
    const pressureEl = this.explorationHUD.querySelector('#astra-stat-pressure');
    const atmosphereContainer = this.explorationHUD.querySelector('#astra-atmosphere-bars');

    if (nameEl) {
      nameEl.textContent = data.displayName.toUpperCase();
    }
    if (taglineEl) {
      taglineEl.textContent = data.tagline;
    }
    if (captionEl) {
      captionEl.textContent = data.name === 'jupiter' ? 'ATMOSPHERIC RECONNAISSANCE' : 'SURFACE RECONNAISSANCE';
    }
    if (gravityEl) {
      gravityEl.textContent = `${data.gravityMs2} m/s² (${data.gravityEarthG}g)`;
    }
    if (tempEl) {
      tempEl.textContent = `${data.surfaceTempMeanC}°C (${data.surfaceTempMinC}°C to ${data.surfaceTempMaxC}°C)`;
    }
    if (pressureEl) {
      pressureEl.textContent = data.atmosphericPressureDescription;
    }

    if (atmosphereContainer) {
      atmosphereContainer.innerHTML = data.atmosphereComposition
        .map(
          (item) => `
            <div class="astra-gas-row">
              <div class="astra-gas-label">
                <span>${item.gas}</span>
                <span>${item.percent}%</span>
              </div>
              <div class="astra-gas-track">
                <div class="astra-gas-fill" style="width: ${Math.min(100, item.percent)}%"></div>
              </div>
            </div>
          `
        )
        .join('');
    }
  }

  updateRoverTelemetry(telemetry) {
    if (!this.explorationHUD || !this.isExplorationMode || this.currentPlanet !== 'mars') {
      return;
    }

    const coords = this.explorationHUD.querySelector('#astra-rover-coords');
    const speed = this.explorationHUD.querySelector('#astra-rover-speed');
    const elev = this.explorationHUD.querySelector('#astra-rover-elevation');
    const heading = this.explorationHUD.querySelector('#astra-rover-heading');
    const prox = this.explorationHUD.querySelector('#astra-poi-proximity');

    if (coords) {
      coords.textContent = telemetry.coordinates;
    }
    if (speed) {
      speed.textContent = telemetry.speedKmH;
    }
    if (elev) {
      elev.textContent = telemetry.elevation;
    }
    if (heading) {
      heading.textContent = telemetry.headingDeg;
    }

    if (prox && telemetry.nearestPOI) {
      prox.textContent = `${telemetry.nearestPOI.poi.title.slice(0, 15)}...: ${telemetry.nearestPOI.distanceMeters}m`;
      prox.style.color = telemetry.nearestPOI.inRange ? '#38bdf8' : 'rgb(180 205 255 / 70%)';
    }
  }

  updateJupiterTelemetry(telemetry) {
    if (!this.explorationHUD || !this.isExplorationMode || this.currentPlanet !== 'jupiter') {
      return;
    }

    const press = this.explorationHUD.querySelector('#astra-jup-pressure');
    const speed = this.explorationHUD.querySelector('#astra-jup-speed');
    const stress = this.explorationHUD.querySelector('#astra-jup-stress');
    const wind = this.explorationHUD.querySelector('#astra-jup-wind');
    const temp = this.explorationHUD.querySelector('#astra-jup-temp');
    const density = this.explorationHUD.querySelector('#astra-jup-density');
    const warningsBox = this.explorationHUD.querySelector('#astra-jup-warnings-box');

    if (press) {
      press.textContent = telemetry.pressureBar;
    }
    if (speed) {
      speed.textContent = telemetry.speedKmH;
    }
    if (stress) {
      stress.textContent = telemetry.hullStressPercent;
    }
    if (wind) {
      wind.textContent = telemetry.windSpeedKmH;
    }
    if (temp) {
      temp.textContent = telemetry.temperatureC;
    }
    if (density) {
      density.textContent = telemetry.densityKgM3;
    }

    if (warningsBox) {
      if (telemetry.warnings && telemetry.warnings.length > 0) {
        warningsBox.style.display = 'flex';
        warningsBox.innerHTML = telemetry.warnings
          .map(
            (w) => `
            <div class="astra-warning-pill astra-warning-pill--${w.level.toLowerCase()}">
              <span class="astra-warning-pill__icon">⚠️</span>
              <div>
                <strong>${w.title}</strong>
                <p>${w.detail}</p>
              </div>
            </div>
          `
          )
          .join('');
      } else {
        warningsBox.style.display = 'none';
      }
    }
  }

  updateSurvivalTelemetry(telemetry) {
    if (!this.explorationHUD || !this.isExplorationMode) {
      return;
    }

    const valSuit = this.explorationHUD.querySelector('#astra-val-suit');
    const barSuit = this.explorationHUD.querySelector('#astra-bar-suit');
    const valO2 = this.explorationHUD.querySelector('#astra-val-o2');
    const barO2 = this.explorationHUD.querySelector('#astra-bar-o2');
    const valPower = this.explorationHUD.querySelector('#astra-val-power');
    const barPower = this.explorationHUD.querySelector('#astra-bar-power');
    const valThermal = this.explorationHUD.querySelector('#astra-val-thermal');
    const barThermal = this.explorationHUD.querySelector('#astra-bar-thermal');
    const valCoreTemp = this.explorationHUD.querySelector('#astra-val-core-temp');
    const tempEl = this.explorationHUD.querySelector('#astra-stat-temp');

    const valRadRate = this.explorationHUD.querySelector('#astra-val-rad-rate');
    const valRadAccum = this.explorationHUD.querySelector('#astra-val-rad-accum');
    const valEvaLimit = this.explorationHUD.querySelector('#astra-val-eva-limit');
    const vitalsBadge = this.explorationHUD.querySelector('#astra-vitals-status');

    if (valSuit) {
      valSuit.textContent = `${telemetry.suitIntegrity}%`;
    }
    if (barSuit) {
      barSuit.style.width = `${telemetry.suitIntegrity}%`;
    }
    if (valO2) {
      valO2.textContent = `${telemetry.oxygenReserve}%`;
    }
    if (barO2) {
      barO2.style.width = `${telemetry.oxygenReserve}%`;
    }
    if (valPower) {
      valPower.textContent = `${telemetry.batteryPower}%`;
    }
    if (barPower) {
      barPower.style.width = `${telemetry.batteryPower}%`;
    }
    if (valThermal) {
      valThermal.textContent = `${telemetry.thermalRegulation}%`;
    }
    if (barThermal) {
      barThermal.style.width = `${telemetry.thermalRegulation}%`;
    }
    if (valCoreTemp) {
      valCoreTemp.textContent = telemetry.coreBodyTempC;
    }
    if (tempEl && telemetry.surfaceTemp) {
      tempEl.textContent = telemetry.surfaceTemp;
    }

    if (valRadRate) {
      valRadRate.textContent = telemetry.hourlyRateMsv;
    }
    if (valRadAccum) {
      valRadAccum.textContent = `${telemetry.accumulatedDoseMsv} mSv`;
    }
    if (valEvaLimit) {
      valEvaLimit.textContent = telemetry.estimatedEvTime;
    }

    if (vitalsBadge) {
      vitalsBadge.textContent = telemetry.status;
      vitalsBadge.className = `astra-vitals-badge astra-vitals-badge--${telemetry.status.toLowerCase().replace(/\s+/g, '-')}`;
    }

    const riskFill = this.explorationHUD.querySelector('#astra-risk-fill');
    const riskScore = this.explorationHUD.querySelector('#astra-risk-score');
    const riskLabel = this.explorationHUD.querySelector('#astra-risk-label');
    const riskNote = this.explorationHUD.querySelector('#astra-risk-note');

    if (riskFill) {
      riskFill.style.width = `${telemetry.educationalRisk}%`;
      riskFill.className = `astra-risk-fill astra-risk-fill--${telemetry.riskSummary.color}`;
    }
    if (riskScore) {
      riskScore.textContent = `${telemetry.educationalRisk}%`;
    }
    if (riskLabel) {
      riskLabel.textContent = telemetry.riskSummary.level;
      riskLabel.className = `astra-risk-badge astra-risk-badge--${telemetry.riskSummary.color}`;
    }
    if (riskNote) {
      riskNote.textContent = telemetry.riskSummary.note;
    }

    const descO2 = this.explorationHUD.querySelector('#astra-equip-desc-o2');
    const descPressure = this.explorationHUD.querySelector('#astra-equip-desc-pressure');
    const descThermal = this.explorationHUD.querySelector('#astra-equip-desc-thermal');
    const descRad = this.explorationHUD.querySelector('#astra-equip-desc-radiation');
    const descPower = this.explorationHUD.querySelector('#astra-equip-desc-power');

    if (descO2 && telemetry.equipment) {
      descO2.textContent = EQUIPMENT_DESCRIPTIONS.oxygenMode[telemetry.equipment.oxygenMode];
    }
    if (descPressure && telemetry.equipment) {
      descPressure.textContent = EQUIPMENT_DESCRIPTIONS.pressureSuit[telemetry.equipment.pressureSuit];
    }
    if (descThermal && telemetry.equipment) {
      descThermal.textContent = EQUIPMENT_DESCRIPTIONS.thermalReg[telemetry.equipment.thermalReg];
    }
    if (descRad && telemetry.equipment) {
      descRad.textContent = EQUIPMENT_DESCRIPTIONS.radiationShield[telemetry.equipment.radiationShield];
    }
    if (descPower && telemetry.equipment) {
      descPower.textContent = EQUIPMENT_DESCRIPTIONS.powerMode[telemetry.equipment.powerMode];
    }
  }

  setExplorationMode(active) {
    this.isExplorationMode = active;

    if (active) {
      this.explorationHUD.classList.add('astra-exploration-hud--active');
      this.returnBtn.style.display = 'inline-flex';
      this.modeBadge.className = 'astra-status-badge astra-status-badge--explore';
      const data = getPlanetData(this.currentPlanet);
      let prefix = 'ORBITAL RECON';
      if (this.currentPlanet === 'mars' && this.viewMode === 'surface') {
        prefix = 'SURFACE RECON';
      }
      if (this.currentPlanet === 'jupiter') {
        prefix = 'ATMOSPHERIC DIVE';
      }
      this.modeText.textContent = `${prefix}: ${data.displayName.toUpperCase()}`;

      this.updateExplorationContent(data);
      const viewModeBar = this.explorationHUD.querySelector('#astra-view-mode-bar');
      const camModeBar = this.explorationHUD.querySelector('#astra-cam-mode-bar');
      const roverSection = this.explorationHUD.querySelector('#astra-rover-section');
      const jupiterSection = this.explorationHUD.querySelector('#astra-jupiter-section');

      if (viewModeBar) {
        viewModeBar.style.display = this.currentPlanet === 'mars' ? 'grid' : 'none';
      }
      if (camModeBar) {
        camModeBar.style.display = ['mars', 'jupiter'].includes(this.currentPlanet) ? 'flex' : 'none';
      }
      if (roverSection) {
        roverSection.style.display = this.currentPlanet === 'mars' ? 'block' : 'none';
      }
      if (jupiterSection) {
        jupiterSection.style.display = this.currentPlanet === 'jupiter' ? 'block' : 'none';
      }
    } else {
      this.explorationHUD.classList.remove('astra-exploration-hud--active');
      this.returnBtn.style.display = 'none';
      this.modeBadge.className = 'astra-status-badge astra-status-badge--system';
      this.modeText.textContent = 'ORBITAL SYSTEM OVERVIEW';
    }
  }

  createCreditsModal() {
    const modal = document.createElement('div');
    modal.id = 'astra-credits-modal';
    modal.className = 'astra-modal astra-credits-modal astra-modal--dismissed';

    modal.innerHTML = `
      <div class="astra-credits-card">
        <div class="astra-credits-header">
          <h3>PROJECT ASTRA // CREDITS &amp; LICENSES</h3>
          <button id="astra-credits-close" class="astra-hud-close">&times;</button>
        </div>

        <div class="astra-credits-content">
          <h4>Asset Attributions</h4>
          <p>
            Planet and moon textures are provided by <strong><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a></strong>,
            licensed under <strong><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International (CC BY 4.0)</a></strong>.
            Originals were downscaled and converted to WebP format for real-time web performance.
          </p>

          <h4>Source Code &amp; Base Implementation</h4>
          <p>
            Based on the open-source 3D Solar System simulation by <strong>Serge Tiutin</strong> (<a href="https://github.com/stiutin/threejs-solar-system" target="_blank" rel="noopener">threejs-solar-system</a>),
            licensed under the <strong>MIT License</strong>.
          </p>

          <h4>Scientific Planetary Data</h4>
          <p>
            Orbital parameters, physical measurements, and atmospheric properties sourced from
            <strong>NASA Planetary Fact Sheets</strong>, <strong>JPL Solar System Dynamics</strong>, and <strong>ESA Science Archives</strong>.
          </p>
        </div>

        <div class="astra-credits-footer">
          <button id="astra-credits-ok" class="astra-btn astra-btn--primary">CLOSE</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.creditsModal = modal;

    const closeModal = () => {
      modal.classList.add('astra-modal--dismissed');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };

    modal.querySelector('#astra-credits-close').addEventListener('click', closeModal);
    modal.querySelector('#astra-credits-ok').addEventListener('click', closeModal);
  }

  showCreditsModal() {
    if (!this.creditsModal) {
      return;
    }
    this.creditsModal.style.display = 'flex';
    void this.creditsModal.offsetHeight;
    this.creditsModal.classList.remove('astra-modal--dismissed');
  }
}
