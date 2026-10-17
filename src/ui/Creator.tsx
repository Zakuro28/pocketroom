import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { BUILDS, DEFAULT_OUTFIT, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, MAX_HEIGHT, MIN_AGE, SKINS, ageOn, feet, gameHeight, type Profile } from '../game/look'
import { today } from '../game/store'
import { Mannequin } from '../scene/Avatar'
import { blip } from '../lib/sound'
import { Slide } from './Slide'

const EASE = [0.23, 1, 0.32, 1] as const

/** A live, turning preview of the character being made */
export function Preview({ profile }: { profile: Profile }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.75, 3.4], fov: 28 }} gl={{ alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}>
      <hemisphereLight args={['#fff4e6', '#c9b6a6', 1.4]} />
      <directionalLight position={[2, 3, 3]} intensity={1.4} />
      <Mannequin profile={profile} height={gameHeight(profile)} />
    </Canvas>
  )
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <Slide className="-mx-1.5 gap-2 px-1.5 pt-1.5 pb-2.5" role="radiogroup" label={label}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => {
            blip()
            onPick(c)
          }}
          className={`size-10 rounded-full ring-offset-2 ring-offset-cream transition-transform duration-150 active:scale-90 ${value === c ? 'ring-3 ring-ink' : 'ring-1 ring-black/10'}`}
          style={{ background: c }}
        />
      ))}
    </Slide>
  )
}

function Chips<T extends string>({ options, value, onPick, label }: { options: { id: T; label: string }[]; value: T; onPick: (v: T) => void; label: string }) {
  return (
    <Slide className="-mx-1.5 gap-2 px-1.5 pt-1.5 pb-2.5" role="radiogroup" label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => {
            blip()
            onPick(o.id)
          }}
          className={`chunky rounded-full px-4 py-2 text-sm font-semibold ${value === o.id ? 'bg-ink text-cream' : 'bg-white text-ink ring-1 ring-line'}`}
        >
          {o.label}
        </button>
      ))}
    </Slide>
  )
}

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <p className="mb-2 text-sm font-semibold text-ink-soft">{label}</p>
    {children}
    {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
  </div>
)

/**
 * Making (or changing) your character: who you are, how you look, and your height and build.
 * New players must be 13 or older; the birthday can't be changed afterwards.
 */
