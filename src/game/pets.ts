/**
 * Pets: every species, and every number that decides how pets roll, grow and pay.
 * All the tunable numbers live at the top of this file, so balancing never needs a hunt.
 */

// ---- Settings (change freely) ----

export type Tier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'divine' | 'seasonal'

/** Chance of each tier on a daily spin, in percent (adds up to 100) */
export const DROP: Record<Exclude<Tier, 'seasonal'>, number> = { common: 45, rare: 28, epic: 16, legendary: 7, mythical: 3, divine: 1 }
/** Guarantees: the 7th daily spin without a Mythical (or better) is a Mythical; the 30th without a Divine is a Divine */
export const PITY = { mythical: 7, divine: 30 }
/** Birthday and monthsary spins, in percent */
export const SPECIAL_DROP = { legendary: 60, mythical: 30, divine: 10 }
/** Lowest IV a pet of each tier can roll (IVs go up to 100) */
export const MIN_IV: Record<Tier, number> = { common: 40, rare: 50, epic: 60, legendary: 70, mythical: 80, divine: 90, seasonal: 60 }
/** Feeding pays (average IV × FEED_MULT × (1 + mutation bonuses)) Hearts, once a day per pet */
export const FEED_MULT = 3
/** Petting is separate from feeding: once a day per pet, (average IV × PET_MULT × (1 + mutation bonuses)) Hearts */
export const PET_MULT = 2
/** Gift pets for everyone: raise this number (and publish) to put one extra pet at every player's door, once */
export const GIFT_ROUND = 1
/** Days from baby to adult */
export const GROW_DAYS = 30
/** Pets living in the room, and in foster care */
export const ROOM_SLOTS = 3
export const FOSTER_SLOTS = 10

export type ColorMutation = 'leucism' | 'albinism' | 'melanism'
export type SizeMutation = 'dwarfism' | 'gigantism'
/** Rare real-life mutations: one from each group can roll, and they stack. `chance` is 1 in this many pets. */
export const MUTATIONS: Record<ColorMutation | SizeMutation, { label: string; chance: number; bonus: number; about: string }> = {
  leucism: { label: 'Leucism', chance: 50, bonus: 0.1, about: 'Pale coat, normal eyes' },
  albinism: { label: 'Albinism', chance: 150, bonus: 0.25, about: 'Pure white, pink eyes' },
  melanism: { label: 'Melanism', chance: 300, bonus: 0.5, about: 'All black' },
  dwarfism: { label: 'Dwarfism', chance: 300, bonus: 0.25, about: 'Stays small as an adult' },
  gigantism: { label: 'Gigantism', chance: 300, bonus: 0.25, about: 'Bigger than a normal adult' },
}

export const IV_NAMES = ['Behavior', 'Sociality', 'Adaptability', 'Climate Tolerance', 'Habitat Preference', 'Diet Flexibility', 'Activity', 'Trainability', 'Curiosity', 'Survival Instinct']

export const TIER_INFO: Record<Tier, { label: string; color: string; glow: string }> = {
  common: { label: 'Common', color: '#5ccf9a', glow: '#5ccf9a55' },
  rare: { label: 'Rare', color: '#4f9cf5', glow: '#4f9cf555' },
  epic: { label: 'Epic', color: '#a368f0', glow: '#a368f055' },
  legendary: { label: 'Legendary', color: '#ff9a3d', glow: '#ff9a3d66' },
  mythical: { label: 'Mythical', color: '#f04b5a', glow: '#f04b5a77' },
  divine: { label: 'Divine', color: '#e6b422', glow: '#ffd55a99' },
  seasonal: { label: 'Seasonal', color: '#ff7eb6', glow: '#ff7eb666' },
}

// ---- Species ----

