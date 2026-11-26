import {
  AVATAR_CATALOG,
  BOT_PERSONAS,
  CreativeRestriction,
  GAME_MODES,
  GameModeId,
  MashupObject,
  OBJECT_LIBRARY,
  ObjectCategory,
  RESTRICTION_LIBRARY,
  SITUATION_LIBRARY,
  WILDCARDS,
  WildcardType,
} from './contentLibrary';
import {BaseTournamentGameState} from './types';

export type RoundPhase =
  | 'COUNTDOWN'
  | 'WILDCARD'
  | 'REVEAL'
  | 'WRITE'
  | 'VOTE'
  | 'JUDGE'
  | 'SCOREBOARD';

export interface PlayerSubmission {
  id: string;
  authorId: string;
  authorName: string;
  avatarId: string;
  text: string;
  submittedEarly: boolean;
  isBot: boolean;
  teamId?: 'A' | 'B';
}

export interface AIBreakdown {
  relevance: number; // 0..15
  creativity: number; // 0..15
  humor: number; // 0..15
  originality: number; // 0..15
  aiTotal: number; // 0..60
  votePoints: number; // 0..40
  speedBonus: number;
  restrictionPenalty: number;
  awardBonus?: number;
  streakBonus?: number;
  awards?: string[];
  finalRoundPoints: number;
  critique: string;
  votesReceived: number;
}

export type RoundAwardType = 'SPEED_DEMON' | 'CROWD_FAVORITE' | 'COMEDY_GENIUS';

export interface RoundAward {
  type: RoundAwardType;
  label: string;
  icon: string;
  playerId: string;
  playerName: string;
  submissionId: string;
  bonusPoints: number;
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  senderName: string;
  xNorm: number;
  createdAt: number;
}

export interface TeamChatMessage {
  id: string;
  teamId: 'A' | 'B';
  senderName: string;
  text: string;
}

export interface CustomBattleConfig {
  customSituation: string;
  customObjectsText: string;
  rounds: number;
  writeSeconds: number;
  objectsCount: number;
  aiWeight: number;
  wildcardsEnabled: boolean;
  categoryFilter: ObjectCategory | 'ALL';
}

export interface MayhemModifiers {
  level: number;
  title: string;
  timerScale: number;
  wildcardBonusChance: number;
  restrictionChance: number;
  extraObjects: number;
  aiStrictness: number;
  botSkillTier: number;
  rewardMultiplier: number;
  summary: string;
}

export function getMayhemModifiers(mayhemLevel: number): MayhemModifiers {
  const level = Math.max(1, Math.floor(mayhemLevel || 1));
  const titles = [
    'Studio Warm-Up',
    'Heating Up',
    'Chaos Surge',
    'Prime-Time Frenzy',
    'Studio Meltdown',
    'Cosmic Mayhem',
  ];
  const title = titles[Math.min(titles.length - 1, level - 1)];
  const timerScale = Math.max(0.62, Number((1 - (level - 1) * 0.06).toFixed(2)));
  const wildcardBonusChance = Math.min(0.45, Number(((level - 1) * 0.09).toFixed(2)));
  const restrictionChance = Math.min(0.95, Number((0.35 + (level - 1) * 0.14).toFixed(2)));
  const extraObjects = level >= 4 ? 1 : 0;
  const aiStrictness = Math.min(1.3, Number((1 + (level - 1) * 0.05).toFixed(2)));
  const botSkillTier = Math.min(4, 1 + Math.floor((level - 1) / 1));
  const rewardMultiplier = Number((1 + Math.min(1.5, (level - 1) * 0.15)).toFixed(2));
  const pctFaster = Math.round((1 - timerScale) * 100);
  const summary =
    level === 1
      ? 'Baseline studio rules • 1.0x Rewards'
      : `${pctFaster}% faster timer • +${Math.round(wildcardBonusChance * 100)}% Wildcard • ${rewardMultiplier}x Rewards`;

  return {
    level,
    title,
    timerScale,
    wildcardBonusChance,
    restrictionChance,
    extraObjects,
    aiStrictness,
    botSkillTier,
    rewardMultiplier,
    summary,
  };
}

