import { supabase } from '@/lib/supabase';
import { tagImagesForEmail } from '@/lib/tagImage';
import type { Attendee } from '@/types';

export type ConfirmationResult = { status: 'sent' | 'already_sent'; id?: string; sentAt?: string };

/**
 * Asks the send-registration-email Edge Function to email the attendee their confirmation.
 * The server looks up the recipient and details from the status token, so only the token
 * (and optionally the rendered tag PNGs to attach: front, and back for the media team) is sent from the browser.
 * `force` resends an already-sent email and requires a signed-in admin or registration desk user.
 */
export function sendRegistrationConfirmation(statusToken: string, options: { tagPng?: string; tagBackPng?: string; force?: boolean } = {}) {
  return invokeEmail<ConfirmationResult>({ statusToken, tagPng: options.tagPng, tagBackPng: options.tagBackPng, force: options.force ?? false });
}

/** Staff resend: attaches the tag when it can be drawn quickly, otherwise sends without it. */
export async function resendConfirmation(attendee: Attendee, eventName: string) {
  const images = await tagImagesForEmail(attendee, eventName, attendee.kind);
  return sendRegistrationConfirmation(attendee.statusToken, { ...images, force: true });
}

export type TimetableEmailResult =
  | { status: 'preview_sent'; to: string }
  | { status: 'sent'; sent: number; remaining: number };

/**
 * Emails the timetable to attendees who have not had it yet (registered before it was published).
 * Sends up to 90 per call (Resend free plan: 100 emails a day); call again to continue.
 * `preview` sends one sample to the signed-in admin instead.
 */
export function sendTimetableEmails(eventId: string, options: { preview?: boolean } = {}) {
  return invokeEmail<TimetableEmailResult>({ action: 'send_timetable', eventId, preview: options.preview ?? false });
}

async function invokeEmail<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>('send-registration-email', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try { message = ((await context.json()) as { error?: string }).error ?? message; } catch { /* keep default */ }
    }
    throw new Error(message);
  }
  if (!data) throw new Error('No response from the email service.');
  return data;
}