/** Body shapes the 3D model is built from */
export type Arch = 'quad' | 'rodent' | 'hopper' | 'bird' | 'lizard' | 'snake' | 'frog' | 'turtle' | 'snail' | 'crab' | 'bat' | 'spider' | 'seal'
export type Ears = 'none' | 'point' | 'round' | 'long' | 'flop' | 'big' | 'tuft'
export type Tail = 'none' | 'short' | 'long' | 'bushy' | 'flat' | 'curl' | 'fan' | 'ringed' | 'thick'
export type Mark = 'none' | 'stripes' | 'spots' | 'mask' | 'patch' | 'stripe' | 'bands'
export type Extra = 'mane' | 'antlers' | 'quills' | 'comb' | 'gills' | 'crest' | 'frill' | 'scales' | 'horns' | 'owl'

export type Species = {
  id: string
  name: string
  tier: Tier
  arch: Arch
  /** Adult height in room units (your character is about 1.3) */
  size: number
  /** Coat colors to roll from: [main, second] */
  coats: [string, string][]
  ears?: Ears
  tail?: Tail
  mark?: Mark
  extra?: Extra
  /** Body length (1 = usual) and leg length (1 = usual) */
  long?: number
  legs?: number
  /** Seasonal pets: the event they come from */
  event?: string
}

const s = (id: string, name: string, tier: Tier, arch: Arch, size: number, coats: [string, string][], more: Partial<Species> = {}): Species => ({ id, name, tier, arch, size, coats, ...more })

