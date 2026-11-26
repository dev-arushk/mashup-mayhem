/**
 * Types of high-frequency synchronization events that bypass DOM broadcast.
 */
export enum SyncEventType {
  STATE_SYNC = 'STATE_SYNC',
  INPUT_SYNC = 'INPUT_SYNC',
  WEBRTC_STATS = 'WEBRTC_STATS',
  LOBBY_CONFIG_SYNC = 'LOBBY_CONFIG_SYNC',
  LOBBY_SYNC = 'LOBBY_SYNC',
  FORFEIT_MATCH = 'FORFEIT_MATCH',
}

/**
 * Base interface for all players in the game.
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

/**
 * Base interface for the tournament game state.
 */
export interface BaseTournamentGameState {
  status: 'LOBBY' | 'PLAYING' | 'PODIUM';
  tick: number; // State version counter. Increments ONLY on state updates. DO NOT use for game timing/delays.
  round: number;
  maxRounds: number;
  activePlayerIds: string[];
  queue: string[];
  forfeitedPlayerIds?: string[];
  scores: Record<string, number>; // { playerId: score }
  winnerId: string | null;
  standings: Record<string, number>; // { playerId: wins }
  tournamentWinnerId?: string | null;
  isForfeit?: boolean;
  forfeiterId?: string | null;
  _full?: boolean;
}
