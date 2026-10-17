import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Check, House, Paintbrush } from 'lucide-react'
import { cancel } from './game/character'
import { rollDay, setProfile, setSession, useSave, useSession } from './game/store'
import { playAsGuest, signInWithGoogle, useKicked } from './lib/auth'
import { blip } from './lib/sound'
import { coupleOf, leaveVisit, onNote, otherOf, shareWeather, useTogether } from './lib/together'
import { skyColors, useWeather } from './lib/weather'
import Stage from './scene/Stage'
import Decorate from './ui/Decorate'
import { DoingPill, Hud } from './ui/Hud'
import Settings, { PlacePicker } from './ui/Settings'
import Closet from './ui/Closet'
import People from './ui/People'
import Creator from './ui/Creator'
import Sky from './ui/Sky'
import { TourInvites, TourPanel } from './ui/Tour'
import { ZoomButtons } from './ui/ZoomButtons'
import { AdoptPicker, DeliveryFlow, PetsPanel } from './ui/PetUI'
import { checkBirthdayGift, checkDeliveries } from './game/petActions'
import { useTour } from './lib/tour'

const EASE = [0.23, 1, 0.32, 1] as const

export default function App() {
  const mode = useSession((s) => s.mode)
  const [settings, setSettings] = useState(false)
  const [wardrobe, setWardrobe] = useState(false)
  const [people, setPeople] = useState(false)
  const visit = useSession((s) => s.visit)
  const living = useSave((s) => s.home)
  const [customizing, setCustomizing] = useState(false)
  const profile = useSave((s) => s.profile)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const nextToast = useRef(0)
  const { place, weather, asked, setPlace, useMyLocation, dismiss } = useWeather()
  const [hour, setHour] = useState(() => new Date().getHours())
  const kicked = useKicked()
  const touring = useTour((t) => t.phase === 'touring')
  const [pets, setPets] = useState<{ open: boolean; focus: string | null }>({ open: false, focus: null })
  const [delivering, setDelivering] = useState(false)
  const waiting = useSave((s) => s.deliveries.length)

  // A new day resets today's Hearts and brings new pet deliveries; the sky follows the clock
  useEffect(() => {
    rollDay()
    checkDeliveries()
    const id = setInterval(() => {
      rollDay()
      checkDeliveries()
      setHour(new Date().getHours())
    }, 30_000)
    return () => clearInterval(id)
  }, [])
  // A brand-new player gets their first delivery as soon as they've made their character
  useEffect(() => {
    if (profile) checkDeliveries()
  }, [profile])

  const say = useCallback((text: string) => {
    const id = nextToast.current++
    setToasts((t) => [...t.slice(-2), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  useEffect(() => onNote(say), [say])
  // Birthday Hearts, once a year (checked now and then, so it arrives even if the game stays open past midnight)
  const name = profile?.name
  useEffect(() => {
    const gift = () => {
      const n = checkBirthdayGift()
      if (n) say(`🎂 Happy birthday${name ? `, ${name}` : ''}! +${n.toLocaleString('en-US')} Hearts`)
    }
    gift()
    const id = setInterval(gift, 60_000)
    return () => clearInterval(id)
  }, [name, say])

  // Tell the player when a pet arrives at the door
  const lastWaiting = useRef(waiting)
  useEffect(() => {
    if (waiting > lastWaiting.current) say('📦 A pet delivery is at your door!')
    lastWaiting.current = waiting
  }, [waiting, say])

  // Share your weather with your people, for their split sky (a city name only if you picked one)
  useEffect(() => {
    shareWeather(weather ? { ...weather, place: place && place.name !== 'Your location' ? place.name.split(',')[0] : null } : null)
  }, [weather, place])

  const sky = skyColors(weather, hour)
  const night = weather ? !weather.isDay : hour < 6 || hour >= 19
  // With someone else around (visiting, or your partner at home) the sky splits: yours on top, theirs below
  const theirs = useTogether((t) => {
    const c = coupleOf(t)
    const id = visit?.id ?? (c && c.id === living ? otherOf(c) : null)
    return id ? (t.cards[id]?.weather ?? null) : null
  })
  const theirSky = theirs ? skyColors({ kind: theirs.kind, isDay: theirs.isDay, temp: theirs.temp }, hour) : null
  const weatherLabel = weather && place ? `${weather.temp}° ${place.name.split(',')[0]}` : null

  const toggleEdit = () => {
    blip()
    if (mode === 'play') cancel()
    setSession((s) => ({ ...s, mode: s.mode === 'play' ? 'edit' : 'play', selected: null, ghost: null }))
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full overflow-hidden">
        <Sky top={sky.top} bottom={sky.bottom} kind={weather?.kind ?? 'clear'} night={night} />
        {theirs && theirSky && (
          // The diagonal runs from the bottom-left corner to the top-right one
          <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
            <Sky top={theirSky.top} bottom={theirSky.bottom} kind={theirs.kind} night={!theirs.isDay} />
          </div>
        )}
        <div className="absolute inset-0">
          <Stage say={say} sky={sky.window} onPet={(uid) => setPets({ open: true, focus: uid })} onDelivery={() => setDelivering(true)} />
        </div>

        <div className="pointer-events-none absolute inset-0">
          <Hud onSettings={() => setSettings(true)} onWardrobe={() => setWardrobe(true)} onPeople={() => setPeople(true)} onPets={() => setPets({ open: true, focus: null })} weatherLabel={weatherLabel} say={say} />
          {mode === 'play' && <DoingPill />}
          {mode === 'play' && <ZoomButtons />}
          <TourInvites />

          {/* Toasts */}
          <div className="absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+10rem)] flex flex-col items-center gap-2 sm:top-24" role="status" aria-live="polite">
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <motion.p
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-lg"
                >
                  {t.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>

          {/* Bottom: the tour panel on a tour, decorate button while playing, the decorating tools while editing */}
          {touring ? (
            <TourPanel />
          ) : visit ? (
            <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex justify-center px-4">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-cream py-2 pr-2 pl-5 shadow-[0_5px_0_rgba(74,52,40,0.14)] ring-2 ring-white">
                <p className="min-w-0 truncate font-semibold">Visiting {visit.name}’s room</p>
                <button type="button" onClick={() => (blip(), leaveVisit())} className="chunky flex shrink-0 items-center gap-2 rounded-full bg-sun px-5 py-3 font-bold text-ink">
                  <House className="size-5" aria-hidden /> Go home
                </button>
              </div>
            </div>
          ) : mode === 'play' ? (
            <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex justify-center">
              <button type="button" onClick={toggleEdit} className="chunky pointer-events-auto flex items-center gap-2 rounded-full bg-sun px-7 py-4 text-lg font-bold text-ink">
                <Paintbrush className="size-5" aria-hidden /> Decorate
              </button>
            </div>
          ) : (
            <>
              <div className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+6.75rem)] left-3 sm:top-5 sm:left-1/2 sm:-translate-x-1/2">
                <button type="button" onClick={toggleEdit} className="chunky pointer-events-auto flex items-center gap-2 rounded-full bg-mint px-5 py-3 font-bold text-white">
                  <Check className="size-5" strokeWidth={3} aria-hidden /> Done
                </button>
              </div>
              <Decorate say={say} />
            </>
          )}
        </div>

        <Settings open={settings} onClose={() => setSettings(false)} place={place} onPick={setPlace} onLocate={useMyLocation} onCustomize={() => setCustomizing(true)} say={say} />
        <Closet open={wardrobe} onClose={() => setWardrobe(false)} say={say} />
        <People open={people} onClose={() => setPeople(false)} say={say} />
        <PetsPanel
          open={pets.open}
          focus={pets.focus}
          onClose={() => setPets({ open: false, focus: null })}
          onDeliveries={() => {
            setPets({ open: false, focus: null })
            setDelivering(true)
          }}
          say={say}
        />
        <DeliveryFlow open={delivering} onClose={() => setDelivering(false)} say={say} />
        <AdoptPicker say={say} />

        {/* New players make their character first; Settings can reopen this to change it */}
        {(!profile || customizing) && (
          <Creator
            initial={profile}
            onCancel={profile ? () => setCustomizing(false) : undefined}
            onDone={(p) => {
              setProfile(p)
              setCustomizing(false)
              if (!profile) say(`Welcome home, ${p.name}! 🏠`)
            }}
          />
        )}

        {/* Someone signed in to this account on another device, so this one was logged out */}
        <AnimatePresence>
          {kicked && (
            <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="kicked-title"
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
                className="w-full max-w-sm rounded-[2rem] bg-cream p-6 text-center shadow-2xl"
              >
                <p className="text-3xl" aria-hidden>
                  📱
                </p>
                <h2 id="kicked-title" className="mt-2 text-xl font-bold">
                  Signed in somewhere else
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Your account was opened on another device, so this one was logged out. Your game is saved to your account.</p>
                <div className="mt-5 flex flex-col gap-2">
                  <button type="button" onClick={() => void signInWithGoogle()} className="chunky rounded-2xl bg-heart py-3 font-bold text-white">
                    Play here instead
                  </button>
                  <button type="button" onClick={playAsGuest} className="py-2 text-sm font-semibold text-ink-soft">
                    Play as a guest
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* First visit: offer the real weather outside */}
        <AnimatePresence>
          {!asked && profile && (
            <motion.div className="fixed inset-0 z-30 grid place-items-center bg-ink/25 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Weather"
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.45, bounce: 0.25, delay: 0.3 }}
                className="w-full max-w-sm rounded-[2rem] bg-cream p-6 shadow-2xl"
              >
                <p className="text-3xl" aria-hidden>
                  🌤️
                </p>
                <h2 className="mt-2 text-xl font-bold">See your real weather?</h2>
                <p className="mt-1 mb-4 text-sm text-ink-soft">The sky behind your room can match the weather where you are. Your location stays on this device.</p>
                <PlacePicker onPick={setPlace} onLocate={useMyLocation} />
                <button type="button" onClick={dismiss} className="mt-3 w-full py-2 text-sm font-semibold text-ink-soft">
                  Not now
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
