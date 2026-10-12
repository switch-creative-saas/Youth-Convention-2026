-- Tenancy: every admin gets an isolated workspace (their own clean dashboard).
-- Platform admins (the system owner) create workspaces and assign workspace admins.

create extension if not exists pgcrypto with schema extensions;

create type public.workspace_role as enum (
  'admin',
  'registration_desk',
  'verification_operator',
  'food_distributor',
  'souvenir_distributor',
  'activity_coordinator',
  'viewer'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  code_prefix text not null default 'MOSYF' check (code_prefix ~ '^[A-Z0-9]{2,10}$'),
  timezone text not null default 'Africa/Lagos',
  owner_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_id_idx on public.workspaces (owner_id);
create index workspaces_created_by_idx on public.workspaces (created_by);
create trigger workspaces_set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (workspace_id, user_id, role)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_assigned_by_idx on public.workspace_members (assigned_by);

-- RLS helpers. SECURITY DEFINER so policies can consult membership without recursion.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

-- True when the caller belongs to the workspace. When roles is given, the caller
-- must hold one of them; 'admin' implies every role. Platform admins pass everything.
create or replace function public.has_workspace_role(ws uuid, roles public.workspace_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and (roles is null or m.role = 'admin' or m.role = any (roles))
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
