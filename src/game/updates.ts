/**
 * Patch notes and the game's About page. To announce an update: add it to the top of UPDATES and it becomes the
 * current version. Every player sees the new notes once (it's remembered in their saved game).
 */

export type Section = { title: string; points: string[] }
export type Update = { version: string; title: string; date: string; intro: string[]; sections: Section[]; outro: string }

export const UPDATES: Update[] = [
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
