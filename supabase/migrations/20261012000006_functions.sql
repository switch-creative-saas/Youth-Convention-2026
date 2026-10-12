-- Server-side business logic. Everything that used to run in AppDataContext and must be
-- atomic or callable without a login lives here.

-- Internal: append to the activity log. Not callable by clients.
create or replace function public.log_activity(
  p_workspace uuid, p_event uuid, p_action public.activity_action, p_target text, p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_log (workspace_id, event_id, actor_id, actor_name, action, target, metadata)
  values (
    p_workspace, p_event, auth.uid(),
    (select coalesce(u.raw_user_meta_data ->> 'name', u.email) from auth.users u where u.id = auth.uid()),
    p_action, p_target, coalesce(p_metadata, '{}'::jsonb)
  );
$$;

------------------------------------------------------------------------------
-- Platform / workspace administration
------------------------------------------------------------------------------

-- Platform admin creates a clean workspace for an existing auth user and makes them its admin.
-- Create the user first (Dashboard > Authentication > Add user), then call this.
create or replace function public.create_workspace(
  p_name text, p_slug text, p_owner_email text, p_code_prefix text default 'MOSYF'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_ws uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can create workspaces.' using errcode = '42501';
  end if;
  select id into v_owner from auth.users where lower(email) = lower(trim(p_owner_email));
  if v_owner is null then
    raise exception 'No user exists with email %. Create the user first.', p_owner_email using errcode = 'P0002';
  end if;

  insert into public.workspaces (name, slug, code_prefix, owner_id, created_by)
  values (trim(p_name), lower(trim(p_slug)), upper(trim(p_code_prefix)), v_owner, auth.uid())
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role, assigned_by)
  values (v_ws, v_owner, 'admin', auth.uid());

  perform public.log_activity(v_ws, null, 'role', 'Workspace created for ' || lower(trim(p_owner_email)));
  return v_ws;
end;
$$;

-- Assign a role inside a workspace to an existing user by email.
-- Workspace admins may assign staff roles; only platform admins may assign 'admin'.
create or replace function public.assign_workspace_role(p_workspace uuid, p_email text, p_role public.workspace_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.has_workspace_role(p_workspace, '{admin}') or (p_role = 'admin' and not public.is_platform_admin()) then
    raise exception 'You do not have permission to assign this role.' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No user exists with email %.', p_email using errcode = 'P0002';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role, assigned_by)
  values (p_workspace, v_user, p_role, auth.uid())
  on conflict do nothing;
  perform public.log_activity(p_workspace, null, 'role', 'Assigned ' || p_role || ' to ' || lower(trim(p_email)));
end;
$$;

-- Make one event the active event of its workspace (deactivates the others).
create or replace function public.activate_event(p_event uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.events where id = p_event;
  if v_ws is null or not public.has_workspace_role(v_ws, '{admin}') then
    raise exception 'Event not found or permission denied.' using errcode = '42501';
  end if;
  update public.events set is_active = false where workspace_id = v_ws and is_active and id <> p_event;
  update public.events set is_active = true where id = p_event;
  perform public.log_activity(v_ws, p_event, 'settings', 'Activated event');
end;
$$;

------------------------------------------------------------------------------
-- Public registration (anon)
------------------------------------------------------------------------------

-- Returns null when the link is not usable.
create or replace function public.get_registration_form(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', l.kind,
    'workspaceId', w.id,
    'workspaceName', w.name,
    'event', jsonb_build_object(
      'id', e.id, 'name', e.name, 'theme', e.theme, 'scripture', e.scripture,
      'venue', e.venue, 'startDate', e.start_date, 'endDate', e.end_date
    ),
    'photoPathPrefix', w.id || '/' || e.id || '/' || l.token || '/',
    'bands', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'color', b.color) order by b.sort_order, b.name)
                       from public.bands b where b.event_id = e.id and b.is_active), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) order by d.sort_order, d.name)
                             from public.departments d where d.event_id = e.id and d.is_active), '[]'::jsonb),
    'churchLocations', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.sort_order, c.name)
                                 from public.church_locations c where c.event_id = e.id and c.is_active), '[]'::jsonb)
  )
  from public.registration_links l
  join public.events e on e.id = l.event_id
  join public.workspaces w on w.id = l.workspace_id
  where l.token = p_token
    and l.is_active
    and w.is_active
    and (l.expires_at is null or l.expires_at > now())
    and (l.max_uses is null or l.uses < l.max_uses);
