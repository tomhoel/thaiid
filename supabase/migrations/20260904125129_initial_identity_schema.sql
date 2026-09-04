-- Initial identity schema.
--
-- Model: a user holds at most one profile per country. Card generation output is
-- kept as an append-only history so a user can roll back to an earlier render.
--
-- Every table is owner-scoped through row level security. Nothing here is
-- readable across users, and no policy grants access on the basis of the anon
-- key alone.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.country_code as enum ('TH', 'SG', 'BR', 'US', 'VN');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  country_code public.country_code not null,

  -- Card field values, validated client-side against the zod ProfileSchema.
  -- Held as jsonb because the field set differs per country and evolves faster
  -- than a migration cadence can follow.
  data jsonb not null default '{}'::jsonb,

  -- Object paths inside the private `cards` storage bucket. Never public URLs.
  card_front_path text,
  portrait_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_one_per_country unique (user_id, country_code),
  constraint profiles_data_is_object check (jsonb_typeof(data) = 'object')
);

create index profiles_user_id_idx on public.profiles (user_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- card_versions -- append-only generation history
-- ---------------------------------------------------------------------------

create table public.card_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Snapshot of the field values this render was produced from, so history stays
  -- meaningful after the live profile moves on.
  data_snapshot jsonb not null default '{}'::jsonb,

  card_front_path text not null,
  portrait_path text,
  model text,

  created_at timestamptz not null default now(),

  constraint card_versions_snapshot_is_object check (jsonb_typeof(data_snapshot) = 'object')
);

create index card_versions_profile_id_created_at_idx
  on public.card_versions (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- user_preferences -- one row per user
-- ---------------------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_country public.country_code not null default 'TH',
  theme text not null default 'dark',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_preferences_theme_check check (theme in ('dark', 'light')),
  constraint user_preferences_language_check check (language in ('en', 'th', 'zh', 'pt', 'vi'))
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.card_versions enable row level security;
alter table public.user_preferences enable row level security;

-- profiles
create policy "Users read own profiles"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own profiles"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own profiles"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own profiles"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- card_versions. No update policy: history is append-only by design.
create policy "Users read own card versions"
  on public.card_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own card versions"
  on public.card_versions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete own card versions"
  on public.card_versions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_preferences
create policy "Users read own preferences"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own preferences"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own preferences"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own preferences"
  on public.user_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Seed preferences on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Private storage for rendered cards and portraits
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cards',
  'cards',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Objects are addressed as `<user_id>/<country>/<filename>`, so the first path
-- segment is the ownership check.
create policy "Users read own card objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cards'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users upload own card objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cards'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users update own card objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'cards'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'cards'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users delete own card objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cards'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
