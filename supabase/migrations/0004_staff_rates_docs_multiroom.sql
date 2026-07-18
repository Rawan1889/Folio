-- Rate plans (seasonal, weekend, promo)
create table if not exists public.rate_plans (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  name text not null,
  type text not null default 'seasonal' check (type in ('seasonal','weekend','promo','corporate')),
  adjustment_type text not null default 'percent' check (adjustment_type in ('percent','fixed','override')),
  adjustment_value numeric(10,2) not null default 0,
  start_date date,
  end_date date,
  promo_code text,
  min_nights integer default 1,
  active boolean default true,
  room_type_id uuid references public.room_types(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.rate_plans enable row level security;
create policy "super_admin all rate_plans" on public.rate_plans for all using (public.is_super_admin());
create policy "tenant rate_plans" on public.rate_plans for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);

-- Guest documents
create table if not exists public.guest_documents (
  id uuid primary key default uuid_generate_v4(),
  guest_id uuid references public.guests(id) on delete cascade not null,
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  type text not null default 'passport' check (type in ('passport','national_id','driving_license','visa','other')),
  url text not null,
  file_name text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.guest_documents enable row level security;
create policy "super_admin all guest_documents" on public.guest_documents for all using (public.is_super_admin());
create policy "tenant guest_documents" on public.guest_documents for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);

-- Booking rooms (additional rooms per booking)
create table if not exists public.booking_rooms (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete restrict not null,
  rate_amount numeric(10,2) default 0,
  created_at timestamptz default now(),
  unique(booking_id, room_id)
);
alter table public.booking_rooms enable row level security;
create policy "super_admin all booking_rooms" on public.booking_rooms for all using (public.is_super_admin());
create policy "tenant booking_rooms" on public.booking_rooms for all using (
  booking_id in (
    select id from public.bookings where hotel_id in (
      select id from public.hotels where tenant_id = public.get_user_tenant_id()
    )
  )
);

alter table public.profiles add column if not exists hotel_id uuid references public.hotels(id) on delete set null;

insert into storage.buckets (id, name, public) values ('guest-docs', 'guest-docs', false) on conflict do nothing;
create policy "auth upload guest docs" on storage.objects for insert to authenticated with check (bucket_id = 'guest-docs');
create policy "auth read guest docs" on storage.objects for select to authenticated using (bucket_id = 'guest-docs');
create policy "auth delete guest docs" on storage.objects for delete to authenticated using (bucket_id = 'guest-docs');
