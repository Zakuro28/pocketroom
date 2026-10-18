// Supabase project for Google sign-in and cloud saves. Both values are public by design:
// the database's row-level security rules (supabase/schema.sql) decide what anyone can read or write.
// They come from the build environment (Vercel's Supabase integration sets NEXT_PUBLIC_SUPABASE_*).
// Leave them unset and PocketRoom plays as a guest, saving on this device only.
const env = import.meta.env
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Voice relay (TURN), for players whose networks block a direct connection (common on mobile data).
// Set these in Vercel's environment variables; without them voice connects directly where it can.
// VITE_TURN_URLS is a comma-separated list, e.g. "turn:relay.example.com:80,turns:relay.example.com:443".
export const TURN_URLS: string[] = String(env.VITE_TURN_URLS ?? '').split(',').map((u) => u.trim()).filter(Boolean)
export const TURN_USERNAME: string = env.VITE_TURN_USERNAME ?? ''
export const TURN_CREDENTIAL: string = env.VITE_TURN_CREDENTIAL ?? ''
