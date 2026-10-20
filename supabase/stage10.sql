-- PocketRoom stage 10: developer accounts.
-- Paste this whole file into Supabase > SQL Editor and run it once. Safe to run again (it doesn't give the
-- Hearts twice).
--
-- Developers are listed here, on the server, so their emails never appear in the game's public code.
-- A developer sees a "Developer" tag in Settings, and gets `grant_hearts` once, the next time they open the game:
-- into the shared jar when living together, otherwise into their own Hearts.
-- To add a developer later: insert their email below and run it again.

create table if not exists public.developers (
  email text primary key,
  grant_hearts int not null default 0,
  granted boolean not null default false
);

-- No policies: nobody can read or change this table from the game, only through dev_status() below
alter table public.developers enable row level security;

insert into public.developers (email, grant_hearts) values
  ('roghpeduca@gmail.com', 200000),
  ('zakurofr@gmail.com', 200000)
on conflict (email) do nothing;

-- Am I a developer? Gives the Hearts the first time, once.
create or replace function public.dev_status(p_link uuid default null) returns json language plpgsql security definer set search_path = public as $$
declare
  d developers;
  mail text;
  jar_after int;
begin
  select email into mail from auth.users where id = auth.uid();
  select * into d from developers where lower(email) = lower(mail) for update;
  if not found then return json_build_object('dev', false, 'hearts', 0); end if;
  if d.granted or d.grant_hearts <= 0 then return json_build_object('dev', true, 'hearts', 0); end if;
  update developers set granted = true where email = d.email;
  -- Living together: straight into the shared jar
  if p_link is not null and public.in_home(p_link, true) then
    update homes set jar = jar + d.grant_hearts, updated_at = now() where link = p_link returning jar into jar_after;
    if found then return json_build_object('dev', true, 'hearts', 0, 'jar', jar_after, 'gave', d.grant_hearts); end if;
  end if;
  return json_build_object('dev', true, 'hearts', d.grant_hearts);
end $$;

grant execute on function public.dev_status(uuid) to authenticated;
