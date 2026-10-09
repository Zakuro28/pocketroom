import type { Slot } from './look'

// Clothes for your character. Unlike furniture, clothing has rarity; rarer pieces cost more and glow in the shop.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical'
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: '#4cc46a' },
  rare: { label: 'Rare', color: '#3c8cf0' },
  epic: { label: 'Epic', color: '#a25ef0' },
  legendary: { label: 'Legendary', color: '#f39a2b' },
  mythical: { label: 'Mythical', color: '#ef4b5a' },
}

/** The shape a piece of clothing is drawn with */
export type Cut =
  | 'tee'
  | 'longsleeve'
  | 'hoodie'
  | 'jacket'
  | 'dress'
  | 'pants'
  | 'shorts'
  | 'skirt'
  | 'sneakers'
  | 'boots'
  | 'slippers'
  | 'cap'
  | 'beanie'
  | 'bucket'
  | 'crown'
  | 'flowers'
  | 'glasses'
  | 'shades'
  | 'headphones'

export type Clothing = { id: string; slot: Slot; name: string; cut: Cut; color: string; accent?: string; rarity: Rarity; price: number }

const c = (id: string, slot: Slot, name: string, cut: Cut, color: string, rarity: Rarity, price: number, accent?: string): Clothing => ({ id, slot, name, cut, color, accent, rarity, price })

export const CLOTHES: Clothing[] = [
  // Tops
  c('tee-sky', 'top', 'Sky Tee', 'tee', '#7bc4e8', 'common', 0),
  c('tee-white', 'top', 'White Tee', 'tee', '#f5f2ec', 'common', 300),
  c('tee-sun', 'top', 'Sunny Tee', 'tee', '#ffcf5a', 'common', 300),
  c('tee-mint', 'top', 'Mint Tee', 'tee', '#7fd8b4', 'common', 300),
  c('long-stripe', 'top', 'Cozy Sweater', 'longsleeve', '#e98a8a', 'common', 500, '#fff1e6'),
  c('long-navy', 'top', 'Navy Sweater', 'longsleeve', '#3d4f7c', 'common', 500, '#e8eefc'),
  c('hoodie-gray', 'top', 'Gray Hoodie', 'hoodie', '#9aa3ad', 'rare', 1100),
  c('hoodie-pink', 'top', 'Strawberry Hoodie', 'hoodie', '#f59ab7', 'rare', 1200),
  c('jacket-denim', 'top', 'Denim Jacket', 'jacket', '#5a7fb5', 'rare', 1400, '#f5f2ec'),
  c('dress-floral', 'top', 'Sundress', 'dress', '#f2b6c8', 'rare', 1300),
  c('jacket-leather', 'top', 'Leather Jacket', 'jacket', '#2d2a2e', 'epic', 3200, '#c94f3b'),
  c('dress-gala', 'top', 'Gala Dress', 'dress', '#6a3fb5', 'epic', 3500),
  c('hoodie-galaxy', 'top', 'Galaxy Hoodie', 'hoodie', '#28306a', 'legendary', 7500, '#ffd166'),
  c('dress-starlight', 'top', 'Starlight Gown', 'dress', '#e9f2ff', 'mythical', 13000, '#ffd166'),

  // Bottoms
  c('jeans', 'bottom', 'Jeans', 'pants', '#46506a', 'common', 0),
  c('pants-khaki', 'bottom', 'Khakis', 'pants', '#c4a77d', 'common', 300),
  c('shorts-denim', 'bottom', 'Denim Shorts', 'shorts', '#5a7fb5', 'common', 300),
  c('skirt-pleated', 'bottom', 'Pleated Skirt', 'skirt', '#3d4f7c', 'common', 400),
  c('pants-cargo', 'bottom', 'Cargo Pants', 'pants', '#6c7356', 'rare', 900),
  c('skirt-pink', 'bottom', 'Tutu Skirt', 'skirt', '#f7b3cf', 'rare', 1000),
  c('pants-gold', 'bottom', 'Gold Trousers', 'pants', '#d9a93b', 'legendary', 6500),

  // Shoes
  c('sneakers-white', 'shoes', 'White Sneakers', 'sneakers', '#f5f2ec', 'common', 0),
  c('sneakers-red', 'shoes', 'Red Sneakers', 'sneakers', '#e65a5a', 'common', 300),
  c('slippers', 'shoes', 'Bunny Slippers', 'slippers', '#fbe3ec', 'common', 400),
  c('boots-brown', 'shoes', 'Brown Boots', 'boots', '#7a4f33', 'rare', 900),
  c('boots-gold', 'shoes', 'Golden Boots', 'boots', '#e8b84a', 'epic', 2800),

  // Hats
  c('cap-red', 'hat', 'Red Cap', 'cap', '#e65a5a', 'common', 400),
  c('beanie-mustard', 'hat', 'Mustard Beanie', 'beanie', '#e0a93a', 'common', 400),
  c('bucket-sage', 'hat', 'Bucket Hat', 'bucket', '#a9bf8f', 'rare', 1000),
  c('flowers', 'hat', 'Flower Crown', 'flowers', '#ff8fb0', 'epic', 2600, '#ffe066'),
  c('crown', 'hat', 'Royal Crown', 'crown', '#e8b84a', 'legendary', 9000, '#ef4b5a'),

  // Face
  c('glasses-round', 'face', 'Round Glasses', 'glasses', '#3a2a22', 'common', 350),
  c('shades', 'face', 'Sunglasses', 'shades', '#1d1d24', 'rare', 900),
  c('headphones', 'face', 'Headphones', 'headphones', '#ff6b8a', 'epic', 2500, '#2d2a2e'),
]

export const CLOTHING: Record<string, Clothing> = Object.fromEntries(CLOTHES.map((x) => [x.id, x]))

/** Clothes every new player starts with */
export const STARTER_CLOTHES = CLOTHES.filter((x) => x.price === 0).map((x) => x.id)

export const SLOTS: { id: Slot; label: string; icon: string }[] = [
  { id: 'top', label: 'Tops', icon: '👕' },
  { id: 'bottom', label: 'Bottoms', icon: '👖' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'hat', label: 'Hats', icon: '🧢' },
  { id: 'face', label: 'Face', icon: '👓' },
]
