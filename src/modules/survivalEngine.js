/**
 * ASTRA — Human Survival Simulator Engine
 * Computes realistic life-support, environmental telemetry, equipment mitigation heuristics,
 * and dynamic hazard event states based on true planetary physics.
 *
 * NOTE: Uses a transparent educational heuristic model for simulation and gameplay study;
 * it does not claim to predict real human clinical survival time.
 */

import {getPlanetData} from '../data/planetData.js';

export const EQUIPMENT_DESCRIPTIONS = {
  oxygenMode: {
    PRIMARY: 'Standard compressed O₂ cylinder feed with constant metabolic flow.',
    MOXIE_REBREATHER:
      'Sabatier/MOXIE CO₂-to-O₂ chemical conversion loop. Conserves O₂ by 80% but increases electrical power load.',
    OFF: 'WARNING: Oxygen supply completely shut off. Severe hypoxic distress will occur within seconds.',
  },
  pressureSuit: {
    SEALED: 'Nominal 29.6 kPa counter-pressure envelope. Seals astronaut against the low Martian atmospheric pressure.',
    EMERGENCY_DEPRESS:
      'CRITICAL FAILURE: Suit decompression below the Armstrong limit (6.3 mbar). Body fluids begin rapid ebullism.',
  },
  thermalReg: {
    ACTIVE: 'Liquid cooling/heating garment actively circulating heated fluid to counter sub-zero ambient chill.',
    STANDBY: 'Minimal standby heating mode. Conserves battery power but exposes astronaut to mild hypothermia.',
    OFF: 'Heaters disabled. Core body temperature drops rapidly towards ambient cryogenic equilibrium.',
  },
  radiationShield: {
    ACTIVE:
      'High-density polyethylene garment liner and active electromagnetic field deflector attenuating cosmic and solar rays.',
    OFF: 'Unshielded exposure to galactic cosmic rays and solar energetic proton flux.',
  },
  powerMode: {
    NORMAL: 'Primary lithium-ion life-support battery supply.',
    AUX_RTG: 'Radioisotope Thermoelectric Generator auxiliary trickle feed. Offsets power consumption continuously.',
    ECO_SAVER: 'Non-vital avionics and auxiliary telemetry dimmed to extend emergency battery endurance.',
  },
};

