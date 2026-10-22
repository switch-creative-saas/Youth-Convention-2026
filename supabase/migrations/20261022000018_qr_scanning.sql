-- QR scanning (tablet camera) as an alternative to the fingerprint scanner.
-- 1. qr_check_in(): records attendance from a scanned tag QR (the attendee code), once per day/session.
-- 2. claim_access_item(): food / souvenir / activity now also accept attendees who have checked in
--    (by QR or manually), not only those verified by fingerprint.

create or replace function public.qr_check_in(p_attendee uuid, p_date date, p_programme uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendee public.attendees%rowtype;
  v_id uuid;
  v_existing timestamptz;
begin
  select * into v_attendee from public.attendees where id = p_attendee;
  if not found or not public.has_workspace_role(v_attendee.workspace_id, '{registration_desk,verification_operator}') then
    raise exception 'Attendee not found or permission denied.' using errcode = '42501';
  end if;
  if p_programme is not null and not exists (
    select 1 from public.programmes p where p.id = p_programme and p.event_id = v_attendee.event_id
  ) then
    raise exception 'Select a session from this convention.' using errcode = 'P0001';
  end if;

  insert into public.attendance (workspace_id, event_id, attendee_id, attendance_date, method, programme_id, recorded_by)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_date, 'qr_code', p_programme, auth.uid())
  on conflict on constraint attendance_once_per_day do nothing
  returning id into v_id;

  if v_id is null then
    select checked_in_at into v_existing from public.attendance
    where attendee_id = p_attendee and attendance_date = p_date and programme_id is not distinct from p_programme;
    return jsonb_build_object('ok', false, 'already', true, 'message', 'Already checked in', 'checkedInAt', v_existing);
  end if;

  update public.attendees set last_verified_at = now() where id = p_attendee;
  perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'attendance', v_attendee.full_name || ' checked in by QR');
  return jsonb_build_object('ok', true, 'already', false, 'message', 'Checked in');
end;
$$;
revoke execute on function public.qr_check_in(uuid, date, uuid) from public, anon;
grant execute on function public.qr_check_in(uuid, date, uuid) to authenticated;

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
  if v_attendee.biometric_status <> 'verified_checked_in'
     and not exists (select 1 from public.attendance t where t.attendee_id = p_attendee) then
    return jsonb_build_object('ok', false, 'message', 'Not checked in yet. Check them in first.');
  end if;

  insert into public.access_claims (workspace_id, event_id, attendee_id, item)
  values (v_attendee.workspace_id, v_attendee.event_id, p_attendee, p_item)
  on conflict (attendee_id, item) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'message', v_label || ' already collected');
  end if;
  perform public.log_activity(v_attendee.workspace_id, v_attendee.event_id, 'access', v_attendee.full_name || ' ' || p_item || ' access granted');
  return jsonb_build_object('ok', true, 'message', v_label || ' access granted');
end;
$$;
