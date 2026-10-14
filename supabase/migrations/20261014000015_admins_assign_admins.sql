-- Workspace admins may now make other people (e.g. executives) full admins of their own workspace.
-- The workspace owner (the admin the platform owner set up) can only be removed by the platform owner,
-- and only the platform owner can change who the owner is.

-- Registration links: admins, the registration desk and link generators.
drop policy "registration_links_insert_desk" on public.registration_links;
drop policy "registration_links_update_desk" on public.registration_links;
create policy "registration_links_insert_desk" on public.registration_links
  for insert to authenticated with check (public.has_workspace_role(workspace_id, '{registration_desk,link_manager}'));
create policy "registration_links_update_desk" on public.registration_links
  for update to authenticated
  using (public.has_workspace_role(workspace_id, '{registration_desk,link_manager}'))
  with check (public.has_workspace_role(workspace_id, '{registration_desk,link_manager}'));

-- workspace_members
drop policy "workspace_members_insert_admin" on public.workspace_members;
drop policy "workspace_members_delete_admin" on public.workspace_members;
create policy "workspace_members_insert_admin" on public.workspace_members
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, '{admin}'));
create policy "workspace_members_delete_admin" on public.workspace_members
  for delete to authenticated
  using (
    public.has_workspace_role(workspace_id, '{admin}')
    and (
      role <> 'admin'
      or public.is_platform_admin()
      or user_id is distinct from (select w.owner_id from public.workspaces w where w.id = workspace_id)
    )
  );

create or replace function public.assign_workspace_role(p_workspace uuid, p_email text, p_role public.workspace_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.has_workspace_role(p_workspace, '{admin}') then
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

-- Co-admins may edit workspace settings but not take over ownership.
create or replace function public.protect_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id and not public.is_platform_admin() then
    raise exception 'Only the platform owner can change the workspace owner.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_workspace_owner() from public, anon, authenticated;
create trigger workspaces_protect_owner before update on public.workspaces
  for each row execute function public.protect_workspace_owner();