export const SPECIES: Species[] = [
  // Common
  s('dog', 'Dog', 'common', 'quad', 0.42, [['#c98a4b', '#f3dcc0'], ['#2b2420', '#c98a4b'], ['#f2e6d4', '#ffffff'], ['#8a6a4f', '#e8d3b8']], { ears: 'flop', tail: 'short' }),
  s('cat', 'Cat', 'common', 'quad', 0.32, [['#f0a050', '#fff1df'], ['#2a2a2e', '#f3f0ea'], ['#9aa0a8', '#e9ecef'], ['#f5f0e6', '#ffffff']], { ears: 'point', tail: 'long', mark: 'stripes' }),
  s('rabbit', 'Rabbit', 'common', 'hopper', 0.3, [['#f3ede4', '#ffffff'], ['#8f6b52', '#efe0cf'], ['#5a5350', '#d9d2cc']], { ears: 'long', tail: 'short' }),
  s('guineaPig', 'Guinea Pig', 'common', 'rodent', 0.18, [['#c47a3c', '#fff4e6'], ['#2e2622', '#f3eadf'], ['#e8d5b9', '#ffffff']], { ears: 'round', mark: 'patch' }),
  s('hamster', 'Hamster', 'common', 'rodent', 0.13, [['#e3a45a', '#fff6ea'], ['#cfc6bd', '#ffffff'], ['#6e5a4c', '#e7dccf']], { ears: 'round' }),
  s('bat', 'Bat', 'common', 'bat', 0.2, [['#3b3232', '#6b5a55'], ['#5a4a3e', '#8c7563']], { ears: 'big' }),
  s('mouse', 'Mouse', 'common', 'rodent', 0.11, [['#a8a2a0', '#efe9e6'], ['#f4f1ee', '#ffffff'], ['#6b5647', '#d7c8bb']], { ears: 'big', tail: 'long' }),
  s('ferret', 'Ferret', 'common', 'quad', 0.2, [['#d9c3a2', '#f7efe2'], ['#6e5544', '#e9dccb']], { ears: 'round', tail: 'long', mark: 'mask', long: 1.6, legs: 0.55 }),
  s('frog', 'Frog', 'common', 'frog', 0.14, [['#6fbf4a', '#e7f0b8'], ['#4b8f3a', '#d9e6a8'], ['#9ab35a', '#efe8bc']]),
  s('hedgehog', 'Hedgehog', 'common', 'rodent', 0.15, [['#8a6f58', '#f1e1cc'], ['#bfa892', '#fbf1e4']], { ears: 'round', extra: 'quills' }),
  s('snail', 'Snail', 'common', 'snail', 0.13, [['#d79b5c', '#c9c3a8'], ['#b46f4e', '#bdb79c']]),
  s('turtle', 'Turtle', 'common', 'turtle', 0.16, [['#6a8a3e', '#9cb36a'], ['#7d6a3c', '#a7a06a']]),
  s('chicken', 'Chicken', 'common', 'bird', 0.3, [['#ffffff', '#f2c14e'], ['#b5652f', '#f2c14e'], ['#2b2522', '#f2c14e']], { extra: 'comb' }),
  s('duck', 'Duck', 'common', 'bird', 0.28, [['#f5f3ee', '#f29d38'], ['#7a5a3c', '#f29d38'], ['#ffd84d', '#f29d38']]),
  s('goose', 'Goose', 'common', 'bird', 0.4, [['#f7f6f2', '#f08a2a'], ['#8a8780', '#2b2b2b']], { long: 1.2 }),

  // Rare
  s('chinchilla', 'Chinchilla', 'rare', 'rodent', 0.2, [['#9ea3a8', '#eef0f2'], ['#f2f0ec', '#ffffff'], ['#5c5650', '#d6d0c9']], { ears: 'big', tail: 'bushy' }),
  s('sugarGlider', 'Sugar Glider', 'rare', 'rodent', 0.14, [['#9ba0a6', '#f4efe8'], ['#c9b8a6', '#fbf5ec']], { ears: 'big', tail: 'bushy', mark: 'stripe' }),
  s('axolotl', 'Axolotl', 'rare', 'lizard', 0.12, [['#f6a8bd', '#ffd6e2'], ['#e9d9cf', '#ffd6e2'], ['#4d4a52', '#8e86a0'], ['#f2d36b', '#ffeeb5']], { extra: 'gills', legs: 0.6 }),
  s('leopardGecko', 'Leopard Gecko', 'rare', 'lizard', 0.1, [['#f2c64e', '#fff1c4'], ['#f5e6b8', '#fff8e0']], { mark: 'spots', tail: 'thick' }),
  s('crestedGecko', 'Crested Gecko', 'rare', 'lizard', 0.11, [['#c47d3e', '#efc58f'], ['#8f7a5a', '#d8c39a'], ['#d9a65f', '#f6dca8']], { extra: 'crest' }),
  s('beardedDragon', 'Bearded Dragon', 'rare', 'lizard', 0.16, [['#d6a25a', '#efd29a'], ['#c97a3c', '#e9b67a']], { extra: 'frill', long: 1.2 }),
  s('snake', 'Snake', 'rare', 'snake', 0.12, [['#6d8f3a', '#c9c27a'], ['#c46a3a', '#f1d6a0'], ['#3a3a3e', '#d8d2c4']], { mark: 'bands' }),
  s('pig', 'Pig', 'rare', 'quad', 0.38, [['#f4b5b5', '#ffd6d6'], ['#3a3233', '#e9b5b5'], ['#e7cfa8', '#ffe8d0']], { ears: 'flop', tail: 'curl', legs: 0.6 }),
  s('hermitCrab', 'Hermit Crab', 'rare', 'crab', 0.12, [['#e2643f', '#e8d2b0'], ['#c24a6a', '#dfe2cf']]),
  s('skunk', 'Skunk', 'rare', 'quad', 0.24, [['#262426', '#f6f4f0']], { ears: 'round', tail: 'bushy', mark: 'stripe', legs: 0.6 }),
  s('meerkat', 'Meerkat', 'rare', 'quad', 0.28, [['#c9a77a', '#ead6b5']], { ears: 'round', tail: 'long', mark: 'mask', legs: 0.8 }),
  s('opossum', 'Opossum', 'rare', 'quad', 0.24, [['#bfbab4', '#f4f1ec'], ['#7a7470', '#e6e1db']], { ears: 'round', tail: 'long', legs: 0.6 }),

  // Epic
  s('beaver', 'Beaver', 'epic', 'quad', 0.3, [['#7a5236', '#a77a55']], { ears: 'round', tail: 'flat', legs: 0.5, long: 1.2 }),
  s('peacock', 'Peacock', 'epic', 'bird', 0.55, [['#1f6fb8', '#1fa37a'], ['#f7f6f2', '#ffffff']], { tail: 'fan', extra: 'crest' }),
  s('chameleon', 'Chameleon', 'epic', 'lizard', 0.14, [['#5fbf5a', '#d9ef8f'], ['#3fa3a3', '#a8e6d9'], ['#e06a4a', '#f7c06a']], { tail: 'curl', extra: 'crest', legs: 1.3 }),
  s('iguana', 'Iguana', 'epic', 'lizard', 0.2, [['#6fae4a', '#c8de8a'], ['#5f8f8a', '#b5d3c6']], { extra: 'crest', long: 1.4 }),
  s('skink', 'Blue-tongued Skink', 'epic', 'lizard', 0.12, [['#b9a27e', '#e8dcc2']], { mark: 'bands', long: 1.3, legs: 0.5 }),
  s('koala', 'Koala', 'epic', 'quad', 0.35, [['#9a9ca0', '#eceef0']], { ears: 'big', tail: 'none', legs: 0.7 }),
  s('wallaby', 'Wallaby', 'epic', 'hopper', 0.55, [['#9a7a5c', '#e3d2bc'], ['#7c7570', '#d9d2cb']], { ears: 'point', tail: 'thick' }),
  s('wombat', 'Wombat', 'epic', 'quad', 0.32, [['#7a6656', '#a89584'], ['#9a8a7a', '#c4b6a6']], { ears: 'round', tail: 'none', legs: 0.45 }),
  s('fox', 'Fox', 'epic', 'quad', 0.38, [['#e2702e', '#ffffff'], ['#d8d2c8', '#ffffff'], ['#3a3433', '#e9e5e0']], { ears: 'point', tail: 'bushy' }),
  s('kangaroo', 'Kangaroo', 'epic', 'hopper', 0.75, [['#b8794a', '#ead2b5'], ['#9a8f86', '#e3ddd6']], { ears: 'point', tail: 'thick' }),

  // Legendary
  s('serval', 'Serval', 'legendary', 'quad', 0.5, [['#e3b25e', '#fbf0d6']], { ears: 'big', tail: 'short', mark: 'spots', legs: 1.35 }),
  s('caracal', 'Caracal', 'legendary', 'quad', 0.48, [['#c99566', '#f5e4cc']], { ears: 'tuft', tail: 'short', legs: 1.2 }),
  s('bobcat', 'Bobcat', 'legendary', 'quad', 0.46, [['#b58a62', '#f3e3cc']], { ears: 'tuft', tail: 'short', mark: 'spots' }),
  s('lynx', 'Lynx', 'legendary', 'quad', 0.55, [['#c6b39b', '#f6eee2'], ['#a8916f', '#efe4d2']], { ears: 'tuft', tail: 'short', legs: 1.2 }),
  s('tasmanianDevil', 'Tasmanian Devil', 'legendary', 'quad', 0.3, [['#2a2526', '#f4f1ea']], { ears: 'round', tail: 'thick', mark: 'stripe', legs: 0.7 }),
  s('wolf', 'Wolf', 'legendary', 'quad', 0.62, [['#8f8b86', '#ebe7e1'], ['#3b3735', '#c9c4bc'], ['#e9e5df', '#ffffff']], { ears: 'point', tail: 'bushy' }),
  s('wolverine', 'Wolverine', 'legendary', 'quad', 0.4, [['#4a3324', '#c9a172']], { ears: 'round', tail: 'bushy', mark: 'stripe', legs: 0.7 }),
  s('honeyBadger', 'Honey Badger', 'legendary', 'quad', 0.32, [['#2a2626', '#e9e6e0']], { ears: 'none', tail: 'short', mark: 'stripe', legs: 0.55 }),

  // Mythical
  s('cheetah', 'Cheetah', 'mythical', 'quad', 0.62, [['#e6b65a', '#fbf0d4']], { ears: 'round', tail: 'long', mark: 'spots', legs: 1.3 }),
  s('lion', 'Lion', 'mythical', 'quad', 0.72, [['#d8a25a', '#f4dfb8']], { ears: 'round', tail: 'long', extra: 'mane' }),
  s('jaguar', 'Jaguar', 'mythical', 'quad', 0.6, [['#d79a3e', '#f6e2bc']], { ears: 'round', tail: 'long', mark: 'spots' }),
  s('leopard', 'Leopard', 'mythical', 'quad', 0.58, [['#e2ac56', '#f9ead0']], { ears: 'round', tail: 'long', mark: 'spots' }),
  s('tiger', 'Tiger', 'mythical', 'quad', 0.75, [['#ec8a2e', '#fff6ea'], ['#f4efe6', '#ffffff']], { ears: 'round', tail: 'long', mark: 'stripes' }),
  s('panda', 'Panda', 'mythical', 'quad', 0.6, [['#f6f4ef', '#222022']], { ears: 'round', tail: 'none', mark: 'patch', legs: 0.7 }),

  // Divine
  s('capybara', 'Capybara', 'divine', 'quad', 0.42, [['#a87a52', '#c9a27c']], { ears: 'round', tail: 'none', legs: 0.6, long: 1.2 }),
  s('redPanda', 'Red Panda', 'divine', 'quad', 0.32, [['#c9532a', '#f6efe6']], { ears: 'point', tail: 'ringed', mark: 'mask', legs: 0.6 }),
  s('otters', 'Otters', 'divine', 'quad', 0.26, [['#6b4a32', '#c9a27c']], { ears: 'round', tail: 'thick', legs: 0.45, long: 1.4 }),
  s('seal', 'Seal', 'divine', 'seal', 0.3, [['#9aa3ab', '#e7ebee'], ['#f4f3ef', '#ffffff']]),

  // Seasonal (free events, two pets each)
  s('arcticFox', 'Arctic Fox', 'seasonal', 'quad', 0.32, [['#f6f7f8', '#ffffff']], { ears: 'round', tail: 'bushy', event: 'newyear' }),
  s('snowyOwl', 'Snowy Owl', 'seasonal', 'bird', 0.4, [['#f7f7f4', '#2b2b2b']], { extra: 'owl', mark: 'spots', event: 'newyear' }),
  s('redSquirrel', 'Red Squirrel', 'seasonal', 'rodent', 0.18, [['#c4602e', '#f6e8d6']], { ears: 'tuft', tail: 'bushy', event: 'valentines' }),
  s('lovebird', 'Lovebird', 'seasonal', 'bird', 0.16, [['#6fcf5a', '#f26b5a'], ['#4fb0e0', '#f6f6f6']], { event: 'valentines' }),
  s('pangolin', 'Pangolin', 'seasonal', 'quad', 0.28, [['#8f6a4a', '#c9a07a']], { ears: 'none', tail: 'thick', extra: 'scales', legs: 0.5, long: 1.4, event: 'equinox' }),
  s('kiwiBird', 'Kiwi Bird', 'seasonal', 'bird', 0.22, [['#7a5a3e', '#c9b08a']], { long: 0.6, event: 'equinox' }),
  s('lamb', 'Lamb', 'seasonal', 'quad', 0.38, [['#f7f4ee', '#2b2725'], ['#2b2725', '#f7f4ee']], { ears: 'flop', tail: 'short', event: 'spring' }),
  s('quail', 'Quail', 'seasonal', 'bird', 0.16, [['#8f6f50', '#e8d6b8']], { mark: 'spots', event: 'spring' }),
  s('sloth', 'Sloth', 'seasonal', 'quad', 0.3, [['#a8927a', '#e7dccd']], { ears: 'none', tail: 'none', mark: 'mask', legs: 0.8, event: 'sloth' }),
  s('porcupine', 'Porcupine', 'seasonal', 'rodent', 0.24, [['#5c4a3e', '#d8cbbb']], { ears: 'round', extra: 'quills', event: 'sloth' }),
  s('muskDeer', 'Musk Deer', 'seasonal', 'quad', 0.45, [['#7a5c42', '#d9c3a6']], { ears: 'big', tail: 'short', legs: 1.3, event: 'summer' }),
  s('fennecFox', 'Fennec Fox', 'seasonal', 'quad', 0.26, [['#ecd2a2', '#fff7e8']], { ears: 'big', tail: 'bushy', event: 'summer' }),
  s('raccoon', 'Raccoon', 'seasonal', 'quad', 0.32, [['#8c8884', '#ebe8e3']], { ears: 'round', tail: 'ringed', mark: 'mask', legs: 0.7, event: 'midsummer' }),
  s('quokka', 'Quokka', 'seasonal', 'hopper', 0.28, [['#9a7a5a', '#d8c1a3']], { ears: 'round', tail: 'short', event: 'midsummer' }),
  s('jerboa', 'Jerboa', 'seasonal', 'hopper', 0.12, [['#e3c79a', '#fff6e8']], { ears: 'big', tail: 'long', event: 'desert' }),
  s('aardwolf', 'Aardwolf', 'seasonal', 'quad', 0.42, [['#d8be92', '#f5ead6']], { ears: 'big', tail: 'bushy', mark: 'stripes', extra: 'mane', event: 'desert' }),
  s('armadillo', 'Armadillo', 'seasonal', 'quad', 0.2, [['#b8a08a', '#e6d6c5']], { ears: 'round', tail: 'long', extra: 'scales', legs: 0.45, event: 'harvest' }),
  s('ayeAye', 'Aye-aye', 'seasonal', 'quad', 0.26, [['#3e3632', '#8a7d72']], { ears: 'big', tail: 'bushy', legs: 0.8, event: 'harvest' }),
  s('vampireBat', 'Vampire Bat', 'seasonal', 'bat', 0.18, [['#4a3a3a', '#9a3b3b']], { ears: 'big', event: 'halloween' }),
  s('tarantula', 'Tarantula', 'seasonal', 'spider', 0.1, [['#3a2e2a', '#d9783a']], { event: 'halloween' }),
  s('binturong', 'Binturong', 'seasonal', 'quad', 0.4, [['#2d2a29', '#7a716a']], { ears: 'tuft', tail: 'bushy', legs: 0.7, long: 1.2, event: 'autumn' }),
  s('fossa', 'Fossa', 'seasonal', 'quad', 0.36, [['#9a5a32', '#d8a87a']], { ears: 'round', tail: 'long', long: 1.3, legs: 0.8, event: 'autumn' }),
  s('reindeer', 'Reindeer', 'seasonal', 'quad', 0.7, [['#8a6a50', '#f2ece4']], { ears: 'point', tail: 'short', extra: 'antlers', legs: 1.2, event: 'christmas' }),
  s('arcticHare', 'Arctic Hare', 'seasonal', 'hopper', 0.3, [['#f8f9fa', '#ffffff']], { ears: 'long', tail: 'short', event: 'christmas' }),
]

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((x) => [x.id, x]))

