-- Add check-in/check-out time columns to hotels
alter table public.hotels
  add column if not exists check_in_time text default '14:00',
  add column if not exists check_out_time text default '12:00';
