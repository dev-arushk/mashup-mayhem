// tslint:disable
/* eslint-disable */
import React, {useEffect, useRef, useState} from 'react';
import {THEME} from './constants';
import {gameAudio, prepareCanvas} from './utils/helper';

export interface IntroTutorialStageProps {
  assets: Record<string, HTMLImageElement | null>;
  reducedMotion: boolean;
  mayhemLevel: number;
  onFinishTutorial: () => void;
  onSkipToHub: () => void;
}

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  phase: number;
}

const SAMPLE_PROPS = [
  {
    id: 'tp1',
    name: 'Singing Toaster',
    category: 'Kitchen',
    icon: '🍞',
    quip: 'Belts 80s rock ballads on bagel mode!',
  },
  {
    id: 'tp2',
    name: 'Solar Disco Ball',
    category: 'Sci-Fi',
    icon: '🪩',
    quip: 'Blinds haunted mannequins with pure funk!',
  },
  {
    id: 'tp3',
    name: 'Jar of Spicy Mayo',
    category: 'Kitchen',
    icon: '🫙',
    quip: 'Tactical slippery floor defense!',
  },
];

const QUICK_FILL_DEMOS = [
  {
    label: '✨ Toast Catapult',
    text: 'Plug in the Singing Toaster to blast distraction tunes, blind the ghosts with the Solar Disco Ball, and slide out on Spicy Mayo!',
  },
  {
    label: '🪩 Disco Trap',
    text: 'Spin the Solar Disco Ball to stun the haunted furniture, coat the aisles in Spicy Mayo, and launch bagels from the Singing Toaster!',
  },
  {
    label: '🚀 Turbo Escape',
    text: 'Tape the Singing Toaster onto the Disco Ball as a turbo hoverboard greased with Spicy Mayo to rocket past checkout!',
  },
];

const TUTORIAL_WILDCARDS = [
  {
    badge: '2X SCORE',
    name: 'Double Points',
    desc: 'Every point earned this round is DOUBLED!',
    color: '#FFD13B',
  },
  {
    badge: 'SWAP!',
    name: 'Object Swap',
    desc: 'Halfway through writing, 1 prop swaps for a wild surprise!',
    color: '#38E8FF',
  },
  {
    badge: 'FAIL BIG',
    name: 'Reverse Challenge',
    desc: 'Pitch the MOST disastrous, hilarious way to fail!',
    color: '#FF4D79',
  },
];

