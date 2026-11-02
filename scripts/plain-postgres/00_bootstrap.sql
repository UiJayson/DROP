-- Lets the Supabase migrations run on a plain Postgres (no GoTrue).
-- Supabase already has these roles and the auth schema, so this file is not a migration.

create schema if not exists extensions;
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant anon, authenticated, service_role to postgres;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone text unique,
  phone_confirmed_at timestamptz,
  confirmation_token text default '',
  recovery_token text default '',
  email_change text default '',
  email_change_token_new text default '',
  email_change_token_current text default '',
  phone_change text default '',
  phone_change_token text default '',
  reauthentication_token text default '',
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean default false,
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'role', '');
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
