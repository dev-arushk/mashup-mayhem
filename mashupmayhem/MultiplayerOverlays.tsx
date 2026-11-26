// tslint:disable
/* eslint-disable */
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {AVATAR_CATALOG} from './contentLibrary';
import {Player} from './useMultiplayerLobby';
import {useModalDialog, useOverlayFocusNavigation} from './utils/helper';

function ModalDialog({
  children,
  className,
  debugHud,
}: {
  children: React.ReactNode;
  className: string;
  debugHud?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackTitleId = useId();
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  useModalDialog(dialogRef);
  useOverlayFocusNavigation(dialogRef, true);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const heading = dialog.querySelector<HTMLElement>(
      'h1, h2, h3, [role="heading"]',
    );
    if (heading && heading.textContent?.trim()) {
      if (!heading.id) {
        heading.id = fallbackTitleId;
      }
      setTitleId(heading.id);
    } else {
      setTitleId(undefined);
    }
  }, [fallbackTitleId]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : 'Game dialog'}
      data-overlay-container=""
      data-playground-modal="true"
      className={`fixed inset-0 z-50 m-0 p-0 max-w-none max-h-none w-full h-full border-0 text-inherit backdrop:bg-transparent overflow-y-auto touch-auto ${className}`}>
      {debugHud}
      <div className="min-h-full w-full flex flex-col items-center p-3 sm:p-4">
        <div className="m-auto w-full flex flex-col items-center">
          {children}
        </div>
      </div>
    </dialog>
  );
}

interface CustomWindow extends Window {
  __PLAYGROUND_DEBUG__?: (show: boolean) => void;
}

export interface MultiplayerGameState {
  status: 'LOBBY' | 'PLAYING' | 'PODIUM';
  tick: number;
  round: number;
  maxRounds: number;
  activePlayerIds: string[];
  queue: string[];
  forfeitedPlayerIds?: string[];
  scores?: Record<string, number>;
  winnerId: string | null;
  standings: Record<string, number>;
  tournamentWinnerId?: string | null;
  isForfeit?: boolean;
  forfeiterId?: string | null;
  [key: string]: any;
}

export interface MultiplayerOverlaysProps {
  appScreen: 'BOOT' | 'TUTORIAL' | 'LOBBY' | 'PLAYING' | 'PODIUM';
  gameState: MultiplayerGameState;
  players: Player[];
  myPlayerId: string | null;
  isHost: boolean;
  networkStatus?: string;
  customRounds: number | null;
  defaultRounds: number;
  onSetCustomRounds: (
    rounds: number | ((prev: number | null) => number),
  ) => void;
  onCommenceTournament: () => void;
  onStartNextRound: () => void;
  onRestartTournament: () => void;
  onReturnToLobby?: () => void;
  onEndLobby: () => void;
  onForfeit: () => void;
  getPlayerName: (id: string | null | undefined) => string;

  // Modal Visibility State & Handlers
  showDebugHud?: boolean;
  setShowDebugHud?: React.Dispatch<React.SetStateAction<boolean>>;
  showInGameMenu?: boolean;
  setShowInGameMenu?: React.Dispatch<React.SetStateAction<boolean>>;
  showHowToPlay?: boolean;
  setShowHowToPlay?: React.Dispatch<React.SetStateAction<boolean>>;
  showForfeitModal?: boolean;
  setShowForfeitModal?: React.Dispatch<React.SetStateAction<boolean>>;

  // Performance & WebRTC HUD Metrics
  hudMetrics?: {
    fps?: number;
    lowFps?: number;
    jitter?: number;
    rtt?: number;
    packetLoss?: number;
    heapUsed?: number;
  };

  // Custom UI Text & Elements
  gameTitle?: string;
  subtitle?: string;
  howToPlayRules?: string[];
  howToPlayContent?: React.ReactNode;
  forfeitModalText?: string;
  topBarRightContent?: React.ReactNode;

