-- PocketRoom stage 8: a moving-in gift for couples.
-- Paste this whole file into Supabase > SQL Editor and run it once (after together.sql). Safe to run again.
--
-- Every shared home gets one gift, once: a double bed, a second table and chair, and a second PC setup
-- (desk, monitor, desk chair), put in the shared storage to place wherever the couple likes.
-- Couples who already live together get it the next time either of them plays.

alter table public.homes add column if not exists couple_gift boolean not null default false;

create or replace function public.claim_couple_gift(p_link uuid) returns homes language plpgsql security definer set search_path = public as $$
declare
  h homes;
  gift jsonb := '{"bedDouble": 1, "table": 1, "chair": 1, "desk": 1, "computerScreen": 1, "chairDesk": 1}';
  merged jsonb;
begin
  if not public.in_home(p_link, true) then raise exception 'You''re not in this couple'; end if;
  select * into h from homes where link = p_link for update;
  if not found then raise exception 'Pick a home first'; end if;
  if h.couple_gift then return h; end if;
  select coalesce(jsonb_object_agg(k, n), '{}') into merged from (
    select key as k, sum(value::int) as n from (
      select * from jsonb_each_text(coalesce(h.room -> 'storage', '{}'))
      union all
      select * from jsonb_each_text(gift)
    ) t group by key
  ) s;
  update homes set room = jsonb_set(coalesce(room, '{}'), '{storage}', merged), couple_gift = true, room_by = auth.uid(), updated_at = now()
  where link = p_link returning * into h;
  return h;
end $$;

grant execute on function public.claim_couple_gift(uuid) to authenticated;
