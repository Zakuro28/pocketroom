-- PocketRoom stage 6: deleting your account.
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
