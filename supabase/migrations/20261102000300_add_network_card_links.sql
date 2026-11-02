alter table public.network_profiles
  add column if not exists network_card_id uuid null references public.network_cards(id) on delete set null;

alter table public.connections
  add column if not exists sender_network_card_id uuid null references public.network_cards(id) on delete set null,
  add column if not exists receiver_network_card_id uuid null references public.network_cards(id) on delete set null;

create index if not exists network_profiles_network_card_id_idx
  on public.network_profiles (network_card_id);

create index if not exists connections_sender_network_card_id_idx
  on public.connections (sender_network_card_id);

create index if not exists connections_receiver_network_card_id_idx
  on public.connections (receiver_network_card_id);
