-- Attendees: members and executives in one table (neither has a login).
-- Bands, groups, locations and departments are foreign keys to the managed lists.

create type public.biometric_status as enum (
  'pending_verification',
  'fingerprint_enrolled',
  'verified_checked_in',
  'duplicate_attempt'
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null,
  kind public.registration_kind not null,
  code text not null,
  status_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null check (email ~ '^\S+@\S+\.\S+$'),
  phone_number text not null,
  gender text check (gender in ('Male', 'Female')),
  date_of_birth date,
  address text,
  occupation text,
  emergency_contact text,
  church_location_id uuid,
  band_id uuid,
  group_id uuid,
  leadership_role text,
  -- Storage object path in the attendee-photos bucket: {workspace_id}/{event_id}/{link_token}/{file}
  photo_path text,
  is_first_timer boolean not null default false,
  wants_permanent_membership boolean,
  invited_by text,
  first_timer_followed_up boolean not null default false,
  biometric_status public.biometric_status not null default 'pending_verification',
  biometric_consent_at timestamptz,
  last_verified_at timestamptz,
  registration_link_id uuid references public.registration_links (id) on delete set null,
  registered_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, workspace_id) references public.events (id, workspace_id) on delete cascade,
  foreign key (church_location_id, event_id) references public.church_locations (id, event_id) on delete restrict,
  foreign key (band_id, event_id) references public.bands (id, event_id) on delete restrict,
  foreign key (group_id, event_id) references public.convention_groups (id, event_id) on delete restrict,
  unique (event_id, kind, code),
  unique (id, event_id)
);
create unique index attendees_event_kind_email_key on public.attendees (event_id, kind, lower(email));
create index attendees_workspace_id_idx on public.attendees (workspace_id);
create index attendees_event_id_workspace_id_idx on public.attendees (event_id, workspace_id);
create index attendees_church_location_idx on public.attendees (church_location_id, event_id);
create index attendees_band_idx on public.attendees (band_id, event_id);
create index attendees_group_idx on public.attendees (group_id, event_id);
create index attendees_registration_link_id_idx on public.attendees (registration_link_id);
create index attendees_created_by_idx on public.attendees (created_by);
create index attendees_full_name_idx on public.attendees (event_id, lower(full_name));
create trigger attendees_set_updated_at before update on public.attendees
  for each row execute function public.set_updated_at();

create table public.attendee_departments (
  attendee_id uuid not null,
  department_id uuid not null,
  event_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (attendee_id, department_id),
  foreign key (attendee_id, event_id) references public.attendees (id, event_id) on delete cascade,
  foreign key (department_id, event_id) references public.departments (id, event_id) on delete restrict
);
create index attendee_departments_department_idx on public.attendee_departments (department_id, event_id);
create index attendee_departments_attendee_event_idx on public.attendee_departments (attendee_id, event_id);
create index attendee_departments_workspace_id_idx on public.attendee_departments (workspace_id);