$$;

-- Storage policy helper: photo path must be {workspace_id}/{event_id}/{valid link token}/{file}.
create or replace function public.can_upload_registration_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select array_length(string_to_array(p_name, '/'), 1) = 4
     and exists (
       select 1
       from public.registration_links l
       join public.workspaces w on w.id = l.workspace_id
       where l.token = split_part(p_name, '/', 3)
         and l.event_id::text = split_part(p_name, '/', 2)
         and l.workspace_id::text = split_part(p_name, '/', 1)
         and l.is_active
         and w.is_active
         and (l.expires_at is null or l.expires_at > now())
         and (l.max_uses is null or l.uses < l.max_uses)
     );
$$;

-- Atomically registers a member or executive through a registration link.
-- Payload keys: fullName, email, phoneNumber, gender, dateOfBirth, address, occupation,
-- emergencyContact, churchLocationId, bandId, departmentIds[], isFirstTimer,
-- wantsPermanentMembership, invitedBy, leadershipRole, photoPath.
create or replace function public.register_attendee(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.registration_links%rowtype;
  v_event public.events%rowtype;
  v_ws public.workspaces%rowtype;
  v_email text := lower(trim(p_payload ->> 'email'));
  v_name text := trim(p_payload ->> 'fullName');
  v_phone text := trim(p_payload ->> 'phoneNumber');
  v_band uuid := nullif(p_payload ->> 'bandId', '')::uuid;
  v_location uuid := nullif(p_payload ->> 'churchLocationId', '')::uuid;
  v_photo text := nullif(p_payload ->> 'photoPath', '');
  v_first_timer boolean := coalesce((p_payload ->> 'isFirstTimer')::boolean, false);
  v_departments uuid[] := array(
    select distinct x::uuid from jsonb_array_elements_text(coalesce(p_payload -> 'departmentIds', '[]'::jsonb)) as x
  );
  v_group uuid;
  v_group_name text;
  v_seq integer;
  v_code text;
  v_attendee public.attendees%rowtype;
begin
  select * into v_link from public.registration_links where token = p_token for update;
  if not found
     or not v_link.is_active
     or (v_link.expires_at is not null and v_link.expires_at <= now())
     or (v_link.max_uses is not null and v_link.uses >= v_link.max_uses) then
    raise exception 'This registration link is invalid or has expired.' using errcode = 'P0001';
  end if;
  select * into v_event from public.events where id = v_link.event_id;
  select * into v_ws from public.workspaces where id = v_link.workspace_id;
  if not v_ws.is_active then
    raise exception 'Registration is closed.' using errcode = 'P0001';
  end if;

  -- Serialise registrations per event so codes, capacity and group balancing are consistent.
  perform pg_advisory_xact_lock(hashtextextended(v_event.id::text, 0));

  if v_name is null or v_name = '' then
    raise exception 'Full name is required.' using errcode = 'P0001';
  end if;
  if v_phone is null or v_phone = '' then
    raise exception 'Phone number is required.' using errcode = 'P0001';
  end if;
  if v_email is null or v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Enter a valid email address.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.attendees a where a.event_id = v_event.id and a.kind = v_link.kind and lower(a.email) = v_email) then
    raise exception 'This email has already been used to register.' using errcode = 'P0001';
  end if;
  if v_event.max_attendees is not null
     and (select count(*) from public.attendees a where a.event_id = v_event.id) >= v_event.max_attendees then
    raise exception 'Registration is full.' using errcode = 'P0001';
  end if;
  if v_link.kind = 'executive' and coalesce(trim(p_payload ->> 'leadershipRole'), '') = '' then
    raise exception 'Leadership role is required.' using errcode = 'P0001';
  end if;
  if v_photo is not null and (
       v_photo not like v_ws.id || '/' || v_event.id || '/' || p_token || '/%'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'attendee-photos' and o.name = v_photo)
     ) then
    raise exception 'The uploaded photo could not be verified.' using errcode = 'P0001';
  end if;
  if v_band is not null and not exists (select 1 from public.bands b where b.id = v_band and b.event_id = v_event.id and b.is_active) then
    raise exception 'Select a valid fellowship band.' using errcode = 'P0001';
  end if;
  if v_location is not null and not exists (select 1 from public.church_locations c where c.id = v_location and c.event_id = v_event.id and c.is_active) then
    raise exception 'Select a valid church branch.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(v_departments) d
    where not exists (select 1 from public.departments x where x.id = d and x.event_id = v_event.id and x.is_active)
  ) then
    raise exception 'Select valid departments.' using errcode = 'P0001';
  end if;

  -- Members with a band go to the least-populated auto-assign group; members without a
  -- band go to the event's for_unbanded group.
  if v_link.kind = 'member' then
    if v_band is null then
      select g.id, g.name into v_group, v_group_name
      from public.convention_groups g
      where g.event_id = v_event.id and g.for_unbanded and g.is_active;
    else
      select g.id, g.name into v_group, v_group_name
      from public.convention_groups g
      left join public.attendees a on a.group_id = g.id and a.band_id is not null
      where g.event_id = v_event.id and g.auto_assign and g.is_active and not g.for_unbanded
      group by g.id, g.name, g.sort_order
      order by count(a.id), g.sort_order, g.name
      limit 1;
    end if;
  end if;

  insert into public.event_code_counters (event_id, kind, last_value)
  values (v_event.id, v_link.kind, 1)
  on conflict (event_id, kind) do update set last_value = public.event_code_counters.last_value + 1
  returning last_value into v_seq;

  v_code := v_ws.code_prefix || '-'
    || case when v_link.kind = 'member' then extract(year from v_event.start_date)::int::text else 'ESC' end
    || '-' || lpad(v_seq::text, greatest(4, length(v_seq::text)), '0');

  insert into public.attendees (
    workspace_id, event_id, kind, code, full_name, email, phone_number, gender, date_of_birth,
    address, occupation, emergency_contact, church_location_id, band_id, group_id, leadership_role,
    photo_path, is_first_timer, wants_permanent_membership, invited_by, registration_link_id
  ) values (
    v_ws.id, v_event.id, v_link.kind, v_code, v_name, v_email, v_phone,
    nullif(p_payload ->> 'gender', ''),
    nullif(p_payload ->> 'dateOfBirth', '')::date,
    nullif(trim(p_payload ->> 'address'), ''),
    nullif(trim(p_payload ->> 'occupation'), ''),
    nullif(trim(p_payload ->> 'emergencyContact'), ''),
    v_location, v_band, v_group,
    nullif(trim(p_payload ->> 'leadershipRole'), ''),
    v_photo,
    v_first_timer,
    case when v_first_timer then (p_payload ->> 'wantsPermanentMembership')::boolean end,
    nullif(trim(p_payload ->> 'invitedBy'), ''),
    v_link.id
  )
  returning * into v_attendee;

  insert into public.attendee_departments (attendee_id, department_id, event_id, workspace_id)
  select v_attendee.id, d, v_event.id, v_ws.id from unnest(v_departments) d;

  update public.registration_links set uses = uses + 1 where id = v_link.id;

  perform public.log_activity(v_ws.id, v_event.id, 'registration',
    'New ' || v_link.kind || ' registered: ' || v_name, jsonb_build_object('attendeeId', v_attendee.id, 'code', v_code));

  return jsonb_build_object(
    'id', v_attendee.id,
    'code', v_attendee.code,
    'kind', v_attendee.kind,
    'statusToken', v_attendee.status_token,
    'groupName', v_group_name,
    'registeredAt', v_attendee.registered_at
  );
