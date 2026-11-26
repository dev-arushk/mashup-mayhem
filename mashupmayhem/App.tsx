// tslint:disable
/* eslint-disable */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {lerp} from './animation';
import {
  AVATAR_CATALOG,
  BOT_PERSONAS,
  GAME_MODES,
  GameModeId,
  ObjectCategory,
  PLAYER_TITLES,
  PROFILE_FRAMES,
  REACTION_STICKERS,
  WILDCARDS,
} from './contentLibrary';
import {AccountModal} from './AccountModal';
import {
  accountToLeaderboardEntry,
  getAccountGlobalRank,
  getCurrentAccount,
  getGlobalLeaderboard,
  GlobalLeaderboardEntry,
  RankClimbResult,
  updateAccountProfileById,
  upsertRemoteLeaderboardEntry,
  UserAccount,
} from './accountsEngine';
import {GAME_ID, getConfig, THEME} from './constants';
import {GlobalLeaderboardModal} from './GlobalLeaderboardModal';
import {IntroTutorialStage} from './IntroTutorialStage';
import {
  AIBreakdown,
  checkRestrictionViolation,
  computeLevelFromXp,
  computeRoundAwardsAndStreaks,
  CustomBattleConfig,
  GameAction,
  generateBotAnswer,
  generateMashupSpark,
  getDailyDateKey,
  getMayhemModifiers,
  loadProfile,
  markTutorialCompleted,
  MashupTournamentState,
  pickRoundPrompt,
  PlayerProfile,
  PlayerSubmission,
  processTurnBasedAction,
  sanitizeSafeText,
  saveProfile,
  scoreSubmissionAI,
} from './mashupEngine';
import {MultiplayerOverlays} from './MultiplayerOverlays';
import {PerformanceMonitor} from './performance_monitor';
import {SpriteActionConfig, SpriteAnimationState, SpriteRenderer} from './SpriteRenderer';
import {SyncEventType} from './types';
import {useMultiplayerLobby} from './useMultiplayerLobby';
import {useTournament} from './useTournament';
import BackgroundMusic from './utils/BackgroundMusic';
import {
  createFixedStepper,
  drawAsset,
  formatTime,
  gameAudio,
  prepareCanvas,
  shuffle,
  useAssets,
  useIsMobile,
} from './utils/helper';
import {useRpc} from './utils/usePlayground';

interface CustomWindow extends Window {
  canHandleBackKey?: boolean;
}

type TournamentGameState = MashupTournamentState;

const ASSETS_MANIFEST: Record<string, string> = {
  stage_backdrop: 'assets/images/stage_backdrop.png',
  host_gizmo_idle: 'assets/images/host_gizmo_idle.png',
  host_gizmo_jump: 'assets/images/host_gizmo_jump.png',
  wildcard_wheel: 'assets/images/wildcard_wheel.png',
  mystery_cube: 'assets/images/mystery_cube.png',
  coin_token: 'assets/images/coin_token.png',
  trophy_crown: 'assets/images/trophy_crown.png',
  avatar_pickle: 'assets/images/avatar_pickle.png',
  avatar_astro_cat: 'assets/images/avatar_astro_cat.png',
  avatar_toaster_knight: 'assets/images/avatar_toaster_knight.png',
  avatar_disco_octopus: 'assets/images/avatar_disco_octopus.png',
  avatar_detective_taco: 'assets/images/avatar_detective_taco.png',
  avatar_ninja_cactus: 'assets/images/avatar_ninja_cactus.png',
};

const GIZMO_SPRITE_CONFIG: Record<string, SpriteActionConfig> = {
  IDLE: {
    imageUrl: 'host_gizmo_idle',
    totalFrames: 16,
    frameWidth: 512,
    frameHeight: 512,
    fps: 12,
    loop: true,
  },
  JUMP: {
    imageUrl: 'host_gizmo_jump',
    totalFrames: 16,
    frameWidth: 512,
    frameHeight: 512,
    fps: 22,
    loop: true,
  },
};

interface CanvasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  ttl: number;
  maxTtl: number;
  emoji?: string;
  rotation: number;
  vRot: number;
}

const DEFAULT_CUSTOM_CONFIG: CustomBattleConfig = {
  customSituation: '',
  customObjectsText: '',
  rounds: 3,
  writeSeconds: 40,
  objectsCount: 3,
  aiWeight: 60,
  wildcardsEnabled: true,
  categoryFilter: 'ALL',
};

