import type { Activity } from './catalog'

/**
 * How each activity looks and pays. Hearts come in during the activity; each pays once a day, at REWARD_MULT times `hearts`.
 * The starter room (bed, table, PC) earns about 840 a day; every new kind of furniture adds another way to earn.
 */
export const ACTS: Record<Activity, { label: string; verb: string; emoji: string; hearts: number; seconds: number; pose: 'lie' | 'sit' | 'stand' | 'dance' }> = {
  nap: { label: 'Nap', verb: 'Napping', emoji: '😴', hearts: 80, seconds: 12, pose: 'lie' },
  sit: { label: 'Relax', verb: 'Relaxing', emoji: '☺️', hearts: 50, seconds: 9, pose: 'sit' },
  tv: { label: 'Watch TV', verb: 'Watching TV', emoji: '📺', hearts: 70, seconds: 11, pose: 'stand' },
  eat: { label: 'Eat', verb: 'Eating', emoji: '🍜', hearts: 70, seconds: 10, pose: 'stand' },
  pc: { label: 'Play & work', verb: 'On the PC', emoji: '💻', hearts: 80, seconds: 12, pose: 'stand' },
  cook: { label: 'Cook', verb: 'Cooking', emoji: '🍳', hearts: 70, seconds: 11, pose: 'stand' },
  snack: { label: 'Grab a snack', verb: 'Snacking', emoji: '🧃', hearts: 50, seconds: 8, pose: 'stand' },
  coffee: { label: 'Make coffee', verb: 'Brewing coffee', emoji: '☕', hearts: 50, seconds: 8, pose: 'stand' },
  read: { label: 'Read', verb: 'Reading', emoji: '📖', hearts: 60, seconds: 10, pose: 'stand' },
  bath: { label: 'Take a bath', verb: 'Bathing', emoji: '🛁', hearts: 70, seconds: 11, pose: 'lie' },
  shower: { label: 'Shower', verb: 'Showering', emoji: '🚿', hearts: 60, seconds: 9, pose: 'stand' },
  music: { label: 'Play music', verb: 'Dancing', emoji: '🎵', hearts: 60, seconds: 10, pose: 'dance' },
  hug: { label: 'Hug', verb: 'Hugging', emoji: '🧸', hearts: 50, seconds: 7, pose: 'stand' },
  toilet: { label: 'Bathroom break', verb: 'In the bathroom', emoji: '🚽', hearts: 40, seconds: 7, pose: 'sit' },
  laundry: { label: 'Do laundry', verb: 'Doing laundry', emoji: '🧺', hearts: 50, seconds: 9, pose: 'stand' },
}

/** No daily Hearts limit: each activity pays once a day, so more furniture means more ways to earn */
export const DAILY_CAP = Number.POSITIVE_INFINITY
/** Hearts gifted once a year on your birthday */
export const BIRTHDAY_GIFT = 1000
/** Times each activity pays out per day */
export const USES_PER_DAY = 1
/** Each activity's one daily use pays this many times its `hearts`, so a day earns the same as before (when it was 3 uses) */
export const REWARD_MULT = 3