/** The stork that carries a Mythical in the reel (never a pet itself) */
export const STORK: Species = s('stork', 'Stork', 'mythical', 'bird', 0.5, [['#f6f6f2', '#e2443a']], { long: 1.2, legs: 1.6 })

/** Free monthly events: 48 hours each, two pets, claimed once a year. Dates are month-day. */
export const EVENTS: { id: string; name: string; start: string; emoji: string }[] = [
  { id: 'newyear', name: 'New Year', start: '01-01', emoji: '🎆' },
  { id: 'valentines', name: 'Valentine’s', start: '02-14', emoji: '💘' },
  { id: 'equinox', name: 'Spring Equinox', start: '03-20', emoji: '🌱' },
  { id: 'spring', name: 'Spring Festival', start: '04-05', emoji: '🐣' },
  { id: 'sloth', name: 'Slow Days', start: '05-15', emoji: '🦥' },
  { id: 'summer', name: 'Summer Start', start: '06-08', emoji: '☀️' },
  { id: 'midsummer', name: 'Midsummer', start: '07-18', emoji: '🏖️' },
  { id: 'desert', name: 'Desert Nights', start: '08-22', emoji: '🏜️' },
  { id: 'harvest', name: 'Harvest Moon', start: '09-12', emoji: '🌕' },
  { id: 'halloween', name: 'Halloween', start: '10-30', emoji: '🎃' },
  { id: 'autumn', name: 'Autumn Woods', start: '11-15', emoji: '🍂' },
  { id: 'christmas', name: 'Christmas', start: '12-24', emoji: '🎄' },
]

