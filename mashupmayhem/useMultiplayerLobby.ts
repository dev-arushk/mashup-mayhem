// tslint:disable
/* eslint-disable */
import {useCallback, useEffect, useRef, useState} from 'react';
import {GAME_ID} from './constants';
import {usePlaygroundMultiplayer} from './usePlaygroundMultiplayer';

/**
 * @fileoverview Hook for managing Playground SDK and cross-device multiplayer matchmaking & lobby lifecycle.
 * Encapsulates SDK initialization, public room discovery / joinOrCreate matchmaking,
 * direct room-code / invite-link joining, player presence events, and local player identification.
 */

export interface Player {
  playerId: string;
  name?: string;
  displayName?: string;
  isHost?: boolean;
  is_host?: boolean;
  isCurrentPlayer?: boolean;
  is_current_player?: boolean;
  avatarUrl?: string;
}

export type MatchmakingState =
  | 'IDLE'
  | 'SEARCHING'
  | 'WAITING'
  | 'PAIRED'
  | 'ERROR';

export interface UseMultiplayerLobbyOptions {
  onGameEvent?: (event: any) => void;
  onLobbyJoined?: (lobbyId: string, players: Player[], isHost: boolean) => void;
}

function getTargetLobbyFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('lobbyId') || params.get('room');
    return code && code.trim().length > 0 ? code.trim() : null;
  } catch {
    return null;
  }
}

function pickBestPublicRoom(
  rooms: any[],
  modeId?: string,
): {lobbyId: string; mode?: string} | null {
  if (!Array.isArray(rooms) || rooms.length === 0) return null;
  const openRooms = rooms.filter((r) => {
    if (!r || !r.lobbyId) return false;
    const maxP = r.maxPlayers || 4;
    const count = Array.isArray(r.players)
      ? r.players.length
      : typeof r.playerCount === 'number'
        ? r.playerCount
        : 1;
    const state = String(r.state || r.status || 'WAITING_FOR_PLAYERS').toUpperCase();
    const isWaiting =
      state.includes('WAIT') || state === 'OPEN' || state === 'LOBBY';
    const isPublic = r.isPublic !== false;
    return isWaiting && isPublic && count < maxP;
  });

  if (openRooms.length === 0) return null;
  if (modeId) {
    const exactMode = openRooms.find((r) => r.mode === modeId || r.metadata?.mode === modeId);
    if (exactMode) return exactMode;
  }
  return openRooms[0];
}

