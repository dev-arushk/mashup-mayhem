// tslint:disable
/* eslint-disable */
import {AVATAR_CATALOG} from './contentLibrary';
import {
  computeLevelFromXp,
  createDefaultMissions,
  getDailyDateKey,
  PlayerProfile,
} from './mashupEngine';

export interface UserAccount {
  id: string;
  username: string;
  usernameLower: string;
  salt: string;
  passwordHash: string;
  createdAt: number;
  profile: PlayerProfile;
  isSeeded?: boolean;
}

export interface GlobalLeaderboardEntry {
  id: string;
  username: string;
  avatarId: string;
  mayhemLevel: number;
  level: number;
  totalPoints: number;
  bestAnswerScore: number;
  wins: number;
  matchesPlayed: number;
  badge: string;
  isSeeded: boolean;
  isCurrentUser: boolean;
  rank: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  account?: UserAccount;
}

export interface RankClimbResult {
  prevRank: number;
  newRank: number;
  rankDelta: number;
}

const ACCOUNTS_STORAGE_KEY = 'mashup_mayhem_accounts_v1';
const SESSION_STORAGE_KEY = 'mashup_mayhem_session_v1';
const REMOTE_ENTRIES_STORAGE_KEY = 'mashup_mayhem_remote_lb_v1';

const BLOCKED_USERNAMES = [
  'admin',
  'moderator',
  'stupid',
  'idiot',
  'dumb',
  'jerk',
  'hate',
  'trash',
];

