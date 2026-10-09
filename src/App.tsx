import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Check, Paintbrush } from 'lucide-react'
import { cancel } from './game/character'
import { rollDay, setSession, useSession } from './game/store'
import { blip } from './lib/sound'
import { skyColors, useWeather } from './lib/weather'
import Stage from './scene/Stage'
import Decorate from './ui/Decorate'
import { DoingPill, Hud } from './ui/Hud'
import Settings, { PlacePicker } from './ui/Settings'
import Sky from './ui/Sky'

const EASE = [0.23, 1, 0.32, 1] as const

export default function App() {
  const mode = useSession((s) => s.mode)
  const [settings, setSettings] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const nextToast = useRef(0)
  const { place, weather, asked, setPlace, useMyLocation, dismiss } = useWeather()
  const [hour, setHour] = useState(() => new Date().getHours())

  // A new day resets today's Hearts; the sky follows the clock
  useEffect(() => {
    rollDay()
    const id = setInterval(() => {
      rollDay()
      setHour(new Date().getHours())
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const say = useCallback((text: string) => {
    const id = nextToast.current++
    setToasts((t) => [...t.slice(-2), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const sky = skyColors(weather, hour)
  const night = weather ? !weather.isDay : hour < 6 || hour >= 19
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
        <div className="absolute inset-0">
          <Stage say={say} sky={sky.window} />
        </div>

        <div className="pointer-events-none absolute inset-0">
          <Hud onSettings={() => setSettings(true)} weatherLabel={weatherLabel} />
          {mode === 'play' && <DoingPill />}

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

          {/* Bottom: decorate button while playing, the decorating tools while editing */}
          {mode === 'play' ? (
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

        <Settings open={settings} onClose={() => setSettings(false)} place={place} onPick={setPlace} onLocate={useMyLocation} />

        {/* First visit: offer the real weather outside */}
        <AnimatePresence>
          {!asked && (
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
