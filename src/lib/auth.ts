import { useEffect, useState } from 'react'
import { getSave, replaceSave, subscribeSave, type Save } from '../game/store'
import { send, supabase } from './supa'
import { startTogether, stopTogether } from './together'

export const canSignIn = supabase !== null

export type User = { id: string; email: string; name: string } | null

let user: User = null
const listeners = new Set<(u: User) => void>()
const setUser = (u: User) => {
  user = u
  listeners.forEach((l) => l(u))
}

export function useUser() {
  const [u, setU] = useState(user)
  useEffect(() => {
    listeners.add(setU)
    return () => void listeners.delete(setU)
  }, [])
  return u
}

export const signInWithGoogle = () => supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
export const signOut = () => supabase?.auth.signOut()

/**
 * On sign-in: if this account already has a saved game, load it here; otherwise upload the game on this device.
 * After that, every change is saved to the account (gathered for a couple of seconds so it doesn't flood the network).
 */
let attached: string | null = null
async function attach(id: string) {
  // Signing in reports itself twice (the saved session and the sign-in event); load the save once
  if (!supabase || attached === id) return
  attached = id
  const { data } = await supabase.from('players').select('save').eq('id', id).maybeSingle()
  if (data?.save) replaceSave(data.save as Save)
  else await supabase.from('players').upsert({ id, save: getSave() })
  // Friends, couples and the shared home start once the save is in place
  void startTogether(id)
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const s = data.session
    if (s) {
      setUser({ id: s.user.id, email: s.user.email ?? '', name: (s.user.user_metadata.full_name as string) ?? '' })
      void attach(s.user.id)
    }
  })
  supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_IN' && s && user?.id !== s.user.id) {
      setUser({ id: s.user.id, email: s.user.email ?? '', name: (s.user.user_metadata.full_name as string) ?? '' })
      void attach(s.user.id)
    }
    if (event === 'SIGNED_OUT') {
      attached = null
      setUser(null)
      stopTogether()
    }
  })

  let timer = 0
  let waiting = false
  const upload = () => {
    clearTimeout(timer)
    waiting = false
    if (user) send(supabase!.from('players').upsert({ id: user.id, save: getSave(), updated_at: new Date().toISOString() }))
  }
  subscribeSave(() => {
    if (!user) return
    clearTimeout(timer)
    waiting = true
    timer = window.setTimeout(upload, 2000)
  })
  // Closing or leaving the tab saves right away, so the last couple of seconds aren't lost
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && waiting && upload())
}
