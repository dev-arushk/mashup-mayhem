export type ObjectCategory =
  | 'Kitchen'
  | 'Sci-Fi'
  | 'Medieval'
  | 'Office'
  | 'Nature'
  | 'Absurdity';

export interface MashupObject {
  id: string;
  name: string;
  category: ObjectCategory;
  icon: string;
  keywords: string[];
}

export interface CreativeRestriction {
  id: string;
  label: string;
  description: string;
  type: 'BANNED_LETTER' | 'MAX_WORDS' | 'NO_COMMON_WORDS' | 'TONE_TWIST' | 'MUST_INCLUDE';
  param?: string | number;
}

export type WildcardType =
  | 'DOUBLE_POINTS'
  | 'MYSTERY_OBJECT'
  | 'OBJECT_SWAP'
  | 'REVERSE_CHALLENGE'
  | 'NO_COMMON_WORDS'
  | 'SUDDEN_DEATH';

export interface WildcardModifier {
  id: WildcardType;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
}

export type GameModeId =
  | 'CLASSIC'
  | 'TEAM_CHAOS'
  | 'SPEED_MADNESS'
  | 'IMPOSSIBLE'
  | 'TOURNAMENT'
  | 'DAILY_MAYHEM'
  | 'CUSTOM';

export interface GameModeMeta {
  id: GameModeId;
  name: string;
  tagline: string;
  icon: string;
  rounds: number;
  writeSeconds: number;
  objectsCount: number;
  wildcardsEnabled: boolean;
  strictRestriction: boolean;
  teamMode: boolean;
  aiWeight: number;
}

export interface AvatarMeta {
  id: string;
  name: string;
  assetKey: string;
  imagePath: string;
  aspectConfigKey: string;
  unlockCost: number;
  unlockLevel: number;
  tagline: string;
}

export interface BotPersona {
  id: string;
  name: string;
  persona: string;
  avatarId: string;
  styleOpeners: string[];
  styleConnectors: string[];
  styleClosers: string[];
}

export const AVATAR_CATALOG: AvatarMeta[] = [
  {
    id: 'avatar_pickle',
    name: 'Professor Pickle',
    assetKey: 'avatar_pickle',
    imagePath: 'assets/images/avatar_pickle.png',
    aspectConfigKey: 'assetAvatarPickleAspectRatio',
    unlockCost: 0,
    unlockLevel: 1,
    tagline: 'Tenured scholar of crunchy logic.',
  },
  {
    id: 'avatar_astro_cat',
    name: 'Astro Cat',
    assetKey: 'avatar_astro_cat',
    imagePath: 'assets/images/avatar_astro_cat.png',
    aspectConfigKey: 'assetAvatarAstroCatAspectRatio',
    unlockCost: 0,
    unlockLevel: 1,
    tagline: 'Zero-gravity zoomies specialist.',
  },
  {
    id: 'avatar_toaster_knight',
    name: 'Toaster Knight',
    assetKey: 'avatar_toaster_knight',
    imagePath: 'assets/images/avatar_toaster_knight.png',
    aspectConfigKey: 'assetAvatarToasterKnightAspectRatio',
    unlockCost: 0,
    unlockLevel: 1,
    tagline: 'Sworn protector of golden-brown toast.',
  },
  {
    id: 'avatar_disco_octopus',
    name: 'Disco Octopus',
    assetKey: 'avatar_disco_octopus',
    imagePath: 'assets/images/avatar_disco_octopus.png',
    aspectConfigKey: 'assetAvatarDiscoOctopusAspectRatio',
    unlockCost: 120,
    unlockLevel: 2,
    tagline: 'Eight arms, infinite funk.',
  },
  {
    id: 'avatar_detective_taco',
    name: 'Detective Taco',
    assetKey: 'avatar_detective_taco',
    imagePath: 'assets/images/avatar_detective_taco.png',
    aspectConfigKey: 'assetAvatarDetectiveTacoAspectRatio',
    unlockCost: 200,
    unlockLevel: 3,
    tagline: 'Cracking crunchy mysteries since Tuesday.',
  },
  {
    id: 'avatar_ninja_cactus',
    name: 'Ninja Cactus',
    assetKey: 'avatar_ninja_cactus',
    imagePath: 'assets/images/avatar_ninja_cactus.png',
    aspectConfigKey: 'assetAvatarNinjaCactusAspectRatio',
    unlockCost: 300,
    unlockLevel: 4,
    tagline: 'Silent, sharp, and oddly hydrated.',
  },
];

