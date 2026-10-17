-- PocketRoom stage 5: pets.
-- Paste this whole file into Supabase > SQL Editor and run it once (after together.sql). Safe to run again.
--
-- Pets live in each player's saved game. The only server part: Hearts from feeding pets go on top of the
-- daily cap, so a couple's jar needs a way in that doesn't count toward the 2,400 a day.

-- Feeding Hearts into the couple's jar (one feeding pays a few hundred at most; anything bigger isn't real play)
create or replace function public.couple_feed(p_link uuid, p_n int) returns json language plpgsql security definer set search_path = public as $$
declare
  h homes;
  got int;
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  got := greatest(0, least(p_n, 1500));
  update homes set jar = jar + got, updated_at = now() where link = p_link returning * into h;
  if not found then raise exception 'Pick a home first'; end if;
  return json_build_object('got', got, 'jar', h.jar, 'earned', h.earned);
end $$;

grant execute on function public.couple_feed(uuid, int) to authenticated;
