import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
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

// ---- One login per account: the newest device wins ----
// Every open game gets its own id. Signing in writes it to the account, and a device whose id
// is no longer there has been replaced: it stops saving and shows as signed out.
const device = crypto.randomUUID()
/** False until the database has the device column (supabase/stage35.sql); the rule is off until then */
let deviceRule = false
let kicked = false
let deviceChannel: RealtimeChannel | null = null
let deviceTimer = 0

const kickedListeners = new Set<(k: boolean) => void>()
const setKicked = (k: boolean) => {
  kicked = k
  kickedListeners.forEach((l) => l(k))
}

/** True once another device signed in to this account and this one was logged out */
export function useKicked() {
  const [k, setK] = useState(kicked)
  useEffect(() => {
    kickedListeners.add(setK)
    return () => void kickedListeners.delete(setK)
  }, [])
  return k
}

function unwatchDevice() {
  clearInterval(deviceTimer)
  if (deviceChannel) void supabase?.removeChannel(deviceChannel)
  deviceChannel = null
}

/**
 * Another device took over: stop saving here and show as signed out. The Google sign-in itself stays in the
 * browser, because another tab of this same browser shares it and would be signed out too.
 */
function kickOut() {
  if (kicked || !user) return
  unwatchDevice()
  attached = null
  setUser(null)
  stopTogether()
  setKicked(true)
}

/** Keep an eye on the account: a newer device writing its id means this one is out */
function watchDevice(id: string) {
  if (!supabase || !deviceRule) return
  unwatchDevice()
  deviceChannel = supabase
    .channel(`device-${id}-${device}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${id}` }, (msg) => {
      const d = (msg.new as { device?: string | null }).device
      if (d && d !== device) kickOut()
    })
    .subscribe()
  // Also check now and then, in case a live update was missed
  deviceTimer = window.setInterval(() => void checkDevice(id), 30_000)
}

async function checkDevice(id: string) {
  if (!supabase || !deviceRule || kicked || user?.id !== id) return
  const { data, error } = await supabase.from('players').select('device').eq('id', id).maybeSingle()
  if (!error && data?.device && data.device !== device) kickOut()
}

export async function signInWithGoogle() {
  if (!supabase) return
  // Logged out by another device but still signed in to Google here: take the account back without leaving the page
  if (kicked) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setKicked(false)
      const u = data.session.user
      setUser({ id: u.id, email: u.email ?? '', name: (u.user_metadata.full_name as string) ?? '' })
      return attach(u.id)
    }
  }
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
}

/** Signs out this device only, never a phone or computer you're also using */
export function signOut() {
  setKicked(false)
  return supabase?.auth.signOut({ scope: 'local' })
}

/** After being logged out by another device: keep playing here as a guest */
export const playAsGuest = () => setKicked(false)

/**
 * On sign-in: if this account already has a saved game, load it here; otherwise upload the game on this device.
 * After that, every change is saved to the account (gathered for a couple of seconds so it doesn't flood the network).
 */
let attached: string | null = null
async function attach(id: string) {
  // Signing in reports itself twice (the saved session and the sign-in event); load the save once
  if (!supabase || attached === id || kicked) return
  attached = id
  // Claim the account for this device first, so an older device can't save over what loads next
  const { error: noColumn } = await supabase.from('players').update({ device }).eq('id', id)
  deviceRule = !noColumn
  const { data } = await supabase.from('players').select('save').eq('id', id).maybeSingle()
  if (data?.save) replaceSave(data.save as Save)
  else await supabase.from('players').upsert({ id, save: getSave(), ...(deviceRule ? { device } : {}) })
  watchDevice(id)
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
    // A device that was logged out stays out until you choose to sign in here again
    if (event === 'SIGNED_IN' && s && user?.id !== s.user.id && !kicked) {
      setUser({ id: s.user.id, email: s.user.email ?? '', name: (s.user.user_metadata.full_name as string) ?? '' })
      void attach(s.user.id)
    }
    if (event === 'SIGNED_OUT') {
      unwatchDevice()
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
    if (!user) return
    const id = user.id
    const row = { save: getSave(), updated_at: new Date().toISOString() }
    if (!deviceRule) return send(supabase!.from('players').upsert({ id, ...row }))
    // Saves only while this device still holds the account; nothing saved means a newer device took over
    void supabase!
      .from('players')
      .update(row)
      .eq('id', id)
      .eq('device', device)
      .select('id')
      .then(({ data, error }) => {
        if (!error && !data?.length) kickOut()
      })
  }
  subscribeSave(() => {
    if (!user) return
    clearTimeout(timer)
    waiting = true
    timer = window.setTimeout(upload, 2000)
  })
  document.addEventListener('visibilitychange', () => {
    // Closing or leaving the tab saves right away, so the last couple of seconds aren't lost
    if (document.visibilityState === 'hidden' && waiting) upload()
    // Coming back to the tab: make sure no other device took over meanwhile
    if (document.visibilityState === 'visible' && user) void checkDevice(user.id)
  })
}
