// Everything you can buy and place. Prices follow the design (no rarity); models come from Kenney's Furniture Kit (CC0).
import { PAINTINGS } from './paintings'

// Pacing: a nice room takes about a week of Hearts, a great one about a month.

/** Where an item goes: on the floor (blocks walking), flat on the floor (rugs), on top of a table or counter, or on a wall */
export type Kind = 'floor' | 'rug' | 'top' | 'wall'

export type Category = 'beds' | 'seating' | 'tables' | 'kitchen' | 'bath' | 'tech' | 'storage' | 'decor' | 'lights' | 'rugs' | 'art'

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'beds', label: 'Beds', icon: '🛏️' },
  { id: 'seating', label: 'Seats', icon: '🛋️' },
  { id: 'tables', label: 'Tables', icon: '🪵' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'bath', label: 'Bath', icon: '🛁' },
  { id: 'tech', label: 'Tech', icon: '🖥️' },
  { id: 'storage', label: 'Storage', icon: '📚' },
  { id: 'decor', label: 'Decor', icon: '🪴' },
  { id: 'lights', label: 'Lights', icon: '💡' },
  { id: 'rugs', label: 'Rugs', icon: '🟫' },
  { id: 'art', label: 'Art', icon: '🖼️' },
]

/** What tapping an item lets your character do */
export type Activity = 'nap' | 'sit' | 'eat' | 'pc' | 'cook' | 'snack' | 'read' | 'bath' | 'shower' | 'music' | 'hug' | 'toilet' | 'laundry' | 'coffee' | 'tv'

export type Item = {
  id: string
  model: string
  name: string
  cat: Category
  price: number
  kind: Kind
  /** Other items can sit on top of this one */
  surface?: boolean
  act?: Activity
  /** Material colors that make a special version (e.g. gold wood) */
  paint?: Record<string, string>
  /** Fabric can be recolored by the player */
  fabric?: boolean
}

const i = (id: string, model: string, name: string, cat: Category, price: number, kind: Kind, extra: Partial<Item> = {}): Item => ({ id, model, name, cat, price, kind, ...extra })

const GOLD = '#e8b84a'
const ROYAL = '#6a3fb5'

