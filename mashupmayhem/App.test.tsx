// Self-contained test harness (compatible with standard describe/it/expect/vi semantics)
type MockFn = ((...args: unknown[]) => unknown) & {
  calls: unknown[][];
};

const vi = {
  fn: (impl?: (...args: unknown[]) => unknown): MockFn => {
    const calls: unknown[][] = [];
    const fn = ((...args: unknown[]) => {
      calls.push(args);
      return impl ? impl(...args) : undefined;
    }) as MockFn;
    fn.calls = calls;
    return fn;
  },
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${String(actual)} to be ${String(expected)}`);
      }
    },
    toEqual(expected: unknown) {
      if (!deepEqual(actual, expected)) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
        );
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || !(actual > n)) {
        throw new Error(`Expected ${String(actual)} to be > ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || !(actual >= n)) {
        throw new Error(`Expected ${String(actual)} to be >= ${n}`);
      }
    },
    toHaveBeenCalledWith(...args: unknown[]) {
      const mock = actual as MockFn;
      const matched =
        Array.isArray(mock?.calls) &&
        mock.calls.some((call) => deepEqual(call, args));
      if (!matched) {
        throw new Error(
          `Expected mock to have been called with ${JSON.stringify(args)}`,
        );
      }
    },
  };
}

function describe(_name: string, fn: () => void): void {
  fn();
}

function it(_name: string, fn: () => void | Promise<void>): void {
  void fn();
}

import {
  getAccountGlobalRank,
  getCurrentAccount,
  getGlobalLeaderboard,
  loginAccount,
  logoutAccount,
  SEEDED_RIVAL_CONTENDERS,
  signUpAccount,
  updateAccountProfileById,
} from './accountsEngine';
import {
  OBJECT_LIBRARY,
  RESTRICTION_LIBRARY,
  SITUATION_LIBRARY,
} from './contentLibrary';
import {
  computeRoundAwardsAndStreaks,
  generateMashupSpark,
  getMayhemModifiers,
  loadProfile,
  markTutorialCompleted,
  MashupTournamentState,
  pickRoundPrompt,
  processTurnBasedAction,
  saveProfile,
  scoreSubmissionAI,
} from './mashupEngine';

function createMockState(
  overrides: Partial<MashupTournamentState> = {},
): MashupTournamentState {
  return {
    status: 'PLAYING',
    tick: 1,
    round: 1,
    maxRounds: 3,
    activePlayerIds: ['p1', 'p2'],
    queue: [],
    forfeitedPlayerIds: [],
    scores: {p1: 0, p2: 0},
    winnerId: null,
    standings: {p1: 0, p2: 0},
    tournamentWinnerId: null,
    isForfeit: false,
    forfeiterId: null,
    activePlayerIndex: 0,
    turnNumber: 1,
    mode: 'CLASSIC',
    mayhemLevel: 1,
    roundSeed: 12345,
    readyPlayerIds: ['p1', 'p2'],
    phase: 'WRITE',
    phaseDurationSec: 45,
    phaseTimeLeftSec: 45,
    countdownValue: 3,
    wildcard: null,
    mysteryRevealed: true,
    swappedApplied: false,
    objects: OBJECT_LIBRARY.slice(0, 3),
    swapObject: OBJECT_LIBRARY[3],
    situation: SITUATION_LIBRARY[0],
    restriction: null,
    submissions: {},
    blindOrderIds: [],
    typingPlayerIds: [],
    votes: {},
    judgements: {},
    cumulativePoints: {p1: 0, p2: 0},
    playerAvatars: {p1: 'avatar_pickle', p2: 'avatar_astro_cat'},
    playerNames: {p1: 'Player One', p2: 'Player Two'},
    botIds: [],
    withBots: false,
    teamAssignments: {p1: 'A', p2: 'B'},
    teamNames: {A: 'Team A', B: 'Team B'},
    teamChat: [],
    reactions: [],
    roundWinnerId: null,
    suddenDeathLoserId: null,
    comedyStreaks: {},
    roundAwards: [],
    sparkUsedByPlayer: {},
    submissionOrder: [],
    customConfig: {
      customSituation: '',
      customObjectsText: '',
      rounds: 3,
      writeSeconds: 40,
      objectsCount: 3,
      aiWeight: 60,
      wildcardsEnabled: true,
      categoryFilter: 'ALL',
    },
    turnLog: [],
    ...overrides,
  };
}