export const GAME_MODES: GameModeMeta[] = [
  {
    id: 'CLASSIC',
    name: 'Classic Mayhem',
    tagline: '3 wild objects, 45s timer, surprise Wildcards.',
    icon: '🎭',
    rounds: 3,
    writeSeconds: 45,
    objectsCount: 3,
    wildcardsEnabled: true,
    strictRestriction: false,
    teamMode: false,
    aiWeight: 60,
  },
  {
    id: 'TEAM_CHAOS',
    name: 'Team Chaos',
    tagline: '2 rival squads share team chat & unified pitches.',
    icon: '🤝',
    rounds: 3,
    writeSeconds: 45,
    objectsCount: 3,
    wildcardsEnabled: true,
    strictRestriction: false,
    teamMode: true,
    aiWeight: 60,
  },
  {
    id: 'SPEED_MADNESS',
    name: 'Speed Madness',
    tagline: '10-second panic sprints across 6 lightning rounds!',
    icon: '⚡',
    rounds: 6,
    writeSeconds: 10,
    objectsCount: 3,
    wildcardsEnabled: true,
    strictRestriction: false,
    teamMode: false,
    aiWeight: 60,
  },
  {
    id: 'IMPOSSIBLE',
    name: 'Impossible Mode',
    tagline: '5 bizarre objects + strict creative restrictions!',
    icon: '🔥',
    rounds: 3,
    writeSeconds: 50,
    objectsCount: 5,
    wildcardsEnabled: true,
    strictRestriction: true,
    teamMode: false,
    aiWeight: 65,
  },
  {
    id: 'TOURNAMENT',
    name: 'Tournament Bracket',
    tagline: 'Qualifier -> Semi -> Final knockout with bots!',
    icon: '🏆',
    rounds: 4,
    writeSeconds: 35,
    objectsCount: 3,
    wildcardsEnabled: true,
    strictRestriction: false,
    teamMode: false,
    aiWeight: 60,
  },
  {
    id: 'DAILY_MAYHEM',
    name: 'Daily Mayhem',
    tagline: "Today's date-seeded global challenge combo.",
    icon: '📅',
    rounds: 3,
    writeSeconds: 45,
    objectsCount: 4,
    wildcardsEnabled: false,
    strictRestriction: true,
    teamMode: false,
    aiWeight: 70,
  },
  {
    id: 'CUSTOM',
    name: 'Custom Battles',
    tagline: 'Host workshop: custom situations, items & rules.',
    icon: '🛠️',
    rounds: 3,
    writeSeconds: 40,
    objectsCount: 3,
    wildcardsEnabled: true,
    strictRestriction: false,
    teamMode: false,
    aiWeight: 60,
  },
];

export const WILDCARDS: Record<WildcardType, WildcardModifier> = {
  DOUBLE_POINTS: {
    id: 'DOUBLE_POINTS',
    name: 'Double Points',
    badge: '2X SCORE',
    description: 'Every point scored this round is DOUBLED!',
    accentColor: '#FFD13B',
  },
  MYSTERY_OBJECT: {
    id: 'MYSTERY_OBJECT',
    name: 'Mystery Object',
    badge: '? MYSTERY',
    description: 'One item stays hidden as a ? box until halfway through writing!',
    accentColor: '#7C4DFF',
  },
  OBJECT_SWAP: {
    id: 'OBJECT_SWAP',
    name: 'Object Swap',
    badge: 'SWAP!',
    description: 'Mid-round plot twist: one item swaps with a surprise spare!',
    accentColor: '#38E8FF',
  },
  REVERSE_CHALLENGE: {
    id: 'REVERSE_CHALLENGE',
    name: 'Reverse Challenge',
    badge: 'FAIL BIG',
    description: 'Invent the ABSOLUTE WORST, most disastrous way to fail!',
    accentColor: '#FF4D79',
  },
  NO_COMMON_WORDS: {
    id: 'NO_COMMON_WORDS',
    name: 'No-Common-Words',
    badge: 'BAN: THE/AND',
    description: 'Banned filler words: "the", "and", "with", "use"! Keep it punchy!',
    accentColor: '#2CEAA3',
  },
  SUDDEN_DEATH: {
    id: 'SUDDEN_DEATH',
    name: 'Sudden Death',
    badge: 'BONUS KO',
    description: 'High stakes! Lowest scorer takes a -15 pt hazard penalty!',
    accentColor: '#FF4D79',
  },
};

export const BOT_PERSONAS: BotPersona[] = [
  {
    id: 'bot_engineer',
    name: 'Literal Engineer',
    persona: 'Over-specifies absurd duct-tape physics',
    avatarId: 'avatar_toaster_knight',
    styleOpeners: ['Step 1: Calibrate', 'Simply weld', 'Apply 400 PSI to'],
    styleConnectors: ['coupled directly to', 'which converts torque into', 'acting as a makeshift'],
    styleClosers: ['— problem solved within 0.2% tolerance.', 'for maximum structural absurdity.', 'using questionable thermodynamics.'],
  },
  {
    id: 'bot_villain',
    name: 'Dramatic Villain',
    persona: 'Monologues like a Saturday-morning mastermind',
    avatarId: 'avatar_disco_octopus',
    styleOpeners: ['BEHOLD! I weaponize', 'Fools! I shall combine', 'Mwahahaha! Harness'],
    styleConnectors: ['fused with the unstoppable power of', 'while dramatically hurling', 'to summon'],
    styleClosers: ['and claim eternal victory!', 'while my cape billows indoors!', 'before anyone can stop my monologue!'],
  },
  {
    id: 'bot_goblin',
    name: 'Chaotic Goblin',
    persona: 'Unfiltered gremlin energy',
    avatarId: 'avatar_ninja_cactus',
    styleOpeners: ['Yeet', 'Stuff', 'Gremlin plan: tape'],
    styleConnectors: ['straight onto', 'shove it inside', 'and sprint wildly with'],
    styleClosers: ['while screaming at top volume!', 'and blame gravity later!', 'boom, instant legend.'],
  },
  {
    id: 'bot_chef',
    name: 'Overconfident Chef',
    persona: 'Treats every crisis like a Michelin dish',
    avatarId: 'avatar_detective_taco',
    styleOpeners: ['First, flambé', 'Gently marinate', 'Plate up'],
    styleConnectors: ['garnished with a crisp reduction of', 'folded delicately into', 'seasoned generously by'],
    styleClosers: ['— chef’s kiss, crisis served medium-rare!', 'for a five-star disaster!', 'and garnish with raw confidence!'],
  },
  {
    id: 'bot_professor',
    name: 'Professor Pickle',
    persona: 'Pompous academic citing fake science',
    avatarId: 'avatar_pickle',
    styleOpeners: ['According to Pickle Theory, balance', 'Hypothesize using', 'Peer-reviewed chaos proves'],
    styleConnectors: ['creates quantum synergy with', 'catalyzing a chain reaction of', 'while balancing'],
    styleClosers: ['earning an immediate honorary doctorate.', 'as proven in Volume 9 of Weird Science.', 'Q.E.D.!'],
  },
  {
    id: 'bot_cadet',
    name: 'Astro Cat',
    persona: 'Treats Earth problems like space missions',
    avatarId: 'avatar_astro_cat',
    styleOpeners: ['Houston, deploy', 'Engage thrusters on', 'Orbit-drop'],
    styleConnectors: ['docked straight into', 'boosting at warp speed past', 'shielded by'],
    styleClosers: ['and land safely for tuna snacks!', 'for one giant leap for catkind!', 'mission purr-fect!'],
  },
];

