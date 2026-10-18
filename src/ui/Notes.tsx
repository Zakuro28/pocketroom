import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { ABOUT, UPDATES, type Section } from '../game/updates'

const EASE = [0.23, 1, 0.32, 1] as const

function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.title} className="mt-5">
          <h3 className="font-bold">{s.title}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {s.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-heart" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/**
 * Patch notes ("What's new") and the About page. New notes open by themselves once per version;
 * Settings opens either page any time.
 */
export default function Notes({ page, onClose }: { page: 'updates' | 'about' | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {page && (
        <motion.div className="pointer-events-auto fixed inset-0 z-[52] grid place-items-center bg-ink/35 p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-cream shadow-2xl"
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-cream/80 text-ink-soft hover:bg-white">
              <X className="size-5" />
            </button>
            <div className="overflow-y-auto px-6 pt-6 pb-4">
              {page === 'updates' ? (
                UPDATES.map((u, i) => (
                  <article key={u.version} className={i ? 'mt-8 border-t border-line pt-6' : ''}>
                    <p className="text-xs font-bold tracking-wide text-heart uppercase">{i === 0 ? 'What’s new' : `Version ${u.version}`}</p>
                    <h2 id={i === 0 ? 'notes-title' : undefined} className="mt-1 pr-10 text-2xl font-bold">
                      {u.title}
                    </h2>
                    <p className="text-xs text-ink-soft">{new Date(u.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {u.intro.map((p) => (
                      <p key={p} className="mt-3 text-sm">
                        {p}
                      </p>
                    ))}
                    <Sections sections={u.sections} />
                    <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold">{u.outro}</p>
                  </article>
                ))
              ) : (
                <>
                  <p className="text-xs font-bold tracking-wide text-heart uppercase">About</p>
                  <h2 id="notes-title" className="mt-1 pr-10 text-2xl font-bold">
                    PocketRoom
                  </h2>
                  {ABOUT.intro.map((p) => (
                    <p key={p} className="mt-3 text-sm">
                      {p}
                    </p>
                  ))}
                  <Sections sections={ABOUT.sections} />
                </>
              )}
            </div>
            <div className="border-t border-line bg-cream px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={onClose} className="chunky w-full rounded-2xl bg-heart py-3.5 font-bold text-white">
                {page === 'updates' ? 'Let’s play! 💗' : 'Got it'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