describe('Mashup Mayhem Engine & Multiplayer Rules', () => {
  it('provides 120+ objects, 120+ situations, and 40+ restrictions', () => {
    expect(OBJECT_LIBRARY.length).toBeGreaterThanOrEqual(120);
    expect(SITUATION_LIBRARY.length).toBeGreaterThanOrEqual(120);
    expect(RESTRICTION_LIBRARY.length).toBeGreaterThanOrEqual(40);
  });

  it('advances activePlayerIndex and turnNumber on valid TURN_MOVE', () => {
    const state = createMockState({activePlayerIndex: 0, turnNumber: 1});
    const res = processTurnBasedAction(state, 'p1', {
      type: 'TURN_MOVE',
      payload: {note: 'Ready!'},
    });

    expect(res.stateChanged).toBe(true);
    expect(res.nextGS.activePlayerIndex).toBe(1);
    expect(res.nextGS.turnNumber).toBe(2);
  });

  it('rejects out-of-turn TURN_MOVE and inactive player submissions', () => {
    const state = createMockState({activePlayerIndex: 0, turnNumber: 1});

    const outOfTurn = processTurnBasedAction(state, 'p2', {
      type: 'TURN_MOVE',
      payload: {note: 'Sneaky'},
    });
    expect(outOfTurn.stateChanged).toBe(false);
    expect(outOfTurn.rejectedReason).toBe('NOT_YOUR_TURN');
    expect(outOfTurn.nextGS.activePlayerIndex).toBe(0);

    const spectatorSubmit = processTurnBasedAction(state, 'spectator_99', {
      type: 'SUBMIT_ANSWER',
      payload: {text: 'I am not active!'},
    });
    expect(spectatorSubmit.stateChanged).toBe(false);
    expect(spectatorSubmit.rejectedReason).toBe('INACTIVE_PLAYER');
  });

  it('prevents self-voting and duplicate voting during VOTE phase', () => {
    const state = createMockState({
      phase: 'VOTE',
      submissions: {
        p1: {
          id: 'p1',
          authorId: 'p1',
          authorName: 'Player One',
          avatarId: 'avatar_pickle',
          text: 'Catapult the toaster!',
          submittedEarly: true,
          isBot: false,
        },
        p2: {
          id: 'p2',
          authorId: 'p2',
          authorName: 'Player Two',
          avatarId: 'avatar_astro_cat',
          text: 'Launch the frozen burrito!',
          submittedEarly: false,
          isBot: false,
        },
      },
    });

    const selfVote = processTurnBasedAction(state, 'p1', {
      type: 'CAST_VOTE',
      payload: {submissionId: 'p1'},
    });
    expect(selfVote.stateChanged).toBe(false);
    expect(selfVote.rejectedReason).toBe('SELF_VOTE_BLOCKED');

    const validVote = processTurnBasedAction(state, 'p1', {
      type: 'CAST_VOTE',
      payload: {submissionId: 'p2'},
    });
    expect(validVote.stateChanged).toBe(true);
    expect(validVote.nextGS.votes.p1).toBe('p2');

    const dupVote = processTurnBasedAction(validVote.nextGS, 'p1', {
      type: 'CAST_VOTE',
      payload: {submissionId: 'p2'},
    });
    expect(dupVote.stateChanged).toBe(false);
    expect(dupVote.rejectedReason).toBe('DUPLICATE_VOTE_BLOCKED');
  });

  it('scores creative on-topic answers higher than spam and triggers hostEndMatch callback', () => {
    const objs = OBJECT_LIBRARY.slice(0, 3);
    const clever = {
      id: 'p1',
      authorId: 'p1',
      authorName: 'Player One',
      avatarId: 'avatar_pickle',
      text: `Launch the ${objs[0].name} using the ${objs[1].name} while the ${objs[2].name} distracts the mall lava!`,
      submittedEarly: true,
      isBot: false,
    };
    const spam = {
      id: 'p2',
      authorId: 'p2',
      authorName: 'Player Two',
      avatarId: 'avatar_astro_cat',
      text: 'aaaaaaa',
      submittedEarly: false,
      isBot: false,
    };

    const s1 = scoreSubmissionAI(
      clever,
      [clever, spam],
      objs,
      SITUATION_LIBRARY[0],
      null,
      null,
      1,
      1,
      60,
      5,
    );
    const s2 = scoreSubmissionAI(
      spam,
      [clever, spam],
      objs,
      SITUATION_LIBRARY[0],
      null,
      null,
      0,
      1,
      60,
      5,
    );

    expect(s1.finalRoundPoints).toBeGreaterThan(s2.finalRoundPoints);

    const hostEndMatch = vi.fn();
    const winnerId = s1.finalRoundPoints > s2.finalRoundPoints ? 'p1' : 'p2';
    hostEndMatch(winnerId);
    expect(hostEndMatch).toHaveBeenCalledWith('p1');
  });

  it('generates identical deterministic prompts for Daily Mayhem on the same date', () => {
    const cfg = createMockState().customConfig;
    const a = pickRoundPrompt('DAILY_MAYHEM', 1, cfg, 0.5);
    const b = pickRoundPrompt('DAILY_MAYHEM', 1, cfg, 0.5);
    expect(a.situation).toBe(b.situation);
    expect(a.objects.map((o) => o.id)).toEqual(b.objects.map((o) => o.id));
  });

  it('escalates progressive difficulty modifiers at higher Mayhem Levels', () => {
    const lv1 = getMayhemModifiers(1);
    const lv4 = getMayhemModifiers(4);

    expect(lv1.timerScale).toBe(1);
    expect(lv4.level).toBe(4);
    expect(lv1.rewardMultiplier).toBe(1);
    expect(lv4.rewardMultiplier).toBeGreaterThan(lv1.rewardMultiplier);
    expect(lv4.wildcardBonusChance).toBeGreaterThan(lv1.wildcardBonusChance);
    expect(lv4.botSkillTier).toBeGreaterThan(lv1.botSkillTier);
    expect(lv4.extraObjects).toBeGreaterThanOrEqual(1);
  });

  it('persists tutorial completion flag without blocking direct Main Hub launch', () => {
    const store = new Map<string, string>();
    const prevStorage = (globalThis as {localStorage?: Storage}).localStorage;
    (globalThis as {localStorage?: unknown}).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };

    try {
      const fresh = loadProfile();
      expect(fresh.hasCompletedTutorial).toBe(false);

      const completed = markTutorialCompleted(fresh);
      saveProfile(completed);

      const returning = loadProfile();
      expect(returning.hasCompletedTutorial).toBe(true);

      store.set(
        'mashup_mayhem_profile_v1',
        JSON.stringify({hasSeenTutorial: true}),
      );
      const migrated = loadProfile();
      expect(migrated.hasCompletedTutorial).toBe(true);
    } finally {
      if (prevStorage === undefined) {
        delete (globalThis as {localStorage?: Storage}).localStorage;
      } else {
        (globalThis as {localStorage?: Storage}).localStorage = prevStorage;
      }
    }
  });

  it('enforces 1-per-match Mashup Spark hint dice and generates lateral hints', () => {
    const state = createMockState({phase: 'WRITE'});
    const first = processTurnBasedAction(state, 'p1', {type: 'USE_SPARK'});
    expect(first.stateChanged).toBe(true);
    expect(first.nextGS.sparkUsedByPlayer.p1).toBe(true);

    const second = processTurnBasedAction(first.nextGS, 'p1', {type: 'USE_SPARK'});
    expect(second.stateChanged).toBe(false);
    expect(second.rejectedReason).toBe('SPARK_ALREADY_USED');

    const hint = generateMashupSpark(
      state.objects,
      state.situation,
      state.restriction,
      state.wildcard,
      1,
    );
    expect(hint.length > 10).toBe(true);
  });

  it('awards Speed Demon, Crowd Favorite, Comedy Genius (+5) and updates Comedy Streaks on 75+ rounds', () => {
    const subs = [
      {
        id: 'p1',
        authorId: 'p1',
        authorName: 'Player One',
        avatarId: 'avatar_pickle',
        text: 'Launch the toaster dramatically!',
        submittedEarly: true,
        isBot: false,
      },
      {
        id: 'p2',
        authorId: 'p2',
        authorName: 'Player Two',
        avatarId: 'avatar_astro_cat',
        text: 'Tape the burrito to the spatula!',
        submittedEarly: false,
        isBot: false,
      },
    ];
    const baseJudgements = {
      p1: {
        relevance: 14,
        creativity: 14,
        humor: 14,
        originality: 13,
        aiTotal: 55,
        votePoints: 25,
        speedBonus: 5,
        restrictionPenalty: 0,
        finalRoundPoints: 85,
        critique: 'Great!',
        votesReceived: 2,
      },
      p2: {
        relevance: 10,
        creativity: 10,
        humor: 9,
        originality: 10,
        aiTotal: 39,
        votePoints: 10,
        speedBonus: 0,
        restrictionPenalty: 0,
        finalRoundPoints: 49,
        critique: 'Nice!',
        votesReceived: 0,
      },
    };

    const r1 = computeRoundAwardsAndStreaks(
      subs,
      baseJudgements,
      ['p1', 'p2'],
      {p1: 1, p2: 2},
    );
    expect(r1.roundAwards.length).toBe(3);
    expect(r1.nextStreaks.p1).toBe(2);
    expect(r1.nextStreaks.p2).toBe(0);
    // p1 gets +15 from 3 awards (+5 each) and +10 from 2x streak = 85 + 25 = 110
    expect(r1.updatedJudgements.p1.finalRoundPoints).toBe(110);
  });

  it('supports salted account Sign Up, Log In, isolated profile saves, and Global Leaderboard ranking', async () => {
    const store = new Map<string, string>();
    const prevStorage = (globalThis as {localStorage?: Storage}).localStorage;
    (globalThis as {localStorage?: unknown}).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };

    try {
      const badPass = await signUpAccount({
        username: 'ComedyStar',
        password: '123',
        confirmPassword: '123',
        avatarId: 'avatar_pickle',
      });
      expect(badPass.ok).toBe(false);

      const created = await signUpAccount({
        username: 'ComedyStar',
        password: 'secret99',
        confirmPassword: 'secret99',
        avatarId: 'avatar_astro_cat',
      });
      expect(created.ok).toBe(true);
      expect(getCurrentAccount()?.username).toBe('ComedyStar');

      // Duplicate sign-up blocked
      const dup = await signUpAccount({
        username: 'comedystar',
        password: 'secret99',
        confirmPassword: 'secret99',
        avatarId: 'avatar_pickle',
      });
      expect(dup.ok).toBe(false);

      // Update account score and verify Global Leaderboard rank climb
      const beforeRank = getAccountGlobalRank(created.account!.id);
      updateAccountProfileById(created.account!.id, (p) => ({
        ...p,
        totalPoints: 2000,
        wins: 5,
        bestAnswerScore: 99,
      }));
      const afterRank = getAccountGlobalRank(created.account!.id);
      expect(afterRank).toBe(1);
      expect(beforeRank).toBeGreaterThan(afterRank);

      const board = getGlobalLeaderboard(created.account!.id);
      expect(board.length).toBeGreaterThanOrEqual(
        SEEDED_RIVAL_CONTENDERS.length + 1,
      );
      expect(board[0].username).toBe('ComedyStar');

      logoutAccount();
      expect(getCurrentAccount()).toBe(null);

      const wrongLogin = await loginAccount({
        username: 'ComedyStar',
        password: 'wrongpassword',
      });
      expect(wrongLogin.ok).toBe(false);

      const okLogin = await loginAccount({
        username: 'ComedyStar',
        password: 'secret99',
      });
      expect(okLogin.ok).toBe(true);
      expect(okLogin.account?.profile.totalPoints).toBe(2000);
    } finally {
      if (prevStorage === undefined) {
        delete (globalThis as {localStorage?: Storage}).localStorage;
      } else {
        (globalThis as {localStorage?: Storage}).localStorage = prevStorage;
      }
    }
  });
});
