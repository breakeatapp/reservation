-- ITINERA HOST: venue manager profiles
-- Run this in your Supabase SQL editor or via Supabase CLI

create table if not exists host_profiles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- e.g. "nobu-dubai" — used as login identifier
  password    text not null,                 -- plain text for now; hash in production
  venue_name  text not null,                 -- must match `establishment` field in reservations table exactly
  destination text,                          -- optional: match `destination` field too (e.g. "dubai")
                                             -- if set, only reservations with BOTH venue_name AND destination match
                                             -- leave NULL to match by venue_name only
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Index for login lookups
create index if not exists host_profiles_slug_idx on host_profiles (slug);

-- ── If the table already exists, add the destination column ──────────────────
-- alter table host_profiles add column if not exists destination text;

-- ── Example rows ─────────────────────────────────────────────────────────────
-- insert into host_profiles (slug, password, venue_name, destination)
-- values ('nobu-dubai', 'securepassword', 'Nobu Dubai', 'dubai');
--
-- If the same venue exists in multiple cities, use destination to differentiate:
-- insert into host_profiles (slug, password, venue_name, destination)
-- values ('nobu-miami', 'securepassword', 'Nobu Miami', 'miami');

-- Disable RLS — this table is only accessed via supabaseAdmin (service_role) in API routes
-- If you want to enable RLS for extra safety:
-- alter table host_profiles enable row level security;
-- create policy "service_role_only" on host_profiles using (false);
