-- Events and the per-event configuration admins manage in Convention Settings.
-- Child tables carry (event_id, workspace_id) with a composite FK so a row can never
-- point at another workspace's event.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  theme text,
  scripture text,
  description text,
  venue text,
  start_date date not null,
  end_date date not null,
  max_attendees integer check (max_attendees is null or max_attendees > 0),
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (id, workspace_id)
);
create index events_workspace_id_idx on public.events (workspace_id);
create index events_created_by_idx on public.events (created_by);
create unique index events_one_active_per_workspace on public.events (workspace_id) where is_active;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Managed lists (bands, departments, convention groups, church locations).
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  color text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  unique (id, event_id)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  unique (id, event_id)
);

-- auto_assign: included in least-populated balancing for attendees with a band.
-- for_unbanded: the group attendees without a band are placed in (one per event).
create table public.convention_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  color text,
  auto_assign boolean not null default true,
  for_unbanded boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  unique (id, event_id)
);
create unique index convention_groups_one_unbanded_per_event on public.convention_groups (event_id) where for_unbanded;

create table public.church_locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  unique (id, event_id)
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  unique (id, event_id)
);

create type public.registration_kind as enum ('member', 'executive');

create table public.registration_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  kind public.registration_kind not null,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  label text,
  uses integer not null default 0 check (uses >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade
);

-- Per-event counters for human-readable codes (PREFIX-2026-0001 / PREFIX-ESC-0001).
create table public.event_code_counters (
  event_id uuid not null references public.events (id) on delete cascade,
  kind public.registration_kind not null,
  last_value integer not null default 0,
  primary key (event_id, kind)
);

do $$
declare t text;
begin
  foreach t in array array['bands', 'departments', 'convention_groups', 'church_locations', 'programmes', 'registration_links'] loop
    execute format('create index %1$s_workspace_id_idx on public.%1$s (workspace_id)', t);
    execute format('create index %1$s_event_id_workspace_id_idx on public.%1$s (event_id, workspace_id)', t);
    execute format('create index %1$s_created_by_idx on public.%1$s (created_by)', t);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['bands', 'departments', 'convention_groups', 'church_locations'] loop
    execute format('create unique index %1$s_event_name_key on public.%1$s (event_id, lower(name))', t);
  end loop;
end;
$$;
