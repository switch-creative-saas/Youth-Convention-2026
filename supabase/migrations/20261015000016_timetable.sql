-- Convention timetable for attendees: shown on the status page, on a public printable page
-- (/convention/timetable/{workspace slug}) and in emails.

-- Set when an attendee has been emailed the timetable (in the confirmation email or the
-- "email the timetable" send for people who registered before it was added).
alter table public.attendees add column timetable_email_sent_at timestamptz;

-- Active sessions of an event, in running order.
create or replace function public.event_programmes_json(p_event uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'title', p.title, 'description', p.description, 'date', p.date,
           'startTime', to_char(p.start_time, 'HH24:MI'), 'endTime', to_char(p.end_time, 'HH24:MI'),
           'location', p.location)
         order by p.date, p.start_time, p.sort_order, p.title), '[]'::jsonb)
  from public.programmes p
  where p.event_id = p_event and p.is_active;
$$;
revoke execute on function public.event_programmes_json(uuid) from public, anon, authenticated;

-- Public timetable of a workspace's active convention. Returns null when there is none.
create or replace function public.get_event_timetable(p_workspace_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'workspaceName', w.name,
    'workspaceSlug', w.slug,
    'event', jsonb_build_object('name', e.name, 'theme', e.theme, 'scripture', e.scripture, 'venue', e.venue, 'startDate', e.start_date, 'endDate', e.end_date),
    'programmes', public.event_programmes_json(e.id)
  )
  from public.workspaces w
  join public.events e on e.workspace_id = w.id and e.is_active
  where w.slug = lower(trim(p_workspace_slug)) and w.is_active
  limit 1;
$$;
revoke execute on function public.get_event_timetable(text) from public;
grant execute on function public.get_event_timetable(text) to anon, authenticated;

-- Status page payload now includes the timetable.
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
    'departments', coalesce((select jsonb_agg(d.name order by d.sort_order, d.name)
                             from public.attendee_departments ad join public.departments d on d.id = ad.department_id
                             where ad.attendee_id = a.id), '[]'::jsonb),
    'photoPath', a.photo_path,
    'registeredAt', a.registered_at,
    'biometricVerified', a.biometric_status = 'verified_checked_in',
    'lastVerifiedAt', a.last_verified_at,
    'event', jsonb_build_object('name', e.name, 'theme', e.theme, 'venue', e.venue, 'startDate', e.start_date, 'endDate', e.end_date),
    'workspaceName', w.name,
    'workspaceSlug', w.slug,
    'programmes', public.event_programmes_json(e.id),
    'accessClaims', coalesce((select jsonb_object_agg(c.item, c.claimed_at) from public.access_claims c where c.attendee_id = a.id), '{}'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('date', t.attendance_date, 'checkedInAt', t.checked_in_at, 'programme', p.title) order by t.checked_in_at)
                            from public.attendance t left join public.programmes p on p.id = t.programme_id
                            where t.attendee_id = a.id), '[]'::jsonb)
  )
  from public.attendees a
  join public.events e on e.id = a.event_id
  join public.workspaces w on w.id = a.workspace_id
  left join public.bands b on b.id = a.band_id
  left join public.convention_groups g on g.id = a.group_id
  where a.status_token = p_token;
$$;
