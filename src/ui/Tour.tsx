import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DoorOpen, Mic, MicOff, Send, Volume2, X } from 'lucide-react'
import { blip } from '../lib/sound'
import { answer, cancelInvite, chat, end, hear, toggleMic, useTour } from '../lib/tour'
import { VoiceStatus } from './HomeChat'

const EASE = [0.23, 1, 0.32, 1] as const

/** Someone inviting you on a tour, and the "waiting for them" pill while you invite someone */
export function TourInvites() {
  const phase = useTour((t) => t.phase)
  const peer = useTour((t) => t.peer)
  return (
    <>
      <AnimatePresence>
        {phase === 'invited' && peer && (
          <motion.div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="tour-invite-title"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
              className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain w-full max-w-sm rounded-[2rem] bg-cream p-6 text-center shadow-2xl"
            >
              <p className="text-3xl" aria-hidden>
                🚪
              </p>
              <h2 id="tour-invite-title" className="mt-2 text-xl font-bold">
                {peer.name} invites you on a tour
              </h2>
              <p className="mt-1 text-sm text-ink-soft">You’ll go to {peer.name}’s room and walk around together, with chat and voice.</p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => (blip(), answer(false))} className="chunky flex-1 rounded-2xl bg-white py-3 font-semibold">
                  Not now
                </button>
                <button type="button" onClick={() => (blip(), answer(true))} className="chunky flex-1 rounded-2xl bg-heart py-3 font-bold text-white">
                  Join
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'inviting' && peer && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE }}
            role="status"
            className="pointer-events-auto absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+6.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-cream py-2 pr-2 pl-4 shadow-[0_5px_0_rgba(74,52,40,0.14)] ring-2 ring-white sm:top-6"
          >
            <span className="size-2.5 animate-pulse rounded-full bg-heart" aria-hidden />
            <p className="text-sm font-semibold whitespace-nowrap">Waiting for {peer.name}…</p>
            <button type="button" onClick={cancelInvite} aria-label="Cancel the invite" className="grid size-8 place-items-center rounded-full bg-paper text-ink-soft hover:text-ink">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** While touring: who's here, the chat, the microphone, and End tour */
export function TourPanel() {
  const peer = useTour((t) => t.peer)
  const hosting = useTour((t) => t.hosting)
  const here = useTour((t) => t.here)
  const lines = useTour((t) => t.chat)
  const mic = useTour((t) => t.mic)
  const hearing = useTour((t) => t.hearing)
  const line = useTour((t) => t.line)
  const [text, setText] = useState('')
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [lines])

  if (!peer) return null
  const title = hosting ? (here ? `${peer.name} is touring your room` : `${peer.name} is on the way…`) : `Touring ${peer.name}’s room`

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col gap-2 rounded-t-[2rem] bg-cream/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(74,52,40,0.18)]"
    >
      <div className="flex items-center gap-2 px-1">
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        <VoiceStatus line={line} mic={mic} />
        {hearing === 'tap' && (
          <button type="button" onClick={hear} className="chunky flex items-center gap-1.5 rounded-full bg-sun px-3 py-2 text-xs font-bold text-ink">
            <Volume2 className="size-4" aria-hidden /> Tap to hear
          </button>
        )}
        <button
          type="button"
          onClick={() => void toggleMic()}
          aria-pressed={mic === 'on'}
          aria-label={mic === 'off' ? 'Turn on voice' : mic === 'on' ? 'Mute' : 'Unmute'}
          className={`chunky grid size-10 place-items-center rounded-full ${mic === 'on' ? 'bg-mint text-white' : 'bg-white text-ink'}`}
        >
          {mic === 'on' ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </button>
        <button type="button" onClick={() => (blip(), end())} className="chunky flex items-center gap-1.5 rounded-full bg-sun px-4 py-2.5 text-sm font-bold text-ink">
          <DoorOpen className="size-4" aria-hidden /> {hosting ? 'End tour' : 'Go home'}
        </button>
      </div>

      <div ref={log} className="max-h-28 space-y-1 overflow-y-auto px-1 text-sm" aria-live="polite" aria-label="Chat">
        {lines.length === 0 ? (
          <p className="text-ink-soft">Say hi 👋 {mic === 'off' && 'or tap the mic to talk.'}</p>
        ) : (
          lines.map((l) => (
            <p key={l.id} className="break-words">
              <span className={`font-bold ${l.from === peer.id ? 'text-heart' : 'text-ink'}`}>{l.from === peer.id ? l.name : 'You'}:</span> {l.text}
            </p>
          ))
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          chat(text)
          setText('')
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          placeholder="Message"
          aria-label="Chat message"
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-base ring-2 ring-line outline-none focus:ring-sun"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Send" className="chunky grid size-12 shrink-0 place-items-center rounded-2xl bg-heart text-white disabled:bg-[#d7cfc4]">
          <Send className="size-5" />
        </button>
      </form>
    </motion.div>
  )
}