end;
$$;

------------------------------------------------------------------------------
-- Public status portal (anon)
------------------------------------------------------------------------------

-- Limited, non-sensitive pass data. No email, phone, address or biometric data.
create or replace function public.get_attendee_status(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', a.kind,
    'code', a.code,
    'fullName', a.full_name,
    'leadershipRole', a.leadership_role,
    'bandName', b.name,
    'groupName', g.name,
    'registeredAt', a.registered_at,
    'biometricVerified', a.biometric_status = 'verified_checked_in',
    'lastVerifiedAt', a.last_verified_at,
    'event', jsonb_build_object('name', e.name, 'theme', e.theme, 'venue', e.venue, 'startDate', e.start_date, 'endDate', e.end_date),
    'workspaceName', w.name,
    'accessClaims', coalesce((select jsonb_object_agg(c.item, c.claimed_at) from public.access_claims c where c.attendee_id = a.id), '{}'::jsonb),
    'attendanceDates', coalesce((select jsonb_agg(distinct t.attendance_date) from public.attendance t where t.attendee_id = a.id), '[]'::jsonb)
  )
  from public.attendees a
  join public.events e on e.id = a.event_id
  join public.workspaces w on w.id = a.workspace_id
  left join public.bands b on b.id = a.band_id
  left join public.convention_groups g on g.id = a.group_id
  where a.status_token = p_token;