// 120 Distinct Bizarre Objects (20 per Category x 6 Categories)
export const OBJECT_LIBRARY: MashupObject[] = [
  // Kitchen (20)
  {id: 'k1', name: 'Rubber Spatula', category: 'Kitchen', icon: '🍳', keywords: ['spatula', 'flip', 'rubber']},
  {id: 'k2', name: 'Frozen Burrito', category: 'Kitchen', icon: '🌯', keywords: ['burrito', 'frozen', 'bean']},
  {id: 'k3', name: 'Singing Toaster', category: 'Kitchen', icon: '🍞', keywords: ['toaster', 'toast', 'sing']},
  {id: 'k4', name: 'Jar of Spicy Mayo', category: 'Kitchen', icon: '🫙', keywords: ['mayo', 'jar', 'spicy', 'sauce']},
  {id: 'k5', name: 'Giant Whisk', category: 'Kitchen', icon: '🥣', keywords: ['whisk', 'spin', 'stir']},
  {id: 'k6', name: 'Self-Heating Teapot', category: 'Kitchen', icon: '🫖', keywords: ['teapot', 'steam', 'tea', 'hot']},
  {id: 'k7', name: 'Waffle Iron', category: 'Kitchen', icon: '🧇', keywords: ['waffle', 'iron', 'clamp', 'press']},
  {id: 'k8', name: 'Soggy Baguette', category: 'Kitchen', icon: '🥖', keywords: ['baguette', 'bread', 'loaf']},
  {id: 'k9', name: 'Cheese Grater', category: 'Kitchen', icon: '🧀', keywords: ['grater', 'cheese', 'shred']},
  {id: 'k10', name: 'Sizzling Bacon Strip', category: 'Kitchen', icon: '🥓', keywords: ['bacon', 'grease', 'sizzle']},
  {id: 'k11', name: 'Blender Without Lid', category: 'Kitchen', icon: '🥤', keywords: ['blender', 'spin', 'spray']},
  {id: 'k12', name: 'Garlic Press', category: 'Kitchen', icon: '🧄', keywords: ['garlic', 'press', 'smell']},
  {id: 'k13', name: 'Rolling Pin', category: 'Kitchen', icon: '🪵', keywords: ['rolling', 'pin', 'flatten']},
  {id: 'k14', name: 'Exploding Popcorn Bag', category: 'Kitchen', icon: '🍿', keywords: ['popcorn', 'pop', 'explode']},
  {id: 'k15', name: 'Slippery Banana Peel', category: 'Kitchen', icon: '🍌', keywords: ['banana', 'peel', 'slip']},
  {id: 'k16', name: 'Ice Cream Scoop', category: 'Kitchen', icon: '🍨', keywords: ['scoop', 'ice', 'cream']},
  {id: 'k17', name: 'Microwave Door', category: 'Kitchen', icon: '📦', keywords: ['microwave', 'door', 'shield']},
  {id: 'k18', name: 'Hot Sauce Bottle', category: 'Kitchen', icon: '🌶️', keywords: ['hot', 'sauce', 'spicy', 'fire']},
  {id: 'k19', name: 'Noodle Strainer', category: 'Kitchen', icon: '🍝', keywords: ['strainer', 'colander', 'helmet']},
  {id: 'k20', name: 'Butter Stick', category: 'Kitchen', icon: '🧈', keywords: ['butter', 'grease', 'slide']},

  // Sci-Fi (20)
  {id: 's1', name: 'Anti-Gravity Boot', category: 'Sci-Fi', icon: '🥾', keywords: ['boot', 'gravity', 'float']},
  {id: 's2', name: 'Shrink Ray', category: 'Sci-Fi', icon: '🔫', keywords: ['shrink', 'ray', 'tiny', 'laser']},
  {id: 's3', name: 'Hologram Projector', category: 'Sci-Fi', icon: '📽️', keywords: ['hologram', 'illusion', 'decoy']},
  {id: 's4', name: 'Jetpack With 3% Fuel', category: 'Sci-Fi', icon: '🚀', keywords: ['jetpack', 'fuel', 'fly', 'boost']},
  {id: 's5', name: 'Teleporter Mug', category: 'Sci-Fi', icon: '☕', keywords: ['teleport', 'mug', 'warp']},
  {id: 's6', name: 'Sarcastic AI Watch', category: 'Sci-Fi', icon: '⌚', keywords: ['watch', 'ai', 'talk', 'roast']},
  {id: 's7', name: 'Plasma Bubble Gum', category: 'Sci-Fi', icon: '🫧', keywords: ['plasma', 'bubble', 'gum', 'glow']},
  {id: 's8', name: 'Time-Freeze Remote', category: 'Sci-Fi', icon: '🎛️', keywords: ['time', 'freeze', 'remote', 'pause']},
  {id: 's9', name: 'Tractor Beam Flashlight', category: 'Sci-Fi', icon: '🔦', keywords: ['tractor', 'beam', 'flashlight', 'pull']},
  {id: 's10', name: 'Zero-G Slime Blob', category: 'Sci-Fi', icon: '🧪', keywords: ['slime', 'blob', 'goo', 'sticky']},
  {id: 's11', name: 'Laser Spoon', category: 'Sci-Fi', icon: '🥄', keywords: ['laser', 'spoon', 'cut']},
  {id: 's12', name: 'Quantum Magnet', category: 'Sci-Fi', icon: '🧲', keywords: ['magnet', 'quantum', 'pull']},
  {id: 's13', name: 'Alien Translator Kazoo', category: 'Sci-Fi', icon: '🎺', keywords: ['kazoo', 'alien', 'translate']},
  {id: 's14', name: 'Hover Skateboard', category: 'Sci-Fi', icon: '🛹', keywords: ['hover', 'board', 'skate']},
  {id: 's15', name: 'Neon Forcefield Umbrella', category: 'Sci-Fi', icon: '☂️', keywords: ['forcefield', 'umbrella', 'shield']},
  {id: 's16', name: 'Clone-Self Sticker', category: 'Sci-Fi', icon: '🏷️', keywords: ['clone', 'sticker', 'copy']},
  {id: 's17', name: 'Asteroid Pebble', category: 'Sci-Fi', icon: '☄️', keywords: ['asteroid', 'rock', 'space']},
  {id: 's18', name: 'Robot Vacuum', category: 'Sci-Fi', icon: '🤖', keywords: ['robot', 'vacuum', 'suck', 'clean']},
  {id: 's19', name: 'Solar-Powered Disco Ball', category: 'Sci-Fi', icon: '🪩', keywords: ['disco', 'ball', 'reflect', 'shine']},
  {id: 's20', name: 'Wormhole Sock', category: 'Sci-Fi', icon: '🧦', keywords: ['wormhole', 'sock', 'portal']},

  // Medieval (20)
  {id: 'm1', name: 'Rusty Catapult', category: 'Medieval', icon: '🏰', keywords: ['catapult', 'launch', 'fling']},
  {id: 'm2', name: 'Jester Bells Hat', category: 'Medieval', icon: '🃏', keywords: ['jester', 'hat', 'bells', 'distract']},
  {id: 'm3', name: 'Dragon Egg', category: 'Medieval', icon: '🥚', keywords: ['dragon', 'egg', 'hatch', 'fire']},
  {id: 'm4', name: 'Foam Broadsword', category: 'Medieval', icon: '⚔️', keywords: ['sword', 'foam', 'whack']},
  {id: 'm5', name: 'Wooden Shield', category: 'Medieval', icon: '🛡️', keywords: ['shield', 'block', 'wood']},
  {id: 'm6', name: 'Squeaky Bagpipes', category: 'Medieval', icon: '🎶', keywords: ['bagpipes', 'loud', 'music']},
  {id: 'm7', name: 'Potion of Mild Hiccups', category: 'Medieval', icon: '⚗️', keywords: ['potion', 'hiccup', 'drink']},
  {id: 'm8', name: 'Knight Helmet', category: 'Medieval', icon: '🪖', keywords: ['helmet', 'visor', 'armor']},
  {id: 'm9', name: 'Grappling Hook', category: 'Medieval', icon: '🪝', keywords: ['grappling', 'hook', 'rope', 'climb']},
  {id: 'm10', name: 'Giant Turkey Leg', category: 'Medieval', icon: '🍗', keywords: ['turkey', 'leg', 'bait', 'eat']},
  {id: 'm11', name: 'Royal Wax Seal', category: 'Medieval', icon: '📜', keywords: ['royal', 'seal', 'stamp', 'scroll']},
  {id: 'm12', name: 'Moat Frog', category: 'Medieval', icon: '🐸', keywords: ['frog', 'moat', 'hop']},
  {id: 'm13', name: 'Torch With Sparklers', category: 'Medieval', icon: '🔥', keywords: ['torch', 'sparkler', 'fire']},
  {id: 'm14', name: 'Wooden Barrel', category: 'Medieval', icon: '🛢️', keywords: ['barrel', 'hide', 'roll']},
  {id: 'm15', name: 'Wizard Beard', category: 'Medieval', icon: '🧙', keywords: ['wizard', 'beard', 'disguise']},
  {id: 'm16', name: 'Hourglass Full of Glitter', category: 'Medieval', icon: '⏳', keywords: ['hourglass', 'glitter', 'sand']},
  {id: 'm17', name: 'Drawbridge Chain', category: 'Medieval', icon: '⛓️', keywords: ['chain', 'pull', 'heavy']},
  {id: 'm18', name: 'Pigeon Messenger', category: 'Medieval', icon: '🕊️', keywords: ['pigeon', 'fly', 'message']},
  {id: 'm19', name: 'Enchanted Broomstick', category: 'Medieval', icon: '🧹', keywords: ['broom', 'fly', 'sweep']},
  {id: 'm20', name: 'Golden Goblet', category: 'Medieval', icon: '🏆', keywords: ['goblet', 'cup', 'gold']},

  // Office (20)
  {id: 'o1', name: 'Red Stapler', category: 'Office', icon: '📎', keywords: ['stapler', 'staple', 'clip']},
  {id: 'o2', name: 'Spinning Swivel Chair', category: 'Office', icon: '🪑', keywords: ['chair', 'spin', 'roll', 'wheel']},
  {id: 'o3', name: 'Sticky Note Pad', category: 'Office', icon: '🟨', keywords: ['sticky', 'note', 'paper']},
  {id: 'o4', name: 'Jammed Printer', category: 'Office', icon: '🖨️', keywords: ['printer', 'jam', 'paper']},
  {id: 'o5', name: 'Mega Rubber Band', category: 'Office', icon: '➰', keywords: ['rubber', 'band', 'slingshot', 'snap']},
  {id: 'o6', name: 'Whiteboard Marker', category: 'Office', icon: '🖊️', keywords: ['marker', 'draw', 'write']},
  {id: 'o7', name: 'Paper Airplane', category: 'Office', icon: '✈️', keywords: ['airplane', 'glide', 'paper']},
  {id: 'o8', name: 'Shredder Bin', category: 'Office', icon: '🗑️', keywords: ['shredder', 'shred', 'bin']},
  {id: 'o9', name: 'Cold Espresso Shot', category: 'Office', icon: '🥤', keywords: ['espresso', 'coffee', 'caffeine']},
  {id: 'o10', name: 'Laser Pointer', category: 'Office', icon: '🔴', keywords: ['laser', 'pointer', 'dot']},
  {id: 'o11', name: 'Duct Tape Roll', category: 'Office', icon: '🩹', keywords: ['tape', 'duct', 'stick', 'fix']},
  {id: 'o12', name: 'Wireless Mouse', category: 'Office', icon: '🖱️', keywords: ['mouse', 'click', 'throw']},
  {id: 'o13', name: 'Cardboard Archive Box', category: 'Office', icon: '📦', keywords: ['box', 'cardboard', 'hide']},
  {id: 'o14', name: 'Bullhorn Megaphone', category: 'Office', icon: '📣', keywords: ['megaphone', 'shout', 'loud']},
  {id: 'o15', name: 'Bubble Wrap Sheet', category: 'Office', icon: '🫧', keywords: ['bubble', 'wrap', 'pop', 'cushion']},
  {id: 'o16', name: 'Tangled Extension Cord', category: 'Office', icon: '🔌', keywords: ['cord', 'rope', 'tangle', 'tie']},
  {id: 'o17', name: 'Desk Fan', category: 'Office', icon: '🌀', keywords: ['fan', 'wind', 'blow']},
  {id: 'o18', name: 'Motivational Poster', category: 'Office', icon: '🖼️', keywords: ['poster', 'inspire', 'cover']},
  {id: 'o19', name: 'Squeaky Stamp Pad', category: 'Office', icon: '🔖', keywords: ['stamp', 'ink', 'approved']},
  {id: 'o20', name: 'Ergonomic Footrest', category: 'Office', icon: '🧱', keywords: ['footrest', 'step', 'prop']},

  // Nature (20)
  {id: 'n1', name: 'Dramatic Llama', category: 'Nature', icon: '🦙', keywords: ['llama', 'spit', 'ride']},
  {id: 'n2', name: 'Potted Cactus', category: 'Nature', icon: '🌵', keywords: ['cactus', 'spike', 'prick']},
  {id: 'n3', name: 'Giant Pinecone', category: 'Nature', icon: '🌲', keywords: ['pinecone', 'throw', 'crunch']},
  {id: 'n4', name: 'Sleepy Sloth', category: 'Nature', icon: '🦥', keywords: ['sloth', 'hang', 'slow']},
  {id: 'n5', name: 'Electric Eel', category: 'Nature', icon: '⚡', keywords: ['eel', 'shock', 'zap', 'power']},
  {id: 'n6', name: 'Angry Goose', category: 'Nature', icon: '🪿', keywords: ['goose', 'honk', 'chase']},
  {id: 'n7', name: 'Giant Sunflower', category: 'Nature', icon: '🌻', keywords: ['sunflower', 'petal', 'seeds']},
  {id: 'n8', name: 'Bouncy Mushroom', category: 'Nature', icon: '🍄', keywords: ['mushroom', 'bounce', 'trampoline']},
  {id: 'n9', name: 'Acorn Stash', category: 'Nature', icon: '🌰', keywords: ['acorn', 'squirrel', 'snack']},
  {id: 'n10', name: 'Hollow Coconut', category: 'Nature', icon: '🥥', keywords: ['coconut', 'shell', 'milk']},
  {id: 'n11', name: 'Sticky Spiderweb', category: 'Nature', icon: '🕸️', keywords: ['web', 'trap', 'sticky']},
  {id: 'n12', name: 'Glowing Firefly Jar', category: 'Nature', icon: '✨', keywords: ['firefly', 'glow', 'light']},
  {id: 'n13', name: 'Fluffy Alpaca', category: 'Nature', icon: '🐑', keywords: ['alpaca', 'wool', 'soft']},
  {id: 'n14', name: 'Sneaky Raccoon', category: 'Nature', icon: '🦝', keywords: ['raccoon', 'steal', 'trash']},
  {id: 'n15', name: 'Giant Sea Sponge', category: 'Nature', icon: '🧽', keywords: ['sponge', 'soak', 'absorb']},
  {id: 'n16', name: 'Watermelon Helmet', category: 'Nature', icon: '🍉', keywords: ['watermelon', 'rind', 'smash']},
  {id: 'n17', name: 'Tumbleweed', category: 'Nature', icon: '🌾', keywords: ['tumbleweed', 'roll', 'dry']},
  {id: 'n18', name: 'Bamboo Pole', category: 'Nature', icon: '🎋', keywords: ['bamboo', 'pole', 'vault']},
  {id: 'n19', name: 'Honeycomb', category: 'Nature', icon: '🍯', keywords: ['honey', 'sticky', 'bees']},
  {id: 'n20', name: 'Pufferfish', category: 'Nature', icon: '🐡', keywords: ['pufferfish', 'inflate', 'spike']},

  // Absurdity (20)
  {id: 'a1', name: 'Inflatable Flamingo', category: 'Absurdity', icon: '🦩', keywords: ['flamingo', 'float', 'inflatable']},
  {id: 'a2', name: 'Rubber Chicken', category: 'Absurdity', icon: '🐔', keywords: ['chicken', 'squeak', 'rubber']},
  {id: 'a3', name: 'Disco Roller Skates', category: 'Absurdity', icon: '🛼', keywords: ['skates', 'roll', 'disco']},
  {id: 'a4', name: 'Whoopee Cushion', category: 'Absurdity', icon: '💨', keywords: ['cushion', 'whoopee', 'air', 'sound']},
  {id: 'a5', name: 'Accordion', category: 'Absurdity', icon: '🪗', keywords: ['accordion', 'squeeze', 'music']},
  {id: 'a6', name: 'Giant Foam Finger', category: 'Absurdity', icon: '☝️', keywords: ['foam', 'finger', 'point']},
  {id: 'a7', name: 'Unicycle With Square Wheel', category: 'Absurdity', icon: '🚲', keywords: ['unicycle', 'wheel', 'bump']},
  {id: 'a8', name: 'Confetti Cannon', category: 'Absurdity', icon: '🎉', keywords: ['confetti', 'cannon', 'blast']},
  {id: 'a9', name: 'Slinky', category: 'Absurdity', icon: '🌀', keywords: ['slinky', 'spring', 'coil']},
  {id: 'a10', name: 'Top Hat Full of Rabbits', category: 'Absurdity', icon: '🎩', keywords: ['hat', 'rabbit', 'magic']},
  {id: 'a11', name: 'Pool Noodle', category: 'Absurdity', icon: '🏊', keywords: ['pool', 'noodle', 'whack', 'float']},
  {id: 'a12', name: 'Giant Cardboard Cutout', category: 'Absurdity', icon: '🧍', keywords: ['cutout', 'decoy', 'cardboard']},
  {id: 'a13', name: 'Squeaky Clown Shoes', category: 'Absurdity', icon: '🤡', keywords: ['shoes', 'clown', 'squeak', 'big']},
  {id: 'a14', name: 'Yodeling Pickle', category: 'Absurdity', icon: '🥒', keywords: ['pickle', 'yodel', 'sing']},
  {id: 'a15', name: 'Pogo Stick', category: 'Absurdity', icon: '🦘', keywords: ['pogo', 'bounce', 'jump']},
  {id: 'a16', name: 'Velcro Suit', category: 'Absurdity', icon: '🦺', keywords: ['velcro', 'suit', 'stick']},
  {id: 'a17', name: 'Lava Lamp', category: 'Absurdity', icon: '🪔', keywords: ['lava', 'lamp', 'glow', 'blob']},
  {id: 'a18', name: 'Kazoo Choir', category: 'Absurdity', icon: '📯', keywords: ['kazoo', 'buzz', 'choir']},
  {id: 'a19', name: 'Piñata', category: 'Absurdity', icon: '🪅', keywords: ['pinata', 'candy', 'smash']},
  {id: 'a20', name: 'Invisible Ink Pen', category: 'Absurdity', icon: '🪄', keywords: ['invisible', 'ink', 'pen']},
];

