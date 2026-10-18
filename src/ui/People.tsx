import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, DoorOpen, Footprints, Home, Send, X } from 'lucide-react'
import { today, useSave } from '../game/store'
import { canSignIn, signInWithGoogle, useUser } from '../lib/auth'
import { blip, nope } from '../lib/sound'
import { answerRequest, coupleOf, endLink, isAdult, isOnline, otherOf, sendRequest, useTogether, visit, voteHome, type Link, type LinkKind } from '../lib/together'
import { invite, useTour } from '../lib/tour'

const KINDS: { id: LinkKind; label: string; emoji: string }[] = [
  { id: 'couple', label: 'Couple', emoji: '💞' },
  { id: 'friend', label: 'Friend', emoji: '🤝' },
  { id: 'family', label: 'Family', emoji: '🏡' },
]
const kindOf = (k: LinkKind) => KINDS.find((x) => x.id === k)!

function Dot({ on }: { on: boolean }) {
  return <span className={`inline-block size-2 shrink-0 rounded-full ${on ? 'bg-mint' : 'bg-line'}`} title={on ? 'Online' : 'Offline'} aria-label={on ? 'Online' : 'Offline'} />
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-5">
    <h3 className="mb-2 text-sm font-semibold text-ink-soft">{title}</h3>
    {children}
  </section>
)