  // Mashup Mayhem Extensions
  lobbyExtraContent?: React.ReactNode;
  lobbyActionsExtra?: React.ReactNode;
  podiumExtraContent?: React.ReactNode;
  playerAvatars?: Record<string, string>;
  sfxMuted?: boolean;
  onToggleSfx?: () => void;
  musicMuted?: boolean;
  onToggleMusic?: () => void;
  hideTopBar?: boolean;
  onOpenInteractiveTutorial?: () => void;
  hasCompletedTutorial?: boolean;
  onOpenLeaderboard?: () => void;
  lobbyTopRightSlot?: React.ReactNode;
  readyPlayerIds?: string[];
  onToggleReady?: () => void;
}

const COMIC_CARD =
  'bg-[#241645] border-[3px] border-[#1A1336] shadow-[0_6px_0_#1A1336] rounded-2xl text-[#FFF8EC]';

export function MultiplayerOverlays({
  appScreen,
  gameState,
  players,
  myPlayerId,
  isHost,
  networkStatus,
  customRounds,
  defaultRounds,
  onSetCustomRounds,
  onCommenceTournament,
  onStartNextRound,
  onRestartTournament,
  onReturnToLobby,
  onEndLobby,
  onForfeit,
  getPlayerName,
  showDebugHud: controlledShowDebugHud,
  setShowDebugHud: controlledSetShowDebugHud,
  showInGameMenu: controlledShowInGameMenu,
  setShowInGameMenu: controlledSetShowInGameMenu,
  showHowToPlay: controlledShowHowToPlay,
  setShowHowToPlay: controlledSetShowHowToPlay,
  showForfeitModal: controlledShowForfeitModal,
  setShowForfeitModal: controlledSetShowForfeitModal,
  hudMetrics,
  gameTitle,
  subtitle,
  howToPlayRules,
  howToPlayContent,
  forfeitModalText,
  topBarRightContent,
  lobbyExtraContent,
  lobbyActionsExtra,
  podiumExtraContent,
  playerAvatars,
  sfxMuted,
  onToggleSfx,
  musicMuted,
  onToggleMusic,
  hideTopBar,
  onOpenInteractiveTutorial,
  hasCompletedTutorial,
  onOpenLeaderboard,
  lobbyTopRightSlot,
  readyPlayerIds,
  onToggleReady,
}: MultiplayerOverlaysProps) {
  const [internalShowDebugHud, setInternalShowDebugHud] = useState(false);
  const [internalShowInGameMenu, setInternalShowInGameMenu] = useState(false);
  const [internalShowHowToPlay, setInternalShowHowToPlay] = useState(false);
  const [internalShowForfeitModal, setInternalShowForfeitModal] =
    useState(false);

  const showDebugHud =
    controlledShowDebugHud !== undefined
      ? controlledShowDebugHud
      : internalShowDebugHud;
  const setShowDebugHud = controlledSetShowDebugHud || setInternalShowDebugHud;

  const showInGameMenu =
    controlledShowInGameMenu !== undefined
      ? controlledShowInGameMenu
      : internalShowInGameMenu;
  const setShowInGameMenu =
    controlledSetShowInGameMenu || setInternalShowInGameMenu;

  const showHowToPlay =
    controlledShowHowToPlay !== undefined
      ? controlledShowHowToPlay
      : internalShowHowToPlay;
  const setShowHowToPlay =
    controlledSetShowHowToPlay || setInternalShowHowToPlay;

  const showForfeitModal =
    controlledShowForfeitModal !== undefined
      ? controlledShowForfeitModal
      : internalShowForfeitModal;
  const setShowForfeitModal =
    controlledSetShowForfeitModal || setInternalShowForfeitModal;

  useEffect(() => {
    if (appScreen !== 'PLAYING') {
      setShowInGameMenu(false);
      setShowHowToPlay(false);
      setShowForfeitModal(false);
    }
  }, [appScreen, setShowInGameMenu, setShowHowToPlay, setShowForfeitModal]);

  useEffect(() => {
    if (controlledSetShowDebugHud) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        setShowDebugHud((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlledSetShowDebugHud, setShowDebugHud]);

  useEffect(() => {
    (window as CustomWindow).__PLAYGROUND_DEBUG__ = (show: boolean) => {
      setShowDebugHud(show);
    };
  }, [setShowDebugHud]);

  const effectiveRounds = customRounds !== null ? customRounds : defaultRounds;

  const isForfeited =
    !!myPlayerId &&
    ((gameState.isForfeit && gameState.forfeiterId === myPlayerId) ||
      !!gameState.forfeitedPlayerIds?.includes(myPlayerId));

  const isSpectating =
    appScreen === 'PLAYING' &&
    gameState.status === 'PLAYING' &&
    !!myPlayerId &&
    !gameState.activePlayerIds.includes(myPlayerId);

  const activeModal = showForfeitModal
    ? 'FORFEIT'
    : showHowToPlay
      ? 'HOW_TO_PLAY'
      : showInGameMenu
        ? 'MENU'
        : appScreen === 'PODIUM'
          ? 'PODIUM'
          : appScreen === 'LOBBY'
            ? 'LOBBY'
            : null;

  const debugHudNode = showDebugHud ? (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(26, 19, 54, 0.94)',
        color: '#2CEAA3',
        padding: '10px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        pointerEvents: 'none',
        border: '2px solid #2CEAA3',
        boxShadow: '0 4px 0 #1A1336',
      }}>
      <div style={{fontWeight: 'bold', marginBottom: '5px'}}>DEBUG HUD</div>
      <div>
        FPS: {hudMetrics?.fps ?? 0} (1% low: {hudMetrics?.lowFps ?? 0})
      </div>
      <div>Jitter: {hudMetrics?.jitter ?? 0} ms</div>
      <div>Heap: {hudMetrics?.heapUsed ?? 0} MB</div>
      <div style={{margin: '5px 0', borderTop: '1px solid #3c2b6e'}} />
      <div>RTT: {hudMetrics?.rtt ?? 0} ms</div>
      <div>Loss: {hudMetrics?.packetLoss ?? 0}%</div>
    </div>
  ) : null;

  const getAvatarImage = (playerId: string) => {
    const id = playerAvatars?.[playerId];
    return (
      AVATAR_CATALOG.find((a) => a.id === id)?.imagePath ||
      AVATAR_CATALOG[0].imagePath
    );
  };

  return (
    <>
      {/* ==========================================
       * 1. TOP-LEFT NETWORK STATUS
       * ========================================== */}
      {!hideTopBar && networkStatus && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#1A1336]/90 px-3 py-1.5 rounded-full border-2 border-[#FFD13B]/40 text-xs text-[#FFF8EC] z-30 pointer-events-none">
          <span
            className={`w-2 h-2 rounded-full ${
              networkStatus.includes('CONNECTED')
                ? 'bg-[#2CEAA3]'
                : 'bg-[#FFD13B] animate-pulse'
            }`}
          />
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold">
            {networkStatus}
          </span>
        </div>
      )}

      {/* ==========================================
       * 2. TOP-RIGHT IN-GAME ACTION BAR (Forfeit & Menu)
       * ========================================== */}
      {!hideTopBar && appScreen === 'PLAYING' && (
        <div className="absolute top-2.5 right-3 flex items-center gap-2 z-30">
          {topBarRightContent}

          {gameState.activePlayerIds.includes(myPlayerId || '') && (
            <button
              onClick={() => setShowForfeitModal(true)}
              className="bg-[#FF4D79] hover:bg-[#ff668b] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-[#1A1336] px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-transform active:translate-y-0.5 cursor-pointer flex items-center gap-1 min-h-[36px]">
              <span>🏳️</span>
              <span>Forfeit</span>
            </button>
          )}

          <button
            aria-label="Open Game Menu"
            onClick={() => setShowInGameMenu(true)}
            className="bg-[#FFD13B] hover:bg-[#ffe066] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-[#1A1336] px-3 h-9 rounded-full flex items-center justify-center text-xs font-black uppercase tracking-wider transition-transform active:translate-y-0.5 cursor-pointer">
            ≡ Menu
          </button>
        </div>
      )}

      {/* ==========================================
       * 3. LOBBY SCREEN OVERLAY
       * ========================================== */}
      {appScreen === 'LOBBY' && (
        <ModalDialog
          className="bg-[#1B113A]/85 backdrop-blur-sm animate-in fade-in duration-150"
          debugHud={activeModal === 'LOBBY' ? debugHudNode : null}>
          <div
            className={`${COMIC_CARD} p-4 sm:p-6 w-full max-w-2xl text-center space-y-4 mb-6`}>
            {/* Top Main Hub Header Bar: Left Studio/Tutorial/Leaderboard + Top-Right Sign in or Account Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#1A1336]">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD13B] text-[#1A1336] border-2 border-[#1A1336] text-[11px] font-black uppercase tracking-wider">
                  <span>🎙️</span>
                  <span>{subtitle || 'AK Productions'}</span>
                </div>
                {onOpenInteractiveTutorial && (
                  <button
                    type="button"
                    onClick={onOpenInteractiveTutorial}
                    data-testid="hub-tutorial-button"
                    aria-label="Open interactive 4-step tutorial"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_2px_0_#1A1336] text-[11px] font-black uppercase tracking-wider cursor-pointer active:translate-y-0.5 transition-transform">
                    <span aria-hidden="true">🎓</span>
                    <span>Tutorial</span>
                    {!hasCompletedTutorial && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FF4D79] text-[#FFF8EC] border border-[#1A1336] text-[9px] font-black">
                        4-Step
                      </span>
                    )}
                  </button>
                )}
                {onOpenLeaderboard && (
                  <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    data-testid="hub-leaderboard-button"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#38E8FF] hover:bg-[#6ef0ff] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_2px_0_#1A1336] text-[11px] font-black uppercase tracking-wider cursor-pointer active:translate-y-0.5 transition-transform">
                    <span>🏆</span>
                    <span>Global Leaderboard</span>
                  </button>
                )}
              </div>

              {lobbyTopRightSlot && (
                <div className="ml-auto flex items-center shrink-0">
                  {lobbyTopRightSlot}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <h1
                className="text-3xl sm:text-4xl font-black tracking-wide uppercase text-[#FFD13B]"
                style={{
                  textShadow: '3px 3px 0 #1A1336',
                  fontFamily: "'Fredoka', 'Nunito', sans-serif",
                }}>
                {gameTitle || 'Mashup Mayhem'}
              </h1>
              <p className="text-xs text-[#FFF8EC]/80 font-bold">
                Combine bizarre objects to survive outrageous situations &amp; win
                the studio vote!
              </p>
            </div>

            {lobbyExtraContent}

            {/* Player Roster & Rounds Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="bg-[#1A1336]/60 border-2 border-[#1A1336] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] uppercase font-black text-[#2CEAA3] tracking-wider">
                  <span>Contestants ({players.length})</span>
                  {onToggleReady ? (
                    <button
                      onClick={onToggleReady}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#1A1336] cursor-pointer ${
                        myPlayerId && readyPlayerIds?.includes(myPlayerId)
                          ? 'bg-[#2CEAA3] text-[#1A1336]'
                          : 'bg-[#FFD13B] text-[#1A1336]'
                      }`}>
                      {myPlayerId && readyPlayerIds?.includes(myPlayerId)
                        ? '✓ Ready'
                        : 'Tap Ready'}
                    </button>
                  ) : (
                    <span className="text-[#FFF8EC]/60">Ready</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {players.map((p, idx) => {
                    const isReady = readyPlayerIds
                      ? readyPlayerIds.includes(p.playerId)
                      : true;
                    return (
                      <div
                        key={p.playerId}
                        className="flex justify-between items-center bg-[#2E1E59] border-2 border-[#1A1336] px-2.5 py-1.5 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getAvatarImage(p.playerId)}
                            alt=""
                            className="w-7 h-7 object-contain rounded-lg bg-[#1A1336]/50 p-0.5 shrink-0"
                          />
                          <span className="text-xs font-extrabold text-[#FFF8EC] truncate">
                            {getPlayerName(p.playerId)}{' '}
                            {p.playerId === myPlayerId && (
                              <span className="text-[#FFD13B]">(You)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#1A1336] ${
                              isReady
                                ? 'bg-[#2CEAA3] text-[#1A1336]'
                                : 'bg-[#1A1336] text-[#FFF8EC]/60'
                            }`}>
                            {isReady ? 'READY' : 'WAIT'}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-[#1A1336] ${
                              idx === 0
                                ? 'bg-[#FFD13B] text-[#1A1336]'
                                : 'bg-[#38E8FF] text-[#1A1336]'
                            }`}>
                            {idx === 0 ? 'HOST' : `P${idx + 1}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#1A1336]/60 border-2 border-[#1A1336] p-3 rounded-xl flex flex-col justify-between gap-2">
                <div className="text-[11px] uppercase font-black text-[#FFD13B] tracking-wider">
                  Tournament Length
                </div>
                {isHost ? (
                  <div className="flex items-center justify-center gap-3 my-auto">
                    <button
                      onClick={() =>
                        onSetCustomRounds((prev) =>
                          Math.max(
                            1,
                            (prev !== null ? prev : defaultRounds) - 1,
                          ),
                        )
                      }
                      className="w-10 h-10 rounded-xl bg-[#3B266E] hover:bg-[#4e348c] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-white font-black cursor-pointer">
                      -
                    </button>
                    <span className="text-xl font-black text-[#FFF8EC] min-w-[92px] text-center">
                      {effectiveRounds}{' '}
                      {effectiveRounds === 1 ? 'Round' : 'Rounds'}
                    </span>
                    <button
                      onClick={() =>
                        onSetCustomRounds((prev) =>
                          Math.min(
                            10,
                            (prev !== null ? prev : defaultRounds) + 1,
                          ),
                        )
                      }
                      className="w-10 h-10 rounded-xl bg-[#3B266E] hover:bg-[#4e348c] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-white font-black cursor-pointer">
                      +
                    </button>
                  </div>
                ) : (
                  <div className="text-lg font-black text-[#38E8FF] text-center my-auto">
                    {effectiveRounds}{' '}
                    {effectiveRounds === 1 ? 'Round' : 'Rounds'}
                  </div>
                )}
                <div className="text-[10px] text-[#FFF8EC]/70 text-center font-bold">
                  AI Judge + Anonymous Player Votes
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {isForfeited && gameState.status === 'PODIUM' ? (
                <p className="text-xs text-[#FF4D79] tracking-widest uppercase font-black animate-pulse">
                  You forfeited this match. Spectating next round...
                </p>
              ) : isHost ? (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    disabled={players.length < 2}
                    data-testid="start-button"
                    onClick={
                      gameState.round > 1
                        ? onStartNextRound
                        : onCommenceTournament
                    }
                    className={`flex-1 py-3.5 px-4 rounded-xl font-black uppercase tracking-wider text-sm border-[3px] border-[#1A1336] transition-all ${
                      players.length >= 2
                        ? 'bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] shadow-[0_4px_0_#1A1336] active:translate-y-0.5 cursor-pointer'
                        : 'bg-[#34235E] text-[#FFF8EC]/45 cursor-not-allowed'
                    }`}>
                    {players.length >= 2
                      ? gameState.round > 1
                        ? `Start Round ${gameState.round}`
                        : 'Start Multiplayer Match'
                      : 'Need 2+ Players for Live Match'}
                  </button>
                  {lobbyActionsExtra}
                </div>
              ) : (
                <p className="text-xs text-[#2CEAA3] tracking-widest uppercase font-black animate-pulse py-2">
                  {gameState.round > 1
                    ? `Awaiting Host to start Round ${gameState.round}...`
                    : 'Awaiting Host to start the show...'}
                </p>
              )}
            </div>
          </div>

        </ModalDialog>
      )}

      {/* ==========================================
       * 4. PODIUM SCREEN OVERLAY
       * ========================================== */}
      {appScreen === 'PODIUM' && (
        <ModalDialog
          className="bg-[#1B113A]/90 backdrop-blur-sm animate-in fade-in duration-200"
          debugHud={activeModal === 'PODIUM' ? debugHudNode : null}>
          {gameState.tournamentWinnerId ? (
            <div
              className={`${COMIC_CARD} p-6 sm:p-8 w-full max-w-md text-center space-y-5`}>
              <div>
                <h2
                  className="text-3xl font-black text-[#FFD13B] tracking-wider uppercase"
                  style={{textShadow: '3px 3px 0 #1A1336'}}>
                  Show Complete!
                </h2>
                <p className="text-xs text-[#2CEAA3] tracking-widest uppercase font-black mt-1">
                  Final Tournament Standings
                </p>
              </div>

              <div className="flex flex-col items-center bg-[#1A1336]/70 border-2 border-[#FFD13B] p-5 rounded-2xl">
                <img
                  src="assets/images/trophy_crown.png"
                  alt="Grand Champion Crown"
                  className="w-20 h-16 object-contain mb-2 drop-shadow"
                />
                {gameState.tournamentWinnerId === 'TIE' ? (
                  <>
                    <span className="text-[10px] text-[#38E8FF] tracking-wider uppercase font-black mb-1">
                      Result
                    </span>
                    <span className="text-xl font-black text-white">
                      Co-Champions Tie!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-[#FFD13B] tracking-wider uppercase font-black mb-1">
                      Grand Champion
                    </span>
                    <span className="text-2xl font-black text-white truncate max-w-[280px]">
                      {getPlayerName(gameState.tournamentWinnerId ?? null)}
                    </span>
                  </>
                )}
              </div>

              <div className="text-left bg-[#1A1336]/50 border-2 border-[#1A1336] p-4 rounded-xl">
                <h3 className="text-xs text-[#FFD13B] uppercase tracking-wider mb-3 border-b border-[#3b286b] pb-1 font-black">
                  Match Standings
                </h3>
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                  {Object.entries(gameState.standings)
                    .sort(([, a], [, b]) => b - a)
                    .map(([playerId, wins], idx) => {
                      const isFirst = idx === 0 && wins > 0;
                      const pts =
                        gameState.cumulativePoints?.[playerId] ?? 0;
                      return (
                        <div
                          key={playerId}
                          className={`flex justify-between items-center p-2.5 rounded-xl border-2 border-[#1A1336] ${
                            isFirst
                              ? 'bg-[#FFD13B]/20 text-[#FFD13B]'
                              : 'bg-[#2E1E59] text-[#FFF8EC]'
                          }`}>
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-xs font-black w-5">
                              #{idx + 1}
                            </span>
                            <img
                              src={getAvatarImage(playerId)}
                              alt=""
                              className="w-7 h-7 object-contain rounded"
                            />
                            <span className="text-sm truncate font-extrabold">
                              {getPlayerName(playerId)}
                            </span>
                          </div>
                          <span className="text-xs font-black">
                            {wins} {wins === 1 ? 'Win' : 'Wins'}
                            {pts > 0 ? ` • ${pts} pts` : ''}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {podiumExtraContent}

              {isHost ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={onRestartTournament}
                    className="w-full py-3 bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] font-black uppercase rounded-xl transition-all active:translate-y-0.5 text-xs tracking-wider cursor-pointer">
                    Play Again / New Match
                  </button>
                  <button
                    onClick={onEndLobby}
                    className="w-full py-3 bg-[#FF4D79] hover:bg-[#ff668b] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] text-[#1A1336] font-black uppercase rounded-xl transition-all active:translate-y-0.5 text-xs tracking-wider cursor-pointer">
                    Close Lobby
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#2CEAA3] tracking-widest uppercase font-black animate-pulse">
                  Awaiting Host to restart...
                </p>
              )}
            </div>
          ) : (
            <div
              className={`${COMIC_CARD} p-6 sm:p-8 w-full max-w-md text-center space-y-5`}>
              <h2
                className="text-2xl font-black text-[#FFD13B] tracking-widest uppercase"
                style={{textShadow: '2px 2px 0 #1A1336'}}>
                Round Complete!
              </h2>

              <div className="flex flex-col items-center bg-[#1A1336]/70 border-2 border-[#FFD13B]/60 p-5 rounded-2xl">
                {gameState.winnerId && gameState.winnerId !== 'DRAW' ? (
                  <>
                    <img
                      src="assets/images/trophy_crown.png"
                      alt="Winner Crown"
                      className="w-16 h-12 object-contain mb-1"
                    />
                    <span className="text-[10px] text-[#FFD13B] tracking-wider uppercase font-black mb-1">
                      Round Winner {gameState.isForfeit && '(By Forfeit)'}
                    </span>
                    <span className="text-xl font-black truncate text-white">
                      {getPlayerName(gameState.winnerId)}
                    </span>
                  </>
                ) : gameState.isForfeit && gameState.forfeiterId ? (
                  <>
                    <span className="text-4xl mb-1">🏳️</span>
                    <span className="text-[10px] text-[#FF4D79] tracking-wider uppercase font-black mb-1">
                      Match Forfeited
                    </span>
                    <span className="text-lg font-bold truncate text-white">
                      {getPlayerName(gameState.forfeiterId)} Forfeited
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl mb-1">🤝</span>
                    <span className="text-[10px] text-[#38E8FF] tracking-wider uppercase font-black mb-1">
                      Result
                    </span>
                    <span className="text-lg font-bold truncate text-white">
                      It&apos;s a Draw!
                    </span>
                  </>
                )}
              </div>

              <div className="bg-[#1A1336]/50 border-2 border-[#1A1336] rounded-xl p-3">
                <div className="text-[10px] text-[#2CEAA3] uppercase tracking-widest mb-1 font-black">
                  Next Round Lineup
                </div>
                <div className="text-sm text-[#FFF8EC] font-bold">
                  {gameState.activePlayerIds.length >= 2
                    ? gameState.activePlayerIds
                        .map((id) => getPlayerName(id))
                        .join(' vs ')
                    : 'Awaiting players...'}
                </div>
              </div>

              {podiumExtraContent}

              {isHost ? (
                <button
                  onClick={onStartNextRound}
                  className="w-full py-3.5 bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] font-black uppercase rounded-xl transition-all active:translate-y-0.5 text-xs tracking-wider cursor-pointer">
                  Start Next Round
                </button>
              ) : (
                <p className="text-xs text-[#FFD13B] tracking-widest uppercase font-black animate-pulse">
                  Awaiting Host to start next round...
                </p>
              )}
            </div>
          )}
        </ModalDialog>
      )}

      {/* ==========================================
       * 5. SPECTATOR BANNER
       * ========================================== */}
      {isSpectating && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FFD13B] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-[#1A1336] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider pointer-events-none z-30">
          {isForfeited && gameState.status === 'PLAYING'
            ? 'Spectating (Forfeited)'
            : 'Spectating Stage — React with Stickers!'}
        </div>
      )}

      {/* ==========================================
       * 6. IN-GAME MENU MODAL
       * ========================================== */}
      {showInGameMenu && (
        <ModalDialog
          className="bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          debugHud={activeModal === 'MENU' ? debugHudNode : null}>
          <div className={`${COMIC_CARD} p-6 w-full max-w-sm text-center space-y-4`}>
            <h3 className="text-2xl font-black text-[#FFD13B] uppercase tracking-wider border-b-2 border-[#1A1336] pb-2">
              Game Menu
            </h3>

            <div className="flex flex-col gap-2.5">
              <button
                autoFocus
                onClick={() => setShowInGameMenu(false)}
                className="w-full py-3 bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] font-black uppercase rounded-xl text-xs tracking-wider transition-all active:translate-y-0.5 cursor-pointer">
                Resume Show
              </button>

              {(onToggleSfx || onToggleMusic) && (
                <div className="grid grid-cols-2 gap-2">
                  {onToggleSfx && (
                    <button
                      onClick={onToggleSfx}
                      className="py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-[#FFF8EC] border-2 border-[#1A1336] rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                      SFX: {sfxMuted ? 'Off' : 'On'}
                    </button>
                  )}
                  {onToggleMusic && (
                    <button
                      onClick={onToggleMusic}
                      className="py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-[#FFF8EC] border-2 border-[#1A1336] rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                      Music: {musicMuted ? 'Off' : 'On'}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setShowDebugHud((prev) => !prev);
                  setShowInGameMenu(false);
                }}
                className="w-full py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-[#FFF8EC] border-2 border-[#1A1336] rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                {showDebugHud ? 'Hide Debug HUD' : 'Show Debug HUD'}
              </button>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="w-full py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-[#38E8FF] border-2 border-[#1A1336] rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                How to Play
              </button>

              {gameState.activePlayerIds.includes(myPlayerId || '') && (
                <button
                  onClick={() => {
                    setShowInGameMenu(false);
                    setShowForfeitModal(true);
                  }}
                  className="w-full py-2.5 bg-[#FF4D79] hover:bg-[#ff668b] text-[#1A1336] border-2 border-[#1A1336] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">
                  Forfeit Match
                </button>
              )}

              {isHost && (
                <>
                  <div className="border-t-2 border-[#1A1336] my-1" />
                  <div className="text-[10px] text-[#FFD13B] font-black uppercase tracking-wider">
                    Host Controls
                  </div>

                  <button
                    onClick={() => {
                      setShowInGameMenu(false);
                      onRestartTournament();
                    }}
                    className="w-full py-2.5 bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-2 border-[#1A1336] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">
                    Restart Match
                  </button>

                  {onReturnToLobby && (
                    <button
                      onClick={() => {
                        setShowInGameMenu(false);
                        onReturnToLobby();
                      }}
                      className="w-full py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-[#2CEAA3] border-2 border-[#1A1336] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">
                      Quit to Hub / Lobby
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowInGameMenu(false);
                      onEndLobby();
                    }}
                    className="w-full py-2.5 bg-[#5a1a35] hover:bg-[#732143] text-[#FF9AB3] border-2 border-[#1A1336] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer">
                    End Lobby
                  </button>
                </>
              )}
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ==========================================
       * 7. HOW TO PLAY MODAL
       * ========================================== */}
      {showHowToPlay && (
        <ModalDialog
          className="bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
          debugHud={activeModal === 'HOW_TO_PLAY' ? debugHudNode : null}>
          <div className={`${COMIC_CARD} p-6 w-full max-w-md text-left space-y-4`}>
            <h3 className="text-xl font-black text-[#FFD13B] uppercase tracking-wide border-b-2 border-[#1A1336] pb-2">
              How to Play Mashup Mayhem
            </h3>
            {howToPlayContent || (
              <div className="text-xs text-[#FFF8EC] space-y-2.5 max-h-64 overflow-y-auto pr-1 font-semibold leading-relaxed">
                {howToPlayRules && howToPlayRules.length > 0 ? (
                  howToPlayRules.map((rule, idx) => <p key={idx}>• {rule}</p>)
                ) : (
                  <>
                    <p>
                      <strong className="text-[#FFD13B]">1. Mashup Objects:</strong>{' '}
                      Each round reveals 3–5 absurd items and a chaotic situation.
                    </p>
                    <p>
                      <strong className="text-[#2CEAA3]">2. Pitch Your Plan:</strong>{' '}
                      Type how you combine those exact objects to survive (or fail big in Reverse Wildcards!). Lock in early for a speed bonus.
                    </p>
                    <p>
                      <strong className="text-[#FF4D79]">3. Blind Vote & AI Judge:</strong>{' '}
                      Authors stay hidden while everyone votes (keys 1–5 or tap). Gizmo scores Relevance, Creativity, Humor & Originality!
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              {onOpenInteractiveTutorial && (
                <button
                  onClick={() => {
                    setShowHowToPlay(false);
                    setShowInGameMenu(false);
                    onOpenInteractiveTutorial();
                  }}
                  className="flex-1 py-3 bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] font-black uppercase rounded-xl text-xs tracking-wider cursor-pointer">
                  🎓 Launch Interactive Tutorial
                </button>
              )}
              <button
                onClick={() => setShowHowToPlay(false)}
                className="flex-1 py-3 bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] font-black uppercase rounded-xl text-xs tracking-wider cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ==========================================
       * 8. FORFEIT CONFIRMATION MODAL
       * ========================================== */}
      {showForfeitModal && (
        <ModalDialog
          className="bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
          debugHud={activeModal === 'FORFEIT' ? debugHudNode : null}>
          <div className={`${COMIC_CARD} p-6 w-full max-w-sm text-center space-y-4`}>
            <div className="text-3xl">🏳️</div>
            <h3 className="text-xl font-black text-[#FF4D79] uppercase tracking-wide">
              Forfeit Round?
            </h3>
            <p className="text-xs text-[#FFF8EC]/85 font-semibold">
              {forfeitModalText ||
                'Are you sure you want to forfeit this round? You will rotate to the spectator queue for this round.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForfeitModal(false)}
                className="flex-1 py-2.5 bg-[#3B266E] hover:bg-[#4e348c] text-white border-2 border-[#1A1336] font-bold uppercase rounded-xl text-xs tracking-wider cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowForfeitModal(false);
                  onForfeit();
                }}
                className="flex-1 py-2.5 bg-[#FF4D79] hover:bg-[#ff668b] text-[#1A1336] border-2 border-[#1A1336] font-black uppercase rounded-xl text-xs tracking-wider cursor-pointer">
                Forfeit
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {!activeModal && debugHudNode}
    </>
  );
}
