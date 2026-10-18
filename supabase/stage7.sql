-- PocketRoom stage 7: a couple's anniversary, for the monthly monthsary pet.
-- Paste this whole file into Supabase > SQL Editor and run it once (after together.sql). Safe to run again.
--
-- The couple picks the day they got together (when asking, or later in Settings). Every month on that day,
-- each partner gets a monthsary pet. Without one, the day the couple was accepted counts.

alter table public.links add column if not exists anniversary date;

-- Either partner (or the one asking, while the request waits) can set it; it can't be in the future
create or replace function public.set_anniversary(p_link uuid, p_date date) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_date is null or p_date > current_date then raise exception 'Pick a date that has already happened'; end if;
  update links set anniversary = p_date
  where id = p_link and kind = 'couple' and status in ('pending', 'active') and auth.uid() in (a, b);
  if not found then raise exception 'That isn''t your couple'; end if;
end $$;

grant execute on function public.set_anniversary(uuid, date) to authenticated;
