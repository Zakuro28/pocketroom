/**
 * Patch notes and the game's About page. To announce an update: add it to the top of UPDATES and it becomes the
 * current version. Every player sees the new notes once (it's remembered in their saved game).
 */

export type Section = { title: string; points: string[] }
export type Update = { version: string; title: string; date: string; intro: string[]; sections: Section[]; outro: string }

export const UPDATES: Update[] = [
  {
    version: '1.1.0',
    title: 'The October 20 update is here!',
    date: '2026-10-20',
    intro: [
      'PocketRoom’s first major update has arrived: more to wear, more to decorate, livelier pets, more for couples, and a lot of fixes.',
      'Thank you for all your feedback. Here’s everything that’s new.',
    ],
    sections: [
      {
        title: '🐾 Pets',
        points: [
          'Legs move as pets walk, snakes wriggle and snails stretch as they crawl. Pets have paws now, and long-legged animals have necks.',
          'Feeding and petting: your character walks over to the pet, the pet sits down happily, and the Hearts arrive after a short moment.',
          'Living together, tap your partner’s pet to see its stats, and feed or pet it.',
          'The reel spins a full 6 seconds, fast at first and slowing down at the end.',
          'Legendary, Mythical and Divine stay a mystery on the reel until it stops.',
          'When your room is full, choose: swap your new pet into the room, or send it to foster care.',
          'When foster care is full, the adoption choice now comes after you welcome your new pet home.',
        ],
      },
      {
        title: '👕 Your character',
        points: [
          '20 new hairstyles (afro, braids, mohawk, twin tails, locs and more) and 20 new hair colors.',
          'Dye your shirt, pants and shoes any color you like in the wardrobe, for free.',
          '20 new pieces in every wardrobe category, with new shapes: tank tops, sandals, berets, top hats, bows, cat ears, halos, heart shades, face masks and monocles.',
          'A new gender option: Non-binary.',
        ],
      },
      {
        title: '🏠 Your home',
        points: [
          '20 new items in every decoration category, in 20 color themes, from Sakura and Mint to Galaxy, Gilded and Crystal.',
          'A new Art tab with 20 paintings to hang on your walls.',
          'Prices get a small rebalance: plain furniture from 1,000 Hearts up costs about 10% less.',
        ],
      },
      {
        title: '💞 Couples',
        points: [
          'Cuddle time: while you’re both home, every 5 minutes together adds 30 Hearts to your jar, up to 6 times a day.',
          'Your anniversary is set once, and stays.',
          'Pet care and the jar now reset at midnight where you live.',
        ],
      },
      {
        title: '🛠️ Fixes',
        points: [
          'Every window fits and scrolls on small phones (including deleting your account on iPhone).',
          'Your character stays visible while you try on clothes on a phone.',
          'Activities and pet care happen one at a time, with a short loading moment.',
          'A room with something the game doesn’t recognize no longer stops it from loading.',
        ],
      },
    ],
    outro: 'More updates soon. Thank you for playing PocketRoom. 💗',
  },
  {
    version: '1.0.1',
    title: 'Major update coming October 20',
    date: '2026-10-18',
    intro: [
      'Thank you for all your feedback since launch. On October 20, PocketRoom gets its first major update: more to wear, more to decorate, livelier pets, more for couples, and a lot of fixes.',
      'Here’s everything that’s coming.',
    ],
    sections: [
      {
        title: '🐾 Pets',
        points: [
          'Pets look more like their real animals, and their legs move as they walk (or crawl).',
          'Feeding and petting: your character walks over to the pet, and the pet sits down happily.',
          'Living together, tap your partner’s pet to see its stats, and feed or pet it.',
          'The reel spins a full 6 seconds, fast at first and slowing down at the end.',
          'Legendary, Mythical and Divine stay a mystery on the reel until the very end.',
          'When your room is full, choose: swap your new pet into the room, or send it to foster care.',
          'The foster care choice now appears after you welcome your new pet home.',
        ],
      },
      {
        title: '👕 Your character',
        points: [
          '20 new hairstyles and 20 new hair colors.',
          'Pick any color you like for your shirt, pants and shoes.',
          '20 new pieces in every wardrobe category.',
          'A new gender option.',
        ],
      },
      {
        title: '🏠 Your home',
        points: ['20 new items in every decoration category.', '20 new paintings to hang on your walls.', 'Prices get a small rebalance.'],
      },
      {
        title: '💞 Couples',
        points: ['Cuddle time: extra Hearts while you and your partner are both online.', 'Your anniversary is set once, and stays.'],
      },
      {
        title: '🛠️ Fixes',
        points: [
          'Every window fits and scrolls on small phones (including deleting your account on iPhone).',
          'Your character stays visible while you try on clothes on a phone.',
          'Activities and pet care happen one at a time, with a short loading moment.',
        ],
      },
    ],
    outro: 'See you on October 20! More updates soon. Thank you for playing PocketRoom. 💗',
  },
  {
    version: '1.0.0',
    title: 'PocketRoom 1.0.0',
    date: '2026-10-18',
    intro: [
      'Most games ask for your time. PocketRoom asks for a few cozy minutes a day, and gives back a small home that grows with you.',
      'PocketRoom is built on one idea: a game can feel like a quiet part of your real life instead of a race. Your character ages with you, the sky outside your window shows your real weather, and your birthday and your monthsary bring gifts. Everything happens once a day, so there’s no pressure to grind. You just come back, look after your home and your pets, and spend time with the people you care about.',
      'Version 1.0.0 is the first full release: your room, your character, your pets, and playing together.',
    ],
    sections: [
      {
        title: '🏠 Your home',
        points: [
          'Make your character: name, birthday, look and height. Your character ages with you in real time.',
          'Decorate a 3D studio with furniture, floors and wallpaper. Place, turn and recolor anything.',
          'Nap, cook, eat, work at the PC and more to earn Hearts, the only currency. There’s no real money.',
          'Today list: every activity pays once a day, and the list shows what’s done and what’s left. Tap one to go do it.',
          'More furniture means more ways to earn.',
        ],
      },
      {
        title: '🐾 Pets',
        points: [
          'A new pet at your door every day, rolled on a reel. There are 79 animals across 7 tiers, from Common to Divine.',
          'Special pets on your birthday and monthsary, and seasonal pets during 12 real-world events a year.',
          'Guarantees: a Mythical within 7 spins and a Divine within 30.',
          'Every pet is unique: 10 stats (IVs), growing from baby to adult over 30 days, and possibly a rare real-life mutation: albino, leucistic, melanistic, dwarf or giant.',
          'Feed and pet each pet once a day for Hearts. Higher IVs and mutations earn more.',
          '3 pets live in your room and 10 in foster care. Pets never get sick or die.',
        ],
      },
      {
        title: '💞 Playing together',
        points: [
          'Add friends and family with a friend code and visit their rooms.',
          'Live Tours: invite someone over to walk around together, with chat and voice. Guests bring their pets along.',
          'Couples move in together, share one room and one Hearts jar, get a moving-in gift, and feed and pet each other’s pets.',
          'Monthsary pets arrive every month on your anniversary.',
          'When your partner is away, they sleep peacefully on the bed and their pets stay with you.',
        ],
      },
      {
        title: '✨ Quality of life',
        points: [
          'Sign in with Google, so your room and pets are saved on any device.',
          'Sharp, high-quality graphics with pinch and scroll to zoom in on your pets.',
          'Swipe-friendly menus made for phones.',
          'One login per account, so your progress stays safe.',
        ],
      },
    ],
    outro: 'This is only the beginning. New hairstyles, clothes, furniture, paintings, cuddle time for couples, livelier pets and more are already on the way. Thank you for playing PocketRoom. 💗',
  },
]

