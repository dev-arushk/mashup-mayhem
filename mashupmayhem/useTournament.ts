// tslint:disable
/* eslint-disable */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getConfig} from './constants';
import {mergeGameStateDiff} from './delta_compression';
import {BaseTournamentGameState, Player, SyncEventType} from './types';

export type {BaseTournamentGameState};

/**
 * @fileoverview Reusable Tournament State Machine & Forfeit Management Hook.
 * Encapsulates tournament rounds configuration, match commencement,
 * cumulative standings, 1v1 spectator queue rotation (Winner Stays On),
 * round reset, tournament podium winner resolution, and forfeit handling.
 */

export interface UseTournamentOptions<T extends BaseTournamentGameState> {
  gameId?: string;
  sdk: any;
  isHost: boolean;
  isHostRef: React.MutableRefObject<boolean>;
  myPlayerId: string | null;
  myPlayerIdRef: React.MutableRefObject<string | null>;
  players: Player[];
  playersRef?: React.MutableRefObject<Player[]>;
  lobbyId: string | null;
  lobbyIdRef: React.MutableRefObject<string | null>;
  appScreen: string;
  appScreenRef: React.MutableRefObject<string>;
  setAppScreen: (screen: any) => void;
  onGameEventRef?: React.MutableRefObject<
    ((event: any) => void) | null | undefined
  >;
  initialCustomState?: Partial<T>;
  onInitRound?: (isFirstRound: boolean, baseState: T) => Partial<T>;
  onResetMatch?: () => Partial<T>;
  onForfeit?: (
    forfeiterId: string,
    remainingActivePlayerIds: string[],
    currentGS: T,
  ) => Partial<T> | void;
  onCustomGameEvent?: (event: any, payload: any, senderId?: string) => void;
  onStateSync?: (payload: any, prevGameState: T) => void;
  maxActivePlayers?: number;
}

