/**
 * ASTRA — Beyond Earth Mission Interface Architecture
 * Defines the common lifecycle, telemetry, and points of interest (POI)
 * for both planetary surface missions and deep atmospheric exploration vessels.
 */

export const MISSION_TYPES = {
  ORBITAL: 'orbital',
  SURFACE: 'surface',
  ATMOSPHERIC: 'atmospheric',
};

/**
 * Scientific Points of Interest catalog on Mars
 */
export const MARS_POIS = [
  {
    id: 'jezero-delta',
    title: 'Jezero Crater Paleolake Delta',
    coordinates: {x: -28, z: -35},
    category: 'Astrobiology & Sedimentology',
    summary:
      'Ancient river-lake system with preserved clay-rich mudstones. Primary target for sampling fossilized microbial biosignatures from the Noachian-Hesperian transition (3.8–3.5 Ga).',
    samples: ['Smectite Clay Core', 'Detrital Carbonate', 'Organic Carbon Trace'],
    radiationLevel: '0.026 mSv/h',
    hazardRating: 'MODERATE DUST ABRASION',
  },
  {
    id: 'aureole-ridge',
    title: 'Olympus Mons Aureole Ridge',
    coordinates: {x: 35, z: -20},
    category: 'Volcanology & Subsurface Lava Tubes',
    summary:
      'Gigantic collapsed volcanic apron deposits. Massive subterranean basaltic lava tubes detected with ground-penetrating radar, providing natural radiation shelter for human habitats.',
    samples: ['Tholeiitic Basalt', 'Vesicular Scoria', 'Subsurface Regolith Core'],
    radiationLevel: '0.012 mSv/h (Partial shielding)',
    hazardRating: 'RUGGED ESCARPMENT / ROLLOVER RISK',
  },
  {
    id: 'argyre-glacier',
    title: 'Argyre Planitia Lobate Debris Apron',
    coordinates: {x: -15, z: 40},
    category: 'Glaciology & In-Situ Resource Utilization',
    summary:
      'Debris-covered glacial ice sheets identified by radar reflectivity. Contains millions of cubic kilometers of high-purity water ice, essential for ISRU propellant and oxygen synthesis.',
    samples: ['Subsurface Water Ice Core (94% pure)', 'Perchlorate Salt Brine', 'Glacial Till'],
    radiationLevel: '0.029 mSv/h',
    hazardRating: 'CRYOGENIC GROUND HAZARD (-88°C)',
  },
  {
    id: 'outpost-alpha',
    title: 'ASTRA Habitat Outpost Alpha',
    coordinates: {x: 0, z: -6},
    category: 'Surface Base & Life Support',
    summary:
      'Primary human staging base equipped with Sabatier MOXIE oxygen reactors, dual airlocks, RTG auxiliary power feed, and communications link to Mars Reconnaissance Orbiter.',
    samples: ['Purified O₂ Gas Canister', 'Sintered Regolith Brick', 'Telemetry Data Reel'],
    radiationLevel: '0.006 mSv/h (Hab pressurized interior)',
    hazardRating: 'SAFE HAVEN // O₂ REFILL AVAILABLE',
  },
];

/**
 * Standardized Destination Mission Interface contract
 */
export class DestinationMission {
  constructor(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.active = false;
  }

  enter() {
    this.active = true;
  }

  exit() {
    this.active = false;
  }

  update(_delta) {}

  render(_renderer) {}

  resize(_width, _height) {}

  getTelemetry() {
    return {};
  }
}
