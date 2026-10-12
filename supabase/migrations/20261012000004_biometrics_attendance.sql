-- Fingerprint scanner (SecuGen Hamster Pro 20 via SecuGen WebAPI), attendance,
-- access claims and the activity log.
--
-- Flow: the operator's browser captures through the local SecuGen WebAPI service
-- (SGIFPCapture) and matches 1:1 with SGIMatchScore against the stored template.
-- Raw fingerprint images are never stored; only minutiae templates.

create type public.fingerprint_finger as enum (
  'right_thumb', 'right_index', 'right_middle', 'right_ring', 'right_little',
  'left_thumb', 'left_index', 'left_middle', 'left_ring', 'left_little'
);
create type public.fingerprint_template_format as enum ('ISO19794', 'ANSI378', 'SG400');
create type public.device_status as enum ('online', 'offline', 'connecting', 'error');
create type public.biometric_event_kind as enum ('capture', 'enroll', 'verify', 'identify');
create type public.biometric_event_result as enum ('success', 'no_match', 'duplicate', 'low_quality', 'device_error', 'cancelled');
create type public.verification_method as enum ('biometric', 'qr_code', 'manual');
create type public.access_item as enum ('food', 'souvenir', 'entry', 'activity');
create type public.activity_action as enum ('attendance', 'registration', 'verification', 'access', 'role', 'settings');

create table public.biometric_devices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  vendor text not null default 'SecuGen',
  model text not null default 'Hamster Pro 20',
  serial_number text,
  connection_type text not null default 'SecuGen WebAPI',
  service_url text not null default 'https://localhost:8443',
  status public.device_status not null default 'offline',
  last_heartbeat_at timestamptz,
  last_seen_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, serial_number)
);
create index biometric_devices_last_seen_by_idx on public.biometric_devices (last_seen_by);
create index biometric_devices_created_by_idx on public.biometric_devices (created_by);
create trigger biometric_devices_set_updated_at before update on public.biometric_devices
  for each row execute function public.set_updated_at();

create table public.fingerprint_enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid not null,
  attendee_id uuid not null,
  finger public.fingerprint_finger not null,
  -- Base64 template exactly as returned by SGIFPCapture (TemplateBase64).
  template text not null check (length(template) between 100 and 8000),
  template_format public.fingerprint_template_format not null default 'ISO19794',
  image_quality smallint check (image_quality between 0 and 100),
  nfiq smallint check (nfiq between 1 and 5),
  device_id uuid references public.biometric_devices (id) on delete set null,
  enrolled_by uuid references auth.users (id) on delete set null default auth.uid(),
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  foreign key (attendee_id, event_id) references public.attendees (id, event_id) on delete cascade
);
create unique index fingerprint_enrollments_active_finger_key
  on public.fingerprint_enrollments (attendee_id, finger) where revoked_at is null;
create index fingerprint_enrollments_attendee_event_idx on public.fingerprint_enrollments (attendee_id, event_id);
create index fingerprint_enrollments_workspace_id_idx on public.fingerprint_enrollments (workspace_id);
create index fingerprint_enrollments_event_id_idx on public.fingerprint_enrollments (event_id);
create index fingerprint_enrollments_device_id_idx on public.fingerprint_enrollments (device_id);
create index fingerprint_enrollments_enrolled_by_idx on public.fingerprint_enrollments (enrolled_by);
create index fingerprint_enrollments_revoked_by_idx on public.fingerprint_enrollments (revoked_by);

create table public.biometric_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  attendee_id uuid references public.attendees (id) on delete set null,
  device_id uuid references public.biometric_devices (id) on delete set null,
  enrollment_id uuid references public.fingerprint_enrollments (id) on delete set null,
  programme_id uuid references public.programmes (id) on delete set null,
  operator_id uuid references auth.users (id) on delete set null default auth.uid(),
  kind public.biometric_event_kind not null,
  result public.biometric_event_result not null,
  -- SGIMatchScore returns 0-199; threshold is the score the client required.
  match_score smallint check (match_score between 0 and 199),
  threshold smallint check (threshold between 0 and 199),
  message text,
  created_at timestamptz not null default now()
);
create index biometric_events_workspace_created_idx on public.biometric_events (workspace_id, created_at desc);
create index biometric_events_event_id_idx on public.biometric_events (event_id);
create index biometric_events_attendee_id_idx on public.biometric_events (attendee_id);
create index biometric_events_device_id_idx on public.biometric_events (device_id);
create index biometric_events_enrollment_id_idx on public.biometric_events (enrollment_id);
create index biometric_events_programme_id_idx on public.biometric_events (programme_id);
create index biometric_events_operator_id_idx on public.biometric_events (operator_id);

-- One check-in per attendee per day (and per programme when one is given).
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid not null,
  attendee_id uuid not null,
  programme_id uuid references public.programmes (id) on delete set null,
  attendance_date date not null,
  checked_in_at timestamptz not null default now(),
  method public.verification_method not null,
  biometric_event_id uuid references public.biometric_events (id) on delete set null,
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (attendee_id, event_id) references public.attendees (id, event_id) on delete cascade,
  constraint attendance_once_per_day unique nulls not distinct (attendee_id, attendance_date, programme_id)
);
create index attendance_workspace_id_idx on public.attendance (workspace_id);
create index attendance_event_date_idx on public.attendance (event_id, attendance_date);
create index attendance_attendee_event_idx on public.attendance (attendee_id, event_id);
create index attendance_programme_id_idx on public.attendance (programme_id);
create index attendance_biometric_event_id_idx on public.attendance (biometric_event_id);
create index attendance_recorded_by_idx on public.attendance (recorded_by);

create table public.access_claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid not null,
  attendee_id uuid not null,
  item public.access_item not null,
  claimed_at timestamptz not null default now(),
  claimed_by uuid references auth.users (id) on delete set null default auth.uid(),
  foreign key (attendee_id, event_id) references public.attendees (id, event_id) on delete cascade,
  unique (attendee_id, item)
);
create index access_claims_workspace_id_idx on public.access_claims (workspace_id);
create index access_claims_attendee_event_idx on public.access_claims (attendee_id, event_id);
create index access_claims_event_item_idx on public.access_claims (event_id, item);
create index access_claims_claimed_by_idx on public.access_claims (claimed_by);

create table public.activity_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null default auth.uid(),
  actor_name text,
  action public.activity_action not null,
  target text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_workspace_created_idx on public.activity_log (workspace_id, created_at desc);
create index activity_log_event_id_idx on public.activity_log (event_id);
create index activity_log_actor_id_idx on public.activity_log (actor_id);