export function useTournament<T extends BaseTournamentGameState>(
  options: UseTournamentOptions<T>,
) {
  const {
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
    initialCustomState,
    onInitRound,
    onResetMatch,
    onForfeit,
    onCustomGameEvent,
    onStateSync,
    gameId,
  } = options;

  const gameIdRef = useRef(gameId || 'playground_multiplayer_game');
  useEffect(() => {
    if (gameId) gameIdRef.current = gameId;
  }, [gameId]);

  const onCustomGameEventRef = useRef(onCustomGameEvent);
  useEffect(() => {
    onCustomGameEventRef.current = onCustomGameEvent;
  }, [onCustomGameEvent]);

  const onStateSyncRef = useRef(onStateSync);
  useEffect(() => {
    onStateSyncRef.current = onStateSync;
  }, [onStateSync]);

  // --- Main Tournament Game State ---
  const [gameState, setGameState] = useState<T>(() => ({
    status: 'LOBBY',
    tick: 0,
    round: 1,
    maxRounds: 3,
    activePlayerIds: [],
    queue: [],
    forfeitedPlayerIds: [],
    scores: {},
    winnerId: null,
    standings: {},
    tournamentWinnerId: null,
    isForfeit: false,
    forfeiterId: null,
    ...(initialCustomState as any),
  }));

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const lastSentStateRef = useRef<T | null>(null);
  const roundActivePlayerIdsRef = useRef<string[]>([]);
  const maxActivePlayersRef = useRef<number>(options.maxActivePlayers || 2);
  useEffect(() => {
    if (options.maxActivePlayers) {
      maxActivePlayersRef.current = options.maxActivePlayers;
    }
  }, [options.maxActivePlayers]);

  // --- Tournament Round Settings & Helper ---
  const [customRounds, setCustomRounds] = useState<number | null>(null);

  const getDefaultRounds = useCallback(() => {
    try {
      const configRounds = (getConfig as any)('tournamentRounds');
      if (typeof configRounds === 'number' && configRounds > 0) {
        return configRounds;
      }
    } catch (e) {}
    return players.length >= 2 ? players.length : 3;
  }, [players.length]);

  // Broadcast host's custom rounds setting to all players in the lobby in real-time
  useEffect(() => {
    if (isHost && sdk && lobbyId) {
      sdk.sendGameEvent({
        type: 'LOBBY_CONFIG_SYNC',
        payload: JSON.stringify({customRounds}),
      });
    }
  }, [customRounds, isHost, sdk, lobbyId]);

  useEffect(() => {
    (window as any).canHandleBackKey =
      appScreen === 'PLAYING' &&
      ['PLAYING', 'PAUSED'].includes(gameState.status);
  }, [gameState.status, appScreen]);

  const hostEndMatchRef =
    useRef<
      (
        winnerId: string | null,
        options?: {isForfeit?: boolean; forfeiterId?: string},
      ) => void
    >();

  // ==========================================
  // 1. MATCH COMMENCEMENT (HOST)
  // ==========================================
  const commenceTournament = useCallback(() => {
    console.log('[useTournament] commenceTournament invoked');
    if (!isHostRef.current || players.length < 2 || !sdk) {
      console.warn('[useTournament] commenceTournament guard check failed');
      return;
    }
    const currentGS = gameStateRef.current;
    sdk.startGame();

    let maxActive = options.maxActivePlayers;
    if (!maxActive) {
      try {
        const configActive = (getConfig as any)('activePlayersCount');
        if (typeof configActive === 'number' && configActive > 0) {
          maxActive = configActive;
        }
      } catch (e) {}
    }
    if (!maxActive) {
      maxActive = 2;
    }
    maxActive = Math.max(2, Math.min(maxActive, 4));
    maxActivePlayersRef.current = maxActive;

    const activePlayerIds =
      players.length > maxActive
        ? players.slice(0, maxActive).map((p) => p.playerId)
        : players.map((p) => p.playerId);
    const queue =
      players.length > maxActive
        ? players.slice(maxActive).map((p) => p.playerId)
        : [];

    roundActivePlayerIdsRef.current = [...activePlayerIds];

    const initialStandings: Record<string, number> = {};
    players.forEach((p) => (initialStandings[p.playerId] = 0));

    const initialScores: Record<string, number> = {};
    activePlayerIds.forEach((id) => (initialScores[id] = 0));

    const maxRounds = customRounds !== null ? customRounds : getDefaultRounds();

    let initGameState: T = {
      ...currentGS,
      status: 'PLAYING',
      tick: currentGS.tick + 1,
      round: 1,
      maxRounds,
      activePlayerIds,
      queue,
      forfeitedPlayerIds: [],
      scores: initialScores,
      winnerId: null,
      standings: initialStandings,
      tournamentWinnerId: null,
      isForfeit: false,
      forfeiterId: null,
    };

    if (onInitRound) {
      const customInit = onInitRound(true, initGameState);
      if (customInit) {
        initGameState = {...initGameState, ...customInit};
      }
    }

    gameStateRef.current = initGameState;
    setGameState(initGameState);
    setAppScreen('PLAYING');

    console.log(
      '[useTournament] Broadcasting initial STATE_SYNC:',
      initGameState,
    );
    lastSentStateRef.current = JSON.parse(JSON.stringify(initGameState));
    const emitInit = () => {
      sdk.sendGameEvent({
        type: SyncEventType.STATE_SYNC,
        gameId: gameIdRef.current,
        lobbyId: lobbyIdRef.current,
        round: initGameState.round,
        tick: initGameState.tick,
        payload: JSON.stringify({...initGameState, _full: true}),
      });
    };
    emitInit();
    setTimeout(emitInit, 120);
    setTimeout(emitInit, 260);
  }, [players, sdk, customRounds, getDefaultRounds, onInitRound, setAppScreen]);

  // ==========================================
  // 2. NEXT ROUND INITIALIZATION (HOST)
  // ==========================================
  const startNextRound = useCallback(() => {
    console.log('[useTournament] startNextRound invoked');
    if (!isHostRef.current || !sdk) return;

    const currentGS = gameStateRef.current;
    roundActivePlayerIdsRef.current = [...currentGS.activePlayerIds];
    let nextGameState: T = {
      ...currentGS,
      status: 'PLAYING',
      tick: currentGS.tick + 1,
      scores: currentGS.activePlayerIds.reduce(
        (acc, id) => ({...acc, [id]: 0}),
        {},
      ),
      winnerId: null,
      isForfeit: false,
      forfeiterId: null,
      forfeitedPlayerIds: [],
    };

    if (onInitRound) {
      const customInit = onInitRound(false, nextGameState);
      if (customInit) {
        nextGameState = {...nextGameState, ...customInit};
      }
    }

    gameStateRef.current = nextGameState;
    setGameState(nextGameState);
    setAppScreen('PLAYING');

    console.log(
      '[useTournament] Broadcasting next round STATE_SYNC:',
      nextGameState,
    );
    lastSentStateRef.current = JSON.parse(JSON.stringify(nextGameState));
    sdk.sendGameEvent({
      type: SyncEventType.STATE_SYNC,
      gameId: gameIdRef.current,
      lobbyId: lobbyIdRef.current,
      round: nextGameState.round,
      tick: nextGameState.tick,
      payload: JSON.stringify({...nextGameState, _full: true}),
    });
  }, [sdk, onInitRound, setAppScreen]);

  // ==========================================
  // 3. MATCH CONCLUSION & PODIUM / QUEUE ROTATION (HOST)
  // ==========================================
  const hostEndMatch = useCallback(
    (
      winnerId: string | null,
      matchOptions?: {isForfeit?: boolean; forfeiterId?: string},
    ) => {
      console.log(
        '[useTournament] hostEndMatch called for winnerId:',
        winnerId,
        matchOptions,
      );
      if (!isHostRef.current || !sdk || !lobbyIdRef.current) return;

      const currentGS = gameStateRef.current;
      const isForfeit = matchOptions?.isForfeit ?? false;

      const nextStandings = {...currentGS.standings};

      if (winnerId && winnerId !== 'DRAW') {
        nextStandings[winnerId] = (nextStandings[winnerId] || 0) + 1;
        console.log(
          '[useTournament] Reporting score and complete triggers to SDK. Standing:',
          nextStandings[winnerId],
          'Round:',
          currentGS.round,
        );
        sdk.scoreUpdated({
          value: nextStandings[winnerId],
          level: String(currentGS.round),
        });
      }
      sdk.levelComplete(currentGS.round);

      let nextActivePlayerIds = [...currentGS.activePlayerIds];
      let nextQueue = [...currentGS.queue];
      const targetActiveCount = maxActivePlayersRef.current;

      // Defensively obtain the participants who entered this round.
      // If game logic filtered currentGS.activePlayerIds during gameplay (e.g. on player death),
      // roundActivePlayerIdsRef preserves the full roster that entered the round.
      const roundParticipants =
        roundActivePlayerIdsRef.current.length > 0
          ? roundActivePlayerIdsRef.current
          : currentGS.activePlayerIds;

      let loserId =
        matchOptions?.forfeiterId ||
        roundParticipants.find((id) => id !== winnerId);

      const forfeitedPlayerIds = isForfeit && loserId ? [loserId] : [];

      if (loserId) {
        // Loser or forfeiter rotates to the end of the queue (never eliminated forever)
        nextQueue.push(loserId);
      }

      // Retain the remaining active participant(s) (e.g. winner)
      nextActivePlayerIds = roundParticipants.filter((id) => id !== loserId);

      // Pull next challenger(s) from front of the queue to seat the next match
      while (
        nextQueue.length > 0 &&
        nextActivePlayerIds.length < targetActiveCount
      ) {
        const nextChallenger = nextQueue.shift();
        if (nextChallenger) {
          nextActivePlayerIds.push(nextChallenger);
        }
      }

      // Check if tournament is complete:
      // The tournament is complete if maxRounds is reached, OR if fewer than 2 players remain in the lobby.
      const availablePlayers = playersRef?.current?.length
        ? playersRef.current
        : players;
      const totalAvailableCount = availablePlayers.length;
      const hasEnoughActivePlayers = totalAvailableCount >= 2;
      const isTournamentOver =
        currentGS.round >= currentGS.maxRounds || !hasEnoughActivePlayers;
      let tournamentWinnerId: string | null = null;

      if (isTournamentOver) {
        if (!hasEnoughActivePlayers && nextActivePlayerIds.length > 0) {
          tournamentWinnerId = nextActivePlayerIds[0];
        } else {
          let maxWins = -1;
          let bestPlayerId: string | null = null;
          let isTie = false;

          Object.entries(nextStandings).forEach(([playerId, wins]) => {
            if (wins > maxWins) {
              maxWins = wins;
              bestPlayerId = playerId;
              isTie = false;
            } else if (wins === maxWins) {
              isTie = true;
            }
          });

          tournamentWinnerId = isTie ? 'TIE' : bestPlayerId;
        }
      }

      let nextGameState: T = {
        ...currentGS,
        status: 'PODIUM',
        tick: currentGS.tick + 1,
        round: isTournamentOver ? currentGS.round : currentGS.round + 1,
        maxRounds: currentGS.maxRounds,
        activePlayerIds: nextActivePlayerIds,
        queue: nextQueue,
        forfeitedPlayerIds,
        winnerId,
        standings: nextStandings,
        tournamentWinnerId,
        isForfeit,
        forfeiterId: matchOptions?.forfeiterId || null,
      };

      if (onResetMatch) {
        const customReset = onResetMatch();
        if (customReset) {
          nextGameState = {...nextGameState, ...customReset};
        }
      }

      gameStateRef.current = nextGameState;
      setGameState(nextGameState);
      setAppScreen('PODIUM');

      console.log(
        `[useTournament] Broadcasting PODIUM STATE_SYNC:`,
        nextGameState,
      );
      lastSentStateRef.current = JSON.parse(JSON.stringify(nextGameState));
      sdk.sendGameEvent({
        type: SyncEventType.STATE_SYNC,
        gameId: gameIdRef.current,
        lobbyId: lobbyIdRef.current,
        round: nextGameState.round,
        tick: nextGameState.tick,
        payload: JSON.stringify({...nextGameState, _full: true}),
      });
    },
    [sdk, onResetMatch, setAppScreen],
  );
  useEffect(() => {
    hostEndMatchRef.current = hostEndMatch;
  }, [hostEndMatch]);

  // ==========================================
  // 4. TOURNAMENT RESTART & LOBBY MANAGEMENT
  // ==========================================
  const restartTournament = useCallback(() => {
    if (!isHostRef.current || !sdk) return;

    roundActivePlayerIdsRef.current = [];

    let resetGameState: T = {
      ...(initialCustomState as any),
      status: 'LOBBY',
      tick: gameStateRef.current.tick + 1,
      round: 1,
      maxRounds: gameStateRef.current.maxRounds,
      activePlayerIds: [],
      queue: [],
      forfeitedPlayerIds: [],
      scores: {},
      winnerId: null,
      standings: {},
      tournamentWinnerId: null,
      isForfeit: false,
      forfeiterId: null,
    };

    if (onResetMatch) {
      const customReset = onResetMatch();
      if (customReset) {
        resetGameState = {...resetGameState, ...customReset};
      }
    }

    gameStateRef.current = resetGameState;
    setGameState(resetGameState);
    setAppScreen('LOBBY');

    console.log(
      '[useTournament] Broadcasting LOBBY_SYNC restart:',
      resetGameState,
    );
    lastSentStateRef.current = JSON.parse(JSON.stringify(resetGameState));
    sdk.sendGameEvent({
      type: 'LOBBY_SYNC',
      gameId: gameIdRef.current,
      lobbyId: lobbyIdRef.current,
      payload: JSON.stringify(resetGameState),
    });
  }, [sdk, initialCustomState, onResetMatch, setAppScreen]);

  const endLobby = useCallback(() => {
    if (sdk && lobbyIdRef.current && myPlayerIdRef.current) {
      sdk.updatePlayerPresence(lobbyIdRef.current, 'LEAVE');
    }
    setAppScreen('BOOT');
  }, [sdk, setAppScreen]);

  const returnToLobby = useCallback(() => {
    setAppScreen('LOBBY');
  }, [setAppScreen]);

  const handleForfeit = useCallback(() => {
    const myId = myPlayerIdRef.current;
    if (!myId) return;

    if (isHostRef.current) {
      const currentGS = gameStateRef.current;
      if (currentGS.status !== 'PLAYING') return;

      const remainingActive = currentGS.activePlayerIds.filter(
        (id) => id !== myId,
      );

      if (onForfeit) {
        const forfeitPatch = onForfeit(myId, remainingActive, currentGS);
        if (forfeitPatch) {
          const patched = {...currentGS, ...forfeitPatch};
          gameStateRef.current = patched;
          setGameState(patched);
        }
      }

      let winner: string | null = null;
      if (remainingActive.length === 1) {
        winner = remainingActive[0];
      } else if (remainingActive.length > 1) {
        let maxScore = -Infinity;
        let isTie = false;
        for (const id of remainingActive) {
          const s = currentGS.scores?.[id] ?? 0;
          if (s > maxScore) {
            maxScore = s;
            winner = id;
            isTie = false;
          } else if (s === maxScore) {
            isTie = true;
          }
        }
        if (isTie) winner = null;
      }

      hostEndMatchRef.current?.(winner, {
        isForfeit: true,
        forfeiterId: myId,
      });
    } else {
      if (sdk && lobbyIdRef.current) {
        sdk.sendGameEvent({
          type: 'FORFEIT_MATCH',
          gameId: gameIdRef.current,
          lobbyId: lobbyIdRef.current,
          payload: JSON.stringify({senderId: myId}),
        });
      }
    }
  }, [sdk, onForfeit]);

  // ==========================================
  // 5. INCOMING NETWORK EVENT DISPATCHER
  // ==========================================
  const handleTournamentEvent = useCallback(
    (event: any) => {
      console.log(
        '[useTournament] handleTournamentEvent received:',
        event.type,
      );
      let payload: any = {};
      try {
        payload = JSON.parse(event.payload);
      } catch (e) {}
      const senderId = event.from || payload.senderId;

      if (isHostRef.current) {
        if (event.type === 'REQUEST_SYNC' && sdk && lobbyIdRef.current) {
          const latest = gameStateRef.current;
          sdk.sendGameEvent({
            type: SyncEventType.STATE_SYNC,
            gameId: gameIdRef.current,
            lobbyId: lobbyIdRef.current,
            round: latest.round,
            tick: latest.tick,
            payload: JSON.stringify({...latest, _full: true}),
          });
          return;
        }
        if (event.type === 'FORFEIT_MATCH' && senderId) {
          const currentGS = gameStateRef.current;
          if (currentGS.status === 'PLAYING') {
            if (currentGS.activePlayerIds.includes(senderId)) {
              const remainingActive = currentGS.activePlayerIds.filter(
                (id) => id !== senderId,
              );
              if (onForfeit) {
                const forfeitPatch = onForfeit(
                  senderId,
                  remainingActive,
                  currentGS,
                );
                if (forfeitPatch) {
                  const patched = {...currentGS, ...forfeitPatch};
                  gameStateRef.current = patched;
                  setGameState(patched);
                }
              }
              let winner: string | null = null;
              if (remainingActive.length === 1) {
                winner = remainingActive[0];
              } else if (remainingActive.length > 1) {
                let maxScore = -Infinity;
                let isTie = false;
                for (const id of remainingActive) {
                  const s = currentGS.scores?.[id] ?? 0;
                  if (s > maxScore) {
                    maxScore = s;
                    winner = id;
                    isTie = false;
                  } else if (s === maxScore) {
                    isTie = true;
                  }
                }
                if (isTie) winner = null;
              }
              hostEndMatchRef.current?.(winner, {
                isForfeit: true,
                forfeiterId: senderId,
              });
            }
          }
          return;
        }
      } else {
        if (event.type === SyncEventType.STATE_SYNC) {
          // Discard out-of-order packets
          if (payload.tick < gameStateRef.current.tick) {
            console.warn(
              `[useTournament] Dropping out-of-order STATE_SYNC: ${payload.tick} < ${gameStateRef.current.tick}`,
            );
            return;
          }

          let nextState: T;
          if (payload._full) {
            const {_full, ...cleanState} = payload;
            nextState = cleanState as T;
          } else {
            nextState = mergeGameStateDiff(gameStateRef.current, payload);
          }

          const prevState = gameStateRef.current;
          gameStateRef.current = nextState;
          setGameState(nextState);

          if (onStateSyncRef.current) {
            onStateSyncRef.current(payload, prevState);
          }

          // Map game status to UI screen
          if (payload.status) {
            let targetScreen: 'LOBBY' | 'PLAYING' | 'PODIUM' | null = null;
            if (payload.status === 'LOBBY') {
              targetScreen = 'LOBBY';
            } else if (payload.status === 'PLAYING') {
              targetScreen = 'PLAYING';
            } else if (payload.status === 'PODIUM') {
              targetScreen = 'PODIUM';
            }

            if (targetScreen && appScreenRef.current !== targetScreen) {
              console.log(
                `[useTournament] Transitioning appScreen to ${targetScreen} on STATE_SYNC`,
              );
              setAppScreen(targetScreen);
            }
          }
          return;
        } else if (event.type === 'LOBBY_CONFIG_SYNC') {
          setCustomRounds(payload.customRounds);
          return;
        } else if (event.type === 'LOBBY_SYNC') {
          gameStateRef.current = payload;
          setGameState(payload);
          setAppScreen('LOBBY');
          return;
        }
      }

      // Delegate any remaining custom events (e.g. INPUT_SYNC, WEBRTC_STATS) to client handler
      if (onCustomGameEventRef.current) {
        onCustomGameEventRef.current(event, payload, senderId);
      }
    },
    [onForfeit, setAppScreen],
  );

  // Hook up event dispatcher to SDK via onGameEventRef if provided
  useEffect(() => {
    if (onGameEventRef) {
      onGameEventRef.current = handleTournamentEvent;
    }
  }, [handleTournamentEvent, onGameEventRef]);

  return {
    gameState,
    setGameState,
    gameStateRef,
    lastSentStateRef,
    customRounds,
    setCustomRounds,
    getDefaultRounds,
    commenceTournament,
    startNextRound,
    hostEndMatch,
    restartTournament,
    endLobby,
    returnToLobby,
    handleForfeit,
    handleTournamentEvent,
  };
}