export interface MashupTournamentState extends BaseTournamentGameState {
  activePlayerIndex: number;
  turnNumber: number;
  mode: GameModeId;
  mayhemLevel: number;
  roundSeed: number;
  readyPlayerIds: string[];
  phase: RoundPhase;
  phaseDurationSec: number;
  phaseTimeLeftSec: number;
  countdownValue: number;
  wildcard: WildcardType | null;
  mysteryRevealed: boolean;
  swappedApplied: boolean;
  objects: MashupObject[];
  swapObject: MashupObject | null;
  situation: string;
  restriction: CreativeRestriction | null;
  submissions: Record<string, PlayerSubmission>;
  blindOrderIds: string[]; // shuffled submission IDs for anonymous voting
  typingPlayerIds: string[];
  votes: Record<string, string>; // voterId -> submissionId
  judgements: Record<string, AIBreakdown>; // submissionId -> breakdown
  cumulativePoints: Record<string, number>;
  playerAvatars: Record<string, string>;
  playerNames: Record<string, string>;
  botIds: string[];
  withBots: boolean;
  teamAssignments: Record<string, 'A' | 'B'>;
  teamNames: {A: string; B: string};
  teamChat: TeamChatMessage[];
  reactions: ReactionBurst[];
  roundWinnerId: string | null;
  suddenDeathLoserId: string | null;
  comedyStreaks: Record<string, number>;
  roundAwards: RoundAward[];
  sparkUsedByPlayer: Record<string, boolean>;
  submissionOrder: string[];
  customConfig: CustomBattleConfig;
  turnLog: string[];
}

// ============================================================================
// DETERMINISTIC PRNG (Date-Seeded Daily Mayhem & Fair Host Shuffling)
// ============================================================================
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function pickRoundPrompt(
  mode: GameModeId,
  round: number,
  customConfig: CustomBattleConfig,
  wildcardChance: number,
  mayhemLevel = 1,
  explicitSeed?: number,
): {
  objects: MashupObject[];
  swapObject: MashupObject;
  situation: string;
  restriction: CreativeRestriction | null;
  wildcard: WildcardType | null;
  roundSeed: number;
} {
  const modeMeta = GAME_MODES.find((m) => m.id === mode) ?? GAME_MODES[0];
  const mods = getMayhemModifiers(mayhemLevel);
  const seedBase =
    typeof explicitSeed === 'number'
      ? explicitSeed
      : mode === 'DAILY_MAYHEM'
        ? hashString(`daily_${getDailyDateKey()}_r${round}`)
        : Math.floor(Math.random() * 0xffffffff) ^ (round * 2654435761);
  const rng = mulberry32(seedBase);

  const baseCount =
    mode === 'CUSTOM'
      ? Math.max(2, Math.min(5, customConfig.objectsCount))
      : modeMeta.objectsCount;
  const count =
    mode === 'CUSTOM' || mode === 'DAILY_MAYHEM'
      ? baseCount
      : Math.min(5, baseCount + mods.extraObjects);

  // Custom objects override if provided in Custom mode
  let pool =
    mode === 'CUSTOM' && customConfig.categoryFilter !== 'ALL'
      ? OBJECT_LIBRARY.filter((o) => o.category === customConfig.categoryFilter)
      : [...OBJECT_LIBRARY];

  if (mode === 'CUSTOM' && customConfig.customObjectsText.trim().length > 0) {
    const customNames = customConfig.customObjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (customNames.length >= 2) {
      const customItems: MashupObject[] = customNames.map((name, idx) => ({
        id: `custom_obj_${idx}`,
        name,
        category: 'Absurdity',
        icon: '✨',
        keywords: name
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      }));
      pool = [...customItems, ...pool];
    }
  }

  // Shuffle deterministically
  const shuffledObjects = [...pool];
  for (let i = shuffledObjects.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledObjects[i], shuffledObjects[j]] = [shuffledObjects[j], shuffledObjects[i]];
  }

  const objects = shuffledObjects.slice(0, count);
  const swapObject = shuffledObjects[count] || shuffledObjects[0];

  let situation =
    SITUATION_LIBRARY[Math.floor(rng() * SITUATION_LIBRARY.length)];
  if (
    mode === 'CUSTOM' &&
    customConfig.customSituation.trim().length >= 6 &&
    round === 1
  ) {
    situation = customConfig.customSituation.trim();
  }

  let restriction: CreativeRestriction | null = null;
  if (modeMeta.strictRestriction || rng() < mods.restrictionChance) {
    const toughPool =
      mods.level >= 3
        ? RESTRICTION_LIBRARY.filter((r) => r.type !== 'TONE_TWIST')
        : RESTRICTION_LIBRARY;
    const activePool = toughPool.length > 0 ? toughPool : RESTRICTION_LIBRARY;
    restriction = activePool[Math.floor(rng() * activePool.length)];
  }

  const wildcardsAllowed =
    mode === 'CUSTOM'
      ? customConfig.wildcardsEnabled
      : modeMeta.wildcardsEnabled;

  const effectiveWildcardChance = Math.min(
    0.95,
    wildcardChance + mods.wildcardBonusChance,
  );

  let wildcard: WildcardType | null = null;
  if (wildcardsAllowed && (round > 1 || rng() < effectiveWildcardChance)) {
    const types: WildcardType[] = [
      'DOUBLE_POINTS',
      'MYSTERY_OBJECT',
      'OBJECT_SWAP',
      'REVERSE_CHALLENGE',
      'NO_COMMON_WORDS',
      'SUDDEN_DEATH',
    ];
    wildcard = types[Math.floor(rng() * types.length)];
  }

  return {objects, swapObject, situation, restriction, wildcard, roundSeed: seedBase};
}

