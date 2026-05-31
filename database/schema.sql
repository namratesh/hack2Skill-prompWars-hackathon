-- Travel Planning Experience Engine — Supabase Schema
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget_usd numeric not null,
  travel_style text[] default '{}',
  group_type text default 'solo',
  group_size int default 1,
  status text default 'generating',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists itinerary_days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  date date not null,
  theme text,
  ai_reasoning text,
  weather_condition text,
  weather_temp_c numeric,
  rain_probability int
);

create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid references itinerary_days(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  sequence_order int not null,
  name text not null,
  type text not null,
  location_name text,
  lat numeric,
  lng numeric,
  start_time text,
  duration_minutes int,
  cost_usd numeric default 0,
  description text,
  insider_tip text,
  booking_url text,
  status text default 'suggested',
  replaced_by uuid references activities(id),
  created_at timestamptz default now()
);

create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  type text not null,
  severity text default 'info',
  title text not null,
  body text,
  affected_day_numbers int[],
  resolved boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open for hackathon — lock down in prod)
alter table trips enable row level security;
alter table itinerary_days enable row level security;
alter table activities enable row level security;
alter table alerts enable row level security;

create policy "allow all" on trips for all using (true) with check (true);
create policy "allow all" on itinerary_days for all using (true) with check (true);
create policy "allow all" on activities for all using (true) with check (true);
create policy "allow all" on alerts for all using (true) with check (true);