export function useMultiplayerLobby(options?: UseMultiplayerLobbyOptions) {
  const {sdk, isReady, onGameEventRef, onPresenceEventRef, onLobbyStatusRef} =
    usePlaygroundMultiplayer();

  // Connection State
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [networkStatus, setNetworkStatus] = useState('INIT'); // INIT, CONNECTING, CONNECTED, ERROR
  const [matchmakingState, setMatchmakingState] =
    useState<MatchmakingState>('IDLE');
  const [matchmakingMessage, setMatchmakingMessage] = useState<string>(
    'Connecting to online studio...',
  );

  // Stable references for high-frequency loops & async event listeners
  const lobbyIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const myPlayerIdRef = useRef<string | null>(null);
  const playersRef = useRef<Player[]>([]);
  const searchSessionRef = useRef(0);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const onGameEventCallbackRef = useRef(options?.onGameEvent);
  useEffect(() => {
    onGameEventCallbackRef.current = options?.onGameEvent;
  }, [options?.onGameEvent]);

  const onLobbyJoinedRef = useRef(options?.onLobbyJoined);
  useEffect(() => {
    onLobbyJoinedRef.current = options?.onLobbyJoined;
  }, [options?.onLobbyJoined]);

  // Refresh lobby participants & local player status
  const refreshLobbyData = useCallback(
    (targetLobbyId?: string) => {
      const activeLobbyId = targetLobbyId || lobbyIdRef.current;
      if (!sdk || !activeLobbyId) return;
      sdk.getLobby((info: any) => {
        if (!info?.players) return;
        setPlayers(info.players);

        const local = info.players.find(
          (p: any) => p.is_current_player || p.isCurrentPlayer,
        );
        if (local) {
          setMyPlayerId(local.playerId);
          const host = !!(local.is_host || local.isHost);
          setIsHost(host);
          setNetworkStatus(`CONNECTED ${host ? '(Host)' : '(Client)'}`);
          const activeHumans = info.players.filter(
            (p: any) => !String(p.displayName || '').includes('Waiting'),
          );
          if (activeHumans.length >= 2) {
            setMatchmakingState('PAIRED');
            setMatchmakingMessage(
              `${activeHumans.length} Online Players Connected!`,
            );
          } else {
            setMatchmakingState('WAITING');
            setMatchmakingMessage(
              host
                ? 'Waiting for online players (or invite via room code)...'
                : 'Connected to Host! Waiting for showtime...',
            );
          }
          onLobbyJoinedRef.current?.(activeLobbyId, info.players, host);
        }
      }, activeLobbyId);
    },
    [sdk],
  );

  const finalizeJoinedLobby = useCallback(
    (info: any) => {
      if (!sdk || !info?.lobbyId) return false;
      lobbyIdRef.current = info.lobbyId;
      setLobbyId(info.lobbyId);
      try {
        sdk.updatePlayerPresence(info.lobbyId, 'JOIN');
      } catch {
        // Ignore if presence call signature differs
      }
      refreshLobbyData(info.lobbyId);
      return true;
    },
    [sdk, refreshLobbyData],
  );

  // Join an explicit lobby ID across devices (via invite link or room code)
  const joinLobbyByCode = useCallback(
    (rawCode: string): Promise<boolean> => {
      const code = rawCode.trim();
      if (!sdk || !code) return Promise.resolve(false);
      const session = ++searchSessionRef.current;
      setMatchmakingState('SEARCHING');
      setMatchmakingMessage(`Joining room ${code}...`);
      setNetworkStatus('CONNECTING');

      return new Promise<boolean>((resolve) => {
        const handleInfo = (info: any) => {
          if (session !== searchSessionRef.current) {
            resolve(false);
            return;
          }
          if (info?.lobbyId) {
            finalizeJoinedLobby(info);
            resolve(true);
          } else {
            setMatchmakingState('ERROR');
            setMatchmakingMessage(`Room "${code}" not found or full.`);
            resolve(false);
          }
        };

        try {
          if (typeof sdk.joinLobby === 'function') {
            sdk.joinLobby(code, handleInfo);
          } else {
            sdk.getLobby(handleInfo, code);
          }
        } catch {
          setMatchmakingState('ERROR');
          setMatchmakingMessage(`Could not connect to room "${code}".`);
          resolve(false);
        }
      });
    },
    [sdk, finalizeJoinedLobby],
  );

  // Create a fresh discoverable public room
  const createPublicRoom = useCallback(
    (modeId?: string): Promise<boolean> => {
      if (!sdk) return Promise.resolve(false);
      const session = ++searchSessionRef.current;
      setMatchmakingState('SEARCHING');
      setMatchmakingMessage('Creating public studio room...');
      setNetworkStatus('CONNECTING');

      return new Promise<boolean>((resolve) => {
        const onCreated = (info: any) => {
          if (session !== searchSessionRef.current) {
            resolve(false);
            return;
          }
          if (info?.lobbyId) {
            finalizeJoinedLobby(info);
            resolve(true);
          } else {
            setNetworkStatus('ERROR');
            setMatchmakingState('ERROR');
            setMatchmakingMessage('Unable to create room. Retrying...');
            resolve(false);
          }
        };

        try {
          // Support SDKs accepting metadata options or callback-only createLobby(cb)
          if (sdk.createLobby.length >= 2) {
            sdk.createLobby(
              {
                gameId: GAME_ID,
                mode: modeId || 'CLASSIC',
                isPublic: true,
                maxPlayers: 4,
              },
              onCreated,
            );
          } else {
            sdk.createLobby(onCreated);
          }
        } catch {
          try {
            sdk.createLobby(onCreated);
          } catch {
            setNetworkStatus('ERROR');
            setMatchmakingState('ERROR');
            resolve(false);
          }
        }
      });
    },
    [sdk, finalizeJoinedLobby],
  );

  // Cross-Device Quick Match: checks public rooms / joinOrCreate before creating a new room
  const quickMatch = useCallback(
    async (modeId?: string): Promise<boolean> => {
      if (!sdk) return false;
      const session = ++searchSessionRef.current;
      setNetworkStatus('CONNECTING');
      setMatchmakingState('SEARCHING');
      setMatchmakingMessage('Searching for open online rooms...');

      // 1. Direct invite link (?lobbyId=xxx or ?room=xxx) takes priority
      const urlCode = getTargetLobbyFromUrl();
      if (urlCode) {
        const ok = await joinLobbyByCode(urlCode);
        if (ok) return true;
      }

      // 2. Native SDK joinOrCreate if available
      if (typeof sdk.joinOrCreate === 'function') {
        const joined = await new Promise<boolean>((resolve) => {
          const tid = setTimeout(() => resolve(false), 2500);
          try {
            sdk.joinOrCreate(
              {
                gameId: GAME_ID,
                mode: modeId || 'CLASSIC',
                isPublic: true,
                maxPlayers: 4,
              },
              (info: any) => {
                clearTimeout(tid);
                if (session === searchSessionRef.current && info?.lobbyId) {
                  finalizeJoinedLobby(info);
                  resolve(true);
                } else {
                  resolve(false);
                }
              },
            );
          } catch {
            clearTimeout(tid);
            resolve(false);
          }
        });
        if (joined) return true;
      }

      // 3. Query open public rooms (listRooms / getPublicRooms / findLobby)
      const listMethod =
        typeof sdk.listRooms === 'function'
          ? sdk.listRooms.bind(sdk)
          : typeof sdk.getPublicRooms === 'function'
            ? sdk.getPublicRooms.bind(sdk)
            : typeof sdk.findLobby === 'function'
              ? sdk.findLobby.bind(sdk)
              : null;

      if (listMethod) {
        const foundRoom = await new Promise<{lobbyId: string} | null>(
          (resolve) => {
            const tid = setTimeout(() => resolve(null), 2000);
            try {
              const handleList = (res: any) => {
                clearTimeout(tid);
                const rooms = Array.isArray(res)
                  ? res
                  : Array.isArray(res?.rooms)
                    ? res.rooms
                    : Array.isArray(res?.lobbies)
                      ? res.lobbies
                      : [];
                resolve(pickBestPublicRoom(rooms, modeId));
              };
              if (listMethod.length >= 2) {
                listMethod({gameId: GAME_ID, mode: modeId}, handleList);
              } else {
                listMethod(handleList);
              }
            } catch {
              clearTimeout(tid);
              resolve(null);
            }
          },
        );

        if (foundRoom?.lobbyId && session === searchSessionRef.current) {
          setMatchmakingMessage('Found an online room! Pairing...');
          const ok = await joinLobbyByCode(foundRoom.lobbyId);
          if (ok) return true;
        }
      }

      // 4. Standard Playground SDK discovery polling (getLobby -> createLobby fallback)
      return new Promise<boolean>((resolve) => {
        let attempts = 0;
        const maxAttempts = 4;

        const tryDiscover = () => {
          if (session !== searchSessionRef.current) {
            resolve(false);
            return;
          }
          attempts++;
          const tid = setTimeout(() => {
            if (attempts < maxAttempts) {
              tryDiscover();
            } else {
              createPublicRoom(modeId).then(resolve);
            }
          }, 1200);

          try {
            sdk.getLobby((info: any) => {
              clearTimeout(tid);
              if (session !== searchSessionRef.current) {
                resolve(false);
                return;
              }
              if (info?.lobbyId) {
                finalizeJoinedLobby(info);
                resolve(true);
              } else if (attempts < maxAttempts) {
                setTimeout(tryDiscover, 550);
              } else {
                createPublicRoom(modeId).then(resolve);
              }
            });
          } catch {
            clearTimeout(tid);
            if (attempts < maxAttempts) {
              setTimeout(tryDiscover, 550);
            } else {
              createPublicRoom(modeId).then(resolve);
            }
          }
        };

        tryDiscover();
      });
    },
    [sdk, joinLobbyByCode, finalizeJoinedLobby, createPublicRoom],
  );

  // Automatic initial discovery & pairing on SDK readiness
  useEffect(() => {
    if (!sdk || !isReady) return;
    const tid = setTimeout(() => {
      quickMatch();
    }, 120);
    return () => clearTimeout(tid);
  }, [sdk, isReady]);

  // Hook up event callbacks to SDK
  const handlePresenceEvent = useCallback(() => {
    if (lobbyIdRef.current) refreshLobbyData(lobbyIdRef.current);
  }, [refreshLobbyData]);

  const handleLobbyStatus = useCallback((status: any) => {
    console.log('[useMultiplayerLobby] Lobby status event:', status);
  }, []);

  useEffect(() => {
    onPresenceEventRef.current = handlePresenceEvent;
    onLobbyStatusRef.current = handleLobbyStatus;
  }, [
    handlePresenceEvent,
    handleLobbyStatus,
    onPresenceEventRef,
    onLobbyStatusRef,
  ]);

  useEffect(() => {
    if (options?.onGameEvent) {
      onGameEventRef.current = (event: any) => {
        onGameEventCallbackRef.current?.(event);
      };
    }
  }, [options?.onGameEvent, onGameEventRef]);

  // Player Name Resolver Helper
  const getPlayerName = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return 'Waiting...';
      const player = players.find((p) => p.playerId === id);
      return player
        ? player.displayName || player.name || id.substring(0, 5)
        : 'Waiting...';
    },
    [players],
  );

  const getShareUrl = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      if (lobbyId) url.searchParams.set('lobbyId', lobbyId);
      return url.toString();
    } catch {
      return '';
    }
  }, [lobbyId]);

  return {
    sdk,
    isSdkReady: isReady,
    lobbyId,
    lobbyIdRef,
    isHost,
    isHostRef,
    myPlayerId,
    myPlayerIdRef,
    players,
    playersRef,
    networkStatus,
    setNetworkStatus,
    matchmakingState,
    matchmakingMessage,
    quickMatch,
    joinLobbyByCode,
    createPublicRoom,
    getShareUrl,
    refreshLobbyData,
    getPlayerName,
    onGameEventRef,
  };
}
