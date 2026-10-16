// send-registration-email: emails attendees through Resend.
//
// POST { statusToken, tagPng?, tagBackPng?, force? }
//   Registration confirmation (details, tag link, status link and the convention timetable).
//   statusToken  the attendee's secret status token (proves the caller just registered or holds the link)
//   tagPng       optional base64 PNG of their convention tag, attached to the email
//   tagBackPng   optional base64 PNG of the back of the tag (media team), also attached
//   force        resend even if already sent — only for signed-in admins / registration desk
//
// POST { action: 'send_timetable', eventId, preview?, limit? }   (signed-in workspace admins only)
//   Emails the timetable to attendees of the event who have not received it yet (people who
//   registered before the timetable was added). Sends up to `limit` (default 90, max 100) per call
//   to stay inside the Resend free plan's 100 emails a day; call again to continue.
//   preview: true sends one sample to the signed-in admin instead.
//
// Recipients and content come from the database, never from the request, so this cannot be used
// to email arbitrary addresses. Each attendee gets each email once unless staff resend it.
//
// Secrets: RESEND_API_KEY (required), RESEND_FROM_EMAIL, RESEND_REPLY_TO, APP_URL, LOGO_URL.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { confirmationEmail, timetableEmail, timetableSection, type EmailContext, type EmailSession } from './email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TAG_BYTES = 3 * 1024 * 1024;
const DEFAULT_BATCH = 90;

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

/** "15:00:00" -> "3:00 PM". */
function formatClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
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

// PostgREST returns embedded rows as an object or a one-item array depending on the relationship.
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] : value) ?? null;

type EventRow = {
  name: string; theme: string | null; venue: string | null; start_date: string; end_date: string;
  workspace: { name: string; timezone: string; slug: string } | { name: string; timezone: string; slug: string }[] | null;
};

/** Active sessions of an event, HTML-escaped, in running order, plus a heading for each day. */
async function loadTimetable(admin: SupabaseClient, eventId: string, venue: string) {
  const { data, error } = await admin
    .from('programmes')
    .select('title, description, date, start_time, end_time, location')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('date').order('start_time').order('sort_order');
  if (error) throw new Error(error.message);
  const sessions: EmailSession[] = (data ?? []).map(row => ({
    date: row.date,
    start: formatClock(row.start_time),
    end: formatClock(row.end_time),
    title: escapeHtml(row.title),
    description: escapeHtml(row.description ?? ''),
    location: escapeHtml(row.location ?? ''),
  }));
  const dayLabels = new Map(sessions.map(session => [session.date, new Date(`${session.date}T12:00:00Z`)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })]));
  return { count: sessions.length, html: timetableSection(sessions, dayLabels, escapeHtml(venue)) };
}

