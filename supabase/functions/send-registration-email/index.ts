// send-registration-email: sends the Resend "portal-registration-confirmation" template to an attendee.
//
// POST { statusToken, tagPng?, force? }
//   statusToken  the attendee's secret status token (proves the caller just registered or holds the link)
//   tagPng       optional base64 PNG of their convention tag, attached to the email
//   force        resend even if already sent — only for signed-in admins / registration desk
//
// Recipient and content come from the database, never from the request, so this cannot be used
// to email arbitrary addresses. Each attendee gets the confirmation once unless staff resend it.
//
// Secrets: RESEND_API_KEY (required), RESEND_FROM_EMAIL, RESEND_REPLY_TO, APP_URL, LOGO_URL,
//          RESEND_TEMPLATE_ID (defaults to the "portal-registration-confirmation" alias).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TAG_BYTES = 3 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value: string, timeZone: string, withTime = false) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat('en-NG', withTime
    ? { dateStyle: 'medium', timeStyle: 'short', timeZone }
    : { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date);
}

/** Base URL of the app, always ending in "/" so "#/route" and asset paths can be appended. */
function appBase(req: Request) {
  const configured = Deno.env.get('APP_URL');
  const raw = configured || req.headers.get('origin') || '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = '';
    url.search = '';
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const statusToken = typeof body.statusToken === 'string' ? body.statusToken.trim() : '';
  if (!/^[a-f0-9]{32,64}$/.test(statusToken)) return json({ error: 'Invalid status token.' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: attendee, error } = await admin
    .from('attendees')
    .select(`id, kind, code, full_name, email, leadership_role, registered_at, status_token, workspace_id,
             confirmation_email_sent_at,
             band:bands(name), grp:convention_groups(name),
             event:events!attendees_event_id_workspace_id_fkey(name, theme, venue, start_date, end_date, workspace:workspaces(name, timezone)),
             attendee_departments(department:departments(name))`)
    .eq('status_token', statusToken)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!attendee) return json({ error: 'Registration not found.' }, 404);

  // Resending needs a signed-in admin or registration desk member of this workspace.
  const force = body.force === true;
  if (force) {
    const authorization = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: allowed } = await caller.rpc('has_workspace_role', { ws: attendee.workspace_id, roles: ['registration_desk'] });
    if (!allowed) return json({ error: 'Only admins or the registration desk can resend confirmation emails.' }, 403);
  } else if (attendee.confirmation_email_sent_at) {
    return json({ status: 'already_sent', sentAt: attendee.confirmation_email_sent_at });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, 503);

  const base = appBase(req);
  if (!base) return json({ error: 'Set the APP_URL secret so emails can link back to the app.' }, 503);

  // PostgREST returns embedded rows as an object or a one-item array depending on the relationship.
  const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] : value) ?? null;
  const event = one(attendee.event);
  const workspace = one(event?.workspace);
  const timeZone = workspace?.timezone ?? 'Africa/Lagos';
  const isExecutive = attendee.kind === 'executive';
  type DepartmentRow = { department: { name: string } | { name: string }[] | null };
  const departments = ((attendee.attendee_departments ?? []) as DepartmentRow[])
    .map(row => one(row.department)?.name)
    .filter(Boolean)
    .join(', ');
  const statusUrl = `${base}#/convention/status/${attendee.status_token}`;
  const eventDates = event
    ? (event.start_date === event.end_date
      ? formatDate(event.start_date, timeZone)
      : `${formatDate(event.start_date, timeZone)} – ${formatDate(event.end_date, timeZone)}`)
    : 'To be announced';

  const variables: Record<string, string> = {
    ATTENDEE_NAME: attendee.full_name,
    ATTENDEE_FIRST_NAME: attendee.full_name.trim().split(/\s+/)[0] || attendee.full_name,
    ATTENDEE_CODE: attendee.code,
    KIND_LABEL: isExecutive ? 'executive' : 'member',
    GROUP_NAME: isExecutive ? 'Executive' : one(attendee.grp)?.name ?? 'To be assigned',
    ROLE_LABEL: isExecutive ? 'Leadership role' : 'Fellowship band',
    ROLE_VALUE: (isExecutive ? attendee.leadership_role : one(attendee.band)?.name) || (isExecutive ? '-' : 'None'),
    DEPARTMENTS: departments || '-',
    REGISTERED_AT: formatDate(attendee.registered_at, timeZone, true),
    EVENT_NAME: event?.name ?? 'Youth Convention',
    EVENT_DATES: eventDates,
    EVENT_VENUE: event?.venue || 'To be announced',
    EVENT_THEME: event?.theme || '-',
    WORKSPACE_NAME: workspace?.name ?? 'Youth Fellowship',
  };
  for (const key of Object.keys(variables)) variables[key] = escapeHtml(variables[key]);
  variables.STATUS_URL = escapeHtml(statusUrl);
  variables.TAG_URL = escapeHtml(`${statusUrl}/tag`);
  // The logo is served from public Storage so it loads in every inbox regardless of where the app is hosted.
  variables.LOGO_URL = escapeHtml(Deno.env.get('LOGO_URL') || `${url}/storage/v1/object/public/branding/email-logo.png`);

  // Optional tag attachment: must be a PNG under 3 MB.
  const attachments: Array<{ filename: string; content: string }> = [];
  if (typeof body.tagPng === 'string' && body.tagPng) {
    const content = body.tagPng.includes(',') ? body.tagPng.split(',').pop()! : body.tagPng;
    if (content.startsWith('iVBORw0KGgo') && content.length * 0.75 <= MAX_TAG_BYTES) {
      attachments.push({ filename: `${attendee.code}-convention-tag.png`, content });
    }
  }

  const replyTo = Deno.env.get('RESEND_REPLY_TO') || 'youth.fellowship@mountainofsolution.org';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': force ? `registration-${attendee.id}-${Date.now()}` : `registration-${attendee.id}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM_EMAIL') || 'MOSYF Youth Convention <youth.fellowship@mountainofsolution.org>',
      to: [attendee.email],
      reply_to: replyTo,
      template: { id: Deno.env.get('RESEND_TEMPLATE_ID') || 'portal-registration-confirmation', variables },
      ...(attachments.length ? { attachments } : {}),
      tags: [{ name: 'type', value: 'registration_confirmation' }, { name: 'kind', value: attendee.kind }],
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (result as { message?: string }).message ?? `Resend responded with ${response.status}`;
    await admin.from('attendees').update({ confirmation_email_error: message.slice(0, 500) }).eq('id', attendee.id);
    return json({ error: message }, 502);
  }

  await admin.from('attendees').update({
    confirmation_email_sent_at: new Date().toISOString(),
    confirmation_email_id: (result as { id?: string }).id ?? null,
    confirmation_email_error: null,
  }).eq('id', attendee.id);

  return json({ status: 'sent', id: (result as { id?: string }).id });
});
