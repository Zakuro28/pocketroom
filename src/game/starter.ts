import type { Placed } from './grid'

// Day one: a plain studio with just a bed, a small table to eat at, and a PC for play and work.
// Everything else is bought with Hearts. Rotation 0 faces the room's front-right, 1 faces front-left.
export const STARTER: Placed[] = [
  { uid: 's-bed', id: 'bedSingle', x: 1, z: 0, r: 0 },
  { uid: 's-desk', id: 'desk', x: 5, z: 0, r: 0 },
  { uid: 's-screen', id: 'computerScreen', x: 5, z: 0, r: 0, on: 's-desk' },
  { uid: 's-dchair', id: 'chairDesk', x: 5, z: 1, r: 2 },
  { uid: 's-table', id: 'table', x: 9, z: 6, r: 0 },
  { uid: 's-chair', id: 'chair', x: 9, z: 7, r: 2 },
]
