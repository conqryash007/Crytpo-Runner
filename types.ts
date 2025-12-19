
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
