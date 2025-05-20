export interface SwarmParams {
  cohesion: number;
  separation: number;
  alignment: number;
  // numBoids: number; // Controlled by Firebase now
  speedLimit: number;
  forceLimit: number;
  perceptionRadius: number;
}

export interface MapConfig {
  gridSize: number; // Number of cells in one dimension (e.g., 20 for 20x20)
  cellSize: number; // Size of each cell in world units
}

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export interface FirebaseBoidConfig {
  id: string; // Firebase key
  initialX?: number;
  initialY?: number;
  initialZ?: number;
  color?: string; // e.g., '#FF0000'
  // Add other potential properties that can be driven by Firebase
}
