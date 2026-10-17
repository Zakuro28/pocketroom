-- PocketRoom stage 3.5: one login per account (the newest device wins).
-- Paste this whole file into Supabase > SQL Editor and run it once (after schema.sql and together.sql). Safe to run again.
--
-- Signing in writes the device's id here. An older device sees the change, stops saving and shows as signed out,
-- and its saves no longer land (they only save while the id is still theirs).

alter table public.players add column if not exists device text;

-- Live updates on your own row, so the older device hears about it right away (row-level security still applies)
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;
