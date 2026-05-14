-- Colle ce SQL dans Supabase > SQL Editor > Run

create table reservations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  establishment text not null,
  destination text not null,
  date text not null,
  time text not null,
  guests integer not null,
  occasion text default '',
  seating text default '',
  vip_level text default '',
  budget_level text default '',
  special_requests text default '',
  status text default 'pending',
  establishment_phone text default '',
  establishment_email text default ''
);

-- Désactiver RLS pour l'accès admin (MVP)
alter table reservations disable row level security;