export function IntroTutorialStage({
  assets,
  reducedMotion,
  mayhemLevel,
  onFinishTutorial,
  onSkipToHub,
}: IntroTutorialStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interactive Tutorial State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [flippedProps, setFlippedProps] = useState<Record<string, boolean>>({});
  const [demoPitch, setDemoPitch] = useState<string>('');
  const [demoLocked, setDemoLocked] = useState<boolean>(false);
  const [demoWildcardIdx, setDemoWildcardIdx] = useState<number>(0);
  const [demoVoteId, setDemoVoteId] = useState<string | null>(null);
  const [scoreBarAnim, setScoreBarAnim] = useState<boolean>(false);

  // Trigger animated score bars on Step 4
  useEffect(() => {
    if (step === 4) {
      setScoreBarAnim(false);
      const t = setTimeout(() => {
        setScoreBarAnim(true);
        gameAudio.playVictoryFanfare();
      }, 90);
      return () => clearTimeout(t);
    }
  }, [step]);

  // 60+ FPS Volumetric Projector Beam & Starburst Canvas
  useEffect(() => {
    const motes: DustMote[] = [];
    const palette = [THEME.gold, THEME.coral, THEME.mint, THEME.cyan, '#FFFFFF'];
    for (let i = 0; i < 42; i++) {
      motes.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        vx: (Math.random() - 0.5) * 32,
        vy: -18 - Math.random() * 34,
        r: 2 + Math.random() * 3.5,
        color: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2,
      });
    }

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      raf = requestAnimationFrame(renderFrame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = 960;
      const h = 540;
      prepareCanvas(ctx, w, h);

      // Deep Twilight Studio Backdrop
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.5, 580);
      bgGrad.addColorStop(0, '#331E6D');
      bgGrad.addColorStop(0.55, '#1F1243');
      bgGrad.addColorStop(1, '#120A29');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle stage backdrop texture
      const stageImg = assets['stage_backdrop'];
      if (stageImg && stageImg.complete && stageImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.24;
        ctx.drawImage(stageImg, 0, 0, w, h);
        ctx.restore();
      }

      if (!reducedMotion) {
        // Projector Lens Cone from Top Center
        const sway = Math.sin(elapsed * 0.8) * 18;
        ctx.save();
        const beamGrad = ctx.createLinearGradient(w * 0.5, 0, w * 0.5 + sway, h * 0.85);
        beamGrad.addColorStop(0, 'rgba(255, 209, 59, 0.42)');
        beamGrad.addColorStop(0.45, 'rgba(255, 209, 59, 0.14)');
        beamGrad.addColorStop(1, 'rgba(56, 232, 255, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - 24, -10);
        ctx.lineTo(w * 0.5 + 24, -10);
        ctx.lineTo(w * 0.5 + 340 + sway, h);
        ctx.lineTo(w * 0.5 - 340 + sway, h);
        ctx.closePath();
        ctx.fill();

        // Secondary Coral/Mint Spotlight Sweeps
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = THEME.coral;
        const s1 = Math.sin(elapsed * 1.4) * 140;
        ctx.beginPath();
        ctx.moveTo(w * 0.16, 0);
        ctx.lineTo(w * 0.04 + s1, h);
        ctx.lineTo(w * 0.3 + s1, h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = THEME.mint;
        const s2 = Math.cos(elapsed * 1.2) * 140;
        ctx.beginPath();
        ctx.moveTo(w * 0.84, 0);
        ctx.lineTo(w * 0.7 + s2, h);
        ctx.lineTo(w * 0.96 + s2, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Update & draw sparkling dust motes in the projector beam
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y < -12) {
            m.y = h + 12;
            m.x = 120 + Math.random() * (w - 240);
          }
          if (m.x < 0) m.x = w;
          if (m.x > w) m.x = 0;
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 3.5 + m.phase));
          ctx.save();
          ctx.globalAlpha = twinkle * 0.75;
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(m.x, m.y, Math.max(0, m.r), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Projected Stage Floor Ring
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 209, 59, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.86, 300, 48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    raf = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(raf);
  }, [assets, reducedMotion]);

  const allPropsFlipped = SAMPLE_PROPS.every((p) => flippedProps[p.id]);
  const tutorialViolation =
    demoPitch.trim().length > 0 && demoPitch.toLowerCase().includes('z')
      ? 'Rule Slip: Letter "Z" used!'
      : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#120A29] text-[#FFF8EC]">
      {/* High-FPS Canvas Projector Backdrop */}
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* INTERACTIVE TUTORIAL */}
      <div className="relative z-10 w-full max-w-3xl px-3 sm:px-5 py-4 max-h-full overflow-y-auto flex flex-col items-center">
          <div className="w-full bg-[#241645]/95 border-[3px] border-[#1A1336] shadow-[0_8px_0_#1A1336] rounded-3xl p-4 sm:p-6 space-y-4">
            {/* Header & Step Progress */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#1A1336] pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="assets/images/host_gizmo.png"
                  alt="Gizmo"
                  className="w-10 h-10 object-contain rounded-xl bg-[#1A1336] p-1 border-2 border-[#FFD13B]"
                />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#2CEAA3]">
                    Interactive Studio Bootcamp • Mayhem Lv.{mayhemLevel}
                  </div>
                  <h2
                    className="text-lg sm:text-xl font-black text-[#FFD13B]"
                    style={{fontFamily: THEME.fontFamily}}>
                    How to Play Mashup Mayhem
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setStep(n as 1 | 2 | 3 | 4);
                    }}
                    className={`w-8 h-8 rounded-xl border-2 border-[#1A1336] font-black text-xs cursor-pointer transition-transform active:scale-95 ${
                      step === n
                        ? 'bg-[#FFD13B] text-[#1A1336] shadow-[0_2px_0_#1A1336]'
                        : step > n
                          ? 'bg-[#2CEAA3] text-[#1A1336]'
                          : 'bg-[#1A1336] text-[#FFF8EC]/60'
                    }`}>
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => {
                    gameAudio.playCrispClick();
                    onSkipToHub();
                  }}
                  className="ml-1 px-3 py-1.5 rounded-xl bg-[#3B266E] hover:bg-[#4e348c] text-[#FFF8EC] border-2 border-[#1A1336] text-[11px] font-black uppercase cursor-pointer">
                  Skip
                </button>
              </div>
            </div>

            {/* STEP 1: INTERACTIVE PROP FLIP & SITUATION */}
            {step === 1 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] rounded-2xl p-3.5 shadow-[0_4px_0_#1A1336]">
                  <div className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FF4D79] text-white inline-block border border-[#1A1336] mb-1.5">
                    Step 1 of 4 • Sample Crisis
                  </div>
                  <div
                    className="text-base sm:text-lg font-black"
                    style={{fontFamily: THEME.fontFamily}}>
                    &ldquo;Survive a haunted IKEA after closing time!&rdquo;
                  </div>
                </div>

                <div className="text-xs font-bold text-[#38E8FF]">
                  👇 Tap all 3 Mystery Props below to reveal your chaotic toolkit!
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SAMPLE_PROPS.map((prop) => {
                    const flipped = !!flippedProps[prop.id];
                    return (
                      <button
                        key={prop.id}
                        onClick={() => {
                          gameAudio.playRetroJump();
                          setFlippedProps((prev) => ({...prev, [prop.id]: true}));
                        }}
                        className={`p-3.5 rounded-2xl border-[3px] border-[#1A1336] text-left transition-all duration-150 cursor-pointer active:scale-95 ${
                          flipped
                            ? 'bg-[#FFF8EC] text-[#1A1336] shadow-[0_4px_0_#1A1336]'
                            : 'bg-[#7C4DFF] hover:bg-[#8d64ff] text-white shadow-[0_4px_0_#1A1336]'
                        }`}>
                        {flipped ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{prop.icon}</span>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FFD13B] border border-[#1A1336]">
                                {prop.category}
                              </span>
                            </div>
                            <div className="text-sm font-black">{prop.name}</div>
                            <div className="text-[11px] font-bold opacity-80">
                              {prop.quip}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-3 gap-1.5">
                            <img
                              src="assets/images/mystery_cube.png"
                              alt="Tap to Flip"
                              className="w-10 h-10 object-contain"
                            />
                            <span className="text-xs font-black uppercase">
                              Tap to Reveal!
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      gameAudio.playPowerupChime();
                      setFlippedProps({tp1: true, tp2: true, tp3: true});
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#3B266E] hover:bg-[#4e348c] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
                    Reveal All Props
                  </button>
                  <button
                    onClick={() => {
                      gameAudio.playConfirmSelect();
                      setFlippedProps({tp1: true, tp2: true, tp3: true});
                      setStep(2);
                    }}
                    className={`px-5 py-2.5 rounded-xl border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] font-black text-xs uppercase cursor-pointer transition-transform active:translate-y-0.5 ${
                      allPropsFlipped
                        ? 'bg-[#2CEAA3] text-[#1A1336]'
                        : 'bg-[#FFD13B] text-[#1A1336]'
                    }`}>
                    Next: Pitch a Plan →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: TYPE OR QUICK-FILL A HILARIOUS SOLUTION */}
            {step === 2 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-[#2CEAA3]">
                    Step 2 of 4 • Pitch Under Pressure!
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFD13B] text-[#1A1336] border-2 border-[#1A1336] text-[10px] font-black">
                    ⚠️ Sample Rule: No Letter &quot;Z&quot; • ⚡ Early Submit Bonus!
                  </span>
                </div>

                {/* Quick-Fill Demo Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-black text-[#FFF8EC]/75 mr-1">
                    Quick-Fill Ideas:
                  </span>
                  {QUICK_FILL_DEMOS.map((pill) => (
                    <button
                      key={pill.label}
                      onClick={() => {
                        gameAudio.playHoverMicroTone();
                        setDemoPitch(pill.text);
                        setDemoLocked(false);
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#38E8FF] hover:bg-[#6ef0ff] text-[#1A1336] border-2 border-[#1A1336] text-[11px] font-black cursor-pointer active:scale-95 transition-transform">
                      {pill.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={demoPitch}
                  onChange={(e) => {
                    setDemoPitch(e.target.value);
                    setDemoLocked(false);
                  }}
                  placeholder="Type your own hilarious mashup using Singing Toaster, Solar Disco Ball & Spicy Mayo — or tap a Quick-Fill pill above!"
                  className="w-full rounded-2xl bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FFD13B]"
                />

                {tutorialViolation && (
                  <div className="text-xs font-black text-[#FF4D79] bg-[#1A1336] px-3 py-1.5 rounded-xl border border-[#FF4D79]">
                    ⚠️ {tutorialViolation} (Try removing &quot;Z&quot;!)
                  </div>
                )}

                {demoLocked && (
                  <div className="bg-[#2CEAA3]/20 border-2 border-[#2CEAA3] rounded-xl p-2.5 text-xs font-black text-[#2CEAA3]">
                    ✅ Demo Pitch Locked In! (+5 Speed Bonus Earned!)
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setStep(1);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#3B266E] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!demoPitch.trim()) {
                          setDemoPitch(QUICK_FILL_DEMOS[0].text);
                        }
                        gameAudio.playConfirmSelect();
                        setDemoLocked(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#FFD13B] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_3px_0_#1A1336] text-xs font-black uppercase cursor-pointer">
                      🚀 Lock In Demo
                    </button>
                    <button
                      onClick={() => {
                        if (!demoPitch.trim()) {
                          setDemoPitch(QUICK_FILL_DEMOS[0].text);
                        }
                        gameAudio.playConfirmSelect();
                        setStep(3);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#2CEAA3] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] text-xs font-black uppercase cursor-pointer">
                      Next: Wildcards &amp; Vote →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: WILDCARDS & BLIND VOTING */}
            {step === 3 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-[#FFD13B]">
                    Step 3 of 4 • Wildcards &amp; Blind Voting
                  </span>
                  <button
                    onClick={() => {
                      gameAudio.playPowerupChime();
                      setDemoWildcardIdx((i) => (i + 1) % TUTORIAL_WILDCARDS.length);
                    }}
                    className="px-3 py-1 rounded-full border-2 border-[#1A1336] text-[11px] font-black text-[#1A1336] cursor-pointer active:scale-95 transition-transform"
                    style={{
                      backgroundColor: TUTORIAL_WILDCARDS[demoWildcardIdx].color,
                    }}>
                    🎡 Spin Sample Wildcard: {TUTORIAL_WILDCARDS[demoWildcardIdx].badge}
                  </button>
                </div>

                <div className="bg-[#1A1336]/75 border-2 border-[#1A1336] rounded-xl px-3 py-2 text-xs font-bold">
                  <span className="text-[#FFD13B] font-black">
                    {TUTORIAL_WILDCARDS[demoWildcardIdx].name}:{' '}
                  </span>
                  {TUTORIAL_WILDCARDS[demoWildcardIdx].desc}
                </div>

                <div className="text-xs font-bold text-[#38E8FF]">
                  🗳️ Tap your favorite rival pitch below (you can&apos;t vote for your own!):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'mine',
                      isMine: true,
                      text: demoPitch.trim() || QUICK_FILL_DEMOS[0].text,
                    },
                    {
                      id: 'rival1',
                      isMine: false,
                      text: 'Grease the showroom floor with Spicy Mayo and surf past the ghosts on a Singing Toaster!',
                    },
                    {
                      id: 'rival2',
                      isMine: false,
                      text: 'Hypnotize the haunted Swedish meatballs using the Solar Disco Ball and crown myself IKEA King!',
                    },
                  ].map((card, i) => {
                    const chosen = demoVoteId === card.id;
                    return (
                      <button
                        key={card.id}
                        disabled={card.isMine}
                        onClick={() => {
                          gameAudio.playConfirmSelect();
                          setDemoVoteId(card.id);
                        }}
                        className={`p-3 rounded-2xl border-[3px] border-[#1A1336] text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                          card.isMine
                            ? 'bg-[#3B266E]/60 text-[#FFF8EC]/65 cursor-not-allowed'
                            : chosen
                              ? 'bg-[#2CEAA3] text-[#1A1336] shadow-[0_4px_0_#1A1336]'
                              : 'bg-[#FFF8EC] hover:bg-[#FFD13B] text-[#1A1336] shadow-[0_4px_0_#1A1336]'
                        }`}>
                        <div className="text-[10px] font-black uppercase">
                          {card.isMine
                            ? '🔒 Your Pitch (Self-Vote Blocked)'
                            : chosen
                              ? `⭐ Voted Mystery #${i + 1}`
                              : `Mystery Pitch #${i + 1}`}
                        </div>
                        <div className="text-xs font-extrabold leading-snug line-clamp-3">
                          &ldquo;{card.text}&rdquo;
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setStep(2);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#3B266E] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (!demoVoteId) setDemoVoteId('rival1');
                      gameAudio.playConfirmSelect();
                      setStep(4);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#2CEAA3] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] text-xs font-black uppercase cursor-pointer">
                    Next: See AI Judge Score →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: 100-POINT AI JUDGE + CROWD + PROGRESSIVE DIFFICULTY */}
            {step === 4 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-black uppercase text-[#FF4D79]">
                  Step 4 of 4 • Gizmo AI Judge (60 pts) + Crowd Votes (40 pts)
                </div>

                <div className="bg-[#FFF8EC] text-[#1A1336] border-[3px] border-[#1A1336] rounded-2xl p-4 shadow-[0_4px_0_#1A1336] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black">
                        Sample Round Breakdown
                      </div>
                      <div className="text-[11px] font-bold opacity-75">
                        54 AI Score + 30 Crowd Votes + 5 Speed Bonus
                      </div>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-2xl bg-[#FFD13B] border-[3px] border-[#1A1336] text-lg font-black shadow-[0_3px_0_#1A1336]">
                      89 / 100 pts!
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-black">
                    {[
                      {label: 'Relevance', val: 14, color: '#38E8FF'},
                      {label: 'Creativity', val: 13, color: '#2CEAA3'},
                      {label: 'Humor', val: 14, color: '#FF4D79'},
                      {label: 'Originality', val: 13, color: '#FFD13B'},
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="bg-[#1A1336]/10 rounded-xl p-2 border border-[#1A1336]">
                        <div className="flex justify-between mb-1">
                          <span>{m.label}</span>
                          <span>{m.val}/15</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#1A1336]/20 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: scoreBarAnim ? `${(m.val / 15) * 100}%` : '0%',
                              backgroundColor: m.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs font-bold bg-[#241645] text-[#FFF8EC] rounded-xl px-3 py-2 border-2 border-[#1A1336]">
                    🎙️ Gizmo: &ldquo;Masterful mashup of every single prop! Plus, every new run escalates your{' '}
                    <span className="text-[#FFD13B]">Mayhem Level</span> for faster timers, wilder twists &amp; bigger Coin/XP multipliers!&rdquo;
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setStep(3);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#3B266E] border-2 border-[#1A1336] text-xs font-black cursor-pointer">
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      gameAudio.playCoinPickup();
                      onFinishTutorial();
                    }}
                    data-testid="tutorial-complete-button"
                    className="px-6 py-3 rounded-2xl bg-[#2CEAA3] hover:bg-[#52f2b6] text-[#1A1336] border-[3px] border-[#1A1336] shadow-[0_4px_0_#1A1336] text-xs sm:text-sm font-black uppercase cursor-pointer active:translate-y-0.5 transition-transform">
                    🎉 Enter Mashup Hub &amp; Play!
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
