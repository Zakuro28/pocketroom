-- PocketRoom stage 6: deleting your account, no more daily Hearts limit for couples, and caring for each other's pets.
-- Paste this whole file into Supabase > SQL Editor and run it once. Safe to run again.
--
-- Deletes the signed-in player's account and everything that belongs to it: the saved game (with pets),
-- the friend card, and every friend/family link (they all cascade from the account).
-- Not while in a couple: breaking up first splits the shared jar fairly, so the partner never loses their half.

create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from links where kind = 'couple' and status = 'active' and auth.uid() in (a, b)) then
    raise exception 'Break up first, so your partner keeps their half of the jar';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- No daily Hearts limit any more (each activity pays once a day instead). Hearts from activities still go into
-- the jar; the only check left is that one payout is a believable size.
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
  got := greatest(0, least(p_n, 300));
  update homes set jar = jar + got, earned = h.earned + got, day = d, updated_at = now() where link = p_link;
  return json_build_object('got', got, 'jar', h.jar + got, 'earned', h.earned + got);
end $$;

-- Living together: either partner can feed and pet both partners' pets, once a day per pet in all.
-- `care` remembers the day each pet was last fed ("fed:<pet>") and petted ("petted:<pet>"), in the home's time zone.
alter table public.homes add column if not exists care jsonb not null default '{}';

create or replace function public.couple_care(p_link uuid, p_pet text, p_kind text, p_n int) returns json language plpgsql security definer set search_path = public as $$
declare
  h homes;
  d date;
  k text;
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  if p_kind not in ('fed', 'petted') then raise exception 'Feed or pet'; end if;
  select * into h from homes where link = p_link for update;
  if not found then raise exception 'Pick a home first'; end if;
  d := public.home_day(h);
  k := p_kind || ':' || p_pet;
  if (h.care ->> k) = d::text then
    raise exception '%', case when p_kind = 'fed' then 'Already fed today' else 'Already petted today' end;
  end if;
  update homes set care = jsonb_set(coalesce(care, '{}'), array[k], to_jsonb(d::text)), jar = jar + greatest(0, least(p_n, 1500)), updated_at = now()
  where link = p_link returning * into h;
  return json_build_object('jar', h.jar, 'earned', h.earned, 'care', h.care);
end $$;

grant execute on function public.couple_care(uuid, text, text, int) to authenticated;
