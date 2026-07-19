create table if not exists public.channel_sources (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  name text not null,
  provider text not null check (provider in ('booking_com','airbnb','expedia','other')),
  ical_url text not null,
  room_id uuid references public.rooms(id) on delete set null,
  last_synced timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);
alter table public.channel_sources enable row level security;
drop policy if exists "super_admin all channel_sources" on public.channel_sources;
drop policy if exists "tenant channel_sources" on public.channel_sources;
create policy "super_admin all channel_sources" on public.channel_sources for all using (public.is_super_admin());
create policy "tenant channel_sources" on public.channel_sources for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);

alter table public.bookings add column if not exists external_uid text;
alter table public.bookings add column if not exists channel_source_id uuid references public.channel_sources(id) on delete set null;
create unique index if not exists bookings_external_uid_idx on public.bookings(hotel_id, external_uid) where external_uid is not null;
