create table if not exists public.folio_charges (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  category text not null default 'other' check (category in ('food','beverage','minibar','laundry','spa','phone','other')),
  description text not null,
  amount numeric(10,2) not null,
  quantity integer default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.folio_charges enable row level security;
drop policy if exists "super_admin all folio_charges" on public.folio_charges;
drop policy if exists "tenant folio_charges" on public.folio_charges;
create policy "super_admin all folio_charges" on public.folio_charges for all using (public.is_super_admin());
create policy "tenant folio_charges" on public.folio_charges for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);