export const CATALOG: Item[] = [
  // Beds
  i('bedSingle', 'bedSingle', 'Single Bed', 'beds', 550, 'floor', { act: 'nap', fabric: true }),
  i('bedBunk', 'bedBunk', 'Bunk Bed', 'beds', 1600, 'floor', { act: 'nap', fabric: true }),
  i('bedDouble', 'bedDouble', 'Double Bed', 'beds', 2000, 'floor', { act: 'nap', fabric: true }),
  i('cabinetBed', 'cabinetBed', 'Nightstand', 'beds', 350, 'floor', { surface: true }),
  i('cabinetBedDrawer', 'cabinetBedDrawer', 'Bedside Drawers', 'beds', 400, 'floor', { surface: true }),
  i('cabinetBedDrawerTable', 'cabinetBedDrawerTable', 'Bedside Table', 'beds', 500, 'floor', { surface: true }),
  i('royalBed', 'bedDouble', 'Royal Bed', 'beds', 9000, 'floor', { act: 'nap', paint: { wood: GOLD, carpet: ROYAL, carpetWhite: '#f6ecff' } }),
  i('cloudBed', 'bedDouble', 'Cloud Nine Bed', 'beds', 13000, 'floor', { act: 'nap', paint: { wood: '#f5f7ff', carpet: '#9fd4ff', carpetWhite: '#ffffff', metal: '#cfe6ff' } }),

  // Seating
  i('chair', 'chair', 'Wooden Chair', 'seating', 300, 'floor', { act: 'sit' }),
  i('chairCushion', 'chairCushion', 'Cushion Chair', 'seating', 400, 'floor', { act: 'sit', fabric: true }),
  i('chairRounded', 'chairRounded', 'Round Chair', 'seating', 500, 'floor', { act: 'sit' }),
  i('chairDesk', 'chairDesk', 'Desk Chair', 'seating', 550, 'floor', { act: 'sit', fabric: true }),
  i('stoolBar', 'stoolBar', 'Bar Stool', 'seating', 300, 'floor', { act: 'sit' }),
  i('stoolBarSquare', 'stoolBarSquare', 'Square Stool', 'seating', 300, 'floor', { act: 'sit' }),
  i('bench', 'bench', 'Bench', 'seating', 350, 'floor', { act: 'sit' }),
  i('pillow', 'pillow', 'Floor Pillow', 'seating', 300, 'floor', { act: 'sit', fabric: true }),
  i('pillowLong', 'pillowLong', 'Long Floor Pillow', 'seating', 350, 'floor', { act: 'sit', fabric: true }),
  i('loungeSofaOttoman', 'loungeSofaOttoman', 'Ottoman', 'seating', 400, 'floor', { act: 'sit', fabric: true }),
  i('loungeSofa', 'loungeSofa', 'Sofa', 'seating', 700, 'floor', { act: 'sit', fabric: true }),
  i('chairModernCushion', 'chairModernCushion', 'Modern Chair', 'seating', 1200, 'floor', { act: 'sit', fabric: true }),
  i('chairModernFrameCushion', 'chairModernFrameCushion', 'Frame Chair', 'seating', 1300, 'floor', { act: 'sit', fabric: true }),
  i('benchCushion', 'benchCushion', 'Cushion Bench', 'seating', 1000, 'floor', { act: 'sit', fabric: true }),
  i('benchCushionLow', 'benchCushionLow', 'Low Bench', 'seating', 1100, 'floor', { act: 'sit', fabric: true }),
  i('loungeChair', 'loungeChair', 'Lounge Chair', 'seating', 1700, 'floor', { act: 'sit', fabric: true }),
  i('loungeSofaLong', 'loungeSofaLong', 'Long Sofa', 'seating', 1800, 'floor', { act: 'sit', fabric: true }),
  i('loungeChairRelax', 'loungeChairRelax', 'Recliner', 'seating', 3100, 'floor', { act: 'sit', fabric: true }),
  i('loungeDesignChair', 'loungeDesignChair', 'Designer Chair', 'seating', 3500, 'floor', { act: 'sit', fabric: true }),
  i('loungeSofaCorner', 'loungeSofaCorner', 'Corner Sofa', 'seating', 3900, 'floor', { act: 'sit', fabric: true }),
  i('loungeDesignSofa', 'loungeDesignSofa', 'Designer Sofa', 'seating', 4200, 'floor', { act: 'sit', fabric: true }),
  i('loungeDesignSofaCorner', 'loungeDesignSofaCorner', 'Designer Corner Sofa', 'seating', 8000, 'floor', { act: 'sit', fabric: true }),
  i('goldenThrone', 'loungeDesignChair', 'Golden Throne', 'seating', 11000, 'floor', { act: 'sit', paint: { wood: GOLD, metal: GOLD, carpet: '#c4213a' } }),
  i('auroraSofa', 'loungeDesignSofa', 'Aurora Sofa', 'seating', 12000, 'floor', { act: 'sit', paint: { carpet: '#7be0c8', wood: '#f3f0ff', metal: '#d9c8ff' } }),

  // Tables
  i('sideTable', 'sideTable', 'Side Table', 'tables', 350, 'floor', { surface: true }),
  i('sideTableDrawers', 'sideTableDrawers', 'Side Drawers', 'tables', 450, 'floor', { surface: true }),
  i('tableCoffee', 'tableCoffee', 'Coffee Table', 'tables', 500, 'floor', { surface: true }),
  i('tableCoffeeSquare', 'tableCoffeeSquare', 'Square Coffee Table', 'tables', 550, 'floor', { surface: true }),
  i('table', 'table', 'Table', 'tables', 550, 'floor', { surface: true, act: 'eat' }),
  i('tableCross', 'tableCross', 'Cross Table', 'tables', 650, 'floor', { surface: true, act: 'eat' }),
  i('desk', 'desk', 'Desk', 'tables', 650, 'floor', { surface: true }),
  i('tableCloth', 'tableCloth', 'Dining Table', 'tables', 1200, 'floor', { surface: true, act: 'eat' }),
  i('tableCrossCloth', 'tableCrossCloth', 'Cloth Table', 'tables', 1200, 'floor', { surface: true, act: 'eat' }),
  i('tableRound', 'tableRound', 'Round Table', 'tables', 1300, 'floor', { surface: true, act: 'eat' }),
  i('tableCoffeeGlass', 'tableCoffeeGlass', 'Glass Coffee Table', 'tables', 1400, 'floor', { surface: true }),
  i('tableCoffeeGlassSquare', 'tableCoffeeGlassSquare', 'Square Glass Table', 'tables', 1500, 'floor', { surface: true }),
  i('deskCorner', 'deskCorner', 'Corner Desk', 'tables', 1600, 'floor', { surface: true }),
  i('tableGlass', 'tableGlass', 'Glass Dining Table', 'tables', 2900, 'floor', { surface: true, act: 'eat' }),
  i('gamerDesk', 'deskCorner', 'Neon Gamer Desk', 'tables', 10500, 'floor', { surface: true, paint: { wood: '#23202e', metal: '#b06bff', metalDark: '#2b2540' } }),

  // Kitchen
  i('kitchenCabinet', 'kitchenCabinet', 'Counter', 'kitchen', 400, 'floor', { surface: true }),
  i('kitchenCabinetDrawer', 'kitchenCabinetDrawer', 'Drawer Counter', 'kitchen', 500, 'floor', { surface: true }),
  i('kitchenCabinetCornerInner', 'kitchenCabinetCornerInner', 'Corner Counter', 'kitchen', 500, 'floor', { surface: true }),
  i('kitchenCabinetCornerRound', 'kitchenCabinetCornerRound', 'Round Counter', 'kitchen', 500, 'floor', { surface: true }),
  i('kitchenSink', 'kitchenSink', 'Kitchen Sink', 'kitchen', 650, 'floor', { act: 'snack' }),
  i('kitchenStove', 'kitchenStove', 'Stove', 'kitchen', 700, 'floor', { act: 'cook' }),
  i('kitchenFridgeSmall', 'kitchenFridgeSmall', 'Mini Fridge', 'kitchen', 550, 'floor', { act: 'snack', surface: true }),
  i('kitchenBar', 'kitchenBar', 'Kitchen Bar', 'kitchen', 1200, 'floor', { surface: true, act: 'eat' }),
  i('kitchenBarEnd', 'kitchenBarEnd', 'Bar End', 'kitchen', 1000, 'floor', { surface: true }),
  i('kitchenFridge', 'kitchenFridge', 'Fridge', 'kitchen', 1300, 'floor', { act: 'snack' }),
  i('kitchenStoveElectric', 'kitchenStoveElectric', 'Electric Stove', 'kitchen', 1400, 'floor', { act: 'cook' }),
  i('kitchenFridgeBuiltIn', 'kitchenFridgeBuiltIn', 'Built-in Fridge', 'kitchen', 3100, 'floor', { act: 'snack' }),
  i('kitchenFridgeLarge', 'kitchenFridgeLarge', 'Big Fridge', 'kitchen', 3300, 'floor', { act: 'snack' }),
  i('roseFridge', 'kitchenFridgeLarge', 'Rose Gold Fridge', 'kitchen', 7500, 'floor', { act: 'snack', paint: { metalLight: '#f2c4b3', metal: '#e7a98f', metalDark: '#a8685a' } }),
  i('kitchenCabinetUpper', 'kitchenCabinetUpper', 'Wall Cabinet', 'kitchen', 400, 'wall'),
  i('kitchenCabinetUpperLow', 'kitchenCabinetUpperLow', 'Low Wall Cabinet', 'kitchen', 400, 'wall'),
  i('kitchenCabinetUpperDouble', 'kitchenCabinetUpperDouble', 'Double Wall Cabinet', 'kitchen', 1000, 'wall'),
  i('hoodModern', 'hoodModern', 'Range Hood', 'kitchen', 1200, 'wall'),
  i('hoodLarge', 'hoodLarge', 'Big Range Hood', 'kitchen', 1300, 'wall'),
  i('toaster', 'toaster', 'Toaster', 'kitchen', 300, 'top'),
  i('kitchenBlender', 'kitchenBlender', 'Blender', 'kitchen', 300, 'top'),
  i('kitchenMicrowave', 'kitchenMicrowave', 'Microwave', 'kitchen', 500, 'top', { act: 'snack' }),
  i('kitchenCoffeeMachine', 'kitchenCoffeeMachine', 'Coffee Machine', 'kitchen', 1200, 'top', { act: 'coffee' }),

  // Bath
  i('toilet', 'toilet', 'Toilet', 'bath', 400, 'floor', { act: 'toilet' }),
  i('bathroomSink', 'bathroomSink', 'Bathroom Sink', 'bath', 400, 'floor'),
  i('bathroomCabinet', 'bathroomCabinet', 'Bathroom Cabinet', 'bath', 400, 'floor', { surface: true }),
  i('bathroomCabinetDrawer', 'bathroomCabinetDrawer', 'Bathroom Drawers', 'bath', 450, 'floor', { surface: true }),
  i('trashcan', 'trashcan', 'Trash Can', 'bath', 300, 'floor'),
  i('bathroomMirror', 'bathroomMirror', 'Mirror', 'bath', 350, 'wall'),
  i('toiletSquare', 'toiletSquare', 'Square Toilet', 'bath', 1200, 'floor', { act: 'toilet' }),
  i('bathroomSinkSquare', 'bathroomSinkSquare', 'Square Sink', 'bath', 1100, 'floor'),
  i('shower', 'shower', 'Shower', 'bath', 1600, 'floor', { act: 'shower' }),
  i('washer', 'washer', 'Washing Machine', 'bath', 1300, 'floor', { act: 'laundry', surface: true }),
  i('dryer', 'dryer', 'Dryer', 'bath', 1300, 'floor', { act: 'laundry', surface: true }),
  i('showerRound', 'showerRound', 'Round Shower', 'bath', 3000, 'floor', { act: 'shower' }),
  i('washerDryerStacked', 'washerDryerStacked', 'Washer Tower', 'bath', 2900, 'floor', { act: 'laundry' }),
  i('bathtub', 'bathtub', 'Bathtub', 'bath', 3600, 'floor', { act: 'bath' }),
  i('crystalTub', 'bathtub', 'Crystal Bathtub', 'bath', 9500, 'floor', { act: 'bath', paint: { carpetWhite: '#bfe9ff', metalLight: '#e6f7ff', metalDark: '#5aa9d6' } }),

  // Tech
  i('cabinetTelevision', 'cabinetTelevision', 'TV Stand', 'tech', 550, 'floor', { surface: true }),
  i('televisionAntenna', 'televisionAntenna', 'Antenna', 'tech', 300, 'top'),
  i('computerKeyboard', 'computerKeyboard', 'Keyboard', 'tech', 300, 'top'),
  i('computerMouse', 'computerMouse', 'Mouse', 'tech', 300, 'top'),
  i('radio', 'radio', 'Radio', 'tech', 400, 'top', { act: 'music' }),
  i('speakerSmall', 'speakerSmall', 'Small Speaker', 'tech', 350, 'top', { act: 'music' }),
  i('cabinetTelevisionDoors', 'cabinetTelevisionDoors', 'TV Cabinet', 'tech', 1200, 'floor', { surface: true }),
  i('speaker', 'speaker', 'Speaker', 'tech', 1200, 'floor', { act: 'music' }),
  i('laptop', 'laptop', 'Laptop', 'tech', 1300, 'top', { act: 'pc' }),
  i('computerScreen', 'computerScreen', 'Monitor', 'tech', 1600, 'top', { act: 'pc' }),
  i('televisionVintage', 'televisionVintage', 'Retro TV', 'tech', 1600, 'floor', { act: 'tv' }),
  i('televisionModern', 'televisionModern', 'Flat TV', 'tech', 3300, 'top', { act: 'tv' }),

  // Storage
  i('books', 'books', 'Books', 'storage', 300, 'top', { act: 'read' }),
  i('cardboardBoxClosed', 'cardboardBoxClosed', 'Box', 'storage', 300, 'floor', { surface: true }),
  i('cardboardBoxOpen', 'cardboardBoxOpen', 'Open Box', 'storage', 300, 'floor'),
  i('coatRackStanding', 'coatRackStanding', 'Coat Stand', 'storage', 400, 'floor'),
  i('coatRack', 'coatRack', 'Wall Hooks', 'storage', 350, 'wall'),
  i('bookcaseOpenLow', 'bookcaseOpenLow', 'Low Bookcase', 'storage', 500, 'floor', { surface: true, act: 'read' }),
  i('bookcaseOpen', 'bookcaseOpen', 'Bookcase', 'storage', 650, 'floor', { act: 'read' }),
  i('bookcaseClosed', 'bookcaseClosed', 'Closed Bookcase', 'storage', 1200, 'floor', { act: 'read' }),
  i('bookcaseClosedDoors', 'bookcaseClosedDoors', 'Wardrobe', 'storage', 1300, 'floor'),
  i('bookcaseClosedWide', 'bookcaseClosedWide', 'Wide Wardrobe', 'storage', 2800, 'floor'),

  // Decor
  i('plantSmall1', 'plantSmall1', 'Little Plant', 'decor', 300, 'top'),
  i('plantSmall2', 'plantSmall2', 'Little Cactus', 'decor', 300, 'top'),
  i('plantSmall3', 'plantSmall3', 'Little Fern', 'decor', 300, 'top'),
  i('pottedPlant', 'pottedPlant', 'Potted Plant', 'decor', 400, 'floor'),
  i('bear', 'bear', 'Teddy Bear', 'decor', 1400, 'floor', { act: 'hug' }),
  i('goldenBear', 'bear', 'Golden Teddy', 'decor', 6500, 'floor', { act: 'hug', paint: { fur: GOLD, wood: GOLD } }),

  // Lights
  i('lampRoundTable', 'lampRoundTable', 'Round Table Lamp', 'lights', 350, 'top'),
  i('lampSquareTable', 'lampSquareTable', 'Square Table Lamp', 'lights', 400, 'top'),
  i('lampWall', 'lampWall', 'Wall Lamp', 'lights', 350, 'wall'),
  i('lampRoundFloor', 'lampRoundFloor', 'Floor Lamp', 'lights', 550, 'floor'),
  i('lampSquareFloor', 'lampSquareFloor', 'Square Floor Lamp', 'lights', 1200, 'floor'),
  i('goldenLamp', 'lampSquareFloor', 'Golden Lamp', 'lights', 7000, 'floor', { paint: { metal: GOLD, metalDark: '#a87a1e' } }),

  // Rugs
  i('rugDoormat', 'rugDoormat', 'Doormat', 'rugs', 300, 'rug'),
  i('rugRectangle', 'rugRectangle', 'Rectangle Rug', 'rugs', 550, 'rug', { fabric: true }),
  i('rugSquare', 'rugSquare', 'Square Rug', 'rugs', 650, 'rug', { fabric: true }),
  i('rugRound', 'rugRound', 'Round Rug', 'rugs', 1200, 'rug', { fabric: true }),
  i('rugRounded', 'rugRounded', 'Soft Rug', 'rugs', 1200, 'rug', { fabric: true }),
  i('starryRug', 'rugRound', 'Starry Night Rug', 'rugs', 10000, 'rug', { paint: { carpet: '#1d2a6b', carpetDarker: '#f4d35e' } }),
]

