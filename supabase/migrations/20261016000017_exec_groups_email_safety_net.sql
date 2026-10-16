-- 1. Executives are placed in a convention group the same way members are (shown on their tag).
-- 2. Server-side safety net for confirmation emails: the browser sends the email right after
--    registration, but if that never happens (page closed, phone too slow) a cron job asks the
--    send-registration-email function to send it a few minutes later (up to 3 attempts).

alter table public.attendees add column confirmation_email_attempts smallint not null default 0;
-- People who registered before this safety net existed are left for admins to resend by hand.
update public.attendees set confirmation_email_attempts = 3 where confirmation_email_sent_at is null;

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

  -- Members and executives with a band go to the least-populated auto-assign group; those
  -- without a band go to the event's for_unbanded group.
  begin
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
  end;

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

-- Give existing executives a group, in registration order, using the same balancing rule.
do $$
declare
  r record;
  v_group uuid;
begin
  for r in
    select id, event_id, band_id from public.attendees
    where kind = 'executive' and group_id is null
    order by registered_at
  loop
    if r.band_id is null then
      select g.id into v_group from public.convention_groups g
      where g.event_id = r.event_id and g.for_unbanded and g.is_active;
    else
      select g.id into v_group
      from public.convention_groups g
      left join public.attendees a on a.group_id = g.id and a.band_id is not null
      where g.event_id = r.event_id and g.auto_assign and g.is_active and not g.for_unbanded
      group by g.id, g.sort_order, g.name
      order by count(a.id), g.sort_order, g.name
      limit 1;
    end if;
    if v_group is not null then
      update public.attendees set group_id = v_group where id = r.id;
    end if;
    v_group := null;
  end loop;
end;
$$;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Asks the email function to send confirmations that are still missing 3+ minutes after
-- registration (last 2 days only). The function looks everything up from the status token and
-- sends at most once per attendee (Resend idempotency key), so retries cannot double-send.
create or replace function public.send_missing_confirmations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    update public.attendees
    set confirmation_email_attempts = confirmation_email_attempts + 1
    where id in (
      select id from public.attendees
      where confirmation_email_sent_at is null
        and confirmation_email_attempts < 3
        and registered_at < now() - interval '3 minutes'
        and registered_at > now() - interval '2 days'
      order by registered_at
      limit 20
    )
    returning status_token
  loop
    perform net.http_post(
      url := 'https://kozrzsnbrexywyopdxwz.supabase.co/functions/v1/send-registration-email',
      body := jsonb_build_object('statusToken', r.status_token),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.send_missing_confirmations() from public, anon, authenticated;

select cron.schedule('send-missing-confirmations', '*/5 * * * *', 'select public.send_missing_confirmations()');
