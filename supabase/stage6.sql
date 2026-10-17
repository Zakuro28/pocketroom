-- PocketRoom stage 6: deleting your account, and no more daily Hearts limit for couples.
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