// 120 Outrageous Situations
export const SITUATION_LIBRARY: string[] = [
  'Escape a slow-motion lava river inside a shopping mall.',
  'Convince an alien customs officer that Earth is totally normal.',
  'Win a talent show judged exclusively by grumpy cats.',
  'Rescue your lunch from a flock of tactical seagulls.',
  'Parallel park a cruise ship during a hurricane.',
  'Stop a runaway wedding cake rolling down a mountain.',
  'Survive a haunted IKEA after closing time.',
  'Explain why you are 4 hours late to a pirate captain.',
  'Defeat a giant robotic vacuum that gained self-awareness.',
  'Sneak past a sleeping dragon wearing tap shoes.',
  'Fix the moon after it accidentally drifts into your backyard.',
  'Pass a surprise ninja exam with zero training.',
  'Keep a snowball frozen inside a volcano.',
  'Entertain 500 impatient toddlers for three hours.',
  'Deliver a pizza to the bottom of the Mariana Trench.',
  'Outrun an avalanche made entirely of marshmallows.',
  'Win an Olympic gold medal in a sport you just invented.',
  'Hide an elephant in a tiny studio apartment during inspection.',
  'Stop a sneeze during the quietest chess championship ever.',
  'Build a bridge across a canyon in under 60 seconds.',
  'Negotiate peace between rival squirrel gangs.',
  'Survive Monday morning when gravity flips sideways.',
  'Put out a birthday cake fire that grew to skyscraper size.',
  'Steal back your favorite hat from a clever octopus.',
  'Host a cooking show when all appliances are haunted.',
  'Cross a moat filled with electric jellyfish.',
  'Prove to a time traveler that the year 2026 is awesome.',
  'Escape a locked escape room designed by a hyperactive raccoon.',
  'Keep your balance on a surfboard balanced on a unicycle.',
  'Impress a medieval king who hates everything boring.',
  'Rescue a satellite stuck in your neighbor’s tree.',
  'Win a dance-off against a disco-powered robot.',
  'Stop an evil chef from turning the ocean into soup.',
  'Catch a greased-up trophy sliding down an icy hill.',
  'Replace the lead singer of a rock band with 10 seconds notice.',
  'Safely land a hot-air balloon made of bedsheets.',
  'Disarm a glitter bomb in a tuxedo.',
  'Survive a desert island with only weird party leftovers.',
  'Get an autograph from a shy Yeti.',
  'Cool down an overheating spaceship reactor.',
  'Win hide-and-seek against a champion bloodhound.',
  'Stop a runaway shopping cart hurtling toward a glass museum.',
  'Pass a driving test on a rocket-powered tricycle.',
  'Silence a choir of opera-singing frogs before bedtime.',
  'Retrieve your keys from the top of a greased flagpole.',
  'Wake up a hibernating bear politely for its dentist appointment.',
  'Survive a snowstorm wearing only beach gear.',
  'Turn a terrible blind date into an epic action movie.',
  'Defend a sandcastle from a tsunami of soda.',
  'Scale an icy skyscraper without any climbing gear.',
  'Solve a museum heist using only wacky props.',
  'Prevent a toddler from pressing the Big Red Button.',
  'Herd 30 roller-skating flamingos into a barn.',
  'Fix a broken roller coaster mid-loop.',
  'Escape a giant spiderweb in a magical forest.',
  'Win an argument with a parrot who knows legal jargon.',
  'Cross a quicksand pit shaped like a maze.',
  'Make a Michelin-star meal during an earthquake.',
  'Distract a palace guard who never blinks.',
  'Keep a delicate house of cards standing inside a wind tunnel.',
  'Rescue a submarine stuck inside a giant clam.',
  'Outsmart a genie who takes every wish literally.',
  'Clean an entire castle before the royal inspector arrives in 2 minutes.',
  'Survive a pillow fight against heavyweight champions.',
  'Launch a homemade time machine in your garage.',
  'Stop a train using only items from a junk drawer.',
  'Teach a goldfish to perform a circus stunt.',
  'Protect your picnic from a mini tornado.',
  'Get VIP access to a secret penguin nightclub.',
  'Cross a frozen lake cracking beneath your feet.',
  'Cure a giant’s hiccups before he sneezes away the village.',
  'Win a high-stakes auction with zero money in your pocket.',
  'Survive an elevator stuck with 8 mime artists.',
  'Recover a sunken treasure chest before high tide.',
  'Make a viral music video in an abandoned laundromat.',
  'Stop a malfunctioning clone machine from filling town with clones of you.',
  'Pass a knighthood trial while terrified of spiders.',
  'Keep a parade float airborne in zero wind.',
  'Escape a maze guarded by laser-eyed garden gnomes.',
  'Teach robots the meaning of comedy in 30 seconds.',
  'Deflect an asteroid using household teamwork.',
  'Get a grumpy sloth across a busy crosswalk safely.',
  'Turn a blackout into the greatest party of the century.',
  'Capture a runaway cloud that keeps raining indoors.',
  'Survive a reality TV obstacle course covered in pudding.',
  'Sneak a snack into the quietest library in the universe.',
  'Stop a giant bouncing ball from flattening downtown.',
  'Win a snowball fight against actual snowmen.',
  'Fix the town clock tower while hanging from the minute hand.',
  'Escape a shrinking room with zero exits.',
  'Convince a knight you are a famous wizard.',
  'Save a stranded astronaut floating away from the ship.',
  'Stop a herd of caffeinated sheep from invading city hall.',
  'Beat a grandmaster at chess without knowing the rules.',
  'Survive a rollercoaster built by chaotic goblins.',
  'Retrieve a diamond ring from inside a bubbling fountain.',
  'Start a campfire underwater for a mermaid picnic.',
  'Stop a runaway parade balloon floating toward power lines.',
  'Invent a brand-new Olympic event on live television.',
  'Keep a sleeping baby elephant calm during fireworks.',
  'Escape quicksand while carrying 12 fragile eggs.',
  'Outshine a rival magician whose tricks actually use real magic.',
  'Repair a leaky pirate ship mid-battle.',
  'Deliver an emergency birthday gift to Mars.',
  'Survive a paintball match armed with zero paintballs.',
  'Get down from a 100-foot treehouse when the ladder vanishes.',
  'Convince an AI refrigerator to unlock the midnight snacks.',
  'Stop an evil dentist’s giant mechanical toothbrush.',
  'Cross a bridge guarded by three riddle-obsessed goats.',
  'Win a cooking duel using zero heat.',
  'Calm down a rampaging T-Rex with a toothache.',
  'Escape a giant pinball machine while you are the ball.',
  'Keep a secret spy briefcase safe at a chaotic family reunion.',
  'Break a Guinness World Record in under 15 seconds.',
  'Stop a gravity glitch turning the supermarket upside down.',
  'Host a peaceful tea party on a pirate ship.',
  'Retrieve a lost crown from an angry badger’s burrow.',
  'Win a demolition derby in a golf cart.',
  'Survive a spelling bee where every word summons what you spell.',
  'Guide a lost UFO back onto the highway without causing panic.',
];

