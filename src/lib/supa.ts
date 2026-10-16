import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

/** The game server (Supabase). Null when it isn't set up, and then everything plays as a guest. */
export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

/** A database request only goes out once something waits on it. This sends one and lets it finish in the background. */
export const send = (q: PromiseLike<unknown>) => void Promise.resolve(q).catch(() => {})
