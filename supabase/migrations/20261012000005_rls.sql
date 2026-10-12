-- Row-level security. Every table is scoped to a workspace; anon has no table access
-- (public flows go through SECURITY DEFINER functions in the next migration).

do $$
declare t text;
begin
  foreach t in array array[
    'platform_admins', 'workspaces', 'workspace_members', 'events', 'bands', 'departments',
    'convention_groups', 'church_locations', 'programmes', 'registration_links', 'event_code_counters',
    'attendees', 'attendee_departments', 'biometric_devices', 'fingerprint_enrollments',
    'biometric_events', 'attendance', 'access_claims', 'activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- platform_admins: a user can see whether they are one; managed only via SQL/dashboard.
create policy "platform_admins_select_self" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- workspaces
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated using (public.has_workspace_role(id));
create policy "workspaces_insert_platform" on public.workspaces
  for insert to authenticated with check (public.is_platform_admin());
create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, '{admin}'))
  with check (public.has_workspace_role(id, '{admin}'));
create policy "workspaces_delete_platform" on public.workspaces
  for delete to authenticated using (public.is_platform_admin());

-- workspace_members: only platform admins grant or remove the 'admin' role.
create policy "workspace_members_select_member" on public.workspace_members
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "workspace_members_insert_admin" on public.workspace_members
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, '{admin}') and (role <> 'admin' or public.is_platform_admin()));
create policy "workspace_members_delete_admin" on public.workspace_members
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, '{admin}') and (role <> 'admin' or public.is_platform_admin()));

-- Event configuration: readable by any workspace member, writable by admins.
do $$
declare t text;
begin
  foreach t in array array['events', 'bands', 'departments', 'convention_groups', 'church_locations', 'programmes'] loop
    execute format('create policy "%1$s_select_member" on public.%1$I for select to authenticated using (public.has_workspace_role(workspace_id))', t);
    execute format('create policy "%1$s_insert_admin" on public.%1$I for insert to authenticated with check (public.has_workspace_role(workspace_id, ''{admin}''))', t);
    execute format('create policy "%1$s_update_admin" on public.%1$I for update to authenticated using (public.has_workspace_role(workspace_id, ''{admin}'')) with check (public.has_workspace_role(workspace_id, ''{admin}''))', t);
    execute format('create policy "%1$s_delete_admin" on public.%1$I for delete to authenticated using (public.has_workspace_role(workspace_id, ''{admin}''))', t);
  end loop;
end;
$$;

-- Registration links: admins and the registration desk.
create policy "registration_links_select_member" on public.registration_links
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "registration_links_insert_desk" on public.registration_links
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{registration_desk}'));
create policy "registration_links_update_desk" on public.registration_links
  for update to authenticated
  using (public.has_workspace_role(workspace_id, '{registration_desk}'))
  with check (public.has_workspace_role(workspace_id, '{registration_desk}'));
create policy "registration_links_delete_admin" on public.registration_links
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

-- event_code_counters: written only by register_attendee(); readable by admins.
create policy "event_code_counters_select_admin" on public.event_code_counters
  for select to authenticated using (
    exists (select 1 from public.events e where e.id = event_id and public.has_workspace_role(e.workspace_id, '{admin}'))
  );

-- Attendees
create policy "attendees_select_member" on public.attendees
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "attendees_insert_desk" on public.attendees
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{registration_desk}'));
create policy "attendees_update_desk" on public.attendees
  for update to authenticated
  using (public.has_workspace_role(workspace_id, '{registration_desk}'))
  with check (public.has_workspace_role(workspace_id, '{registration_desk}'));
create policy "attendees_delete_admin" on public.attendees
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

create policy "attendee_departments_select_member" on public.attendee_departments
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "attendee_departments_insert_desk" on public.attendee_departments
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{registration_desk}'));
create policy "attendee_departments_delete_desk" on public.attendee_departments
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{registration_desk}'));

-- Biometric devices: operators update heartbeat/status, admins manage the list.
create policy "biometric_devices_select_member" on public.biometric_devices
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "biometric_devices_insert_admin" on public.biometric_devices
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{admin}'));
create policy "biometric_devices_update_operator" on public.biometric_devices
  for update to authenticated
  using (public.has_workspace_role(workspace_id, '{verification_operator}'))
  with check (public.has_workspace_role(workspace_id, '{verification_operator}'));
create policy "biometric_devices_delete_admin" on public.biometric_devices
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

-- Fingerprint templates: readable only by admins and verification operators (needed for
-- 1:1 matching through SGIMatchScore). Writes only through enroll/revoke functions.
create policy "fingerprint_enrollments_select_operator" on public.fingerprint_enrollments
  for select to authenticated using (public.has_workspace_role(workspace_id, '{verification_operator}'));

-- Biometric events: readable by members; written by functions.
create policy "biometric_events_select_member" on public.biometric_events
  for select to authenticated using (public.has_workspace_role(workspace_id));

-- Attendance: manual / QR check-ins may be inserted directly; biometric ones only via
-- record_biometric_verification().
create policy "attendance_select_member" on public.attendance
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "attendance_insert_non_biometric" on public.attendance
  for insert to authenticated
  with check (
    method <> 'biometric'
    and biometric_event_id is null
    and recorded_by = (select auth.uid())
    and public.has_workspace_role(workspace_id, '{registration_desk,verification_operator}')
  );
create policy "attendance_delete_admin" on public.attendance
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

-- Access claims: written by claim_access_item(); admins can undo.
create policy "access_claims_select_member" on public.access_claims
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "access_claims_delete_admin" on public.access_claims
  for delete to authenticated using (public.has_workspace_role(workspace_id, '{admin}'));

-- Activity log: members read; members may append entries as themselves.
create policy "activity_log_select_member" on public.activity_log
  for select to authenticated using (public.has_workspace_role(workspace_id));
create policy "activity_log_insert_self" on public.activity_log
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and public.has_workspace_role(workspace_id));