// ============================================================================
// RESTRICTION VALIDATOR & AI JUDGE ENGINE
// ============================================================================
const NO_COMMON_BANNED = ['the', 'and', 'with', 'use'];

export function checkRestrictionViolation(
  text: string,
  restriction: CreativeRestriction | null,
  wildcard: WildcardType | null,
): string | null {
  const clean = text.trim();
  if (!clean) return 'Empty answer!';
  const lower = clean.toLowerCase();

  if (wildcard === 'NO_COMMON_WORDS' || restriction?.type === 'NO_COMMON_WORDS') {
    const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
    const hit = NO_COMMON_BANNED.find((w) => words.includes(w));
    if (hit) return `Banned word used: "${hit.toUpperCase()}"`;
  }

  if (restriction) {
    if (restriction.type === 'BANNED_LETTER' && typeof restriction.param === 'string') {
      if (lower.includes(restriction.param.toLowerCase())) {
        return `Banned letter "${restriction.param.toUpperCase()}" used!`;
      }
    } else if (restriction.type === 'MAX_WORDS' && typeof restriction.param === 'number') {
      const wordCount = clean.split(/\s+/).filter(Boolean).length;
      if (wordCount > restriction.param) {
        return `Too long (${wordCount}/${restriction.param} words)!`;
      }
    } else if (restriction.type === 'MUST_INCLUDE' && typeof restriction.param === 'string') {
      if (!lower.includes(restriction.param.toLowerCase())) {
        return `Missing required word "${restriction.param.toUpperCase()}"!`;
      }
    }
  }
  return null;
}

const CREATIVE_VERBS = [
  'launch',
  'catapult',
  'weld',
  'inflate',
  'freeze',
  'hypnotize',
  'distract',
  'ricochet',
  'slingshot',
  'flambe',
  'teleport',
  'magnetize',
  'bounce',
  'disguise',
  'weaponize',
  'harness',
  'detonate',
  'serenade',
  'surf',
  'bribe',
  'yeet',
  'duct',
  'fuse',
  'shield',
  'shrink',
];

const CAUSAL_CONNECTORS = [
  'while',
  'into',
  'using',
  'to',
  'causing',
  'so',
  'then',
  'until',
  'before',
  'powered by',
  'turning',
  'strapped',
];

const COMEDY_MARKERS = [
  '!',
  'panic',
  'scream',
  'glory',
  'chaos',
  'dramatic',
  'suspicious',
  'awkward',
  'flamboyant',
  'tactical',
  'certified',
  'miracle',
  'snack',
  'apologize',
  'style',
  'regret',
  'monologue',
  'immediately',
  'somehow',
  'vibes',
];

