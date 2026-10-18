import { motion } from 'motion/react'
import { signInWithGoogle } from '../lib/auth'
import { blip } from '../lib/sound'

/**
 * The first screen when nobody's signed in (and after signing out): sign in with Google, which always lets you
 * choose the account, or play as a guest on this device.
 */
export default function Welcome({ onGuest }: { onGuest: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-linear-to-b from-[#ffe6cf] to-paper p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        <img src="/icon.svg" alt="" className="size-24 drop-shadow-md" draggable={false} />
        <h1 className="mt-4 text-4xl font-bold">PocketRoom</h1>
        <p className="mt-2 text-ink-soft">A cozy room to decorate, live in and share, with pets to raise and friends to tour.</p>
        <button
          type="button"
          onClick={() => {
            blip()
            void signInWithGoogle()
          }}
          className="chunky mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-lg font-semibold ring-1 ring-line"
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
          </svg>
          Sign in with Google
        </button>
        <p className="mt-2 text-xs text-ink-soft">Your room and pets are saved to your account, on any device.</p>
        <button
          type="button"
          onClick={() => {
            blip()
            onGuest()
          }}
          className="mt-6 py-2 text-sm font-semibold text-ink-soft underline underline-offset-4"
        >
          Play as a guest
        </button>
        <p className="text-xs text-ink-soft">Guests can decorate, but pets need an account.</p>
      </motion.div>
    </div>
  )
}
