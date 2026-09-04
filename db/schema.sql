-- Neon Postgres schema for thaiid.
--
-- Apply with:  npm run db:push        (no psql install required)
-- Or:          psql "$DATABASE_URL" -f db/schema.sql
--
-- Re-runnable: every statement guards with "if not exists" or "or replace".
--
-- Differences from the Supabase version this replaces:
--
--   * User ids are Clerk ids (`user_2ab…`), so they are `text`, not `uuid`, and
--     there is no `auth.users` table to reference. Ownership is therefore not
--     enforceable by a foreign key — the API layer is the boundary.
--   * There is no `storage` schema. Rendered cards live in a private Vercel Blob
--     store and only their pathnames are recorded here.
--   * No RLS policies. Every query arrives over a single pooled connection owned
--     by the API functions, so `current_user` is the same for all callers and RLS
--     could not distinguish them. Each statement is instead scoped by `user_id`
--     taken from the verified Clerk token, never from the request body.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'country_code') then
    create type country_code as enum ('TH', 'SG', 'BR', 'US', 'VN');
  end if;
end
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one per user per country
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  country_code country_code not null,

  -- Card field values, validated against the zod ProfileSchema before write.
  -- jsonb because the field set differs per country and changes faster than a
  -- migration cadence can follow.
  data jsonb not null default '{}'::jsonb,

  -- Pathnames inside the private blob store. Never public URLs; the API mints
  -- short-lived signed URLs on read.
  card_front_path text,
  portrait_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_one_per_country unique (user_id, country_code),
  constraint profiles_data_is_object check (jsonb_typeof(data) = 'object')
);

create index if not exists profiles_user_id_idx on profiles (user_id);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- card_versions — append-only generation history
-- ---------------------------------------------------------------------------

create table if not exists card_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id text not null,

  -- Snapshot of the values this render came from, so history stays meaningful
  -- after the live profile moves on.
  data_snapshot jsonb not null default '{}'::jsonb,

  card_front_path text not null,
  portrait_path text,
  model text,

  created_at timestamptz not null default now(),

  constraint card_versions_snapshot_is_object check (jsonb_typeof(data_snapshot) = 'object')
);

create index if not exists card_versions_profile_created_idx
  on card_versions (profile_id, created_at desc);

create index if not exists card_versions_user_id_idx on card_versions (user_id);

-- ---------------------------------------------------------------------------
-- user_preferences — one row per user
-- ---------------------------------------------------------------------------

create table if not exists user_preferences (
  user_id text primary key,
  active_country country_code not null default 'TH',
  theme text not null default 'dark',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_preferences_theme_check check (theme in ('dark', 'light')),
  constraint user_preferences_language_check check (language in ('en', 'th', 'zh', 'pt', 'vi'))
);

drop trigger if exists user_preferences_set_updated_at on user_preferences;
create trigger user_preferences_set_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();
