-- Leadership roles (President, Secretary, ...) become an admin-managed list per event,
-- like bands and departments. attendees.leadership_role keeps the role name as text so
-- registered executives are unaffected if a role is later renamed or removed.

create table public.leadership_roles (
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
create unique index leadership_roles_event_name_key on public.leadership_roles (event_id, lower(name));
create index leadership_roles_workspace_id_idx on public.leadership_roles (workspace_id);
create index leadership_roles_event_id_workspace_id_idx on public.leadership_roles (event_id, workspace_id);
create index leadership_roles_created_by_idx on public.leadership_roles (created_by);
create trigger leadership_roles_set_updated_at before update on public.leadership_roles
  for each row execute function public.set_updated_at();

alter table public.leadership_roles enable row level security;
revoke all on public.leadership_roles from anon;
create policy "leadership_roles_select_member" on public.leadership_roles
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "leadership_roles_insert_admin" on public.leadership_roles
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{admin}'));
create policy "leadership_roles_update_admin" on public.leadership_roles
  for update to authenticated
  using (public.has_workspace_role(workspace_id, '{admin}'))
  with check (public.has_workspace_role(workspace_id, '{admin}'));
create policy "leadership_roles_delete_admin" on public.leadership_roles
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

-- Executives must pick one of the event's active roles once the admin has set any up.
create or replace function public.validate_leadership_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'executive'
     or new.leadership_role is null
     or (tg_op = 'UPDATE' and new.leadership_role is not distinct from old.leadership_role) then
    return new;
  end if;
  if exists (select 1 from public.leadership_roles r where r.event_id = new.event_id and r.is_active)
     and not exists (
       select 1 from public.leadership_roles r
       where r.event_id = new.event_id and r.is_active and lower(r.name) = lower(trim(new.leadership_role))
     ) then
    raise exception 'Select a valid leadership role.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.validate_leadership_role() from public, anon, authenticated;

create trigger attendees_validate_leadership_role
  before insert or update of leadership_role on public.attendees
  for each row execute function public.validate_leadership_role();

-- Registration form now includes the event's leadership roles.
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
                        from public.convention_groups g where g.event_id = e.id and g.is_active and (g.auto_assign or g.for_unbanded)), '[]'::jsonb),
    'leadershipRoles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order, r.name)
                                 from public.leadership_roles r where r.event_id = e.id and r.is_active), '[]'::jsonb)
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