// ---- Added in 1.1.0: 20 new items in every category, and paintings ----

/** A color theme for a whole set of furniture. Every material of the kit gets a color from it. */
type Theme = { id: string; name: string; wood: string; soft: string; light: string; dark: string; metal: string; lamp: string; plant: string; premium?: boolean }

const THEMES: Theme[] = [
  { id: 'sakura', name: 'Sakura', wood: '#f3c6d3', soft: '#ff9fbd', light: '#fff1f5', dark: '#c97b93', metal: '#f6d5de', lamp: '#fff2d6', plant: '#ff9fc0' },
  { id: 'mint', name: 'Mint', wood: '#cfeee0', soft: '#7fd8b4', light: '#f2fffa', dark: '#4f9e82', metal: '#bfe8d8', lamp: '#f6fff0', plant: '#6cc47a' },
  { id: 'lemon', name: 'Lemon', wood: '#fbe7a1', soft: '#ffd85a', light: '#fffbe8', dark: '#c9a23a', metal: '#f4e2a0', lamp: '#fff6c8', plant: '#9bd16f' },
  { id: 'ocean', name: 'Ocean', wood: '#b9d7ea', soft: '#3c8cf0', light: '#eef7ff', dark: '#26508f', metal: '#a9c8e6', lamp: '#e9f6ff', plant: '#4fb0a0' },
  { id: 'lavender', name: 'Lavender', wood: '#ddd0f2', soft: '#a77bf0', light: '#f7f2ff', dark: '#6a4fb0', metal: '#d4c6f0', lamp: '#fbf3ff', plant: '#a98bd9' },
  { id: 'cocoa', name: 'Cocoa', wood: '#6b4430', soft: '#c49a6c', light: '#f2e3cf', dark: '#3e271c', metal: '#8a6a52', lamp: '#ffe2b0', plant: '#6f9b4f' },
  { id: 'cloud', name: 'Cloud', wood: '#f5f7fb', soft: '#e6ecf5', light: '#ffffff', dark: '#b9c3d3', metal: '#e9edf3', lamp: '#ffffff', plant: '#9fd1b0' },
  { id: 'forest', name: 'Forest', wood: '#7a5a3a', soft: '#4f7a4a', light: '#e9efe2', dark: '#2f4a2c', metal: '#6c7a5c', lamp: '#fff0c8', plant: '#3f8a4a' },
  { id: 'sunset', name: 'Sunset', wood: '#f2b07a', soft: '#f2724c', light: '#fff0e3', dark: '#b34a2e', metal: '#f0b896', lamp: '#ffd9a8', plant: '#e7a34a' },
  { id: 'noir', name: 'Noir', wood: '#2b2a30', soft: '#3b3a42', light: '#e9e6e1', dark: '#141317', metal: '#4a4952', lamp: '#fff5d6', plant: '#4a6b4a' },
  { id: 'peach', name: 'Peach', wood: '#f7d2bd', soft: '#ffb38a', light: '#fff6f0', dark: '#d08560', metal: '#f2cdb8', lamp: '#fff3e2', plant: '#f0a07a' },
  { id: 'matcha', name: 'Matcha', wood: '#c9d6a3', soft: '#9cbb6a', light: '#f6f8ea', dark: '#5e7a3a', metal: '#c4cfa0', lamp: '#f9ffe4', plant: '#7da54a' },
  { id: 'ember', name: 'Ember', wood: '#8a3a2e', soft: '#e2443a', light: '#ffe9e3', dark: '#5a1f18', metal: '#b85a4a', lamp: '#ffd0a0', plant: '#c94f3b' },
  { id: 'frost', name: 'Frost', wood: '#dff1fb', soft: '#9fdcf5', light: '#ffffff', dark: '#6aa9cc', metal: '#cfe9f6', lamp: '#f0fbff', plant: '#a6e0e8' },
  { id: 'retro', name: 'Retro', wood: '#e0a46a', soft: '#2fb3a0', light: '#fdf3df', dark: '#b5562e', metal: '#e6c48a', lamp: '#ffe6a8', plant: '#e8743b' },
  { id: 'candy', name: 'Candy', wood: '#ffd3e6', soft: '#8fd6f7', light: '#fffafc', dark: '#f07fb0', metal: '#ffc8de', lamp: '#fff3fa', plant: '#ff8fc0' },
  { id: 'berry', name: 'Berry', wood: '#7a2f4f', soft: '#b8327a', light: '#fbe6f0', dark: '#4a1a32', metal: '#a35a7a', lamp: '#ffd9ef', plant: '#c13584' },
  { id: 'gilded', name: 'Gilded', wood: GOLD, soft: '#f6e3a0', light: '#fff8e1', dark: '#a87a1e', metal: GOLD, lamp: '#fff1c0', plant: '#d9a93b', premium: true },
  { id: 'galaxy', name: 'Galaxy', wood: '#2a2560', soft: '#5b3fa8', light: '#d9d0ff', dark: '#141033', metal: '#8a7cf0', lamp: '#f4ecff', plant: '#b06bff', premium: true },
  { id: 'crystal', name: 'Crystal', wood: '#e6f7ff', soft: '#bfe9ff', light: '#ffffff', dark: '#5aa9d6', metal: '#d6f2ff', lamp: '#ffffff', plant: '#9fe6ff', premium: true },
]

