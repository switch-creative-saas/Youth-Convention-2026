import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    // PKCE puts the auth code in the query string, which works alongside the HashRouter.
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
