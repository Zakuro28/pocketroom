import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { getSave, replaceSave, subscribeSave, type Save } from '../game/store'

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
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
async function attach(id: string) {
  if (!supabase) return
  const { data } = await supabase.from('players').select('save').eq('id', id).maybeSingle()
  if (data?.save) replaceSave(data.save as Save)
  else await supabase.from('players').upsert({ id, save: getSave() })
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
    if (event === 'SIGNED_OUT') setUser(null)
  })

  let timer = 0
  subscribeSave(() => {
    if (!user) return
    clearTimeout(timer)
    const id = user.id
    timer = window.setTimeout(() => void supabase!.from('players').upsert({ id, save: getSave(), updated_at: new Date().toISOString() }), 2000)
  })
}
