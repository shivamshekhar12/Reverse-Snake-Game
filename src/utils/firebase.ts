/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, orderBy, limit, query, collection, serverTimestamp, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LeaderboardType } from '../types';

let db: any = null;
let isFirebaseActive = false;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    isFirebaseActive = true;
    console.log("Firebase successfully configured for rankings!");
  } catch (e) {
    console.warn("Firebase config is present but failed to connect. Falling back to local storage.", e);
  }
} else {
  console.log("Firebase not yet provisioned. Leaderboard defaults to offline storage.");
}

export { db, isFirebaseActive };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  levelReached: number;
  movesTaken: number;
  type?: LeaderboardType;
  createdAt?: any;
}

const LOCAL_LEADERBOARD_KEY = 'reverse_snake_leaderboard_scores';
const DAILY_CHALLENGE_THRESHOLD = 20000000;

// Mock/Initial leaderboard if empty to make the experience lively and competitive
const DEFAULT_SCORES: LeaderboardEntry[] = [
  { id: '1', name: 'CyberSlither', score: 12000, levelReached: 8, movesTaken: 120 },
  { id: '2', name: 'NanoSqueeze', score: 9400, levelReached: 6, movesTaken: 95 },
  { id: '3', name: 'ShedTails', score: 7100, levelReached: 5, movesTaken: 88 },
  { id: '4', name: 'PixelCutter', score: 5300, levelReached: 4, movesTaken: 62 },
  { id: '5', name: 'GridWrangler', score: 3200, levelReached: 3, movesTaken: 45 }
];

// Read leaderboard rankings
export async function getLeaderboard(challengeDateInt?: number): Promise<LeaderboardEntry[]> {
  if (isFirebaseActive && db) {
    const colPath = 'leaderboard';
    try {
      let q;
      if (challengeDateInt !== undefined) {
        // Query specifically for the daily challenge entries on this day
        // Using single-field equality check to avoid requiring composite indexes!
        q = query(collection(db, colPath), where('type', '==', LeaderboardType.DAILY), where('levelReached', '==', challengeDateInt), limit(100));
      } else {
        // Standard global high score list: query top entries sorted by score desc
        q = query(collection(db, colPath), where('type', '==', LeaderboardType.STANDARD), orderBy('score', 'desc'), limit(150));
      }

      const querySnapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        entries.push({
          id: doc.id,
          name: data.name ?? 'Anonymous',
          score: typeof data.score === 'number' ? data.score : (Number(data.score) || 0),
          levelReached: typeof data.levelReached === 'number' ? data.levelReached : (Number(data.levelReached) || 1),
          movesTaken: typeof data.movesTaken === 'number' ? data.movesTaken : (Number(data.movesTaken) || 0),
          type: data.type,
        });
      });

      if (challengeDateInt !== undefined) {
        // Sort clientside to arrange few-moves first (score descending)
        return entries.sort((a, b) => b.score - a.score).slice(0, 15);
      } else {
        // Filter out Daily Challenge entries
        return entries.filter(item => item.type === LeaderboardType.STANDARD || item.levelReached < 20).sort((a, b) => b.score - a.score).slice(0, 15);
      }
    } catch (e: any) {
      console.error("Firestore retrieval error, serving fallback:", e);
      if (e && (e.code === 'permission-denied' || (e.message && e.message.includes('permission')))) {
        handleFirestoreError(e, OperationType.LIST, colPath);
      }
    }
  }

  // Local Storage Fallback
  try {
    const localData = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData) as LeaderboardEntry[];
        if (!Array.isArray(parsed)) throw new Error('Invalid leaderboard format');
        
        // Filter out invalid items
        const validEntries = parsed.filter(item => 
          item && typeof item === 'object' && 
          typeof item.score === 'number' && typeof item.levelReached === 'number'
        );

        if (challengeDateInt !== undefined) {
          return validEntries.filter(item => (item.type === LeaderboardType.DAILY || item.levelReached >= 20000000) && item.levelReached === challengeDateInt).sort((a, b) => b.score - a.score).slice(0, 15);
        } else {
          return validEntries.filter(item => item.type === LeaderboardType.STANDARD || item.levelReached < 20).sort((a, b) => b.score - a.score).slice(0, 15);
        }
      } catch (parseError) {
        console.error("Corrupted leaderboard data in local storage:", parseError);
        return challengeDateInt !== undefined ? [] : DEFAULT_SCORES;
      }
    } else {
      // Priming with default high scores
      const fallbackScores = challengeDateInt !== undefined ? [] : DEFAULT_SCORES;
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(DEFAULT_SCORES));
      return fallbackScores;
    }
  } catch (e) {
    console.error("LocalStorage error", e);
  }
  return challengeDateInt !== undefined ? [] : DEFAULT_SCORES;
}

// Write high score entry
export async function submitScore(name: string, score: number, levelReached: number, movesTaken: number, type: LeaderboardType = LeaderboardType.STANDARD): Promise<void> {
  // Validate inputs
  if (typeof score !== 'number' || !isFinite(score) || score < 0) {
    throw new Error('Invalid score');
  }
  if (typeof levelReached !== 'number' || !isFinite(levelReached) || levelReached < 1) {
    throw new Error('Invalid level reached');
  }
  if (typeof movesTaken !== 'number' || !isFinite(movesTaken) || movesTaken < 0) {
    throw new Error('Invalid moves taken');
  }

  const sanitizedName = name.trim().slice(0, 15) || 'Anonymous';
  
  // Use crypto for generating a secure random suffix
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const randomId = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const scoreId = `score_${Date.now()}_${randomId}`;

  if (isFirebaseActive && db) {
    try {
      // Ensure we write with exact document id of scoreId to align with our firestore security rule
      await setDoc(doc(db, 'leaderboard', scoreId), {
        id: scoreId,
        name: sanitizedName,
        score: score,
        levelReached: levelReached,
        movesTaken: movesTaken,
        type: type,
        createdAt: serverTimestamp()
      });
      return;
    } catch (e: any) {
      if (e && (e.code === 'permission-denied' || (e.message && e.message.includes('permission')))) {
        handleFirestoreError(e, OperationType.WRITE, `leaderboard/${scoreId}`);
      } else {
        console.error("Failed writing to Firestore, writing local fallback:", e);
      }
    }
  }

  // Local Storage Save
  try {
    const localData = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    let existing: LeaderboardEntry[] = [];
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          existing = parsed;
        }
      } catch (e) {
         console.warn("Invalid local data when saving score.", e);
      }
    }
    if (existing.length === 0) {
      existing = [...DEFAULT_SCORES];
    }
    
    existing.push({
      id: scoreId,
      name: sanitizedName,
      score: score,
      levelReached: levelReached,
      movesTaken: movesTaken,
      type: type,
    });
    const sorted = existing.sort((a, b) => b.score - a.score).slice(0, 50); // limit local size
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.error("Failed saving score locally", e);
  }
}