// ============================================================================
// PURE-JS SHA-256 FALLBACK + WEB CRYPTO SALTED HASHING
// ============================================================================
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Pure(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let msg = ascii + '\x80';
  while ((msg.length % 64) - 56) msg += '\x00';
  for (let i = 0; i < msg.length; i++) {
    const j = msg.charCodeAt(i);
    if (j >> 8) {
      // UTF-8 safe byte clamping
      words[i >> 2] |= (j & 0xff) << (((3 - i) % 4) * 8);
    } else {
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash.pop();
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function generateSalt(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  return `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function hashPasswordSalted(
  password: string,
  salt: string,
): Promise<string> {
  const input = `${salt}:${password}`;
  try {
    if (
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.subtle.digest === 'function' &&
      typeof TextEncoder !== 'undefined'
    ) {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall back safely to pure-JS SHA-256
  }
  // Pure-JS UTF-8 string to binary-byte string for sha256Pure
  let utf8 = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      utf8 += String.fromCharCode(code);
    } else if (code < 0x800) {
      utf8 += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      utf8 += String.fromCharCode(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return sha256Pure(utf8);
}

// ============================================================================
// SEEDED RIVAL CONTENDERS (Approved Classic 2D Fictional Persona Handles)
// ============================================================================
export const SEEDED_RIVAL_CONTENDERS: Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  {
    id: 'rival_pickle',
    username: 'ProfessorPickle99',
    avatarId: 'avatar_pickle',
    mayhemLevel: 6,
    level: 8,
    totalPoints: 1420,
    bestAnswerScore: 98,
    wins: 14,
    matchesPlayed: 18,
    badge: 'LEGEND',
    isSeeded: true,
  },
  {
    id: 'rival_astro',
    username: 'AstroCat_X',
    avatarId: 'avatar_astro_cat',
    mayhemLevel: 5,
    level: 7,
    totalPoints: 1185,
    bestAnswerScore: 94,
    wins: 11,
    matchesPlayed: 16,
    badge: 'STAR',
    isSeeded: true,
  },
  {
    id: 'rival_toaster',
    username: 'ToasterKnight',
    avatarId: 'avatar_toaster_knight',
    mayhemLevel: 4,
    level: 6,
    totalPoints: 960,
    bestAnswerScore: 91,
    wins: 9,
    matchesPlayed: 14,
    badge: 'PRO',
    isSeeded: true,
  },
  {
    id: 'rival_octopus',
    username: 'DiscoOctopus',
    avatarId: 'avatar_disco_octopus',
    mayhemLevel: 4,
    level: 5,
    totalPoints: 790,
    bestAnswerScore: 88,
    wins: 7,
    matchesPlayed: 12,
    badge: 'PRO',
    isSeeded: true,
  },
  {
    id: 'rival_taco',
    username: 'DetectiveTaco',
    avatarId: 'avatar_detective_taco',
    mayhemLevel: 3,
    level: 4,
    totalPoints: 615,
    bestAnswerScore: 85,
    wins: 5,
    matchesPlayed: 10,
    badge: 'RISING',
    isSeeded: true,
  },
  {
    id: 'rival_cactus',
    username: 'NinjaCactus',
    avatarId: 'avatar_ninja_cactus',
    mayhemLevel: 2,
    level: 3,
    totalPoints: 440,
    bestAnswerScore: 81,
    wins: 3,
    matchesPlayed: 7,
    badge: 'RISING',
    isSeeded: true,
  },
  {
    id: 'rival_gizmo',
    username: 'GizmoFanatic',
    avatarId: 'avatar_astro_cat',
    mayhemLevel: 2,
    level: 2,
    totalPoints: 260,
    bestAnswerScore: 76,
    wins: 2,
    matchesPlayed: 5,
    badge: 'RIVAL',
    isSeeded: true,
  },
  {
    id: 'rival_spatula',
    username: 'CaptainSpatula',
    avatarId: 'avatar_pickle',
    mayhemLevel: 1,
    level: 2,
    totalPoints: 145,
    bestAnswerScore: 71,
    wins: 1,
    matchesPlayed: 3,
    badge: 'ROOKIE',
    isSeeded: true,
  },
];

// ============================================================================
// VALIDATION & PROFILE BUILDER
// ============================================================================
export function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 18) {
    return 'Username must be 3 to 18 characters.';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Use only letters, numbers, and underscores (_).';
  }
  const lower = trimmed.toLowerCase();
  if (BLOCKED_USERNAMES.some((bad) => lower.includes(bad))) {
    return 'Please choose a friendly studio username.';
  }
  return null;
}

export function validatePassword(raw: string): string | null {
  if (raw.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function createFreshAccountProfile(avatarId: string): PlayerProfile {
  const validAvatar = AVATAR_CATALOG.some((a) => a.id === avatarId)
    ? avatarId
    : 'avatar_pickle';
  const starterUnlocked = ['avatar_pickle', 'avatar_astro_cat', 'avatar_toaster_knight'];
  const unlockedAvatars = starterUnlocked.includes(validAvatar)
    ? starterUnlocked
    : [...starterUnlocked, validAvatar];

  return {
    xp: 0,
    level: 1,
    coins: 120,
    mayhemLevel: 1,
    totalTries: 0,
    equippedAvatarId: validAvatar,
    unlockedAvatars,
    equippedFrame: 'classic',
    unlockedFrames: ['classic'],
    equippedTitle: 'Rookie Improviser',
    wins: 0,
    matchesPlayed: 0,
    winStreak: 0,
    bestAnswerScore: 0,
    totalPoints: 0,
    dailyDate: getDailyDateKey(),
    missions: createDefaultMissions(),
    highlights: [],
    soundMuted: false,
    musicMuted: false,
    reducedMotion: false,
    safeChatFilter: true,
    hasCompletedTutorial: false,
    hasSeenTutorial: false,
    hasSeenIntro: true,
  };
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================
export function loadAllAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((acc) => {
      const today = getDailyDateKey();
      const prof: PlayerProfile = {
        ...createFreshAccountProfile(acc?.profile?.equippedAvatarId || 'avatar_pickle'),
        ...(acc?.profile || {}),
      };
      if (prof.dailyDate !== today) {
        prof.dailyDate = today;
        prof.missions = createDefaultMissions();
      }
      prof.level = computeLevelFromXp(prof.xp || 0);
      return {
        ...acc,
        profile: prof,
      } as UserAccount;
    });
  } catch {
    return [];
  }
}

export function saveAllAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore sandboxed storage quota errors
  }
}

export function getActiveSessionAccountId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionAccountId(accountId: string | null): void {
  try {
    if (accountId) {
      localStorage.setItem(SESSION_STORAGE_KEY, accountId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getCurrentAccount(): UserAccount | null {
  const sessionId = getActiveSessionAccountId();
  if (!sessionId) return null;
  const accounts = loadAllAccounts();
  return accounts.find((a) => a.id === sessionId) || null;
}

export function updateAccountProfileById(
  accountId: string,
  updater: (prev: PlayerProfile) => PlayerProfile,
): UserAccount | null {
  const accounts = loadAllAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;
  const nextProfile = updater(accounts[idx].profile);
  nextProfile.level = computeLevelFromXp(nextProfile.xp);
  const updated: UserAccount = {
    ...accounts[idx],
    profile: nextProfile,
  };
  accounts[idx] = updated;
  saveAllAccounts(accounts);
  return updated;
}

// ============================================================================
// SIGN UP / LOG IN / LOG OUT
// ============================================================================
export async function signUpAccount(params: {
  username: string;
  password: string;
  confirmPassword: string;
  avatarId: string;
}): Promise<AuthResult> {
  const username = params.username.trim();
  const uErr = validateUsername(username);
  if (uErr) return {ok: false, error: uErr};

  const pErr = validatePassword(params.password);
  if (pErr) return {ok: false, error: pErr};

  if (params.password !== params.confirmPassword) {
    return {ok: false, error: 'Passwords do not match!'};
  }

  const usernameLower = username.toLowerCase();
  const accounts = loadAllAccounts();
  if (accounts.some((a) => a.usernameLower === usernameLower)) {
    return {ok: false, error: 'That username is already taken. Try logging in!'};
  }
  if (
    SEEDED_RIVAL_CONTENDERS.some(
      (r) => r.username.toLowerCase() === usernameLower,
    )
  ) {
    return {
      ok: false,
      error: 'That name belongs to a Studio Rival Contender! Pick another.',
    };
  }

  const salt = generateSalt();
  const passwordHash = await hashPasswordSalted(params.password, salt);
  const newAccount: UserAccount = {
    id: `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    username,
    usernameLower,
    salt,
    passwordHash,
    createdAt: Date.now(),
    profile: createFreshAccountProfile(params.avatarId),
  };

  accounts.push(newAccount);
  saveAllAccounts(accounts);
  setActiveSessionAccountId(newAccount.id);

  return {ok: true, account: newAccount};
}

export async function loginAccount(params: {
  username: string;
  password: string;
}): Promise<AuthResult> {
  const username = params.username.trim();
  if (!username) {
    return {ok: false, error: 'Please enter your username.'};
  }
  if (!params.password) {
    return {ok: false, error: 'Please enter your password.'};
  }

  const accounts = loadAllAccounts();
  const found = accounts.find(
    (a) => a.usernameLower === username.toLowerCase(),
  );
  if (!found) {
    return {
      ok: false,
      error: `No account found for "${username}". Check spelling or Sign Up!`,
    };
  }

  const computed = await hashPasswordSalted(params.password, found.salt);
  if (computed !== found.passwordHash) {
    return {ok: false, error: 'Incorrect password. Please try again!'};
  }

  setActiveSessionAccountId(found.id);
  return {ok: true, account: found};
}

export function logoutAccount(): void {
  setActiveSessionAccountId(null);
}

// ============================================================================
// GLOBAL LEADERBOARD + REMOTE ROOM SYNC MERGE
// ============================================================================
export function loadRemoteLeaderboardEntries(): Omit<
  GlobalLeaderboardEntry,
  'rank' | 'isCurrentUser'
>[] {
  try {
    const raw = localStorage.getItem(REMOTE_ENTRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertRemoteLeaderboardEntry(
  entry: Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>,
): void {
  try {
    const existing = loadRemoteLeaderboardEntries();
    const idx = existing.findIndex(
      (e) =>
        e.id === entry.id ||
        e.username.toLowerCase() === entry.username.toLowerCase(),
    );
    if (idx >= 0) {
      const prev = existing[idx];
      existing[idx] = {
        ...entry,
        totalPoints: Math.max(prev.totalPoints, entry.totalPoints),
        bestAnswerScore: Math.max(prev.bestAnswerScore, entry.bestAnswerScore),
        wins: Math.max(prev.wins, entry.wins),
      };
    } else {
      existing.push(entry);
    }
    localStorage.setItem(REMOTE_ENTRIES_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage issues
  }
}

export function accountToLeaderboardEntry(
  acc: UserAccount,
): Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'> {
  return {
    id: acc.id,
    username: acc.username,
    avatarId: acc.profile.equippedAvatarId,
    mayhemLevel: acc.profile.mayhemLevel || 1,
    level: acc.profile.level || 1,
    totalPoints: acc.profile.totalPoints || 0,
    bestAnswerScore: acc.profile.bestAnswerScore || 0,
    wins: acc.profile.wins || 0,
    matchesPlayed: acc.profile.matchesPlayed || 0,
    badge: acc.profile.wins >= 10 ? 'CHAMP' : acc.profile.wins >= 3 ? 'PRO' : 'PLAYER',
    isSeeded: false,
  };
}

export function getGlobalLeaderboard(
  currentAccountId: string | null,
  extraEntries: Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [],
): GlobalLeaderboardEntry[] {
  const byKey = new Map<
    string,
    Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>
  >();

  SEEDED_RIVAL_CONTENDERS.forEach((r) => {
    byKey.set(r.username.toLowerCase(), {...r});
  });

  const remoteEntries = loadRemoteLeaderboardEntries();
  remoteEntries.forEach((re) => {
    byKey.set(re.username.toLowerCase(), {...re});
  });

  extraEntries.forEach((ex) => {
    byKey.set(ex.username.toLowerCase(), {...ex});
  });

  const accounts = loadAllAccounts();
  accounts.forEach((acc) => {
    byKey.set(acc.usernameLower, accountToLeaderboardEntry(acc));
  });

  const sorted = Array.from(byKey.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.bestAnswerScore !== a.bestAnswerScore) {
      return b.bestAnswerScore - a.bestAnswerScore;
    }
    return b.mayhemLevel - a.mayhemLevel;
  });

  return sorted.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    isCurrentUser: Boolean(currentAccountId && entry.id === currentAccountId),
  }));
}

export function getAccountGlobalRank(accountId: string): number {
  const board = getGlobalLeaderboard(accountId);
  const found = board.find((e) => e.id === accountId);
  return found ? found.rank : board.length;
}
