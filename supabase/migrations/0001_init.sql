-- Folio · Hotel POS Multi-Tenant Schema
create extension if not exists "uuid-ossp";

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz default now()
);

create table public.hotels (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  address text, city text, country text default 'Iraq',
  phone text, email text, cover_image_url text,
  currency text default 'USD', timezone text default 'Asia/Baghdad',
  active boolean default true,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, avatar_url text,
  role text not null default 'staff' check (role in ('super_admin','hotel_admin','manager','staff')),
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz default now()
);

create table public.room_types (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  name text not null, description text,
  base_price numeric(10,2) not null default 0,
  max_adults integer default 2, max_children integer default 0,
  amenities text[] default '{}',
  created_at timestamptz default now()
);

create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  room_type_id uuid references public.room_types(id) on delete set null,
  number text not null, floor integer default 1,
  status text not null default 'available' check (status in ('available','occupied','cleaning','maintenance','blocked')),
  notes text,
  created_at timestamptz default now(),
  unique(hotel_id, number)
);

create table public.room_media (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  url text not null,
  type text not null default 'image' check (type in ('image','video')),
  is_cover boolean default false, sort_order integer default 0,
  created_at timestamptz default now()
);

create table public.guests (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  full_name text not null, email text, phone text, nationality text,
  id_type text check (id_type in ('passport','national_id','driving_license')),
  id_number text, notes text, vip boolean default false,
  created_at timestamptz default now()
);

create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete restrict not null,
  guest_id uuid references public.guests(id) on delete restrict not null,
  check_in date not null, check_out date not null,
  adults integer default 1, children integer default 0,
  status text not null default 'confirmed' check (status in ('confirmed','checked_in','checked_out','cancelled','no_show')),
  total_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  notes text,
  source text default 'direct' check (source in ('direct','online','phone','walk_in','agency')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  constraint check_out_after_check_in check (check_out > check_in)
);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  amount numeric(10,2) not null,
  method text not null default 'cash' check (method in ('cash','card','bank_transfer','fib','fastpay','other')),
  status text not null default 'completed' check (status in ('pending','completed','refunded')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.tenants enable row level security;
alter table public.hotels enable row level security;
alter table public.profiles enable row level security;
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
alter table public.room_media enable row level security;
alter table public.guests enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

create or replace function public.get_user_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select role = 'super_admin' from public.profiles where id = auth.uid();
$$;

create policy "super_admin all tenants" on public.tenants for all using (public.is_super_admin());
create policy "member sees own tenant" on public.tenants for select using (id = public.get_user_tenant_id());
create policy "super_admin all hotels" on public.hotels for all using (public.is_super_admin());
create policy "tenant sees own hotels" on public.hotels for all using (tenant_id = public.get_user_tenant_id());
create policy "super_admin all profiles" on public.profiles for all using (public.is_super_admin());
create policy "own profile" on public.profiles for all using (id = auth.uid());
create policy "tenant profiles" on public.profiles for select using (tenant_id = public.get_user_tenant_id());
create policy "super_admin all room_types" on public.room_types for all using (public.is_super_admin());
create policy "tenant room_types" on public.room_types for all using (hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id()));
create policy "super_admin all rooms" on public.rooms for all using (public.is_super_admin());
create policy "tenant rooms" on public.rooms for all using (hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id()));
create policy "super_admin all room_media" on public.room_media for all using (public.is_super_admin());
create policy "tenant room_media" on public.room_media for all using (room_id in (select id from public.rooms where hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())));
create policy "super_admin all guests" on public.guests for all using (public.is_super_admin());
create policy "tenant guests" on public.guests for all using (hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id()));
create policy "super_admin all bookings" on public.bookings for all using (public.is_super_admin());
create policy "tenant bookings" on public.bookings for all using (hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id()));
create policy "super_admin all payments" on public.payments for all using (public.is_super_admin());
create policy "tenant payments" on public.payments for all using (hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), coalesce(new.raw_user_meta_data->>'role', 'staff'));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public) values ('room-media', 'room-media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('hotel-assets', 'hotel-assets', true) on conflict do nothing;

create policy "auth upload room media" on storage.objects for insert to authenticated with check (bucket_id = 'room-media');
create policy "public read room media" on storage.objects for select to public using (bucket_id = 'room-media');
create policy "auth delete room media" on storage.objects for delete to authenticated using (bucket_id = 'room-media');
