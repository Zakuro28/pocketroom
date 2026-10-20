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
  | 'tank'
  | 'sandals'
  | 'beret'
  | 'tophat'
  | 'bow'
  | 'catEars'
  | 'halo'
  | 'hearts'
  | 'mask'
  | 'monocle'

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

  // ---- Added in 1.1.0: 20 new pieces in every category ----

  // Tops
  c('tank-white', 'top', 'White Tank', 'tank', '#f5f2ec', 'common', 250),
  c('tank-coral', 'top', 'Coral Tank', 'tank', '#ff8a7a', 'common', 300),
  c('tee-black', 'top', 'Black Tee', 'tee', '#2b2a30', 'common', 300),
  c('tee-lilac', 'top', 'Lilac Tee', 'tee', '#c9b3f0', 'common', 300),
  c('tee-peach', 'top', 'Peach Tee', 'tee', '#ffc29e', 'common', 300),
  c('long-forest', 'top', 'Forest Sweater', 'longsleeve', '#3f6b4f', 'common', 500, '#e9dfc6'),
  c('long-cream', 'top', 'Cream Knit', 'longsleeve', '#efe4cf', 'common', 500, '#c9a77d'),
  c('hoodie-mint', 'top', 'Mint Hoodie', 'hoodie', '#8fdcc0', 'rare', 1100),
  c('hoodie-black', 'top', 'Midnight Hoodie', 'hoodie', '#25232b', 'rare', 1200, '#ff5d86'),
  c('hoodie-lemon', 'top', 'Lemon Hoodie', 'hoodie', '#ffe27a', 'rare', 1100, '#ffffff'),
  c('jacket-bomber', 'top', 'Bomber Jacket', 'jacket', '#56643f', 'rare', 1400, '#f29e4c'),
  c('jacket-varsity', 'top', 'Varsity Jacket', 'jacket', '#b8323f', 'rare', 1500, '#f5f2ec'),
  c('dress-cherry', 'top', 'Cherry Dress', 'dress', '#e2443a', 'rare', 1300, '#ffffff'),
  c('dress-mint', 'top', 'Mint Dress', 'dress', '#a6e3cf', 'rare', 1200),
  c('tank-gold', 'top', 'Gold Tank', 'tank', '#e8b84a', 'epic', 2600),
  c('jacket-puffer', 'top', 'Puffer Jacket', 'jacket', '#5bb8d6', 'epic', 3000, '#f5f2ec'),
  c('dress-sakura', 'top', 'Sakura Dress', 'dress', '#ffc6d9', 'epic', 3400, '#c94f6b'),
  c('hoodie-rainbow', 'top', 'Rainbow Hoodie', 'hoodie', '#7c6cf0', 'legendary', 7000, '#ffd166'),
  c('jacket-royal', 'top', 'Royal Coat', 'jacket', '#4a2a8a', 'legendary', 8000, '#e8b84a'),
  c('dress-aurora', 'top', 'Aurora Gown', 'dress', '#7be0c8', 'mythical', 13500, '#d9c8ff'),

  // Bottoms
  c('jeans-black', 'bottom', 'Black Jeans', 'pants', '#2b2a30', 'common', 300),
  c('jeans-light', 'bottom', 'Light Jeans', 'pants', '#8fb0d9', 'common', 300),
  c('pants-white', 'bottom', 'White Pants', 'pants', '#f2efe8', 'common', 350),
  c('pants-pink', 'bottom', 'Pink Pants', 'pants', '#f6a8c4', 'common', 350),
  c('pants-joggers', 'bottom', 'Gray Joggers', 'pants', '#9aa3ad', 'common', 400),
  c('shorts-khaki', 'bottom', 'Khaki Shorts', 'shorts', '#c4a77d', 'common', 250),
  c('shorts-red', 'bottom', 'Gym Shorts', 'shorts', '#e65a5a', 'common', 250),
  c('shorts-mint', 'bottom', 'Mint Shorts', 'shorts', '#8fdcc0', 'common', 300),
  c('skirt-black', 'bottom', 'Black Skirt', 'skirt', '#2b2a30', 'common', 400),
  c('skirt-plaid', 'bottom', 'Red Skirt', 'skirt', '#b8323f', 'common', 400),
  c('skirt-denim', 'bottom', 'Denim Skirt', 'skirt', '#5a7fb5', 'common', 400),
  c('pants-navy', 'bottom', 'Navy Slacks', 'pants', '#2d3a5e', 'rare', 900),
  c('pants-lavender', 'bottom', 'Lavender Pants', 'pants', '#b9a2ea', 'rare', 900),
  c('shorts-sun', 'bottom', 'Sunny Shorts', 'shorts', '#ffcf5a', 'rare', 900),
  c('skirt-lilac', 'bottom', 'Lilac Tutu', 'skirt', '#d8c4ff', 'rare', 1000),
  c('pants-leather', 'bottom', 'Leather Pants', 'pants', '#1f1c1d', 'epic', 2600),
  c('skirt-velvet', 'bottom', 'Velvet Skirt', 'skirt', '#7a1f3d', 'epic', 2800),
  c('pants-galaxy', 'bottom', 'Galaxy Pants', 'pants', '#28306a', 'legendary', 7000),
  c('skirt-gold', 'bottom', 'Golden Skirt', 'skirt', '#e8b84a', 'legendary', 7500),
  c('pants-starlight', 'bottom', 'Starlight Trousers', 'pants', '#e9f2ff', 'mythical', 12500),

  // Shoes
  c('sneakers-black', 'shoes', 'Black Sneakers', 'sneakers', '#2b2a30', 'common', 300),
  c('sneakers-blue', 'shoes', 'Blue Sneakers', 'sneakers', '#5b8ef0', 'common', 300),
  c('sneakers-pink', 'shoes', 'Pink Sneakers', 'sneakers', '#f59ab7', 'common', 300),
  c('sneakers-green', 'shoes', 'Green Sneakers', 'sneakers', '#6cc47a', 'common', 300),
  c('sandals-brown', 'shoes', 'Sandals', 'sandals', '#8a5a3b', 'common', 250),
  c('sandals-white', 'shoes', 'White Sandals', 'sandals', '#f5f2ec', 'common', 300),
  c('slippers-gray', 'shoes', 'Cozy Slippers', 'slippers', '#c9ccd2', 'common', 350),
  c('slippers-bear', 'shoes', 'Bear Slippers', 'slippers', '#a0663c', 'common', 400),
  c('boots-black', 'shoes', 'Black Boots', 'boots', '#2b2a30', 'rare', 900),
  c('boots-white', 'shoes', 'White Boots', 'boots', '#f2efe8', 'rare', 900),
  c('boots-rain', 'shoes', 'Rain Boots', 'boots', '#ffcf3a', 'rare', 950),
  c('boots-hiking', 'shoes', 'Hiking Boots', 'boots', '#a77b4f', 'rare', 1000),
  c('sneakers-high', 'shoes', 'High-tops', 'sneakers', '#c94f3b', 'rare', 1100),
  c('boots-cowboy', 'shoes', 'Cowboy Boots', 'boots', '#8a4f2a', 'rare', 1200),
  c('sandals-gold', 'shoes', 'Golden Sandals', 'sandals', '#e8b84a', 'epic', 2400),
  c('boots-pink', 'shoes', 'Pink Boots', 'boots', '#ff7fae', 'epic', 2600),
  c('sneakers-holo', 'shoes', 'Holo Sneakers', 'sneakers', '#b9d8ff', 'epic', 2800),
  c('sneakers-galaxy', 'shoes', 'Galaxy Sneakers', 'sneakers', '#3a2f7a', 'legendary', 6500),
  c('boots-crystal', 'shoes', 'Crystal Boots', 'boots', '#bfe9ff', 'legendary', 8000),
  c('sneakers-star', 'shoes', 'Starlight Sneakers', 'sneakers', '#fff6d6', 'mythical', 12000),

  // Hats
  c('cap-blue', 'hat', 'Blue Cap', 'cap', '#3c8cf0', 'common', 400),
  c('cap-black', 'hat', 'Black Cap', 'cap', '#2b2a30', 'common', 400),
  c('beanie-gray', 'hat', 'Gray Beanie', 'beanie', '#9aa3ad', 'common', 400),
  c('beanie-pink', 'hat', 'Pink Beanie', 'beanie', '#f59ab7', 'common', 400),
  c('bucket-denim', 'hat', 'Denim Bucket Hat', 'bucket', '#5a7fb5', 'common', 450),
  c('bow-pink', 'hat', 'Pink Bow', 'bow', '#ff8fb0', 'common', 450),
  c('beret-red', 'hat', 'Red Beret', 'beret', '#c94f3b', 'common', 500),
  c('beret-black', 'hat', 'Black Beret', 'beret', '#2b2a30', 'rare', 900),
  c('bow-red', 'hat', 'Red Bow', 'bow', '#e2443a', 'rare', 900),
  c('bucket-yellow', 'hat', 'Sunny Bucket Hat', 'bucket', '#ffcf5a', 'rare', 1000),
  c('catEars-black', 'hat', 'Cat Ears', 'catEars', '#2b2a30', 'rare', 1100, '#f6b8c2'),
  c('tophat-black', 'hat', 'Top Hat', 'tophat', '#2b2a30', 'rare', 1300, '#c94f3b'),
  c('catEars-pink', 'hat', 'Pink Cat Ears', 'catEars', '#ffc6d9', 'epic', 2400, '#ffffff'),
  c('flowers-white', 'hat', 'Daisy Crown', 'flowers', '#ffffff', 'epic', 2600, '#ffd166'),
  c('cap-gold', 'hat', 'Gold Cap', 'cap', '#e8b84a', 'epic', 2800),
  c('tophat-purple', 'hat', 'Magician Hat', 'tophat', '#4a2a8a', 'epic', 3000, '#e8b84a'),
  c('crown-silver', 'hat', 'Silver Crown', 'crown', '#d6dbe3', 'legendary', 8000, '#5b8ef0'),
  c('halo', 'hat', 'Halo', 'halo', '#ffe27a', 'legendary', 8500),
  c('crown-star', 'hat', 'Star Crown', 'crown', '#fff1b8', 'mythical', 13000, '#b06bff'),
  c('halo-rainbow', 'hat', 'Rainbow Halo', 'halo', '#ff9ad5', 'mythical', 14000),

  // Face
  c('glasses-black', 'face', 'Black Glasses', 'glasses', '#1d1d24', 'common', 350),
  c('glasses-pink', 'face', 'Pink Glasses', 'glasses', '#f59ab7', 'common', 350),
  c('glasses-blue', 'face', 'Blue Glasses', 'glasses', '#3c8cf0', 'common', 350),
  c('glasses-red', 'face', 'Red Glasses', 'glasses', '#e2443a', 'common', 400),
  c('mask-white', 'face', 'Face Mask', 'mask', '#f5f2ec', 'common', 300),
  c('mask-pink', 'face', 'Pink Face Mask', 'mask', '#ffc6d9', 'common', 300),
  c('mask-black', 'face', 'Black Face Mask', 'mask', '#2b2a30', 'common', 350),
  c('glasses-gold', 'face', 'Gold Glasses', 'glasses', '#d9a93b', 'rare', 900),
  c('shades-pink', 'face', 'Pink Shades', 'shades', '#e0558a', 'rare', 900),
  c('shades-blue', 'face', 'Blue Shades', 'shades', '#2f5fb8', 'rare', 900),
  c('shades-mirror', 'face', 'Mirror Shades', 'shades', '#9fb6c9', 'rare', 1000),
  c('hearts-pink', 'face', 'Heart Shades', 'hearts', '#ff5d86', 'rare', 1100),
  c('hearts-red', 'face', 'Red Heart Shades', 'hearts', '#c4213a', 'epic', 2400),
  c('shades-gold', 'face', 'Gold Shades', 'shades', '#c9952b', 'epic', 2400),
  c('headphones-blue', 'face', 'Blue Headphones', 'headphones', '#5b8ef0', 'epic', 2500, '#f5f2ec'),
  c('headphones-white', 'face', 'White Headphones', 'headphones', '#f5f2ec', 'epic', 2500, '#9aa3ad'),
  c('monocle', 'face', 'Monocle', 'monocle', '#e8b84a', 'epic', 2800),
  c('hearts-rainbow', 'face', 'Love Shades', 'hearts', '#b06bff', 'legendary', 6500),
  c('headphones-gold', 'face', 'Gold Headphones', 'headphones', '#e8b84a', 'legendary', 7000, '#2d2a2e'),
  c('headphones-galaxy', 'face', 'Galaxy Headphones', 'headphones', '#28306a', 'mythical', 12000, '#ffd166'),
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