// ---- A pet you own ----

export type Pet = {
  uid: string
  species: string
  name: string
  /** Which coat it rolled */
  coat: number
  ivs: number[]
  color: ColorMutation | null
  sizeMut: SizeMutation | null
  /** The day it arrived (its birthday as a pet) */
  born: string
  /** The last day it was fed */
  fed: string
  /** The last day it was petted */
  petted?: string
  place: 'room' | 'foster'
}

/** What others need to draw one of your pets in your room */
export type PetBody = Pick<Pet, 'uid' | 'species' | 'name' | 'coat' | 'color' | 'sizeMut' | 'born' | 'ivs'>
export const bodyOf = ({ uid, species, name, coat, color, sizeMut, born, ivs }: Pet): PetBody => ({ uid, species, name, coat, color, sizeMut, born, ivs })

export const speciesOf = (p: Pick<Pet, 'species'>) => SPECIES_BY_ID[p.species] ?? SPECIES[0]
export const avgIv = (p: Pick<Pet, 'ivs'>) => p.ivs.reduce((a, b) => a + b, 0) / p.ivs.length
export const bonusOf = (p: Pick<Pet, 'color' | 'sizeMut'>) => (p.color ? MUTATIONS[p.color].bonus : 0) + (p.sizeMut ? MUTATIONS[p.sizeMut].bonus : 0)
/** Hearts from one day's feeding */
export const feedHearts = (p: Pick<Pet, 'ivs' | 'color' | 'sizeMut'>) => Math.round(avgIv(p) * FEED_MULT * (1 + bonusOf(p)))
/** Hearts from one day's petting */
export const petHearts = (p: Pick<Pet, 'ivs' | 'color' | 'sizeMut'>) => Math.round(avgIv(p) * PET_MULT * (1 + bonusOf(p)))

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
/** Days since it arrived */
export const ageDays = (p: Pick<Pet, 'born'>, today: string) => Math.max(0, daysBetween(p.born, today))
/** 0.55 as a newborn, growing to 1 as an adult */
export const growth = (p: Pick<Pet, 'born'>, today: string) => 0.55 + 0.45 * Math.min(1, ageDays(p, today) / GROW_DAYS)
/** Height in the room right now */
export function petHeight(p: PetBody, today: string) {
  const base = speciesOf(p).size
  const mut = p.sizeMut === 'dwarfism' ? 0.6 : p.sizeMut === 'gigantism' ? 1.35 : 1
  // Big animals are scaled down to fit the studio: above 0.45 their extra height counts for a bit more than half
  const fitted = base > 0.45 ? 0.45 + (base - 0.45) * 0.6 : base
  return fitted * growth(p, today) * mut
}
/** Small enough to lose in the room: these get a glowing ring and a name tag */
export const isTiny = (p: PetBody, today: string) => petHeight(p, today) < 0.16