export class SurvivalEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentPlanet = 'earth';
    this.elapsedSeconds = 0;
    this.suitIntegrity = 100.0;
    this.oxygenReserve = 100.0;
    this.batteryPower = 100.0;
    this.thermalRegulation = 100.0;
    this.accumulatedDoseMsv = 0.0;
    this.coreBodyTempC = 37.0;
    this.status = 'OPTIMAL';

    // Interactive Life Support Equipment Settings
    this.equipment = {
      oxygenMode: 'PRIMARY', // 'PRIMARY' | 'MOXIE_REBREATHER' | 'OFF'
      pressureSuit: 'SEALED', // 'SEALED' | 'EMERGENCY_DEPRESS'
      thermalReg: 'ACTIVE', // 'ACTIVE' | 'STANDBY' | 'OFF'
      radiationShield: 'ACTIVE', // 'ACTIVE' | 'OFF'
      powerMode: 'NORMAL', // 'NORMAL' | 'AUX_RTG' | 'ECO_SAVER'
    };

    // Environmental Simulation Events
    this.events = {
      dustStorm: false,
      temperatureDrop: false,
    };
  }

  resetEquipment() {
    this.equipment = {
      oxygenMode: 'PRIMARY',
      pressureSuit: 'SEALED',
      thermalReg: 'ACTIVE',
      radiationShield: 'ACTIVE',
      powerMode: 'NORMAL',
    };
    this.events = {
      dustStorm: false,
      temperatureDrop: false,
    };
    this.suitIntegrity = 100.0;
    this.oxygenReserve = 100.0;
    this.batteryPower = 100.0;
    this.thermalRegulation = 100.0;
    this.coreBodyTempC = 37.0;
    this.status = 'OPTIMAL';
  }

  setPlanet(planetName) {
    if (this.currentPlanet !== planetName) {
      this.currentPlanet = planetName;
      this.reset();
      this.currentPlanet = planetName;
    }
  }

  setEquipment(system, value) {
    if (this.equipment[system] !== undefined) {
      this.equipment[system] = value;
    }
  }

  toggleEvent(eventName) {
    if (this.events[eventName] !== undefined) {
      this.events[eventName] = !this.events[eventName];
    }
    return this.events[eventName];
  }

  setEvent(eventName, active) {
    if (this.events[eventName] !== undefined) {
      this.events[eventName] = Boolean(active);
    }
  }

  /**
   * Updates survival parameters by elapsed simulation delta seconds.
   */
  update(deltaSeconds) {
    const data = getPlanetData(this.currentPlanet);
    this.elapsedSeconds += deltaSeconds;

    // Determine ambient temperature considering events
    let effectiveAmbientTempC = data.surfaceTempMeanC;
    if (this.events.temperatureDrop) {
      // Mars night polar cold drop: plummets to -125°C
      effectiveAmbientTempC = data.name === 'mars' ? -125 : data.surfaceTempMinC - 30;
    }

    const tempDelta = Math.abs(effectiveAmbientTempC - 20.0);
    const pressureDelta = Math.abs(data.atmosphericPressureBar - 1.013);

    // 1. Oxygen Consumption Logic
    if (this.equipment.oxygenMode === 'OFF') {
      // Rapid hypoxia: O2 reserve crashes to 0 and vitals deteriorate
      this.oxygenReserve = Math.max(0, this.oxygenReserve - 4.0 * deltaSeconds);
    } else if (this.equipment.oxygenMode === 'MOXIE_REBREATHER') {
      // MOXIE extracts O2 from ambient CO2 (viable on Mars/Venus, minimal on vacuum worlds)
      const isCO2Atmosphere = ['mars', 'venus'].includes(data.name);
      const o2Rate = isCO2Atmosphere ? 0.006 : 0.035;
      this.oxygenReserve = Math.max(0, this.oxygenReserve - o2Rate * deltaSeconds);
    } else {
      // Standard Primary Cylinder O2
      const baseO2Rate = data.name === 'earth' ? 0.005 : 0.032;
      this.oxygenReserve = Math.max(0, this.oxygenReserve - baseO2Rate * deltaSeconds);
    }

    // 2. Battery / Power Consumption Logic
    let powerDrain = 0.025; // baseline avionics
    if (this.equipment.thermalReg === 'ACTIVE') {
      const thermalFactor = 1.0 + tempDelta / 120.0;
      powerDrain += 0.03 * thermalFactor;
    } else if (this.equipment.thermalReg === 'STANDBY') {
      powerDrain += 0.01;
    }

    if (this.equipment.oxygenMode === 'MOXIE_REBREATHER') {
      powerDrain += 0.028; // Chemical compressor draws extra power
    }

    if (this.equipment.radiationShield === 'ACTIVE') {
      powerDrain += 0.015; // Active magnetic deflector coil
    }

    if (this.equipment.powerMode === 'ECO_SAVER') {
      powerDrain *= 0.65;
    } else if (this.equipment.powerMode === 'AUX_RTG') {
      // RTG nuclear decay provides continuous +0.035%/s trickle power
      powerDrain = Math.max(0.005, powerDrain - 0.035);
    }

    // Dust storm cuts solar power efficiency and increases blower resistance
    if (this.events.dustStorm && this.equipment.powerMode !== 'AUX_RTG') {
      powerDrain *= 2.2;
    }

    this.batteryPower = Math.max(0, this.batteryPower - powerDrain * deltaSeconds);

    // 3. Thermal Regulation & Core Temperature Homeostasis
    if (this.batteryPower <= 0 || this.equipment.thermalReg === 'OFF') {
      // Heating system failed or turned off: core body temp shifts toward ambient
      const thermalLossRate = (tempDelta / 100.0) * 0.18;
      this.thermalRegulation = Math.max(0, this.thermalRegulation - thermalLossRate * deltaSeconds);

      if (effectiveAmbientTempC < 35.0) {
        // Hypothermia
        this.coreBodyTempC = Math.max(26.0, this.coreBodyTempC - 0.08 * deltaSeconds);
      } else {
        // Hyperthermia
        this.coreBodyTempC = Math.min(45.0, this.coreBodyTempC + 0.08 * deltaSeconds);
      }
    } else if (this.equipment.thermalReg === 'STANDBY') {
      this.thermalRegulation = Math.max(45, 100.0 - (tempDelta / 400.0) * 20.0);
      if (effectiveAmbientTempC < 15) {
        this.coreBodyTempC = Math.max(34.5, this.coreBodyTempC - 0.015 * deltaSeconds);
      }
    } else {
      // Active thermal regulation maintaining comfortable body temperature
      this.thermalRegulation = Math.max(75, 100.0 - (tempDelta / 600.0) * 12.0);
      // Gradually restore core temperature toward 37.0°C
      if (this.coreBodyTempC < 37.0) {
        this.coreBodyTempC = Math.min(37.0, this.coreBodyTempC + 0.05 * deltaSeconds);
      } else if (this.coreBodyTempC > 37.0) {
        this.coreBodyTempC = Math.max(37.0, this.coreBodyTempC - 0.05 * deltaSeconds);
      }
    }

    // 4. Pressure Suit Structural Integrity
    if (this.equipment.pressureSuit === 'EMERGENCY_DEPRESS') {
      // Severe rapid decompression below Armstrong limit
      this.suitIntegrity = Math.max(0, this.suitIntegrity - 3.8 * deltaSeconds);
    } else if (data.name === 'venus') {
      // Venusian crushing pressure & acid
      this.suitIntegrity = Math.max(0, this.suitIntegrity - (3.5 + pressureDelta * 0.005) * deltaSeconds);
    } else if (['jupiter', 'saturn', 'uranus', 'neptune'].includes(data.name)) {
      this.suitIntegrity = Math.max(0, this.suitIntegrity - 2.0 * deltaSeconds);
    } else if (data.name === 'earth') {
      this.suitIntegrity = 100.0;
    } else {
      let suitStress = 0.002;
      // Dust storm abrasive regolith particles slowly scratch visor & seals
      if (this.events.dustStorm) {
        suitStress += 0.025;
      }
      this.suitIntegrity = Math.max(0, this.suitIntegrity - suitStress * deltaSeconds);
    }

    // 5. Radiation Dose Rate Logic
    let baseMsvYr = data.radiationExposureMsvYr;
    if (this.equipment.radiationShield === 'ACTIVE') {
      baseMsvYr *= 0.2; // 80% shield reduction
    }
    const msvPerSec = (baseMsvYr / (365.25 * 24 * 3600)) * (data.name === 'earth' ? 1 : 2.5);
    this.accumulatedDoseMsv += msvPerSec * deltaSeconds;

    // 6. Overall Vitals Status Evaluation
    if (
      this.suitIntegrity <= 0 ||
      this.oxygenReserve <= 0 ||
      this.coreBodyTempC <= 29.5 ||
      this.coreBodyTempC >= 43.0
    ) {
      this.status = 'TERMINAL';
    } else if (
      this.suitIntegrity < 30 ||
      this.oxygenReserve < 20 ||
      this.batteryPower < 10 ||
      this.thermalRegulation < 30 ||
      this.equipment.pressureSuit === 'EMERGENCY_DEPRESS' ||
      this.equipment.oxygenMode === 'OFF'
    ) {
      this.status = 'CRITICAL';
    } else if (
      this.suitIntegrity < 65 ||
      this.oxygenReserve < 45 ||
      this.batteryPower < 25 ||
      this.thermalRegulation < 60 ||
      this.events.dustStorm ||
      this.events.temperatureDrop ||
      this.equipment.thermalReg === 'STANDBY'
    ) {
      this.status = 'WARNING';
    } else if (
      data.survivalProfile.hazardLevel === 'CRITICAL' ||
      data.survivalProfile.hazardLevel === 'LETHAL IMMEDIATE'
    ) {
      this.status = 'HAZARD ALERT';
    } else {
      this.status = 'OPTIMAL';
    }

    return this.getTelemetry();
  }

  /**
   * Transparent Educational Risk Index Calculation (0 to 100%)
   */
  calculateEducationalRisk() {
    let risk = 0;

    // Oxygen factor (up to 30 pts)
    if (this.equipment.oxygenMode === 'OFF') {
      risk += 35;
    } else if (this.oxygenReserve < 25) {
      risk += 25;
    } else if (this.oxygenReserve < 50) {
      risk += 12;
    }

    // Pressure envelope factor (up to 30 pts)
    if (this.equipment.pressureSuit === 'EMERGENCY_DEPRESS') {
      risk += 35;
    } else if (this.suitIntegrity < 40) {
      risk += 22;
    } else if (this.suitIntegrity < 70) {
      risk += 10;
    }

    // Thermal factor (up to 20 pts)
    if (this.equipment.thermalReg === 'OFF' || this.batteryPower <= 0) {
      risk += 20;
    } else if (this.equipment.thermalReg === 'STANDBY') {
      risk += 10;
    }

    // Radiation factor (up to 10 pts)
    if (this.equipment.radiationShield === 'OFF') {
      risk += 10;
    }

    // Environmental event factor (up to 20 pts)
    if (this.events.dustStorm) {
      risk += 12;
    }
    if (this.events.temperatureDrop) {
      risk += 14;
    }

    return Math.min(100, Math.round(risk));
  }

  getEducationalRiskSummary(riskScore) {
    if (riskScore >= 75) {
      return {
        level: 'CRITICAL HAZARD',
        color: 'rose',
        note: 'Immediate life support compromise detected. Survival probability collapsing rapidly without shelter.',
      };
    }
    if (riskScore >= 45) {
      return {
        level: 'HIGH RISK',
        color: 'amber',
        note: 'Elevated life support strain. Environmental hazards actively degrading suit reserves.',
      };
    }
    if (riskScore >= 20) {
      return {
        level: 'ELEVATED RISK',
        color: 'blue',
        note: 'Non-optimal settings or environmental stress active. Equipment mitigating primary vectors.',
      };
    }
    return {
      level: 'NOMINAL',
      color: 'emerald',
      note: 'All life support systems operational. Environmental vectors successfully mitigated.',
    };
  }

  getTelemetry() {
    const data = getPlanetData(this.currentPlanet);
    const hourlyRateMsv = (
      (data.radiationExposureMsvYr * (this.equipment.radiationShield === 'ACTIVE' ? 0.2 : 1.0)) /
      (365.25 * 24)
    ).toFixed(3);

    const educationalRisk = this.calculateEducationalRisk();
    const riskSummary = this.getEducationalRiskSummary(educationalRisk);

    const effectiveTemp = this.events.temperatureDrop
      ? `${data.name === 'mars' ? -125 : data.surfaceTempMinC - 30}°C (Night Cold Drop)`
      : `${data.surfaceTempMeanC}°C (${data.surfaceTempMinC}°C to ${data.surfaceTempMaxC}°C)`;

    return {
      planetName: data.displayName,
      tagline: data.tagline,
      status: this.status,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      suitIntegrity: Math.round(this.suitIntegrity),
      oxygenReserve: Math.round(this.oxygenReserve),
      batteryPower: Math.round(this.batteryPower),
      thermalRegulation: Math.round(this.thermalRegulation),
      coreBodyTempC: this.coreBodyTempC.toFixed(1),
      accumulatedDoseMsv: this.accumulatedDoseMsv.toFixed(4),
      hourlyRateMsv: `${hourlyRateMsv} mSv/h`,
      surfaceTemp: effectiveTemp,
      gravity: `${data.gravityMs2} m/s² (${data.gravityEarthG}g)`,
      pressure: data.atmosphericPressureDescription,
      hazardLevel: data.survivalProfile.hazardLevel,
      primaryThreat: data.survivalProfile.primaryHazards[0] || 'Unknown environmental vector',
      estimatedEvTime: data.survivalProfile.estimatedEvTimeWithoutHabitat,
      missionDirectives: data.survivalProfile.missionDirectives,
      atmosphereComposition: data.atmosphereComposition,

      // Interactive State Exposure
      equipment: {...this.equipment},
      events: {...this.events},
      educationalRisk,
      riskSummary,
      equipmentDescriptions: EQUIPMENT_DESCRIPTIONS,
    };
  }
}