// 40 Creative Restrictions
export const RESTRICTION_LIBRARY: CreativeRestriction[] = [
  {id: 'r1', label: 'No Letter "E"', description: 'Write your solution without using the letter E!', type: 'BANNED_LETTER', param: 'e'},
  {id: 'r2', label: 'No Letter "A"', description: 'Avoid the letter A completely!', type: 'BANNED_LETTER', param: 'a'},
  {id: 'r3', label: 'No Letter "S"', description: 'Zero S characters allowed!', type: 'BANNED_LETTER', param: 's'},
  {id: 'r4', label: '8-Word Sprint', description: 'Keep your pitch at 8 words or fewer!', type: 'MAX_WORDS', param: 8},
  {id: 'r5', label: '12-Word Punch', description: 'Maximum 12 words allowed!', type: 'MAX_WORDS', param: 12},
  {id: 'r6', label: '5-Word Haiku Blitz', description: 'Ultra-short! 5 words max!', type: 'MAX_WORDS', param: 5},
  {id: 'r7', label: 'No Common Words', description: 'Avoid "the", "and", "with", "use".', type: 'NO_COMMON_WORDS'},
  {id: 'r8', label: 'Action Movie Trailer', description: 'Tone twist: pitch it like an intense movie trailer!', type: 'TONE_TWIST'},
  {id: 'r9', label: 'Pirate Captain Voice', description: 'Tone twist: speak like a salty sea pirate!', type: 'TONE_TWIST'},
  {id: 'r10', label: 'Breaking News Anchor', description: 'Tone twist: report it as breaking live news!', type: 'TONE_TWIST'},
  {id: 'r11', label: 'Whispered Secret', description: 'Tone twist: sound sneaky and conspiratorial!', type: 'TONE_TWIST'},
  {id: 'r12', label: 'Overly Polite Butler', description: 'Tone twist: utmost etiquette at all costs!', type: 'TONE_TWIST'},
  {id: 'r13', label: 'Must Include "BOOM"', description: 'Work the word "boom" naturally into your plan!', type: 'MUST_INCLUDE', param: 'boom'},
  {id: 'r14', label: 'Must Include "TRUST"', description: 'Work the word "trust" into your solution!', type: 'MUST_INCLUDE', param: 'trust'},
  {id: 'r15', label: 'Must Include "GLORY"', description: 'Include the word "glory"!', type: 'MUST_INCLUDE', param: 'glory'},
  {id: 'r16', label: 'Must Include "ZERO"', description: 'Include the word "zero"!', type: 'MUST_INCLUDE', param: 'zero'},
  {id: 'r17', label: 'Sports Announcer', description: 'Tone twist: narrate it like a championship goal!', type: 'TONE_TWIST'},
  {id: 'r18', label: 'Mad Scientist Pitch', description: 'Tone twist: maniacal cackling encouraged!', type: 'TONE_TWIST'},
  {id: 'r19', label: 'Zero Gravity Style', description: 'Tone twist: treat everything as floating!', type: 'TONE_TWIST'},
  {id: 'r20', label: 'Chef Plating Critique', description: 'Tone twist: describe it like gourmet cuisine!', type: 'TONE_TWIST'},
  {id: 'r21', label: 'No Letter "T"', description: 'Do not use the letter T!', type: 'BANNED_LETTER', param: 't'},
  {id: 'r22', label: 'No Letter "O"', description: 'Banish the letter O!', type: 'BANNED_LETTER', param: 'o'},
  {id: 'r23', label: '10-Word Cap', description: 'Keep it crisp: max 10 words!', type: 'MAX_WORDS', param: 10},
  {id: 'r24', label: '15-Word Pitch', description: 'Maximum 15 words!', type: 'MAX_WORDS', param: 15},
  {id: 'r25', label: 'Must Include "CHAOS"', description: 'Include the word "chaos"!', type: 'MUST_INCLUDE', param: 'chaos'},
  {id: 'r26', label: 'Must Include "GENIUS"', description: 'Include the word "genius"!', type: 'MUST_INCLUDE', param: 'genius'},
  {id: 'r27', label: 'Must Include "VICTORY"', description: 'Include the word "victory"!', type: 'MUST_INCLUDE', param: 'victory'},
  {id: 'r28', label: 'Must Include "TURBO"', description: 'Include the word "turbo"!', type: 'MUST_INCLUDE', param: 'turbo'},
  {id: 'r29', label: 'Shakespearean Drama', description: 'Tone twist: dramatic old-timey flair!', type: 'TONE_TWIST'},
  {id: 'r30', label: 'Infomercial Pitch', description: 'Tone twist: "But wait, there is more!"', type: 'TONE_TWIST'},
  {id: 'r31', label: 'Detective Noir', description: 'Tone twist: hardboiled mystery monologue!', type: 'TONE_TWIST'},
  {id: 'r32', label: 'Fairy Tale Narrator', description: 'Tone twist: once upon a chaotic time...', type: 'TONE_TWIST'},
  {id: 'r33', label: 'Must Include "PIZZA"', description: 'Sneak the word "pizza" into the plan!', type: 'MUST_INCLUDE', param: 'pizza'},
  {id: 'r34', label: 'Must Include "GRAVITY"', description: 'Include the word "gravity"!', type: 'MUST_INCLUDE', param: 'gravity'},
  {id: 'r35', label: 'Must Include "LASER"', description: 'Include the word "laser"!', type: 'MUST_INCLUDE', param: 'laser'},
  {id: 'r36', label: 'Must Include "SPARKLE"', description: 'Include the word "sparkle"!', type: 'MUST_INCLUDE', param: 'sparkle'},
  {id: 'r37', label: '6-Word Micro Story', description: 'Exactly 6 words or fewer!', type: 'MAX_WORDS', param: 6},
  {id: 'r38', label: 'No Letter "I"', description: 'Do not use the letter I!', type: 'BANNED_LETTER', param: 'i'},
  {id: 'r39', label: 'No Letter "R"', description: 'Avoid the letter R!', type: 'BANNED_LETTER', param: 'r'},
  {id: 'r40', label: 'Must Include "MAYHEM"', description: 'Include the word "mayhem"!', type: 'MUST_INCLUDE', param: 'mayhem'},
];