/** A color a little darker, for the shaded parts of fabric */
const darker = (hex: string) =>
  `#${[1, 3, 5]
    .map((k) =>
      Math.round(parseInt(hex.slice(k, k + 2), 16) * 0.72)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

const themePaint = (t: Theme): Record<string, string> => ({
  wood: t.wood,
  woodDark: t.dark,
  carpet: t.soft,
  carpetBlue: t.soft,
  carpetDarker: darker(t.soft),
  carpetWhite: t.light,
  metal: t.metal,
  metalMedium: t.metal,
  metalLight: t.light,
  metalDark: t.dark,
  lamp: t.lamp,
  plant: t.plant,
  fur: t.soft,
})

/** The kit models each category's themed sets are made from */
const THEMED: Record<Exclude<Category, 'art'>, string[]> = {
  beds: ['bedSingle', 'bedDouble', 'bedBunk', 'cabinetBedDrawerTable'],
  seating: ['loungeSofa', 'loungeChair', 'chairCushion', 'loungeSofaLong', 'pillow'],
  tables: ['tableRound', 'tableCoffee', 'desk', 'sideTable'],
  kitchen: ['kitchenFridge', 'kitchenStove', 'kitchenCabinet', 'kitchenCoffeeMachine', 'kitchenMicrowave'],
  bath: ['bathtub', 'toilet', 'shower', 'washer', 'bathroomSink'],
  tech: ['televisionVintage', 'laptop', 'speaker', 'radio', 'computerScreen'],
  storage: ['bookcaseOpen', 'bookcaseClosedDoors', 'bookcaseOpenLow', 'coatRackStanding'],
  decor: ['pottedPlant', 'bear', 'plantSmall1', 'plantSmall3'],
  lights: ['lampRoundFloor', 'lampSquareTable', 'lampWall', 'lampRoundTable', 'lampSquareFloor'],
  rugs: ['rugRound', 'rugRectangle', 'rugSquare', 'rugRounded'],
}

/** Every category gets one item in each of the 20 themes, cycling through its models */
const themedItems = (base: Record<string, Item>): Item[] =>
  (Object.keys(THEMED) as (keyof typeof THEMED)[]).flatMap((cat) =>
    THEMES.map((t, k) => {
      const model = THEMED[cat][k % THEMED[cat].length]
      const b = base[model]
      const price = Math.max(b.price + 200, Math.round((b.price * (t.premium ? 4 : 1.4)) / 50) * 50)
      return { ...b, id: `${t.id}-${model}`, name: `${t.name} ${b.name}`, price, paint: themePaint(t), fabric: false }
    }),
  )

const ART: Item[] = PAINTINGS.map((p) => i(p.id, p.id, p.name, 'art', p.price, 'wall'))

/**
 * Price rebalance (1.1.0): plain kit furniture from 1,000 Hearts up costs about 10% less, so a nice room comes
 * a little sooner. Special editions keep their prices.
 */
CATALOG.forEach((x) => {
  if (!x.paint && x.price >= 1000) x.price = Math.round((x.price * 0.9) / 50) * 50
})

const BASE: Record<string, Item> = Object.fromEntries(CATALOG.map((x) => [x.id, x]))
CATALOG.push(...themedItems(BASE), ...ART)

export const ITEMS: Record<string, Item> = Object.fromEntries(CATALOG.map((x) => [x.id, x]))

/** Fabric colors a player can pick for beds, sofas and rugs */
export const FABRICS = ['#ef5e57', '#f29e4c', '#f2d36b', '#7bc96f', '#5bb8d6', '#6c8cf0', '#a77bf0', '#f28bb8', '#efe8dc', '#5b5f6b']