export default function Creator({ initial, onDone, onCancel }: { initial: Profile | null; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const editing = initial !== null
  const [p, setP] = useState<Profile>(
    () =>
      initial ?? {
        name: '',
        birthday: '',
        gender: 'female',
        skin: SKINS[1],
        hair: 'long',
        hairColor: HAIR_COLORS[1],
        eyes: EYE_COLORS[0],
        heightIn: 62,
        heightSetOn: today(),
        build: 'normal',
        outfit: DEFAULT_OUTFIT,
      },
  )
  const [step, setStep] = useState(0)
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const age = p.birthday ? ageOn(p.birthday) : null
  // Checked when you tap Next, not while picking: phone date pickers jump to today's date the moment they open
  const [blocked, setBlocked] = useState(false)
  const canNext = step === 0 ? p.name.trim().length >= 2 && age !== null && age >= 0 && age <= 110 : true
  const inGame = gameHeight({ ...p, birthday: p.birthday || '2000-01-01' })
  const steps = ['About you', 'Your look', 'Your body']

  if (blocked && !editing)
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-paper p-6">
        <div className="max-w-sm text-center">
          <p className="text-6xl" aria-hidden>
            🎂
          </p>
          <h1 className="mt-4 text-2xl font-bold">PocketRoom is for ages {MIN_AGE} and up</h1>
          <p className="mt-2 text-ink-soft">Come back on your {MIN_AGE}th birthday and your room will be waiting for you!</p>
          <button type="button" onClick={() => {
              setBlocked(false)
              set({ birthday: '' })
            }}
            className="chunky mt-6 rounded-full bg-white px-5 py-3 font-semibold">
            Go back
          </button>
        </div>
      </div>
    )

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper lg:flex-row">
      {/* Live preview */}
      <div className="relative h-[34dvh] shrink-0 bg-linear-to-b from-[#ffe6cf] to-paper lg:h-auto lg:w-[42%]">
        <Preview profile={{ ...p, birthday: p.birthday || '2000-01-01' }} />
        <p className="absolute inset-x-0 bottom-2 text-center text-sm font-semibold text-ink-soft">
          {p.name.trim() || 'You'} · {feet(inGame)}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:justify-center">
        <p className="text-sm font-semibold tracking-wide text-heart uppercase">{editing ? 'Customize' : 'Welcome to PocketRoom'}</p>
        <h1 className="mt-1 text-3xl font-bold">{steps[step]}</h1>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${k <= step ? 'bg-heart' : 'bg-line'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: EASE }} className="mt-6 space-y-6">
            {step === 0 && (
              <>
                <Field label="Your name">
                  <input value={p.name} onChange={(e) => set({ name: e.target.value.slice(0, 16) })} placeholder="What should we call you?" className="w-full rounded-2xl bg-white px-4 py-3 text-base ring-2 ring-line outline-none focus:ring-sun" autoFocus />
                </Field>
                <Field label="Birthday" hint={editing ? 'Your birthday can’t be changed.' : 'Your character ages with you, and you get a bonus on your birthday.'}>
                  <input type="date" value={p.birthday} disabled={editing} max={today()} onChange={(e) => set({ birthday: e.target.value })} className="w-full rounded-2xl bg-white px-4 py-3 text-base ring-2 ring-line outline-none focus:ring-sun disabled:opacity-60" />
                </Field>
                <Field label="I am">
                  <Chips
                    label="Gender"
                    value={p.gender}
                    onPick={(gender) => set({ gender })}
                    options={[
                      { id: 'female', label: 'Female' },
                      { id: 'male', label: 'Male' },
                    ]}
                  />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Skin">
                  <Swatches label="Skin" colors={SKINS} value={p.skin} onPick={(skin) => set({ skin })} />
                </Field>
                <Field label="Hairstyle">
                  <Chips label="Hairstyle" options={HAIR_STYLES} value={p.hair} onPick={(hair) => set({ hair })} />
                </Field>
                <Field label="Hair color">
                  <Swatches label="Hair color" colors={HAIR_COLORS} value={p.hairColor} onPick={(hairColor) => set({ hairColor })} />
                </Field>
                <Field label="Eye color">
                  <Swatches label="Eye color" colors={EYE_COLORS} value={p.eyes} onPick={(eyes) => set({ eyes })} />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <Field label="How tall are you in real life?" hint={`In PocketRoom the tallest is ${feet(MAX_HEIGHT[p.gender])} for ${p.gender === 'male' ? 'boys' : 'girls'}. Under 18, your character grows a little every birthday.`}>
                  <div className="flex items-center gap-3">
                    <input type="range" min={48} max={78} value={p.heightIn} onChange={(e) => set({ heightIn: Number(e.target.value), heightSetOn: today() })} className="flex-1 accent-heart" aria-label="Height" />
                    <span className="w-16 text-right text-lg font-bold tabular-nums">{feet(p.heightIn)}</span>
                  </div>
                </Field>
                <Field label="Body type">
                  <Chips label="Body type" options={BUILDS} value={p.build} onPick={(build) => set({ build })} />
                </Field>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-2 lg:mt-10">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="chunky flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-semibold">
              <ArrowLeft className="size-5" aria-hidden /> Back
            </button>
          ) : (
            onCancel && (
              <button type="button" onClick={onCancel} className="chunky rounded-2xl bg-white px-5 py-3.5 font-semibold">
                Cancel
              </button>
            )
          )}
          <button
            type="button"
            disabled={!canNext}
            onClick={() => {
              blip()
              if (step === 0 && !editing && age !== null && age < MIN_AGE) return setBlocked(true)
              if (step < steps.length - 1) setStep(step + 1)
              else onDone({ ...p, name: p.name.trim() })
            }}
            className="chunky ml-auto flex items-center gap-2 rounded-2xl bg-heart px-6 py-3.5 font-bold text-white disabled:bg-[#d7cfc4]"
          >
            {step < steps.length - 1 ? (
              <>
                Next <ArrowRight className="size-5" aria-hidden />
              </>
            ) : (
              <>
                <Check className="size-5" strokeWidth={3} aria-hidden /> {editing ? 'Save' : 'Move in!'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
