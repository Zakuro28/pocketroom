import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MessageCircle, Mic, MicOff, Send, Volume2, X } from 'lucide-react'
import { homeChat, homeHear, homeMic, setChatOpen, useHomeTalk } from '../lib/homeLive'
import { blip, nope } from '../lib/sound'

const EASE = [0.23, 1, 0.32, 1] as const

/**
 * Living together with your partner home too: a chat button (with a count of new messages) and a mic button,
 * there by themselves whenever you're both in the shared home.
 */
export function HomeChat({ partner, say }: { partner: string; say: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const lines = useHomeTalk((t) => t.lines)
  const unread = useHomeTalk((t) => t.unread)
  const mic = useHomeTalk((t) => t.mic)
  const hearing = useHomeTalk((t) => t.hearing)
  const line = useHomeTalk((t) => t.line)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [lines, open])

  const toggle = (next: boolean) => {
    blip()
    setOpen(next)
    setChatOpen(next)
  }

  return (
    <div className="pointer-events-none absolute bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.75rem)] left-3 flex flex-col items-start gap-2 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:left-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ transformOrigin: 'bottom left' }}
            className="pointer-events-auto flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-3xl bg-cream/95 p-3 shadow-[0_8px_24px_rgba(74,52,40,0.2)] ring-2 ring-white"
            role="region"
            aria-label={`Chat with ${partner}`}
          >
            <div className="flex items-center justify-between px-1">
              <p className="font-bold">💞 {partner}</p>
              <button type="button" onClick={() => toggle(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-white">
                <X className="size-4" />
              </button>
            </div>
            <div ref={log} className="max-h-40 space-y-1 overflow-y-auto px-1 text-sm" aria-live="polite">
              {lines.length === 0 ? (
                <p className="text-ink-soft">Say hi to {partner} 👋</p>
              ) : (
                lines.map((l) => (
                  <p key={l.id} className="break-words">
                    <span className={`font-bold ${l.mine ? 'text-ink' : 'text-heart'}`}>{l.mine ? 'You' : partner}:</span> {l.text}
                  </p>
                ))
              )}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!text.trim()) return
                homeChat(text)
                setText('')
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 200))}
                placeholder="Message"
                aria-label="Chat message"
                enterKeyHint="send"
                className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5 text-base ring-2 ring-line outline-none focus:ring-sun"
              />
              <button type="submit" disabled={!text.trim()} aria-label="Send" className="chunky grid size-11 shrink-0 place-items-center rounded-2xl bg-heart text-white disabled:bg-[#d7cfc4]">
                <Send className="size-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex items-center gap-2">
        <button type="button" onClick={() => toggle(!open)} aria-label={unread ? `Chat, ${unread} new` : 'Chat'} aria-expanded={open} className="chunky relative grid size-12 place-items-center rounded-full bg-cream">
          <MessageCircle className="size-6" />
          {unread > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-heart px-1 text-[11px] leading-5 font-bold text-white">{unread}</span>}
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await homeMic()
            if (!ok) {
              nope()
              say('Microphone is blocked. Allow it in your browser to talk 🎙️')
            }
          }}
          aria-pressed={mic === 'on'}
          aria-label={mic === 'off' ? `Talk to ${partner}` : mic === 'on' ? 'Mute' : 'Unmute'}
          className={`chunky grid size-12 place-items-center rounded-full ${mic === 'on' ? 'bg-mint text-white' : 'bg-cream text-ink'}`}
        >
          {mic === 'on' ? <Mic className="size-6" /> : <MicOff className="size-6" />}
        </button>
        <VoiceStatus line={line} mic={mic} />
        {hearing === 'tap' && (
          <button type="button" onClick={homeHear} className="chunky flex items-center gap-1.5 rounded-full bg-sun px-3 py-2.5 text-xs font-bold text-ink">
            <Volume2 className="size-4" aria-hidden /> Tap to hear
          </button>
        )}
      </div>
    </div>
  )
}

/** How the voice line is doing, so it's clear whether you can hear each other */
export function VoiceStatus({ line, mic }: { line: 'idle' | 'connecting' | 'connected' | 'failed'; mic: 'off' | 'on' | 'muted' }) {
  if (line === 'idle' && mic === 'off') return null
  const text = line === 'connected' ? '🔊 Voice connected' : line === 'failed' ? 'Couldn’t connect voice on this network' : 'Connecting voice…'
  return <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow ${line === 'failed' ? 'bg-heart text-white' : line === 'connected' ? 'bg-mint text-white' : 'bg-cream text-ink-soft'}`}>{text}</span>
}
