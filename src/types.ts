/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export type CellType = 'empty' | 'wall' | 'trap' | 'cutter' | 'gate' | 'exit';

export interface Cutter {
  x: number;
  y: number;
  amount: number; // how many segments are removed
  collected?: boolean;
}

export interface Gate {
  x: number;
  y: number;
  maxLength: number; // snake length must be <= this to pass
}

export interface Portal {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  name: string; // e.g. 'Orange Alpha', 'Cyan Beta'
}

export interface Trap {
  x: number;
  y: number;
  type: 'static' | 'moving';
  // For moving traps
  range?: Position[]; // List of points representing a path it patrol/slides on
  patrolIndex?: number;
  direction?: 1 | -1;
  isActive?: boolean; // dynamic traps like spikes that pop up/down
}

export interface Level {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  startPos: Position;
  startDir: Direction;
  startLength: number;
  walls: Position[];
  traps: Trap[];
  cutters: Cutter[];
  gates: Gate[];
  portals?: Portal[];
  exit: Position;
  parMoves: number;
}