function eventContext(supabaseUrl: string, base: string, event: EventRow | null) {
  const workspace = one(event?.workspace);
  const timeZone = workspace?.timezone ?? 'Africa/Lagos';
  const eventDates = event
    ? (event.start_date === event.end_date
      ? formatDate(event.start_date, timeZone)
      : `${formatDate(event.start_date, timeZone)} – ${formatDate(event.end_date, timeZone)}`)
    : 'To be announced';
  return {
    timeZone,
    eventName: event?.name ?? 'Youth Convention',
    slug: workspace?.slug ?? '',
    // The logo is served from public Storage so it loads in every inbox regardless of where the app is hosted.
    shared: {
      logoUrl: escapeHtml(Deno.env.get('LOGO_URL') || `${supabaseUrl}/storage/v1/object/public/branding/email-logo.png`),
      workspaceName: escapeHtml(workspace?.name ?? 'Youth Fellowship'),
      eventName: escapeHtml(event?.name ?? 'Youth Convention'),
      eventDates: escapeHtml(eventDates),
      eventVenue: escapeHtml(event?.venue || 'To be announced'),
      eventTheme: escapeHtml(event?.theme || '-'),
    },
    timetableUrl: (token?: string) => `${base}#/convention/timetable/${workspace?.slug ?? ''}${token ? `?back=${token}` : ''}`,
  };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function sender() {
  return {
    from: Deno.env.get('RESEND_FROM_EMAIL') || 'MOSYF Youth Convention <convention@mountainofsolution.org>',
    reply_to: Deno.env.get('RESEND_REPLY_TO') || 'youth.fellowship@mountainofsolution.org',
  };
}

async function resend(path: string, resendKey: string, idempotencyKey: string, payload: unknown) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((result as { message?: string }).message ?? `Resend responded with ${response.status}`);
  }
  return result as { id?: string; data?: Array<{ id: string }> };
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** Timetable email for attendees registered before the timetable existed (admins only). */
async function sendTimetable(req: Request, body: Record<string, unknown>, admin: SupabaseClient, supabaseUrl: string, resendKey: string, base: string) {
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: 'Choose a convention.' }, 400);

  const authorization = req.headers.get('Authorization') ?? '';
  const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (!user?.email) return json({ error: 'Sign in again.' }, 401);

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, workspace_id, name, theme, venue, start_date, end_date, workspace:workspaces(name, timezone, slug)')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError) return json({ error: eventError.message }, 500);
  if (!event) return json({ error: 'Convention not found.' }, 404);
  const { data: allowed } = await caller.rpc('has_workspace_role', { ws: event.workspace_id, roles: ['admin'] });
  if (!allowed) return json({ error: 'Only admins can email the timetable.' }, 403);

  const context = eventContext(supabaseUrl, base, event as EventRow);
  const timetable = await loadTimetable(admin, eventId, event.venue ?? '');
  if (!timetable.count) return json({ error: 'Add at least one active session before emailing the timetable.' }, 400);
  const subject = `${context.eventName} timetable — sessions and times`;
  const render = (name: string, code: string, token?: string) => timetableEmail({
    ...context.shared,
    firstName: escapeHtml(firstName(name)),
    attendeeCode: escapeHtml(code),
    statusUrl: escapeHtml(token ? `${base}#/convention/status/${token}` : `${base}#/convention/status`),
    timetableUrl: escapeHtml(context.timetableUrl(token)),
  } satisfies EmailContext, timetable.html);

  if (body.preview === true) {
    const name = (user.user_metadata?.name as string | undefined) || 'there';
    await resend('/emails', resendKey, `timetable-preview-${user.id}-${Date.now()}`, {
      ...sender(),
      to: [user.email],
      subject: `[Preview] ${subject}`,
      html: render(name, 'PREVIEW-0000'),
      tags: [{ name: 'type', value: 'timetable_preview' }],
    });
    return json({ status: 'preview_sent', to: user.email });
  }

  const limit = Math.min(100, Math.max(1, Number(body.limit) || DEFAULT_BATCH));
  const { data: attendees, error } = await admin
    .from('attendees')
    .select('id, full_name, email, code, status_token, kind')
    .eq('event_id', eventId)
    .is('timetable_email_sent_at', null)
    .order('registered_at')
    .limit(limit);
  if (error) return json({ error: error.message }, 500);
  if (!attendees?.length) return json({ status: 'sent', sent: 0, remaining: 0 });

  const ids = attendees.map(row => row.id);
  // Resend's batch endpoint sends up to 100 emails in one request.
  await resend('/emails/batch', resendKey, `timetable-${await sha256(ids.join(','))}`, attendees.map(row => ({
    ...sender(),
    to: [row.email],
    subject,
    html: render(row.full_name, row.code, row.status_token),
    tags: [{ name: 'type', value: 'timetable' }, { name: 'kind', value: row.kind }],
  })));
  await admin.from('attendees').update({ timetable_email_sent_at: new Date().toISOString() }).in('id', ids);

  const { count } = await admin
    .from('attendees')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('timetable_email_sent_at', null);
  return json({ status: 'sent', sent: ids.length, remaining: count ?? 0 });
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

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, 503);
  const base = appBase(req);
  if (!base) return json({ error: 'Set the APP_URL secret so emails can link back to the app.' }, 503);

  if (body.action === 'send_timetable') {
    try {
      return await sendTimetable(req, body, admin, url, resendKey, base);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Could not send the timetable.' }, 502);
    }
  }

  const statusToken = typeof body.statusToken === 'string' ? body.statusToken.trim() : '';
  if (!/^[a-f0-9]{32,64}$/.test(statusToken)) return json({ error: 'Invalid status token.' }, 400);

  const { data: attendee, error } = await admin
    .from('attendees')
    .select(`id, kind, code, full_name, email, leadership_role, registered_at, status_token, workspace_id, event_id,
             confirmation_email_sent_at,
             band:bands(name), grp:convention_groups(name),
             event:events!attendees_event_id_workspace_id_fkey(name, theme, venue, start_date, end_date, workspace:workspaces(name, timezone, slug)),
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

  const event = one(attendee.event) as EventRow | null;
  const context = eventContext(url, base, event);
  const isExecutive = attendee.kind === 'executive';
  type DepartmentRow = { department: { name: string } | { name: string }[] | null };
  const departments = ((attendee.attendee_departments ?? []) as DepartmentRow[])
    .map(row => one(row.department)?.name)
    .filter(Boolean)
    .join(', ');
  const statusUrl = `${base}#/convention/status/${attendee.status_token}`;

  let timetable = { count: 0, html: '' };
  try {
    timetable = await loadTimetable(admin, attendee.event_id, event?.venue ?? '');
  } catch {
    // The confirmation still goes out without the timetable; the status page shows it.
  }

  const html = confirmationEmail({
    ...context.shared,
    firstName: escapeHtml(firstName(attendee.full_name)),
    attendeeCode: escapeHtml(attendee.code),
    statusUrl: escapeHtml(statusUrl),
    timetableUrl: escapeHtml(context.timetableUrl(attendee.status_token)),
  }, {
    attendeeName: escapeHtml(attendee.full_name),
    kindLabel: isExecutive ? 'executive' : 'member',
    groupName: escapeHtml(isExecutive ? 'Executive' : one(attendee.grp)?.name ?? 'To be assigned'),
    roleLabel: isExecutive ? 'Leadership role' : 'Fellowship band',
    roleValue: escapeHtml((isExecutive ? attendee.leadership_role : one(attendee.band)?.name) || (isExecutive ? '-' : 'None')),
    departments: escapeHtml(departments || '-'),
    registeredAt: escapeHtml(formatDate(attendee.registered_at, context.timeZone, true)),
    tagUrl: escapeHtml(`${statusUrl}/tag`),
  }, timetable.html);

  // Optional tag attachments (front, and back for the media team): each must be a PNG under 3 MB.
  const attachments: Array<{ filename: string; content: string }> = [];
  const attach = (value: unknown, filename: string) => {
    if (typeof value !== 'string' || !value) return;
    const content = value.includes(',') ? value.split(',').pop()! : value;
    if (content.startsWith('iVBORw0KGgo') && content.length * 0.75 <= MAX_TAG_BYTES) attachments.push({ filename, content });
  };
  attach(body.tagPng, `${attendee.code}-convention-tag.png`);
  attach(body.tagBackPng, `${attendee.code}-convention-tag-back.png`);

  let result: { id?: string };
  try {
    result = await resend('/emails', resendKey, force ? `registration-${attendee.id}-${Date.now()}` : `registration-${attendee.id}`, {
      ...sender(),
      to: [attendee.email],
      subject: `You're registered for ${context.eventName} — ID ${attendee.code}`,
      html,
      ...(attachments.length ? { attachments } : {}),
      tags: [{ name: 'type', value: 'registration_confirmation' }, { name: 'kind', value: attendee.kind }],
    });
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : 'Email failed.';
    await admin.from('attendees').update({ confirmation_email_error: message.slice(0, 500) }).eq('id', attendee.id);
    return json({ error: message }, 502);
  }

  const sentAt = new Date().toISOString();
  await admin.from('attendees').update({
    confirmation_email_sent_at: sentAt,
    confirmation_email_id: result.id ?? null,
    confirmation_email_error: null,
    // The confirmation includes the timetable, so the separate timetable email is not needed.
    ...(timetable.count ? { timetable_email_sent_at: sentAt } : {}),
  }).eq('id', attendee.id);

  return json({ status: 'sent', id: result.id });
});
