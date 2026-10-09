import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LocateFixed, LogOut, MapPin, Search, UserRound, Volume2, VolumeX, X } from 'lucide-react'
import { canSignIn, signInWithGoogle, signOut, useUser } from '../lib/auth'
import { setMuted, useSave } from '../game/store'
import { searchCity, type Place } from '../lib/weather'

/** City search with "use my location", shared by settings and the first-visit weather prompt */
export function PlacePicker({ onPick, onLocate }: { onPick: (p: Place) => void; onLocate: () => Promise<boolean> }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          setMsg('')
          if (!(await onLocate())) setMsg('Location is off. Search for your city instead.')
        }}
        className="chunky flex w-full items-center justify-center gap-2 rounded-2xl bg-mint py-3 font-semibold text-white"
      >
        <LocateFixed className="size-5" aria-hidden /> Use my location
      </button>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!q.trim()) return
          setBusy(true)
          try {
            setResults(await searchCity(q.trim()))
          } catch {
            setMsg('Couldn’t search right now.')
          }
          setBusy(false)
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or type your city" aria-label="City" className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-base ring-2 ring-line outline-none focus:ring-sun" />
        <button type="submit" disabled={busy} aria-label="Search" className="chunky grid size-12 place-items-center rounded-2xl bg-white">
          <Search className="size-5" />
        </button>
      </form>
      {msg && <p className="mt-2 text-sm text-heart">{msg}</p>}
      {results && (
        <ul className="mt-2 space-y-1">
          {results.length === 0 && <li className="text-sm text-ink-soft">No places found.</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white">
                <MapPin className="size-4 shrink-0 text-heart" aria-hidden /> {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Settings({ open, onClose, place, onPick, onLocate, onCustomize }: { open: boolean; onClose: () => void; place: Place | null; onPick: (p: Place) => void; onLocate: () => Promise<boolean>; onCustomize: () => void }) {
  const muted = useSave((s) => s.muted)
  const user = useUser()
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[2rem] bg-cream p-6 shadow-2xl"
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-white">
              <X className="size-5" />
            </button>
            <h2 className="text-xl font-bold">Settings</h2>

            {/* Account: sign in with Google to keep your room on any device (and, later, to play together) */}
            <div className="mt-5 rounded-2xl bg-white p-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-mint/20 text-mint">
                    <UserRound className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{user.name || 'Signed in'}</p>
                    <p className="truncate text-xs text-ink-soft">{user.email} · saved to your account</p>
                  </div>
                  <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper">
                    <LogOut className="size-4" />
                  </button>
                </div>
              ) : canSignIn ? (
                <>
                  <button type="button" onClick={() => void signInWithGoogle()} className="chunky flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold ring-1 ring-line">
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
                    </svg>
                    Sign in with Google
                  </button>
                  <p className="mt-2 text-xs text-ink-soft">Keep your room and character on any device. You’re playing as a guest on this device right now.</p>
                </>
              ) : (
                <p className="text-sm text-ink-soft">You’re playing as a guest; your room is saved on this device. Google sign-in arrives once the game server is connected.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose()
                onCustomize()
              }}
              className="chunky mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold"
            >
              ✨ Edit my character
            </button>
            <button type="button" onClick={() => setMuted(!muted)} aria-pressed={!muted} className="chunky mt-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5">
              <span className="flex items-center gap-3 font-semibold">
                {muted ? <VolumeX className="size-5 text-ink-soft" aria-hidden /> : <Volume2 className="size-5 text-mint" aria-hidden />} Sound
              </span>
              <span className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${muted ? 'bg-line' : 'bg-mint'}`} aria-hidden>
                <span className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform duration-200 ease-[var(--ease-out)] ${muted ? '' : 'translate-x-4'}`} />
              </span>
            </button>
            <h3 className="mt-6 text-sm font-semibold text-ink-soft">Weather outside</h3>
            <p className="mt-1 mb-3 text-sm">{place ? `Showing the weather in ${place.name}` : 'Showing the sky for your local time'}</p>
            <PlacePicker
              onPick={(p) => {
                onPick(p)
                onClose()
              }}
              onLocate={async () => {
                const ok = await onLocate()
                if (ok) onClose()
                return ok
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