$$;

-- Status lookup within one workspace by exact attendee code or exact email.
-- (No partial-name search, so the public cannot enumerate attendees.)
create or replace function public.find_attendee_status(p_workspace_slug text, p_query text)
returns table (full_name text, code text, kind public.registration_kind, status_token text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.full_name, a.code, a.kind, a.status_token
  from public.attendees a
  join public.workspaces w on w.id = a.workspace_id
  join public.events e on e.id = a.event_id
  where w.slug = lower(trim(p_workspace_slug))
    and w.is_active
    and length(trim(p_query)) > 3
    and (upper(a.code) = upper(trim(p_query)) or lower(a.email) = lower(trim(p_query)))
  order by e.is_active desc, a.registered_at desc
  limit 5;
$$;

------------------------------------------------------------------------------
-- Fingerprint (SecuGen Hamster Pro 20) and check-in
------------------------------------------------------------------------------

create or replace function public.enroll_fingerprint(
  p_attendee uuid,
  p_finger public.fingerprint_finger,
  p_template text,
  p_template_format public.fingerprint_template_format default 'ISO19794',
  p_image_quality smallint default null,
  p_nfiq smallint default null,
  p_device uuid default null,
  p_consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendee public.attendees%rowtype;
  v_enrollment uuid;
begin
  select * into v_attendee from public.attendees where id = p_attendee;
  if not found or not public.has_workspace_role(v_attendee.workspace_id, '{verification_operator}') then
    raise exception 'Attendee not found or permission denied.' using errcode = '42501';
  end if;
  if v_attendee.biometric_consent_at is null and not coalesce(p_consent, false) then
    raise exception 'Biometric consent is required before enrolment.' using errcode = 'P0001';
  end if;
  if p_device is not null and not exists (
    select 1 from public.biometric_devices d where d.id = p_device and d.workspace_id = v_attendee.workspace_id
  ) then
    raise exception 'Unknown biometric device.' using errcode = 'P0001';
  end if;

  update public.fingerprint_enrollments
  set revoked_at = now(), revoked_by = auth.uid()
  where attendee_id = p_attendee and finger = p_finger and revoked_at is null;

  insert into public.fingerprint_enrollments (
    workspace_id, event_id, attendee_id, finger, template, template_format, image_quality, nfiq, device_id
  ) values (
    v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_finger, p_template, p_template_format,
    p_image_quality, p_nfiq, p_device
  )
  returning id into v_enrollment;

  update public.attendees
  set biometric_consent_at = coalesce(biometric_consent_at, now()),
      biometric_status = case when biometric_status = 'pending_verification' then 'fingerprint_enrolled'::public.biometric_status else biometric_status end
  where id = p_attendee;

  insert into public.biometric_events (workspace_id, event_id, attendee_id, device_id, enrollment_id, kind, result, message)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_device, v_enrollment, 'enroll', 'success',
          'Fingerprint enrolled (' || p_finger || ')');

  perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'verification',
    v_attendee.full_name || ' fingerprint enrolled', jsonb_build_object('attendeeId', p_attendee, 'finger', p_finger));
  return v_enrollment;
end;
$$;

