import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LocateFixed, MapPin, Search, Volume2, VolumeX, X } from 'lucide-react'
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

export default function Settings({ open, onClose, place, onPick, onLocate }: { open: boolean; onClose: () => void; place: Place | null; onPick: (p: Place) => void; onLocate: () => Promise<boolean> }) {
  const muted = useSave((s) => s.muted)
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
            <button type="button" onClick={() => setMuted(!muted)} aria-pressed={!muted} className="chunky mt-5 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5">
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
