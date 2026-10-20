// Your character: what you picked at sign-up, plus the clothes you're wearing.

export type Gender = 'male' | 'female' | 'nonbinary'
export type Build = 'skinny' | 'normal' | 'chubby'
export type HairStyle =
  | 'short'
  | 'buzz'
  | 'spiky'
  | 'sidePart'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'buns'
  | 'curly'
  | 'bald'
  | 'pixie'
  | 'bowl'
  | 'mohawk'
  | 'fauxhawk'
  | 'quiff'
  | 'undercut'
  | 'mullet'
  | 'afro'
  | 'wavy'
  | 'braids'
  | 'pigtails'
  | 'twinTails'
  | 'topknot'
  | 'manBun'
  | 'halfUp'
  | 'sideBraid'
  | 'bangs'
  | 'dreads'
  | 'slicked'
  | 'shag'
export type Slot = 'top' | 'bottom' | 'shoes' | 'hat' | 'face'
export type Outfit = Record<Slot, string | null>
/** Clothes that can be dyed any color */
export type Dyeable = 'top' | 'bottom' | 'shoes'
export const DYEABLE: Dyeable[] = ['top', 'bottom', 'shoes']

export type Profile = {
  name: string
  /** YYYY-MM-DD */
  birthday: string
  gender: Gender
  skin: string
  hair: HairStyle
  hairColor: string
  eyes: string
  /** Real height in inches when it was entered, and when that was (it grows each birthday until 18) */
  heightIn: number
  heightSetOn: string
  build: Build
  outfit: Outfit
  /** Colors picked for the shirt, pants and shoes; a piece without one shows its own color */
  tint?: Partial<Record<Dyeable, string>>
}

export const SKINS = ['#fde0c8', '#f6cfae', '#efbf98', '#e2a77c', '#c98e63', '#a8704a', '#83532f', '#5c3820']
export const HAIR_COLORS = [
  '#1f1a17',
  '#3b2a24',
  '#6b4430',
  '#a0663c',
  '#d8a35d',
  '#efd38a',
  '#c94f3b',
  '#e7e1d8',
  '#ff8cc6',
  '#6aa7ff',
  // Added in 1.1.0
  '#2a2f45',
  '#4a2c3d',
  '#8b5a2b',
  '#b5774a',
  '#e8c07a',
  '#f6e7b4',
  '#9aa0a8',
  '#fbfaf6',
  '#e8743b',
  '#a8322d',
  '#7a1f3d',
  '#ffb3c7',
  '#c13584',
  '#c4a6f2',
  '#6b47c2',
  '#3e7bd6',
  '#8fd6f7',
  '#2fb3a0',
  '#86d17a',
  '#f2d14b',
]
export const EYE_COLORS = ['#2b2233', '#4a3324', '#6d4a2c', '#3f6a3a', '#3f6f9e', '#7a8a99', '#8b5bb5']
export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'sidePart', label: 'Side part' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'buns', label: 'Space buns' },
  { id: 'curly', label: 'Curly' },
  { id: 'bald', label: 'Bald' },
  { id: 'pixie', label: 'Pixie' },
  { id: 'bowl', label: 'Bowl cut' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'fauxhawk', label: 'Fauxhawk' },
  { id: 'quiff', label: 'Quiff' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'mullet', label: 'Mullet' },
  { id: 'afro', label: 'Afro' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'braids', label: 'Braids' },
  { id: 'pigtails', label: 'Pigtails' },
  { id: 'twinTails', label: 'Twin tails' },
  { id: 'topknot', label: 'Top knot' },
  { id: 'manBun', label: 'Low bun' },
  { id: 'halfUp', label: 'Half up' },
  { id: 'sideBraid', label: 'Side braid' },
  { id: 'bangs', label: 'Straight bangs' },
  { id: 'dreads', label: 'Locs' },
  { id: 'slicked', label: 'Slicked back' },
  { id: 'shag', label: 'Shag' },
]
/** Tall styles that tuck under a hat, and that headphones need more room for */
export const BIG_HAIR: HairStyle[] = ['spiky', 'curly', 'buns', 'afro', 'mohawk', 'fauxhawk', 'quiff', 'topknot']
export const BUILDS: { id: Build; label: string; width: number }[] = [
  { id: 'skinny', label: 'Skinny', width: 0.88 },
  { id: 'normal', label: 'Normal', width: 1 },
  { id: 'chubby', label: 'Chubby', width: 1.2 },
]

/** In-game height limit: 5'5" for boys, 5'2" for girls, 5'4" for non-binary characters */
export const MAX_HEIGHT: Record<Gender, number> = { male: 65, female: 62, nonbinary: 64 }
export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'nonbinary', label: 'Non-binary' },
]
export const MIN_AGE = 13

export const DEFAULT_OUTFIT: Outfit = { top: 'tee-sky', bottom: 'jeans', shoes: 'sneakers-white', hat: null, face: null }

export const DEFAULT_PROFILE: Profile = {
  name: 'You',
  birthday: '2000-01-01',
  gender: 'female',
  skin: SKINS[1],
  hair: 'long',
  hairColor: HAIR_COLORS[1],
  eyes: EYE_COLORS[0],
  heightIn: 62,
  heightSetOn: '2026-01-01',
  build: 'normal',
  outfit: DEFAULT_OUTFIT,
}

const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

/** Whole years old today */
export function ageOn(birthday: string, today = new Date()) {
  const b = parse(birthday)
  let a = today.getFullYear() - b.getFullYear()
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--
  return a
}

/**
 * Height in the game today: the height entered at sign-up, plus about an inch and a half for every birthday since
 * (only while under 18), never above the limit for the gender.
 */
export function gameHeight(p: Pick<Profile, 'birthday' | 'gender' | 'heightIn' | 'heightSetOn'>, today = new Date()) {
  const then = ageOn(p.birthday, parse(p.heightSetOn))
  const now = ageOn(p.birthday, today)
  const birthdays = Math.max(0, Math.min(now, 18) - Math.min(then, 18))
  return Math.min(MAX_HEIGHT[p.gender], Math.round(p.heightIn + birthdays * 1.5))
}

/** How tall the character is drawn: 5'2" is the base size, every inch is about 2.4% */
export const heightScale = (inches: number) => 1 + (inches - 62) * 0.024

export const feet = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`