create or replace function public.revoke_fingerprint(p_enrollment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  v_event uuid;
  v_attendee uuid;
begin
  select workspace_id, event_id, attendee_id into v_ws, v_event, v_attendee
  from public.fingerprint_enrollments where id = p_enrollment and revoked_at is null;
  if v_ws is null or not public.has_workspace_role(v_ws, '{verification_operator}') then
    raise exception 'Enrollment not found or permission denied.' using errcode = '42501';
  end if;
  update public.fingerprint_enrollments set revoked_at = now(), revoked_by = auth.uid() where id = p_enrollment;
  perform public.log_activity(v_ws, v_event, 'verification', 'Fingerprint enrollment revoked',
    jsonb_build_object('attendeeId', v_attendee, 'enrollmentId', p_enrollment));
end;
$$;

-- Records the outcome of a SecuGen capture/match done in the operator's browser.
-- On a successful match, records biometric attendance for today (workspace timezone),
-- or reports a duplicate if the attendee already checked in.
create or replace function public.record_biometric_verification(
  p_attendee uuid,
  p_result public.biometric_event_result,
  p_match_score smallint default null,
  p_threshold smallint default null,
  p_enrollment uuid default null,
  p_device uuid default null,
  p_programme uuid default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendee public.attendees%rowtype;
  v_tz text;
  v_date date;
  v_event_id uuid;
  v_attendance uuid;
begin
  select * into v_attendee from public.attendees where id = p_attendee;
  if not found or not public.has_workspace_role(v_attendee.workspace_id, '{verification_operator}') then
    raise exception 'Attendee not found or permission denied.' using errcode = '42501';
  end if;
  if p_device is not null and not exists (
    select 1 from public.biometric_devices d where d.id = p_device and d.workspace_id = v_attendee.workspace_id
  ) then
    raise exception 'Unknown biometric device.' using errcode = 'P0001';
  end if;
  if p_programme is not null and not exists (
    select 1 from public.programmes p where p.id = p_programme and p.event_id = v_attendee.event_id
  ) then
    raise exception 'Unknown programme.' using errcode = 'P0001';
  end if;

  if p_result <> 'success' then
    insert into public.biometric_events (workspace_id, event_id, attendee_id, device_id, enrollment_id, programme_id, kind, result, match_score, threshold, message)
    values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_device, p_enrollment, p_programme, 'verify', p_result, p_match_score, p_threshold, p_message);
    return jsonb_build_object('ok', false, 'duplicate', false, 'message', coalesce(p_message, 'Fingerprint did not match'));
  end if;

  if p_enrollment is null or not exists (
    select 1 from public.fingerprint_enrollments f
    where f.id = p_enrollment and f.attendee_id = p_attendee and f.revoked_at is null
  ) then
    raise exception 'A matching active enrollment is required for a successful verification.' using errcode = 'P0001';
  end if;
  if p_match_score is null or p_threshold is null or p_match_score < p_threshold then
    raise exception 'Match score is below the required threshold.' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.workspaces where id = v_attendee.workspace_id;
  v_date := (now() at time zone v_tz)::date;

  perform pg_advisory_xact_lock(hashtextextended(p_attendee::text, 1));
  if exists (
    select 1 from public.attendance t
    where t.attendee_id = p_attendee and t.attendance_date = v_date and t.programme_id is not distinct from p_programme
  ) then
    insert into public.biometric_events (workspace_id, event_id, attendee_id, device_id, enrollment_id, programme_id, kind, result, match_score, threshold, message)
    values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_device, p_enrollment, p_programme, 'verify', 'duplicate', p_match_score, p_threshold,
            'Duplicate attendance attempt detected');
    perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'verification', v_attendee.full_name || ' duplicate biometric attempt');
    return jsonb_build_object('ok', false, 'duplicate', true, 'message', 'Duplicate attendance attempt detected');
  end if;

  insert into public.biometric_events (workspace_id, event_id, attendee_id, device_id, enrollment_id, programme_id, kind, result, match_score, threshold, message)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_device, p_enrollment, p_programme, 'verify', 'success', p_match_score, p_threshold,
          coalesce(p_message, 'Fingerprint verified and checked in'))
  returning id into v_event_id;

  insert into public.attendance (workspace_id, event_id, attendee_id, programme_id, attendance_date, method, biometric_event_id)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_programme, v_date, 'biometric', v_event_id)
  returning id into v_attendance;

  update public.attendees
  set biometric_status = 'verified_checked_in', last_verified_at = now()
  where id = p_attendee;

  perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'verification', v_attendee.full_name || ' biometric verified');
  return jsonb_build_object('ok', true, 'duplicate', false, 'message', 'Biometric verified and attendance recorded', 'attendanceId', v_attendance);
