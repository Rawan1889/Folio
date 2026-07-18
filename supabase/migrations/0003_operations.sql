-- Housekeeping tasks
create table if not exists public.housekeeping_tasks (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  type text not null default 'clean' check (type in ('clean','inspect','maintenance','turndown')),
  status text not null default 'pending' check (status in ('pending','in_progress','done','skipped')),
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table public.housekeeping_tasks enable row level security;
create policy "super_admin all housekeeping" on public.housekeeping_tasks for all using (public.is_super_admin());
create policy "tenant housekeeping" on public.housekeeping_tasks for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);

-- Night audit snapshots
create table if not exists public.night_audits (
  id uuid primary key default uuid_generate_v4(),
  hotel_id uuid references public.hotels(id) on delete cascade not null,
  audit_date date not null,
  total_rooms integer default 0,
  occupied_rooms integer default 0,
  arrivals integer default 0,
  departures integer default 0,
  no_shows integer default 0,
  revenue numeric(10,2) default 0,
  adr numeric(10,2) default 0,
  revpar numeric(10,2) default 0,
  occupancy_pct numeric(5,2) default 0,
  notes text,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz default now(),
  unique(hotel_id, audit_date)
);
alter table public.night_audits enable row level security;
create policy "super_admin all night_audits" on public.night_audits for all using (public.is_super_admin());
create policy "tenant night_audits" on public.night_audits for all using (
  hotel_id in (select id from public.hotels where tenant_id = public.get_user_tenant_id())
);
