-- Reference schema for a future authenticated Supabase transport.
-- Add deployment-specific RLS policies before use. Do not ship service keys to the browser.
create table water_sources (
  id uuid primary key,
  source_code text unique not null,
  source_type text not null,
  village text not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  photo_url text,
  created_at timestamptz not null
);

create table water_tests (
  id uuid primary key,
  source_id uuid not null references water_sources(id),
  ph double precision not null,
  tds double precision not null,
  turbidity double precision not null,
  temperature double precision not null,
  screening_status text not null,
  reason_codes text[] not null default '{}',
  tested_at timestamptz not null,
  sync_status text not null default 'SYNCED'
);

create table lab_referrals (
  id text primary key,
  test_id uuid unique not null references water_tests(id),
  source_id uuid not null references water_sources(id),
  referral_status text not null,
  notes text not null default '',
  created_at timestamptz not null
);
