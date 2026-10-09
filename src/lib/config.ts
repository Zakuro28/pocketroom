// Supabase project for Google sign-in and cloud saves. Both values are public by design:
// the database's row-level security rules (supabase/schema.sql) decide what anyone can read or write.
// They come from the build environment (Vercel's Supabase integration sets NEXT_PUBLIC_SUPABASE_*).
// Leave them unset and PocketRoom plays as a guest, saving on this device only.
const env = import.meta.env
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
