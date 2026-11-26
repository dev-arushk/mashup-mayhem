// tslint:disable
/* eslint-disable */
import React, {useEffect, useId, useRef, useState} from 'react';
import {
  loginAccount,
  logoutAccount,
  signUpAccount,
  UserAccount,
  validatePassword,
  validateUsername,
} from './accountsEngine';
import {AVATAR_CATALOG} from './contentLibrary';
import {gameAudio, useModalDialog, useOverlayFocusNavigation} from './utils/helper';

export interface AccountModalProps {
  isOpen: boolean;
  initialTab?: 'LOGIN' | 'SIGNUP';
  currentAccount: UserAccount | null;
  onClose: () => void;
  onAuthSuccess: (account: UserAccount) => void;
  onLogout: () => void;
}

const COMIC_CARD =
  'bg-[#241645] border-[3px] border-[#1A1336] shadow-[0_6px_0_#1A1336] rounded-2xl text-[#FFF8EC]';

export function AccountModal({
  isOpen,
  initialTab = 'LOGIN',
  currentAccount,
  onClose,
  onAuthSuccess,
  onLogout,
}: AccountModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [viewMode, setViewMode] = useState<'PROFILE' | 'AUTH'>(
    currentAccount ? 'PROFILE' : 'AUTH',
  );
  const [authTab, setAuthTab] = useState<'LOGIN' | 'SIGNUP'>(initialTab);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarId, setAvatarId] = useState(AVATAR_CATALOG[0].id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setViewMode(currentAccount ? 'PROFILE' : 'AUTH');
      setAuthTab(initialTab);
      setErrorMsg(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentAccount, initialTab]);

  if (!isOpen) return null;

  return (
    <AccountDialogInner
      dialogRef={dialogRef}
      titleId={titleId}
      viewMode={viewMode}
      setViewMode={setViewMode}
      authTab={authTab}
      setAuthTab={setAuthTab}
      currentAccount={currentAccount}
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      avatarId={avatarId}
      setAvatarId={setAvatarId}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirm={showConfirm}
      setShowConfirm={setShowConfirm}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      submitting={submitting}
      setSubmitting={setSubmitting}
      onClose={onClose}
      onAuthSuccess={onAuthSuccess}
      onLogout={onLogout}
    />
  );
}

interface AccountDialogInnerProps {
  dialogRef: React.RefObject<HTMLDialogElement>;
  titleId: string;
  viewMode: 'PROFILE' | 'AUTH';
  setViewMode: React.Dispatch<React.SetStateAction<'PROFILE' | 'AUTH'>>;
  authTab: 'LOGIN' | 'SIGNUP';
  setAuthTab: React.Dispatch<React.SetStateAction<'LOGIN' | 'SIGNUP'>>;
  currentAccount: UserAccount | null;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  avatarId: string;
  setAvatarId: React.Dispatch<React.SetStateAction<string>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  errorMsg: string | null;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onAuthSuccess: (account: UserAccount) => void;
  onLogout: () => void;
}

