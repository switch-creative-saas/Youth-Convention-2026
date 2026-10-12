import { supabase } from '@/lib/supabase';

export type ConfirmationResult = { status: 'sent' | 'already_sent'; id?: string; sentAt?: string };

/**
 * Asks the send-registration-email Edge Function to email the attendee their confirmation.
 * The server looks up the recipient and details from the status token, so only the token
 * (and optionally the rendered tag PNG to attach) is sent from the browser.
 * `force` resends an already-sent email and requires a signed-in admin or registration desk user.
 */
export async function sendRegistrationConfirmation(statusToken: string, options: { tagPng?: string; force?: boolean } = {}) {
  const { data, error } = await supabase.functions.invoke<ConfirmationResult>('send-registration-email', {
    body: { statusToken, tagPng: options.tagPng, force: options.force ?? false },
  });
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
