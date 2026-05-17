-- ITINERA HOST: venue manager profiles
-- Run this in your Supabase SQL editor or via Supabase CLI

create table if not exists host_profiles (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,          -- e.g. "nobu-dubai" — used as login identifier
  password   text not null,                 -- plain text for now; hash in production
  venue_name text not null,                 -- must match `establishment` field in reservations table
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index for login lookups
create index if not exists host_profiles_slug_idx on host_profiles (slug);

-- Example row (remove or modify before running in production)
-- insert into host_profiles (slug, password, venue_name) values ('nobu-dubai', 'securepassword', 'Nobu Dubai');

-- Disable RLS — this table is only accessed via supabaseAdmin (service_role) in API routes
-- If you want to enable RLS for extra safety:
-- alter table host_profiles enable row level security;
-- create policy "service_role_only" on host_profiles using (false);
