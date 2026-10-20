import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LocateFixed, LogOut, MapPin, Search, Trash2, UserRound, Volume2, VolumeX, X } from 'lucide-react'
import { canSignIn, deleteAccount, signInWithGoogle, signOut, useUser } from '../lib/auth'
import { resetProgress, setMuted, today, useSave, wipeDevice } from '../game/store'
import { coupleOf, endLink, otherOf, setAnniversary, useTogether } from '../lib/together'
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

export default function Settings({ open, onClose, place, onPick, onLocate, onCustomize, say, onNotes }: { open: boolean; onClose: () => void; place: Place | null; onPick: (p: Place) => void; onLocate: () => Promise<boolean>; onCustomize: () => void; say: (m: string) => void; onNotes: (page: 'updates' | 'about') => void }) {
  const muted = useSave((s) => s.muted)
  const user = useUser()
  const couple = useTogether((t) => coupleOf(t))
  const partner = useTogether((t) => (couple ? t.cards[otherOf(couple)]?.name || 'your partner' : ''))
  const [breaking, setBreaking] = useState(false)
  const [breakErr, setBreakErr] = useState('')
  const [anniversary, setAnniversaryDate] = useState('')
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
            className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain w-full max-w-sm rounded-[2rem] bg-cream p-6 shadow-2xl"
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
                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    <p className="text-xs font-medium text-mint">Saved to your account</p>
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
            {/* About the game, and every update's patch notes */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNotes('about')
                }}
                className="chunky rounded-2xl bg-white px-3 py-3 text-sm font-semibold"
              >
                📖 About PocketRoom
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNotes('updates')
                }}
                className="chunky rounded-2xl bg-white px-3 py-3 text-sm font-semibold"
              >
                📰 Updates
              </button>
            </div>
            {/* Relationship: a couple is a contract, so breaking up comes with a 1-month wait */}
            {couple && (
              <div className="mt-3 rounded-2xl bg-white p-4">
                <p className="font-semibold">💞 In a couple with {partner}</p>
                {/* The anniversary: a monthsary pet comes on this day every month. It's set once and then stays. */}
                {couple.anniversary ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    Anniversary: <span className="font-semibold text-ink">{new Date(`${couple.anniversary}T00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span> 💞
                  </p>
                ) : (
                  <div className="mt-2 text-sm text-ink-soft">
                    <label htmlFor="anniversary">Anniversary (set once, it stays)</label>
                    <div className="mt-1 flex gap-2">
                      <input id="anniversary" type="date" value={anniversary} max={today()} onChange={(e) => setAnniversaryDate(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-paper px-3 py-2 text-base text-ink outline-none focus:ring-2 focus:ring-sun" />
                      <button
                        type="button"
                        disabled={!anniversary}
                        onClick={async () => {
                          const err = await setAnniversary(couple.id, anniversary)
                          setBreakErr(err ?? '')
                          if (!err) say('Anniversary saved 💞 A monthsary pet comes on this day every month')
                        }}
                        className="chunky shrink-0 rounded-xl bg-heart px-4 py-2 font-bold text-white disabled:bg-[#d7cfc4]"
                      >
                        Save
                      </button>
                    </div>
                    {breakErr && !breaking && <p className="mt-1 text-heart">{breakErr}</p>}
                  </div>
                )}
                {breaking ? (
                  <>
                    <p className="mt-1 text-sm text-ink-soft">You’ll both keep a copy of the room and half the Hearts jar. After a breakup there’s a 1-month wait before a new couple.</p>
                    {breakErr && <p className="mt-2 text-sm text-heart">{breakErr}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setBreaking(false)} className="chunky flex-1 rounded-xl bg-paper py-2.5 text-sm font-semibold">
                        Stay together
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const err = await endLink(couple.id)
                          if (err) setBreakErr(err)
                          else setBreaking(false)
                        }}
                        className="chunky flex-1 rounded-xl bg-heart py-2.5 text-sm font-bold text-white"
                      >
                        Break up
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => setBreaking(true)} className="mt-1 text-sm font-semibold text-ink-soft underline underline-offset-2">
                    Break up…
                  </button>
                )}
              </div>
            )}
            <button type="button" onClick={() => setMuted(!muted)} aria-pressed={!muted} className="chunky mt-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5">
              <span className="flex items-center gap-3 font-semibold">
                {muted ? <VolumeX className="size-5 text-ink-soft" aria-hidden /> : <Volume2 className="size-5 text-mint" aria-hidden />} Sound
              </span>
              <span className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${muted ? 'bg-line' : 'bg-mint'}`} aria-hidden>
                <span className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform duration-200 ease-[var(--ease-out)] ${muted ? '' : 'translate-x-4'}`} />
              </span>
            </button>
            <h3 className="mt-6 text-sm font-semibold text-ink-soft">Weather outside</h3>
            <p className="mt-1 mb-3 text-sm">{place ? (place.name === 'Your location' ? 'Showing the weather where you are' : `Showing the weather in ${place.name}`) : 'Showing the sky for your local time'}</p>
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
            <DangerZone signedIn={!!user} inCouple={!!couple} onClose={onClose} say={say} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Starting over: clear the room and progress (pets stay), or delete the whole account. Each asks once more first. */
function DangerZone({ signedIn, inCouple, onClose, say }: { signedIn: boolean; inCouple: boolean; onClose: () => void; say: (m: string) => void }) {
  const [asking, setAsking] = useState<'reset' | 'account' | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const reset = () => {
    if (!resetProgress()) return setErr('Not while you live together: the room and jar belong to both of you.')
    setAsking(null)
    onClose()
    say('Fresh start! Your character and pets are still here 🐾')
  }
  const remove = async () => {
    setBusy(true)
    if (signedIn) {
      const e = await deleteAccount()
      if (e) {
        setErr(e)
        setBusy(false)
      }
    } else {
      // A guest's whole game lives on this device
      wipeDevice()
      location.reload()
    }
  }
  return (
    <section className="mt-6 border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-ink-soft">Start over</h3>
      {err && <p className="mt-2 text-sm text-heart">{err}</p>}
      {asking ? (
        <div ref={(el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })} className="mt-2 scroll-mb-4 rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold">{asking === 'reset' ? 'Delete everything?' : signedIn ? 'Delete your account?' : 'Delete this game?'}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {asking === 'reset'
              ? 'Your room, furniture, Hearts and clothes go back to the start. Your character and your pets stay.'
              : signedIn
                ? `This deletes your account and everything in it, pets included, and removes you from your friends’ lists. It can’t be undone.${inCouple ? ' Break up first, so your partner keeps their half of the jar.' : ''}`
                : 'This deletes the game on this device, pets included. It can’t be undone.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => (setAsking(null), setErr(''))} className="chunky flex-1 rounded-xl bg-paper py-2.5 text-sm font-semibold">
              Keep it
            </button>
            <button type="button" disabled={busy} onClick={() => (asking === 'reset' ? reset() : void remove())} className="chunky flex-1 rounded-xl bg-heart py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          <button type="button" onClick={() => setAsking('reset')} className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-ink-soft hover:bg-white">
            <Trash2 className="size-4" aria-hidden /> Delete everything (keeps your pets)
          </button>
          <button type="button" onClick={() => setAsking('account')} className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-heart hover:bg-white">
            <Trash2 className="size-4" aria-hidden /> {signedIn ? 'Delete my account' : 'Delete this game'}
          </button>
        </div>
      )}
    </section>
  )
}
