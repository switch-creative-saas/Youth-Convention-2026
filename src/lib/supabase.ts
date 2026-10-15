import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
}

export interface PendingAuthLink {
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

/**
 * Every email link (invite, password reset, magic link, signup confirmation) returns tokens in
 * the URL fragment (#access_token=...&type=...), which collides with the HashRouter. Read them
 * before the router or client sees them, then reset the fragment to the app root.
 * AuthContext turns them into a session and shows the set-password screen when needed.
 */
function consumeAuthFragment(): PendingAuthLink | null {
  if (typeof window === 'undefined') return null;
  // Supabase appends "#access_token=..." to the redirect address. When that address already has a
  // route ("/#/login"), the result is "#/login#access_token=..." (or "&access_token="), so search
  // the whole hash (and the query, where some errors land) rather than only its start.
  const source = `${window.location.hash}&${window.location.search}`;
  const read = (name: string) => {
    const match = source.match(new RegExp(`[#&?/]${name}=([^&#]*)`));
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
  };
  const accessToken = read('access_token');
  const error = read('error_description');
  if (!accessToken && !error) return null;
  const search = new URLSearchParams(window.location.search);
  ['error', 'error_code', 'error_description'].forEach(name => search.delete(name));
  const query = search.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}#/`);
  return {
    type: read('type'),
    accessToken,
    refreshToken: read('refresh_token'),
    error,
  };
}

export const pendingAuthLink = consumeAuthFragment();

export const supabase = createClient<Database>(url, key, {
  auth: {
    // Implicit flow: email links carry tokens in the fragment, handled by consumeAuthFragment above.
    // Unlike PKCE this works when the link is opened on a different device or browser than the one
    // that requested it (e.g. "Forgot password?" on a laptop, email opened on a phone).
    flowType: 'implicit',
    // Per-tab lock instead of the default cross-tab navigator lock. A frozen background tab (common on
    // phones) or another open tab could hold the shared lock forever, so signing in here would hang.
    lock: processLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const PHOTO_BUCKET = 'attendee-photos';

export function photoUrl(path?: string | null) {
  if (!path) return undefined;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Base URL of the app (works for any deploy path because the router uses the hash). */
export function appBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function statusUrl(token: string) {
  return `${appBaseUrl()}#/convention/status/${token}`;
}

/** Public, printable timetable of a workspace's active convention. */
export function timetableUrl(workspaceSlug: string) {
  return `${appBaseUrl()}#/convention/timetable/${workspaceSlug}`;
}

export function registrationUrl(kind: 'member' | 'executive', token: string) {
  return `${appBaseUrl()}#/register/${kind}?token=${token}`;
}

/** Turns a PostgREST / RPC error into a readable message. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}