function AccountDialogInner({
  dialogRef,
  titleId,
  viewMode,
  setViewMode,
  authTab,
  setAuthTab,
  currentAccount,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  avatarId,
  setAvatarId,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  errorMsg,
  setErrorMsg,
  submitting,
  setSubmitting,
  onClose,
  onAuthSuccess,
  onLogout,
}: AccountDialogInnerProps) {
  useModalDialog(dialogRef);
  useOverlayFocusNavigation(dialogRef, true);

  const inlineUserError =
    authTab === 'SIGNUP' && username.trim().length > 0
      ? validateUsername(username)
      : null;
  const inlinePassError =
    authTab === 'SIGNUP' && password.length > 0
      ? validatePassword(password)
      : null;
  const inlineConfirmError =
    authTab === 'SIGNUP' &&
    confirmPassword.length > 0 &&
    confirmPassword !== password
      ? 'Passwords do not match.'
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (authTab === 'SIGNUP') {
        const res = await signUpAccount({
          username,
          password,
          confirmPassword,
          avatarId,
        });
        if (!res.ok || !res.account) {
          gameAudio.playErrorBuzz();
          setErrorMsg(res.error || 'Could not create account.');
        } else {
          gameAudio.playCoinPickup();
          onAuthSuccess(res.account);
          onClose();
        }
      } else {
        const res = await loginAccount({username, password});
        if (!res.ok || !res.account) {
          gameAudio.playErrorBuzz();
          setErrorMsg(res.error || 'Could not log in.');
        } else {
          gameAudio.playConfirmSelect();
          onAuthSuccess(res.account);
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const equippedAvatar = currentAccount
    ? AVATAR_CATALOG.find(
        (a) => a.id === currentAccount.profile.equippedAvatarId,
      ) || AVATAR_CATALOG[0]
    : AVATAR_CATALOG[0];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-overlay-container=""
      data-playground-modal="true"
      className="fixed inset-0 z-[70] m-0 p-0 max-w-none max-h-none w-full h-full border-0 text-inherit bg-[#120A29]/85 backdrop:bg-transparent overflow-y-auto touch-auto">
      <div className="min-h-full w-full flex flex-col items-center p-3 sm:p-5">
        <div className={`${COMIC_CARD} m-auto w-full max-w-md p-5 sm:p-6 space-y-4`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1A1336] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎟️</span>
              <h2
                id={titleId}
                className="text-xl font-black text-[#FFD13B] uppercase tracking-wide"
                style={{fontFamily: "'Fredoka', 'Nunito', sans-serif"}}>
                {viewMode === 'PROFILE' && currentAccount
                  ? 'Studio Account'
                  : 'Contestant Account'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onClose();
              }}
              aria-label="Close account modal"
              className="w-8 h-8 rounded-full bg-[#3B266E] hover:bg-[#4e348c] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
              ✕
            </button>
          </div>

          {/* VIEW 1: SIGNED-IN ACCOUNT INFO */}
          {viewMode === 'PROFILE' && currentAccount ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#1A1336]/75 border-2 border-[#FFD13B] rounded-2xl p-3.5">
                <img
                  src={equippedAvatar.imagePath}
                  alt={equippedAvatar.name}
                  className="w-14 h-14 object-contain rounded-xl bg-[#2E1E59] p-1 border-2 border-[#1A1336]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-[#FFF8EC] truncate">
                      {currentAccount.username}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#2CEAA3] text-[#1A1336] border border-[#1A1336] text-[9px] font-black uppercase">
                      Active
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#FFD13B]">
                    Lv.{currentAccount.profile.level} •{' '}
                    {currentAccount.profile.equippedTitle}
                  </div>
                  <div className="text-[11px] font-bold text-[#38E8FF]">
                    🔥 Mayhem Lv.{currentAccount.profile.mayhemLevel}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#2E1E59] border-2 border-[#1A1336] rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-[#FFD13B] uppercase">
                    Total Points
                  </div>
                  <div className="text-lg font-black">
                    {currentAccount.profile.totalPoints}
                  </div>
                </div>
                <div className="bg-[#2E1E59] border-2 border-[#1A1336] rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-[#2CEAA3] uppercase">
                    Round Wins
                  </div>
                  <div className="text-lg font-black">
                    {currentAccount.profile.wins}
                  </div>
                </div>
                <div className="bg-[#2E1E59] border-2 border-[#1A1336] rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-[#38E8FF] uppercase">
                    Best Score
                  </div>
                  <div className="text-lg font-black">
                    {currentAccount.profile.bestAnswerScore} pts
                  </div>
                </div>
                <div className="bg-[#2E1E59] border-2 border-[#1A1336] rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-[#FF4D79] uppercase">
                    Coins &amp; XP
                  </div>
                  <div className="text-sm font-black">
                    {currentAccount.profile.coins} 🪙 •{' '}
                    {currentAccount.profile.xp} XP
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setViewMode('AUTH');
                    setAuthTab('LOGIN');
                    setUsername('');
                    setPassword('');
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#38E8FF] hover:bg-[#6ef0ff] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] font-black text-xs uppercase cursor-pointer">
                  🔄 Switch Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    logoutAccount();
                    onLogout();
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF4D79] hover:bg-[#ff668b] text-[#1A1336] border-2 border-[#1A1336] shadow-[0_3px_0_#1A1336] font-black text-xs uppercase cursor-pointer">
                  🚪 Log Out
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: LOG IN / SIGN UP TABS */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#1A1336]/75 p-1 rounded-xl border-2 border-[#1A1336]">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setAuthTab('LOGIN');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-black uppercase cursor-pointer transition-colors ${
                    authTab === 'LOGIN'
                      ? 'bg-[#FFD13B] text-[#1A1336] shadow-[0_2px_0_#1A1336]'
                      : 'text-[#FFF8EC]/80 hover:text-white'
                  }`}>
                  🔑 Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setAuthTab('SIGNUP');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-black uppercase cursor-pointer transition-colors ${
                    authTab === 'SIGNUP'
                      ? 'bg-[#2CEAA3] text-[#1A1336] shadow-[0_2px_0_#1A1336]'
                      : 'text-[#FFF8EC]/80 hover:text-white'
                  }`}>
                  ✨ Sign Up
                </button>
              </div>

              {errorMsg && (
                <div className="bg-[#FF4D79]/20 border-2 border-[#FF4D79] text-[#FFD13B] rounded-xl px-3 py-2 text-xs font-black">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-[#FFD13B]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={18}
                  placeholder="e.g. ComedyChamp_99"
                  autoComplete="username"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#FFD13B]"
                />
                {inlineUserError && (
                  <div className="text-[11px] font-bold text-[#FF4D79]">
                    {inlineUserError}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-[#FFD13B]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      authTab === 'SIGNUP'
                        ? 'At least 6 characters'
                        : 'Enter your password'
                    }
                    autoComplete={
                      authTab === 'SIGNUP' ? 'new-password' : 'current-password'
                    }
                    className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#FFD13B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s: boolean) => !s)}
                    className="absolute right-2 px-2 py-1 rounded-lg bg-[#241645] text-[#FFD13B] text-[10px] font-black uppercase cursor-pointer">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {inlinePassError && (
                  <div className="text-[11px] font-bold text-[#FF4D79]">
                    {inlinePassError}
                  </div>
                )}
              </div>

              {/* Confirm Password + Avatar Picker for Sign Up */}
              {authTab === 'SIGNUP' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-[#FFD13B]">
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#FFD13B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s: boolean) => !s)}
                        className="absolute right-2 px-2 py-1 rounded-lg bg-[#241645] text-[#FFD13B] text-[10px] font-black uppercase cursor-pointer">
                        {showConfirm ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {inlineConfirmError && (
                      <div className="text-[11px] font-bold text-[#FF4D79]">
                        {inlineConfirmError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase text-[#2CEAA3]">
                      Pick Your Contestant Avatar
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AVATAR_CATALOG.slice(0, 6).map((av) => {
                        const selected = avatarId === av.id;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              gameAudio.playCrispClick();
                              setAvatarId(av.id);
                            }}
                            className={`p-2 rounded-xl border-2 border-[#1A1336] flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                              selected
                                ? 'bg-[#FFD13B] text-[#1A1336] shadow-[0_3px_0_#1A1336]'
                                : 'bg-[#2E1E59] text-[#FFF8EC] hover:bg-[#3e2978]'
                            }`}>
                            <img
                              src={av.imagePath}
                              alt={av.name}
                              className="w-9 h-9 object-contain"
                            />
                            <span className="text-[9px] font-black truncate w-full text-center">
                              {av.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                {currentAccount && (
                  <button
                    type="button"
                    onClick={() => setViewMode('PROFILE')}
                    className="px-4 py-3 rounded-xl bg-[#3B266E] text-[#FFF8EC] border-2 border-[#1A1336] font-black text-xs uppercase cursor-pointer">
                    ← Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="account-submit-button"
                  className="flex-1 py-3 rounded-xl bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] font-black text-xs uppercase tracking-wider cursor-pointer active:translate-y-0.5">
                  {submitting
                    ? 'Saving...'
                    : authTab === 'SIGNUP'
                      ? '🚀 Create Account & Play'
                      : '🎬 Log In to Studio'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
