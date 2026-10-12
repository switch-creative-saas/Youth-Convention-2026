-- Support for the frontend: workspace slug / departments / photo in public payloads,
-- staff listing with emails, public-read photos, and realtime.

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
    'workspaceSlug', w.slug,
    'codePrefix', w.code_prefix,
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
                                 from public.church_locations c where c.event_id = e.id and c.is_active), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'forUnbanded', g.for_unbanded) order by g.sort_order, g.name)
                        from public.convention_groups g where g.event_id = e.id and g.is_active and (g.auto_assign or g.for_unbanded)), '[]'::jsonb)
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

-- Staff of a workspace with their emails (auth.users is not readable by clients).
create or replace function public.list_workspace_members(p_workspace uuid)
returns table (user_id uuid, email text, name text, role public.workspace_role, assigned_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, coalesce(u.raw_user_meta_data ->> 'name', u.email)::text, m.role, m.assigned_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = p_workspace
    and public.has_workspace_role(p_workspace)
  order by m.assigned_at;
$$;
revoke execute on function public.list_workspace_members(uuid) from public, anon;
grant execute on function public.list_workspace_members(uuid) to authenticated;

-- Photos are served by unguessable public URL ({workspace}/{event}/{link token}/{uuid}.jpg)
-- so tags, status passes and confirmation emails can show them without signed URLs.
-- Listing still requires the select policy (workspace members only).
update storage.buckets set public = true where id = 'attendee-photos';

-- Live dashboard updates (RLS still applies to realtime).
do $$
declare t text;
begin
  foreach t in array array['attendees', 'attendance', 'activity_log', 'biometric_events', 'access_claims', 'registration_links', 'biometric_devices'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