export const REACTION_STICKERS = [
  {id: 'laugh', emoji: '😂', label: 'Haha!'},
  {id: 'fire', emoji: '🔥', label: 'Fire!'},
  {id: 'mindblown', emoji: '🤯', label: 'Genius!'},
  {id: 'skull', emoji: '💀', label: 'Dead!'},
  {id: 'crown', emoji: '👑', label: 'Royalty!'},
];

export const PROFILE_FRAMES = [
  {id: 'classic', name: 'Classic Ink', border: '#1A1336', glow: 'none'},
  {id: 'gold_star', name: 'Gold Spotlight', border: '#FFD13B', glow: '0 0 12px rgba(255,209,59,0.6)', cost: 80},
  {id: 'neon_prism', name: 'Mint Cyber', border: '#2CEAA3', glow: '0 0 12px rgba(44,234,163,0.6)', cost: 150},
  {id: 'coral_champ', name: 'Coral Crown', border: '#FF4D79', glow: '0 0 14px rgba(255,77,121,0.65)', cost: 240},
];

export const PLAYER_TITLES = [
  {id: 'rookie', name: 'Rookie Improviser', minLevel: 1},
  {id: 'chef', name: 'Chaos Chef', minLevel: 2},
  {id: 'twist', name: 'Plot Twist Pro', minLevel: 3},
  {id: 'wizard', name: 'Mashup Maestro', minLevel: 5},
];
