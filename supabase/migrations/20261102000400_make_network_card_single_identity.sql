-- A network card is a user's reusable identity for chat and QR sharing.
-- Event-specific network_profiles remain independent and retain `looking_for`
-- for AI matching within each event.

alter table public.network_cards
  alter column looking_for drop not null;

-- Preserve the newest card where legacy users have more than one, and archive
-- the older cards before enforcing the single-card rule.
with ranked_cards as (
  select id,
    row_number() over (partition by user_id order by updated_at desc, created_at desc) as row_number
  from public.network_cards
  where coalesce(is_archived, false) = false
)
update public.network_cards
set is_archived = true,
    updated_at = now()
where id in (select id from ranked_cards where row_number > 1);

create unique index if not exists network_cards_one_active_card_per_user_key
  on public.network_cards (user_id)
  where is_archived = false;
