-- Preserve Auth as the source of roster emails, including for older accounts
-- without a synchronized public.users row. Only the server may call this.
create function public.attendee_auth_emails(user_ids uuid[])
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_object_agg(u.id, u.email), '{}'::jsonb)
  from auth.users u
  where u.id = any(user_ids);
$$;
revoke all on function public.attendee_auth_emails(uuid[]) from public, anon, authenticated;
grant execute on function public.attendee_auth_emails(uuid[]) to service_role;

alter table public.network_profiles add column if not exists is_dummy boolean default false;
update public.network_profiles p
set is_dummy = true
from auth.users u
where u.id = p.user_id
  and u.email ~* '^dummy[0-9]+\+.+@evenai\.ai$'
  and p.is_dummy is distinct from true;