const COMIC_SHADOW = 'shadow-[0_4px_0_#1A1336] border-[3px] border-[#1A1336]';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepperRef = useRef<ReturnType<typeof createFixedStepper>>();
  const isMobile = useIsMobile();
  const {assets, isReady: assetsReady} = useAssets(ASSETS_MANIFEST);

  // --- Accounts, Profile, Cosmetics & Global Leaderboard ---
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() =>
    getCurrentAccount(),
  );
  const currentAccountRef = useRef<UserAccount | null>(currentAccount);
  useEffect(() => {
    currentAccountRef.current = currentAccount;
  }, [currentAccount]);

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const acc = getCurrentAccount();
    return acc ? acc.profile : loadProfile();
  });

  const [accountModalState, setAccountModalState] = useState<{
    open: boolean;
    tab: 'LOGIN' | 'SIGNUP';
  }>({open: false, tab: 'LOGIN'});
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [remoteLeaderboardEntries, setRemoteLeaderboardEntries] = useState<
    Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>[]
  >([]);
  const [rankClimbInfo, setRankClimbInfo] = useState<RankClimbResult | null>(
    null,
  );
  const guestMatchPointsPendingRef = useRef<{
    points: number;
    won: boolean;
    bestScore: number;
  } | null>(null);
  const [activeSparkHint, setActiveSparkHint] = useState<string | null>(null);
  const [remotePlayerNames, setRemotePlayerNames] = useState<
    Record<string, string>
  >({});

  const updateProfile = useCallback(
    (updater: (prev: PlayerProfile) => PlayerProfile) => {
      const activeAcc = currentAccountRef.current;
      if (activeAcc) {
        const updatedAcc = updateAccountProfileById(activeAcc.id, updater);
        if (updatedAcc) {
          currentAccountRef.current = updatedAcc;
          setCurrentAccount(updatedAcc);
          setProfile(updatedAcc.profile);
          return;
        }
      }
      setProfile((prev) => {
        const next = updater(prev);
        next.level = computeLevelFromXp(next.xp);
        saveProfile(next);
        return next;
      });
    },
    [],
  );

  // Sync audio mute state on mount
  useEffect(() => {
    gameAudio.setMuted(profile.soundMuted);
    gameAudio.setVolume(getConfig('defaultSfxVolume'));
  }, []);

  // --- Lobby & Mode Configuration State ---
  const [selectedMode, setSelectedMode] = useState<GameModeId>('CLASSIC');
  const [withBotsInMulti, setWithBotsInMulti] = useState<boolean>(false);
  const [customConfig, setCustomConfig] = useState<CustomBattleConfig>(
    DEFAULT_CUSTOM_CONFIG,
  );
  const [teamNames, setTeamNames] = useState<{A: string; B: string}>({
    A: 'Team Thunder',
    B: 'Team Spark',
  });
  const [lobbyModalTab, setLobbyModalTab] = useState<
    'MAIN' | 'LOCKER' | 'MISSIONS' | 'CUSTOM'
  >('MAIN');
  const [isSoloPractice, setIsSoloPractice] = useState(false);
  const isSoloPracticeRef = useRef(false);
  useEffect(() => {
    isSoloPracticeRef.current = isSoloPractice;
  }, [isSoloPractice]);

  // Local writing/chat & matchmaking inputs
  const [draftAnswer, setDraftAnswer] = useState('');
  const [teamChatInput, setTeamChatInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [readyPlayerIds, setReadyPlayerIds] = useState<string[]>([]);
  const [displayTimeLeft, setDisplayTimeLeft] = useState<number>(0);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [hudMetrics, setHudMetrics] = useState<{
    fps?: number;
    lowFps?: number;
    jitter?: number;
    heapUsed?: number;
  }>({});

  // Refs for 60 FPS GPU-composited timer bar & phase start tracking
  const timerBarRef = useRef<HTMLDivElement>(null);
  const phaseTimingRef = useRef<{startedAt: number; duration: number}>({
    startedAt: performance.now(),
    duration: 1,
  });
  const perfMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor(60));

  // --- MULTIPLAYER LOBBY & SDK INTEGRATION ---
  const {
    sdk,
    lobbyId,
    lobbyIdRef,
    isHost,
    isHostRef,
    myPlayerId,
    myPlayerIdRef,
    players,
    playersRef,
    networkStatus,
    matchmakingState,
    matchmakingMessage,
    quickMatch,
    joinLobbyByCode,
    createPublicRoom,
    getShareUrl,
    getPlayerName: lobbyGetPlayerName,
    onGameEventRef,
  } = useMultiplayerLobby({
    onLobbyJoined: (_joinedLobbyId, joinedPlayers) => {
      setReadyPlayerIds((prev) => {
        const next = new Set(prev);
        joinedPlayers.forEach((p) => {
          if (p.isHost || p.is_host) next.add(p.playerId);
        });
        if (myPlayerIdRef.current) next.add(myPlayerIdRef.current);
        return Array.from(next);
      });
      setAppScreen((prev) => (prev === 'BOOT' ? 'LOBBY' : prev));
    },
  });

  // Guest automatically requests catch-up state sync when joining an online lobby
  useEffect(() => {
    if (isHost || !sdk || !lobbyId) return;
    try {
      sdk.sendGameEvent({
        type: 'REQUEST_SYNC',
        lobbyId,
        payload: JSON.stringify({senderId: myPlayerId}),
      });
    } catch {
      // Ignore if channel still warming up
    }
  }, [isHost, sdk, lobbyId, myPlayerId]);

  const [exitChat] = useRpc<Record<string, unknown>, void>('ExitChat');

  const [appScreen, setAppScreen] = useState<
    'BOOT' | 'TUTORIAL' | 'LOBBY' | 'PLAYING' | 'PODIUM'
  >('LOBBY');
  const appScreenRef = useRef<
    'BOOT' | 'TUTORIAL' | 'LOBBY' | 'PLAYING' | 'PODIUM'
  >('LOBBY');
  useEffect(() => {
    appScreenRef.current = appScreen;
    console.log('[App] Flow Control: appScreen changed to ->', appScreen);
  }, [appScreen]);

  const [showInGameMenu, setShowInGameMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showDebugHud, setShowDebugHud] = useState(false);

  if (!stepperRef.current) {
    stepperRef.current = createFixedStepper(
      getConfig('stepMs'),
      getConfig('maxSubSteps'),
    );
  }

  const handleIncomingActionRef =
    useRef<(senderId: string, action: GameAction) => void>();

  // Helper to build a fresh round payload on Host
  const buildRoundStatePatch = useCallback(
    (
      roundNum: number,
      mode: GameModeId,
      cConfig: CustomBattleConfig,
      activeIds: string[],
      bots: string[],
      avatarsMap: Record<string, string>,
      namesMap: Record<string, string>,
      tNames: {A: string; B: string},
      mayhemLv: number,
    ): Partial<TournamentGameState> => {
      const prompt = pickRoundPrompt(
        mode,
        roundNum,
        cConfig,
        getConfig('wildcardChance'),
        mayhemLv,
      );
      const teamAssignments: Record<string, 'A' | 'B'> = {};
      [...activeIds, ...bots].forEach((id, idx) => {
        teamAssignments[id] = idx % 2 === 0 ? 'A' : 'B';
      });
      const countdownDur = getConfig('countdownSeconds');
      return {
        activePlayerIndex: 0,
        turnNumber: 1,
        mode,
        mayhemLevel: mayhemLv,
        roundSeed: prompt.roundSeed,
        readyPlayerIds: [...activeIds],
        phase: 'COUNTDOWN',
        phaseDurationSec: countdownDur,
        phaseTimeLeftSec: countdownDur,
        countdownValue: 3,
        wildcard: prompt.wildcard,
        mysteryRevealed: prompt.wildcard !== 'MYSTERY_OBJECT',
        swappedApplied: false,
        objects: prompt.objects,
        swapObject: prompt.swapObject,
        situation: prompt.situation,
        restriction: prompt.restriction,
        submissions: {},
        blindOrderIds: [],
        typingPlayerIds: [],
        votes: {},
        judgements: {},
        playerAvatars: avatarsMap,
        playerNames: namesMap,
        botIds: bots,
        teamAssignments,
        teamNames: tNames,
        teamChat: [],
        reactions: [],
        roundWinnerId: null,
        suddenDeathLoserId: null,
        roundAwards: [],
        submissionOrder: [],
        customConfig: cConfig,
        turnLog: [],
      };
    },
    [],
  );

  // --- TOURNAMENT STATE & FLOW MACHINE ---
  const {
    gameState,
    setGameState,
    gameStateRef,
    customRounds,
    setCustomRounds,
    getDefaultRounds,
    commenceTournament: tournamentCommence,
    startNextRound: tournamentStartNextRound,
    hostEndMatch,
    restartTournament: tournamentRestart,
    endLobby,
    returnToLobby,
    handleForfeit,
  } = useTournament<TournamentGameState>({
    gameId: GAME_ID,
    maxActivePlayers: (getConfig('activePlayersCount') as number) || 4,
    sdk,
    isHost,
    isHostRef,
    myPlayerId,
    myPlayerIdRef,
    players,
    playersRef,
    lobbyId,
    lobbyIdRef,
    appScreen,
    appScreenRef,
    setAppScreen,
    onGameEventRef,
    onCustomGameEvent: (event, payload, senderId) => {
      if (event?.type === 'LOBBY_MODE_SYNC') {
        if (!isHostRef.current) {
          if (payload.mode) setSelectedMode(payload.mode);
          if (payload.customConfig) setCustomConfig(payload.customConfig);
          if (typeof payload.withBotsInMulti === 'boolean') {
            setWithBotsInMulti(payload.withBotsInMulti);
          }
          if (payload.teamNames) setTeamNames(payload.teamNames);
          if (Array.isArray(payload.readyPlayerIds)) {
            setReadyPlayerIds(payload.readyPlayerIds);
          }
        }
        return;
      }
      if (event?.type === 'LOBBY_READY_TOGGLE' && isHostRef.current) {
        const pid = payload.playerId || senderId;
        if (pid) {
          setReadyPlayerIds((prev) =>
            prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
          );
        }
        return;
      }
      if (event?.type === 'LEADERBOARD_SYNC') {
        if (payload?.entry?.username) {
          upsertRemoteLeaderboardEntry(payload.entry);
          setRemoteLeaderboardEntries((prev) => {
            const filtered = prev.filter(
              (e) =>
                e.username.toLowerCase() !==
                payload.entry.username.toLowerCase(),
            );
            return [...filtered, payload.entry];
          });
        }
        if (payload?.playerId && payload?.displayName) {
          setRemotePlayerNames((prev) => ({
            ...prev,
            [payload.playerId]: payload.displayName,
          }));
        }
        return;
      }
      if (isHostRef.current) {
        if (event?.type === SyncEventType.INPUT_SYNC && senderId) {
          const logicalSender = payload.senderId || senderId;
          handleIncomingActionRef.current?.(logicalSender, payload.action);
        }
      }
    },
    initialCustomState: {
      activePlayerIndex: 0,
      turnNumber: 1,
      mode: 'CLASSIC',
      mayhemLevel: loadProfile().mayhemLevel,
      roundSeed: 1,
      readyPlayerIds: [],
      phase: 'COUNTDOWN',
      phaseDurationSec: 2.5,
      phaseTimeLeftSec: 2.5,
      countdownValue: 3,
      wildcard: null,
      mysteryRevealed: true,
      swappedApplied: false,
      objects: [],
      swapObject: null,
      situation: '',
      restriction: null,
      submissions: {},
      blindOrderIds: [],
      typingPlayerIds: [],
      votes: {},
      judgements: {},
      cumulativePoints: {},
      playerAvatars: {},
      playerNames: {},
      botIds: [],
      withBots: false,
      teamAssignments: {},
      teamNames: {A: 'Team Thunder', B: 'Team Spark'},
      teamChat: [],
      reactions: [],
      roundWinnerId: null,
      suddenDeathLoserId: null,
      comedyStreaks: {},
      roundAwards: [],
      sparkUsedByPlayer: {},
      submissionOrder: [],
      customConfig: DEFAULT_CUSTOM_CONFIG,
      turnLog: [],
    },
    onInitRound: (isFirstRound, currentGS) => {
      const modeToUse = isFirstRound ? selectedMode : currentGS.mode;
      const cConfigToUse = isFirstRound ? customConfig : currentGS.customConfig;
      const matchMayhemLv = isFirstRound
        ? profile.mayhemLevel
        : currentGS.mayhemLevel || 1;
      const shouldAddBots =
        modeToUse === 'TOURNAMENT' ||
        (isFirstRound ? withBotsInMulti : currentGS.withBots);

      const bots = shouldAddBots
        ? BOT_PERSONAS.slice(0, modeToUse === 'TOURNAMENT' ? 3 : 2).map(
            (b) => b.id,
          )
        : [];

      const avatarsMap: Record<string, string> = {
        ...currentGS.playerAvatars,
      };
      const namesMap: Record<string, string> = {...currentGS.playerNames};

      playersRef.current.forEach((p, idx) => {
        if (!avatarsMap[p.playerId]) {
          avatarsMap[p.playerId] =
            p.playerId === myPlayerIdRef.current
              ? profile.equippedAvatarId
              : AVATAR_CATALOG[idx % AVATAR_CATALOG.length].id;
        }
        namesMap[p.playerId] =
          p.playerId === myPlayerIdRef.current &&
          currentAccountRef.current?.username
            ? currentAccountRef.current.username
            : remotePlayerNames[p.playerId] ||
              p.displayName ||
              p.name ||
              `Player ${idx + 1}`;
      });
      bots.forEach((bid) => {
        const persona = BOT_PERSONAS.find((b) => b.id === bid);
        if (persona) {
          avatarsMap[bid] = persona.avatarId;
          namesMap[bid] = persona.name;
        }
      });

      const patch = buildRoundStatePatch(
        currentGS.round,
        modeToUse,
        cConfigToUse,
        currentGS.activePlayerIds,
        bots,
        avatarsMap,
        namesMap,
        isFirstRound ? teamNames : currentGS.teamNames,
        matchMayhemLv,
      );

      const cumulativePoints = isFirstRound
        ? [...currentGS.activePlayerIds, ...bots].reduce<Record<string, number>>(
            (acc, id) => ({...acc, [id]: 0}),
            {},
          )
        : {...currentGS.cumulativePoints};

      const modeMeta =
        GAME_MODES.find((m) => m.id === modeToUse) ?? GAME_MODES[0];
      const maxRoundsOverride =
        customRounds !== null
          ? customRounds
          : modeToUse === 'CUSTOM'
            ? cConfigToUse.rounds
            : modeMeta.rounds;

      return {
        ...patch,
        ...(isFirstRound ? {comedyStreaks: {}, sparkUsedByPlayer: {}} : {}),
        withBots: shouldAddBots,
        cumulativePoints,
        maxRounds: maxRoundsOverride,
      };
    },
    onResetMatch: () => ({
      activePlayerIndex: 0,
      turnNumber: 1,
      phase: 'COUNTDOWN',
      submissions: {},
      blindOrderIds: [],
      typingPlayerIds: [],
      votes: {},
      judgements: {},
      reactions: [],
      teamChat: [],
      roundWinnerId: null,
      suddenDeathLoserId: null,
      comedyStreaks: {},
      roundAwards: [],
      sparkUsedByPlayer: {},
      submissionOrder: [],
      turnLog: [],
    }),
    onForfeit: (forfeiterId, remainingActive, currentGS) => {
      const currentActiveId =
        currentGS.activePlayerIds[currentGS.activePlayerIndex];
      const nextActiveIndex =
        currentActiveId === forfeiterId
          ? currentGS.activePlayerIndex % Math.max(1, remainingActive.length)
          : remainingActive.indexOf(currentActiveId);
      return {
        activePlayerIndex: Math.max(0, nextActiveIndex),
      };
    },
  });

  // Sync lobby mode, ready states & custom settings from Host to Guests (re-fires on player join!)
  useEffect(() => {
    if (isHost && sdk && lobbyId && (appScreen === 'LOBBY' || appScreen === 'TUTORIAL')) {
      sdk.sendGameEvent({
        type: 'LOBBY_MODE_SYNC',
        payload: JSON.stringify({
          mode: selectedMode,
          customConfig,
          withBotsInMulti,
          teamNames,
          readyPlayerIds,
        }),
      });
    }
  }, [
    selectedMode,
    customConfig,
    withBotsInMulti,
    teamNames,
    readyPlayerIds,
    players.length,
    isHost,
    sdk,
    lobbyId,
    appScreen,
  ]);

  // Periodic Host State Heartbeat during active matches for rock-solid cross-device catch-up
  useEffect(() => {
    if (!isHost || !sdk || !lobbyId) return;
    if (appScreen !== 'PLAYING' && appScreen !== 'PODIUM') return;
    const iv = setInterval(() => {
      const gs = gameStateRef.current;
      const elapsedSec =
        (performance.now() - phaseTimingRef.current.startedAt) / 1000;
      const remSec = Math.max(
        0,
        Number((gs.phaseDurationSec - elapsedSec).toFixed(1)),
      );
      sdk.sendGameEvent({
        type: SyncEventType.STATE_SYNC,
        gameId: GAME_ID,
        lobbyId: lobbyIdRef.current,
        round: gs.round,
        tick: gs.tick,
        payload: JSON.stringify({
          ...gs,
          phaseTimeLeftSec: remSec,
          _full: true,
        }),
      });
    }, 1500);
    return () => clearInterval(iv);
  }, [isHost, sdk, lobbyId, appScreen, lobbyIdRef]);

  // Unified name resolver covering humans + bots + signed-in account username
  const getPlayerName = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return 'Waiting...';
      if (id === myPlayerId && currentAccount?.username) {
        return currentAccount.username;
      }
      const bot = BOT_PERSONAS.find((b) => b.id === id);
      if (bot) return bot.name;
      if (remotePlayerNames[id]) return remotePlayerNames[id];
      if (gameState.playerNames?.[id]) return gameState.playerNames[id];
      return lobbyGetPlayerName(id);
    },
    [
      myPlayerId,
      currentAccount?.username,
      remotePlayerNames,
      gameState.playerNames,
      lobbyGetPlayerName,
    ],
  );

  // Sync signed-in player's account username & leaderboard card to room peers
  const syncMyAccountToRoom = useCallback(
    (acc: UserAccount | null) => {
      if (!sdk || !lobbyIdRef.current || !myPlayerIdRef.current) return;
      try {
        sdk.sendGameEvent({
          type: 'LEADERBOARD_SYNC',
          lobbyId: lobbyIdRef.current,
          payload: JSON.stringify({
            playerId: myPlayerIdRef.current,
            displayName: acc?.username || lobbyGetPlayerName(myPlayerIdRef.current),
            entry: acc ? accountToLeaderboardEntry(acc) : null,
          }),
        });
      } catch {
        // Ignore if channel warming up
      }
    },
    [sdk, lobbyIdRef, myPlayerIdRef, lobbyGetPlayerName],
  );

  useEffect(() => {
    if (sdk && lobbyId && myPlayerId && currentAccount) {
      syncMyAccountToRoom(currentAccount);
    }
  }, [sdk, lobbyId, myPlayerId, players.length, currentAccount, syncMyAccountToRoom]);

  // Helper to reliably broadcast STATE_SYNC bursts over unreliable WebRTC
  const broadcastStateSync = useCallback(
    (nextGS: TournamentGameState) => {
      if (!sdk || !lobbyIdRef.current) return;
      let count = 0;
      const sendOnce = () => {
        sdk.sendGameEvent({
          type: SyncEventType.STATE_SYNC,
          gameId: GAME_ID,
          lobbyId: lobbyIdRef.current,
          round: nextGS.round,
          tick: nextGS.tick,
          payload: JSON.stringify({...nextGS, _full: true}),
        });
      };
      sendOnce();
      const iv = setInterval(() => {
        count++;
        sendOnce();
        if (count >= 4) clearInterval(iv);
      }, 100);
    },
    [sdk, lobbyIdRef],
  );

  // Start Solo Practice vs Bots (when 1 human player wants to play immediately)
  const startSoloPractice = useCallback(() => {
    if (!sdk || !myPlayerIdRef.current) return;
    const runMayhemLevel = profile.mayhemLevel;
    setIsSoloPractice(true);
    isSoloPracticeRef.current = true;
    updateProfile((prev) => ({
      ...prev,
      totalTries: prev.totalTries + 1,
      mayhemLevel: prev.mayhemLevel + 1,
    }));
    sdk.startGame();

    const myId = myPlayerIdRef.current;
    const botList = BOT_PERSONAS.slice(0, 3).map((b) => b.id);
    const avatarsMap: Record<string, string> = {
      [myId]: profile.equippedAvatarId,
    };
    const namesMap: Record<string, string> = {
      [myId]: currentAccountRef.current?.username || lobbyGetPlayerName(myId),
    };
    botList.forEach((bid) => {
      const persona = BOT_PERSONAS.find((b) => b.id === bid)!;
      avatarsMap[bid] = persona.avatarId;
      namesMap[bid] = persona.name;
    });

    const modeMeta =
      GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];
    const totalRounds =
      customRounds !== null
        ? customRounds
        : selectedMode === 'CUSTOM'
          ? customConfig.rounds
          : modeMeta.rounds;

    const patch = buildRoundStatePatch(
      1,
      selectedMode,
      customConfig,
      [myId],
      botList,
      avatarsMap,
      namesMap,
      teamNames,
      runMayhemLevel,
    );

    const cumulativePoints: Record<string, number> = {[myId]: 0};
    botList.forEach((b) => (cumulativePoints[b] = 0));

    const standings: Record<string, number> = {[myId]: 0};
    botList.forEach((b) => (standings[b] = 0));

    const initGS: TournamentGameState = {
      ...gameStateRef.current,
      status: 'PLAYING',
      tick: gameStateRef.current.tick + 1,
      round: 1,
      maxRounds: totalRounds,
      activePlayerIds: [myId],
      queue: [],
      forfeitedPlayerIds: [],
      scores: {[myId]: 0},
      winnerId: null,
      standings,
      tournamentWinnerId: null,
      isForfeit: false,
      forfeiterId: null,
      withBots: true,
      cumulativePoints,
      comedyStreaks: {},
      sparkUsedByPlayer: {},
      ...(patch as any),
    };

    gameStateRef.current = initGS;
    setGameState(initGS);
    setAppScreen('PLAYING');
    gameAudio.playConfirmSelect();
  }, [
    sdk,
    profile.equippedAvatarId,
    profile.mayhemLevel,
    updateProfile,
    lobbyGetPlayerName,
    selectedMode,
    customRounds,
    customConfig,
    teamNames,
    buildRoundStatePatch,
    setGameState,
  ]);

  const handleCommenceMultiplayer = useCallback(() => {
    setIsSoloPractice(false);
    isSoloPracticeRef.current = false;
    updateProfile((prev) => ({
      ...prev,
      totalTries: prev.totalTries + 1,
      mayhemLevel: prev.mayhemLevel + 1,
    }));
    gameAudio.playConfirmSelect();
    tournamentCommence();
  }, [tournamentCommence, updateProfile]);

  // Conclude Round cleanly (delegating to useTournament.hostEndMatch in multiplayer!)
  const concludeCurrentRound = useCallback(
    (winnerId: string | null) => {
      if (!isHostRef.current) return;
      if (isSoloPracticeRef.current) {
        const gs = gameStateRef.current;
        const nextStandings = {...gs.standings};
        if (winnerId && winnerId !== 'DRAW') {
          nextStandings[winnerId] = (nextStandings[winnerId] || 0) + 1;
          if (sdk) {
            sdk.scoreUpdated({
              value: gs.cumulativePoints[winnerId] || nextStandings[winnerId],
              level: String(gs.round),
            });
          }
        }
        if (sdk) sdk.levelComplete(gs.round);

        const isOver = gs.round >= gs.maxRounds;
        let tWinner: string | null = null;
        if (isOver) {
          let bestId: string | null = null;
          let bestPts = -1;
          Object.entries(gs.cumulativePoints).forEach(([pid, pts]) => {
            if (pts > bestPts) {
              bestPts = pts;
              bestId = pid;
            }
          });
          tWinner = bestId;
        }

        const podiumGS: TournamentGameState = {
          ...gs,
          status: 'PODIUM',
          tick: gs.tick + 1,
          round: isOver ? gs.round : gs.round + 1,
          winnerId,
          standings: nextStandings,
          tournamentWinnerId: tWinner,
        };
        gameStateRef.current = podiumGS;
        setGameState(podiumGS);
        setAppScreen('PODIUM');
      } else {
        hostEndMatch(winnerId);
      }
    },
    [hostEndMatch, sdk, setGameState],
  );

  const handleStartNextRound = useCallback(() => {
    gameAudio.playConfirmSelect();
    if (isSoloPracticeRef.current) {
      const gs = gameStateRef.current;
      const patch = buildRoundStatePatch(
        gs.round,
        gs.mode,
        gs.customConfig,
        gs.activePlayerIds,
        gs.botIds,
        gs.playerAvatars,
        gs.playerNames,
        gs.teamNames,
        gs.mayhemLevel || 1,
      );
      const nextGS: TournamentGameState = {
        ...gs,
        status: 'PLAYING',
        tick: gs.tick + 1,
        winnerId: null,
        scores: gs.activePlayerIds.reduce<Record<string, number>>(
          (a, id) => ({...a, [id]: 0}),
          {},
        ),
        ...(patch as any),
      };
      gameStateRef.current = nextGS;
      setGameState(nextGS);
      setAppScreen('PLAYING');
    } else {
      tournamentStartNextRound();
    }
  }, [buildRoundStatePatch, setGameState, tournamentStartNextRound]);

  const handleRestartTournament = useCallback(() => {
    setIsSoloPractice(false);
    isSoloPracticeRef.current = false;
    tournamentRestart();
  }, [tournamentRestart]);

  // ============================================================================
  // HOST PHASE TRANSITIONS (WRITE -> VOTE -> JUDGE -> SCOREBOARD -> PODIUM)
  const transitionHostToVote = useCallback(
    (gs: TournamentGameState): TournamentGameState => {
      const subs: Record<string, PlayerSubmission> = {...gs.submissions};
      const mods = getMayhemModifiers(gs.mayhemLevel || 1);

      // Generate personality bot submissions scaled to current Mayhem Level
      gs.botIds.forEach((bid, idx) => {
        const persona = BOT_PERSONAS.find((b) => b.id === bid) ?? BOT_PERSONAS[idx];
        const subKey =
          gs.mode === 'TEAM_CHAOS'
            ? `team_${gs.teamAssignments[bid] || 'B'}`
            : bid;
        if (!subs[subKey]) {
          subs[subKey] = {
            id: subKey,
            authorId: bid,
            authorName:
              gs.mode === 'TEAM_CHAOS'
                ? gs.teamNames[gs.teamAssignments[bid] || 'B']
                : persona.name,
            avatarId: persona.avatarId,
            text: generateBotAnswer(
              idx,
              gs.objects,
              gs.situation,
              gs.wildcard,
              gs.restriction,
              mods.botSkillTier,
            ),
            submittedEarly: false,
            isBot: true,
            teamId:
              gs.mode === 'TEAM_CHAOS'
                ? gs.teamAssignments[bid] || 'B'
                : undefined,
          };
        }
      });

      // Fallback auto-submit for any active human who timed out
      if (gs.mode !== 'TEAM_CHAOS') {
        gs.activePlayerIds.forEach((pid) => {
          if (!subs[pid]) {
            subs[pid] = {
              id: pid,
              authorId: pid,
              authorName: gs.playerNames[pid] || 'Contestant',
              avatarId: gs.playerAvatars[pid] || AVATAR_CATALOG[0].id,
              text: `Quick panic plan: wave ${gs.objects[0]?.name || 'everything'} dramatically and hope for mercy!`,
              submittedEarly: false,
              isBot: false,
            };
          }
        });
      }

      const blindOrderIds = shuffle(Object.keys(subs));
      const voteDur =
        gs.mode === 'SPEED_MADNESS'
          ? Math.max(10, Math.round(getConfig('voteSeconds') * 0.6))
          : getConfig('voteSeconds');

      return {
        ...gs,
        tick: gs.tick + 1,
        phase: 'VOTE',
        phaseDurationSec: voteDur,
        phaseTimeLeftSec: voteDur,
        mysteryRevealed: true,
        submissions: subs,
        blindOrderIds,
        typingPlayerIds: [],
        votes: {},
      };
    },
    [],
  );

  const transitionHostToJudge = useCallback(
    (gs: TournamentGameState): TournamentGameState => {
      const subList = Object.values(gs.submissions);
      const allVoters = [...gs.activePlayerIds, ...gs.botIds];

      // Bots cast fair randomized votes (never self-voting)
      const finalVotes: Record<string, string> = {...gs.votes};
      gs.botIds.forEach((bid, idx) => {
        if (!finalVotes[bid]) {
          const eligible = subList.filter((s) => s.authorId !== bid);
          if (eligible.length > 0) {
            const pick = eligible[(idx + gs.round) % eligible.length];
            finalVotes[bid] = pick.id;
          }
        }
      });

      const voteCounts: Record<string, number> = {};
      Object.values(finalVotes).forEach((subId) => {
        voteCounts[subId] = (voteCounts[subId] || 0) + 1;
      });

      const aiWeight =
        gs.mode === 'CUSTOM'
          ? gs.customConfig.aiWeight
          : (GAME_MODES.find((m) => m.id === gs.mode)?.aiWeight ??
            getConfig('aiJudgeWeight'));

      const rawJudgements: Record<string, AIBreakdown> = {};
      const roundScores: Record<string, number> = {};
      const nextCumulative = {...gs.cumulativePoints};
      const mods = getMayhemModifiers(gs.mayhemLevel || 1);

      subList.forEach((sub) => {
        const votesForSub = voteCounts[sub.id] || 0;
        rawJudgements[sub.id] = scoreSubmissionAI(
          sub,
          subList,
          gs.objects,
          gs.situation,
          gs.restriction,
          gs.wildcard,
          votesForSub,
          Math.max(1, allVoters.length - 1),
          aiWeight,
          getConfig('earlySubmitBonus'),
          mods.aiStrictness,
        );
      });

      const {roundAwards, nextStreaks, updatedJudgements} =
        computeRoundAwardsAndStreaks(
          subList,
          rawJudgements,
          gs.submissionOrder || [],
          gs.comedyStreaks || {},
        );

      subList.forEach((sub) => {
        const breakdown = updatedJudgements[sub.id];
        if (!breakdown) return;
        if (gs.mode === 'TEAM_CHAOS' && sub.teamId) {
          allVoters.forEach((pid) => {
            if (gs.teamAssignments[pid] === sub.teamId) {
              roundScores[pid] = breakdown.finalRoundPoints;
              nextCumulative[pid] =
                (nextCumulative[pid] || 0) + breakdown.finalRoundPoints;
            }
          });
        } else {
          roundScores[sub.authorId] = breakdown.finalRoundPoints;
          nextCumulative[sub.authorId] =
            (nextCumulative[sub.authorId] || 0) + breakdown.finalRoundPoints;
        }
      });

      // Sudden Death Wildcard penalty to lowest scorer
      let suddenDeathLoserId: string | null = null;
      if (gs.wildcard === 'SUDDEN_DEATH' && subList.length >= 2) {
        let lowestId = subList[0].authorId;
        let lowestPts = Infinity;
        subList.forEach((s) => {
          const pts = updatedJudgements[s.id]?.finalRoundPoints ?? 0;
          if (pts < lowestPts) {
            lowestPts = pts;
            lowestId = s.authorId;
          }
        });
        suddenDeathLoserId = lowestId;
        nextCumulative[lowestId] = Math.max(0, (nextCumulative[lowestId] || 0) - 15);
      }

      // Determine round winner
      let roundWinnerId: string | null = null;
      let topScore = -1;
      let tie = false;
      Object.entries(roundScores).forEach(([pid, sc]) => {
        if (sc > topScore) {
          topScore = sc;
          roundWinnerId = pid;
          tie = false;
        } else if (sc === topScore) {
          tie = true;
        }
      });
      if (tie && gs.mode !== 'TEAM_CHAOS') roundWinnerId = 'DRAW';

      const judgeDur = getConfig('judgeSeconds');
      return {
        ...gs,
        tick: gs.tick + 1,
        phase: 'JUDGE',
        phaseDurationSec: judgeDur,
        phaseTimeLeftSec: judgeDur,
        votes: finalVotes,
        judgements: updatedJudgements,
        roundAwards,
        comedyStreaks: nextStreaks,
        scores: {...gs.scores, ...roundScores},
        cumulativePoints: nextCumulative,
        roundWinnerId,
        suddenDeathLoserId,
      };
    },
    [],
  );

  // Advance host phase on timer or early completion
  const advanceHostPhase = useCallback(() => {
    if (!isHostRef.current) return;
    const gs = gameStateRef.current;
    if (gs.status !== 'PLAYING') return;

    let nextGS: TournamentGameState = gs;

    if (gs.phase === 'COUNTDOWN') {
      if (gs.wildcard) {
        const wDur = getConfig('wildcardSeconds');
        nextGS = {
          ...gs,
          tick: gs.tick + 1,
          phase: 'WILDCARD',
          phaseDurationSec: wDur,
          phaseTimeLeftSec: wDur,
        };
      } else {
        const rDur = getConfig('revealSeconds');
        nextGS = {
          ...gs,
          tick: gs.tick + 1,
          phase: 'REVEAL',
          phaseDurationSec: rDur,
          phaseTimeLeftSec: rDur,
        };
      }
    } else if (gs.phase === 'WILDCARD') {
      const rDur = getConfig('revealSeconds');
      nextGS = {
        ...gs,
        tick: gs.tick + 1,
        phase: 'REVEAL',
        phaseDurationSec: rDur,
        phaseTimeLeftSec: rDur,
      };
    } else if (gs.phase === 'REVEAL') {
      const modeMeta =
        GAME_MODES.find((m) => m.id === gs.mode) ?? GAME_MODES[0];
      const baseWrite =
        gs.mode === 'CUSTOM'
          ? gs.customConfig.writeSeconds
          : gs.mode === 'CLASSIC'
            ? getConfig('classicWriteSeconds')
            : gs.mode === 'SPEED_MADNESS'
              ? getConfig('speedWriteSeconds')
              : modeMeta.writeSeconds;
      const mods = getMayhemModifiers(gs.mayhemLevel || 1);
      const minFloor = gs.mode === 'SPEED_MADNESS' ? 7 : 22;
      const wDur = Math.max(minFloor, Math.round(baseWrite * mods.timerScale));
      nextGS = {
        ...gs,
        tick: gs.tick + 1,
        phase: 'WRITE',
        phaseDurationSec: wDur,
        phaseTimeLeftSec: wDur,
      };
    } else if (gs.phase === 'WRITE') {
      nextGS = transitionHostToVote(gs);
    } else if (gs.phase === 'VOTE') {
      nextGS = transitionHostToJudge(gs);
    } else if (gs.phase === 'JUDGE') {
      const sbDur = getConfig('scoreboardSeconds');
      nextGS = {
        ...gs,
        tick: gs.tick + 1,
        phase: 'SCOREBOARD',
        phaseDurationSec: sbDur,
        phaseTimeLeftSec: sbDur,
      };
    } else if (gs.phase === 'SCOREBOARD') {
      // Conclude round via tournament hook!
      const humanParticipants = gs.activePlayerIds;
      let winnerForTournament = gs.roundWinnerId;
      // Ensure tournament winnerId is a real human participant when humans compete
      if (
        !isSoloPracticeRef.current &&
        winnerForTournament &&
        !humanParticipants.includes(winnerForTournament) &&
        winnerForTournament !== 'DRAW'
      ) {
        let bestHuman: string | null = humanParticipants[0] || null;
        let bestScore = -1;
        humanParticipants.forEach((pid) => {
          const s = gs.scores[pid] ?? 0;
          if (s > bestScore) {
            bestScore = s;
            bestHuman = pid;
          }
        });
        winnerForTournament = bestHuman;
      }
      concludeCurrentRound(winnerForTournament);
      return;
    }

    gameStateRef.current = nextGS;
    setGameState(nextGS);
    broadcastStateSync(nextGS);
  }, [
    broadcastStateSync,
    concludeCurrentRound,
    setGameState,
    transitionHostToJudge,
    transitionHostToVote,
  ]);

  // Host-authoritative discrete phase timeout (ZERO 30Hz timer spam!)
  useEffect(() => {
    if (!isHostRef.current || gameState.status !== 'PLAYING') return;
    const ms = Math.max(800, gameState.phaseDurationSec * 1000);
    const tid = setTimeout(() => {
      advanceHostPhase();
    }, ms);
    return () => clearTimeout(tid);
  }, [
    gameState.status,
    gameState.round,
    gameState.phase,
    gameState.phaseDurationSec,
    advanceHostPhase,
  ]);

  // Mid-round Wildcard triggers (Mystery Object reveal / Object Swap halfway through WRITE)
  useEffect(() => {
    if (
      !isHostRef.current ||
      gameState.status !== 'PLAYING' ||
      gameState.phase !== 'WRITE'
    ) {
      return;
    }
    if (
      gameState.wildcard !== 'MYSTERY_OBJECT' &&
      gameState.wildcard !== 'OBJECT_SWAP'
    ) {
      return;
    }
    const halfMs = Math.max(1500, (gameState.phaseDurationSec * 1000) / 2);
    const tid = setTimeout(() => {
      const gs = gameStateRef.current;
      if (gs.status !== 'PLAYING' || gs.phase !== 'WRITE') return;
      if (gs.wildcard === 'MYSTERY_OBJECT' && !gs.mysteryRevealed) {
        const nextGS = {
          ...gs,
          tick: gs.tick + 1,
          mysteryRevealed: true,
        };
        gameStateRef.current = nextGS;
        setGameState(nextGS);
        broadcastStateSync(nextGS);
      } else if (
        gs.wildcard === 'OBJECT_SWAP' &&
        !gs.swappedApplied &&
        gs.swapObject &&
        gs.objects.length > 0
      ) {
        const swappedObjs = [...gs.objects];
        swappedObjs[swappedObjs.length - 1] = gs.swapObject;
        const nextGS = {
          ...gs,
          tick: gs.tick + 1,
          objects: swappedObjs,
          swappedApplied: true,
        };
        gameStateRef.current = nextGS;
        setGameState(nextGS);
        broadcastStateSync(nextGS);
      }
    }, halfMs);
    return () => clearTimeout(tid);
  }, [
    gameState.status,
    gameState.phase,
    gameState.round,
    gameState.wildcard,
    gameState.phaseDurationSec,
    broadcastStateSync,
    setGameState,
  ]);

  // Sync phase timer baseline cleanly & update integer seconds max 1x/sec (zero 5Hz/33Hz React churn!)
  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;
    const initialLeft =
      typeof gameState.phaseTimeLeftSec === 'number' &&
      gameState.phaseTimeLeftSec > 0 &&
      gameState.phaseTimeLeftSec <= gameState.phaseDurationSec
        ? gameState.phaseTimeLeftSec
        : gameState.phaseDurationSec;
    const elapsedOffsetMs = Math.max(
      0,
      (gameState.phaseDurationSec - initialLeft) * 1000,
    );
    phaseTimingRef.current = {
      startedAt: performance.now() - elapsedOffsetMs,
      duration: Math.max(0.5, gameState.phaseDurationSec),
    };
    let lastShownSec = Math.ceil(initialLeft);
    setDisplayTimeLeft(lastShownSec);
    const iv = setInterval(() => {
      const elapsed = (performance.now() - phaseTimingRef.current.startedAt) / 1000;
      const rem = Math.max(0, Math.ceil(phaseTimingRef.current.duration - elapsed));
      if (rem !== lastShownSec) {
        lastShownSec = rem;
        setDisplayTimeLeft(rem);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [
    gameState.status,
    gameState.round,
    gameState.phase,
    gameState.phaseDurationSec,
  ]);

  // Clear local draft & spark hint when entering a new round/WRITE phase
  useEffect(() => {
    if (gameState.status === 'PLAYING' && gameState.round === 1 && gameState.phase === 'COUNTDOWN') {
      calledGameOverRef.current = false;
      setRankClimbInfo(null);
      guestMatchPointsPendingRef.current = null;
    }
    if (gameState.phase === 'COUNTDOWN' || gameState.phase === 'WRITE') {
      setDraftAnswer('');
      setActiveSparkHint(null);
    }
  }, [gameState.status, gameState.round, gameState.phase]);

  // ============================================================================
  // HOST ACTION DISPATCHER (processTurnBasedAction + early phase completion)
  // ============================================================================
  const handleIncomingAction = useCallback(
    (senderId: string, action: GameAction) => {
      if (!isHostRef.current) return;
      const currentGS = gameStateRef.current;

      // Administrative phase-skip bypasses turn/input gating
      if (action.type === 'ADVANCE_PHASE') {
        if (senderId === myPlayerIdRef.current) {
          advanceHostPhase();
        }
        return;
      }

      const {nextGS, stateChanged} = processTurnBasedAction(
        currentGS,
        senderId,
        action,
      );
      if (!stateChanged) return;

      let finalGS: TournamentGameState = {
        ...nextGS,
        tick: nextGS.tick + 1,
      };

      // Auto-advance WRITE when all active humans have submitted
      if (finalGS.phase === 'WRITE') {
        const allHumansSubmitted =
          finalGS.mode === 'TEAM_CHAOS'
            ? Object.keys(finalGS.submissions).length >= 2
            : finalGS.activePlayerIds.every((pid) => Boolean(finalGS.submissions[pid]));

        if (allHumansSubmitted) {
          finalGS = transitionHostToVote(finalGS);
        }
      }

      // Auto-advance VOTE when all active humans have voted
      if (finalGS.phase === 'VOTE') {
        const allHumansVoted = finalGS.activePlayerIds.every((pid) =>
          Boolean(finalGS.votes[pid]),
        );
        if (allHumansVoted) {
          finalGS = transitionHostToJudge(finalGS);
        }
      }

      gameStateRef.current = finalGS;
      setGameState(finalGS);
      broadcastStateSync(finalGS);
    },
    [
      advanceHostPhase,
      broadcastStateSync,
      setGameState,
      transitionHostToJudge,
      transitionHostToVote,
    ],
  );
  handleIncomingActionRef.current = handleIncomingAction;

  const sendAction = useCallback(
    (action: GameAction) => {
      const currentGS = gameStateRef.current;
      if (currentGS.status !== 'PLAYING' || !myPlayerIdRef.current) return;

      if (isHostRef.current) {
        handleIncomingActionRef.current?.(myPlayerIdRef.current, action);
      } else if (sdk && lobbyIdRef.current) {
        sdk.sendGameEvent({
          type: SyncEventType.INPUT_SYNC,
          gameId: GAME_ID,
          lobbyId: lobbyIdRef.current,
          round: currentGS.round,
          tick: currentGS.tick,
          payload: JSON.stringify({
            senderId: myPlayerIdRef.current,
            action,
          }),
        });
      }
    },
    [sdk, lobbyIdRef],
  );

  // ============================================================================
  // REACTIVE SFX, PROGRESSION REWARDS & CANVAS PARTICLE TRIGGERS
  // ============================================================================
  const particlesRef = useRef<CanvasParticle[]>([]);
  const prevPhaseRef = useRef<string>('');
  const prevReactionCountRef = useRef<number>(0);
  const prevStatusRef = useRef<string>('LOBBY');
  const calledGameOverRef = useRef<boolean>(false);

  const spawnConfetti = useCallback((count = 45) => {
    if (profile.reducedMotion) return;
    const colors = [THEME.gold, THEME.coral, THEME.mint, THEME.cyan, '#FFFFFF'];
    const cw = getConfig('width');
    const ch = getConfig('height');
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: cw * (0.15 + Math.random() * 0.7),
        y: ch * 0.25 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 320,
        vy: -120 - Math.random() * 220,
        size: 6 + Math.random() * 6,
        color: colors[i % colors.length],
        ttl: 2.2 + Math.random() * 0.8,
        maxTtl: 3.0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
  }, [profile.reducedMotion]);

  useEffect(() => {
    if (gameState.status !== 'PLAYING') {
      if (prevStatusRef.current !== 'PODIUM' && gameState.status === 'PODIUM') {
        const iWon =
          gameState.winnerId === myPlayerId ||
          gameState.tournamentWinnerId === myPlayerId;
        if (iWon) {
          gameAudio.playVictoryFanfare();
        } else {
          gameAudio.playLevelUpStinger();
        }
        spawnConfetti(60);

        if (gameState.tournamentWinnerId && !calledGameOverRef.current && sdk) {
          calledGameOverRef.current = true;
          const myFinal = myPlayerId
            ? gameState.cumulativePoints[myPlayerId] ?? 0
            : 0;
          sdk.scoreUpdated({value: myFinal, level: String(gameState.round)});
          sdk.gameOver();
        }

        // Award non-staked XP, Progression Coins, Highlights & Missions scaled by Mayhem Level multiplier
        const myRoundScore = myPlayerId
          ? gameState.scores[myPlayerId] ?? 0
          : 0;
        const myStreak = myPlayerId
          ? gameState.comedyStreaks?.[myPlayerId] || 0
          : 0;
        const streakXpBonus = myStreak >= 2 ? myStreak * 15 : 0;
        const mods = getMayhemModifiers(gameState.mayhemLevel || 1);
        const coinsEarned = Math.round(
          (25 + Math.round(myRoundScore * 0.4) + (iWon ? 35 : 0)) *
            mods.rewardMultiplier,
        );
        const xpEarned = Math.round(
          (40 + myRoundScore + streakXpBonus + (iWon ? 50 : 0)) *
            mods.rewardMultiplier,
        );

        const activeAccBefore = currentAccountRef.current;
        const prevGlobalRank = activeAccBefore
          ? getAccountGlobalRank(activeAccBefore.id)
          : null;

        updateProfile((prev) => {
          const nextMissions = prev.missions.map((m) => {
            if (m.id === 'm_play') {
              return {...m, progress: Math.min(m.target, m.progress + 1)};
            }
            if (m.id === 'm_win' && myRoundScore >= 65) {
              return {...m, progress: Math.min(m.target, m.progress + 1)};
            }
            return m;
          });

          const topSub = Object.values(gameState.submissions).sort(
            (a, b) =>
              (gameState.judgements[b.id]?.finalRoundPoints ?? 0) -
              (gameState.judgements[a.id]?.finalRoundPoints ?? 0),
          )[0];

          const nextHighlights = topSub
            ? [
                {
                  id: `hl_${Date.now()}`,
                  date: getDailyDateKey(),
                  situation: gameState.situation,
                  objects: gameState.objects.map((o) => `${o.icon} ${o.name}`),
                  winningAnswer: topSub.text,
                  winnerName: topSub.authorName,
                  score: gameState.judgements[topSub.id]?.finalRoundPoints ?? 0,
                  critique: gameState.judgements[topSub.id]?.critique ?? '',
                },
                ...prev.highlights,
              ].slice(0, 8)
            : prev.highlights;

          return {
            ...prev,
            xp: prev.xp + xpEarned,
            coins: prev.coins + coinsEarned,
            wins: prev.wins + (iWon ? 1 : 0),
            matchesPlayed: prev.matchesPlayed + (gameState.tournamentWinnerId ? 1 : 0),
            winStreak: iWon ? prev.winStreak + 1 : 0,
            bestAnswerScore: Math.max(prev.bestAnswerScore, myRoundScore),
            totalPoints: (prev.totalPoints || 0) + myRoundScore,
            missions: nextMissions,
            highlights: nextHighlights,
          };
        });

        // Compute Global Rank Climb Summary & sync to room for signed-in accounts
        if (activeAccBefore && prevGlobalRank !== null) {
          guestMatchPointsPendingRef.current = null;
          const newGlobalRank = getAccountGlobalRank(activeAccBefore.id);
          setRankClimbInfo({
            prevRank: prevGlobalRank,
            newRank: newGlobalRank,
            rankDelta: prevGlobalRank - newGlobalRank,
          });
          if (currentAccountRef.current) {
            syncMyAccountToRoom(currentAccountRef.current);
          }
        } else {
          guestMatchPointsPendingRef.current = {
            points: myRoundScore,
            won: iWon,
            bestScore: myRoundScore,
          };
        }
      }
      prevStatusRef.current = gameState.status;
      return;
    }

    prevStatusRef.current = gameState.status;

    if (prevPhaseRef.current !== gameState.phase) {
      prevPhaseRef.current = gameState.phase;
      if (gameState.phase === 'COUNTDOWN') {
        gameAudio.playCrispClick();
      } else if (gameState.phase === 'WILDCARD') {
        gameAudio.playPowerupChime();
      } else if (gameState.phase === 'REVEAL') {
        gameAudio.playJumpLandingThud();
      } else if (gameState.phase === 'WRITE') {
        gameAudio.playConfirmSelect();
      } else if (gameState.phase === 'VOTE') {
        gameAudio.playCrispClick();
      } else if (gameState.phase === 'JUDGE') {
        gameAudio.playCoinPickup();
        const hasAwardsOrStreak =
          (gameState.roundAwards?.length ?? 0) > 0 ||
          Object.values(gameState.comedyStreaks || {}).some((s) => s >= 2);
        spawnConfetti(hasAwardsOrStreak ? 55 : 30);
      } else if (gameState.phase === 'SCOREBOARD') {
        gameAudio.playLevelUpStinger();
      }
    }
  }, [
    gameState.status,
    gameState.phase,
    gameState.winnerId,
    gameState.tournamentWinnerId,
    myPlayerId,
    spawnConfetti,
    updateProfile,
    syncMyAccountToRoom,
  ]);

  // Spawn floating emoji bursts on canvas when reactions arrive
  useEffect(() => {
    if (gameState.reactions.length > prevReactionCountRef.current) {
      const latest = gameState.reactions[gameState.reactions.length - 1];
      if (latest) {
        const cw = getConfig('width');
        const ch = getConfig('height');
        particlesRef.current.push({
          x: cw * latest.xNorm,
          y: ch - 60,
          vx: (Math.random() - 0.5) * 36,
          vy: -115 - Math.random() * 50,
          size: 32,
          color: THEME.gold,
          ttl: 2.2,
          maxTtl: 2.2,
          emoji: latest.emoji,
          rotation: 0,
          vRot: (Math.random() - 0.5) * 1.4,
        });
        gameAudio.playCrispClick();
      }
    }
    prevReactionCountRef.current = gameState.reactions.length;
  }, [gameState.reactions]);

  // ============================================================================
  // KEYBOARD SHORTCUTS (Esc Menu, 1-5 Quick Vote, Enter Submit)
  // ============================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (appScreenRef.current === 'PLAYING') {
          if (showForfeitModal) setShowForfeitModal(false);
          else if (showHowToPlay) setShowHowToPlay(false);
          else setShowInGameMenu((p) => !p);
        } else {
          exitChat({}).catch(() => {});
        }
        return;
      }

      if (
        appScreenRef.current === 'PLAYING' &&
        gameStateRef.current.phase === 'VOTE' &&
        !showInGameMenu &&
        !showHowToPlay &&
        !showForfeitModal
      ) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
          const targetId = gameStateRef.current.blindOrderIds[num - 1];
          if (targetId) {
            const sub = gameStateRef.current.submissions[targetId];
            if (
              sub &&
              sub.authorId !== myPlayerIdRef.current &&
              !gameStateRef.current.votes[myPlayerIdRef.current || '']
            ) {
              gameAudio.playConfirmSelect();
              sendAction({type: 'CAST_VOTE', payload: {submissionId: targetId}});
            }
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForfeitModal, showHowToPlay, showInGameMenu, sendAction]);

  // ============================================================================
  // 60 FPS CANVAS STAGE ANIMATION LOOP (Gizmo Sprite + Wheel + Confetti)
  // ============================================================================
  const gizmoRendererRef = useRef<SpriteRenderer | null>(null);
  if (!gizmoRendererRef.current) {
    gizmoRendererRef.current = new SpriteRenderer(GIZMO_SPRITE_CONFIG);
  }
  const gizmoAnimRef = useRef<SpriteAnimationState>({
    currentAction: 'IDLE',
    currentFrame: 0,
    timer: 0,
  });
  const stageTimeRef = useRef(0);
  const wheelAngleRef = useRef(0);

  const updateCanvasStage = (dt: number) => {
    stageTimeRef.current += dt;

    // Switch Gizmo sprite action based on exciting phases
    const gs = gameStateRef.current;
    const exciting =
      appScreenRef.current === 'PLAYING' &&
      (gs.phase === 'COUNTDOWN' ||
        gs.phase === 'WILDCARD' ||
        gs.phase === 'JUDGE' ||
        gs.phase === 'SCOREBOARD');
    const desiredAction = exciting ? 'JUMP' : 'IDLE';
    if (gizmoAnimRef.current.currentAction !== desiredAction) {
      gizmoAnimRef.current = {
        currentAction: desiredAction,
        currentFrame: 0,
        timer: 0,
      };
    }
    gizmoAnimRef.current = gizmoRendererRef.current!.getNextState(
      gizmoAnimRef.current,
      dt,
    );

    if (gs.phase === 'WILDCARD') {
      wheelAngleRef.current += dt * 11.5;
    } else {
      wheelAngleRef.current = lerp(wheelAngleRef.current, 0, dt * 6);
    }

    // In-place particle update (zero per-frame GC allocation)
    const arr = particlesRef.current;
    let i = arr.length;
    while (i--) {
      const p = arr[i];
      p.ttl -= dt;
      if (p.ttl <= 0) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.emoji) {
        p.vy += 360 * dt;
      }
      p.rotation += p.vRot * dt;
    }

    // Update GPU-composited timer progress bar directly at 60 FPS (zero React re-renders)
    if (timerBarRef.current && gs.status === 'PLAYING') {
      const elapsed = (performance.now() - phaseTimingRef.current.startedAt) / 1000;
      const frac = Math.max(
        0,
        Math.min(1, 1 - elapsed / Math.max(0.5, phaseTimingRef.current.duration)),
      );
      timerBarRef.current.style.transform = `scaleX(${frac.toFixed(4)})`;
    }
  };

  const drawCanvasStage = (ctx: CanvasRenderingContext2D) => {
    const cw = getConfig('width');
    const ch = getConfig('height');
    prepareCanvas(ctx, cw, ch);
    ctx.clearRect(0, 0, cw, ch);

    // 1. Draw Studio Stage Backdrop maintaining exact aspect ratio
    const bgImg = assets['stage_backdrop'];
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      const bgAspect = getConfig('assetStageBackdropAspectRatio');
      const targetW = cw;
      const targetH = targetW / bgAspect;
      const drawY = (ch - targetH) / 2;
      ctx.drawImage(bgImg, 0, drawY, targetW, targetH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, THEME.stageDeep);
      grad.addColorStop(1, THEME.stagePlum);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Subtle animated spotlight beams
    if (!profile.reducedMotion) {
      const t = stageTimeRef.current;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = THEME.gold;
      const sweep1 = Math.sin(t * 0.9) * 140;
      ctx.beginPath();
      ctx.moveTo(cw * 0.25, 0);
      ctx.lineTo(cw * 0.15 + sweep1, ch);
      ctx.lineTo(cw * 0.35 + sweep1, ch);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = THEME.coral;
      const sweep2 = Math.cos(t * 0.75) * 140;
      ctx.beginPath();
      ctx.moveTo(cw * 0.75, 0);
      ctx.lineTo(cw * 0.65 + sweep2, ch);
      ctx.lineTo(cw * 0.85 + sweep2, ch);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Dim overlay slightly for crisp foreground card legibility
    ctx.fillStyle = 'rgba(20, 12, 42, 0.38)';
    ctx.fillRect(0, 0, cw, ch);

    // 2. Draw Host Gizmo animated spritesheet at bottom-left stage podium
    const gizmoSize = getConfig('assetHostGizmoHeight');
    const gizmoW = gizmoSize * getConfig('assetHostGizmoAspectRatio');
    const gizmoX = 24;
    const gizmoY = ch - gizmoSize - 18;
    gizmoRendererRef.current?.draw(
      ctx,
      gizmoAnimRef.current,
      gizmoX,
      gizmoY,
      gizmoW,
      gizmoSize,
      assets,
    );

    // 3. Draw Wildcard Wheel during WILDCARD phase
    const gs = gameStateRef.current;
    if (appScreenRef.current === 'PLAYING' && gs.phase === 'WILDCARD') {
      const wheelH = getConfig('assetWildcardWheelHeight');
      const wheelW = wheelH * getConfig('assetWildcardWheelAspectRatio');
      ctx.save();
      ctx.translate(cw / 2, ch * 0.45);
      ctx.rotate(wheelAngleRef.current);
      drawAsset(
        ctx,
        assets['wildcard_wheel'],
        -wheelW / 2,
        -wheelH / 2,
        wheelW,
        wheelH,
        (fCtx) => {
          fCtx.fillStyle = THEME.gold;
          fCtx.beginPath();
          fCtx.arc(0, 0, Math.max(0, wheelW / 2), 0, Math.PI * 2);
          fCtx.fill();
        },
      );
      ctx.restore();
    }

    // 4. Draw Mystery Cube bounce during REVEAL phase
    if (appScreenRef.current === 'PLAYING' && gs.phase === 'REVEAL') {
      const cubeH = getConfig('assetMysteryCubeHeight');
      const cubeW = cubeH * getConfig('assetMysteryCubeAspectRatio');
      const bob = Math.sin(stageTimeRef.current * 5) * 6;
      drawAsset(
        ctx,
        assets['mystery_cube'],
        cw - cubeW - 34,
        ch - cubeH - 28 + bob,
        cubeW,
        cubeH,
        (fCtx) => {
          fCtx.fillStyle = THEME.violet;
          fCtx.fillRect(cw - cubeW - 34, ch - cubeH - 28 + bob, cubeW, cubeH);
        },
      );
    }

    // 5. Render Confetti & Reaction Particles
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, Math.min(1, p.ttl / p.maxTtl));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.emoji) {
        ctx.font = `${Math.round(p.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      }
      ctx.restore();
    }
  };

  const updateRef = useRef(updateCanvasStage);
  const drawRef = useRef(drawCanvasStage);
  updateRef.current = updateCanvasStage;
  drawRef.current = drawCanvasStage;

  const showDebugHudRef = useRef(showDebugHud);
  useEffect(() => {
    showDebugHudRef.current = showDebugHud;
  }, [showDebugHud]);

  useEffect(() => {
    console.log('[Playground] Running Mashup Mayhem Multiplayer Stage');
    let raf = 0;
    let lastPerfFlush = performance.now();
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      perfMonitorRef.current.recordFrame(time);
      if (showDebugHudRef.current && time - lastPerfFlush >= 1000) {
        lastPerfFlush = time;
        const rep = perfMonitorRef.current.getReport();
        setHudMetrics({
          fps: rep.avgFps,
          lowFps: rep.lowFps1pct,
          jitter: rep.jitter,
          heapUsed: rep.heapUsedMb,
        });
      }
      try {
        stepperRef.current?.(time, (dt) => {
          updateRef.current(dt);
        });
      } catch (err) {
        console.error('[App] Stepper exception:', err);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            drawRef.current(ctx);
          } catch (err) {
            console.error('[App] Canvas render exception caught:', err);
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // ============================================================================
  // UI ACTION HELPERS
  // ============================================================================
  const submitAnswer = () => {
    const clean = sanitizeSafeText(draftAnswer.trim(), profile.safeChatFilter);
    if (!clean) {
      gameAudio.playErrorBuzz();
      return;
    }
    gameAudio.playConfirmSelect();
    sendAction({
      type: 'SUBMIT_ANSWER',
      payload: {text: clean, submittedEarly: displayTimeLeft > 5},
    });
  };

  const triggerReaction = (emoji: string) => {
    sendAction({type: 'SEND_REACTION', payload: {emoji}});
    updateProfile((prev) => ({
      ...prev,
      missions: prev.missions.map((m) =>
        m.id === 'm_react'
          ? {...m, progress: Math.min(m.target, m.progress + 1)}
          : m,
      ),
    }));
  };

  const claimMission = (missionId: string) => {
    const m = profile.missions.find((x) => x.id === missionId);
    if (!m || m.claimed || m.progress < m.target) return;
    gameAudio.playCoinPickup();
    updateProfile((prev) => ({
      ...prev,
      coins: prev.coins + m.rewardCoins,
      xp: prev.xp + m.rewardXp,
      missions: prev.missions.map((x) =>
        x.id === missionId ? {...x, claimed: true} : x,
      ),
    }));
  };

  const copyHighlightCard = (hlId: string) => {
    const hl = profile.highlights.find((h) => h.id === hlId);
    if (!hl) return;
    const text = `🎭 MASHUP MAYHEM HIGHLIGHT!\nSituation: ${hl.situation}\nProps: ${hl.objects.join(' + ')}\nWinner (${hl.winnerName} - ${hl.score} pts): "${hl.winningAnswer}"\nGizmo: ${hl.critique}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopyToast('Highlight copied to clipboard!');
    setTimeout(() => setCopyToast(null), 2200);
  };

  const mySubmissionKey =
    gameState.mode === 'TEAM_CHAOS' && myPlayerId
      ? `team_${gameState.teamAssignments[myPlayerId] || 'A'}`
      : myPlayerId || '';
  const mySubmission = gameState.submissions[mySubmissionKey];
  const myVote = myPlayerId ? gameState.votes[myPlayerId] : undefined;
  const activeRestrictionViolation = useMemo(() => {
    if (!draftAnswer.trim()) return null;
    return checkRestrictionViolation(
      draftAnswer,
      gameState.restriction,
      gameState.wildcard,
    );
  }, [draftAnswer, gameState.restriction, gameState.wildcard]);

  const currentModeMeta =
    GAME_MODES.find((m) => m.id === (appScreen === 'PLAYING' ? gameState.mode : selectedMode)) ??
    GAME_MODES[0];
  const activeWildcardMeta = gameState.wildcard
    ? WILDCARDS[gameState.wildcard]
    : null;
  const lobbyMayhemMods = getMayhemModifiers(profile.mayhemLevel);
  const matchMayhemMods = getMayhemModifiers(
    appScreen === 'PLAYING' || appScreen === 'PODIUM'
      ? gameState.mayhemLevel || profile.mayhemLevel
      : profile.mayhemLevel,
  );

  const isMusicActive =
    appScreen === 'TUTORIAL' ||
    appScreen === 'LOBBY' ||
    appScreen === 'PLAYING' ||
    appScreen === 'PODIUM';
  const activeMusicUrl =
    appScreen === 'PLAYING'
      ? (getConfig('backgroundMusicUrl') as string)
      : (getConfig('lobbyMusicUrl') as string);

  const globalLeaderboardPreview = useMemo(
    () =>
      getGlobalLeaderboard(
        currentAccount?.id ?? null,
        remoteLeaderboardEntries,
      ),
    [currentAccount, remoteLeaderboardEntries, profile.totalPoints, profile.wins],
  );
  const myGlobalRank = useMemo(() => {
    if (!currentAccount) return null;
    const found = globalLeaderboardPreview.find((e) => e.isCurrentUser);
    return found ? found.rank : null;
  }, [currentAccount, globalLeaderboardPreview]);

  const mySparkUsed = Boolean(
    myPlayerId && gameState.sparkUsedByPlayer?.[myPlayerId],
  );
  const myComedyStreak = myPlayerId
    ? gameState.comedyStreaks?.[myPlayerId] || 0
    : 0;

  const triggerMashupSpark = () => {
    if (mySparkUsed || mySubmission || gameState.phase !== 'WRITE') return;
    gameAudio.playPowerupChime();
    const hint = generateMashupSpark(
      gameState.objects,
      gameState.situation,
      gameState.restriction,
      gameState.wildcard,
      gameState.round,
    );
    setActiveSparkHint(hint);
    sendAction({type: 'USE_SPARK', payload: {}});
  };

  // Top-Right Hub Sign In / Account Pill
  const lobbyTopRightSlot = currentAccount ? (
    <button
      type="button"
      onClick={() => {
        gameAudio.playCrispClick();
        setAccountModalState({open: true, tab: 'LOGIN'});
      }}
      data-testid="hub-account-pill"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#2E1E59] hover:bg-[#3e2978] border-2 border-[#FFD13B] shadow-[0_3px_0_#1A1336] cursor-pointer active:translate-y-0.5 transition-transform">
      <img
        src={
          AVATAR_CATALOG.find((a) => a.id === profile.equippedAvatarId)
            ?.imagePath || AVATAR_CATALOG[0].imagePath
        }
        alt={currentAccount.username}
        className="w-6 h-6 object-contain rounded bg-[#1A1336]/60"
      />
      <div className="text-left leading-tight">
        <div className="text-[11px] font-black text-[#FFF8EC] max-w-[110px] truncate">
          {currentAccount.username}
        </div>
        <div className="text-[9px] font-black text-[#2CEAA3]">
          Lv.{profile.level}
          {myGlobalRank ? ` • #${myGlobalRank}` : ''}
        </div>
      </div>
      <span className="text-[10px] font-black text-[#FFD13B]">⚙️</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        gameAudio.playConfirmSelect();
        setAccountModalState({open: true, tab: 'LOGIN'});
      }}
      data-testid="hub-signin-button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_3px_0_#1A1336] text-[11px] font-black uppercase tracking-wide cursor-pointer active:translate-y-0.5 transition-transform">
      <span>🎟️</span>
      <span>Sign in or Log in</span>
    </button>
  );

  // ============================================================================
  // LOBBY EXTRA CONTENT (Online Pairing, Mayhem Level, Modes, Locker, Missions)
  // ============================================================================
  const lobbyExtraContent = (
    <div className="space-y-2.5 text-left">
      {/* Top Profile & Quick Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1A1336]/75 border-2 border-[#1A1336] rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <img
            src={
              AVATAR_CATALOG.find((a) => a.id === profile.equippedAvatarId)
                ?.imagePath || AVATAR_CATALOG[0].imagePath
            }
            alt="My Avatar"
            className="w-9 h-9 object-contain rounded-lg bg-[#2E1E59] p-0.5 border-2 border-[#FFD13B]"
          />
          <div>
            <div className="text-xs font-black text-[#FFF8EC]">
              Lv.{profile.level} • {profile.equippedTitle}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#FFD13B]">
              <img
                src="assets/images/coin_token.png"
                alt="Coins"
                className="w-4 h-4 object-contain"
              />
              <span>{profile.coins} Coins</span>
              <span className="text-[#2CEAA3] ml-1">{profile.xp} XP</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['MAIN', '🎭 Modes'],
              ['LOCKER', '🎨 Locker'],
              ['MISSIONS', '🎯 Missions'],
              ['CUSTOM', '🛠️ Custom'],
            ] as const
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              onClick={() => {
                gameAudio.playCrispClick();
                setLobbyModalTab(tabId);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border-2 border-[#1A1336] cursor-pointer transition-transform active:scale-95 ${
                lobbyModalTab === tabId
                  ? 'bg-[#FFD13B] text-[#1A1336] shadow-[0_2px_0_#1A1336]'
                  : 'bg-[#3B266E] text-[#FFF8EC] hover:bg-[#4e348c]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Progressive Difficulty Banner + Cross-Device Online Pairing Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Mayhem Level (Escalates Every Try!) */}
        <div className="bg-[#2E1E59] border-2 border-[#FFD13B]/60 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-black text-[#FFD13B] uppercase">
              🔥 Mayhem Lv.{lobbyMayhemMods.level} (Try #{profile.totalTries + 1})
            </div>
            <div className="text-[10px] font-bold text-[#FFF8EC]/80">
              {lobbyMayhemMods.title} • {lobbyMayhemMods.summary}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#FF4D79] text-[#1A1336] border border-[#1A1336] text-[10px] font-black shrink-0">
            {lobbyMayhemMods.rewardMultiplier}x
          </span>
        </div>

        {/* Cross-Device Quick Match & Room Code Pairing */}
        <div className="bg-[#1A1336]/75 border-2 border-[#38E8FF]/50 rounded-xl px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="font-black text-[#38E8FF] truncate">
              🌐 {matchmakingState}: {matchmakingMessage}
            </span>
            {lobbyId && (
              <button
                onClick={() => {
                  const url = getShareUrl();
                  navigator.clipboard?.writeText(url || lobbyId).catch(() => {});
                  gameAudio.playConfirmSelect();
                  setCopyToast(`Invite link copied! Room: ${lobbyId}`);
                  setTimeout(() => setCopyToast(null), 2200);
                }}
                className="px-2 py-0.5 rounded bg-[#2CEAA3] text-[#1A1336] font-black shrink-0 cursor-pointer">
                Copy Invite
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                gameAudio.playCrispClick();
                quickMatch(selectedMode);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#38E8FF] text-[#1A1336] font-black text-[10px] cursor-pointer shrink-0">
              ⚡ Quick Match
            </button>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="Room Code..."
              className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-[#2E1E59] border border-[#1A1336] text-[10px] text-white font-bold"
            />
            <button
              onClick={() => {
                if (!roomCodeInput.trim()) return;
                gameAudio.playConfirmSelect();
                joinLobbyByCode(roomCodeInput);
              }}
              className="px-2 py-1 rounded-lg bg-[#FFD13B] text-[#1A1336] font-black text-[10px] cursor-pointer shrink-0">
              Join
            </button>
            <button
              onClick={() => {
                gameAudio.playCrispClick();
                createPublicRoom(selectedMode);
              }}
              className="px-2 py-1 rounded-lg bg-[#3B266E] text-[#FFF8EC] font-black text-[10px] cursor-pointer shrink-0">
              New
            </button>
          </div>
        </div>
      </div>

      {/* TAB: MAIN (7 Game Modes Selector + Top Contenders Preview) */}
      {lobbyModalTab === 'MAIN' && (
        <div className="space-y-2.5">
          {/* Live Global Top Contenders Strip */}
          <div className="bg-[#1A1336]/75 border-2 border-[#FFD13B]/50 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-[#FFD13B]">
                🏆 Top Contenders:
              </span>
              {globalLeaderboardPreview.slice(0, 3).map((entry) => (
                <span
                  key={entry.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border border-[#1A1336] ${
                    entry.isCurrentUser
                      ? 'bg-[#2CEAA3] text-[#1A1336]'
                      : 'bg-[#2E1E59] text-[#FFF8EC]'
                  }`}>
                  <span>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <span>{entry.username}</span>
                  <span className="text-[#FFD13B]">({entry.totalPoints})</span>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setShowLeaderboardModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#38E8FF] hover:bg-[#6ef0ff] text-[#1A1336] border border-[#1A1336] text-[10px] font-black uppercase cursor-pointer shrink-0">
              Full Ranks →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GAME_MODES.map((m) => {
              const selected = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  disabled={!isHost}
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setSelectedMode(m.id);
                    if (m.id === 'CUSTOM') setLobbyModalTab('CUSTOM');
                  }}
                  className={`p-2 rounded-xl border-2 border-[#1A1336] text-left transition-all ${
                    selected
                      ? 'bg-[#FFD13B] text-[#1A1336] shadow-[0_3px_0_#1A1336]'
                      : 'bg-[#2E1E59] text-[#FFF8EC] hover:bg-[#3c2873]'
                  } ${!isHost ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}>
                  <div className="text-sm font-black flex items-center gap-1">
                    <span>{m.icon}</span>
                    <span className="truncate text-[11px]">{m.name}</span>
                  </div>
                  <div
                    className={`text-[10px] leading-tight mt-0.5 line-clamp-2 font-bold ${
                      selected ? 'text-[#1A1336]/80' : 'text-[#FFF8EC]/70'
                    }`}>
                    {m.tagline}
                  </div>
                </button>
              );
            })}
          </div>

          {isHost && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1A1336]/55 border-2 border-[#1A1336] rounded-xl px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-extrabold text-[#FFF8EC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={withBotsInMulti}
                  onChange={(e) => setWithBotsInMulti(e.target.checked)}
                  className="w-4 h-4 accent-[#2CEAA3]"
                />
                <span>Include Comedy Bots in Match</span>
              </label>

              {selectedMode === 'TEAM_CHAOS' && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <input
                    value={teamNames.A}
                    onChange={(e) =>
                      setTeamNames((t) => ({...t, A: e.target.value}))
                    }
                    placeholder="Team A"
                    className="w-24 px-2 py-1 rounded bg-[#2E1E59] border border-[#1A1336] text-[#38E8FF] font-bold"
                  />
                  <span className="font-black text-[#FFD13B]">VS</span>
                  <input
                    value={teamNames.B}
                    onChange={(e) =>
                      setTeamNames((t) => ({...t, B: e.target.value}))
                    }
                    placeholder="Team B"
                    className="w-24 px-2 py-1 rounded bg-[#2E1E59] border border-[#1A1336] text-[#FF4D79] font-bold"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: LOCKER (Unlock & Equip Avatars / Frames / Titles) */}
      {lobbyModalTab === 'LOCKER' && (
        <div className="bg-[#1A1336]/70 border-2 border-[#1A1336] rounded-xl p-3 space-y-3 max-h-56 overflow-y-auto">
          <div className="text-xs font-black uppercase text-[#FFD13B]">
            Contestant Avatars (Non-Staked Coin Unlocks)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVATAR_CATALOG.map((av) => {
              const unlocked = profile.unlockedAvatars.includes(av.id);
              const equipped = profile.equippedAvatarId === av.id;
              return (
                <button
                  key={av.id}
                  onClick={() => {
                    if (unlocked) {
                      gameAudio.playConfirmSelect();
                      updateProfile((p) => ({...p, equippedAvatarId: av.id}));
                    } else if (profile.coins >= av.unlockCost) {
                      gameAudio.playCoinPickup();
                      updateProfile((p) => ({
                        ...p,
                        coins: p.coins - av.unlockCost,
                        unlockedAvatars: [...p.unlockedAvatars, av.id],
                        equippedAvatarId: av.id,
                      }));
                    } else {
                      gameAudio.playErrorBuzz();
                    }
                  }}
                  className={`p-2 rounded-xl border-2 border-[#1A1336] flex items-center gap-2 text-left cursor-pointer ${
                    equipped
                      ? 'bg-[#2CEAA3] text-[#1A1336]'
                      : 'bg-[#2E1E59] text-[#FFF8EC] hover:bg-[#3c2873]'
                  }`}>
                  <img
                    src={av.imagePath}
                    alt={av.name}
                    className="w-10 h-10 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black truncate">
                      {av.name}
                    </div>
                    <div className="text-[10px] font-bold">
                      {equipped
                        ? 'Equipped'
                        : unlocked
                          ? 'Equip'
                          : `Unlock: ${av.unlockCost} 🪙`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="text-[10px] font-black uppercase text-[#38E8FF] mb-1">
                Profile Frame
              </div>
              <div className="flex flex-wrap gap-1">
                {PROFILE_FRAMES.map((fr) => {
                  const unlocked = profile.unlockedFrames.includes(fr.id);
                  const active = profile.equippedFrame === fr.id;
                  return (
                    <button
                      key={fr.id}
                      onClick={() => {
                        if (unlocked) {
                          updateProfile((p) => ({...p, equippedFrame: fr.id}));
                        } else if (fr.cost && profile.coins >= fr.cost) {
                          gameAudio.playCoinPickup();
                          updateProfile((p) => ({
                            ...p,
                            coins: p.coins - fr.cost!,
                            unlockedFrames: [...p.unlockedFrames, fr.id],
                            equippedFrame: fr.id,
                          }));
                        }
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-black border border-[#1A1336] cursor-pointer ${
                        active
                          ? 'bg-[#FFD13B] text-[#1A1336]'
                          : 'bg-[#3B266E] text-[#FFF8EC]'
                      }`}>
                      {fr.name}
                      {!unlocked && fr.cost ? ` (${fr.cost}🪙)` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase text-[#FFD13B] mb-1">
                Player Titles
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {PLAYER_TITLES.map((t) => {
                  const unlocked = profile.level >= t.minLevel;
                  const active = profile.equippedTitle === t.name;
                  return (
                    <button
                      key={t.id}
                      disabled={!unlocked}
                      onClick={() =>
                        updateProfile((p) => ({...p, equippedTitle: t.name}))
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-black border border-[#1A1336] ${
                        active
                          ? 'bg-[#2CEAA3] text-[#1A1336]'
                          : unlocked
                            ? 'bg-[#3B266E] text-[#FFF8EC] cursor-pointer'
                            : 'bg-[#1A1336] text-[#FFF8EC]/40'
                      }`}>
                      {t.name}
                      {!unlocked ? ` (Lv.${t.minLevel})` : ''}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] font-black uppercase text-[#FF4D79] mb-1">
                Accessibility
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.reducedMotion}
                    onChange={(e) =>
                      updateProfile((p) => ({
                        ...p,
                        reducedMotion: e.target.checked,
                      }))
                    }
                  />
                  Reduced Motion
                </label>
                <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.safeChatFilter}
                    onChange={(e) =>
                      updateProfile((p) => ({
                        ...p,
                        safeChatFilter: e.target.checked,
                      }))
                    }
                  />
                  Safe Text Filter
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MISSIONS & HIGHLIGHTS */}
      {lobbyModalTab === 'MISSIONS' && (
        <div className="bg-[#1A1336]/70 border-2 border-[#1A1336] rounded-xl p-3 space-y-2.5 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-black text-[#FFD13B]">
            <span>Daily Missions ({getDailyDateKey()})</span>
            <span className="text-[#2CEAA3]">
              Wins: {profile.wins} • Best: {profile.bestAnswerScore} pts
            </span>
          </div>
          {profile.missions.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-[#2E1E59] border-2 border-[#1A1336] rounded-lg px-2.5 py-1.5 text-xs">
              <div>
                <div className="font-black text-[#FFF8EC]">{m.label}</div>
                <div className="text-[10px] text-[#38E8FF] font-bold">
                  Progress: {m.progress}/{m.target} • Reward: +{m.rewardCoins} 🪙, +{m.rewardXp} XP
                </div>
              </div>
              <button
                disabled={m.claimed || m.progress < m.target}
                onClick={() => claimMission(m.id)}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] border border-[#1A1336] ${
                  m.claimed
                    ? 'bg-[#1A1336] text-[#FFF8EC]/40'
                    : m.progress >= m.target
                      ? 'bg-[#2CEAA3] text-[#1A1336] cursor-pointer'
                      : 'bg-[#3B266E] text-[#FFF8EC]/50'
                }`}>
                {m.claimed ? 'Claimed' : m.progress >= m.target ? 'Claim!' : 'In Progress'}
              </button>
            </div>
          ))}

          {profile.highlights.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <div className="text-[10px] font-black uppercase text-[#FF4D79]">
                Recent Highlight Cards
              </div>
              {profile.highlights.slice(0, 2).map((hl) => (
                <div
                  key={hl.id}
                  className="bg-[#241645] border border-[#FFD13B]/40 rounded-lg p-2 flex items-center justify-between gap-2 text-[10px]">
                  <div className="min-w-0">
                    <div className="font-black text-[#FFD13B] truncate">
                      {hl.winnerName} ({hl.score} pts): &ldquo;{hl.winningAnswer}&rdquo;
                    </div>
                    <div className="text-[#FFF8EC]/70 truncate">{hl.situation}</div>
                  </div>
                  <button
                    onClick={() => copyHighlightCard(hl.id)}
                    className="px-2 py-1 bg-[#38E8FF] text-[#1A1336] rounded font-black shrink-0 cursor-pointer">
                    Share
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOM BATTLES WORKSHOP */}
      {lobbyModalTab === 'CUSTOM' && (
        <div className="bg-[#1A1336]/70 border-2 border-[#1A1336] rounded-xl p-3 space-y-2 max-h-56 overflow-y-auto text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-[#FFD13B] uppercase">
              Custom Battle Workshop
            </span>
            <button
              onClick={() => {
                setSelectedMode('CUSTOM');
                setLobbyModalTab('MAIN');
              }}
              className="px-2.5 py-1 bg-[#2CEAA3] text-[#1A1336] rounded-lg font-black text-[10px] cursor-pointer">
              Use Custom Mode
            </button>
          </div>
          <input
            type="text"
            value={customConfig.customSituation}
            onChange={(e) =>
              setCustomConfig((c) => ({...c, customSituation: e.target.value}))
            }
            placeholder="Custom Round 1 Situation (optional)..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#2E1E59] border border-[#1A1336] text-white font-semibold"
          />
          <input
            type="text"
            value={customConfig.customObjectsText}
            onChange={(e) =>
              setCustomConfig((c) => ({
                ...c,
                customObjectsText: e.target.value,
              }))
            }
            placeholder="Custom Objects comma-separated (e.g. Disco Duck, Rocket Mop)..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#2E1E59] border border-[#1A1336] text-white font-semibold"
          />
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <label className="font-bold">
              Timer: {customConfig.writeSeconds}s
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={customConfig.writeSeconds}
                onChange={(e) =>
                  setCustomConfig((c) => ({
                    ...c,
                    writeSeconds: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#FFD13B]"
              />
            </label>
            <label className="font-bold">
              Items: {customConfig.objectsCount}
              <input
                type="range"
                min={2}
                max={5}
                step={1}
                value={customConfig.objectsCount}
                onChange={(e) =>
                  setCustomConfig((c) => ({
                    ...c,
                    objectsCount: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#2CEAA3]"
              />
            </label>
            <label className="font-bold">
              AI Weight: {customConfig.aiWeight}%
              <input
                type="range"
                min={20}
                max={90}
                step={10}
                value={customConfig.aiWeight}
                onChange={(e) =>
                  setCustomConfig((c) => ({
                    ...c,
                    aiWeight: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#FF4D79]"
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-2">
            <select
              value={customConfig.categoryFilter}
              onChange={(e) =>
                setCustomConfig((c) => ({
                  ...c,
                  categoryFilter: e.target.value as ObjectCategory | 'ALL',
                }))
              }
              className="px-2 py-1 rounded bg-[#2E1E59] border border-[#1A1336] text-[11px] font-bold">
              <option value="ALL">All Categories</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Medieval">Medieval</option>
              <option value="Office">Office</option>
              <option value="Nature">Nature</option>
              <option value="Absurdity">Absurdity</option>
            </select>
            <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={customConfig.wildcardsEnabled}
                onChange={(e) =>
                  setCustomConfig((c) => ({
                    ...c,
                    wildcardsEnabled: e.target.checked,
                  }))
                }
              />
              Wildcards Active
            </label>
          </div>
        </div>
      )}

    </div>
  );

  // Loading state while assets preload
  if (!assetsReady) {
    return (
      <div className="fixed inset-0 bg-[#1B113A] flex flex-col items-center justify-center text-[#FFD13B] font-black gap-3">
        <div className="w-12 h-12 border-4 border-[#FFD13B] border-t-transparent rounded-full animate-spin" />
        <div className="text-lg tracking-wider uppercase">
          Warming Up Studio Spotlights...
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-[#1B113A] text-[#FFF8EC] select-none"
      style={{fontFamily: THEME.bodyFontFamily}}>
      {/* Google Fonts + GPU-Composited Snappy Animation Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap');
        @keyframes mmPopIn {
          0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.95); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        .mm-pop {
          animation: mmPopIn ${profile.reducedMotion ? '1ms' : '180ms'} cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }
      `}</style>

      <BackgroundMusic
        url={activeMusicUrl}
        isPlaying={isMusicActive}
        isMuted={profile.musicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* Interactive 4-Step Guided Tutorial Stage */}
      {appScreen === 'TUTORIAL' && (
        <IntroTutorialStage
          assets={assets}
          reducedMotion={profile.reducedMotion}
          mayhemLevel={profile.mayhemLevel}
          onFinishTutorial={() => {
            updateProfile((p) => markTutorialCompleted(p));
            setAppScreen('LOBBY');
          }}
          onSkipToHub={() => {
            updateProfile((p) => markTutorialCompleted(p));
            setAppScreen('LOBBY');
          }}
        />
      )}

      {/* Dedicated Top HUD Bar (Flexbox separated from canvas, wraps cleanly on narrow mobile, leaves top-right clear for Menu/Forfeit) */}
      {appScreen === 'PLAYING' && (
        <header className="w-full bg-[#241645] border-b-[3px] border-[#1A1336] z-20 shrink-0">
          <div className="px-3 py-1.5 pr-36 sm:pr-44 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#1A1336] px-2.5 py-1 rounded-full border border-[#FFD13B]/50">
              <span className="text-xs">{currentModeMeta.icon}</span>
              <span className="text-xs font-black text-[#FFD13B] uppercase">
                {currentModeMeta.name}
              </span>
            </div>

            <div className="bg-[#2E1E59] border border-[#1A1336] px-2.5 py-1 rounded-full text-xs font-black text-[#38E8FF]">
              Round {gameState.round} of {gameState.maxRounds}
            </div>

            <div className="bg-[#FF4D79] text-[#1A1336] border border-[#1A1336] px-2.5 py-1 rounded-full text-[11px] font-black">
              🔥 Mayhem Lv.{matchMayhemMods.level} ({matchMayhemMods.rewardMultiplier}x)
            </div>

            <div className="bg-[#2E1E59] border border-[#1A1336] px-2.5 py-1 rounded-full text-xs font-black text-[#2CEAA3]">
              Phase: {gameState.phase}
            </div>

            {activeWildcardMeta && (
              <div
                className="px-2.5 py-1 rounded-full text-[11px] font-black text-[#1A1336] border border-[#1A1336]"
                style={{backgroundColor: activeWildcardMeta.accentColor}}>
                ⚡ {activeWildcardMeta.badge}
              </div>
            )}

            {myComedyStreak >= 2 && (
              <div className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FFD13B] text-[#1A1336] border border-[#1A1336]">
                🔥 {myComedyStreak}x Streak!
              </div>
            )}

            {/* Countdown Pill with colorblind-safe icon + color shift */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-black border border-[#1A1336] flex items-center gap-1 ${
                displayTimeLeft <= 5
                  ? 'bg-[#FF4D79] text-[#1A1336] animate-pulse'
                  : displayTimeLeft <= 12
                    ? 'bg-[#FFD13B] text-[#1A1336]'
                    : 'bg-[#2CEAA3] text-[#1A1336]'
              }`}>
              <span>{displayTimeLeft <= 5 ? '🔥' : '⏱️'}</span>
              <span>{formatTime(Math.ceil(displayTimeLeft))}</span>
            </div>
          </div>
          {/* 60 FPS GPU-composited Phase Progress Bar */}
          <div className="w-full h-1.5 bg-[#1A1336] overflow-hidden">
            <div
              ref={timerBarRef}
              className="h-full w-full origin-left bg-gradient-to-r from-[#2CEAA3] via-[#FFD13B] to-[#FF4D79]"
              style={{transform: 'scaleX(1)', willChange: 'transform'}}
            />
          </div>
        </header>
      )}

      {/* Center Stage Container: 60 FPS Canvas Backdrop + Interactive Game Show Cards */}
      <main className="flex-1 w-full min-h-0 relative flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={getConfig('width')}
          height={getConfig('height')}
          style={{
            aspectRatio: `${getConfig('width')} / ${getConfig('height')}`,
            width: `min(100%, calc(100vh * ${getConfig('width')} / ${getConfig('height')}))`,
          }}
          className="h-auto max-w-full max-h-full pointer-events-none"
        />

        {/* Interactive Stage Overlay during PLAYING */}
        {appScreen === 'PLAYING' && (
          <div className="absolute inset-0 overflow-y-auto touch-auto p-3 sm:p-5 flex flex-col items-center">
            <div className="w-full max-w-4xl m-auto space-y-3 pb-16 sm:pb-4">
              {/* Situation & Objects Prompt Banner */}
              {gameState.phase !== 'COUNTDOWN' &&
                gameState.phase !== 'WILDCARD' && (
                  <div
                    className={`bg-[#FFF8EC] text-[#1A1336] ${COMIC_SHADOW} rounded-2xl p-3 sm:p-4 space-y-2.5`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF4D79] text-white border-2 border-[#1A1336]">
                        {gameState.wildcard === 'REVERSE_CHALLENGE'
                          ? '💀 REVERSE CHALLENGE: FAIL HORRIBLY!'
                          : '🎬 THE SITUATION'}
                      </span>
                      {gameState.restriction && (
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#FFD13B] text-[#1A1336] border-2 border-[#1A1336]">
                          ⚠️ Rule: {gameState.restriction.label} —{' '}
                          {gameState.restriction.description}
                        </span>
                      )}
                    </div>

                    <h2
                      className="text-base sm:text-xl font-black leading-snug"
                      style={{fontFamily: THEME.fontFamily}}>
                      {gameState.situation}
                    </h2>

                    {/* Assigned Objects Row */}
                    <div className="flex flex-wrap gap-2">
                      {gameState.objects.map((obj, idx) => {
                        const isHiddenMystery =
                          gameState.wildcard === 'MYSTERY_OBJECT' &&
                          !gameState.mysteryRevealed &&
                          idx === gameState.objects.length - 1;
                        return (
                          <div
                            key={`${obj.id}_${idx}`}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] ${
                              isHiddenMystery
                                ? 'bg-[#7C4DFF] text-white'
                                : 'bg-[#FFD13B]/30 text-[#1A1336]'
                            }`}>
                            {isHiddenMystery ? (
                              <>
                                <img
                                  src="assets/images/mystery_cube.png"
                                  alt="Mystery Object"
                                  className="w-6 h-6 object-contain"
                                />
                                <span className="text-xs font-black">
                                  ??? Mystery Reveal Soon!
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-lg">{obj.icon}</span>
                                <div>
                                  <div className="text-xs font-black leading-none">
                                    {obj.name}
                                  </div>
                                  <div className="text-[9px] font-extrabold opacity-70 uppercase">
                                    {obj.category}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* PHASE 1: COUNTDOWN */}
              {gameState.phase === 'COUNTDOWN' && (
                <div
                  className={`mm-pop bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-6 text-center max-w-md mx-auto space-y-2`}>
                  <div className="text-xs font-black uppercase tracking-widest text-[#2CEAA3]">
                    Round {gameState.round} Starting!
                  </div>
                  <div
                    className="text-5xl sm:text-6xl font-black text-[#FFD13B] animate-bounce"
                    style={{
                      textShadow: '4px 4px 0 #1A1336',
                      fontFamily: THEME.fontFamily,
                    }}>
                    GET READY!
                  </div>
                  <div className="text-xs font-bold text-[#FFF8EC]/80">
                    Gizmo is shuffling {gameState.objects.length} wild props...
                  </div>
                </div>
              )}

              {/* PHASE 2: WILDCARD WHEEL */}
              {gameState.phase === 'WILDCARD' && activeWildcardMeta && (
                <div
                  className={`mm-pop bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-5 text-center max-w-md mx-auto space-y-2 mt-28 sm:mt-36`}>
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-black text-[#1A1336] border-2 border-[#1A1336]"
                    style={{backgroundColor: activeWildcardMeta.accentColor}}>
                    🎡 WILDCARD ACTIVATED!
                  </div>
                  <h3
                    className="text-2xl font-black text-[#FFD13B]"
                    style={{fontFamily: THEME.fontFamily}}>
                    {activeWildcardMeta.name}
                  </h3>
                  <p className="text-xs font-bold text-[#FFF8EC]">
                    {activeWildcardMeta.description}
                  </p>
                </div>
              )}

              {/* PHASE 3: REVEAL */}
              {gameState.phase === 'REVEAL' && (
                <div
                  className={`bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-4 text-center max-w-md mx-auto`}>
                  <div className="text-sm font-black text-[#2CEAA3] uppercase animate-pulse">
                    Study Your Props! Writing Starts in Moments...
                  </div>
                </div>
              )}

              {/* PHASE 4: WRITE */}
              {gameState.phase === 'WRITE' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div
                    className={`lg:col-span-2 bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-3.5 sm:p-4 space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-[#FFD13B]">
                        ✏️ Invent Your Mashup Solution
                      </span>
                      <span className="text-[11px] font-bold text-[#FFF8EC]/70">
                        {draftAnswer.length}/{getConfig('maxAnswerLength')}
                      </span>
                    </div>

                    {mySubmission ? (
                      <div className="bg-[#1A1336]/75 border-2 border-[#2CEAA3] rounded-xl p-4 text-center space-y-2">
                        <div className="text-sm font-black text-[#2CEAA3]">
                          ✅ Locked In!{' '}
                          {mySubmission.submittedEarly &&
                            `(+${getConfig('earlySubmitBonus')} Speed Bonus!)`}
                        </div>
                        <p className="text-sm font-bold text-[#FFF8EC] italic">
                          &ldquo;{mySubmission.text}&rdquo;
                        </p>
                        <div className="text-[11px] text-[#FFF8EC]/70">
                          Waiting for remaining contestants...
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          maxLength={getConfig('maxAnswerLength')}
                          value={draftAnswer}
                          onChange={(e) => {
                            setDraftAnswer(e.target.value);
                            if (e.target.value.length % 6 === 1) {
                              sendAction({
                                type: 'TYPING_STATUS',
                                payload: {isTyping: true},
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              submitAnswer();
                            }
                          }}
                          placeholder="Combine the objects into an outrageous survival plan! (Press Enter to lock in early)"
                          className="w-full rounded-xl bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FFD13B]"
                        />

                        {activeRestrictionViolation && (
                          <div className="text-xs font-black text-[#FF4D79] bg-[#1A1336] px-3 py-1.5 rounded-lg border border-[#FF4D79]">
                            ⚠️ Warning: {activeRestrictionViolation} (-10 pts if
                            submitted as-is)
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] font-bold text-[#2CEAA3]">
                            {displayTimeLeft > 5
                              ? `⚡ Submit now for +${getConfig('earlySubmitBonus')} Speed Bonus!`
                              : 'Hurry! Timer almost up!'}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={mySparkUsed}
                              onClick={triggerMashupSpark}
                              data-testid="mashup-spark-button"
                              className={`min-h-[44px] px-3.5 py-2 rounded-xl border-[3px] border-[#1A1336] font-black text-xs uppercase tracking-wider transition-transform ${
                                mySparkUsed
                                  ? 'bg-[#3B266E] text-[#FFF8EC]/45 cursor-not-allowed'
                                  : 'bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] shadow-[0_3px_0_#1A1336] cursor-pointer active:translate-y-0.5'
                              }`}>
                              {mySparkUsed
                                ? '⚡ Spark Used (0 Left)'
                                : '⚡ Spark Idea (1/Match)'}
                            </button>
                            <button
                              onClick={submitAnswer}
                              className="min-h-[48px] px-5 py-2.5 bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer active:translate-y-0.5">
                              🚀 Lock In Pitch
                            </button>
                          </div>
                        </div>

                        {activeSparkHint && (
                          <div className="bg-[#FFD13B]/15 border-2 border-[#FFD13B] rounded-xl px-3 py-2 text-xs font-extrabold text-[#FFD13B]">
                            💡 Mashup Spark: {activeSparkHint}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Team Chaos Collaborative Chat */}
                    {gameState.mode === 'TEAM_CHAOS' && myPlayerId && (
                      <div className="bg-[#1A1336]/70 border-2 border-[#38E8FF]/40 rounded-xl p-2.5 space-y-2">
                        <div className="text-[10px] font-black uppercase text-[#38E8FF]">
                          🤝 Squad Strategy Chat (
                          {
                            gameState.teamNames[
                              gameState.teamAssignments[myPlayerId] || 'A'
                            ]
                          }
                          )
                        </div>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-[11px]">
                          {gameState.teamChat
                            .filter(
                              (c) =>
                                c.teamId ===
                                (gameState.teamAssignments[myPlayerId] || 'A'),
                            )
                            .map((c) => (
                              <div key={c.id} className="flex items-center gap-1.5">
                                <span className="font-black text-[#FFD13B]">
                                  {c.senderName}:
                                </span>
                                <span>{c.text}</span>
                              </div>
                            ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            value={teamChatInput}
                            onChange={(e) => setTeamChatInput(e.target.value)}
                            placeholder="Share a draft with your squad..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#2E1E59] border border-[#1A1336] text-xs"
                          />
                          <button
                            onClick={() => {
                              const clean = sanitizeSafeText(
                                teamChatInput.trim(),
                                profile.safeChatFilter,
                              );
                              if (!clean) return;
                              sendAction({
                                type: 'TEAM_CHAT',
                                payload: {text: clean},
                              });
                              setTeamChatInput('');
                            }}
                            className="px-3 py-1 bg-[#38E8FF] text-[#1A1336] font-black rounded-lg text-xs cursor-pointer">
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Contestant Status Column */}
                  <div
                    className={`bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-3 space-y-2`}>
                    <div className="text-xs font-black uppercase text-[#38E8FF]">
                      Studio Booths
                    </div>
                    <div className="space-y-1.5">
                      {[...gameState.activePlayerIds, ...gameState.botIds].map(
                        (pid) => {
                          const hasSub =
                            gameState.mode === 'TEAM_CHAOS'
                              ? Boolean(
                                  gameState.submissions[
                                    `team_${gameState.teamAssignments[pid] || 'A'}`
                                  ],
                                )
                              : Boolean(gameState.submissions[pid]);
                          const isTyping =
                            gameState.typingPlayerIds.includes(pid);
                          const avId =
                            gameState.playerAvatars[pid] || AVATAR_CATALOG[0].id;
                          const avPath =
                            AVATAR_CATALOG.find((a) => a.id === avId)
                              ?.imagePath || AVATAR_CATALOG[0].imagePath;

                          return (
                            <div
                              key={pid}
                              className="flex items-center justify-between bg-[#2E1E59] border-2 border-[#1A1336] rounded-xl px-2.5 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={avPath}
                                  alt=""
                                  className="w-7 h-7 object-contain shrink-0"
                                />
                                <span className="text-xs font-extrabold truncate">
                                  {getPlayerName(pid)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {(gameState.comedyStreaks?.[pid] || 0) >= 2 && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FFD13B] text-[#1A1336] border border-[#1A1336]">
                                    🔥{gameState.comedyStreaks[pid]}x
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-[#1A1336] ${
                                    hasSub
                                      ? 'bg-[#2CEAA3] text-[#1A1336]'
                                      : isTyping
                                        ? 'bg-[#FFD13B] text-[#1A1336] animate-pulse'
                                        : 'bg-[#1A1336] text-[#FFF8EC]/70'
                                  }`}>
                                  {hasSub
                                    ? 'Locked!'
                                    : isTyping
                                      ? 'Typing...'
                                      : gameState.botIds.includes(pid)
                                        ? 'Plotting...'
                                        : 'Thinking'}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PHASE 5: ANONYMOUS VOTING */}
              {gameState.phase === 'VOTE' && (
                <div
                  className={`mm-pop bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-3.5 sm:p-4 space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-[#FFD13B] uppercase">
                        🗳️ Blind Studio Vote — Pick the Best Mashup!
                      </div>
                      <div className="text-[11px] font-bold text-[#FFF8EC]/75">
                        Names are hidden until reveal! Tap a card or press keys
                        1–5.
                      </div>
                    </div>
                    {myVote && (
                      <span className="px-3 py-1 rounded-full bg-[#2CEAA3] text-[#1A1336] text-xs font-black border-2 border-[#1A1336]">
                        ✅ Vote Cast!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {gameState.blindOrderIds.map((subId, idx) => {
                      const sub = gameState.submissions[subId];
                      if (!sub) return null;
                      const isMine = sub.authorId === myPlayerId;
                      const isChosen = myVote === subId;
                      const disabled = isMine || Boolean(myVote);

                      return (
                        <button
                          key={subId}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) {
                              gameAudio.playErrorBuzz();
                              return;
                            }
                            gameAudio.playConfirmSelect();
                            sendAction({
                              type: 'CAST_VOTE',
                              payload: {submissionId: subId},
                            });
                          }}
                          className={`min-h-[68px] p-3 rounded-xl border-[3px] border-[#1A1336] text-left transition-all flex flex-col justify-between gap-1.5 ${
                            isChosen
                              ? 'bg-[#2CEAA3] text-[#1A1336] shadow-[0_4px_0_#1A1336]'
                              : isMine
                                ? 'bg-[#3B266E]/60 text-[#FFF8EC]/70 cursor-not-allowed'
                                : myVote
                                  ? 'bg-[#2E1E59] text-[#FFF8EC]/80 cursor-default'
                                  : 'bg-[#FFF8EC] text-[#1A1336] hover:bg-[#FFD13B] shadow-[0_4px_0_#1A1336] cursor-pointer active:translate-y-0.5'
                          }`}>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase">
                            <span>
                              #{idx + 1} • Mystery Pitch {idx + 1}
                            </span>
                            {isMine && (
                              <span className="px-2 py-0.5 rounded bg-[#1A1336] text-[#FFD13B]">
                                Your Pitch (Self-Vote Blocked)
                              </span>
                            )}
                            {isChosen && <span>⭐ YOUR VOTE</span>}
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold leading-snug">
                            &ldquo;{sub.text}&rdquo;
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PHASE 6: AI JUDGE BREAKDOWN */}
              {gameState.phase === 'JUDGE' && (
                <div
                  className={`bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-3.5 sm:p-4 space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-[#FFD13B] uppercase">
                      🤖 Gizmo-Bling AI Judge &amp; Mini-Awards
                    </div>
                    {isHost && (
                      <button
                        onClick={() =>
                          sendAction({type: 'ADVANCE_PHASE', payload: {}})
                        }
                        className="px-3 py-1.5 bg-[#FFD13B] text-[#1A1336] border-2 border-[#1A1336] rounded-xl text-xs font-black cursor-pointer">
                        Next ➡️
                      </button>
                    )}
                  </div>

                  {/* End-of-Round Mini-Awards & Comedy Streak Hype Callouts */}
                  {((gameState.roundAwards?.length ?? 0) > 0 ||
                    Object.values(gameState.comedyStreaks || {}).some(
                      (s) => s >= 2,
                    )) && (
                    <div className="flex flex-wrap items-center gap-2 bg-[#1A1336]/75 border-2 border-[#FFD13B]/60 rounded-xl px-3 py-2">
                      {gameState.roundAwards?.map((aw) => (
                        <span
                          key={`${aw.type}_${aw.playerId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFD13B] text-[#1A1336] border border-[#1A1336] text-[10px] font-black">
                          <span>{aw.icon}</span>
                          <span>
                            {aw.label}: {aw.playerName} (+{aw.bonusPoints})
                          </span>
                        </span>
                      ))}
                      {Object.entries(gameState.comedyStreaks || {})
                        .filter(([, s]) => s >= 2)
                        .map(([pid, s]) => (
                          <span
                            key={`streak_${pid}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF4D79] text-[#FFF8EC] border border-[#1A1336] text-[10px] font-black">
                            🔥 {getPlayerName(pid)} {s}x Streak!
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.values(gameState.submissions)
                      .sort(
                        (a, b) =>
                          (gameState.judgements[b.id]?.finalRoundPoints ?? 0) -
                          (gameState.judgements[a.id]?.finalRoundPoints ?? 0),
                      )
                      .map((sub, idx) => {
                        const j = gameState.judgements[sub.id];
                        const avPath =
                          AVATAR_CATALOG.find((a) => a.id === sub.avatarId)
                            ?.imagePath || AVATAR_CATALOG[0].imagePath;
                        const shownCritique = j ? j.critique : '';

                        return (
                          <div
                            key={sub.id}
                            className={`mm-pop p-3 rounded-xl border-[3px] border-[#1A1336] space-y-2 ${
                              idx === 0
                                ? 'bg-[#FFF8EC] text-[#1A1336]'
                                : 'bg-[#2E1E59] text-[#FFF8EC]'
                            }`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={avPath}
                                  alt=""
                                  className="w-8 h-8 object-contain shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-black truncate">
                                    {sub.authorName}
                                  </div>
                                  <div className="text-[10px] font-bold opacity-75">
                                    Votes: {j?.votesReceived ?? 0} • AI:{' '}
                                    {j?.aiTotal ?? 0} • Crowd:{' '}
                                    {j?.votePoints ?? 0}
                                    {(j?.awardBonus || 0) > 0
                                      ? ` • Awards +${j?.awardBonus}`
                                      : ''}
                                    {(j?.streakBonus || 0) > 0
                                      ? ` • Streak +${j?.streakBonus}`
                                      : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="px-2.5 py-1 rounded-xl bg-[#FFD13B] text-[#1A1336] border-2 border-[#1A1336] text-sm font-black shrink-0">
                                {j?.finalRoundPoints ?? 0} pts
                              </div>
                            </div>

                            {(j?.awards?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {j!.awards!.map((label) => (
                                  <span
                                    key={label}
                                    className="px-2 py-0.5 rounded-full bg-[#2CEAA3] text-[#1A1336] border border-[#1A1336] text-[9px] font-black">
                                    {label} +5
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="text-xs font-bold italic">
                              &ldquo;{sub.text}&rdquo;
                            </div>

                            {j && (
                              <>
                                <div className="grid grid-cols-4 gap-1 text-[10px] font-black text-center">
                                  <div className="bg-[#1A1336]/15 rounded px-1 py-0.5">
                                    Rel {j.relevance}/15
                                  </div>
                                  <div className="bg-[#1A1336]/15 rounded px-1 py-0.5">
                                    Cre {j.creativity}/15
                                  </div>
                                  <div className="bg-[#1A1336]/15 rounded px-1 py-0.5">
                                    Hum {j.humor}/15
                                  </div>
                                  <div className="bg-[#1A1336]/15 rounded px-1 py-0.5">
                                    Ori {j.originality}/15
                                  </div>
                                </div>
                                <div className="text-[11px] font-bold leading-snug opacity-90">
                                  🎙️ {shownCritique}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* PHASE 7: LIVE SCOREBOARD */}
              {gameState.phase === 'SCOREBOARD' && (
                <div
                  className={`mm-pop bg-[#241645]/95 ${COMIC_SHADOW} rounded-2xl p-4 max-w-lg mx-auto space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="text-base font-black text-[#FFD13B] uppercase">
                      🏆 Round {gameState.round} Standings
                    </div>
                    {isHost && (
                      <button
                        onClick={() =>
                          sendAction({type: 'ADVANCE_PHASE', payload: {}})
                        }
                        className="px-3 py-1.5 bg-[#2CEAA3] text-[#1A1336] border-2 border-[#1A1336] rounded-xl text-xs font-black cursor-pointer">
                        Finish Round ➡️
                      </button>
                    )}
                  </div>

                  {gameState.suddenDeathLoserId && (
                    <div className="bg-[#FF4D79] text-[#1A1336] border-2 border-[#1A1336] rounded-xl px-3 py-1.5 text-xs font-black">
                      💥 Sudden Death Hazard: {getPlayerName(gameState.suddenDeathLoserId)} lost 15 pts!
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {Object.entries(gameState.cumulativePoints)
                      .sort(([, a], [, b]) => b - a)
                      .map(([pid, pts], idx) => (
                        <div
                          key={pid}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 border-[#1A1336] ${
                            idx === 0
                              ? 'bg-[#FFD13B] text-[#1A1336]'
                              : 'bg-[#2E1E59] text-[#FFF8EC]'
                          }`}>
                          <div className="flex items-center gap-2 font-black text-xs">
                            <span>#{idx + 1}</span>
                            <span>{getPlayerName(pid)}</span>
                            {(gameState.comedyStreaks?.[pid] || 0) >= 2 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#FF4D79] text-[#FFF8EC] border border-[#1A1336] text-[9px]">
                                🔥{gameState.comedyStreaks[pid]}x
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-black">{pts} total pts</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Quick Reaction Sticker Bar (Desktop + Mobile, touch-friendly >=48px) */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {REACTION_STICKERS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => triggerReaction(st.emoji)}
                    title={st.label}
                    className="min-w-[48px] min-h-[48px] px-2.5 bg-[#241645]/90 hover:bg-[#3B266E] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] rounded-xl text-xl flex items-center justify-center cursor-pointer active:translate-y-0.5 touch-none">
                    {st.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Touch Action Bar (unconditional when useIsMobile() is true during PLAYING) */}
      {isMobile && appScreen === 'PLAYING' && (
        <div className="w-full bg-[#241645] border-t-[3px] border-[#1A1336] px-8 py-2 flex items-center justify-center gap-2 z-20 shrink-0 pointer-events-none">
          {gameState.phase === 'WRITE' && !mySubmission && (
            <button
              onPointerUp={(e) => {
                e.preventDefault();
                submitAnswer();
              }}
              className="pointer-events-auto touch-none min-w-[48px] min-h-[48px] px-4 bg-[#2CEAA3] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] rounded-xl font-black text-xs uppercase">
              🚀 Submit Pitch
            </button>
          )}
          {gameState.phase === 'VOTE' && !myVote && (
            <div className="flex items-center gap-2 pointer-events-auto">
              {gameState.blindOrderIds.slice(0, 4).map((subId, idx) => {
                const sub = gameState.submissions[subId];
                const isMine = sub?.authorId === myPlayerId;
                return (
                  <button
                    key={subId}
                    disabled={isMine}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      if (!isMine) {
                        gameAudio.playConfirmSelect();
                        sendAction({
                          type: 'CAST_VOTE',
                          payload: {submissionId: subId},
                        });
                      }
                    }}
                    className={`touch-none w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border-2 border-[#1A1336] font-black text-xs ${
                      isMine
                        ? 'bg-[#3B266E]/50 text-[#FFF8EC]/40'
                        : 'bg-[#FFD13B] text-[#1A1336] shadow-[0_3px_0_#1A1336]'
                    }`}>
                    #{idx + 1}
                  </button>
                );
              })}
            </div>
          )}
          {gameState.phase !== 'WRITE' && gameState.phase !== 'VOTE' && (
            <div className="text-[11px] font-black text-[#FFD13B] py-2">
              🎙️ Watch the Studio Stage!
            </div>
          )}
        </div>
      )}

      {copyToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[100] bg-[#2CEAA3] text-[#1A1336] border-2 border-[#1A1336] px-4 py-2 rounded-full font-black text-xs shadow-lg">
          {copyToast}
        </div>
      )}

      {/* Standardized Multiplayer Overlays (Lobby, Podium, Menu, How To Play, Forfeit) */}
      <MultiplayerOverlays
        appScreen={appScreen}
        gameState={gameState}
        players={players}
        myPlayerId={myPlayerId}
        isHost={isHost}
        networkStatus={networkStatus}
        customRounds={customRounds}
        defaultRounds={getDefaultRounds()}
        onSetCustomRounds={setCustomRounds}
        onCommenceTournament={handleCommenceMultiplayer}
        onStartNextRound={handleStartNextRound}
        onRestartTournament={handleRestartTournament}
        onReturnToLobby={() => {
          setIsSoloPractice(false);
          isSoloPracticeRef.current = false;
          returnToLobby();
        }}
        onEndLobby={endLobby}
        onForfeit={handleForfeit}
        getPlayerName={getPlayerName}
        showDebugHud={showDebugHud}
        setShowDebugHud={setShowDebugHud}
        showInGameMenu={showInGameMenu}
        setShowInGameMenu={setShowInGameMenu}
        showHowToPlay={showHowToPlay}
        setShowHowToPlay={setShowHowToPlay}
        showForfeitModal={showForfeitModal}
        setShowForfeitModal={setShowForfeitModal}
        hudMetrics={hudMetrics}
        gameTitle="Mashup Mayhem"
        subtitle="by AK Productions"
        lobbyExtraContent={lobbyExtraContent}
        lobbyActionsExtra={
          <button
            onClick={startSoloPractice}
            className="sm:w-52 py-3.5 px-4 rounded-xl font-black uppercase tracking-wider text-xs border-[3px] border-[#1A1336] bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] shadow-[0_4px_0_#1A1336] active:translate-y-0.5 cursor-pointer">
            🤖 Start Now with Bots
          </button>
        }
        lobbyTopRightSlot={lobbyTopRightSlot}
        hasCompletedTutorial={profile.hasCompletedTutorial || profile.hasSeenTutorial}
        onOpenLeaderboard={() => {
          gameAudio.playCrispClick();
          setShowLeaderboardModal(true);
        }}
        podiumExtraContent={
          <div className="space-y-2 text-left">
            <div className="bg-[#1A1336]/75 border-2 border-[#FFD13B]/50 rounded-xl p-3 space-y-1">
              <div className="text-[11px] font-black text-[#FFD13B] uppercase">
                🔥 Mayhem Lv.{matchMayhemMods.level} ({matchMayhemMods.rewardMultiplier}x XP &amp; Coin Bonus!)
              </div>
              <div className="text-[10px] font-bold text-[#2CEAA3]">
                Next Run Preview: Mayhem Lv.{profile.mayhemLevel} ({getMayhemModifiers(profile.mayhemLevel).title})
              </div>
            </div>

            {currentAccount ? (
              <div className="bg-[#2CEAA3]/15 border-2 border-[#2CEAA3] rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-[#2CEAA3] uppercase">
                    🏆 Global Leaderboard Updated!
                  </div>
                  <div className="text-xs font-extrabold text-[#FFF8EC]">
                    {currentAccount.username} • Rank #
                    {rankClimbInfo?.newRank ?? myGlobalRank ?? '-'} (
                    {profile.totalPoints} Total Pts)
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {rankClimbInfo && rankClimbInfo.rankDelta > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#FFD13B] text-[#1A1336] border border-[#1A1336] text-[10px] font-black">
                      ▲ +{rankClimbInfo.rankDelta} Ranks!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setShowLeaderboardModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#38E8FF] text-[#1A1336] border border-[#1A1336] text-[10px] font-black uppercase cursor-pointer">
                    View
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFD13B]/15 border-2 border-[#FFD13B] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-[#FFF8EC]">
                  Want to save your score &amp; climb the{' '}
                  <span className="text-[#FFD13B] font-black">
                    Global Leaderboard
                  </span>
                  ?
                </div>
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playConfirmSelect();
                    setAccountModalState({open: true, tab: 'SIGNUP'});
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-2 border-[#1A1336] text-[10px] font-black uppercase cursor-pointer">
                  Sign in or Log in
                </button>
              </div>
            )}
          </div>
        }
        onOpenInteractiveTutorial={() => {
          gameAudio.playCrispClick();
          setAppScreen('TUTORIAL');
        }}
        readyPlayerIds={readyPlayerIds}
        onToggleReady={() => {
          if (!myPlayerId) return;
          gameAudio.playConfirmSelect();
          if (isHost) {
            setReadyPlayerIds((prev) =>
              prev.includes(myPlayerId)
                ? prev.filter((x) => x !== myPlayerId)
                : [...prev, myPlayerId],
            );
          } else if (sdk) {
            setReadyPlayerIds((prev) =>
              prev.includes(myPlayerId)
                ? prev.filter((x) => x !== myPlayerId)
                : [...prev, myPlayerId],
            );
            sdk.sendGameEvent({
              type: 'LOBBY_READY_TOGGLE',
              payload: JSON.stringify({playerId: myPlayerId}),
            });
          }
        }}
        playerAvatars={{
          ...gameState.playerAvatars,
          ...(myPlayerId ? {[myPlayerId]: profile.equippedAvatarId} : {}),
        }}
        sfxMuted={profile.soundMuted}
        onToggleSfx={() => {
          const nextMuted = gameAudio.toggleMute();
          updateProfile((p) => ({...p, soundMuted: nextMuted}));
        }}
        musicMuted={profile.musicMuted}
        onToggleMusic={() => {
          updateProfile((p) => ({...p, musicMuted: !p.musicMuted}));
        }}
        howToPlayRules={[
          'Each round reveals 3–5 absurd objects and an outrageous situation.',
          'Write a hilarious plan combining the assigned props before the timer runs out—or lock in early for a Speed Bonus!',
          'Watch out for Wildcards: Double Points, Mystery Object, Object Swap, Reverse Challenge, No-Common-Words, and Sudden Death!',
          'Vote anonymously for the funniest rival pitch (keys 1–5 or tap). Self-voting is blocked.',
          'Gizmo-Bling AI scores Relevance, Creativity, Humor, and Originality out of 60 + crowd votes out of 40!',
        ]}
      />

      {/* Account Sign Up / Log In / Profile Modal */}
      <AccountModal
        isOpen={accountModalState.open}
        initialTab={accountModalState.tab}
        currentAccount={currentAccount}
        onClose={() => setAccountModalState((s) => ({...s, open: false}))}
        onAuthSuccess={(acc) => {
          let activeAcc = acc;
          if (
            appScreenRef.current === 'PODIUM' &&
            guestMatchPointsPendingRef.current
          ) {
            const pending = guestMatchPointsPendingRef.current;
            guestMatchPointsPendingRef.current = null;
            const prevRank = getAccountGlobalRank(acc.id);
            const updated = updateAccountProfileById(acc.id, (prev) => ({
              ...prev,
              totalPoints: (prev.totalPoints || 0) + pending.points,
              wins: prev.wins + (pending.won ? 1 : 0),
              bestAnswerScore: Math.max(
                prev.bestAnswerScore,
                pending.bestScore,
              ),
              xp: prev.xp + 40 + pending.points,
              coins: prev.coins + 25 + Math.round(pending.points * 0.4),
            }));
            if (updated) {
              activeAcc = updated;
              const newRank = getAccountGlobalRank(updated.id);
              setRankClimbInfo({
                prevRank,
                newRank,
                rankDelta: prevRank - newRank,
              });
            }
          }
          currentAccountRef.current = activeAcc;
          setCurrentAccount(activeAcc);
          setProfile(activeAcc.profile);
          gameAudio.setMuted(activeAcc.profile.soundMuted);
          syncMyAccountToRoom(activeAcc);
        }}
        onLogout={() => {
          currentAccountRef.current = null;
          setCurrentAccount(null);
          const guestProf = loadProfile();
          setProfile(guestProf);
          gameAudio.setMuted(guestProf.soundMuted);
          setRankClimbInfo(null);
          syncMyAccountToRoom(null);
        }}
      />

      {/* Global Leaderboard Modal */}
      <GlobalLeaderboardModal
        isOpen={showLeaderboardModal}
        currentAccount={currentAccount}
        remoteEntries={remoteLeaderboardEntries}
        onClose={() => setShowLeaderboardModal(false)}
        onOpenAuth={(tab = 'SIGNUP') =>
          setAccountModalState({open: true, tab})
        }
      />
    </div>
  );
}
