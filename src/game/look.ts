/** How your character looks. Fixed for now; sign-up will let players pick all of this. */
export type Look = { skin: string; hair: string; eyes: string; shirt: string; pants: string; shoes: string; height: number; build: number }
export const DEFAULT_LOOK: Look = { skin: '#f3c9a5', hair: '#3b2a24', eyes: '#2b2233', shirt: '#7bc4e8', pants: '#46506a', shoes: '#f5f2ec', height: 1, build: 1 }
