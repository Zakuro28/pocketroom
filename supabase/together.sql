-- PocketRoom stage 3: playing together (friend codes, couples, shared homes, the Hearts jar, Chemistry).
-- Paste this whole file into Supabase > SQL Editor and run it once (after schema.sql). Safe to run again.
--
-- Every rule lives here on the server: who can be a couple, the 1-month wait after a breakup,
-- the 2,400 daily cap for a couple and the shared jar. The game only asks; the database decides.

-- The server's clock, so changing the phone's clock can't start a new day early
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;

-- Friend codes: 6 characters with no look-alikes (no O/0, I/1)
create or replace function public.new_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6)
$$;

-- ---- Tables ----

-- What the people you're connected to can see about you: name, character, room and weather
create table if not exists public.cards (
  id uuid primary key references auth.users on delete cascade,
  code text not null unique default public.new_code(),
  name text not null default '' check (char_length(name) <= 20),
  birthday date,
  look jsonb,
  room jsonb,
  weather jsonb,
  seen_at timestamptz not null default now()
);

-- A connection between two players. a asked, b answers.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users on delete cascade,
  b uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('couple', 'friend', 'family')),
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  -- Couples vote on whose apartment to live in; they move in once both pick the same one
  vote_a uuid,
  vote_b uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  check (a <> b)
);
create index if not exists links_a on public.links (a);
create index if not exists links_b on public.links (b);

-- A couple's shared apartment and Hearts jar
create table if not exists public.homes (
  link uuid primary key references public.links on delete cascade,
  owner uuid not null,
  -- { placed, floor, wall, owned, storage }
  room jsonb not null default '{}',
  room_by uuid,
  -- The day turns over at midnight in the home owner's time zone
  tz text not null default 'UTC',
  jar int not null default 0 check (jar >= 0),
  day date,
  earned int not null default 0,
  chem int not null default 0,
  chem_day date,
  paid_day date,
  a_day date,
  b_day date,
  a_joined boolean not null default false,
  b_joined boolean not null default false,
  -- At a breakup the jar is split in half; each partner collects their half once
  a_share int,
  b_share int,
  updated_at timestamptz not null default now()
);

-- ---- Who can see what ----

create or replace function public.connected(other uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from links where status in ('pending', 'active') and ((a = auth.uid() and b = other) or (b = auth.uid() and a = other)))
$$;

create or replace function public.in_home(l uuid, active_only boolean) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from links where id = l and auth.uid() in (a, b) and (not active_only or status = 'active'))
$$;

alter table public.cards enable row level security;
alter table public.links enable row level security;
alter table public.homes enable row level security;

drop policy if exists "see yourself and your people" on public.cards;
create policy "see yourself and your people" on public.cards for select using (id = auth.uid() or public.connected(id));
drop policy if exists "make your card" on public.cards;
create policy "make your card" on public.cards for insert with check (id = auth.uid());
drop policy if exists "change your card" on public.cards;
create policy "change your card" on public.cards for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "see your links" on public.links;
create policy "see your links" on public.links for select using (auth.uid() in (a, b));

drop policy if exists "see your home" on public.homes;
create policy "see your home" on public.homes for select using (public.in_home(link, false));
drop policy if exists "decorate your home" on public.homes;
create policy "decorate your home" on public.homes for update using (public.in_home(link, true)) with check (public.in_home(link, true));

-- Links change only through the functions below. In a home, players may only change the room itself;
-- the jar, Chemistry and daily count are handled by the functions.
revoke insert, update, delete on public.links from anon, authenticated;
revoke insert, update, delete on public.homes from anon, authenticated;
grant update (room, room_by, updated_at) on public.homes to authenticated;

-- Your friend code stays the same, and your birthday can't be changed once it's set
create or replace function public.keep_fixed() returns trigger language plpgsql as $$
begin
  new.code := old.code;
  if old.birthday is not null then new.birthday := old.birthday; end if;
  return new;
end $$;
drop trigger if exists keep_fixed on public.cards;
create trigger keep_fixed before update on public.cards for each row execute function public.keep_fixed();

-- ---- Rules ----

create or replace function public.couple_ok(x uuid, y uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from cards where id in (x, y) and birthday <= current_date - interval '18 years') < 2 then
    raise exception 'Couples must both be 18 or older';
  end if;
  if exists (select 1 from links where kind = 'couple' and status = 'active' and (a in (x, y) or b in (x, y))) then
    raise exception 'One of you is already in a couple';
  end if;
  if exists (select 1 from links where kind = 'couple' and status = 'ended' and ended_at > now() - interval '1 month' and (a in (x, y) or b in (x, y))) then
    raise exception 'After a breakup there''s a 1-month wait before a new couple';
  end if;
