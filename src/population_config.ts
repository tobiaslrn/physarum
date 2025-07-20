export interface PopulationConfig {
  sensor_distance: number;
  step_distance: number;
  sensor_angle: number;
  rotation_angle: number;
  decay_factor: number;
  deposition_amount: number;
}

export interface MultiPopulationConfig {
  particleCount: number;
  populations: PopulationConfig[];
  attraction_table: number[][];
  width: number;
  height: number;
}

/**
 * Generate parameters tuned for "larger" emergent structures.
 *  - Longer sensor & step distances let particles explore wider areas
 *  - Narrower sensor/rotation angles reduce branching, forming thicker veins
 *  - Lower decay + higher deposition keeps trails visible & broader
 */
export function createRandomConfig(): PopulationConfig {
  return {
    sensor_distance: 15.0 + Math.random() * 25.0, // 15 – 40 px
    step_distance: 1.0 + Math.random() * 2.0, // 1 – 3 px per tick
    sensor_angle: (10.0 + Math.random() * 40.0) * (Math.PI / 180.0), // 10° – 50°
    rotation_angle: (10.0 + Math.random() * 40.0) * (Math.PI / 180.0), // 10° – 50°
    decay_factor: 0.8 + Math.random() * 0.05, // 0.80 – 0.85
    deposition_amount: 5.0 + Math.random() * 5.0, // 5 – 10 units
  };
}

export function createMultiPopulationConfig(
  particleCount: number,
  numPopulations: number,
  width: number,
  height: number
): MultiPopulationConfig {
  const populations: PopulationConfig[] = [];

  for (let i = 0; i < numPopulations; i++) {
    populations.push(createRandomConfig());
  }

  // Same‑species attraction is slightly stronger; cross‑species varies mildly
  const attraction_table: number[][] = [];
  for (let i = 0; i < numPopulations; i++) {
    attraction_table[i] = [];
    for (let j = 0; j < numPopulations; j++) {
      if (i === j) {
        attraction_table[i][j] = 1.1 + (Math.random() - 0.5) * 0.2;
      } else {
        attraction_table[i][j] = -0.4 + Math.random() * 1.2;
      }
    }
  }

  return {
    particleCount,
    populations,
    attraction_table,
    width,
    height,
  };
}