export function scoreSubmissionAI(
  submission: PlayerSubmission,
  allSubmissions: PlayerSubmission[],
  objects: MashupObject[],
  situation: string,
  restriction: CreativeRestriction | null,
  wildcard: WildcardType | null,
  votesReceived: number,
  totalVoters: number,
  aiWeightPct: number,
  earlySubmitBonus: number,
  aiStrictness = 1,
): AIBreakdown {
  const raw = submission.text.trim();
  const lower = raw.toLowerCase();
  const words = lower.split(/[^a-z0-9']+/).filter(Boolean);

  // Detect gibberish / low-effort spam
  const uniqueWords = new Set(words);
  const isSpam =
    words.length < 3 ||
    uniqueWords.size < Math.min(3, words.length) ||
    /(.)\1{4,}/.test(lower);

  if (isSpam) {
    const votePts =
      totalVoters > 0
        ? Math.round((votesReceived / totalVoters) * (100 - aiWeightPct))
        : 0;
    return {
      relevance: 2,
      creativity: 2,
      humor: 2,
      originality: 1,
      aiTotal: 7,
      votePoints: votePts,
      speedBonus: 0,
      restrictionPenalty: 0,
      finalRoundPoints: 7 + votePts,
      critique:
        'Gizmo squints at the cue card: needs actual words and objects, not button-mashing!',
      votesReceived,
    };
  }

  // 1. Relevance (0..15): matches assigned objects + situation words
  let objectHits = 0;
  objects.forEach((obj) => {
    const nameTokens = obj.name.toLowerCase().split(/\s+/);
    const matched =
      obj.keywords.some((kw) => lower.includes(kw)) ||
      nameTokens.some((tok) => tok.length > 3 && lower.includes(tok));
    if (matched) objectHits++;
  });
  const sitTokens = situation
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 4);
  const sitHits = sitTokens.filter((w) => lower.includes(w)).length;

  const relevance = Math.min(
    15,
    Math.round((objectHits / Math.max(1, objects.length)) * 11) +
      Math.min(4, sitHits * 2),
  );

  // 2. Creativity (0..15): lateral verbs + causal connectors + multi-object mashup
  const verbHits = CREATIVE_VERBS.filter((v) => lower.includes(v)).length;
  const connHits = CAUSAL_CONNECTORS.filter((c) => lower.includes(c)).length;
  const lengthSweetSpot = words.length >= 7 && words.length <= 28 ? 4 : 2;
  const creativity = Math.min(
    15,
    4 + Math.min(5, verbHits * 2) + Math.min(4, connHits * 2) + (objectHits >= 2 ? 2 : 0) + (lengthSweetSpot > 2 ? 2 : 0),
  );

  // 3. Humor (0..15): contrast, comedic markers, punchy pacing, reverse-mode absurdity
  const humorHits = COMEDY_MARKERS.filter((m) => lower.includes(m)).length;
  const hasExclaim = raw.includes('!') ? 2 : 0;
  const reverseBonus =
    wildcard === 'REVERSE_CHALLENGE' &&
    /(worst|fail|explode|disaster|ruin|doom|crash|terrible|horrible|wrong)/i.test(lower)
      ? 4
      : 0;
  const humor = Math.min(
    15,
    5 + Math.min(6, humorHits * 2) + hasExclaim + reverseBonus,
  );

  // 4. Originality (0..15): lexical diversity & low overlap with rivals
  const lexicalRatio = uniqueWords.size / Math.max(1, words.length);
  let maxOverlap = 0;
  allSubmissions.forEach((other) => {
    if (other.id === submission.id) return;
    const otherWords = new Set(
      other.text
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .filter((w) => w.length > 3),
    );
    const myLongWords = Array.from(uniqueWords).filter((w) => w.length > 3);
    if (myLongWords.length === 0) return;
    const shared = myLongWords.filter((w) => otherWords.has(w)).length;
    maxOverlap = Math.max(maxOverlap, shared / myLongWords.length);
  });
  const originality = Math.max(
    3,
    Math.min(15, Math.round(lexicalRatio * 12) + 4 - Math.round(maxOverlap * 8)),
  );

  const rawAi60 = relevance + creativity + humor + originality;
  const strictScaledAi60 = Math.max(
    10,
    Math.min(60, Math.round(rawAi60 / Math.max(1, aiStrictness))),
  );
  const aiScaled = Math.round((strictScaledAi60 / 60) * aiWeightPct);
  const voteWeightPct = 100 - aiWeightPct;
  const votePoints =
    totalVoters > 0
      ? Math.round((votesReceived / totalVoters) * voteWeightPct)
      : Math.round(voteWeightPct * 0.4);

  const violation = checkRestrictionViolation(raw, restriction, wildcard);
  const restrictionPenalty = violation ? 10 : 0;
  const speedBonus = submission.submittedEarly ? earlySubmitBonus : 0;

  let finalRoundPoints = Math.max(
    5,
    aiScaled + votePoints + speedBonus - restrictionPenalty,
  );
  if (wildcard === 'DOUBLE_POINTS') {
    finalRoundPoints *= 2;
  }

  // Generate witty 1-2 sentence rationale
  const parts: string[] = [];
  if (objectHits >= objects.length) {
    parts.push('Masterful mashup of every single prop!');
  } else if (objectHits >= 2) {
    parts.push('Clever combo connecting multiple objects under pressure.');
  } else if (objectHits === 1) {
    parts.push('Solid core idea, though extra props could boost the chaos.');
  } else {
    parts.push('Boldly improvised off-script, missing the stage props.');
  }

  if (violation) {
    parts.push(`Ouch—rule slip (${violation}) trimmed 10 pts!`);
  } else if (humor >= 12) {
    parts.push('The studio crowd lost it at that comedic timing!');
  } else if (creativity >= 12) {
    parts.push('Pure lateral-thinking engineering genius.');
  } else if (wildcard === 'DOUBLE_POINTS') {
    parts.push('2X Wildcard multiplier turned this pitch into gold!');
  } else {
    parts.push('Crisp delivery worthy of prime-time applause.');
  }

  return {
    relevance,
    creativity,
    humor,
    originality,
    aiTotal: aiScaled,
    votePoints,
    speedBonus,
    restrictionPenalty,
    finalRoundPoints,
    critique: parts.join(' '),
    votesReceived,
  };
}

// ============================================================================
// PERSONALITY BOT ANSWER GENERATOR
// ============================================================================
export function generateBotAnswer(
  botIndex: number,
  objects: MashupObject[],
  situation: string,
  wildcard: WildcardType | null,
  restriction: CreativeRestriction | null,
  botSkillTier = 1,
): string {
  const persona = BOT_PERSONAS[botIndex % BOT_PERSONAS.length];
  const o1 = objects[0]?.name ?? 'Mystery Thing';
  const o2 = objects[1]?.name ?? 'Pocket Lint';
  const o3 = objects[2]?.name ?? 'Duct Tape';
  const o4 = objects[3]?.name;

  const opener = persona.styleOpeners[botIndex % persona.styleOpeners.length];
  const conn = persona.styleConnectors[(botIndex + 1) % persona.styleConnectors.length];
  const closer = persona.styleClosers[(botIndex + 2) % persona.styleClosers.length];

  const sitHook = situation.split(/\s+/).slice(0, 4).join(' ').replace(/[.!?]/g, '');
  let answer =
    botSkillTier >= 2
      ? `${opener} ${o1} while catapulting ${o2} into ${o3}${o4 ? ` and ${o4}` : ''} to master ${sitHook} ${closer}!`
      : `${opener} ${o1} ${conn} ${o2}, powered by ${o3} ${closer}`;

  if (wildcard === 'REVERSE_CHALLENGE') {
    answer = `Disastrously drop ${o1} straight onto ${o2} while tripping over ${o3} for total comedic ruin!`;
  }

  if (restriction?.type === 'MAX_WORDS' && typeof restriction.param === 'number') {
    const shortWords = `Launch ${o1}, ${o2}, ${o3} fast!`.split(/\s+/);
    answer = shortWords.slice(0, restriction.param).join(' ');
  } else if (restriction?.type === 'MUST_INCLUDE' && typeof restriction.param === 'string') {
    answer = `${answer} (${restriction.param}!)`;
  } else if (wildcard === 'NO_COMMON_WORDS' || restriction?.type === 'NO_COMMON_WORDS') {
    answer = answer.replace(/\b(the|and|with|use)\b/gi, '').replace(/\s+/g, ' ').trim();
  }

  if (restriction?.type === 'BANNED_LETTER' && typeof restriction.param === 'string') {
    const ch = restriction.param.toLowerCase();
    // Clean safe short fallback avoiding banned letter when possible
    if (ch === 'e') {
      answer = `Smash ${o1.replace(/e/gi, '3')} into ${o2.replace(/e/gi, '3')} for instant win!`;
    }
  }

  return answer.slice(0, 180);
}

// ============================================================================
// STRICT TURN-BASED + SIMULTANEOUS PARTY ACTION PROCESSOR
// ============================================================================
export type GameAction =
  | {type: 'SUBMIT_ANSWER'; payload: {text: string; submittedEarly?: boolean}}
  | {type: 'CAST_VOTE'; payload: {submissionId: string}}
  | {type: 'TYPING_STATUS'; payload: {isTyping: boolean}}
  | {type: 'SEND_REACTION'; payload: {emoji: string}}
  | {type: 'TEAM_CHAT'; payload: {text: string}}
  | {type: 'SELECT_AVATAR'; payload: {avatarId: string}}
  | {type: 'USE_SPARK'; payload?: Record<string, never>}
  | {type: 'ADVANCE_PHASE'; payload?: Record<string, never>}
  | {type: 'TURN_MOVE'; payload: {note?: string}};

export function processTurnBasedAction(
  currentGS: MashupTournamentState,
  senderId: string,
  action: GameAction,
): {nextGS: MashupTournamentState; stateChanged: boolean; rejectedReason?: string} {
  if (currentGS.status !== 'PLAYING') {
    return {nextGS: currentGS, stateChanged: false, rejectedReason: 'NOT_PLAYING'};
  }

  // Spectator or lobby reaction bypasses active-player gate
  if (action.type === 'SEND_REACTION') {
    const burst: ReactionBurst = {
      id: `rx_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      emoji: action.payload.emoji,
      senderName: currentGS.playerNames[senderId] || 'Viewer',
      xNorm: 0.15 + Math.random() * 0.7,
      createdAt: Date.now(),
    };
    const nextReactions = [...currentGS.reactions.slice(-14), burst];
    return {
      nextGS: {...currentGS, reactions: nextReactions},
      stateChanged: true,
    };
  }

  // Avatar selection by any lobby participant
  if (action.type === 'SELECT_AVATAR') {
    return {
      nextGS: {
        ...currentGS,
        playerAvatars: {
          ...currentGS.playerAvatars,
          [senderId]: action.payload.avatarId,
        },
      },
      stateChanged: true,
    };
  }

  // Strict Turn-Gated Action (for Spotlight Turn Mode / Turn Authority Validation)
  if (action.type === 'TURN_MOVE') {
    const activeId = currentGS.activePlayerIds[currentGS.activePlayerIndex];
    if (senderId !== activeId) {
      return {
        nextGS: currentGS,
        stateChanged: false,
        rejectedReason: 'NOT_YOUR_TURN',
      };
    }
    const nextIndex =
      (currentGS.activePlayerIndex + 1) % Math.max(1, currentGS.activePlayerIds.length);
    return {
      nextGS: {
        ...currentGS,
        activePlayerIndex: nextIndex,
        turnNumber: currentGS.turnNumber + 1,
        turnLog: [
          ...currentGS.turnLog.slice(-10),
          `${currentGS.playerNames[senderId] || senderId}: ${action.payload.note || 'Turn Ready'}`,
        ],
      },
      stateChanged: true,
    };
  }

  // Verify active player membership for match actions
  if (!currentGS.activePlayerIds.includes(senderId)) {
    return {
      nextGS: currentGS,
      stateChanged: false,
      rejectedReason: 'INACTIVE_PLAYER',
    };
  }

  if (action.type === 'TYPING_STATUS' && currentGS.phase === 'WRITE') {
    const set = new Set(currentGS.typingPlayerIds);
    if (action.payload.isTyping) set.add(senderId);
    else set.delete(senderId);
    return {
      nextGS: {...currentGS, typingPlayerIds: Array.from(set)},
      stateChanged: true,
    };
  }

  if (action.type === 'TEAM_CHAT' && currentGS.mode === 'TEAM_CHAOS') {
    const teamId = currentGS.teamAssignments[senderId] || 'A';
    const msg: TeamChatMessage = {
      id: `tc_${Date.now()}_${Math.random()}`,
      teamId,
      senderName: currentGS.playerNames[senderId] || 'Teammate',
      text: action.payload.text.slice(0, 120),
    };
    return {
      nextGS: {...currentGS, teamChat: [...currentGS.teamChat.slice(-16), msg]},
      stateChanged: true,
    };
  }

  if (action.type === 'USE_SPARK' && currentGS.phase === 'WRITE') {
    if (currentGS.sparkUsedByPlayer?.[senderId]) {
      return {
        nextGS: currentGS,
        stateChanged: false,
        rejectedReason: 'SPARK_ALREADY_USED',
      };
    }
    return {
      nextGS: {
        ...currentGS,
        sparkUsedByPlayer: {
          ...(currentGS.sparkUsedByPlayer || {}),
          [senderId]: true,
        },
      },
      stateChanged: true,
    };
  }

  if (action.type === 'SUBMIT_ANSWER' && currentGS.phase === 'WRITE') {
    const cleanText = (action.payload.text || '').trim();
    if (!cleanText) {
      return {nextGS: currentGS, stateChanged: false, rejectedReason: 'EMPTY'};
    }
    const subKey =
      currentGS.mode === 'TEAM_CHAOS'
        ? `team_${currentGS.teamAssignments[senderId] || 'A'}`
        : senderId;
    const sub: PlayerSubmission = {
      id: subKey,
      authorId: senderId,
      authorName:
        currentGS.mode === 'TEAM_CHAOS'
          ? currentGS.teamNames[currentGS.teamAssignments[senderId] || 'A']
          : currentGS.playerNames[senderId] || 'Contestant',
      avatarId: currentGS.playerAvatars[senderId] || AVATAR_CATALOG[0].id,
      text: cleanText.slice(0, 220),
      submittedEarly: Boolean(action.payload.submittedEarly),
      isBot: false,
      teamId: currentGS.mode === 'TEAM_CHAOS' ? currentGS.teamAssignments[senderId] || 'A' : undefined,
    };
    const typingPlayerIds = currentGS.typingPlayerIds.filter((id) => id !== senderId);
    const prevOrder = currentGS.submissionOrder || [];
    const nextOrder = prevOrder.includes(subKey)
      ? prevOrder
      : [...prevOrder, subKey];
    return {
      nextGS: {
        ...currentGS,
        submissions: {...currentGS.submissions, [subKey]: sub},
        submissionOrder: nextOrder,
        typingPlayerIds,
      },
      stateChanged: true,
    };
  }

  if (action.type === 'CAST_VOTE' && currentGS.phase === 'VOTE') {
    const targetSub = currentGS.submissions[action.payload.submissionId];
    if (!targetSub) {
      return {nextGS: currentGS, stateChanged: false, rejectedReason: 'INVALID_TARGET'};
    }
    // Anti-Self-Vote & Anti-Duplicate-Vote Protection
    if (targetSub.authorId === senderId) {
      return {nextGS: currentGS, stateChanged: false, rejectedReason: 'SELF_VOTE_BLOCKED'};
    }
    if (currentGS.votes[senderId]) {
      return {nextGS: currentGS, stateChanged: false, rejectedReason: 'DUPLICATE_VOTE_BLOCKED'};
    }
    return {
      nextGS: {
        ...currentGS,
        votes: {...currentGS.votes, [senderId]: action.payload.submissionId},
      },
      stateChanged: true,
    };
  }

  return {nextGS: currentGS, stateChanged: false};
}

// ============================================================================
// PERSISTENT PLAYER PROGRESSION PROFILE (Non-Staked XP, Coins, Cosmetics)
// ============================================================================
export interface DailyMission {
  id: string;
  label: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
}

export interface MatchHighlight {
  id: string;
  date: string;
  situation: string;
  objects: string[];
  winningAnswer: string;
  winnerName: string;
  score: number;
  critique: string;
}

export interface PlayerProfile {
  xp: number;
  level: number;
  coins: number;
  mayhemLevel: number;
  totalTries: number;
  equippedAvatarId: string;
  unlockedAvatars: string[];
  equippedFrame: string;
  unlockedFrames: string[];
  equippedTitle: string;
  wins: number;
  matchesPlayed: number;
  winStreak: number;
  bestAnswerScore: number;
  totalPoints: number;
  dailyDate: string;
  missions: DailyMission[];
  highlights: MatchHighlight[];
  soundMuted: boolean;
  musicMuted: boolean;
  reducedMotion: boolean;
  safeChatFilter: boolean;
  hasCompletedTutorial: boolean;
  hasSeenTutorial: boolean;
  hasSeenIntro: boolean;
}

const PROFILE_STORAGE_KEY = 'mashup_mayhem_profile_v1';

export function markTutorialCompleted(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    hasCompletedTutorial: true,
    hasSeenTutorial: true,
    hasSeenIntro: true,
  };
}

export function generateMashupSpark(
  objects: MashupObject[],
  situation: string,
  restriction: CreativeRestriction | null,
  wildcard: WildcardType | null,
  seedOffset = 0,
): string {
  const o1 = objects[0]?.name || 'Object #1';
  const o2 = objects[1]?.name || 'Object #2';
  const o3 = objects[2]?.name || 'Object #3';
  const angles = [
    `Twist: Turn ${o1} into an outrageous disguise while ${o2} causes a distraction!`,
    `Angle: Strap ${o1} onto ${o2} like a turbo gadget and use ${o3} as your dramatic exit!`,
    `Plot Flip: What if ${o1} is actually the secret bribe and ${o2} seals the deal?`,
    `Stunt Idea: Launch ${o2} as a decoy, surf on ${o1}, and narrate the chaos in slow motion!`,
    `Brainwave: Combine ${o1} + ${o3} into a "certified" safety invention nobody asked for!`,
  ];
  if (wildcard === 'REVERSE_CHALLENGE') {
    return `Reverse Spark: How could ${o1} and ${o2} catastrophically backfire in the funniest way?`;
  }
  const idx =
    Math.abs(hashString(`${situation}_${o1}_${seedOffset}`)) % angles.length;
  const base = angles[idx];
  if (restriction && restriction.type === 'MAX_WORDS') {
    return `${base} (Keep it punchy under ${restriction.param} words!)`;
  }
  return base;
}

export function computeRoundAwardsAndStreaks(
  submissions: PlayerSubmission[],
  judgements: Record<string, AIBreakdown>,
  submissionOrder: string[],
  prevStreaks: Record<string, number>,
): {
  roundAwards: RoundAward[];
  nextStreaks: Record<string, number>;
  updatedJudgements: Record<string, AIBreakdown>;
} {
  const updatedJudgements: Record<string, AIBreakdown> = {};
  Object.entries(judgements).forEach(([k, v]) => {
    updatedJudgements[k] = {...v, awards: [], awardBonus: 0, streakBonus: 0};
  });

  const roundAwards: RoundAward[] = [];
  const nextStreaks: Record<string, number> = {...(prevStreaks || {})};

  if (submissions.length === 0) {
    return {roundAwards, nextStreaks, updatedJudgements};
  }

  // 1. Speed Demon: fastest valid submission in submissionOrder (non-spam)
  const validSpeedIds = (submissionOrder || []).filter((id) => {
    const sub = submissions.find((s) => s.id === id);
    const j = updatedJudgements[id];
    return sub && j && j.aiTotal > 7;
  });
  const speedWinnerSub =
    submissions.find((s) => s.id === validSpeedIds[0]) ||
    submissions.find((s) => s.submittedEarly && (updatedJudgements[s.id]?.aiTotal ?? 0) > 7);
  if (speedWinnerSub) {
    roundAwards.push({
      type: 'SPEED_DEMON',
      label: 'Speed Demon',
      icon: '⚡',
      playerId: speedWinnerSub.authorId,
      playerName: speedWinnerSub.authorName,
      submissionId: speedWinnerSub.id,
      bonusPoints: 5,
    });
  }

  // 2. Crowd Favorite: highest votesReceived (> 0)
  let topVotes = 0;
  let crowdSub: PlayerSubmission | null = null;
  submissions.forEach((sub) => {
    const v = updatedJudgements[sub.id]?.votesReceived ?? 0;
    if (v > topVotes) {
      topVotes = v;
      crowdSub = sub;
    }
  });
  if (crowdSub && topVotes > 0) {
    const cs = crowdSub as PlayerSubmission;
    roundAwards.push({
      type: 'CROWD_FAVORITE',
      label: 'Crowd Favorite',
      icon: '👑',
      playerId: cs.authorId,
      playerName: cs.authorName,
      submissionId: cs.id,
      bonusPoints: 5,
    });
  }

  // 3. Comedy Genius: highest AI creativity + humor
  let topComedic = -1;
  let geniusSub: PlayerSubmission | null = null;
  submissions.forEach((sub) => {
    const j = updatedJudgements[sub.id];
    if (!j) return;
    const ch = j.creativity + j.humor;
    if (ch > topComedic) {
      topComedic = ch;
      geniusSub = sub;
    }
  });
  if (geniusSub && topComedic > 0) {
    const gs = geniusSub as PlayerSubmission;
    roundAwards.push({
      type: 'COMEDY_GENIUS',
      label: 'Comedy Genius',
      icon: '🧠',
      playerId: gs.authorId,
      playerName: gs.authorName,
      submissionId: gs.id,
      bonusPoints: 5,
    });
  }

  // Apply +5 bonus per award
  roundAwards.forEach((aw) => {
    const j = updatedJudgements[aw.submissionId];
    if (j) {
      j.awardBonus = (j.awardBonus || 0) + aw.bonusPoints;
      j.awards = [...(j.awards || []), `${aw.icon} ${aw.label}`];
      j.finalRoundPoints += aw.bonusPoints;
    }
  });

  // Update Comedy Streaks (75+ builds streak, < 75 resets) & apply multiplier bonus
  submissions.forEach((sub) => {
    const j = updatedJudgements[sub.id];
    if (!j) return;
    const qualified = j.finalRoundPoints >= 75;
    const nextStreak = qualified ? (nextStreaks[sub.authorId] || 0) + 1 : 0;
    nextStreaks[sub.authorId] = nextStreak;
    if (nextStreak >= 2) {
      const streakPts = nextStreak >= 3 ? 15 : 10;
      j.streakBonus = streakPts;
      j.finalRoundPoints += streakPts;
    }
  });

  return {roundAwards, nextStreaks, updatedJudgements};
}

export function createDefaultMissions(): DailyMission[] {
  return [
    {
      id: 'm_play',
      label: 'Finish 1 Mashup Match',
      target: 1,
      progress: 0,
      rewardCoins: 60,
      rewardXp: 80,
      claimed: false,
    },
    {
      id: 'm_win',
      label: 'Score 65+ on an Answer',
      target: 1,
      progress: 0,
      rewardCoins: 85,
      rewardXp: 110,
      claimed: false,
    },
    {
      id: 'm_react',
      label: 'Send 3 Stage Reactions',
      target: 3,
      progress: 0,
      rewardCoins: 40,
      rewardXp: 50,
      claimed: false,
    },
  ];
}

export function loadProfile(): PlayerProfile {
  const today = getDailyDateKey();
  const defaults: PlayerProfile = {
    xp: 0,
    level: 1,
    coins: 100,
    mayhemLevel: 1,
    totalTries: 0,
    equippedAvatarId: 'avatar_pickle',
    unlockedAvatars: ['avatar_pickle', 'avatar_astro_cat', 'avatar_toaster_knight'],
    equippedFrame: 'classic',
    unlockedFrames: ['classic'],
    equippedTitle: 'Rookie Improviser',
    wins: 0,
    matchesPlayed: 0,
    winStreak: 0,
    bestAnswerScore: 0,
    totalPoints: 0,
    dailyDate: today,
    missions: createDefaultMissions(),
    highlights: [],
    soundMuted: false,
    musicMuted: false,
    reducedMotion: false,
    safeChatFilter: true,
    hasCompletedTutorial: false,
    hasSeenTutorial: false,
    hasSeenIntro: false,
  };

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const merged: PlayerProfile = {...defaults, ...parsed};
    const tutorialDone = Boolean(
      parsed.hasCompletedTutorial || parsed.hasSeenTutorial,
    );
    merged.hasCompletedTutorial = tutorialDone;
    merged.hasSeenTutorial = tutorialDone;
    if (merged.dailyDate !== today) {
      merged.dailyDate = today;
      merged.missions = createDefaultMissions();
    }
    return merged;
  } catch {
    return defaults;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors in sandboxed iframes
  }
}

export function computeLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 150) + 1);
}

const PROFANITY_LIST = ['stupid', 'idiot', 'dumb', 'jerk', 'hate', 'trash'];

export function sanitizeSafeText(text: string, filterEnabled: boolean): string {
  if (!filterEnabled) return text;
  let out = text;
  PROFANITY_LIST.forEach((word) => {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(re, '✨');
  });
  return out;
}