end $$;

-- Ask someone to be your couple, friend or family, using their friend code
create or replace function public.send_request(p_code text, p_kind text) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  them uuid;
  made uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if p_kind not in ('couple', 'friend', 'family') then raise exception 'Pick couple, friend or family'; end if;
  select id into them from cards where code = upper(btrim(p_code));
  if them is null then raise exception 'No player has that code'; end if;
  if them = me then raise exception 'That''s your own code'; end if;
  if exists (select 1 from links where status in ('pending', 'active') and ((a = me and b = them) or (a = them and b = me))) then
    raise exception 'You''re already connected, or a request is waiting';
  end if;
  if p_kind = 'couple' then perform couple_ok(me, them); end if;
  insert into links (a, b, kind) values (me, them, p_kind) returning id into made;
  return made;
end $$;

-- Say yes or no to a request someone sent you
create or replace function public.answer_request(p_link uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare l links;
begin
  select * into l from links where id = p_link and b = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'This request is gone'; end if;
  if not p_accept then
    delete from links where id = p_link;
    return;
  end if;
  if l.kind = 'couple' then perform couple_ok(l.a, l.b); end if;
  update links set status = 'active', started_at = now() where id = p_link;
end $$;

-- Cancel a request, remove a friend, or break up. A breakup splits the jar and starts the 1-month wait;
-- both partners keep a full copy of the room.
create or replace function public.end_link(p_link uuid) returns void language plpgsql security definer set search_path = public as $$
declare l links;
begin
  select * into l from links where id = p_link and auth.uid() in (a, b) and status in ('pending', 'active') for update;
  if not found then raise exception 'Already gone'; end if;
  if l.status = 'pending' or l.kind <> 'couple' then
    delete from links where id = p_link;
    return;
  end if;
  update links set status = 'ended', ended_at = now() where id = p_link;
  update homes set a_share = jar - jar / 2, b_share = jar / 2, jar = 0, updated_at = now() where link = p_link;
end $$;

-- Pick whose apartment to live in. When both pick the same one, the home is set up from that room.
create or replace function public.vote_home(p_link uuid, p_home uuid, p_tz text) returns boolean language plpgsql security definer set search_path = public as $$
declare l links;
begin
  select * into l from links where id = p_link and kind = 'couple' and status = 'active' and auth.uid() in (a, b) for update;
  if not found then raise exception 'You''re not in this couple'; end if;
  if p_home not in (l.a, l.b) then raise exception 'Pick one of your two apartments'; end if;
  if exists (select 1 from homes where link = p_link) then return true; end if;
  if auth.uid() = l.a then update links set vote_a = p_home where id = p_link returning * into l;
  else update links set vote_b = p_home where id = p_link returning * into l; end if;
  if l.vote_a is not null and l.vote_a = l.vote_b then
    insert into homes (link, owner, room, tz)
    values (p_link, p_home, coalesce((select room from cards where id = p_home), '{}'), coalesce(nullif(p_tz, ''), 'UTC'));
    return true;
  end if;
  return false;
end $$;

-- Moving in: your Hearts go into the jar and your decorations join the shared storage. Once per partner.
create or replace function public.join_home(p_link uuid, p_items jsonb, p_owned jsonb, p_hearts int) returns boolean language plpgsql security definer set search_path = public as $$
declare
  l links;
  h homes;
  is_a boolean;
  merged jsonb;
begin
  select * into l from links where id = p_link and status = 'active' and auth.uid() in (a, b);
  if not found then raise exception 'You''re not in this couple'; end if;
  select * into h from homes where link = p_link for update;
  if not found then raise exception 'Pick a home first'; end if;
  is_a := auth.uid() = l.a;
  if (is_a and h.a_joined) or (not is_a and h.b_joined) then return false; end if;
  select coalesce(jsonb_object_agg(k, n), '{}') into merged from (
    select key as k, sum(value::int) as n from (
      select * from jsonb_each_text(coalesce(h.room -> 'storage', '{}'))
      union all
      select * from jsonb_each_text(coalesce(p_items, '{}'))
    ) t group by key
  ) s;
  update homes set
    room = jsonb_set(
      jsonb_set(room, '{storage}', merged),
      '{owned}',
      (select coalesce(jsonb_agg(distinct v), '[]') from jsonb_array_elements(coalesce(room -> 'owned', '[]') || coalesce(p_owned, '[]')) v)
    ),
    jar = jar + greatest(0, least(coalesce(p_hearts, 0), 100000000)),
    a_joined = a_joined or is_a,
    b_joined = b_joined or not is_a,
    updated_at = now()
  where link = p_link;
  return true;
end $$;

-- The day as the home sees it
create or replace function public.home_day(h homes) returns date language sql stable as $$
  select (now() at time zone h.tz)::date
$$;

-- Spend from the jar (furniture, floors, clothes). Fails if there isn't enough.
create or replace function public.jar_spend(p_link uuid, p_n int) returns int language plpgsql security definer set search_path = public as $$
declare left_over int;
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  if p_n <= 0 then raise exception 'Nothing to spend'; end if;
  update homes set jar = jar - p_n, updated_at = now() where link = p_link and jar >= p_n returning jar into left_over;
  if left_over is null then raise exception 'Not enough Hearts in the jar'; end if;
  return left_over;
end $$;

-- Hearts from activities go into the jar, up to 2,400 a day for the two of you together
create or replace function public.couple_earn(p_link uuid, p_n int) returns json language plpgsql security definer set search_path = public as $$
declare
  h homes;
  d date;
  got int;
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  select * into h from homes where link = p_link for update;
  if not found then raise exception 'Pick a home first'; end if;
  d := public.home_day(h);
  if h.day is distinct from d then h.day := d; h.earned := 0; end if;
  -- One activity pays at most a few hundred; anything bigger isn't real play
  got := greatest(0, least(p_n, 300, 2400 - h.earned));
  update homes set jar = jar + got, earned = h.earned + got, day = d, updated_at = now() where link = p_link;
  return json_build_object('got', got, 'jar', h.jar + got, 'earned', h.earned + got);
end $$;

-- Called while playing. Marks that you played today; when you both have, Chemistry goes up by 1 (max 365).
-- Once a day, while you're both online, the Chemistry turns into Hearts in the jar (1 Heart per point).
create or replace function public.check_in(p_link uuid) returns json language plpgsql security definer set search_path = public as $$
declare
  l links;
  h homes;
  d date;
  other uuid;
  paid int := 0;
begin
  select * into l from links where id = p_link and status = 'active' and auth.uid() in (a, b);
  if not found then raise exception 'You''re not in this couple'; end if;
  update cards set seen_at = now() where id = auth.uid();
  select * into h from homes where link = p_link for update;
  if not found then return json_build_object('paid', 0); end if;
  d := public.home_day(h);
  if auth.uid() = l.a then h.a_day := d; other := l.b; else h.b_day := d; other := l.a; end if;
  if h.a_day = d and h.b_day = d and h.chem_day is distinct from d then
    h.chem := least(365, h.chem + 1);
    h.chem_day := d;
  end if;
  if h.chem > 0 and h.paid_day is distinct from d and exists (select 1 from cards where id = other and seen_at > now() - interval '5 minutes') then
    paid := h.chem;
    h.jar := h.jar + paid;
    h.paid_day := d;
  end if;
  update homes set a_day = h.a_day, b_day = h.b_day, chem = h.chem, chem_day = h.chem_day, jar = h.jar, paid_day = h.paid_day, updated_at = now() where link = p_link;
  return json_build_object('paid', paid, 'chem', h.chem, 'jar', h.jar);
end $$;

-- After a breakup: your half of the jar. Asking again gives the same half, and the game sets your Hearts to it
-- (it never adds), so a page closed at the wrong moment can't lose it.
create or replace function public.claim_share(p_link uuid) returns int language plpgsql security definer set search_path = public as $$
declare l links;
begin
  select * into l from links where id = p_link and status = 'ended' and auth.uid() in (a, b);
  if not found then return 0; end if;
  return coalesce((select case when auth.uid() = l.a then a_share else b_share end from homes where link = p_link), 0);
end $$;

grant execute on function public.server_now(), public.send_request(text, text), public.answer_request(uuid, boolean), public.end_link(uuid),
  public.vote_home(uuid, uuid, text), public.join_home(uuid, jsonb, jsonb, int), public.jar_spend(uuid, int), public.couple_earn(uuid, int),
  public.check_in(uuid), public.claim_share(uuid) to authenticated;
-- Guests use the server clock too
grant execute on function public.server_now() to anon;
revoke execute on function public.couple_ok(uuid, uuid) from anon, authenticated, public;

-- Live updates: a partner's decorating and jar changes show up right away
do $$
begin
  alter publication supabase_realtime add table public.homes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.links;
exception when duplicate_object then null;
end $$;