// ---- Rolling ----

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/** A tier by weights (in percent) */
function weighted<K extends string>(weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][]
  let r = Math.random() * entries.reduce((n, [, w]) => n + w, 0)
  for (const [k, w] of entries) if ((r -= w) < 0) return k
  return entries[0][0]
}

export const randomTier = () => weighted(DROP)

export type Pity = { sinceMythical: number; sinceDivine: number }

/** The tier of a daily spin, keeping the Mythical and Divine guarantees */
export function dailyTier(pity: Pity): Tier {
  if (pity.sinceDivine + 1 >= PITY.divine) return 'divine'
  const t = randomTier()
  if (t === 'divine' || t === 'mythical') return t
  if (pity.sinceMythical + 1 >= PITY.mythical) return 'mythical'
  return t
}

export const specialTier = (): Tier => weighted(SPECIAL_DROP)

export function nextPity(pity: Pity, tier: Tier, daily: boolean): Pity {
  if (tier === 'divine') return { sinceMythical: 0, sinceDivine: 0 }
  if (tier === 'mythical') return { sinceMythical: 0, sinceDivine: pity.sinceDivine + (daily ? 1 : 0) }
  return daily ? { sinceMythical: pity.sinceMythical + 1, sinceDivine: pity.sinceDivine + 1 } : pity
}

