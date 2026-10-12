// invite-staff: lets workspace admins give people dashboard access without opening Supabase.
//
// POST { action: 'assign_role', workspaceId, email, role, name?, redirectTo? }
//   Workspace admin (or platform admin) invites/creates the login and assigns a staff role.
//   Only platform admins may assign 'admin'.
// POST { action: 'create_workspace', name, slug, codePrefix, email, ownerName?, redirectTo? }
//   Platform admin creates a workspace and invites its admin in one step.
//
// Permission checks and role assignment run with the CALLER's token (same RLS + SECURITY DEFINER
// checks as the app). The service-role key is only used to create the login / send the invite.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const ROLES = ['admin', 'registration_desk', 'verification_operator', 'food_distributor', 'souvenir_distributor', 'activity_coordinator', 'viewer'] as const;
type Role = typeof ROLES[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value.trim());
}

function safeRedirect(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

type EnsureResult = { status: 'existing' | 'invited' | 'link'; actionLink?: string; emailError?: string };

/** Makes sure a login exists for the email: emails an invite, or returns a link to share if email sending fails. */
async function ensureUser(admin: SupabaseClient, email: string, name: string | undefined, redirectTo: string | undefined): Promise<EnsureResult> {
  const { data: existingId, error: lookupError } = await admin.rpc('auth_user_id_by_email', { p_email: email });
  if (lookupError) throw new Error(lookupError.message);
  if (existingId) return { status: 'existing' };

  const metadata = name ? { name } : undefined;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: metadata, redirectTo });
  if (!inviteError) return { status: 'invited' };

  // Email could not be sent (e.g. no custom SMTP configured). Hand back a one-time link to share privately.
  const { data: createdId } = await admin.rpc('auth_user_id_by_email', { p_email: email });
  const { data: link, error: linkError } = createdId
    ? await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
    : await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: metadata } });
  if (linkError || !link?.properties?.action_link) {
    throw new Error(`Could not invite ${email}: ${inviteError.message}${linkError ? ` / ${linkError.message}` : ''}`);
  }
  return { status: 'link', actionLink: link.properties.action_link, emailError: inviteError.message };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = req.headers.get('Authorization') ?? '';

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (userError || !user) return json({ error: 'Sign in again.' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const email = isEmail(body.email) ? body.email.trim().toLowerCase() : null;
  if (!email) return json({ error: 'Enter a valid email address.' }, 400);
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : undefined;
  const redirectTo = safeRedirect(body.redirectTo);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: isPlatformAdmin, error: platformError } = await caller.rpc('is_platform_admin');
  if (platformError) return json({ error: platformError.message }, 500);

  try {
    if (body.action === 'create_workspace') {
      if (!isPlatformAdmin) return json({ error: 'Only the platform owner can create workspaces.' }, 403);
      const workspaceName = typeof body.workspaceName === 'string' ? body.workspaceName.trim() : '';
      const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
      const codePrefix = typeof body.codePrefix === 'string' ? body.codePrefix.trim().toUpperCase() : 'MOSYF';
      if (!workspaceName || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug) || !/^[A-Z0-9]{2,10}$/.test(codePrefix)) {
        return json({ error: 'Check the workspace name, slug (lowercase letters, numbers, dashes) and ID prefix (2-10 letters/numbers).' }, 400);
      }
      const { data: slugTaken } = await admin.from('workspaces').select('id').eq('slug', slug).maybeSingle();
      if (slugTaken) return json({ error: `The slug "${slug}" is already used.` }, 409);

      const result = await ensureUser(admin, email, name, redirectTo);
      const { data: workspaceId, error } = await caller.rpc('create_workspace', {
        p_name: workspaceName, p_slug: slug, p_owner_email: email, p_code_prefix: codePrefix,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ...result, workspaceId });
    }

    // Default action: assign a role in a workspace.
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
    const role = body.role as Role;
    if (!workspaceId || !ROLES.includes(role)) return json({ error: 'Choose a workspace and a valid role.' }, 400);

    const { data: isAdmin, error: roleError } = await caller.rpc('has_workspace_role', { ws: workspaceId, roles: ['admin'] });
    if (roleError) return json({ error: roleError.message }, 500);
    if (!isAdmin) return json({ error: 'Only workspace admins can give dashboard access.' }, 403);
    if (role === 'admin' && !isPlatformAdmin) return json({ error: 'Only the platform owner can make someone an admin.' }, 403);

    const result = await ensureUser(admin, email, name, redirectTo);
    const { error } = await caller.rpc('assign_workspace_role', { p_workspace: workspaceId, p_email: email, p_role: role });
    if (error) return json({ error: error.message }, 400);
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invite failed.' }, 502);
  }
});
