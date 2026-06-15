/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Position, Direction, Level, Cutter, Gate, Trap } from '../types';
import { LEVELS } from '../data/levels';
import { audioSystem } from '../utils/audio';
import { generateDailyLevel } from '../utils/dailyGenerator';
import { getLeaderboard, submitScore, LeaderboardEntry } from '../utils/firebase';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, 
  HelpCircle, Sparkles, Trophy, Skull, Activity, ShieldCheck, ChevronRight, Zap, Info, RefreshCw, Send, Gamepad2, Lightbulb, Terminal, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Core rendering structures
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface SnakeSkin {
  id: string;
  name: string;
  headColor: string;
  headGlow: string;
  bodyColor: string;
  bodyOutline: string;
  linkColor: string;
  eyeColor: string;
  levelRequired: number;
  unlockedByScore?: number;
}

export const SKINS: SnakeSkin[] = [
  {
    id: 'emerald',
    name: 'Emerald Core',
    headColor: '#10b981',
    headGlow: 'rgba(16, 185, 129, 0.45)',
    bodyColor: '#059669',
    bodyOutline: '#34d399',
    linkColor: '#047857',
    eyeColor: '#06b6d4',
    levelRequired: 1
  },
  {
    id: 'crimson',
    name: 'Crimson Fury',
    headColor: '#f43f5e',
    headGlow: 'rgba(244, 63, 94, 0.55)',
    bodyColor: '#be123c',
    bodyOutline: '#fda4af',
    linkColor: '#9f1239',
    eyeColor: '#fbbf24',
    levelRequired: 3
  },
  {
    id: 'cyber',
    name: 'Cyber Pulsar',
    headColor: '#22d3ee',
    headGlow: 'rgba(34, 211, 238, 0.55)',
    bodyColor: '#0891b2',
    bodyOutline: '#a5f3fc',
    linkColor: '#0e7490',
    eyeColor: '#ffffff',
    levelRequired: 5
  },
  {
    id: 'gold',
    name: 'Solar Eclipse',
    headColor: '#f59e0b',
    headGlow: 'rgba(245, 158, 11, 0.55)',
    bodyColor: '#d97706',
    bodyOutline: '#fde047',
    linkColor: '#b45309',
    eyeColor: '#1e293b',
    levelRequired: 7
  },
  {
    id: 'nebula',
    name: 'Nebula Vibe',
    headColor: '#c084fc',
    headGlow: 'rgba(192, 132, 252, 0.55)',
    bodyColor: '#7e22ce',
    bodyOutline: '#f3e8ff',
    linkColor: '#6b21a8',
    eyeColor: '#f43f5e',
    levelRequired: 9
  },
  {
    id: 'rainbow',
    name: 'Prism Overdrive',
    headColor: 'DYNAMIC',
    headGlow: 'DYNAMIC_GLOW',
    bodyColor: 'DYNAMIC_BODY',
    bodyOutline: '#ffffff',
    linkColor: 'DYNAMIC_LINK',
    eyeColor: '#ffffff',
    levelRequired: 10
  }
];