export const speciesIn = (tier: Tier, event?: string) => SPECIES.filter((x) => x.tier === tier && (!event || x.event === event))

function rollColor(): ColorMutation | null {
  const r = Math.random()
  const m = 1 / MUTATIONS.melanism.chance
  const a = m + 1 / MUTATIONS.albinism.chance
  const l = a + 1 / MUTATIONS.leucism.chance
  return r < m ? 'melanism' : r < a ? 'albinism' : r < l ? 'leucism' : null
}

function rollSize(): SizeMutation | null {
  const r = Math.random()
  const d = 1 / MUTATIONS.dwarfism.chance
  const g = d + 1 / MUTATIONS.gigantism.chance
  return r < d ? 'dwarfism' : r < g ? 'gigantism' : null
}

/** A brand-new pet of this species */
export function makePet(sp: Species, today: string, uid: string): Pet {
  const min = MIN_IV[sp.tier]
  return {
    uid,
    species: sp.id,
    name: sp.name,
    coat: Math.floor(Math.random() * sp.coats.length),
    ivs: IV_NAMES.map(() => min + Math.floor(Math.random() * (101 - min))),
    color: rollColor(),
    sizeMut: rollSize(),
    born: today,
    fed: '',
    place: 'room',
  }
}

export const randomSpecies = (tier: Tier, event?: string) => pick(speciesIn(tier, event))

// ---- Dates for special spins ----

/** The event running today, if any (each lasts two days from its start) */
export function eventToday(today: string) {
  const [y] = today.split('-').map(Number)
  return EVENTS.find((e) => {
    const start = `${y}-${e.start}`
    const d = daysBetween(start, today)
    return d >= 0 && d < 2
  })
}

/** Is today your birthday (month and day)? */
export const isBirthday = (birthday: string | undefined, today: string) => !!birthday && birthday.slice(5) === today.slice(5)

/** Is today a monthsary of a couple that started on this date? (Same day each month; the 31st falls on the month's last day.) */
export function isMonthsary(started: string | null | undefined, today: string) {
  if (!started) return false
  const s0 = started.slice(0, 10)
  if (s0 >= today || s0.slice(0, 7) === today.slice(0, 7)) return false
  const [y, m, d] = today.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return d === Math.min(Number(s0.slice(8, 10)), last)
}