/** The newest version: players who haven't seen its notes get them once */
export const CURRENT_VERSION = UPDATES[0].version

/** The About page: what PocketRoom is, how to play, and why it's different */
export const ABOUT: { intro: string[]; sections: Section[] } = {
  intro: [
    'PocketRoom is a cozy little home you build, share and live in, with pets to raise and people you love.',
    'It follows your real life: your character ages with you, the sky shows your real weather, and everything happens once a day, so a few minutes is all it takes.',
  ],
  sections: [
    {
      title: 'How to play',
      points: [
        'Make your character: your name, birthday, look and height.',
        'Decorate your studio: buy furniture, floors and wallpaper with Hearts, then place, turn and recolor everything.',
        'Earn Hearts by living in your room: nap, cook, eat, work at the PC and more. Each activity pays once a day; the Today list shows what’s left.',
        'Get a new pet every day: the courier brings it to your door, and you roll it on the reel.',
        'Raise your pets: feed and pet them every day for Hearts, and watch them grow up over 30 days.',
        'Play together: add friends with a friend code, visit their rooms, or invite them on a live Tour with chat and voice.',
        'Live as a couple: share a room, a Hearts jar and your pets, and get a monthsary pet on your anniversary every month.',
      ],
    },
    {
      title: 'Why PocketRoom is different',
      points: [
        'It follows your real life: your age, your weather, your birthday and your monthsary.',
        'Gentle, not grindy: everything is once a day, and nothing punishes you for taking a break.',
        'Every pet is one of a kind, with rarity, 10 stats and real-life mutations.',
        'Made for people who care about each other: shared homes, shared pets and live tours.',
        'Fair by design: Hearts are the only currency, there’s no real money, and guarantees mean luck never leaves you behind.',
        'Plays anywhere: in the browser on your phone or computer, saved to your Google account.',
      ],
    },
  ],
}