export default function GameBoard() {
  // Navigation & Tabs on side column
  const [activeTab, setActiveTab] = useState<'levels' | 'leaderboard' | 'skins' | 'constructor'>('levels');
  
  // Sandbox State
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [customSandboxLevel, setCustomSandboxLevel] = useState<Level | null>(null);
  
  // Sandbox parameters
  const [sandboxWidth, setSandboxWidth] = useState<number>(14);
  const [sandboxHeight, setSandboxHeight] = useState<number>(9);
  const [sandboxStartLength, setSandboxStartLength] = useState<number>(12);
  const [sandboxWallDensity, setSandboxWallDensity] = useState<number>(15); // percentage
  const [sandboxCutterCount, setSandboxCutterCount] = useState<number>(2);
  const [sandboxTrapCount, setSandboxTrapCount] = useState<number>(2);
  const [sandboxGateCount, setSandboxGateCount] = useState<number>(1);
  const [sandboxHasPortals, setSandboxHasPortals] = useState<boolean>(true);

  // Game Setup & Level state
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [isDailyChallenge, setIsDailyChallenge] = useState<boolean>(false);
  const [dailyLevel, setDailyLevel] = useState<Level | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState<boolean>(false);
  const [dailyBestMoves, setDailyBestMoves] = useState<number | null>(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'world' | 'daily'>('world');

  const activeLevel = isSandboxMode && customSandboxLevel 
    ? customSandboxLevel 
    : (isDailyChallenge && dailyLevel ? dailyLevel : LEVELS[currentLevelIdx]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const compVal = localStorage.getItem('reverse_snake_daily_challenge_' + todayStr);
    const bestVal = localStorage.getItem('reverse_snake_daily_challenge_best_' + todayStr);
    setDailyCompleted(compVal === 'completed');
    if (bestVal) {
      setDailyBestMoves(parseInt(bestVal, 10));
    }
  }, [isDailyChallenge]);

  useEffect(() => {
    fetchRankings();
  }, [leaderboardFilter]);

  const loadDailyChallenge = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lvl = generateDailyLevel(todayStr);
    setDailyLevel(lvl);
    setIsDailyChallenge(true);
    setLeaderboardFilter('daily');
  };

  // Core Game State
  const [snake, setSnake] = useState<Position[]>([]);
  const [prevSnake, setPrevSnake] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [nextDirection, setNextDirection] = useState<Direction>(Direction.RIGHT);
  const [cutters, setCutters] = useState<Cutter[]>([]);
  const [traps, setTraps] = useState<Trap[]>([]);
  
  // Scoring & Stats
  const [moves, setMoves] = useState<number>(0);
  const [totalLevelDeaths, setTotalLevelDeaths] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [levelEarnedScore, setLevelEarnedScore] = useState<number>(0);
  const [earnedStreakBonus, setEarnedStreakBonus] = useState<number>(0);
  const [earnedStreakCount, setEarnedStreakCount] = useState<number>(0);
  
  // Custom Visual and Gameplay Features States
  const [shakeActive, setShakeActive] = useState<boolean>(false);
  const [shakeIntensity, setShakeIntensity] = useState<'subtle' | 'intense' | null>(null);
  const [selectedSkinId, setSelectedSkinId] = useState<string>('emerald');
  const [isTimeChallenge, setIsTimeChallenge] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1.0);
  const [perfectSqueezes, setPerfectSqueezes] = useState<number>(0);

  const triggerScreenShake = (intensity: 'subtle' | 'intense') => {
    setShakeActive(true);
    setShakeIntensity(intensity);
    const duration = intensity === 'intense' ? 380 : 220;
    setTimeout(() => {
      setShakeActive(false);
      setShakeIntensity(null);
    }, duration);
  };
  
  // Game Status
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isLevelCompleted, setIsLevelCompleted] = useState<boolean>(false);
  const [isGameBeaten, setIsGameBeaten] = useState<boolean>(false);
  
  // Custom Smooth transition between levels
  const [isTransitioningLevel, setIsTransitioningLevel] = useState<boolean>(false);
  const [transitionMedal, setTransitionMedal] = useState<any>(null);

  // Level timing tracker
  const [timeTakenForLevel, setTimeTakenForLevel] = useState<number>(0);
  
  // Leaderboard Submissions
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('reverse_snake_username') || '';
  });
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(() => {
    const name = localStorage.getItem('reverse_snake_username');
    return !name || name.trim().length === 0;
  });
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Companion States for Arena Iframe Nickname Safety Editor
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [tempUserName, setTempUserName] = useState<string>('');

  const saveNickname = () => {
    const trimmed = tempUserName.trim();
    if (trimmed.length >= 2 && trimmed.length <= 15) {
      localStorage.setItem('reverse_snake_username', trimmed);
      setUserName(trimmed);
      setIsEditingNickname(false);
    }
  };

  // Daily Streak States
  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    const lastDateStr = localStorage.getItem('reverse_snake_last_streak_day') || '';
    const streakCount = parseInt(localStorage.getItem('reverse_snake_daily_streak') || '0', 10);
    
    if (!lastDateStr) return 0;
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastDateStr === todayStr) return streakCount;
    
    // Check if yesterday or older
    const lastDate = new Date(lastDateStr);
    const todayDate = new Date(todayStr);
    const lastDateUTC = Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const todayDateUTC = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const dayDifference = Math.floor((todayDateUTC - lastDateUTC) / (1000 * 60 * 60 * 24));
    
    if (dayDifference === 1) {
      return streakCount;
    } else {
      return 0; // Streak expired
    }
  });

  const getStreakMultiplier = (streak: number) => {
    if (streak <= 1) return 1.0;
    if (streak === 2) return 1.1;
    if (streak === 3) return 1.2;
    if (streak === 4) return 1.3;
    return 1.5; // 50% extra bonus for 5+ days streak!
  };

  // Levels Completed state
  const [completedLevels, setCompletedLevels] = useState<boolean[]>(() => {
    return LEVELS.map((_, idx) => localStorage.getItem(`reverse_snake_level_completed_${idx}`) === 'completed');
  });

  // Session State - starts false (Lobby Mode) and becomes true (Immersive Game Mode)
  const [inSession, setInSession] = useState<boolean>(false);
  const [lobbyGuideTab, setLobbyGuideTab] = useState<'mechanics' | 'features' | 'controls'>('mechanics');

  // Performance and FPS Monitoring States
  const [showPerformanceHUD, setShowPerformanceHUD] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number; limit: number } | null>(null);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let animationId: number;

    const measurePerf = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 500) { // update every 500ms
        const calculatedFps = Math.round((frameCount * 1000) / elapsed);
        setFps(calculatedFps);
        frameCount = 0;
        lastTime = now;

        try {
          const perf = window.performance as any;
          if (perf && perf.memory) {
            setMemoryUsage({
              used: Math.round(perf.memory.usedJSHeapSize / 1048576), // in MB
              total: Math.round(perf.memory.totalJSHeapSize / 1048576), // in MB
              limit: Math.round(perf.memory.jsHeapSizeLimit / 1048576), // in MB
            });
          } else {
            // Realistic simulated estimate for older/mobile engines lacking memory API
            const simulatedUsed = Math.round(24 + Math.random() * 4 + (activeLevel ? activeLevel.gridSize * 1.2 : 12));
            setMemoryUsage({
              used: simulatedUsed,
              total: 128,
              limit: 512,
            });
          }
        } catch (e) {
          // fallback
        }
      }
      animationId = requestAnimationFrame(measurePerf);
    };

    animationId = requestAnimationFrame(measurePerf);
    return () => cancelAnimationFrame(animationId);
  }, [activeLevel]);

  // Difficulty Selection State
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => {
    return (localStorage.getItem('reverse_snake_difficulty') as 'easy' | 'medium' | 'hard') || 'medium';
  });

  const changeDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(diff);
    localStorage.setItem('reverse_snake_difficulty', diff);

    // Update movement speed: Easy: 350ms (slower), Medium: 250ms (normal), Hard: 150ms (fast)
    let nextTickRate = 250;
    if (diff === 'easy') nextTickRate = 350;
    if (diff === 'hard') nextTickRate = 150;
    setTickRate(nextTickRate);

    audioSystem.playClick();
    setAlertText(`DIFFICULTY SET TO ${diff.toUpperCase()}! Grid matrix re-synchronized.`);
  };

  // Hint Path State
  const [isHintActive, setIsHintActive] = useState<boolean>(false);
  const [hasUsedHint, setHasUsedHint] = useState<boolean>(false);

  // Settings
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(false);
  const [forceAudioRefresh, setForceAudioRefresh] = useState<number>(0);
  const [isStepMode, setIsStepMode] = useState<boolean>(false); // Turn-Based
  const [tickRate, setTickRate] = useState<number>(250); 
  const [alertText, setAlertText] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(true);
  const [showDpadOverlay, setShowDpadOverlay] = useState<boolean>(true);
  const [dpadMode, setDpadMode] = useState<'fixed' | 'floating'>('floating');
  const [floatingCenter, setFloatingCenter] = useState<{ x: number; y: number } | null>(null);
  const [floatingKnob, setFloatingKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layout & Touch Swiping Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });
  
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Load Leaderboard list
  const fetchRankings = async () => {
    setIsLoadingRankings(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayInt = parseInt(todayStr.replace(/-/g, ''), 10);
      const data = await getLeaderboard(leaderboardFilter === 'daily' ? todayInt : undefined);
      setLeaderboard(data);
    } catch (err) {
      console.error("Could not load high scores", err);
    } finally {
      setIsLoadingRankings(false);
    }
  };

  useEffect(() => {
    audioSystem.init();
    fetchRankings();

    const handleResize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth, 600);
        const height = Math.min(width * 0.72, 420);
        setCanvasSize({ width, height });
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle Level loading & reset
  const initLevel = (levelIndex: number, resetStats = false) => {
    const lvl = isSandboxMode && customSandboxLevel
      ? customSandboxLevel
      : (isDailyChallenge && dailyLevel ? dailyLevel : LEVELS[levelIndex]);
    if (!lvl) return;

    const spawnedSnake = generateInitialSnake(lvl);
    
    setSnake(spawnedSnake);
    setPrevSnake(spawnedSnake);
    setDirection(lvl.startDir);
    setNextDirection(lvl.startDir);
    setCutters(lvl.cutters.map(c => ({ ...c, collected: false })));

    // Scale trap counts based on selected game difficulty
    let levelTraps = [...lvl.traps];
    if (difficulty === 'easy') {
      // Easy: Reduce traps by 50%
      levelTraps = levelTraps.filter((_, idx) => idx % 2 === 0);
    } else if (difficulty === 'hard') {
      // Hard: Seed 2 extra static core traps at verified safe spots
      const extraTrapsCount = 2;
      const addedPositions: Position[] = [];
      const rngSeed = lvl.id + 88; // semi-deterministic base

      const pseudoRandom = (seed: number, index: number) => {
        const value = Math.sin(seed + index * 101.3) * 10000;
        return value - Math.floor(value);
      };

      for (let attempt = 0; attempt < 50 && addedPositions.length < extraTrapsCount; attempt++) {
        const rx = Math.floor(pseudoRandom(rngSeed, attempt * 2) * (lvl.width - 2)) + 1;
        const ry = Math.floor(pseudoRandom(rngSeed, attempt * 2 + 1) * (lvl.height - 2)) + 1;

        const isOccupied =
          (rx === lvl.startPos.x && ry === lvl.startPos.y) ||
          (rx === lvl.exit.x && ry === lvl.exit.y) ||
          lvl.walls.some(w => w.x === rx && w.y === ry) ||
          lvl.cutters.some(c => c.x === rx && c.y === ry) ||
          lvl.gates.some(g => g.x === rx && g.y === ry) ||
          lvl.traps.some(t => t.x === rx && t.y === ry) ||
          (lvl.portals && lvl.portals.some(p => p.x === rx && p.y === ry)) ||
          // Ensure clearance of start and exit corridors
          (Math.abs(rx - lvl.startPos.x) <= 1 && Math.abs(ry - lvl.startPos.y) <= 1) ||
          (Math.abs(rx - lvl.exit.x) <= 1 && Math.abs(ry - lvl.exit.y) <= 1);

        if (!isOccupied && !addedPositions.some(p => p.x === rx && p.y === ry)) {
          addedPositions.push({ x: rx, y: ry });
        }
      }

      addedPositions.forEach(pos => {
        levelTraps.push({
          x: pos.x,
          y: pos.y,
          type: 'static',
          isActive: true
        });
      });
    }

    setTraps(levelTraps.map(t => ({ ...t, patrolIndex: t.patrolIndex ?? 0, direction: t.direction ?? 1, isActive: true })));
    setMoves(0);
    setIsGameOver(false);
    setIsLevelCompleted(false);
    setAlertText(null);
    setHasSubmitted(false);
    setLevelEarnedScore(0);
    setPerfectSqueezes(0);
    setTimeMultiplier(1.0);
    setTimeTakenForLevel(0);

    // Modify available time for Time Stack Challenge according to difficulty
    let baseTime = lvl ? Math.max(25, Math.ceil(lvl.parMoves * 1.5)) : 30;
    if (difficulty === 'easy') {
      baseTime = Math.ceil(baseTime * 1.5); // 50% extra time
    } else if (difficulty === 'hard') {
      baseTime = Math.ceil(baseTime * 0.7); // 30% tighter time
    }
    setTimeRemaining(baseTime);

    lastStepTimeRef.current = performance.now();

    if (resetStats) {
      setTotalLevelDeaths(0);
    }

    setIsHintActive(false);
    setHasUsedHint(false);

    particlesRef.current = [];
    floatingTextsRef.current = [];
    audioSystem.autoSelectTrack(lvl.id);
    audioSystem.playClick();
  };

  useEffect(() => {
    initLevel(currentLevelIdx, true);
  }, [currentLevelIdx, isDailyChallenge, dailyLevel, difficulty, isSandboxMode, customSandboxLevel]);

  // Audio toggles
  const handleToggleMute = () => {
    const nextMuted = audioSystem.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleToggleMusic = () => {
    if (isMusicOn) {
      audioSystem.stopMusic();
      setIsMusicOn(false);
    } else {
      audioSystem.startMusic();
      setIsMusicOn(true);
    }
  };

  // BFS search to locate safe snake starting orientation
  const generateInitialSnake = (level: Level): Position[] => {
    const snakeList: Position[] = [level.startPos];
    const visited = new Set<string>();
    visited.add(`${level.startPos.x},${level.startPos.y}`);

    const getOppositeOffset = (dir: Direction): Position => {
      switch (dir) {
        case Direction.UP: return { x: 0, y: 1 };
        case Direction.DOWN: return { x: 0, y: -1 };
        case Direction.LEFT: return { x: 1, y: 0 };
        case Direction.RIGHT: return { x: -1, y: 0 };
      }
    };

    const isPassableForBody = (p: Position): boolean => {
      if (p.x < 0 || p.x >= level.width || p.y < 0 || p.y >= level.height) return false;
      const key = `${p.x},${p.y}`;
      if (visited.has(key)) return false;
      const isWall = level.walls.some(w => w.x === p.x && w.y === p.y);
      const isGate = level.gates.some(g => g.x === p.x && g.y === p.y);
      const isExit = level.exit.x === p.x && level.exit.y === p.y;
      return !isWall && !isGate && !isExit;
    };

    let current = level.startPos;
    let preferredOffset = getOppositeOffset(level.startDir);

    for (let i = 1; i < level.startLength; i++) {
      let nextPos = { x: current.x + preferredOffset.x, y: current.y + preferredOffset.y };

      if (!isPassableForBody(nextPos)) {
        const directions = [
          { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];
        let found = false;
        for (const d of directions) {
          const candidate = { x: current.x + d.x, y: current.y + d.y };
          if (isPassableForBody(candidate)) {
            nextPos = candidate;
            preferredOffset = d;
            found = true;
            break;
          }
        }
        if (!found) break;
      }

      snakeList.push(nextPos);
      visited.add(`${nextPos.x},${nextPos.y}`);
      current = nextPos;
    }

    return snakeList;
  };

  const getDirectionOffset = (dir: Direction): Position => {
    switch (dir) {
      case Direction.UP: return { x: 0, y: -1 };
      case Direction.DOWN: return { x: 0, y: 1 };
      case Direction.LEFT: return { x: -1, y: 0 };
      case Direction.RIGHT: return { x: 1, y: 0 };
    }
  };

  // Particles effects
  const createSliceParticles = (tailPos: Position) => {
    const colors = ['#f59e0b', '#fbbf24', '#f97316', '#ffffff'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.0;
      particlesRef.current.push({
        x: tailPos.x + 0.5,
        y: tailPos.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 3,
        alpha: 1.0,
        life: 0,
        maxLife: 25 + Math.random() * 15
      });
    }
  };

  const createDeathParticles = (pos: Position) => {
    const colors = ['#f43f5e', '#fda4af', '#e11d48', '#ffffff'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.0;
      particlesRef.current.push({
        x: pos.x + 0.5,
        y: pos.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        alpha: 1.0,
        life: 0,
        maxLife: 35 + Math.random() * 20
      });
    }
  };

  const createPortalParticles = (pos: Position) => {
    if (Math.random() > 0.4) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.2 + Math.random() * 0.6;
    particlesRef.current.push({
      x: pos.x + 0.5, 
      y: pos.y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: '#06b6d4',
      size: 1 + Math.random() * 2,
      alpha: 0.7,
      life: 0,
      maxLife: 40 + Math.random() * 15
    });
  };

  const createSuccessFireworks = (exitPos: Position) => {
    const rainbowColors = ['#06b6d4', '#10b981', '#fbbf24', '#f43f5e', '#a855f7', '#60a5fa'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x: exitPos.x + 0.5,
        y: exitPos.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rainbowColors[Math.floor(Math.random() * rainbowColors.length)],
        size: 2 + Math.random() * 3.5,
        alpha: 1.0,
        life: 0,
        maxLife: 35 + Math.random() * 20
      });
    }
  };

  const addFloatingText = (gridX: number, gridY: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      x: gridX + 0.5,
      y: gridY,
      text,
      color,
      life: 35
    });
  };

  // Movement & Game ticks
  const makeGameStep = (forcedDir?: Direction) => {
    if (isGameOver || isLevelCompleted) return;

    const currentDir = forcedDir || nextDirection;
    setDirection(currentDir);

    const offset = getDirectionOffset(currentDir);
    const nextHead: Position = {
      x: snake[0].x + offset.x,
      y: snake[0].y + offset.y
    };

    // 1. Check outer boundary bounds
    if (nextHead.x < 0 || nextHead.x >= activeLevel.width || nextHead.y < 0 || nextHead.y >= activeLevel.height) {
      handleSnakeDeath(snake[0], "Crashed into the grid protective boundary!");
      return;
    }

    // Warp Portals Traversal
    const matchedPortal = activeLevel.portals?.find(p => p.x === nextHead.x && p.y === nextHead.y);
    if (matchedPortal) {
      nextHead.x = matchedPortal.targetX;
      nextHead.y = matchedPortal.targetY;
      audioSystem.playWarp();
      triggerScreenShake('subtle');
      addFloatingText(matchedPortal.x, matchedPortal.y, "WARP IN", matchedPortal.color);
      addFloatingText(matchedPortal.targetX, matchedPortal.targetY, "WARP OUT", matchedPortal.color);
      
      // Spawn warp streamer particles on both sides!
      const colors = [matchedPortal.color, '#ffffff'];
      for (let i = 0; i < 15; i++) {
        const phi = Math.random() * Math.PI * 2;
        const spd = 0.5 + Math.random() * 2.0;
        particlesRef.current.push({
          x: matchedPortal.x + 0.5,
          y: matchedPortal.y + 0.5,
          vx: Math.cos(phi) * spd,
          vy: Math.sin(phi) * spd,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1 + Math.random() * 2,
          alpha: 1.0,
          life: 0,
          maxLife: 25 + Math.random() * 10
        });
        particlesRef.current.push({
          x: matchedPortal.targetX + 0.5,
          y: matchedPortal.targetY + 0.5,
          vx: Math.cos(phi) * spd,
          vy: Math.sin(phi) * spd,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1 + Math.random() * 2,
          alpha: 1.0,
          life: 0,
          maxLife: 25 + Math.random() * 10
        });
      }
    }

    // 2. Check solid walls
    const hitsWall = activeLevel.walls.some(w => w.x === nextHead.x && w.y === nextHead.y);
    if (hitsWall) {
      audioSystem.playGateBlocked();
      addFloatingText(nextHead.x, nextHead.y, 'WALL BLOCKED', '#ef4444');
      return;
    }

    // 3. Check access restriction gates size limits
    const gateIndex = activeLevel.gates.findIndex(g => g.x === nextHead.x && g.y === nextHead.y);
    if (gateIndex !== -1) {
      const g = activeLevel.gates[gateIndex];
      if (snake.length > g.maxLength) {
        audioSystem.playGateBlocked();
        setAlertText(`GATE LOCKED: Your length (${snake.length}) exceeds the gate clearance limit (Max: ${g.maxLength}). Use orange cutters to shrink!`);
        addFloatingText(nextHead.x, nextHead.y, `Need ≤ ${g.maxLength}`, '#ef4444');
        return;
      } else {
        if (snake.length === g.maxLength) {
          audioSystem.playBonus();
          triggerScreenShake('subtle');
          addFloatingText(nextHead.x, nextHead.y, 'PERFECT SQUEEZE +500!', '#fbbf24');
          setLevelEarnedScore(prev => prev + 500);
          setSessionScore(prev => prev + 500);
          setPerfectSqueezes(prev => prev + 1);

          // Star sparks animation
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.0 + Math.random() * 2.5;
            particlesRef.current.push({
              x: nextHead.x + 0.5,
              y: nextHead.y + 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: '#fbbf24',
              size: 2 + Math.random() * 2,
              alpha: 1.0,
              life: 0,
              maxLife: 30 + Math.random() * 15
            });
          }
        } else {
          audioSystem.playGatePass();
          addFloatingText(nextHead.x, nextHead.y, 'APPROVED', '#10b981');
        }
      }
    }

    // 4. Snake body self-curling biting
    const hitsSelf = snake.some((segment, index) => {
      if (index === 0) return false;
      return segment.x === nextHead.x && segment.y === nextHead.y;
    });

    if (hitsSelf) {
      handleSnakeDeath(nextHead, "Core overload: Bites itself!");
      return;
    }

    // 5. Fire spikes / static trap collision
    const hitsStaticTrap = traps.some(t => t.isActive && t.x === nextHead.x && t.y === nextHead.y);
    if (hitsStaticTrap) {
      handleSnakeDeath(nextHead, "Disintegrated on fiery security traps!");
      return;
    }

    // Valid slither step! Update position queues
    const previousSnakeCopy = [...snake];
    setPrevSnake(previousSnakeCopy);
    setAlertText(null);

    let updatedSnake = [nextHead, ...snake.slice(0, snake.length - 1)];

    // 6. Orange Cutter collisions (shed tail length)
    const cutterIdx = cutters.findIndex(c => !c.collected && c.x === nextHead.x && c.y === nextHead.y);
    if (cutterIdx !== -1) {
      const activeCutter = cutters[cutterIdx];
      const newCutters = [...cutters];
      newCutters[cutterIdx] = { ...activeCutter, collected: true };
      setCutters(newCutters);

      const cutAmt = activeCutter.amount;
      const originalLen = updatedSnake.length;
      const targetLen = Math.max(2, originalLen - cutAmt);
      const removedCount = originalLen - targetLen;
      const slicedTailSegment = updatedSnake[updatedSnake.length - 1];

      updatedSnake = updatedSnake.slice(0, targetLen);

      audioSystem.playSlice();
      createSliceParticles(slicedTailSegment);
      addFloatingText(nextHead.x, nextHead.y - 0.5, `Shrunk -${removedCount}`, '#f59e0b');
    }

    // 7. Success Portal Arrival
    const isAtExit = activeLevel.exit.x === nextHead.x && activeLevel.exit.y === nextHead.y;
    if (isAtExit) {
      setSnake(updatedSnake);
      handleLevelVictory(updatedSnake.length);
      return;
    }

    audioSystem.playSlither();

    // 8. Progress lasers and patrolling spikes
    const updatedTraps = traps.map(trap => {
      if (trap.type === 'moving' && trap.range && trap.range.length > 1) {
        let pIdx = trap.patrolIndex ?? 0;
        let pDir = trap.direction ?? 1;

        pIdx += pDir;
        if (pIdx >= trap.range.length) {
          pIdx = trap.range.length - 2;
          pDir = -1;
        } else if (pIdx < 0) {
          pIdx = 1;
          pDir = 1;
        }

        const newPos = trap.range[pIdx];
        return {
          ...trap,
          x: newPos.x,
          y: newPos.y,
          patrolIndex: pIdx,
          direction: pDir
        };
      }
      
      if (trap.type === 'static' && trap.isActive !== undefined) {
        const intervalMod = (moves + 1) % 4;
        let stateActive = intervalMod < 2;
        if (difficulty === 'easy') {
          stateActive = intervalMod < 1; // 25% active steps
        } else if (difficulty === 'hard') {
          stateActive = intervalMod < 3; // 75% active steps
        }
        return {
          ...trap,
          isActive: stateActive
        };
      }

      return trap;
    });

    // Check newly stepped trap collisions
    const trapConflict = updatedTraps.some(trap => {
      if (!trap.isActive && trap.type === 'static') return false;
      if (trap.x === nextHead.x && trap.y === nextHead.y) return true;
      return updatedSnake.some(seg => seg.x === trap.x && seg.y === trap.y);
    });

    if (trapConflict) {
      setSnake(updatedSnake);
      setTraps(updatedTraps);
      handleSnakeDeath(nextHead, "Hit by a shifting laser patrol!");
      return;
    }

    // Speed combo multiplier system for Time Attack
    if (isTimeChallenge) {
      const now = performance.now();
      const delta = now - lastStepTimeRef.current;
      if (delta < 385) {
        setTimeMultiplier(m => Math.min(3.0, Number((m + 0.1).toFixed(1))));
      } else if (delta > 600) {
        setTimeMultiplier(m => Math.max(1.0, Number((m - 0.2).toFixed(1))));
      }
    }

    setSnake(updatedSnake);
    setTraps(updatedTraps);
    setMoves(prev => prev + 1);
    lastStepTimeRef.current = performance.now();
  };

  const handleSnakeDeath = (pos: Position, message: string) => {
    audioSystem.playFail();
    triggerScreenShake('intense');
    createDeathParticles(pos);
    setAlertText(message);
    setTotalLevelDeaths(d => d + 1);
    setIsGameOver(true);
    setIsPlaying(false);
  };

  const handleLevelVictory = (finalLen: number) => {
    audioSystem.playWin();
    setIsPlaying(false);
    triggerScreenShake('subtle');

    // Compute Level Score: 
    // Completed level points: level index * 1000
    // Shorter path bonus: up to 500 bonus points for taking fewer steps than par moves
    // Death avoidance bonus: up to 500 points for no deaths
    const levelBase = activeLevel.id * 1000;
    const parBonus = Math.max(0, (activeLevel.parMoves - moves) * 50);
    const deathPenalty = Math.max(0, 500 - totalLevelDeaths * 150);
    
    // Custom gameplay feature awards
    const perfectGateBonus = perfectSqueezes * 500;
    const isMinCoreExit = finalLen === 2;
    const minCoreBonus = isMinCoreExit ? 1000 : 0;
    const timeAttackBonus = isTimeChallenge ? Math.floor(timeRemaining * 85 * timeMultiplier) : 0;

    const computedScore = levelBase + parBonus + deathPenalty + perfectGateBonus + minCoreBonus + timeAttackBonus;
    
    // Daily Streak Multiplier Calculation & Persistence
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDateStr = localStorage.getItem('reverse_snake_last_streak_day') || '';
    let streakCount = parseInt(localStorage.getItem('reverse_snake_daily_streak') || '0', 10);
    
    let isStreakUpdated = false;

    if (!lastDateStr) {
      streakCount = 1;
      isStreakUpdated = true;
    } else if (lastDateStr === todayStr) {
      // Already completed a level today, streak is maintained but not advanced twice in one day
    } else {
      // Check if yesterday or older
      const lastDate = new Date(lastDateStr);
      const todayDate = new Date(todayStr);
      const lastDateUTC = Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const todayDateUTC = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
      const dayDifference = Math.floor((todayDateUTC - lastDateUTC) / (1000 * 60 * 60 * 24));

      if (dayDifference === 1) {
        streakCount += 1;
        isStreakUpdated = true;
      } else {
        // Streak broken (missed more than one day)
        streakCount = 1;
        isStreakUpdated = true;
      }
    }

    if (isStreakUpdated) {
      localStorage.setItem('reverse_snake_daily_streak', String(streakCount));
      localStorage.setItem('reverse_snake_last_streak_day', todayStr);
      setDailyStreak(streakCount);
    }

    const streakMultiplier = getStreakMultiplier(streakCount);
    const streakBonus = Math.round(computedScore * (streakMultiplier - 1));
    const finalEarnedScore = computedScore + streakBonus;

    setLevelEarnedScore(finalEarnedScore);
    setEarnedStreakBonus(streakBonus);
    setEarnedStreakCount(streakCount);
    
    // Add to cumulative session score
    setSessionScore(prev => prev + finalEarnedScore);

    const exitPos = activeLevel.exit;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        createSuccessFireworks(exitPos);
      }, i * 200);
    }

    setIsLevelCompleted(true);

    if (isDailyChallenge) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('reverse_snake_daily_challenge_' + todayStr, 'completed');
      setDailyCompleted(true);
      const currentBest = localStorage.getItem('reverse_snake_daily_challenge_best_' + todayStr);
      if (!currentBest || moves < parseInt(currentBest, 10)) {
        localStorage.setItem('reverse_snake_daily_challenge_best_' + todayStr, String(moves));
        setDailyBestMoves(moves);
      }
    } else {
      // Save standard level completed state
      localStorage.setItem('reverse_snake_level_completed_' + currentLevelIdx, 'completed');
      setCompletedLevels(prev => {
        const next = [...prev];
        next[currentLevelIdx] = true;
        return next;
      });

      if (currentLevelIdx === LEVELS.length - 1) {
        setIsGameBeaten(true);
      }
    }
  };

  // Submit high score
  const handleScoreSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = userName.trim();
    if (cleanName.length < 2) {
      setAlertText("Please enter a nickname that is at least 2 characters long.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Send the score to storage database
      const todayStr = new Date().toISOString().split('T')[0];
      const todayInt = parseInt(todayStr.replace(/-/g, ''), 10);
      const finalScore = isDailyChallenge ? (1000000 - moves * 100) : sessionScore;
      const finalLevel = isDailyChallenge ? todayInt : activeLevel.id;
      
      await submitScore(cleanName, finalScore, finalLevel, moves);

      if (isDailyChallenge) {
        localStorage.setItem('reverse_snake_daily_challenge_' + todayStr, 'completed');
        setDailyCompleted(true);
        const currentBest = localStorage.getItem('reverse_snake_daily_challenge_best_' + todayStr);
        if (!currentBest || moves < parseInt(currentBest, 10)) {
          localStorage.setItem('reverse_snake_daily_challenge_best_' + todayStr, String(moves));
          setDailyBestMoves(moves);
        }
      }

      setHasSubmitted(true);
      setAlertText(null);
      // reload rankings list
      await fetchRankings();
      setActiveTab('leaderboard');
    } catch (err) {
      setAlertText("Could not submit score right now, we saved it locally!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Touch Swipes Recognition for mobile with dynamic continuous drag-steering
  // Touch handlers optimized for dynamic continuous drag-steering and ergonomic floating joystick
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    if (showDpadOverlay && dpadMode === 'floating' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      // Ensure the centered 144px D-pad remains cleanly inside the bounding box of the visual canvas-stage
      const radius = 64; // Safe margin clamping radius
      const clampedX = Math.max(radius, Math.min(rect.width - radius, tx));
      const clampedY = Math.max(radius, Math.min(rect.height - radius, ty));

      setFloatingCenter({ x: clampedX, y: clampedY });
      setFloatingKnob({ x: 0, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];

    // Ergonomic floating thumb tracking
    if (showDpadOverlay && dpadMode === 'floating' && floatingCenter && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      // Displacement relative to the dynamic spawned center coordinates
      const dx = tx - floatingCenter.x;
      const dy = ty - floatingCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Limit knob physical visual drag offset inside Dpad circle
      const maxKnobDistance = 28;
      let knobX = dx;
      let knobY = dy;
      if (distance > maxKnobDistance) {
        knobX = (dx / distance) * maxKnobDistance;
        knobY = (dy / distance) * maxKnobDistance;
      }
      setFloatingKnob({ x: knobX, y: knobY });

      // Highly active 16px activation trigger for ergonomic responsiveness
      if (distance > 16) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        let swipeDir: Direction | null = null;
        if (absDx > absDy) {
          swipeDir = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
          swipeDir = dy > 0 ? Direction.DOWN : Direction.UP;
        }

        if (swipeDir) {
          handleOnScreenDirection(swipeDir);
          // Gently shift touchStartRef to allow continuous fluid snaking loops
          const angle = Math.atan2(dy, dx);
          touchStartRef.current = {
            x: touch.clientX - Math.cos(angle) * 12,
            y: touch.clientY - Math.sin(angle) * 12
          };
        }
      }
      return; 
    }

    // Fallback standard continuous touch swipe steering
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Highly responsive 18px swipe threshold for instant turn reaction
    if (Math.max(absDx, absDy) > 18) {
      let swipeDir: Direction | null = null;
      if (absDx > absDy) {
        swipeDir = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        swipeDir = dy > 0 ? Direction.DOWN : Direction.UP;
      }
      
      if (swipeDir) {
        handleOnScreenDirection(swipeDir);
        // Anchor reference point to current coordinates so players can snake continuously in physical drag-steer curves
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (showDpadOverlay && dpadMode === 'floating') {
      setFloatingKnob({ x: 0, y: 0 });
      setFloatingCenter(null);
    }
    touchStartRef.current = null;
  };

  // Reusable D-Pad panel optimized for tactile touchscreen tap feedback
  const renderDPad = (isMobile = false) => {
    return (
      <div 
        className={`${
          isMobile 
            ? 'flex lg:hidden flex-col items-center bg-slate-950/40 border border-slate-900 rounded-2xl p-4 shadow-xl select-none touch-none w-full' 
            : 'hidden lg:flex flex-col items-center w-full select-none touch-none'
        }`}
        id={isMobile ? "dpad_access_block_mobile" : "dpad_access_block_desktop"}
      >
        <h3 className="text-xs font-bold text-slate-400 tracking-wider font-display mb-3 w-full text-center border-b border-slate-900 pb-2 flex items-center justify-center gap-1.5 uppercase">
          <ShieldCheck size={13} className="text-cyan-400" /> DIRECTION D-PAD {isMobile ? "CONTROLS" : "Controls"}
        </h3>

        <div className="relative w-36 h-36 flex items-center justify-center bg-black border border-slate-950 rounded-full shadow-inner" id={`visual_keypad_pad_${isMobile ? 'mb' : 'dt'}`}>
          {/* Center Hub Indicator */}
          <div className="absolute w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-[9px] font-mono text-emerald-400 font-bold border border-slate-900 z-10 pointer-events-none">
            LEN {snake.length}
          </div>

          {/* UP arrowhead */}
          <button
            onClick={() => handleOnScreenDirection(Direction.UP)}
            disabled={isGameOver || isLevelCompleted}
            className="absolute top-1 w-11 h-11 bg-[#10101a] active:bg-cyan-500/35 active:text-cyan-400 rounded-xl flex items-center justify-center border border-slate-850 hover:text-white transition-all select-none touch-none"
            id={`btn_dpad_up_${isMobile ? 'mb' : 'dt'}`}
          >
            <ArrowUp size={18} />
          </button>

          {/* DOWN arrowhead */}
          <button
            onClick={() => handleOnScreenDirection(Direction.DOWN)}
            disabled={isGameOver || isLevelCompleted}
            className="absolute bottom-1 w-11 h-11 bg-[#10101a] active:bg-cyan-500/35 active:text-cyan-400 rounded-xl flex items-center justify-center border border-slate-850 hover:text-white transition-all select-none touch-none"
            id={`btn_dpad_down_${isMobile ? 'mb' : 'dt'}`}
          >
            <ArrowDown size={18} />
          </button>

          {/* LEFT arrowhead */}
          <button
            onClick={() => handleOnScreenDirection(Direction.LEFT)}
            disabled={isGameOver || isLevelCompleted}
            className="absolute left-1 w-11 h-11 bg-[#10101a] active:bg-cyan-500/35 active:text-cyan-400 rounded-xl flex items-center justify-center border border-slate-850 hover:text-white transition-all select-none touch-none"
            id={`btn_dpad_left_${isMobile ? 'mb' : 'dt'}`}
          >
            <ArrowLeft size={18} />
          </button>

          {/* RIGHT arrowhead */}
          <button
            onClick={() => handleOnScreenDirection(Direction.RIGHT)}
            disabled={isGameOver || isLevelCompleted}
            className="absolute right-1 w-11 h-11 bg-[#10101a] active:bg-cyan-500/35 active:text-cyan-400 rounded-xl flex items-center justify-center border border-slate-850 hover:text-white transition-all select-none touch-none"
            id={`btn_dpad_right_${isMobile ? 'mb' : 'dt'}`}
          >
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 leading-normal mt-3 bg-slate-955/20 px-2 py-1.5 rounded border border-slate-900/40 text-center font-mono w-full">
          💡 Swipe directly on the game board above to drag-steer, or tap these tactile arrows!
        </div>
      </div>
    );
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLevelCompleted && e.key === 'Enter') {
        e.preventDefault();
        loadNextLevel();
        return;
      }

      if (isGameOver && e.key === 'Enter') {
        e.preventDefault();
        initLevel(currentLevelIdx);
        return;
      }

      if (showHowToPlay || isLevelCompleted || isGameBeaten) return;

      let chosenDir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          chosenDir = Direction.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          chosenDir = Direction.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          chosenDir = Direction.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          chosenDir = Direction.RIGHT;
          break;
        case 'r':
        case 'R':
          initLevel(currentLevelIdx);
          return;
      }

      if (chosenDir) {
        e.preventDefault();
        
        // Prevent reversing back directly over preceding segment
        const offset = getDirectionOffset(chosenDir);
        const prospectiveHead = {
          x: snake[0].x + offset.x,
          y: snake[0].y + offset.y
        };
        const adjacentLock = snake.length > 1 && snake[1].x === prospectiveHead.x && snake[1].y === prospectiveHead.y;
        
        if (!adjacentLock) {
          setNextDirection(chosenDir);
          if (isStepMode) {
            makeGameStep(chosenDir);
          } else {
            if (!isPlaying && !isGameOver) {
              setIsPlaying(true);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snake, direction, isPlaying, isStepMode, currentLevelIdx, isGameOver, isLevelCompleted, isGameBeaten, showHowToPlay, loadNextLevel]);

  // Timed Loop for real-time play
  useEffect(() => {
    if (isStepMode || !isPlaying || isGameOver || isLevelCompleted || isGameBeaten) {
      return;
    }

    const timer = setInterval(() => {
      makeGameStep();
    }, tickRate);

    return () => clearInterval(timer);
  }, [snake, direction, nextDirection, isPlaying, isStepMode, isGameOver, tickRate, currentLevelIdx]);

  // Time Challenge Countdown Effect
  useEffect(() => {
    if (!isPlaying || !isTimeChallenge || isGameOver || isLevelCompleted || isGameBeaten) {
      return;
    }

    const clock = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(clock);
          handleSnakeDeath(snake[0] || activeLevel.startPos, "TIME EXPIRED: Quantum field decay! Core collapsed.");
          triggerScreenShake('intense');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(clock);
  }, [isPlaying, isTimeChallenge, isGameOver, isLevelCompleted, isGameBeaten, snake, activeLevel]);

  // Overall level gameplay timer (tracks seconds spent active in the current attempt)
  useEffect(() => {
    if (!isPlaying || isGameOver || isLevelCompleted || isGameBeaten || isTransitioningLevel) {
      return;
    }

    const timer = setInterval(() => {
      setTimeTakenForLevel(prev => prev + 0.1);
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying, isGameOver, isLevelCompleted, isGameBeaten, isTransitioningLevel]);

  // Find shortest path to nearest uncollected cutter or exit gate using BFS
  const findHintPath = (): Position[] | null => {
    if (!activeLevel || !snake || snake.length === 0) return null;
    const head = snake[0];
    if (!head) return null;

    // Nearest uncollected cutter
    const activeCutters = cutters.filter(c => !c.collected);
    let goal: Position;

    if (activeCutters.length > 0) {
      let closestCutter = activeCutters[0];
      let minDistance = Math.abs(head.x - closestCutter.x) + Math.abs(head.y - closestCutter.y);
      for (let i = 1; i < activeCutters.length; i++) {
        const c = activeCutters[i];
        const dist = Math.abs(head.x - c.x) + Math.abs(head.y - c.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestCutter = c;
        }
      }
      goal = { x: closestCutter.x, y: closestCutter.y };
    } else {
      goal = { x: activeLevel.exit.x, y: activeLevel.exit.y };
    }

    // BFS setup
    const queue: Position[][] = [[head]];
    const visited = new Set<string>();
    visited.add(`${head.x},${head.y}`);

    const w = activeLevel.width;
    const h = activeLevel.height;

    // Structural block sets
    const wallSet = new Set<string>(activeLevel.walls.map(wall => `${wall.x},${wall.y}`));
    const snakeBodySet = new Set<string>(snake.slice(1).map(seg => `${seg.x},${seg.y}`));

    const blockedGateSet = new Set<string>();
    activeLevel.gates.forEach(g => {
      if (snake.length > g.maxLength) {
        blockedGateSet.add(`${g.x},${g.y}`);
      }
    });

    // Portals lookup maps
    const portalMap = new Map<string, Position>();
    if (activeLevel.portals) {
      activeLevel.portals.forEach(p => {
        portalMap.set(`${p.x},${p.y}`, { x: p.targetX, y: p.targetY });
      });
    }

    const maxSteps = 2500;
    let steps = 0;

    // First BFS run (full compliance, respects snake body)
    while (queue.length > 0 && steps++ < maxSteps) {
      const currentPath = queue.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode.x === goal.x && lastNode.y === goal.y) {
        return currentPath;
      }

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (const d of directions) {
        let nx = lastNode.x + d.dx;
        let ny = lastNode.y + d.dy;

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
          continue;
        }

        const portalKey = `${nx},${ny}`;
        if (portalMap.has(portalKey)) {
          const target = portalMap.get(portalKey)!;
          nx = target.x;
          ny = target.y;
        }

        const nextKey = `${nx},${ny}`;

        if (
          wallSet.has(nextKey) ||
          blockedGateSet.has(nextKey) ||
          snakeBodySet.has(nextKey)
        ) {
          continue;
        }

        if (visited.has(nextKey)) {
          continue;
        }

        visited.add(nextKey);
        queue.push([...currentPath, { x: nx, y: ny }]);
      }
    }

    // Fallback BFS run (ignores snake body, useful if tangled or blocked)
    const queueFallback: Position[][] = [[head]];
    const visitedFallback = new Set<string>();
    visitedFallback.add(`${head.x},${head.y}`);
    steps = 0;

    while (queueFallback.length > 0 && steps++ < maxSteps) {
      const currentPath = queueFallback.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode.x === goal.x && lastNode.y === goal.y) {
        return currentPath;
      }

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (const d of directions) {
        let nx = lastNode.x + d.dx;
        let ny = lastNode.y + d.dy;

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
          continue;
        }

        const portalKey = `${nx},${ny}`;
        if (portalMap.has(portalKey)) {
          const target = portalMap.get(portalKey)!;
          nx = target.x;
          ny = target.y;
        }

        const nextKey = `${nx},${ny}`;

        if (wallSet.has(nextKey) || blockedGateSet.has(nextKey)) {
          continue;
        }

        if (visitedFallback.has(nextKey)) {
          continue;
        }

        visitedFallback.add(nextKey);
        queueFallback.push([...currentPath, { x: nx, y: ny }]);
      }
    }

    return null;
  };

  const triggerHint = () => {
    if (hasUsedHint || isGameOver || isLevelCompleted || isGameBeaten) return;
    setIsHintActive(true);
    setHasUsedHint(true);
    audioSystem.playClick();
    setAlertText("GPS SECTOR SCAN COMPLETE: HINT PATHWAY EMITTED FOR 3 SECONDS!");

    setTimeout(() => {
      setIsHintActive(false);
    }, 3000);
  };

  // On-screen arrows and swipe handlers
  const handleOnScreenDirection = (dir: Direction) => {
    const offset = getDirectionOffset(dir);
    const prospectiveHead = {
      x: snake[0].x + offset.x,
      y: snake[0].y + offset.y
    };
    const adjacentLock = snake.length > 1 && snake[1].x === prospectiveHead.x && snake[1].y === prospectiveHead.y;
    
    if (!adjacentLock) {
      setNextDirection(dir);
      if (isStepMode) {
        makeGameStep(dir);
      } else {
        if (!isPlaying && !isGameOver) {
          setIsPlaying(true);
        }
      }
    }
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      // 1. Core Background
      ctx.fillStyle = '#05050a'; 
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      const levelWidth = activeLevel.width;
      const levelHeight = activeLevel.height;

      const cellW = canvasSize.width / levelWidth;
      const cellH = canvasSize.height / levelHeight;
      const cellSize = Math.min(cellW, cellH);

      const offsetX = (canvasSize.width - levelWidth * cellSize) / 2;
      const offsetY = (canvasSize.height - levelHeight * cellSize) / 2;

      // Draw neat grid lines
      ctx.strokeStyle = '#111122'; 
      ctx.lineWidth = 1;
      for (let x = 0; x <= levelWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * cellSize, offsetY);
        ctx.lineTo(offsetX + x * cellSize, offsetY + levelHeight * cellSize);
        ctx.stroke();
      }
      for (let y = 0; y <= levelHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * cellSize);
        ctx.lineTo(offsetX + levelWidth * cellSize, offsetY + y * cellSize);
        ctx.stroke();
      }

      // Draw Faint Overlay Hint Path if hint is active
      if (isHintActive) {
        const path = findHintPath();
        if (path && path.length > 1) {
          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)'; // elegant glowing violet/purple path
          ctx.lineWidth = 5;
          ctx.setLineDash([8, 6]);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 10;

          ctx.beginPath();
          const startX = offsetX + (path[0].x + 0.5) * cellSize;
          const startY = offsetY + (path[0].y + 0.5) * cellSize;
          ctx.moveTo(startX, startY);

          for (let i = 1; i < path.length; i++) {
            const px = offsetX + (path[i].x + 0.5) * cellSize;
            const py = offsetY + (path[i].y + 0.5) * cellSize;
            
            // Handle portal jump: do not connect a line across the board
            const prev = path[i - 1];
            if (Math.abs(path[i].x - prev.x) > 1 || Math.abs(path[i].y - prev.y) > 1) {
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
          
          // Draw pulsing step rings along the path
          path.forEach((pos, idx) => {
            if (idx === 0) return; // skip head
            const cx = offsetX + (pos.x + 0.5) * cellSize;
            const cy = offsetY + (pos.y + 0.5) * cellSize;
            
            // Faint outer pulse rings
            ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#c084fc'; // Light purple core
            ctx.beginPath();
            ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
        }
      }

      // Draw a highly visible glowing outer board boundary (Arena protective shield wall)
      ctx.strokeStyle = '#f43f5e'; // Bright sunset rose / red
      ctx.lineWidth = 3.0;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 6;
      ctx.strokeRect(offsetX, offsetY, levelWidth * cellSize, levelHeight * cellSize);
      
      // Reset shadow blur
      ctx.shadowBlur = 0;

      // Inner crisp neon light secondary grid line for high luxury tech vibe
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(offsetX + 1, offsetY + 1, levelWidth * cellSize - 2, levelHeight * cellSize - 2);

      createPortalParticles(activeLevel.exit);

      // Draw Blocks / solid walls with clear, high-contrast hazard warning style
      activeLevel.walls.forEach(wall => {
        const wx = offsetX + wall.x * cellSize;
        const wy = offsetY + wall.y * cellSize;

        // Core block fill (futuristic dark vulcanite slate)
        ctx.fillStyle = '#090e17'; 
        ctx.fillRect(wx + 2, wy + 2, cellSize - 4, cellSize - 4);
        
        // Rich high-contrast glowing neon orange border
        ctx.strokeStyle = '#f97316'; // Warning Orange / Amber
        ctx.lineWidth = 2.0;
        ctx.strokeRect(wx + 2.5, wy + 2.5, cellSize - 5, cellSize - 5);

        // Tactile industrial warning cross in the center
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx + 6, wy + 6);
        ctx.lineTo(wx + cellSize - 6, wy + cellSize - 6);
        ctx.moveTo(wx + cellSize - 6, wy + 6);
        ctx.lineTo(wx + 6, wy + cellSize - 6);
        ctx.stroke();
      });

      // Draw Cutters (Saws)
      cutters.forEach(c => {
        if (c.collected) return;

        const cx = offsetX + (c.x + 0.5) * cellSize;
        const cy = offsetY + (c.y + 0.5) * cellSize;
        const radius = cellSize * 0.4;
        const rotationAngle = (performance.now() / 130) % (Math.PI * 2);

        // Ambient cutter halo
        const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.3);
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
        glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Mechanical saw
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotationAngle);

        ctx.strokeStyle = '#f59e0b'; // Amber-500
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const teethCount = 8;
        for (let i = 0; i < teethCount * 2; i++) {
          const angle = (i / teethCount) * Math.PI;
          const dist = i % 2 === 0 ? radius : radius * 0.6;
          ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b'; 
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Inner shrink amount indicator Text
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.max(11, cellSize * 0.32)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`-${c.amount}`, cx, cy);
      });

      // Draw Access restriction gates
      activeLevel.gates.forEach(g => {
        const gx = offsetX + g.x * cellSize;
        const gy = offsetY + g.y * cellSize;
        const canSqueeze = snake.length <= g.maxLength;

        ctx.fillStyle = '#020617';
        ctx.fillRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4);

        // Security outline
        ctx.strokeStyle = canSqueeze ? '#10b981' : '#f43f5e'; 
        ctx.lineWidth = 2;
        ctx.strokeRect(gx + 3, gy + 3, cellSize - 6, cellSize - 6);

        // Background guard tint
        ctx.fillStyle = canSqueeze ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.14)';
        ctx.fillRect(gx + 4, gy + 4, cellSize - 8, cellSize - 8);

        ctx.fillStyle = canSqueeze ? '#34d399' : '#fca5a5';
        ctx.font = `bold ${Math.max(10, cellSize * 0.28)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`≤${g.maxLength}`, gx + cellSize / 2, gy + cellSize / 2 - 2);
      });

      // Draw Hazards (traps, lasers)
      traps.forEach(t => {
        const tx = offsetX + t.x * cellSize;
        const ty = offsetY + t.y * cellSize;

        if (t.type === 'static') {
          const activeSpike = t.isActive ?? true;

          ctx.fillStyle = '#0f0514';
          ctx.fillRect(tx + 4, ty + 4, cellSize - 8, cellSize - 8);

          ctx.strokeStyle = activeSpike ? '#ff0055' : '#334155'; 
          ctx.fillStyle = activeSpike ? 'rgba(255, 0, 85, 0.2)' : 'rgba(51, 65, 85, 0.05)';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(tx + cellSize * 0.25, ty + cellSize * 0.75);
          ctx.lineTo(tx + cellSize * 0.5, ty + cellSize * 0.2);
          ctx.lineTo(tx + cellSize * 0.75, ty + cellSize * 0.75);
          ctx.stroke();
          ctx.fill();

        } else if (t.type === 'moving') {
          // Guided path wire
          if (t.range && t.range.length > 0) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.08)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            t.range.forEach((node, idx) => {
              const nx = offsetX + (node.x + 0.5) * cellSize;
              const ny = offsetY + (node.y + 0.5) * cellSize;
              if (idx === 0) ctx.moveTo(nx, ny);
              else ctx.lineTo(nx, ny);
            });
            ctx.stroke();
            ctx.setLineDash([]); 
          }

          // Flying laser node orb
          const dcx = offsetX + (t.x + 0.5) * cellSize;
          const dcy = offsetY + (t.y + 0.5) * cellSize;
          const dRad = cellSize * 0.35;

          ctx.fillStyle = '#2d060e';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dcx, dcy, dRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(dcx, dcy, dRad * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Warp Portals
      activeLevel.portals?.forEach(p => {
        const px = offsetX + (p.x + 0.5) * cellSize;
        const py = offsetY + (p.y + 0.5) * cellSize;
        const radius = cellSize * 0.4;
        const spin = performance.now() / 320;

        // Outer cosmic aura field
        const grad = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius * 1.5);
        grad.addColorStop(0, p.color + '40'); // 25% opacity
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Dual swirling orbits bounds
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(spin);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 1.1, true);
        ctx.stroke();
        ctx.restore();

        // Portal center core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      // Exit Vortex
      const ex = offsetX + (activeLevel.exit.x + 0.5) * cellSize;
      const ey = offsetY + (activeLevel.exit.y + 0.5) * cellSize;
      const spinAngle = performance.now() / 220;
      const exitRad = cellSize * 0.44;

      const portalGlow = ctx.createRadialGradient(ex, ey, 3, ex, ey, exitRad * 1.5);
      portalGlow.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      portalGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = portalGlow;
      ctx.beginPath();
      ctx.arc(ex, ey, exitRad * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(spinAngle);
      ctx.strokeStyle = '#06b6d4'; 
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, exitRad, 0, Math.PI * 1.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, exitRad * 0.6, 0, Math.PI * 1.1, true);
      ctx.stroke();
      ctx.restore();

      // Smooth snake body drawing
      if (snake.length > 0) {
        let t = 1.0;
        if (!isStepMode && isPlaying && !isGameOver && !isLevelCompleted) {
          const now = performance.now();
          t = (now - lastStepTimeRef.current) / tickRate;
          t = Math.min(1.0, Math.max(0.0, t)); 
        }

        const stepPositions: Position[] = [];
        for (let i = 0; i < snake.length; i++) {
          const currentSeg = snake[i];
          const prevSeg = prevSnake[i] || currentSeg;
          const interpX = prevSeg.x + (currentSeg.x - prevSeg.x) * t;
          const interpY = prevSeg.y + (currentSeg.y - prevSeg.y) * t;
          stepPositions.push({ x: interpX, y: interpY });
        }

        const activeSkin = SKINS.find(s => s.id === selectedSkinId) || SKINS[0];

        // Draw joints from tail to head
        for (let i = snake.length - 1; i >= 0; i--) {
          const pos = stepPositions[i];
          const isHead = i === 0;
          const scale = 1.0 - (i / snake.length) * 0.4;
          const rad = (cellSize * 0.36) * scale;
          const segX = offsetX + (pos.x + 0.5) * cellSize;
          const segY = offsetY + (pos.y + 0.5) * cellSize;

          // Compute customized colors based on Skin Choice
          let hColor = activeSkin.headColor;
          let hGlow = activeSkin.headGlow;
          let bColor = activeSkin.bodyColor;
          let bOutline = activeSkin.bodyOutline;
          let lColor = activeSkin.linkColor;
          let eColor = activeSkin.eyeColor;

          if (activeSkin.id === 'rainbow') {
            const hz = performance.now() / 400;
            const hue = (hz * 12 + (i / snake.length) * 360) % 360;
            hColor = `hsl(${hue}, 95%, 60%)`;
            hGlow = `hsla(${hue}, 95%, 60%, 0.55)`;
            bColor = `hsl(${hue}, 85%, 45%)`;
            bOutline = `hsl(${hue}, 90%, 65%)`;
            lColor = `hsl(${hue}, 80%, 35%)`;
            eColor = '#ffffff';
          }

          if (isHead) {
            // Head neon aura
            const gradientGlow = ctx.createRadialGradient(segX, segY, 1, segX, segY, rad * 1.6);
            gradientGlow.addColorStop(0, hGlow);
            gradientGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradientGlow;
            ctx.beginPath();
            ctx.arc(segX, segY, rad * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Head core
            ctx.fillStyle = hColor; 
            ctx.strokeStyle = bOutline;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(segX, segY, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Beady tracking eyes
            ctx.fillStyle = eColor;
            ctx.beginPath();
            ctx.arc(segX - 2.5, segY - 2.5, 2, 0, Math.PI * 2);
            ctx.arc(segX + 2.5, segY - 2.5, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Body beads
            ctx.fillStyle = bColor; 
            ctx.strokeStyle = bOutline;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(segX, segY, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          // Link segments
          if (i < snake.length - 1) {
            const nextPos = stepPositions[i + 1];
            const nextSegX = offsetX + (nextPos.x + 0.5) * cellSize;
            const nextSegY = offsetY + (nextPos.y + 0.5) * cellSize;

            ctx.strokeStyle = lColor;
            ctx.lineWidth = rad * 0.6;
            ctx.beginPath();
            ctx.moveTo(segX, segY);
            ctx.lineTo(nextSegX, nextSegY);
            ctx.stroke();
          }
        }
      }

      // Draw active particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx * 0.08;
        p.y += p.vy * 0.08;
        p.alpha = 1.0 - (p.life / p.maxLife);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(offsetX + p.x * cellSize, offsetY + p.y * cellSize, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1.0; 

      // Draw floating tags
      const textRecords = floatingTextsRef.current;
      for (let i = textRecords.length - 1; i >= 0; i--) {
        const ft = textRecords[i];
        ft.life--;
        ft.y -= 0.015;

        ctx.fillStyle = ft.color;
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, offsetX + ft.x * cellSize, offsetY + ft.y * cellSize);

        if (ft.life <= 0) {
          textRecords.splice(i, 1);
        }
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [snake, prevSnake, direction, cutters, traps, canvasSize, activeLevel, isPlaying, isStepMode, isGameOver, tickRate]);

  const getStarsCount = (): number => {
    if (!isLevelCompleted) return 0;
    let stars = 1;
    if (moves <= activeLevel.parMoves) stars += 1;
    if (totalLevelDeaths === 0) stars += 1;
    return stars;
  };

  const getThreatStatus = () => {
    if (!activeLevel || !snake || snake.length === 0) {
      return { level: 'SAFE', message: 'SYSTEM ONLINE', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/20 shadow-cyan-500/5' };
    }
    const head = snake[0];
    if (!head) {
      return { level: 'SAFE', message: 'SYSTEM ONLINE', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/20 shadow-cyan-500/5' };
    }

    // Check distance to traps/lasers
    let minTrapDist = 999;
    traps.forEach(t => {
      const dist = Math.abs(head.x - t.x) + Math.abs(head.y - t.y);
      if (dist < minTrapDist) {
        minTrapDist = dist;
      }
    });

    // Check distance to boundary walls
    const w = activeLevel.width;
    const h = activeLevel.height;
    const wallDistX = Math.min(head.x, w - 1 - head.x);
    const wallDistY = Math.min(head.y, h - 1 - head.y);
    const minWallDist = Math.min(wallDistX, wallDistY);

    // Check gate locked/blocked proximity
    let nearBlockedGate = false;
    let gateLimit = 0;
    activeLevel.gates.forEach(g => {
      const dist = Math.abs(head.x - g.x) + Math.abs(head.y - g.y);
      if (dist <= 1 && snake.length > g.maxLength) {
        nearBlockedGate = true;
        gateLimit = g.maxLength;
      }
    });

    if (minTrapDist <= 1) {
      return {
        level: 'CRITICAL',
        message: '🔥 RED ZONE RESTRICTED: IMMINENT PATROL ENVELOPE COLLISION!',
        color: 'text-rose-400 bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
      };
    }
    
    if (nearBlockedGate) {
      return {
        level: 'BARRIER ALERT',
        message: `🚫 GATE OVERFLOW: SHAVE TAIL TO ≤${gateLimit} SEGMENTS TO SECURE COMPLIANCE PASSAGE!`,
        color: 'text-amber-500 bg-amber-950/30 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] bg-[#0d0702]'
      };
    }

    if (minTrapDist <= 2) {
      return {
        level: 'DANGER WARNING',
        message: '⚠️ HAZARD ALERT: DEPLOYED SECURE EMITTER DETECTED IN PROXIMITY',
        color: 'text-yellow-400 bg-yellow-950/25 border-yellow-500/35 shadow-[0_0_12px_rgba(234,179,8,0.1)]'
      };
    }

    if (minWallDist === 0) {
      return {
        level: 'PERMISSIVE EDGE',
        message: '🚧 ARENA PERIPHERAL SHIELD WALL IN CONTACT',
        color: 'text-teal-400 bg-teal-950/15 border-teal-500/25'
      };
    }

    return {
      level: 'SAFE INTRUSION',
      message: '🛡️ RESTRICTED AREA SCANNER: ENVELOPE ISOLATION STABLE',
      color: 'text-emerald-400 bg-emerald-950/10 border-emerald-500/20'
    };
  };

  function getEfficiencyRating() {
    if (!activeLevel) {
      return { medal: 'No Rating', description: '', color: 'text-slate-400', ring: 'border-slate-800 bg-slate-950/40', icon: '🥉' };
    }
    const par = activeLevel.parMoves;
    if (moves < par) {
      return {
        medal: 'DIAMOND EFFICIENCY (S S S)',
        description: 'Spectacular bypass! Completed the sector matrix faster than target projection guidelines!',
        color: 'text-cyan-400 font-extrabold tracking-widest',
        ring: 'border-cyan-400/55 shadow-[0_0_20px_rgba(168,85,247,0.35)] bg-slate-950/35',
        icon: '💎'
      };
    } else if (moves === par) {
      return {
        medal: 'PLATINUM EFFICIENCY (EXQUISITE)',
        description: 'Elite slithering! Bypassed firewall gates within target par limits exactly!',
        color: 'text-yellow-400 font-extrabold tracking-widest',
        ring: 'border-yellow-400/50 shadow-[0_0_16px_rgba(250,204,21,0.3)] bg-slate-950/35',
        icon: '🏅'
      };
    } else if (moves <= Math.ceil(par * 1.25)) {
      return {
        medal: 'SILVER COGNITIVE EFFICIENCY',
        description: 'Highly effective solution logic. Foothold footprints kept clean.',
        color: 'text-slate-200 font-bold',
        ring: 'border-slate-400/40 shadow-[0_0_10px_rgba(226,232,240,0.15)] bg-slate-900/40',
        icon: '🥈'
      };
    } else {
      return {
        medal: 'BRONZE COMPLIANCE MEDAL',
        description: 'Successful breach. Optimizing snake steps will elevate your core rating.',
        color: 'text-amber-500 font-bold',
        ring: 'border-amber-700/35 bg-amber-950/15',
        icon: '🥉'
      };
    }
  };

  const generateSandboxLevel = () => {
    // 1. Establish structural coordinates
    const startX = 1;
    const startY = Math.floor(sandboxHeight / 2);
    
    const exitX = sandboxWidth - 2;
    const exitY = Math.floor(sandboxHeight / 2);

    const levelWalls: Position[] = [];
    const levelTraps: Trap[] = [];
    const levelCutters: Cutter[] = [];
    const levelGates: Gate[] = [];
    const levelPortals: any[] = [];

    // Define reserved locations so we don't block start or exit
    const reservedSet = new Set<string>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        reservedSet.add(`${startX + dx},${startY + dy}`);
        reservedSet.add(`${exitX + dx},${exitY + dy}`);
      }
    }

    // Add gates
    const gateX = Math.floor(sandboxWidth / 2);
    const gateY1 = Math.floor(sandboxHeight / 2);
    levelGates.push({
      x: gateX,
      y: gateY1,
      maxLength: Math.max(2, Math.floor(sandboxStartLength / 3) + 1)
    });
    reservedSet.add(`${gateX},${gateY1}`);

    // Add additional gates if count > 1
    if (sandboxGateCount > 1 && sandboxHeight >= 7) {
      const gateY2 = gateY1 - 2 >= 1 ? gateY1 - 2 : gateY1 + 2;
      levelGates.push({
        x: gateX,
        y: gateY2,
        maxLength: Math.max(2, Math.floor(sandboxStartLength / 2) - 1)
      });
      reservedSet.add(`${gateX},${gateY2}`);
    }

    // Populate walls procedurally
    const potentialWallCells: Position[] = [];
    for (let x = 0; x < sandboxWidth; x++) {
      for (let y = 0; y < sandboxHeight; y++) {
        const key = `${x},${y}`;
        if (reservedSet.has(key)) continue;
        
        // Don't place on boundaries
        if (x === 0 || x === sandboxWidth - 1 || y === 0 || y === sandboxHeight - 1) continue;

        potentialWallCells.push({ x, y });
      }
    }

    // Shuffle potential wall cells
    const shuffledWalls = [...potentialWallCells].sort(() => Math.random() - 0.5);
    const wallCount = Math.floor((potentialWallCells.length * sandboxWallDensity) / 100);
    const selectedWalls = shuffledWalls.slice(0, wallCount);
    selectedWalls.forEach(w => {
      levelWalls.push(w);
      reservedSet.add(`${w.x},${w.y}`);
    });

    // Populate cutters (Orange tail cutters)
    const emptyCells = potentialWallCells.filter(cell => !reservedSet.has(`${cell.x},${cell.y}`));
    const shuffledEmpty = [...emptyCells].sort(() => Math.random() - 0.5);

    let cellIdx = 0;
    for (let i = 0; i < sandboxCutterCount && cellIdx < shuffledEmpty.length; i++) {
      const cell = shuffledEmpty[cellIdx++];
      levelCutters.push({
        x: cell.x,
        y: cell.y,
        amount: Math.floor(Math.random() * 5) + 4 // 4 to 8 tail deletion length
      });
      reservedSet.add(`${cell.x},${cell.y}`);
    }

    // Populate traps (moving or static spike traps)
    for (let i = 0; i < sandboxTrapCount && cellIdx < shuffledEmpty.length; i++) {
      const cell = shuffledEmpty[cellIdx++];
      if (i % 2 === 1 && cell.y > 1 && cell.y < sandboxHeight - 2) {
        levelTraps.push({
          x: cell.x,
          y: cell.y,
          type: 'moving',
          range: [
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y },
            { x: cell.x, y: cell.y + 1 }
          ],
          patrolIndex: 0,
          direction: 1
        });
      } else {
        levelTraps.push({
          x: cell.x,
          y: cell.y,
          type: 'static'
        });
      }
      reservedSet.add(`${cell.x},${cell.y}`);
    }

    // Populate portals
    if (sandboxHasPortals && cellIdx + 1 < shuffledEmpty.length) {
      const p1 = shuffledEmpty[cellIdx++];
      const p2 = shuffledEmpty[cellIdx++];
      levelPortals.push(
        { x: p1.x, y: p1.y, targetX: p2.x, targetY: p2.y, color: '#a855f7', name: 'Sandbox A' },
        { x: p2.x, y: p2.y, targetX: p1.x, targetY: p1.y, color: '#a855f7', name: 'Sandbox B' }
      );
    }

    // Calculate dynamic par moves
    const parMoves = Math.ceil(sandboxWidth * 1.8 + sandboxHeight * 1.2 + sandboxStartLength * 0.7);

    // Build absolute Level object
    const sandboxLevelObj: Level = {
      id: 99,
      name: 'Sandbox Sector S-X',
      description: `Custom computed mainframe sandbox. Challenge criteria is set dynamically. Width: ${sandboxWidth}, Height: ${sandboxHeight}, Start length: ${sandboxStartLength}.`,
      width: sandboxWidth,
      height: sandboxHeight,
      startPos: { x: startX, y: startY },
      startDir: Direction.RIGHT,
      startLength: sandboxStartLength,
      walls: levelWalls,
      traps: levelTraps,
      cutters: levelCutters,
      gates: levelGates,
      portals: levelPortals,
      exit: { x: exitX, y: exitY },
      parMoves: parMoves
    };

    setIsSandboxMode(true);
    setCustomSandboxLevel(sandboxLevelObj);
    audioSystem.playClick();
    setAlertText("👾 CONSTRUCTOR COMPULSION CORE: CUSTOM MATRIX DEPLOYED SUCCESSFULLY!");
  };

  function loadNextLevel() {
    if (currentLevelIdx < LEVELS.length - 1) {
      // Capture current efficiency rating before resetting state
      const rating = getEfficiencyRating();
      setTransitionMedal(rating);
      setIsTransitioningLevel(true);
      setIsLevelCompleted(false);
      audioSystem.playWarp();
      
      // Delay level loading to allow transition animation to play
      setTimeout(() => {
        setCurrentLevelIdx(prev => prev + 1);
        setIsTransitioningLevel(false);
      }, 3000);
    }
  };

  return (
    <>
      {/* ONBOARDING USER REGISTRATION PROMPT */}
      <AnimatePresence>
        {showNamePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020205]/95 backdrop-blur-xl flex items-start md:items-center justify-center p-4 z-[9999] overflow-y-auto"
            id="onboarding_name_prompt_modal"
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(16,185,129,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.15)_1px,transparent_1px)] bg-[size:20px_20px]" />
            
            {/* Radiant Glow Ring behind card */}
            <div className="absolute w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-md bg-[#05050f] border-2 border-emerald-500/25 rounded-2xl p-6 md:p-8 flex flex-col relative shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden"
            >
              {/* Cybersecurity laser matrix scanning bar */}
              <motion.div 
                initial={{ top: "-5%" }}
                animate={{ top: "105%" }}
                transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981]"
              />

              <div className="flex flex-col items-center text-center">
                {/* Logo element resembling security core */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-6 relative group shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Terminal size={28} className="animate-pulse" />
                </div>

                <span className="text-[9px] font-mono text-emerald-400 font-extrabold tracking-[0.3em] uppercase bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
                  ESTABLISHING ENCRYPTED CONNECTION
                </span>

                <h2 className="text-2xl font-black text-white tracking-widest uppercase font-display mb-2">
                  Identify Operator
                </h2>
                
                <p className="text-[11.5px] text-slate-400 font-mono leading-relaxed max-w-sm mb-6">
                  Register your operational clearance credentials. Your operational ID will be synced with the galactic scores mainframe decoders.
                </p>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = userName.trim();
                    if (trimmed.length >= 2 && trimmed.length <= 15) {
                      localStorage.setItem('reverse_snake_username', trimmed);
                      setUserName(trimmed);
                      setShowNamePrompt(false);
                      setShowOnboardingGuide(true);
                      audioSystem.playWarp();
                    }
                  }}
                  className="w-full flex flex-col gap-4"
                >
                  <div className="relative">
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={15}
                      placeholder="Enter Hacker Nickname..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ''))}
                      className="w-full bg-slate-950 border-2 border-slate-900 rounded-xl px-4 py-3 leading-none text-white text-sm font-mono placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all text-center uppercase tracking-wider text-emerald-300 font-bold"
                      autoFocus
                    />
                    <span className="absolute right-3.5 top-3.5 text-[10px] font-mono text-slate-600 uppercase font-semibold">
                      {userName.trim().length}/15
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={userName.trim().length < 2}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 py-3.5 rounded-xl font-black font-display text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    Initialize Command Console
                  </button>
                </form>

                <p className="text-[8px] text-slate-600 font-mono mt-4 uppercase tracking-widest">
                  Mainframe telemetry engine active
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPREHENSIVE CYBER OPERATOR ONBOARDING HANDBOOK */}
      <AnimatePresence>
        {showOnboardingGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020205]/95 backdrop-blur-xl flex items-start md:items-center justify-center p-4 z-[9998] overflow-y-auto"
            id="onboarding_guide_modal"
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(56,189,248,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.15)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />

            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-2xl bg-[#04040c] border-[2px] border-cyan-500/30 rounded-2xl p-6 md:p-8 flex flex-col relative my-8 shadow-[0_0_60px_rgba(6,182,212,0.18)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Gamepad2 size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-cyan-400 font-extrabold tracking-widest block uppercase">
                      Operator Training Program
                    </span>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider font-display">
                      Welcome, Operator {userName || 'Agent'}!
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOnboardingGuide(false);
                    audioSystem.playWarp();
                  }}
                  className="text-slate-500 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  [SKIP ×]
                </button>
              </div>

              {/* Guide Content */}
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-left">
                
                {/* Section 1: How to play */}
                <div className="bg-[#060614] border border-[#14142d] rounded-xl p-4 relative overflow-hidden" id="guide_how_to_play_sc">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-emerald-400 font-mono text-xs">01//</span>
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest font-display">
                      THE RULES: HOW TO PLAY
                    </h3>
                  </div>
                  <p className="text-[11.5px] text-slate-300 font-mono leading-relaxed mb-3">
                    For decades, you have played snake to grow as long as possible. <strong className="text-white">But here, growth is your enemy!</strong> In Reverse Snake, you must shrink your snake to escape each level.
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-2.5 font-mono">
                    <li className="flex gap-2.5 items-start">
                      <span className="text-orange-400 shrink-0 select-none">✂️</span>
                      <span>
                        <strong className="text-slate-200">Prune Your Tail:</strong> Slither your snake directly over orange circular <strong className="text-orange-400">Cutters</strong>. Each cutter instantly clips off pieces of your snake.
                      </span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <span className="text-teal-400 shrink-0 select-none">🚪</span>
                      <span>
                        <strong className="text-slate-200">Clearance Limits:</strong> Exit gates are protected by security walls. Complete the level by shrinking down to the target length (e.g. <strong className="text-teal-400">≤ 4</strong>) and sliding into the glow-gate.
                      </span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <span className="text-rose-400 shrink-0 select-none">💥</span>
                      <span>
                        <strong className="text-slate-200">Cyber Hazards:</strong> Avoid hitting the outer mesh walls, bumping into red hazard spikes, colliding with shifting laser beams, or biting your own tail!
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Section 2: Special Premium Features */}
                <div className="bg-[#060614] border border-[#14142d] rounded-xl p-4 relative overflow-hidden" id="guide_features_sc">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-cyan-400 font-mono text-xs">02//</span>
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-display">
                      MATRIX GAME FEATURES
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400 font-mono">
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                      <span className="text-orange-400 font-bold block mb-1">🔥 DAILY STREAK BONUS</span>
                      Play and complete at least one level every day! Keeping up your streak rewards you with multiplier boosts up to <strong className="text-white">1.5x score bonus</strong>.
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                      <span className="text-purple-400 font-bold block mb-1">⏱️ TIME STACK CHALLENGE</span>
                      Toggle the Time Challenge to test your reflex speed. Keeping the countdown timer alive is rewarded with massive score rewards.
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                      <span className="text-sky-400 font-bold block mb-1">♟️ STEP-BY-STEP PUZZLER</span>
                      Need to think? Turn on Step-Mode. The snake stays perfectly frozen and only glides 1 block forward when you press a direction key.
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                      <span className="text-teal-400 font-bold block mb-1">🛠️ SANDBOX BUILDER</span>
                      Go into the "Constructor" tab to draw custom mazes, place cutters, and hazardous spikes, and test your own creations in real-time.
                    </div>
                  </div>
                </div>

                {/* Section 3: Buttons and Controls */}
                <div className="bg-[#060614] border border-[#14142d] rounded-xl p-4 relative overflow-hidden" id="guide_buttons_sc">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-purple-400 font-mono text-xs">03//</span>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest font-display">
                      SYSTEM CONTROLS & JOYS
                    </h3>
                  </div>
                  <div className="space-y-3.5 text-[11px] text-slate-400 font-mono">
                    <p className="leading-relaxed">
                      Adjust your interface perfectly utilizing the tactile controls provided around the mainframe:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1.5">
                      <div className="flex gap-2">
                        <span className="text-white">⌨️</span>
                        <span>
                          <strong className="text-slate-200">Arrow Keys / WASD</strong><br />
                          Control snake steering on desktop keyboards immediately.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white">🕹️</span>
                        <span>
                          <strong className="text-slate-200">On-Screen Stick</strong><br />
                          On tablets and phones, drag or tap the glowing blue wheel to steer.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white">💡</span>
                        <span>
                          <strong className="text-slate-200">Pathfinder Hint</strong><br />
                          Stuck in a level? Press the lightbulb button for a perfect visual guide path toward the nearest orange cutter.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white">⏸️ / ↺</span>
                        <span>
                          <strong className="text-slate-200">Pause & Restart</strong><br />
                          Pause the simulation anytime to study moving hazards, or hit restart to revitalize.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Dismiss Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-900 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowOnboardingGuide(false);
                    audioSystem.playWarp();
                  }}
                  className="w-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-1500 text-black hover:text-slate-950 font-black font-display text-xs py-4 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all text-center group flex items-center justify-center gap-2 cursor-pointer"
                >
                  Confirm Operations & Launch <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-center text-[8.5px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-1">
                  Ready your coordinates. Decryption and grid entry authorized.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex flex-col lg:flex-row gap-6 w-full ${inSession ? 'max-w-3xl' : 'max-w-6xl'} mx-auto font-sans`} id="game_layout_frame">
      {/* LEFT COLUMN: PRIMARY ARCADE PLAYGROUND */}
      <div className="flex-1 flex flex-col bg-[#05050a] border border-[#1a1a2e] rounded-2xl p-5 shadow-2xl relative overflow-hidden" id="viewport_main_frame">
        {/* Neon decorative background light */}
        <div className="absolute top-0 left-1/4 w-80 h-16 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        {inSession ? (
          <>
            {/* Level Stats HUD Top */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[#141424] pb-4 mb-4 gap-4" id="banner_level_hud">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setInSession(false);
                    audioSystem.playWarp();
                  }}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-rose-950/40 border border-[#1a1a2e] hover:border-rose-500/30 text-rose-450 hover:text-white rounded font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer mr-1"
                  title="Return to the Main Lobby View"
                  id="btn_immersive_exit"
                >
                  <ArrowLeft size={11} />
                  <span>EXIT</span>
                </button>
                <span className="text-xs font-bold font-mono px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">
                  LEVEL {activeLevel.id}
                </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none font-display uppercase">
                {activeLevel.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Reach exit vortex with safe body length!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" id="header_controls_wrap">
            {isTimeChallenge && (
              <div 
                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 font-mono text-[10px] sm:text-xs font-bold transition-all ${
                  timeRemaining <= 7 
                    ? 'bg-rose-500/20 border-rose-500 animate-pulse text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]' 
                    : 'bg-black border-slate-800 text-rose-500 shadow-inner'
                }`}
                title="Quantum time limit before core collapse!"
                id="hud_time_attack_countdown"
              >
                <span className="hidden sm:inline">⏱️ LEVEL CORE SEC:</span>
                <span className="sm:hidden">⏱️ CORE:</span>
                <span className="text-xs sm:text-sm font-sans tracking-tight">{timeRemaining}s</span>
                <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded text-white animate-bounce block">
                  {timeMultiplier}x
                </span>
              </div>
            )}

            <button
              onClick={handleToggleMute}
              className={`p-2 rounded transition-colors border text-xs ${
                isMuted 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' 
                  : 'bg-slate-900 border-[#1a1a2e] text-slate-300 hover:bg-slate-800'
              }`}
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              id="btn_sound_mute"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <div className="flex items-center gap-1 bg-[#090915] border border-slate-900 rounded-lg p-1 text-[11px]" id="ambient_synthesizer_dock">
              <button
                onClick={handleToggleMusic}
                className={`p-2 rounded transition-colors border text-[10px] font-mono font-black flex items-center gap-1.5 ${
                  isMusicOn 
                    ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                    : 'bg-slate-900 border-[#1a1a2e] text-slate-400 hover:bg-slate-800'
                }`}
                id="btn_sound_music"
                title="Toggle Ambient Mainframe Synthesizer"
              >
                <Activity size={12} className={isMusicOn ? 'animate-pulse text-cyan-400' : 'text-slate-500'} />
                <span>SYNTH {isMusicOn ? 'ON' : 'OFF'}</span>
              </button>

              {isMusicOn && (
                <div className="flex items-center gap-1 animate-fade-in pr-1">
                  <select
                    value={audioSystem.getCurrentTrackId()}
                    onChange={(e) => {
                      const selTrack = Number(e.target.value);
                      audioSystem.setTrack(selTrack);
                      setForceAudioRefresh(prev => prev + 1);
                    }}
                    className="bg-black text-[9px] text-cyan-400 border border-cyan-950/70 px-1 py-1 rounded font-mono focus:border-cyan-500 outline-none max-w-[95px] sm:max-w-[125px] cursor-pointer animate-fade-in"
                    id="ambient_track_selector"
                    title="Select background audio channel"
                  >
                    <option value={1}>📡 T-Alpha</option>
                    <option value={2}>🔌 T-Beta</option>
                    <option value={3}>🌌 T-Gamma</option>
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!showDpadOverlay) {
                  setShowDpadOverlay(true);
                  setDpadMode('floating');
                } else if (dpadMode === 'floating') {
                  setDpadMode('fixed');
                } else {
                  setShowDpadOverlay(false);
                }
              }}
              className={`p-2 rounded transition-all border text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                showDpadOverlay 
                  ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20' 
                  : 'bg-slate-900 border-[#1a1a2e] text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle On-Screen Touch D-Pad Overlay (FLOAT -> FIXED -> OFF)"
              id="btn_toggle_dpad_overlay"
            >
              <Gamepad2 size={13} className={showDpadOverlay ? 'animate-pulse' : ''} />
              <span>
                D-PAD: <span className="hidden sm:inline">{!showDpadOverlay ? 'OFF' : dpadMode === 'floating' ? 'FLOAT' : 'FIXED'}</span>
                <span className="sm:hidden">{!showDpadOverlay ? 'OFF' : dpadMode === 'floating' ? 'FLT' : 'FXD'}</span>
              </span>
            </button>
            <button
              onClick={() => {
                setShowPerformanceHUD(prev => !prev);
                audioSystem.playClick();
              }}
              className={`p-2 rounded transition-all border text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                showPerformanceHUD 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                  : 'bg-slate-900 border-[#1a1a2e] text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle Performance HUD Overlay (FPS/Memory Monitoring)"
              id="btn_toggle_perf_hud"
            >
              <Cpu size={13} className={showPerformanceHUD ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
              <span>HUD: {showPerformanceHUD ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1a1a2e] transition-colors"
              title="Show Instructions"
              id="btn_help_rules"
            >
              <HelpCircle size={15} />
            </button>
          </div>
        </div>

        {/* Level Quick Info Alert */}
        <div className="bg-slate-900/60 border border-slate-950 rounded-xl p-3 mb-4 text-xs text-slate-300 font-sans flex items-start gap-2.5">
          <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">How-to: </span>{activeLevel.description}
          </div>
        </div>

        {/* Threat Alert Indicator for Restricted Area */}
        {(() => {
          const threat = getThreatStatus();
          return (
            <div 
              className={`border rounded-xl p-3 mb-4 text-[11px] font-mono transition-all duration-300 flex items-center justify-between gap-3 ${threat.color}`}
              id="restricted_threat_alert_hud"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${threat.level === 'CRITICAL' ? 'bg-rose-500' : threat.level === 'WARNING' || threat.level === 'BARRIER ALERT' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${threat.level === 'CRITICAL' ? 'bg-rose-500' : threat.level === 'WARNING' || threat.level === 'BARRIER ALERT' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                <div>
                  <span className="font-black uppercase tracking-wider block text-[10px]">
                    RESTRICTED THREAT ALERT: {threat.level}
                  </span>
                  <span className="opacity-80 block text-[10px] sm:text-[11px] font-medium leading-none mt-1">
                    {threat.message}
                  </span>
                </div>
              </div>
              <div className="text-[9px] uppercase bg-black/40 border border-current px-2 py-0.5 rounded shrink-0 font-bold tracking-widest hidden sm:block">
                RADAR ACTIVE
              </div>
            </div>
          );
        })()}

        {/* Floating alerts banners */}
        <AnimatePresence>
          {alertText && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center justify-between"
              id="alert_warning_hud"
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                {alertText}
              </span>
              <button 
                onClick={() => setAlertText(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Swipe Container Stage with touch prevention */}
        <div 
          className="relative flex-1 bg-black border border-[#10101e] rounded-xl flex items-center justify-center p-1.5 min-h-[300px] touch-none select-none"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          id="canvas_grid_stage"
          title="Swipe on the board to drag-steer the snake!"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="rounded shadow-inner"
            id="rendering_gl_canvas"
          />

          {/* REALTIME SYSTEM PERFORMANCE HUD OVERLAY */}
          {showPerformanceHUD && (
            <div 
              className="absolute top-3 left-3 z-30 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 w-48 font-mono text-[9px] text-slate-300 shadow-2xl flex flex-col gap-2 pointer-events-auto select-none text-left"
              id="performance_hud_overlay_widget"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span className="flex items-center gap-1 font-bold text-emerald-400 uppercase tracking-widest text-[8px]">
                  <Cpu size={11} className="animate-pulse" />
                  Telemetry Core
                </span>
                <span className="text-[7.5px] text-slate-500 font-bold">LIVE FEED</span>
              </div>

              {/* FPS Counter */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">FRAME RATE:</span>
                  <div className="flex items-center gap-1">
                    <span className={`font-black ${
                      fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400 animate-pulse'
                    }`}>
                      {fps} FPS
                    </span>
                    <span className="text-[7px] text-slate-500 font-bold">
                      {fps >= 55 ? '[OPT]' : fps >= 30 ? '[MED]' : '[LOW]'}
                    </span>
                  </div>
                </div>
                {/* Micro mini live visual frame bar simulation */}
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      fps >= 55 ? 'bg-emerald-500' : fps >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Memory Monitor */}
              {memoryUsage && (
                <div className="flex flex-col gap-1 border-t border-slate-900/60 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">HEAP JS MEM:</span>
                    <span className="text-white font-bold">{memoryUsage.used} MB</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, (memoryUsage.used / memoryUsage.limit) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[7.5px] text-slate-500 tracking-tighter leading-none mt-0.5 font-bold">
                    <span>min: 0MB</span>
                    <span>limit: {memoryUsage.limit}MB</span>
                  </div>
                </div>
              )}

              {/* Quick Optimization Recommendation */}
              <div className="border-t border-slate-900/60 pt-1.5 text-[7.5px] text-slate-400 leading-tight flex flex-col gap-0.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[7px]" style={{ color: '#10b981' }}>
                  ⚡ optimization tip:
                </span>
                <span>
                  {fps < 50 
                    ? "Turn off SYNTH sound channel to free background audio frames." 
                    : "Running optimally. Disable SYNTH sound if you experience thermal lag."}
                </span>
              </div>
            </div>
          )}

          {/* Swipe indicator helper on mobile */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-mono tracking-wider uppercase pointer-events-none opacity-70 sm:hidden">
            ← Drag finger to steer slither →
          </div>

          {/* GORGEOUS ON-SCREEN TRANSLUCENT TOUCH D-PAD OVERLAY */}
          {showDpadOverlay && !showHowToPlay && (
            <div 
              className={`absolute z-20 flex flex-col items-center bg-slate-950/75 backdrop-blur-md border border-slate-800/40 rounded-full p-2 shadow-2xl select-none touch-none scale-90 sm:scale-100 lg:hidden transition-all duration-150 ${
                dpadMode === 'floating' && !floatingCenter ? 'bottom-5 right-5 opacity-30 border-dashed border-cyan-500/30' : 'opacity-100'
              }`}
              style={{
                left: dpadMode === 'floating' && floatingCenter ? `${floatingCenter.x}px` : undefined,
                top: dpadMode === 'floating' && floatingCenter ? `${floatingCenter.y}px` : undefined,
                transform: dpadMode === 'floating' && floatingCenter ? 'translate(-50%, -50%) scale(1.05)' : undefined,
                position: 'absolute',
                boxShadow: dpadMode === 'floating' && floatingCenter ? '0 0 20px rgba(6, 182, 212, 0.25)' : undefined
              }}
              id="onscreen_touch_dpad_overlay"
              // Prevent parent board gestures and browser scrolling during button play
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="relative w-36 h-36 flex items-center justify-center bg-black/40 rounded-full border border-slate-900/40" id="touch_dpad_diamond">
                {/* Center Core HUD indicator - follows user touch with floating joystick knob physics */}
                <div 
                  className={`absolute w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-[8px] font-mono font-bold text-cyan-400 select-none pointer-events-none shadow-inner z-10 transition-transform duration-75`}
                  style={{
                    transform: `translate(${floatingKnob.x}px, ${floatingKnob.y}px)`,
                    borderColor: dpadMode === 'floating' && floatingCenter ? '#06b6d4' : undefined,
                    boxShadow: dpadMode === 'floating' && floatingCenter ? '0 0 8px rgba(6, 182, 212, 0.4)' : undefined
                  }}
                >
                  <span className="text-[6px] text-slate-500 uppercase tracking-widest leading-none">Len</span>
                  <span className="leading-tight text-emerald-400 text-xs font-bold">{snake.length}</span>
                </div>

                {/* UP Direction */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.UP);
                      audioSystem.playClick();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.UP);
                      audioSystem.playClick();
                    }
                  }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-13 h-13 bg-[#0d0d16]/95 active:bg-cyan-500/35 active:text-cyan-200 border border-slate-800/50 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90"
                  id="touch_dpad_btn_up"
                  title="Up Arrow"
                  disabled={isGameOver || isLevelCompleted}
                  style={{ touchAction: 'none' }}
                >
                  <ArrowUp size={22} className="text-cyan-400 stroke-[2.5]" />
                </button>

                {/* DOWN Direction */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.DOWN);
                      audioSystem.playClick();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.DOWN);
                      audioSystem.playClick();
                    }
                  }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-13 h-13 bg-[#0d0d16]/95 active:bg-cyan-500/35 active:text-cyan-200 border border-slate-800/50 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90"
                  id="touch_dpad_btn_down"
                  title="Down Arrow"
                  disabled={isGameOver || isLevelCompleted}
                  style={{ touchAction: 'none' }}
                >
                  <ArrowDown size={22} className="text-cyan-400 stroke-[2.5]" />
                </button>

                {/* LEFT Direction */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.LEFT);
                      audioSystem.playClick();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.LEFT);
                      audioSystem.playClick();
                    }
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-13 h-13 bg-[#0d0d16]/95 active:bg-cyan-500/35 active:text-cyan-200 border border-slate-800/50 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90"
                  id="touch_dpad_btn_left"
                  title="Left Arrow"
                  disabled={isGameOver || isLevelCompleted}
                  style={{ touchAction: 'none' }}
                >
                  <ArrowLeft size={22} className="text-cyan-400 stroke-[2.5]" />
                </button>

                {/* RIGHT Direction */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.RIGHT);
                      audioSystem.playClick();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameOver && !isLevelCompleted) {
                      handleOnScreenDirection(Direction.RIGHT);
                      audioSystem.playClick();
                    }
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-13 h-13 bg-[#0d0d16]/95 active:bg-cyan-500/35 active:text-cyan-200 border border-slate-800/50 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90"
                  id="touch_dpad_btn_right"
                  title="Right Arrow"
                  disabled={isGameOver || isLevelCompleted}
                  style={{ touchAction: 'none' }}
                >
                  <ArrowRight size={22} className="text-cyan-400 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY: HOW TO PLAY INSTRUCTIONS */}
          <AnimatePresence>
            {showHowToPlay && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020205]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center z-20 border border-[#1a1a2e]"
                id="popup_tutorial_rules"
              >
                <div className="max-w-md">
                  <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={20} className="animate-spin-slow" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 font-display">
                    Reverse Snake Rules
                  </h3>
                  <div className="text-xs text-slate-300 space-y-3.5 mb-6 text-left border-y border-[#141424] py-4 leading-relaxed font-sans">
                    <p className="flex gap-2">
                      <span>🎮</span>
                      <span><strong>Lose Length to Win:</strong> Unlike classic snake where you grow, here you must <strong>get shorter</strong> to squeeze through exit gates!</span>
                    </p>
                    <p className="flex gap-2">
                      <span>✂️</span>
                      <span><strong>Orange Cutters:</strong> Slither over orange circular blades to automatically chop off segments of your tail.</span>
                    </p>
                    <p className="flex gap-2">
                      <span>🛑</span>
                      <span><strong>Access Gates:</strong> Blocked unless your length meets the clearance limit (e.g. Length <strong className="text-teal-400">≤ 4</strong>).</span>
                    </p>
                    <p className="flex gap-2">
                      <span>🔥</span>
                      <span><strong>Hazards:</strong> Avoid running into walls, colliding with shifting laser patrols, stepping on pink floor-spikes, or biting your own tail!</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowHowToPlay(false);
                      audioSystem.playClick();
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-lg transition-transform active:scale-95 shadow-md shadow-cyan-500/10 text-xs tracking-wider uppercase font-display"
                    id="btn_tutorial_dismiss"
                  >
                    START PLAYING
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OVERLAY: GAME OVER RESPAWN */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="absolute inset-0 bg-[#05050c]/90 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-6 text-center z-10"
                id="popup_gameover_screen"
              >
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-3 border border-rose-500/20">
                  <Skull size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 font-display">
                  Snake Collapsed
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                  Avoid biting your own tail, lasers, fire traps, or crashing into boundary walls!
                </p>

                {/* Game Over stats bar */}
                <div className="flex gap-4 justify-center items-center bg-slate-950/85 border border-rose-500/15 rounded-lg py-2 px-4 mb-5 font-mono text-[10px] text-left min-w-[240px] shadow-lg shadow-black/80" id="gameover_stats_hud">
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Steps Taken</span>
                    <span className="font-bold text-slate-300 font-sans text-xs block">{moves}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-800" />
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Time Survived</span>
                    <span className="font-bold text-rose-405 font-sans text-xs block">{timeTakenForLevel.toFixed(1)}s</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[280px]">
                  <button
                    onClick={() => initLevel(currentLevelIdx)}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-display uppercase tracking-wider"
                    id="btn_restart_fail"
                  >
                    <RotateCcw size={14} />
                    PLAY AGAIN
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setInSession(false);
                      audioSystem.playWarp();
                    }}
                    className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-display uppercase tracking-wider"
                    id="btn_gameover_lobby_return"
                  >
                    <ArrowLeft size={13} />
                    TO LOBBY
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OVERLAY: LEVEL COMPLETED & HIGH SCORE SUBMISSIONS */}
          <AnimatePresence>
            {isLevelCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="absolute inset-2 bg-[#020205]/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-5 text-center z-10 border border-teal-500/20"
                id="popup_levelwin_screen"
              >
                <div className="w-12 h-12 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center mb-2 border border-teal-500/20">
                  <Trophy size={24} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight font-display uppercase">
                  {isDailyChallenge ? 'Matrix Disrupted!' : 'Level Bypassed!'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-mono">
                  {isDailyChallenge ? 'Daily Challenge completed!' : `Level ${activeLevel.id} fully squeezed`}
                </p>

                {/* Rating stars */}
                <div className="flex gap-2 mb-4" id="win_rating_stars">
                  {[1, 2, 3].map((star) => (
                    <span 
                      key={star} 
                      className={`text-xl transition-all ${
                        star <= getStarsCount() ? 'text-yellow-400 scale-110' : 'text-slate-700'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* Efficiency Medal Badge */}
                {(() => {
                  const rating = getEfficiencyRating();
                  return (
                    <div 
                      className={`flex flex-col items-center justify-center border rounded-xl py-2 px-4 mb-3.5 max-w-sm w-full transition-all duration-300 ${rating.ring}`}
                      id="win_efficiency_medal_badge"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-450 font-bold uppercase tracking-widest">
                        <span>Efficiency Medal Awarded</span>
                      </div>
                      <div className={`text-xs font-black flex items-center justify-center gap-1.5 mt-1 ${rating.color}`}>
                        <span className="text-base animate-pulse">{rating.icon}</span>
                        <span>{rating.medal}</span>
                        <span className="text-base animate-pulse">{rating.icon}</span>
                      </div>
                      <p className="text-[9px] text-center text-slate-400 leading-normal mt-0.5 italic max-w-[280px]">
                        "{rating.description}"
                      </p>
                    </div>
                  );
                })()}

                {/* Active Level score stats */}
                <div className="grid grid-cols-2 gap-2 max-w-sm w-full bg-slate-950 border border-[#141424] rounded-lg p-2.5 mb-4 text-left font-mono text-[10px]" id="win_stats_grid">
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Steps Used</span>
                    <span className={`font-bold font-sans text-xs sm:text-sm ${moves <= activeLevel.parMoves ? 'text-teal-400' : 'text-amber-400'}`}>
                      {moves} <span className="text-slate-500 font-mono text-[9px]">/ {activeLevel.parMoves}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Time Taken</span>
                    <span className="font-bold text-indigo-400 font-sans text-xs sm:text-sm block">
                      {timeTakenForLevel.toFixed(1)}s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Level Score</span>
                    <span className="font-bold text-white font-sans text-xs sm:text-sm block">
                      +{levelEarnedScore - earnedStreakBonus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[8.5px]">Daily Streak</span>
                    <span className={`font-bold font-sans text-xs sm:text-sm block ${earnedStreakCount > 0 ? 'text-orange-400 animate-pulse' : 'text-slate-550'}`}>
                      {earnedStreakCount > 0 ? `🔥 ${earnedStreakCount}D (+${earnedStreakBonus})` : '0 Days'}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-900/60 pt-2.5 mt-1 flex justify-between items-center bg-[#070712] -mx-2.5 -mb-2.5 p-2 rounded-b-lg">
                    <span className="text-slate-500 uppercase text-[8.5px] font-bold text-cyan-400">Total session score</span>
                    <span className="font-bold text-teal-400 font-sans text-xs sm:text-sm block">
                      {sessionScore}
                    </span>
                  </div>
                </div>

                {/* Submission Box */}
                {!hasSubmitted ? (
                  <form onSubmit={handleScoreSubmission} className="w-full max-w-sm mb-5 bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-3 flex flex-col items-center text-center" id="score_form">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2.5 font-display tracking-widest">
                      🏆 RECORD YOUR HIGH SCORE
                    </h4>
                    
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between bg-black/60 border border-slate-900 rounded-lg p-2 text-xs font-mono w-full">
                        {isEditingNickname ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={tempUserName}
                              onChange={(e) => setTempUserName(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ''))}
                              maxLength={15}
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-300 font-bold w-full uppercase text-[11px] outline-none focus:border-cyan-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveNickname();
                                } else if (e.key === 'Escape') {
                                  setIsEditingNickname(false);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={saveNickname}
                              className="text-emerald-400 font-bold text-[10px] hover:text-emerald-300 px-1"
                              title="Save Nickname"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingNickname(false)}
                              className="text-rose-400 font-bold text-[10px] hover:text-rose-300 px-1"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-left truncate max-w-[150px]">
                              <span className="text-[8px] text-slate-500 uppercase block leading-tight">Syncing Operator</span>
                              <span className="text-emerald-400 font-bold uppercase tracking-wider">{userName || 'Operator'}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                setTempUserName(userName);
                                setIsEditingNickname(true);
                              }}
                              className="text-[9px] text-slate-500 hover:text-cyan-400 font-bold cursor-pointer transition-colors shrink-0"
                            >
                              [EDIT NICKNAME]
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !userName.trim()}
                        className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-black font-display py-2.5 rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5 uppercase transition-all shadow-md shadow-cyan-950/20 active:scale-[0.98]"
                        id="score_submit_btn"
                      >
                        {isSubmitting ? 'Decrypting & Sending...' : (
                          <>
                            Transmit Score Mainframe <Send size={11} className="stroke-[2.5]" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-2.5 rounded-lg mb-5 max-w-sm w-full font-sans text-center">
                    ✨ Score registered! Find your rank under the <span className="underline font-bold uppercase cursor-pointer" onClick={() => setActiveTab('leaderboard')}>Leaderboard Tab</span>!
                  </div>
                )}

                <div className="flex gap-3 justify-center w-full max-w-sm">
                  <button
                    onClick={() => initLevel(currentLevelIdx)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold border border-[#1a1a2e] rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-display"
                    id="btn_retry_win"
                  >
                    <RotateCcw size={13} />
                    RETRY
                  </button>

                  {isDailyChallenge ? (
                    <button
                      onClick={() => {
                        setIsDailyChallenge(false);
                        initLevel(currentLevelIdx, true);
                        audioSystem.playClick();
                      }}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1 transition-transform active:scale-95 text-xs font-display"
                      id="btn_back_levels"
                    >
                      BACK TO LEVELS
                    </button>
                  ) : isGameBeaten ? (
                    <button
                      onClick={() => {
                        setCurrentLevelIdx(0);
                        setIsGameBeaten(false);
                        setSessionScore(0);
                        initLevel(0, true);
                      }}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-display uppercase"
                      id="btn_ultimate_reset"
                    >
                      <Sparkles size={13} />
                      RESTART ALL
                    </button>
                  ) : (
                    <button
                      onClick={loadNextLevel}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1 transition-transform active:scale-95 text-xs font-display uppercase tracking-wider"
                      id="btn_next_level"
                      title="Continue to the next decryption sector (or press Enter)"
                    >
                      <span>NEXT LEVEL</span>
                      <span className="text-[9px] bg-slate-950/10 px-1 py-0.5 rounded text-teal-950 font-mono font-bold hidden sm:inline">[ENTER]</span>
                      <ChevronRight size={13} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OVERLAY: SMOOTH LEVEL TRANSITION WITH EFFICIENCY RATING DISPLAY */}
          <AnimatePresence>
            {isTransitioningLevel && transitionMedal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020205] backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center z-40 border-2 border-purple-500/30 overflow-hidden"
                id="popup_level_transition_screen"
              >
                {/* Cybersecurity matrix digital scanning background effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(168,85,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.1)_1px,transparent_1px)] bg-[size:16px_16px] animate-[pulse_3s_infinite]" />
                
                {/* Horizontal moving laser line inside transition */}
                <motion.div 
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_10px_#a855f7]"
                />

                <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                  {/* Hexagonal Core Processing Indicator */}
                  <div className="w-16 h-16 rounded-full border border-dashed border-purple-500/30 flex items-center justify-center mb-5 animate-spin-slow">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-purple-400 font-bold tracking-[0.25em] uppercase bg-purple-950/40 px-3 py-1 rounded-full border border-purple-500/20 mb-2">
                    RESECURING MAINFRAME SECTOR
                  </span>

                  <h3 className="text-xl font-black text-white tracking-widest uppercase font-display mb-1">
                    Matrix Cleared
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 font-mono mb-6">
                    Decompressing node. Syncing compliance rating...
                  </p>

                  {/* Pulsing Visual Container of the efficiency rating medal */}
                  <motion.div 
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                     className={`flex flex-col items-center justify-center border rounded-2xl py-4 px-6 max-w-sm w-full shadow-2xl transition-all duration-300 ${transitionMedal.ring}`}
                     id="transition_medal_card"
                  >
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold mb-1">
                      PERFORMANCE METRICS EVALUATED
                    </div>

                    <div className={`text-base font-black flex items-center justify-center gap-2 ${transitionMedal.color}`}>
                      <span className="text-xl inline-block animate-bounce">{transitionMedal.icon}</span>
                      <span>{transitionMedal.medal}</span>
                      <span className="text-xl inline-block animate-bounce">{transitionMedal.icon}</span>
                    </div>

                    <p className="text-[9.5px] text-center text-slate-300 leading-relaxed mt-2 italic max-w-[290px] border-t border-slate-900/60 pt-2">
                      "{transitionMedal.description}"
                    </p>
                    <div className="text-[9px] text-center text-slate-450 mt-1 font-mono flex items-center gap-1.5 uppercase tracking-wide">
                      <span>Sync Time:</span>
                      <span className="text-purple-400 font-bold font-sans">{timeTakenForLevel.toFixed(1)}s</span>
                    </div>
                  </motion.div>

                  {/* Dynamic loader strip */}
                  <div className="w-full max-w-xs bg-slate-950/80 border border-slate-900 rounded-full h-2.5 overflow-hidden mt-8 relative">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3.0, ease: "easeInOut" }}
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                    />
                  </div>

                  <span className="text-[8px] font-mono text-slate-500 mt-2 tracking-widest uppercase animate-pulse">
                    Routing to next virtual core matrix...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OVERLAY: FULL GAME BEATEN CELEBRATION */}
          <AnimatePresence>
            {isGameBeaten && isLevelCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-[#020205] rounded-xl flex flex-col items-center justify-center p-6 text-center z-30 border-2 border-cyan-500/30"
                id="popup_endgame_victory"
              >
                <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Trophy size={28} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 font-display bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent uppercase">
                  All Levels Defeated!
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mb-5 leading-relaxed">
                  Brilliant slithering! You guided the snake masterfully, shrinking to fit, and bypassed every digital firewall gate!
                </p>
                <div className="text-sm border border-slate-850 bg-slate-900/40 rounded-xl px-5 py-3 mb-6 font-mono">
                  🏆 FINAL SCORE: <span className="font-bold text-teal-400 text-lg">{sessionScore}</span>
                </div>
                <button
                  onClick={() => {
                    setIsGameBeaten(false);
                    setCurrentLevelIdx(0);
                    setSessionScore(0);
                    initLevel(0, true);
                  }}
                  className="py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black rounded-lg transition-transform active:scale-95 text-xs font-display shadow-md shadow-cyan-500/10"
                  id="btn_replay_all"
                >
                  PLAY AGAIN FROM BEGINNING
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HUD Live stats (Snake specs) */}
        <div className="grid grid-cols-4 gap-2.5 mt-4" id="stats_panel_hud">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[9px] uppercase font-mono tracking-wider">
              <Zap size={9} className="text-emerald-400" /> Length
            </div>
            <span className="font-bold text-base text-emerald-400 leading-none mt-1 font-display" id="val_status_length">
              {snake.length}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">
              Steps Taken
            </span>
            <span className="font-bold text-base text-white leading-none mt-1 font-display" id="val_status_steps">
              {moves}
            </span>
          </div>

          <div className="bg-slate-950 border border-[#1a1a2e] rounded-xl p-2.5 text-center flex flex-col justify-center relative">
            <span className="text-[9px] text-cyan-400 uppercase font-mono tracking-wider font-bold">
              Score
            </span>
            <span className="font-bold text-base text-cyan-400 leading-none mt-1 font-display animate-pulse" id="val_status_score">
              {sessionScore}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">
              Level Deaths
            </span>
            <span className="font-bold text-base text-rose-400 leading-none mt-1 font-display" id="val_status_deaths">
              {totalLevelDeaths}
            </span>
          </div>
        </div>

        {/* Tactile Mobile D-Pad */}
        {!showDpadOverlay && renderDPad(true)}

        {/* Interactive Play Mode Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-[15px] pt-4 border-t border-[#121223]" id="mode_and_actions_frame">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto" id="mode_and_timeattack_selectors">
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-900 rounded-lg animate-fade-in" id="control_mode_selector">
              <button
                onClick={() => {
                  setIsStepMode(false);
                  setIsPlaying(false);
                  setAlertText("Switched to Real-Time. Snake runs continuously.");
                  audioSystem.playClick();
                }}
                className={`text-[10px] font-bold py-1 px-3 rounded transition-all tracking-wider ${
                  !isStepMode 
                    ? 'bg-emerald-500 text-slate-950 font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                id="btn_mode_realtime"
              >
                REAL-TIME
              </button>
              <button
                onClick={() => {
                  setIsStepMode(true);
                  setIsPlaying(false);
                  setAlertText("Switched to Turn-Based. Snake steps only on key button hits.");
                  audioSystem.playClick();
                }}
                className={`text-[10px] font-bold py-1 px-3 rounded transition-all tracking-wider ${
                  isStepMode 
                    ? 'bg-amber-500 text-slate-950 font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                id="btn_mode_turnbased"
              >
                TURN-BASED
              </button>
            </div>

            {/* Difficulty Mode Selector */}
            <div className="flex items-center gap-0.5 bg-slate-950 p-1 border border-slate-900 rounded-lg animate-fade-in" id="control_difficulty_selector" title="Game Difficulty">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider pl-1.5 pr-1">
                DIFF:
              </span>
              <button
                onClick={() => changeDifficulty('easy')}
                className={`text-[10px] font-bold py-1 px-2.5 rounded transition-all tracking-wider ${
                  difficulty === 'easy'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                id="btn_diff_easy"
                title="Easy Mode: Slower slither, 50% fewer traps, extra generous challenge time"
              >
                EASY
              </button>
              <button
                onClick={() => changeDifficulty('medium')}
                className={`text-[10px] font-bold py-1 px-2.5 rounded transition-all tracking-wider ${
                  difficulty === 'medium'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-black'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                id="btn_diff_medium"
                title="Medium Mode: Standard settings and normal traps"
              >
                MEDIUM
              </button>
              <button
                onClick={() => changeDifficulty('hard')}
                className={`text-[10px] font-bold py-1 px-2.5 rounded transition-all tracking-wider ${
                  difficulty === 'hard'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                id="btn_diff_hard"
                title="Hard Mode: Turbo speed, extra procedurally seeded laser patrols, tight countdown time limits"
              >
                🔥 HARD
              </button>
            </div>

            <button
              onClick={() => {
                const nextVal = !isTimeChallenge;
                setIsTimeChallenge(nextVal);
                setIsPlaying(false);
                setAlertText(nextVal ? "TIME ATTACK ACTIVATED! Outrun the decay clock and stack high-speed step multipliers!" : "Time Attack deactivated.");
                audioSystem.playClick();
                
                let baseTime = activeLevel ? Math.max(25, Math.ceil(activeLevel.parMoves * 1.5)) : 30;
                if (difficulty === 'easy') {
                  baseTime = Math.ceil(baseTime * 1.5); // 50% more time
                } else if (difficulty === 'hard') {
                  baseTime = Math.ceil(baseTime * 0.7); // 30% tighter limit
                }
                setTimeRemaining(baseTime);
                setTimeMultiplier(1.0);
              }}
              className={`text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all tracking-wider flex items-center gap-1.5 ${
                isTimeChallenge
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-black shadow-lg shadow-rose-950/20'
                  : 'bg-slate-950 border border-slate-900 text-slate-400 hover:text-white'
              }`}
              id="btn_toggle_timeattack"
            >
              ⏱️ TIME CHALLENGE: {isTimeChallenge ? "ON" : "OFF"}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {!isStepMode && (
              <>
                <button
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    audioSystem.playClick();
                  }}
                  disabled={isGameOver || isLevelCompleted}
                  className={`py-1.5 px-3 rounded.5 font-bold text-xs border flex items-center gap-1.5 transition-colors ${
                    isPlaying 
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20' 
                      : 'bg-emerald-500 text-slate-950 border-transparent hover:bg-emerald-400'
                  }`}
                  id="btn_play_pause"
                >
                  {isPlaying ? (
                    <>
                      <Pause size={12} /> PAUSE
                    </>
                  ) : (
                    <>
                      <Play size={12} /> SNAKE RUN
                    </>
                  )}
                </button>
              </>
            )}

            {isStepMode && (
              <span className="text-[10px] font-mono text-amber-400/90 mr-1.5 animate-pulse">
                🎮 WAITING FOR MOVE INSTRUCTIONS
              </span>
            )}

            <button
              onClick={triggerHint}
              disabled={hasUsedHint || isGameOver || isLevelCompleted || isGameBeaten}
              className={`py-1.5 px-3 rounded font-bold text-xs border flex items-center gap-1.5 transition-all ${
                hasUsedHint 
                  ? 'bg-slate-900 border-slate-950 text-slate-500 cursor-not-allowed opacity-50' 
                  : isHintActive 
                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-300 animate-pulse font-black shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                    : 'bg-purple-500/10 hover:bg-purple-500 hover:text-slate-950 text-purple-400 border-purple-500/30'
              }`}
              id="btn_get_hint"
              title={hasUsedHint ? "Hint already exhausted for this level" : "Display a faint overlay pathway guiding you for 3 seconds (Limit 1 per level)"}
            >
              <Lightbulb size={12} className={isHintActive ? 'animate-bounce' : ''} />
              {isHintActive ? "REVEALING..." : hasUsedHint ? "HINT COLD" : "GET HINT"}
            </button>

            <button
              onClick={() => initLevel(currentLevelIdx)}
              className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded text-slate-300 transition-colors"
              title="Reset Area"
              id="btn_reset_main"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
          </>
        ) : (
          /* LOBBY DASHBOARD SCREEN WHEN OFFLINE */
          <div className="flex flex-col flex-1 justify-between gap-6 py-2" id="lobby_dashboard_view">
            {/* Welcome Banner */}
            <div className="flex flex-col text-center sm:text-left">
              {userName && (
                <div className="mb-2.5 inline-flex items-center justify-center sm:justify-start gap-2 font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg max-w-max self-center sm:self-start shadow-[0_0_15px_rgba(16,185,129,0.06)] animate-fade-in uppercase tracking-[0.15em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>SECURE CHANNEL DETECTED: WELCOME OPERATOR {userName}</span>
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 tracking-wider font-display uppercase leading-none">
                REVERSE SNAKE MATRIX
              </h2>
              <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">
                Command Central • Simulation Deck
              </p>
              <p className="text-xs text-slate-450 mt-3 leading-relaxed max-w-xl">
                Initiate cybernetic bypass sequence. Shed trailing body segments, navigate laser gates, and guide the compression head safely into exit wormholes. Complete sector simulations to claim elite core ranks.
              </p>
            </div>

            {/* Central START SIMULATION Glow Action */}
            <div className="flex flex-col items-center justify-center p-5 border border-emerald-500/15 bg-emerald-950/5 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.04)] my-1">
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] opacity-50 block" />
              
              <button
                onClick={() => {
                  setInSession(true);
                  initLevel(currentLevelIdx, true);
                }}
                className="w-full max-w-md py-4.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black font-display text-sm sm:text-base rounded-xl uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/15 hover:shadow-emerald-500/30 transition-all duration-300 text-center group flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-[#10b981]/25 active:scale-[0.98]"
                id="btn_lobby_start_playing"
              >
                <span className="flex items-center gap-2">
                  🚀 START PLAYING GAME <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-[8.5px] font-mono font-bold tracking-widest text-[#0c241c] uppercase">
                  Launch {userName ? `${userName}'s` : 'Operator'} Grid Session
                </span>
              </button>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center mt-3">
                Pressing start loads <span className="text-emerald-400 font-bold">LEVEL {activeLevel.id}: {activeLevel.name}</span>
              </p>
            </div>

            {/* Dynamic Configuration Loadout Deck */}
            <div className="bg-[#060614] border border-[#14142d] rounded-xl p-4 flex flex-col gap-3 font-mono text-xs">
              <h3 className="text-[10px] text-slate-450 uppercase font-black tracking-widest border-b border-slate-900/60 pb-2 flex items-center justify-between">
                <span>🛰️ DEPLOYMENT LOADOUT STATUS</span>
                <span className="text-[8px] text-emerald-400 animate-pulse font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                  CHANNELS SECURE
                </span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Active Sector</span>
                  <span className="text-white font-bold block truncate capitalize tracking-wide text-[11px]">
                    {activeLevel.id}. {activeLevel.name}
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5 font-bold">
                    Par moves: {activeLevel.parMoves}
                  </span>
                </div>

                <div className="bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Difficulty Mode</span>
                  <span className={`font-bold block tracking-wide uppercase text-[11px] ${
                    difficulty === 'easy' ? 'text-emerald-400' : difficulty === 'medium' ? 'text-cyan-400' : 'text-rose-500'
                  }`}>
                    ◆ {difficulty}
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5 font-bold">
                    {difficulty === 'easy' ? 'Reduced traps (50%)' : difficulty === 'medium' ? 'Standard simulation' : 'Extra core traps'}
                  </span>
                </div>

                <div className="bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Engine Throttle</span>
                  <span className="text-indigo-400 font-bold block tracking-wide uppercase text-[11px]">
                    {isStepMode ? '⏹️ turn-based' : '⚡ real-time'}
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5 font-bold">
                    {isStepMode ? 'Manual key step' : 'Continuous flow'}
                  </span>
                </div>

                <div className="bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Operator Profile</span>
                  <span className="text-teal-400 font-bold block truncate capitalize tracking-wide text-[11px]">
                    {userName || 'Guest Operator'}
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5">
                    Streak: {dailyStreak} Days
                  </span>
                </div>

                <div className="bg-slate-900/20 border border-[#14142d] p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Active Core Skin</span>
                  <span className="text-white font-bold block truncate capitalize tracking-wide text-[11px]">
                    🎨 {selectedSkinId} plasma
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5">
                    Visual theme core
                  </span>
                </div>

                <div className="bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] text-slate-550 uppercase block mb-1">Session score</span>
                  <span className="text-yellow-400 font-bold block truncate tracking-wide text-[11px]">
                    ★ {sessionScore} pts
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5">
                    Cumulative score
                  </span>
                </div>
              </div>

              <div className="text-[9.5px] text-slate-400 border border-slate-900/60 bg-black/40 px-3 py-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 leading-normal text-left">
                <span>👉 Choose other sectors, switch game modes, skin palettes, custom sandbox, or view high score ranks using the panels on the right!</span>
                <span className="text-teal-400 font-bold shrink-0">MATRIX v1.0</span>
              </div>
            </div>

            {/* Interactive Operations Manual Tab Deck */}
            <div className="bg-[#04040a] border border-[#14142d] rounded-2xl p-4.5 flex flex-col gap-3.5" id="lobby_operations_manual">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 font-display font-bold text-xs uppercase tracking-wider text-slate-200">
                  <span className="w-2 h-2 rounded bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                  <span>💡 Operations Flight Manual</span>
                </div>
                
                {/* Dynamic Tab Triggers */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-900 rounded-lg">
                  <button
                    onClick={() => setLobbyGuideTab('mechanics')}
                    className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded transition-all cursor-pointer ${
                      lobbyGuideTab === 'mechanics' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20 shadow-sm' 
                        : 'text-slate-450 hover:text-slate-305'
                    }`}
                  >
                    ⚙️ HOW IT WORKS
                  </button>
                  <button
                    onClick={() => setLobbyGuideTab('features')}
                    className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded transition-all cursor-pointer ${
                      lobbyGuideTab === 'features' 
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/20 shadow-sm' 
                        : 'text-slate-450 hover:text-slate-305'
                    }`}
                  >
                    🌀 FEATURES
                  </button>
                  <button
                    onClick={() => setLobbyGuideTab('controls')}
                    className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase rounded transition-all cursor-pointer ${
                      lobbyGuideTab === 'controls' 
                        ? 'bg-purple-950 text-purple-400 border border-purple-500/20 shadow-sm' 
                        : 'text-slate-450 hover:text-slate-305'
                    }`}
                  >
                    🎮 CONTROLS & MANEUVERS
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[140px] flex flex-col justify-center">
                {lobbyGuideTab === 'mechanics' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                    id="guide_mechanics_content"
                  >
                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🔄</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Inverted Length Challenge</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Standard snake grows upon feeding, but in this matrix <span className="text-orange-400 font-bold">Body Length is a Liability</span>. The longer you slither, the wider your core expands, risking crash hazards!
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">⚡</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Optimization Cutters</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Glide your snake's red plasma heading onto orange glowing <span className="text-orange-400 font-bold">Cutters</span>. Consuming them immediately deconstructs and reduces your trailing segment length safely!
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🧱</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Strict Grid Barriers</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Avoid slamming into outer grid boundaries, static obsidian barriers, or active sector blocks. Any physical connection causes immediate system flatline!
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🌀</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Vortex Evacuation</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Reach the exit vortex (glowing spinning cyan loop) to successfully evacuate. The level gates strictly analyze weight: <span className="text-cyan-400 font-bold">exit is only open if your body fits length requirements!</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {lobbyGuideTab === 'features' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                    id="guide_features_content"
                  >
                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🛠️</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Sandbox grid Constructor</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Design custom physical barriers! Switch to the <span className="text-purple-400 font-bold">Sandbox Tab</span> on the right sidebar to paint barriers, scatter decompressors, construct custom loops, and test them instantly.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">⚡</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Dual Engine Throttle</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Unrestricted continuous slithering in <span className="text-cyan-400">Real-Time Continuous loop</span> or calculate exact spatial decisions under the turn-based <span className="text-amber-400">Step-by-Step Tactical Mode</span>.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🎨</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Skins customization</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Access the <span className="text-teal-400 font-bold">Skins Tab</span> on the side to unlock cosmetic plasma trail colors: Neon Cyber, Liquid Emerald, Solar Gold, Crimson Core, and Icebound Glacier!
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🛰️</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Time Attack & audio channels</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Enable Time challenge to force high-pressure rapid-thinking countdown limits, and toggle through multiple dark synth audio track feeds (Alpha, Beta, Gamma).
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {lobbyGuideTab === 'controls' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                    id="guide_controls_content"
                  >
                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">⌨️</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Steering Controls</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          Command movement using standard <kbd className="bg-slate-900 border border-slate-750 px-1 py-0.5 rounded text-white text-[9px] font-sans">WASD Keys</kbd> or <kbd className="bg-slate-900 border border-slate-750 px-1 py-0.5 rounded text-white text-[9px] font-sans">Arrow Keys</kbd> on desktop keyboard.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">📱</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Mobile D-PAD HUD</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          No keyboard? Tap the <span className="text-rose-400 font-bold">D-PAD</span> button in the HUD controls to toggle floating or fixed tactile controllers directly on your screen (responsive on both views).
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🏆</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Efficiency Formulas</h4>
                        <p className="text-[10px] text-slate-405 mt-1 leading-normal font-mono">
                          Score is computed in inverse relation to your total keysteps. Navigating the perfect shortest path registers prestigious <span className="text-yellow-400 font-bold">Gold Medal sector clears</span>!
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#070716] border border-[#16162d]/65 p-3 rounded-xl flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">⌨️</span>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display text-[11px] uppercase tracking-wide">Instantaneous Level Advance</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                          When a sector is clean and the level completed overlay is showing, press <kbd className="bg-slate-900 border border-slate-750 px-1 py-0.5 rounded text-white text-[9px] font-sans">ENTER</kbd> on your keyboard or select next level to immediately trigger transition warp!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: TABBED SYSTEM FOR LEVELS & WORLD RANKINGS */}
      <div className={`w-full lg:w-80 flex-col gap-6 shrink-0 ${inSession ? 'hidden' : 'flex'}`} id="navigation_controls_sidecolumn">
        {/* On-screen tactile tactile joystick button pad */}
        {renderDPad(false)}

        {/* Operator Profile and Daily Streak deck */}
        <div className="bg-[#050510] border-2 border-emerald-500/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden" id="operator_profile_deck">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
          
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Terminal size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Operator Matrix Ident
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowOnboardingGuide(true);
                      audioSystem.playWarp();
                    }}
                    className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 transition-colors uppercase font-bold"
                    aria-label="Operator Training Manual"
                    title="Operator Training Manual"
                  >
                    [MANUAL 📖]
                  </button>
                  <button
                    onClick={() => setShowNamePrompt(true)}
                    className="text-[9px] font-mono text-slate-500 hover:text-emerald-400 transition-colors uppercase font-bold"
                    title="Modify Nickname"
                  >
                    [RE-IDENT]
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider truncate font-display">
                {userName || 'LOG IN REQUIRED'}
              </h3>
            </div>
          </div>

          {/* Interactive Streak Counter */}
          <div className="mt-4 pt-3.5 border-t border-[#13112a] flex flex-col gap-2.5 relative z-10" id="deck_streak_section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase">
                <span>Daily Core Sync Streak</span>
              </div>
              <span className={`text-xs font-black font-mono flex items-center gap-1 px-1.5 py-0.5 rounded ${
                dailyStreak > 0 ? 'bg-orange-500/15 text-orange-400 animate-pulse' : 'bg-slate-900 text-slate-500'
              }`}>
                🔥 {dailyStreak} {dailyStreak === 1 ? 'DAY' : 'DAYS'}
              </span>
            </div>

            {/* Streak Bonus Progress/Visual Panel */}
            <div className="bg-[#030308] border border-[#141426] rounded-xl p-2.5 flex items-center gap-3">
              <div className="flex flex-col items-center justify-center bg-orange-500/5 border border-orange-500/20 rounded-lg py-1 px-2 shrink-0">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight block">Mult. Gain</span>
                <span className="text-xs font-black text-orange-400 font-sans">
                  {getStreakMultiplier(dailyStreak).toFixed(1)}x
                </span>
              </div>
              <div className="flex-1">
                {dailyStreak > 0 ? (
                  <p className="text-[9.5px] text-slate-400 font-mono leading-tight">
                    Your cyber streak is active! Multiplier applied to level decompression scores.
                  </p>
                ) : (
                  <p className="text-[9.5px] text-slate-500 font-mono leading-tight">
                    Complete any level today to forge a 1.1x streak multiplier bonus tomorrow!
                  </p>
                )}
              </div>
            </div>

            {/* Milestone scale tracking reference */}
            <div className="grid grid-cols-4 gap-1 mt-1 text-[8px] font-mono text-center text-slate-500 font-semibold uppercase">
              <div className={`py-0.5 rounded border ${dailyStreak >= 2 ? 'border-orange-500/30 bg-orange-500/5 text-orange-400' : 'border-slate-800 bg-black/40'}`}>
                2D: 1.1x
              </div>
              <div className={`py-0.5 rounded border ${dailyStreak >= 3 ? 'border-orange-500/30 bg-orange-500/5 text-orange-400' : 'border-slate-800 bg-black/40'}`}>
                3D: 1.2x
              </div>
              <div className={`py-0.5 rounded border ${dailyStreak >= 4 ? 'border-orange-500/30 bg-orange-500/5 text-orange-400' : 'border-slate-800 bg-black/40'}`}>
                4D: 1.3x
              </div>
              <div className={`py-0.5 rounded border ${dailyStreak >= 5 ? 'border-orange-500/30 bg-orange-500/5 text-orange-400' : 'border-slate-800 bg-black/40'}`}>
                5D+: 1.5x
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Panel */}
        <div className="bg-[#05050a] border border-[#1a1a2e] rounded-2xl p-5 shadow-2xl flex-1 flex flex-col" id="level_selector_panel">
          {/* Tab Button Toggles */}
          <div className="flex gap-1 bg-black p-1 border border-slate-950 rounded-lg mb-4" id="sidebar_tabs_header">
            <button
              onClick={() => {
                setActiveTab('levels');
                setIsSandboxMode(false);
              }}
              className={`flex-1 text-center py-1 text-[11px] font-bold font-display rounded transition-all uppercase flex items-center justify-center gap-0.5 ${
                activeTab === 'levels' && !isSandboxMode
                  ? 'bg-slate-900 text-white font-black' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              id="tab_trigger_levels"
            >
              🎮 Lvl
            </button>
            <button
              onClick={() => {
                setActiveTab('leaderboard');
                fetchRankings();
                setIsSandboxMode(false);
              }}
              className={`flex-1 text-center py-1 text-[11px] font-bold font-display rounded transition-all uppercase flex items-center justify-center gap-0.5 ${
                activeTab === 'leaderboard' 
                  ? 'bg-slate-900 text-teal-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              id="tab_trigger_leaderboard"
            >
              🏆 Rank
            </button>
            <button
              onClick={() => {
                setActiveTab('skins');
                setIsSandboxMode(false);
              }}
              className={`flex-1 text-center py-1 text-[11px] font-bold font-display rounded transition-all uppercase flex items-center justify-center gap-0.5 ${
                activeTab === 'skins' 
                  ? 'bg-slate-900 text-cyan-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              id="tab_trigger_skins"
            >
              🎨 Skin
            </button>
            <button
              onClick={() => {
                setActiveTab('constructor');
                setIsSandboxMode(true);
              }}
              className={`flex-1 text-center py-1 text-[11px] font-bold font-display rounded transition-all uppercase flex items-center justify-center gap-0.5 ${
                activeTab === 'constructor' || isSandboxMode
                  ? 'bg-slate-900 text-purple-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              id="tab_trigger_constructor"
            >
              🛠️ Sandbox
            </button>
          </div>

          {/* TAB 1: LEVELS LISTS */}
          {activeTab === 'levels' && (
            <div className="flex-1 flex flex-col justify-between" id="tab_body_levels">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    System Levels Sector
                  </h3>
                  <span className="text-[9.5px] font-mono text-cyan-400 uppercase font-black tracking-widest">
                    [Progress: {completedLevels.filter(Boolean).length}/{LEVELS.length}]
                  </span>
                </div>

                {/* DAILY CHALLENGE SECTION */}
                <div 
                  className={`p-3.5 rounded-xl border mb-4 text-left transition-all relative overflow-hidden ${
                    isDailyChallenge 
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                      : 'bg-gradient-to-br from-slate-950 to-[#0c081a] border-purple-900/20 hover:border-purple-800/40'
                  }`}
                  id="daily_challenge_card"
                >
                  <div className="absolute top-0 right-0 p-1.5 font-mono text-[7px] uppercase tracking-widest bg-purple-900/30 text-purple-300 rounded-bl border-l border-b border-purple-500/10">
                    Daily Mode
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">📅</span>
                    <h4 className="text-[11px] font-black font-display text-white uppercase tracking-tight">
                      Grid Solar Challenge
                    </h4>
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono mb-2.5 leading-relaxed">
                    A newly compiled solar matrix rotates every 24h. Perfect your trajectory in the fewest moves!
                  </p>
                  
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="font-mono text-[8px] text-slate-400">
                      {dailyCompleted ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ COMPLETED {dailyBestMoves ? `(${dailyBestMoves} MOVES)` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          STATUS: PENDING
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isDailyChallenge) {
                          setIsDailyChallenge(false);
                          audioSystem.playClick();
                        } else {
                          loadDailyChallenge();
                          audioSystem.playClick();
                        }
                      }}
                      className={`text-[9px] font-bold font-mono px-2.5 py-1 rounded border transition-all uppercase tracking-wider cursor-pointer ${
                        isDailyChallenge 
                          ? 'bg-purple-900/30 border-purple-500/20 hover:bg-purple-900/50 text-purple-300' 
                          : 'bg-purple-500 border-purple-600 hover:bg-purple-400 hover:border-purple-500 text-slate-950 font-extrabold shadow-sm'
                      }`}
                      id="btn_play_daily_challenge"
                    >
                      {isDailyChallenge ? '🛑 Exit' : '⚡ PLAY'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2" id="grid_level_buttons">
                  {LEVELS.map((level, idx) => {
                    const isActive = idx === currentLevelIdx && !isDailyChallenge;
                    const isCompleted = completedLevels[idx];
                    return (
                      <button
                        key={level.id}
                        onClick={() => {
                          setCurrentLevelIdx(idx);
                          setIsDailyChallenge(false);
                          audioSystem.playClick();
                        }}
                        className={`p-3 text-left rounded-xl transition-all border flex flex-col justify-between cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/5 border-cyan-400/30 text-white' 
                            : isCompleted
                              ? 'bg-slate-950/60 border-emerald-950 text-slate-300 hover:bg-slate-950 hover:border-slate-800'
                              : 'bg-black border-slate-950 hover:bg-slate-950 hover:border-slate-850 text-slate-300'
                        }`}
                        id={`btn_level_item_${level.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[9px] font-mono opacity-70">
                            SEC {level.id} {isCompleted && <span className="text-emerald-400 font-bold ml-1">✓</span>}
                          </span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow shadow-cyan-400 animate-pulse" />}
                        </div>
                        <span className="text-xs font-bold truncate tracking-tight font-display mt-1 block uppercase">
                          {level.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-950 text-[10px] text-slate-500 font-mono flex items-center justify-between" id="panel_meta_footer">
                <span>SECTOR: GRID ESP</span>
                <span>REVERSE SNAKE v2.0</span>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL LEADERBOARD WORLD RATINGS */}
          {activeTab === 'leaderboard' && (
            <div className="flex-1 flex flex-col justify-between" id="tab_body_leaderboard">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    High Score Board
                  </span>
                  <button
                    onClick={fetchRankings}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-black px-2 py-0.5 border border-slate-900 rounded font-mono transition-colors"
                    disabled={isLoadingRankings}
                    id="btn_refresh_rankings"
                  >
                    <RefreshCw size={9} className={isLoadingRankings ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {/* Score Category Selector */}
                <div className="grid grid-cols-2 gap-1 bg-black p-1 border border-slate-950 rounded mb-3" id="rankings_category_toggle">
                  <button
                    onClick={() => {
                      setLeaderboardFilter('world');
                      audioSystem.playClick();
                    }}
                    className={`text-[9px] font-mono py-1 rounded text-center transition-colors uppercase ${
                      leaderboardFilter === 'world' 
                        ? 'bg-slate-900 text-teal-400 font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    🏆 World Ratings
                  </button>
                  <button
                    onClick={() => {
                      setLeaderboardFilter('daily');
                      audioSystem.playClick();
                    }}
                    className={`text-[9px] font-mono py-1 rounded text-center transition-colors uppercase ${
                      leaderboardFilter === 'daily' 
                        ? 'bg-purple-950/20 text-purple-300 font-bold border border-purple-500/10' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    📅 Daily Challenge
                  </button>
                </div>

                {isLoadingRankings ? (
                  <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-500 font-mono">
                    Retrieving global files...
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-xl mb-1">🏁</span>
                    <p className="text-xs text-slate-500 font-mono">No submissions yet.<br/>Be the first to record a score!</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[200px] space-y-1.5 pr-1 text-xs" id="rankings_scroller">
                    {leaderboard.map((item, index) => {
                      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2 bg-black hover:bg-slate-900 border border-slate-950 rounded transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-mono text-[10px] text-slate-500 text-center font-bold">
                              {medal || `${index + 1}`}
                            </span>
                            <span className="font-bold text-white font-mono tracking-tighttruncate max-w-[110px]">
                              {item.name}
                            </span>
                          </div>
                          
                          <div className="text-right font-mono">
                            <span className="font-bold text-cyan-400 text-[11px] block text-right">
                              {leaderboardFilter === 'daily' ? `${item.movesTaken} MOVES` : item.score}
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {leaderboardFilter === 'daily' 
                                ? `DAILY ${String(item.levelReached).substring(4, 6)}/${String(item.levelReached).substring(6, 8)}` 
                                : `LVL 0${item.levelReached}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-950 text-[10px] text-center font-mono text-slate-500 flex items-center justify-center gap-1.5">
                <span>🛡️ Persistent scoreboard online</span>
              </div>
            </div>
          )}

          {/* TAB 3: COSMETICS SKIN LIBRARY */}
          {activeTab === 'skins' && (
            <div className="flex-1 flex flex-col justify-between" id="tab_body_skins">
              <div className="space-y-3">
                <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                  Adapt your quantum core's presentation matrix. Unlock vibrant high-emission cosmetics by advancing through map sectors:
                </p>
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1" id="skins_selection_scroller">
                  {SKINS.map((s) => {
                    const currentUnlockedLevel = currentLevelIdx + 1;
                    const isUnlocked = currentUnlockedLevel >= s.levelRequired;
                    const isSelected = selectedSkinId === s.id;

                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedSkinId(s.id);
                            audioSystem.playClick();
                          } else {
                            audioSystem.playGateBlocked();
                          }
                        }}
                        className={`p-2 text-left rounded-xl border flex items-center justify-between w-full transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400/40 text-white'
                            : isUnlocked
                            ? 'bg-black border-slate-900 hover:bg-slate-955 hover:border-slate-800 text-slate-300'
                            : 'bg-black/40 border-slate-950 opacity-45 text-slate-500 cursor-not-allowed'
                        }`}
                        id={`btn_skin_item_${s.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Circle preview */}
                          <div className="flex items-center gap-0.5 shrink-0 bg-slate-950 border border-slate-900 p-1 rounded-md">
                            <span 
                              className="w-2 h-2 rounded-full block animate-pulse" 
                              style={{ 
                                backgroundColor: s.id === 'rainbow' ? '#ec4899' : s.headColor,
                              }} 
                            />
                            <span 
                              className="w-1.5 h-1.5 rounded-full block" 
                              style={{ backgroundColor: s.id === 'rainbow' ? '#eab308' : s.bodyColor }} 
                            />
                          </div>

                          <div className="truncate text-left">
                            <span className="text-xs font-bold font-display uppercase tracking-tight block">
                              {s.name}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              {isUnlocked ? 'Unlocked' : `Locked: Reach Level ${s.levelRequired}`}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <span className="text-cyan-400 text-[9px] font-mono font-bold uppercase py-0.5 px-1.5 bg-cyan-500/10 border border-cyan-500/25 rounded">
                              Equipped
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-slate-400 text-[9px] font-mono uppercase bg-slate-900 px-1 py-0.5 rounded border border-slate-800 hover:text-white">
                              Equip
                            </span>
                          ) : (
                            <span className="text-rose-500/80 text-[8.5px] font-mono font-bold flex items-center gap-0.5">
                              🔒 Lck
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-950 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>SECTOR: SLITHER MATRICES</span>
                <span>CUSTOM CHASSIS SKIN</span>
              </div>
            </div>
          )}

          {/* TAB 4: REVERSED SANDBOX CONSTRUCTOR */}
          {activeTab === 'constructor' && (
            <div className="flex-1 flex flex-col justify-between" id="tab_body_constructor">
              <div className="space-y-4">
                <div className="border border-purple-500/10 bg-purple-500/5 p-3 rounded-xl animate-fade-in">
                  <h4 className="text-[11px] font-black text-purple-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={11} className="animate-spin" />
                    REVERSED SANDBOX CONSTRUCTOR
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Set customized parameters and let the procedural engine compute a perfectly partitioned level instantly!
                  </p>
                </div>

                {/* SLIDERS CONTAINER */}
                <div className="space-y-2.5 bg-[#0a0a14] border border-slate-900 rounded-xl p-3 font-mono text-[9.5px]">
                  {/* Grid Width */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>GRID WIDTH:</span>
                      <span className="text-white font-bold">{sandboxWidth} CELLS</span>
                    </div>
                    <input 
                      type="range" min={10} max={18} step={1}
                      value={sandboxWidth}
                      onChange={(e) => {
                        setSandboxWidth(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Grid Height */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>GRID HEIGHT:</span>
                      <span className="text-white font-bold">{sandboxHeight} CELLS</span>
                    </div>
                    <input 
                      type="range" min={8} max={12} step={1}
                      value={sandboxHeight}
                      onChange={(e) => {
                        setSandboxHeight(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Starting Length */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>START SNAKE LENGTH:</span>
                      <span className="text-white font-bold">{sandboxStartLength} SEGMENTS</span>
                    </div>
                    <input 
                      type="range" min={6} max={22} step={1}
                      value={sandboxStartLength}
                      onChange={(e) => {
                        setSandboxStartLength(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Wall Density */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>WALL DENSITY:</span>
                      <span className="text-purple-400 font-bold">{sandboxWallDensity}%</span>
                    </div>
                    <input 
                      type="range" min={0} max={30} step={5}
                      value={sandboxWallDensity}
                      onChange={(e) => {
                        setSandboxWallDensity(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full h-1 accent-purple-500 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Cutter Count */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>BODY TAIL CUTTERS:</span>
                      <span className="text-orange-400 font-bold">{sandboxCutterCount} SYSTEMS</span>
                    </div>
                    <input 
                      type="range" min={1} max={4} step={1}
                      value={sandboxCutterCount}
                      onChange={(e) => {
                        setSandboxCutterCount(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Trap count */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>PATROLLING THREAT LAZERS:</span>
                      <span className="text-rose-400 font-bold">{sandboxTrapCount} UNITS</span>
                    </div>
                    <input 
                      type="range" min={0} max={4} step={1}
                      value={sandboxTrapCount}
                      onChange={(e) => {
                        setSandboxTrapCount(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Gate count */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>GATE RESTRICTOR BLOCKS:</span>
                      <span className="text-amber-400 font-bold">{sandboxGateCount} BLOCKS</span>
                    </div>
                    <input 
                      type="range" min={1} max={2} step={1}
                      value={sandboxGateCount}
                      onChange={(e) => {
                        setSandboxGateCount(Number(e.target.value));
                        audioSystem.playClick();
                      }}
                      className="w-full accent-purple-500 h-1 bg-black rounded cursor-pointer"
                    />
                  </div>

                  {/* Quantum Portal Option */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-950">
                    <span className="text-slate-400">DEPLOY PORTAL PAIRS:</span>
                    <button
                      onClick={() => {
                        setSandboxHasPortals(!sandboxHasPortals);
                        audioSystem.playClick();
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        sandboxHasPortals 
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                          : 'bg-black border-slate-800 text-slate-500'
                      }`}
                    >
                      {sandboxHasPortals ? 'ACTIVE' : 'DEACTIVATED'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={generateSandboxLevel}
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.25)] flex items-center justify-center gap-1.5 transition-transform active:scale-95 uppercase font-display"
                  id="btn_sandbox_deploy_trigger"
                >
                  <RefreshCw size={12} className="animate-spin" />
                  COMPILE & DEPLOY CORE
                </button>
              </div>

              {customSandboxLevel && (
                <div className="mt-3 p-2 bg-purple-950/10 border border-purple-500/15 rounded-lg text-left">
                  <span className="text-[10px] font-mono text-purple-400 block font-bold leading-tight uppercase">
                    Active Custom Sandbox Level:
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5 block line-clamp-1">
                    {customSandboxLevel.description}
                  </span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-950 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>SECTOR: SANDBOX EDITOR</span>
                <span className="text-purple-400/90 font-bold uppercase animate-pulse">DEPLOY CONFIRMED</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);
}
