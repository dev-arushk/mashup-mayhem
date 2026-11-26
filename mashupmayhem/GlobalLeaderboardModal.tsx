// tslint:disable
/* eslint-disable */
import React, {useId, useRef} from 'react';
import {
  getGlobalLeaderboard,
  GlobalLeaderboardEntry,
  UserAccount,
} from './accountsEngine';
import {AVATAR_CATALOG} from './contentLibrary';
import {gameAudio, useModalDialog, useOverlayFocusNavigation} from './utils/helper';

export interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  currentAccount: UserAccount | null;
  remoteEntries: Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>[];
  onClose: () => void;
  onOpenAuth: (tab?: 'LOGIN' | 'SIGNUP') => void;
}

const COMIC_CARD =
  'bg-[#241645] border-[3px] border-[#1A1336] shadow-[0_6px_0_#1A1336] rounded-2xl text-[#FFF8EC]';

export function GlobalLeaderboardModal({
  isOpen,
  currentAccount,
  remoteEntries,
  onClose,
  onOpenAuth,
}: GlobalLeaderboardModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <GlobalLeaderboardDialogInner
      dialogRef={dialogRef}
      titleId={titleId}
      currentAccount={currentAccount}
      remoteEntries={remoteEntries}
      onClose={onClose}
      onOpenAuth={onOpenAuth}
    />
  );
}

function GlobalLeaderboardDialogInner({
  dialogRef,
  titleId,
  currentAccount,
  remoteEntries,
  onClose,
  onOpenAuth,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  titleId: string;
  currentAccount: UserAccount | null;
  remoteEntries: Omit<GlobalLeaderboardEntry, 'rank' | 'isCurrentUser'>[];
  onClose: () => void;
  onOpenAuth: (tab?: 'LOGIN' | 'SIGNUP') => void;
}) {
  useModalDialog(dialogRef);
  useOverlayFocusNavigation(dialogRef, true);

  const entries = getGlobalLeaderboard(
    currentAccount?.id ?? null,
    remoteEntries,
  );
  const myEntry = entries.find((e) => e.isCurrentUser) || null;

  const getAvatarPath = (avatarId: string) =>
    AVATAR_CATALOG.find((a) => a.id === avatarId)?.imagePath ||
    AVATAR_CATALOG[0].imagePath;

  const renderMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-overlay-container=""
      data-playground-modal="true"
      className="fixed inset-0 z-[70] m-0 p-0 max-w-none max-h-none w-full h-full border-0 text-inherit bg-[#120A29]/85 backdrop:bg-transparent overflow-y-auto touch-auto">
      <div className="min-h-full w-full flex flex-col items-center p-3 sm:p-5">
        <div
          className={`${COMIC_CARD} m-auto w-full max-w-2xl p-4 sm:p-6 space-y-4`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-[#1A1336] pb-3">
            <div className="flex items-center gap-2.5">
              <img
                src="assets/images/trophy_crown.png"
                alt="Crown"
                className="w-9 h-7 object-contain"
              />
              <div>
                <h2
                  id={titleId}
                  className="text-xl sm:text-2xl font-black text-[#FFD13B] uppercase tracking-wide"
                  style={{fontFamily: "'Fredoka', 'Nunito', sans-serif"}}>
                  Global Leaderboard
                </h2>
                <div className="text-[11px] font-bold text-[#2CEAA3]">
                  Top Comedy Contenders Worldwide • {entries.length} Ranked
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onClose();
              }}
              aria-label="Close leaderboard"
              className="w-9 h-9 rounded-full bg-[#3B266E] hover:bg-[#4e348c] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
              ✕
            </button>
          </div>

          {/* Current Player Rank Banner or Friendly Sign-In Invite */}
          {myEntry ? (
            <div className="bg-[#1A1336]/80 border-2 border-[#2CEAA3] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="px-3 py-1 rounded-xl bg-[#2CEAA3] text-[#1A1336] border-2 border-[#1A1336] text-sm font-black">
                  Rank #{myEntry.rank}
                </div>
                <div>
                  <div className="text-sm font-black text-[#FFF8EC]">
                    {myEntry.username}
                  </div>
                  <div className="text-[11px] font-bold text-[#FFD13B]">
                    Mayhem Lv.{myEntry.mayhemLevel} • {myEntry.totalPoints} Total Pts •{' '}
                    {myEntry.wins} Wins
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FFD13B] text-[#1A1336] border border-[#1A1336] text-[10px] font-black uppercase">
                Best: {myEntry.bestAnswerScore} pts
              </span>
            </div>
          ) : (
            <div className="bg-[#1A1336]/80 border-2 border-[#FFD13B] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#FFF8EC]">
                <span className="font-black text-[#FFD13B]">Playing as Guest!</span>{' '}
                Sign in or create an account to save your points &amp; climb the Global Leaderboard.
              </div>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playConfirmSelect();
                  onClose();
                  onOpenAuth('SIGNUP');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] text-xs font-black uppercase cursor-pointer shrink-0">
                Sign in or Log in
              </button>
            </div>
          )}

          {/* Ranked Contenders List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const isTop1 = entry.rank === 1;
              const isTop3 = entry.rank <= 3;
              return (
                <div
                  key={`${entry.id}_${entry.username}`}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 border-[#1A1336] ${
                    entry.isCurrentUser
                      ? 'bg-[#2CEAA3]/25 border-[#2CEAA3] text-[#FFF8EC]'
                      : isTop1
                        ? 'bg-[#FFD13B] text-[#1A1336]'
                        : 'bg-[#2E1E59] text-[#FFF8EC]'
                  }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 text-center font-black shrink-0 ${
                        isTop3 ? 'text-lg' : 'text-xs'
                      }`}>
                      {renderMedal(entry.rank)}
                    </div>
                    {isTop1 && (
                      <img
                        src="assets/images/trophy_crown.png"
                        alt="Crown"
                        className="w-5 h-4 object-contain shrink-0"
                      />
                    )}
                    <img
                      src={getAvatarPath(entry.avatarId)}
                      alt={entry.username}
                      className="w-9 h-9 object-contain rounded-lg bg-[#1A1336]/30 p-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black truncate">
                          {entry.username}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border border-[#1A1336] shrink-0 ${
                            entry.isCurrentUser
                              ? 'bg-[#2CEAA3] text-[#1A1336]'
                              : entry.isSeeded
                                ? 'bg-[#38E8FF] text-[#1A1336]'
                                : 'bg-[#FFD13B] text-[#1A1336]'
                          }`}>
                          {entry.isCurrentUser ? 'YOU' : entry.badge}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          isTop1 && !entry.isCurrentUser
                            ? 'text-[#1A1336]/80'
                            : 'text-[#FFF8EC]/75'
                        }`}>
                        Mayhem Lv.{entry.mayhemLevel} • Best:{' '}
                        {entry.bestAnswerScore} pts • {entry.wins} Wins
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black">
                      {entry.totalPoints}
                    </div>
                    <div
                      className={`text-[9px] font-black uppercase ${
                        isTop1 && !entry.isCurrentUser
                          ? 'text-[#1A1336]/75'
                          : 'text-[#FFD13B]'
                      }`}>
                      Total Pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#FFD13B] hover:bg-[#ffe066] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_3px_0_#1A1336] text-xs font-black uppercase cursor-pointer">
              Back to Studio Hub
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
