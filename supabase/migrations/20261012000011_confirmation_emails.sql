-- Track the registration confirmation email per attendee so it is sent once
-- (the send-registration-email Edge Function sets these with the service role).

alter table public.attendees
  add column confirmation_email_sent_at timestamptz,
  add column confirmation_email_id text,
  add column confirmation_email_error text;
