-- PocketRoom stage 9 (update 1.1.0): a couple's anniversary is set once, and then it stays; and a shared home's
-- day starts at the couple's own midnight.
-- Paste this whole file into Supabase > SQL Editor and run it once (after stage7.sql). Safe to run again.
--
-- Before, either partner could change the date any time (and a phone's date picker could change it by
-- accident). Now the first date saved is kept; asking again with a date only fills it in while it's empty.

create or replace function public.set_anniversary(p_link uuid, p_date date) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_date is null or p_date > current_date then raise exception 'Pick a date that has already happened'; end if;
  if exists (select 1 from links where id = p_link and anniversary is not null) then
    raise exception 'Your anniversary is already set';
  end if;
  update links set anniversary = p_date
  where id = p_link and kind = 'couple' and status in ('pending', 'active') and auth.uid() in (a, b);
  if not found then raise exception 'That isn''t your couple'; end if;
end $$;

grant execute on function public.set_anniversary(uuid, date) to authenticated;

-- A shared home's day starts at midnight in its time zone. Homes made without one were left on UTC (8 AM in
-- the Philippines). The game calls this to move such a home onto the player's own time zone, once.
create or replace function public.set_home_tz(p_link uuid, p_tz text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  if not exists (select 1 from pg_timezone_names where name = p_tz) then raise exception 'Unknown time zone'; end if;
  update homes set tz = p_tz where link = p_link and tz = 'UTC';
end $$;

grant execute on function public.set_home_tz(uuid, text) to authenticated;