end;
$$;

-- Food / souvenir / entry / activity, once per attendee, after biometric verification.
create or replace function public.claim_access_item(p_attendee uuid, p_item public.access_item)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendee public.attendees%rowtype;
  v_role public.workspace_role := case p_item
    when 'food' then 'food_distributor'
    when 'souvenir' then 'souvenir_distributor'
    when 'activity' then 'activity_coordinator'
    else 'verification_operator'
  end;
  v_label text := initcap(p_item::text);
  v_id uuid;
begin
  select * into v_attendee from public.attendees where id = p_attendee;
  if not found or not public.has_workspace_role(v_attendee.workspace_id, array[v_role]) then
    raise exception 'Attendee not found or permission denied.' using errcode = '42501';
  end if;
  if v_attendee.biometric_status <> 'verified_checked_in' then
    return jsonb_build_object('ok', false, 'message', 'Biometric verification required before access is granted');
  end if;

  insert into public.access_claims (workspace_id, event_id, attendee_id, item)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_item)
  on conflict (attendee_id, item) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'message', v_label || ' Already Collected');
  end if;
  perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'access', v_attendee.full_name || ' ' || p_item || ' access granted');
  return jsonb_build_object('ok', true, 'message', v_label || ' access granted');
end;
$$;

-- Data-protection clean-up: delete every fingerprint template for an event (e.g. after it ends).
create or replace function public.purge_event_fingerprints(p_event uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
  v_count integer;
begin
  select workspace_id into v_ws from public.events where id = p_event;
  if v_ws is null or not public.has_workspace_role(v_ws, '{admin}') then
    raise exception 'Event not found or permission denied.' using errcode = '42501';
  end if;
  delete from public.fingerprint_enrollments where event_id = p_event;
  get diagnostics v_count = row_count;
  perform public.log_activity(v_ws, p_event, 'verification', 'Purged ' || v_count || ' fingerprint templates');
  return v_count;
end;
$$;

------------------------------------------------------------------------------
-- Execute grants (Supabase grants new functions to anon/authenticated by default)
------------------------------------------------------------------------------

revoke execute on function public.log_activity(uuid, uuid, public.activity_action, text, jsonb) from public, anon, authenticated;

revoke execute on function public.create_workspace(text, text, text, text) from public, anon;
revoke execute on function public.assign_workspace_role(uuid, text, public.workspace_role) from public, anon;
revoke execute on function public.activate_event(uuid) from public, anon;
revoke execute on function public.enroll_fingerprint(uuid, public.fingerprint_finger, text, public.fingerprint_template_format, smallint, smallint, uuid, boolean) from public, anon;
revoke execute on function public.revoke_fingerprint(uuid) from public, anon;
revoke execute on function public.record_biometric_verification(uuid, public.biometric_event_result, smallint, smallint, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.claim_access_item(uuid, public.access_item) from public, anon;
revoke execute on function public.purge_event_fingerprints(uuid) from public, anon;

grant execute on function public.create_workspace(text, text, text, text) to authenticated;
grant execute on function public.assign_workspace_role(uuid, text, public.workspace_role) to authenticated;
grant execute on function public.activate_event(uuid) to authenticated;
grant execute on function public.enroll_fingerprint(uuid, public.fingerprint_finger, text, public.fingerprint_template_format, smallint, smallint, uuid, boolean) to authenticated;
grant execute on function public.revoke_fingerprint(uuid) to authenticated;
grant execute on function public.record_biometric_verification(uuid, public.biometric_event_result, smallint, smallint, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.claim_access_item(uuid, public.access_item) to authenticated;
grant execute on function public.purge_event_fingerprints(uuid) to authenticated;

-- Public (no login) entry points.
grant execute on function public.get_registration_form(text) to anon, authenticated;
grant execute on function public.can_upload_registration_photo(text) to anon, authenticated;
grant execute on function public.register_attendee(text, jsonb) to anon, authenticated;
grant execute on function public.get_attendee_status(text) to anon, authenticated;
grant execute on function public.find_attendee_status(text, text) to anon, authenticated;
