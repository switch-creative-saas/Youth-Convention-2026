-- Dashboards apply realtime changes row by row; new registrations also insert department links,
-- so those need to be published too (otherwise a new attendee shows without departments).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendee_departments'
  ) then
    alter publication supabase_realtime add table public.attendee_departments;
  end if;
end;
$$;
