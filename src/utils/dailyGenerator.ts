import { Level, Direction, Position, Trap, Cutter, Gate, Portal } from '../types';

/**
 * Deterministic seedable pseudo-random number generator (Mulberry32).
 */
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * Computes a robust integer seed based on a string (like today's date "YYYY-MM-DD").
 */
export function getDailySeed(dateStr: string): number {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed << 5) - seed + dateStr.charCodeAt(i);
    seed |= 0;
  }
  return Math.abs(seed);
}

/**
 * Procedurally generates a unique level for the given 24-hour cycle.
 * Contains obstacles, cutters, security gates, and traps in a guaranteed solvable configuration.
 */
export function generateDailyLevel(dateStr: string): Level {
  const seed = getDailySeed(dateStr);
  const rng = mulberry32(seed);
  const nextFloat = () => rng();
  const nextInt = (min: number, max: number) => Math.floor(nextFloat() * (max - min + 1)) + min;

  const width = 13;
  const height = 9;

  // Start position left-centered (inside x: 1-2, y: 2-6)
  const startX = nextInt(1, 2);
  const startY = nextInt(2, 6);
  const startPos: Position = { x: startX, y: startY };

  // Exit position right-centered (inside x: 10-11, y: 2-6)
  const exitX = nextInt(10, 11);
  const exitY = nextInt(2, 6);
  const exit: Position = { x: exitX, y: exitY };

  const startDir = Direction.RIGHT;
  const startLength = nextInt(9, 11); // standard long segment

  const walls: Position[] = [];
  const cutters: Cutter[] = [];
  const gates: Gate[] = [];
  const traps: Trap[] = [];
  const portals: Portal[] = [];

  // Pick a layout theme based on seed to make them look distinct!
  const themeId = nextInt(0, 3);

  // Helper to check if a cell threatens key zones (start, exit)
  const isReserved = (x: number, y: number) => {
    // Keep 2x2 area around start, exit clear of walls and traps
    const aroundStart = Math.abs(x - startPos.x) <= 1 && Math.abs(y - startPos.y) <= 1;
    const aroundExit = Math.abs(x - exit.x) <= 1 && Math.abs(y - exit.y) <= 1;
    return aroundStart || aroundExit;
  };

  if (themeId === 0) {
    // Theme 0: Dual Portal Corridor Gateways
    const X1 = 4;
    const X2 = 8;
    const gapY1 = nextInt(2, 6);
    const gapY2 = nextInt(2, 6);

    // Build vertical wall columns
    for (let y = 0; y < height; y++) {
      if (y !== gapY1 && !isReserved(X1, y)) walls.push({ x: X1, y });
      if (y !== gapY2 && !isReserved(X2, y)) walls.push({ x: X2, y });
    }

    // Place gates in the openings
    const firstGateMax = nextInt(6, 7);
    gates.push({ x: X1, y: gapY1, maxLength: firstGateMax });

    const secondGateMax = nextInt(3, 4);
    gates.push({ x: X2, y: gapY2, maxLength: secondGateMax });

    // Place cutters
    cutters.push({ x: X1 - 2, y: nextInt(1, 7), amount: startLength - firstGateMax });
    cutters.push({ x: nextInt(X1 + 1, X2 - 1), y: nextInt(1, 7), amount: firstGateMax - secondGateMax });

    // Static traps
    traps.push({ x: 3, y: 1, type: 'static' });
    traps.push({ x: 9, y: 7, type: 'static' });

  } else if (themeId === 1) {
    // Theme 1: Zig-Zag Inner Serpent
    const Y1 = nextInt(3, 4);
    // Left projection wall
    for (let x = 0; x <= 8; x++) {
      if (!isReserved(x, Y1)) walls.push({ x, y: Y1 });
    }
    // Right projection wall at a different height
    const Y2 = Y1 === 3 ? 5 : 3;
    for (let x = 4; x < width; x++) {
      if (!isReserved(x, Y2)) walls.push({ x, y: Y2 });
    }

    // Gaps for gated passage
    gates.push({ x: 9, y: Y1, maxLength: 6 });
    gates.push({ x: 3, y: Y2, maxLength: 3 });

    // Placements of Cutters
    cutters.push({ x: nextInt(1, 2), y: Y1 - 1, amount: startLength - 6 });
    cutters.push({ x: nextInt(6, 8), y: Y2 + 1, amount: 3 });

    // Spikes
    traps.push({ x: 5, y: nextInt(1, 2), type: 'static' });
    traps.push({ x: 8, y: nextInt(6, 7), type: 'static' });

  } else if (themeId === 2) {
    // Theme 2: Center Quantum Pillar
    const pStartX = 4;
    const pEndX = 8;
    const pStartY = 3;
    const pEndY = 5;
    for (let x = pStartX; x <= pEndX; x++) {
      for (let y = pStartY; y <= pEndY; y++) {
        if (x === 6 && y === 4) {
          gates.push({ x, y, maxLength: 4 });
        } else if (!isReserved(x, y)) {
          walls.push({ x, y });
        }
      }
    }

    // Cutters around the block
    cutters.push({ x: nextInt(1, 3), y: 1, amount: 3 });
    cutters.push({ x: nextInt(10, 11), y: 7, amount: 3 });

    // Simple horizontal moving lasers
    traps.push({
      x: 2,
      y: 2,
      type: 'moving',
      range: [
        { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }
      ],
      patrolIndex: nextInt(0, 4),
      direction: 1
    });

  } else {
    // Theme 3: Portal Nexus Sector
    const pillars = [
      { x: 3, y: 2 }, { x: 3, y: 6 },
      { x: 6, y: 1 }, { x: 6, y: 7 },
      { x: 9, y: 2 }, { x: 9, y: 6 }
    ];
    pillars.forEach(p => {
      if (!isReserved(p.x, p.y)) walls.push(p);
    });

    // Portal nexus to hop between corners
    portals.push({
      x: 2, y: 2,
      targetX: 10, targetY: 6,
      color: '#a855f7', name: 'Quantum P1'
    });
    portals.push({
      x: 10, y: 6,
      targetX: 2, targetY: 2,
      color: '#a855f7', name: 'Quantum P2'
    });

    cutters.push({ x: 5, y: 4, amount: 5 });
    gates.push({ x: 8, y: 4, maxLength: 5 });
    traps.push({ x: 6, y: 4, type: 'static' });
  }

  // Final sanitizing filters
  const cleanWalls = walls.filter(w => (w.x !== startPos.x || w.y !== startPos.y) && (w.x !== exit.x || w.y !== exit.y));
  const cleanCutters = cutters.filter(c => (c.x !== startPos.x || c.y !== startPos.y) && (c.x !== exit.x || c.y !== exit.y));
  const cleanGates = gates.filter(g => (g.x !== startPos.x || g.y !== startPos.y) && (g.x !== exit.x || g.y !== exit.y));
  const cleanTraps = traps.filter(t => (t.x !== startPos.x || t.y !== startPos.y) && (t.x !== exit.x || t.y !== exit.y));

  const parMoves = themeId === 0 ? 25 : themeId === 1 ? 30 : themeId === 2 ? 28 : 22;

  const level: Level = {
    id: 100, // custom distinct ID representing Daily Challenge mode
    name: `Sector-${dateStr.replace(/-/g, '')}`,
    description: `Procedurally generated Solar Grid challenge for ${dateStr}. Squeeze inside gates, pick cutters and beat the exit with fewer moves!`,
    width,
    height,
    startPos,
    exit,
    startDir,
    startLength,
    walls: cleanWalls,
    cutters: cleanCutters,
    gates: cleanGates,
    traps: cleanTraps,
    portals: portals.length > 0 ? portals : undefined,
    parMoves
  };

  return level;
}