/** Your friend code, requests, the people you're connected to, and (for couples) choosing a home together */
export default function People({ open, onClose, say }: { open: boolean; onClose: () => void; say: (m: string) => void }) {
  const user = useUser()
  const t = useTogether((s) => s)
  const birthday = useSave((s) => s.profile?.birthday)
  const living = useSave((s) => s.home)
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<LinkKind>('friend')
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [anniversary, setAnniversaryDate] = useState('')
  const inTour = useTour((s) => s.phase !== 'idle')

  const me = t.me
  const adult = isAdult(birthday)
  const couple = coupleOf(t)
  const incoming = t.links.filter((l) => l.status === 'pending' && l.b === me)
  const outgoing = t.links.filter((l) => l.status === 'pending' && l.a === me)
  const people = t.links.filter((l) => l.status === 'active' && l.kind !== 'couple')
  const nameOf = (l: Link) => t.cards[otherOf(l)]?.name || 'Someone'

  // Every action shows its result; errors come straight from the server's rules
  const run = async (job: () => Promise<string | null>, ok?: string) => {
    setBusy(true)
    const err = await job()
    setBusy(false)
    if (err) {
      nope()
      setMsg({ text: err, good: false })
    } else {
      blip()
      setMsg(ok ? { text: ok, good: true } : null)
    }
    return !err
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="People"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-cream p-6 shadow-2xl"
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-white">
              <X className="size-5" />
            </button>
            <h2 className="text-xl font-bold">People</h2>

            {!user ? (
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-sm text-ink-soft">Sign in with Google to add friends, family or a partner, visit their rooms, and live together.</p>
                {canSignIn && (
                  <button type="button" onClick={() => void signInWithGoogle()} className="chunky mt-3 w-full rounded-xl bg-white py-3 font-semibold ring-1 ring-line">
                    Sign in with Google
                  </button>
                )}
              </div>
            ) : !t.ready ? (
              <p className="mt-4 text-sm text-ink-soft">Loading your people…</p>
            ) : (
              <>
                {/* Your code */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Your friend code</p>
                    <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.2em]">{t.mine?.code ?? '······'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(t.mine?.code ?? '')
                        say('Code copied 📋')
                      } catch {
                        say('Couldn’t copy, write it down instead')
                      }
                    }}
                    aria-label="Copy your code"
                    className="chunky grid size-11 place-items-center rounded-full bg-paper"
                  >
                    <Copy className="size-5" />
                  </button>
                </div>

                {/* Add someone */}
                <Section title="Add someone">
                  <div className="flex gap-1.5" role="radiogroup" aria-label="They are your">
                    {KINDS.map((k) => {
                      const blocked = k.id === 'couple' && !adult
                      return (
                        <button
                          key={k.id}
                          type="button"
                          role="radio"
                          aria-checked={kind === k.id}
                          disabled={blocked}
                          onClick={() => setKind(k.id)}
                          className={`chunky flex-1 rounded-full px-2 py-2 text-sm font-semibold disabled:opacity-40 ${kind === k.id ? 'bg-ink text-cream' : 'bg-white ring-1 ring-line'}`}
                        >
                          <span aria-hidden>{k.emoji}</span> {k.label}
                        </button>
                      )
                    })}
                  </div>
                  {!adult && <p className="mt-1.5 text-xs text-ink-soft">Couples are for ages 18 and up.</p>}
                  {kind === 'couple' && (
                    <label className="mt-2 block text-sm font-semibold text-ink-soft">
                      When’s your anniversary? 💞
                      <input
                        type="date"
                        value={anniversary}
                        max={today()}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-base text-ink ring-2 ring-line outline-none focus:ring-sun"
                      />
                      <span className="mt-1 block text-xs font-normal">You’ll both get a monthsary pet on this day every month.</span>
                    </label>
                  )}
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (code.trim().length < 6) return
                      void run(() => sendRequest(code, kind, kind === 'couple' ? anniversary : undefined), 'Request sent! They’ll see it next time they play').then((ok) => ok && setCode(''))
                    }}
                  >
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="Their code"
                      aria-label="Their friend code"
                      autoCapitalize="characters"
                      className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 font-mono text-base tracking-[0.2em] ring-2 ring-line outline-none focus:ring-sun"
                    />
                    <button type="submit" disabled={busy || code.length < 6} aria-label="Send request" className="chunky grid size-12 place-items-center rounded-2xl bg-heart text-white disabled:bg-[#d7cfc4]">
                      <Send className="size-5" />
                    </button>
                  </form>
                  {msg && <p className={`mt-2 text-sm ${msg.good ? 'text-mint' : 'text-heart'}`}>{msg.text}</p>}
                </Section>

                {incoming.length > 0 && (
                  <Section title="Asking you">
                    <ul className="space-y-2">
                      {incoming.map((l) => (
                        <li key={l.id} className="flex items-center gap-2 rounded-2xl bg-white p-3">
                          <p className="min-w-0 flex-1 text-sm">
                            <span className="font-semibold">{nameOf(l)}</span> wants to be your {kindOf(l.kind).label.toLowerCase()} {kindOf(l.kind).emoji}
                          </p>
                          <button type="button" disabled={busy} onClick={() => void run(() => answerRequest(l.id, false))} aria-label="Decline" className="grid size-9 place-items-center rounded-full bg-paper text-ink-soft">
                            <X className="size-4" />
                          </button>
                          <button type="button" disabled={busy} onClick={() => void run(() => answerRequest(l.id, true), `You and ${nameOf(l)} are connected 💗`)} aria-label="Accept" className="grid size-9 place-items-center rounded-full bg-mint text-white">
                            <Check className="size-4" strokeWidth={3} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* The couple: pick a home, then live there together */}
                {couple && me && (
                  <Section title="Your partner">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="flex items-center gap-2 font-semibold">
                        💞 {nameOf(couple)} <Dot on={isOnline(t.cards[otherOf(couple)])} />
                      </p>
                      {t.home ? (
                        <p className="mt-1 text-sm text-ink-soft">
                          Living together in {t.home.owner === me ? 'your' : `${nameOf(couple)}’s`} apartment · Chemistry {t.home.chem} 💞
                          {living !== couple.id && ' · moving in…'}
                        </p>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-ink-soft">Whose apartment will you live in? You both need to pick the same one.</p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {[me, otherOf(couple)].map((h) => {
                              const mineVote = (couple.a === me ? couple.vote_a : couple.vote_b) === h
                              const theirVote = (couple.a === me ? couple.vote_b : couple.vote_a) === h
                              return (
                                <button
                                  key={h}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void run(() => voteHome(couple.id, h))}
                                  className={`chunky rounded-2xl px-3 py-3 text-sm font-semibold ring-2 ${mineVote ? 'bg-mint/15 ring-mint' : 'bg-paper ring-transparent'}`}
                                >
                                  <Home className="mx-auto mb-1 size-5" aria-hidden />
                                  {h === me ? 'My place' : `${nameOf(couple)}’s place`}
                                  <span className="mt-0.5 block text-xs font-medium text-ink-soft">{[mineVote && 'you', theirVote && nameOf(couple)].filter(Boolean).join(' & ') || ' '}</span>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </Section>
                )}

                <Section title="Friends & family">
                  {people.length === 0 ? (
                    <p className="text-sm text-ink-soft">Share your code, or add someone with theirs.</p>
                  ) : (
                    <ul className="space-y-2">
                      {people.map((l) => {
                        const c = t.cards[otherOf(l)]
                        return (
                          <li key={l.id} className="flex items-center gap-2 rounded-2xl bg-white p-3">
                            <span aria-hidden>{kindOf(l.kind).emoji}</span>
                            <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                              <span className="truncate">{nameOf(l)}</span> <Dot on={isOnline(c)} />
                            </p>
                            {removing === l.id ? (
                              <>
                                <button type="button" onClick={() => setRemoving(null)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft">
                                  Keep
                                </button>
                                <button type="button" disabled={busy} onClick={() => void run(() => endLink(l.id)).then(() => setRemoving(null))} className="rounded-full bg-heart px-3 py-1.5 text-xs font-bold text-white">
                                  Remove
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setRemoving(l.id)} aria-label={`Remove ${nameOf(l)}`} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper">
                                  <X className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={async () => {
                                    const err = await visit(otherOf(l))
                                    if (err) setMsg({ text: err, good: false })
                                    else {
                                      say(`Visiting ${nameOf(l)}’s room 🏠`)
                                      onClose()
                                    }
                                  }}
                                  className="chunky flex items-center gap-1.5 rounded-full bg-sun px-3.5 py-2 text-sm font-bold text-ink"
                                >
                                  <DoorOpen className="size-4" aria-hidden /> Visit
                                </button>
                                {/* A live visit to your room: only while they're online */}
                                {isOnline(c) && (
                                  <button
                                    type="button"
                                    disabled={busy || inTour}
                                    onClick={() => {
                                      blip()
                                      const err = invite({ id: otherOf(l), name: nameOf(l), look: c?.look ?? null, pets: c?.room?.pets ?? [] })
                                      if (err) setMsg({ text: err, good: false })
                                      else onClose()
                                    }}
                                    className="chunky flex items-center gap-1.5 rounded-full bg-heart px-3.5 py-2 text-sm font-bold text-white disabled:bg-[#d7cfc4]"
                                  >
                                    <Footprints className="size-4" aria-hidden /> Tour
                                  </button>
                                )}
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Section>

                {outgoing.length > 0 && (
                  <Section title="Waiting for an answer">
                    <ul className="space-y-2">
                      {outgoing.map((l) => (
                        <li key={l.id} className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm">
                          <span aria-hidden>{kindOf(l.kind).emoji}</span>
                          <span className="min-w-0 flex-1 truncate">{nameOf(l)}</span>
                          <button type="button" disabled={busy} onClick={() => void run(() => endLink(l.id))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper">
                            Cancel
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
