/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level, Direction } from '../types';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Slicing 101',
    description: 'Welcome to Reverse Snake! Your tail is too long to fit through the security gate. Step on the glowing cutter to slice off 4 tail segments, then reach the portal.',
    width: 13,
    height: 9,
    startPos: { x: 2, y: 4 },
    startDir: Direction.RIGHT,
    startLength: 8,
    walls: [
      // Top & Bottom border walls representing narrow corridor
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 }, { x: 12, y: 2 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 },
      { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }
    ],
    traps: [],
    cutters: [
      { x: 5, y: 4, amount: 4 }
    ],
    gates: [
      { x: 8, y: 4, maxLength: 4 }
    ],
    exit: { x: 11, y: 4 },
    parMoves: 12
  },
  {
    id: 2,
    name: 'Perfect Squeeze',
    description: 'A 10-segment snake needs space to turn. Plan your route around areolas, gather the cutters to shrink, and squeeze through the Max-3 gate to the exit.',
    width: 13,
    height: 9,
    startPos: { x: 2, y: 1 },
    startDir: Direction.DOWN,
    startLength: 10,
    walls: [
      // Central division wall to force a S-curve
      { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 },
      { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 }
    ],
    traps: [],
    cutters: [
      { x: 2, y: 7, amount: 4 },
      { x: 10, y: 1, amount: 3 }
    ],
    gates: [
      // Gate in the gap of the central wall
      { x: 6, y: 5, maxLength: 6 },
      // Gate locking the exit
      { x: 10, y: 5, maxLength: 3 }
    ],
    exit: { x: 10, y: 7 },
    parMoves: 25
  },
  {
    id: 3,
    name: 'Danger Sparks',
    description: 'Hazardous static spike traps line the floor. Stepping on a spike triggers high voltage (instantly damages your core). Avoid the traps, fetch the cutters, and survive.',
    width: 13,
    height: 9,
    startPos: { x: 2, y: 2 },
    startDir: Direction.RIGHT,
    startLength: 11,
    walls: [
      { x: 0, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 8 }, { x: 12, y: 8 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 } // Divide some of the map
    ],
    traps: [
      { x: 7, y: 2, type: 'static' },
      { x: 7, y: 3, type: 'static' },
      { x: 7, y: 4, type: 'static' },
      { x: 2, y: 5, type: 'static' },
      { x: 10, y: 5, type: 'static' }
    ],
    cutters: [
      { x: 2, y: 7, amount: 5 },
      { x: 10, y: 2, amount: 4 }
    ],
    gates: [
      { x: 9, y: 4, maxLength: 4 }
    ],
    exit: { x: 10, y: 7 },
    parMoves: 34
  },
  {
    id: 4,
    name: 'Spiral Coils',
    description: 'At 13 segments long, you are so large that traveling in tight circles will cause you to crash into your own body. Navigate the open areas step by step to slice your tail.',
    width: 13,
    height: 9,
    startPos: { x: 6, y: 7 },
    startDir: Direction.UP,
    startLength: 13,
    walls: [
      // Inner walls creating a spiral maze
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 3 }, { x: 9, y: 3 },
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
      { x: 3, y: 4 }, { x: 9, y: 4 }
    ],
    traps: [],
    cutters: [
      { x: 1, y: 1, amount: 6 },
      { x: 11, y: 1, amount: 4 }
    ],
    exit: { x: 6, y: 4 }, 
    gates: [
      { x: 6, y: 5, maxLength: 3 }
    ],
    portals: [
      { x: 1, y: 7, targetX: 11, targetY: 7, color: '#f43f5e', name: 'Alpha In' },
      { x: 11, y: 7, targetX: 1, targetY: 7, color: '#f43f5e', name: 'Alpha Out' }
    ],
    parMoves: 28
  },
  {
    id: 5,
    name: 'Security Patrol',
    description: 'A glowing defensive laser trap patrols this sector vertically. Timed slithers are essential! Guide your tail into cutters while evading the sliding threat.',
    width: 13,
    height: 9,
    startPos: { x: 1, y: 4 },
    startDir: Direction.RIGHT,
    startLength: 12,
    walls: [
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, 
      { x: 8, y: 5 }, { x: 8, y: 6 }, { x: 8, y: 7 }
    ],
    traps: [
      // A moving trap that slides along column 6 between y:1 and y:7
      {
        x: 6,
        y: 1,
        type: 'moving',
        range: [
          { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 },
          { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }
        ],
        patrolIndex: 0,
        direction: 1
      }
    ],
    cutters: [
      { x: 2, y: 1, amount: 5 },
      { x: 10, y: 7, amount: 4 }
    ],
    gates: [
      { x: 10, y: 3, maxLength: 4 }
    ],
    exit: { x: 11, y: 1 },
    parMoves: 35
  },
  {
    id: 6,
    name: 'Dynamic Spikes',
    description: 'The floor spikes in this server room flash and activate periodically. Move over them only when they are retracted (gray), or run the risk of getting toasted.',
    width: 13,
    height: 9,
    startPos: { x: 1, y: 4 },
    startDir: Direction.RIGHT,
    startLength: 12,
    walls: [
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 8, y: 5 }, { x: 8, y: 6 }, { x: 8, y: 7 }, { x: 8, y: 8 }
    ],
    traps: [
      // Dynamic traps are toggling active/inactive on each move!
      { x: 6, y: 2, type: 'static', isActive: true }, // we will toggle static traps in code!
      { x: 6, y: 3, type: 'static', isActive: true },
      { x: 6, y: 4, type: 'static', isActive: true },
      { x: 6, y: 5, type: 'static', isActive: true },
      { x: 6, y: 6, type: 'static', isActive: true }
    ],
    cutters: [
      { x: 2, y: 7, amount: 6 },
      { x: 10, y: 1, amount: 4 }
    ],
    gates: [
      { x: 11, y: 4, maxLength: 3 }
    ],
    exit: { x: 11, y: 6 },
    parMoves: 30
  },
  {
    id: 7,
    name: 'Double Bottleneck',
    description: 'You start at a colossal 15 segments. You must locate two distinct cutters, threading the needle through an initial Max-8 Gate and a final Max-3 Gate.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 1 },
    startDir: Direction.RIGHT,
    startLength: 15,
    walls: [
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }
    ],
    traps: [
      { x: 2, y: 3, type: 'static' },
      { x: 8, y: 2, type: 'static' },
      { x: 12, y: 6, type: 'static' }
    ],
    cutters: [
      { x: 1, y: 7, amount: 7 },
      { x: 8, y: 1, amount: 5 }
    ],
    gates: [
      { x: 5, y: 5, maxLength: 8 },
      { x: 10, y: 3, maxLength: 3 }
    ],
    exit: { x: 13, y: 1 },
    parMoves: 45
  },
  {
    id: 8,
    name: 'The Ultimate Squeeze',
    description: 'The master core decompression system. Total reduction is mandatory. Avoid two cross-patrolling lasers and slice down to exactly 1 or 2 segments to trigger the escape elevator.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 4 },
    startDir: Direction.RIGHT,
    startLength: 17,
    walls: [
      { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
      { x: 9, y: 2 }, { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 }, { x: 9, y: 6 }
    ],
    traps: [
      // Patrol 1
      {
        x: 6,
        y: 1,
        type: 'moving',
        range: [
          { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }
        ],
        patrolIndex: 0,
        direction: 1
      },
      // Patrol 2
      {
        x: 11,
        y: 4,
        type: 'moving',
        range: [
          { x: 11, y: 4 }, { x: 11, y: 5 }, { x: 11, y: 6 }, { x: 11, y: 7 }
        ],
        patrolIndex: 0,
        direction: -1
      }
    ],
    cutters: [
      { x: 1, y: 1, amount: 6 },
      { x: 7, y: 7, amount: 5 },
      { x: 13, y: 7, amount: 4 }
    ],
    gates: [
      { x: 4, y: 1, maxLength: 11 },
      { x: 9, y: 7, maxLength: 6 },
      { x: 13, y: 3, maxLength: 2 } // Ultimate narrow gate!
    ],
    exit: { x: 13, y: 1 },
    parMoves: 50
  },
  {
    id: 9,
    name: 'Dimensional Warp',
    description: 'Bypass physical walls by jumping through paired quantum portals (Cyan & Violet) to reach the cutters and access the exit gate.',
    width: 13,
    height: 9,
    startPos: { x: 1, y: 7 },
    startDir: Direction.UP,
    startLength: 11,
    walls: [
      // Separator walls creating isolation
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 },
      { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 }, { x: 8, y: 6 }, { x: 8, y: 7 }, { x: 8, y: 8 }
    ],
    traps: [
      { x: 2, y: 3, type: 'static' },
      { x: 10, y: 6, type: 'static' }
    ],
    cutters: [
      { x: 10, y: 2, amount: 4 },
      { x: 6, y: 7, amount: 3 }
    ],
    gates: [
      { x: 6, y: 3, maxLength: 4 }
    ],
    portals: [
      { x: 2, y: 1, targetX: 10, targetY: 1, color: '#06b6d4', name: 'Cyan A' },
      { x: 10, y: 1, targetX: 2, targetY: 1, color: '#06b6d4', name: 'Cyan B' },
      { x: 10, y: 4, targetX: 6, targetY: 5, color: '#a855f7', name: 'Violet A' },
      { x: 6, y: 5, targetX: 10, targetY: 4, color: '#a855f7', name: 'Violet B' }
    ],
    exit: { x: 6, y: 1 },
    parMoves: 26
  },
  {
    id: 10,
    name: 'Hyper Squeeze Run',
    description: 'The final speed challenge! High-velocity patrolling lasers and opposite corner portals require extreme timing to squeeze down to 2 segments before escaping.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 1 },
    startDir: Direction.DOWN,
    startLength: 12,
    walls: [
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 4, y: 7 }, { x: 4, y: 8 },
      { x: 10, y: 0 }, { x: 10, y: 1 }, { x: 10, y: 2 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }
    ],
    traps: [
      {
        x: 6,
        y: 1,
        type: 'moving',
        range: [
          { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }
        ],
        patrolIndex: 0,
        direction: 1
      },
      {
        x: 8,
        y: 7,
        type: 'moving',
        range: [
          { x: 8, y: 7 }, { x: 8, y: 6 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 3 }, { x: 8, y: 2 }, { x: 8, y: 1 }
        ],
        patrolIndex: 0,
        direction: -1
      }
    ],
    cutters: [
      { x: 2, y: 7, amount: 5 },
      { x: 12, y: 2, amount: 5 }
    ],
    gates: [
      { x: 12, y: 5, maxLength: 2 } // strict precision!
    ],
    portals: [
      { x: 1, y: 5, targetX: 13, targetY: 4, color: '#ec4899', name: 'Rose A' },
      { x: 13, y: 4, targetX: 1, targetY: 5, color: '#ec4899', name: 'Rose B' }
    ],
    exit: { x: 13, y: 7 },
    parMoves: 32
  },
  {
    id: 11,
    name: 'Serpent\'s Knot',
    description: 'A complex knot of walls and portals requiring careful segment transfers. Bypass rotating hazards to solve the mainframe gate puzzle.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 7 },
    startDir: Direction.UP,
    startLength: 16,
    walls: [
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }, 
      { x: 8, y: 3 }, { x: 9, y: 3 }, { x: 10, y: 3 }, { x: 11, y: 3 }, 
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 5 }, { x: 7, y: 6 }, { x: 7, y: 7 }
    ],
    traps: [
      { x: 5, y: 1, type: 'static' },
      { x: 9, y: 1, type: 'static' }
    ],
    cutters: [
      { x: 2, y: 7, amount: 6 },
      { x: 12, y: 7, amount: 6 }
    ],
    gates: [
      { x: 7, y: 4, maxLength: 5 }
    ],
    portals: [
      { x: 2, y: 1, targetX: 12, targetY: 1, color: '#f59e0b', name: 'Amber A' },
      { x: 12, y: 1, targetX: 2, targetY: 1, color: '#f59e0b', name: 'Amber B' }
    ],
    exit: { x: 12, y: 4 },
    parMoves: 46
  },
  {
    id: 12,
    name: 'Dual Corridor Defense',
    description: 'Multiple active tactical laser patrols partition the system space. Coordinate your slither timing to slice parts of your tail in both sections first.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 4 },
    startDir: Direction.RIGHT,
    startLength: 18,
    walls: [
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, 
      { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }, 
      { x: 10, y: 0 }, { x: 10, y: 1 }, { x: 10, y: 2 }, { x: 10, y: 3 }, 
      { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }
    ],
    traps: [
      {
        x: 4,
        y: 2,
        type: 'moving',
        range: [
          { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }
        ],
        patrolIndex: 0,
        direction: 1
      },
      {
        x: 9,
        y: 5,
        type: 'moving',
        range: [
          { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 }, { x: 9, y: 6 }, { x: 9, y: 7 }
        ],
        patrolIndex: 0,
        direction: -1
      }
    ],
    cutters: [
      { x: 2, y: 2, amount: 7 },
      { x: 12, y: 6, amount: 7 }
    ],
    gates: [
      { x: 5, y: 4, maxLength: 11 },
      { x: 10, y: 4, maxLength: 4 }
    ],
    exit: { x: 13, y: 2 },
    parMoves: 50
  },
  {
    id: 13,
    name: 'Quantum Lattice',
    description: 'An interlocking grid of sub-corridors. Jump between portals to collect the reduction codes. One wrong turn means automatic self-disintegration.',
    width: 15,
    height: 9,
    startPos: { x: 2, y: 2 },
    startDir: Direction.RIGHT,
    startLength: 15,
    walls: [
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, 
      { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 4, y: 7 }, 
      { x: 10, y: 1 }, { x: 10, y: 2 }, { x: 10, y: 3 }, 
      { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }
    ],
    traps: [
      { x: 7, y: 1, type: 'static' },
      { x: 7, y: 7, type: 'static' }
    ],
    cutters: [
      { x: 7, y: 2, amount: 6 },
      { x: 7, y: 6, amount: 6 }
    ],
    gates: [
      { x: 7, y: 4, maxLength: 3 }
    ],
    portals: [
      { x: 1, y: 1, targetX: 13, targetY: 7, color: '#06b6d4', name: 'Cyan A' },
      { x: 13, y: 7, targetX: 1, targetY: 1, color: '#06b6d4', name: 'Cyan B' },
      { x: 13, y: 1, targetX: 1, targetY: 7, color: '#a855f7', name: 'Violet A' },
      { x: 1, y: 7, targetX: 13, targetY: 1, color: '#a855f7', name: 'Violet B' }
    ],
    exit: { x: 13, y: 4 },
    parMoves: 38
  },
  {
    id: 14,
    name: 'Laser Maze Mainframe',
    description: 'A laser-dense room with moving and pulsating dynamic spike emitters. Your system tail is 20 units long. Slice down fast!',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 2 },
    startDir: Direction.DOWN,
    startLength: 20,
    walls: [
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, 
      { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }, 
      { x: 9, y: 1 }, { x: 9, y: 2 }, { x: 9, y: 3 }, 
      { x: 12, y: 5 }, { x: 12, y: 6 }, { x: 12, y: 7 }
    ],
    traps: [
      { x: 1, y: 5, type: 'static' },
      { x: 4, y: 1, type: 'static' },
      { x: 7, y: 3, type: 'static' },
      { x: 10, y: 5, type: 'static' },
      { x: 13, y: 1, type: 'static' }
    ],
    cutters: [
      { x: 5, y: 2, amount: 8 },
      { x: 11, y: 2, amount: 8 }
    ],
    gates: [
      { x: 11, y: 4, maxLength: 4 }
    ],
    exit: { x: 14, y: 7 },
    parMoves: 55
  },
  {
    id: 15,
    name: 'Zero Zero Nexus',
    description: 'The final mainframe testing suite. Shrink down to exactly 2 segments or less to fit into the extreme core exit hatch. Absolute precision required.',
    width: 15,
    height: 9,
    startPos: { x: 1, y: 1 },
    startDir: Direction.RIGHT,
    startLength: 19,
    walls: [
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 }, { x: 3, y: 8 }, 
      { x: 11, y: 0 }, { x: 11, y: 1 }, { x: 11, y: 2 }, { x: 11, y: 3 }, { x: 11, y: 4 }, { x: 11, y: 5 }, { x: 11, y: 7 }, { x: 11, y: 8 }
    ],
    traps: [
      {
        x: 7,
        y: 3,
        type: 'moving',
        range: [
          { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }
        ],
        patrolIndex: 0,
        direction: 1
      }
    ],
    cutters: [
      { x: 1, y: 7, amount: 9 },
      { x: 13, y: 1, amount: 8 }
    ],
    gates: [
      { x: 3, y: 2, maxLength: 10 },
      { x: 11, y: 6, maxLength: 2 }
    ],
    exit: { x: 13, y: 7 },
    parMoves: 60
  }
];
