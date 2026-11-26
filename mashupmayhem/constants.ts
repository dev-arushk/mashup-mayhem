import {MusicTrack, SpriteConfig} from './utils/helper';

/**
 * The ID of the game.
 */
export const GAME_ID = 'mashup_mayhem';

/**
 * Classic 2D OG Party Game Theme Tokens
 */
export const THEME = {
  ink: '#1A1336',
  stageDeep: '#1B113A',
  stagePlum: '#2A1854',
  cardCream: '#FFF8EC',
  cardSlate: '#25184A',
  gold: '#FFD13B',
  coral: '#FF4D79',
  mint: '#2CEAA3',
  cyan: '#38E8FF',
  violet: '#7C4DFF',
  fontFamily: "'Fredoka', 'Nunito', sans-serif",
  bodyFontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif",
  borderWidth: 3,
  radiusLg: 18,
  radiusMd: 12,
};

/**
 * Configuration values for the game.
 */
export const CONFIG = {
  title: {
    value: 'Mashup Mayhem',
    type: 'string',
    label: 'Game Title',
    group: 'GAME',
  },
  baseCanvasWidth: {
    value: 960,
    type: 'number',
    label: 'Base Canvas Width',
    group: 'GAME',
  },
  baseCanvasHeight: {
    value: 540,
    type: 'number',
    label: 'Base Canvas Height',
    group: 'GAME',
  },
  width: {
    value: 960,
    type: 'number',
    label: 'Width',
    group: 'System',
  },
  height: {
    value: 540,
    type: 'number',
    label: 'Height',
    group: 'System',
  },
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 2,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },
  syncIntervalMs: {
    value: 1000 / 30,
    type: 'number',
    label: 'Network Sync Interval MS',
    group: 'System',
  },
  inputSyncIntervalMs: {
    value: 1000 / 30,
    type: 'number',
    label: 'Input Sync Interval MS',
    group: 'System',
  },
  backgroundColor: {
    value: '#1B113A',
    type: 'color',
    label: 'Background Color',
    group: 'Visuals',
  },
  textColor: {
    value: '#FFF8EC',
    type: 'color',
    label: 'Text Color',
    group: 'Visuals',
  },
  primaryColor: {
    value: '#FFD13B',
    type: 'color',
    label: 'Primary Color',
    group: 'Visuals',
  },
  secondaryColor: {
    value: '#2CEAA3',
    type: 'color',
    label: 'Secondary Color',
    group: 'Visuals',
  },
  accentColor: {
    value: '#FF4D79',
    type: 'color',
    label: 'Accent Color',
    group: 'Visuals',
  },
  fontFamily: {
    value: "'Fredoka', 'Nunito', sans-serif",
    type: 'string',
    label: 'Font Family',
    group: 'THEME',
  },
  playerSprite: {
    value: undefined as SpriteConfig | undefined,
    type: 'sprite',
    label: 'Player Sprite',
    group: 'Visuals',
  },
  backgroundMusicUrl: {
    value: 'assets/audio/bgm_round_showdown.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'Audio',
  },
  lobbyMusicUrl: {
    value: 'assets/audio/bgm_lobby_party.mp3',
    type: 'string',
    label: 'Lobby Music URL',
    group: 'Audio',
  },
  defaultMusicVolume: {
    value: 0.35,
    type: 'number',
    label: 'Default Music Volume',
    group: 'AUDIO',
  },
  defaultSfxVolume: {
    value: 0.65,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'AUDIO',
  },
  tournamentRounds: {
    value: 3,
    type: 'number',
    label: 'Tournament Rounds',
    group: 'Tournament',
  },
  maxPlayers: {
    value: 4,
    type: 'number',
    label: 'Max Lobby Players',
    group: 'Tournament',
  },
  activePlayersCount: {
    value: 4,
    type: 'number',
    label: 'Active Players Per Match',
    group: 'Tournament',
  },

  // --- Mashup Mayhem Gameplay Rules ---
  classicWriteSeconds: {
    value: 45,
    type: 'number',
    label: 'Classic Write Timer (s)',
    group: 'Rules',
  },
  speedWriteSeconds: {
    value: 10,
    type: 'number',
    label: 'Speed Madness Timer (s)',
    group: 'Rules',
  },
  voteSeconds: {
    value: 20,
    type: 'number',
    label: 'Voting Timer (s)',
    group: 'Rules',
  },
  countdownSeconds: {
    value: 2.5,
    type: 'number',
    label: 'Countdown Duration (s)',
    group: 'Rules',
  },
  wildcardSeconds: {
    value: 3.5,
    type: 'number',
    label: 'Wildcard Wheel Duration (s)',
    group: 'Rules',
  },
  revealSeconds: {
    value: 4,
    type: 'number',
    label: 'Object Reveal Duration (s)',
    group: 'Rules',
  },
  judgeSeconds: {
    value: 8,
    type: 'number',
    label: 'AI Judge Showcase (s)',
    group: 'Rules',
  },
  scoreboardSeconds: {
    value: 5,
    type: 'number',
    label: 'Scoreboard Pause (s)',
    group: 'Rules',
  },
  objectsPerRound: {
    value: 3,
    type: 'number',
    label: 'Objects Per Round',
    group: 'Rules',
  },
  aiJudgeWeight: {
    value: 60,
    type: 'number',
    label: 'AI Judge Weight (%)',
    group: 'Rules',
  },
  wildcardChance: {
    value: 0.45,
    type: 'number',
    label: 'Wildcard Trigger Chance',
    group: 'Rules',
  },
  earlySubmitBonus: {
    value: 5,
    type: 'number',
    label: 'Early Submit Speed Bonus',
    group: 'Rules',
  },
  maxAnswerLength: {
    value: 220,
    type: 'number',
    label: 'Max Answer Characters',
    group: 'Rules',
  },

  // --- Asset Resolutions & Aspect Ratios (from read_assets_metadata) ---
  assetStageBackdropAspectRatio: {
    value: 1376 / 768,
    type: 'number',
    label: 'Stage Backdrop Aspect Ratio',
    group: 'ASSETS',
  },
  assetStageBackdropWidth: {
    value: 960,
    type: 'number',
    label: 'Stage Backdrop Width',
    group: 'ASSETS',
  },
  assetStageBackdropHeight: {
    value: Math.round(960 / (1376 / 768)),
    type: 'number',
    label: 'Stage Backdrop Height',
    group: 'ASSETS',
  },

  assetHostGizmoAspectRatio: {
    value: 512 / 512,
    type: 'number',
    label: 'Host Gizmo Frame Aspect Ratio',
    group: 'ASSETS',
  },
  assetHostGizmoWidth: {
    value: 150,
    type: 'number',
    label: 'Host Gizmo Width',
    group: 'ASSETS',
  },
  assetHostGizmoHeight: {
    value: 150,
    type: 'number',
    label: 'Host Gizmo Height',
    group: 'ASSETS',
  },

  assetWildcardWheelAspectRatio: {
    value: 750 / 749,
    type: 'number',
    label: 'Wildcard Wheel Aspect Ratio',
    group: 'ASSETS',
  },
  assetWildcardWheelWidth: {
    value: 220,
    type: 'number',
    label: 'Wildcard Wheel Width',
    group: 'ASSETS',
  },
  assetWildcardWheelHeight: {
    value: Math.round(220 / (750 / 749)),
    type: 'number',
    label: 'Wildcard Wheel Height',
    group: 'ASSETS',
  },

  assetMysteryCubeAspectRatio: {
    value: 586 / 621,
    type: 'number',
    label: 'Mystery Cube Aspect Ratio',
    group: 'ASSETS',
  },
  assetMysteryCubeWidth: {
    value: 96,
    type: 'number',
    label: 'Mystery Cube Width',
    group: 'ASSETS',
  },
  assetMysteryCubeHeight: {
    value: Math.round(96 / (586 / 621)),
    type: 'number',
    label: 'Mystery Cube Height',
    group: 'ASSETS',
  },

  assetCoinTokenAspectRatio: {
    value: 565 / 698,
    type: 'number',
    label: 'Coin Token Aspect Ratio',
    group: 'ASSETS',
  },
  assetCoinTokenWidth: {
    value: 28,
    type: 'number',
    label: 'Coin Token Width',
    group: 'ASSETS',
  },
  assetCoinTokenHeight: {
    value: Math.round(28 / (565 / 698)),
    type: 'number',
    label: 'Coin Token Height',
    group: 'ASSETS',
  },

  assetTrophyCrownAspectRatio: {
    value: 766 / 613,
    type: 'number',
    label: 'Trophy Crown Aspect Ratio',
    group: 'ASSETS',
  },
  assetTrophyCrownWidth: {
    value: 84,
    type: 'number',
    label: 'Trophy Crown Width',
    group: 'ASSETS',
  },
  assetTrophyCrownHeight: {
    value: Math.round(84 / (766 / 613)),
    type: 'number',
    label: 'Trophy Crown Height',
    group: 'ASSETS',
  },

  assetAvatarPickleAspectRatio: {
    value: 435 / 685,
    type: 'number',
    label: 'Pickle Avatar Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarPickleHeight: {
    value: 76,
    type: 'number',
    label: 'Pickle Avatar Height',
    group: 'ASSETS',
  },
  assetAvatarPickleWidth: {
    value: Math.round(76 * (435 / 685)),
    type: 'number',
    label: 'Pickle Avatar Width',
    group: 'ASSETS',
  },

  assetAvatarAstroCatAspectRatio: {
    value: 572 / 665,
    type: 'number',
    label: 'Astro Cat Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarAstroCatHeight: {
    value: 76,
    type: 'number',
    label: 'Astro Cat Height',
    group: 'ASSETS',
  },
  assetAvatarAstroCatWidth: {
    value: Math.round(76 * (572 / 665)),
    type: 'number',
    label: 'Astro Cat Width',
    group: 'ASSETS',
  },

  assetAvatarToasterKnightAspectRatio: {
    value: 535 / 695,
    type: 'number',
    label: 'Toaster Knight Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarToasterKnightHeight: {
    value: 76,
    type: 'number',
    label: 'Toaster Knight Height',
    group: 'ASSETS',
  },
  assetAvatarToasterKnightWidth: {
    value: Math.round(76 * (535 / 695)),
    type: 'number',
    label: 'Toaster Knight Width',
    group: 'ASSETS',
  },

  assetAvatarDiscoOctopusAspectRatio: {
    value: 700 / 684,
    type: 'number',
    label: 'Disco Octopus Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarDiscoOctopusHeight: {
    value: 76,
    type: 'number',
    label: 'Disco Octopus Height',
    group: 'ASSETS',
  },
  assetAvatarDiscoOctopusWidth: {
    value: Math.round(76 * (700 / 684)),
    type: 'number',
    label: 'Disco Octopus Width',
    group: 'ASSETS',
  },

  assetAvatarDetectiveTacoAspectRatio: {
    value: 716 / 605,
    type: 'number',
    label: 'Detective Taco Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarDetectiveTacoHeight: {
    value: 76,
    type: 'number',
    label: 'Detective Taco Height',
    group: 'ASSETS',
  },
  assetAvatarDetectiveTacoWidth: {
    value: Math.round(76 * (716 / 605)),
    type: 'number',
    label: 'Detective Taco Width',
    group: 'ASSETS',
  },

  assetAvatarNinjaCactusAspectRatio: {
    value: 487 / 621,
    type: 'number',
    label: 'Ninja Cactus Aspect Ratio',
    group: 'ASSETS',
  },
  assetAvatarNinjaCactusHeight: {
    value: 76,
    type: 'number',
    label: 'Ninja Cactus Height',
    group: 'ASSETS',
  },
  assetAvatarNinjaCactusWidth: {
    value: Math.round(76 * (487 / 621)),
    type: 'number',
    label: 'Ninja Cactus Width',
    group: 'ASSETS',
  },
};

// Merge customized config values if present (injected by Playground)
const {playgroundConfig} = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const PRESETS = {};

export const AVAILABLE_MUSIC_TRACKS: MusicTrack[] = [
  {
    name: 'bgm_lobby_party',
    url: 'assets/audio/bgm_lobby_party.mp3',
    description: 'Upbeat funky game show lobby music.',
  },
  {
    name: 'bgm_round_showdown',
    url: 'assets/audio/bgm_round_showdown.mp3',
    description: 'High-energy game show round challenge track.',
  },
];
