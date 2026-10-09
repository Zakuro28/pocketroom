-- PocketRoom: one saved game per Google account (room, Hearts, character, clothes).
-- Paste this whole file into Supabase > SQL Editor and run it once.

create table if not exists public.players (
  id uuid primary key references auth.users on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

-- Each player can only see and change their own save
drop policy if exists "your own save" on public.players;
create policy "your own save" on public.players for all using (auth.uid() = id) with check (auth.uid() = id);
