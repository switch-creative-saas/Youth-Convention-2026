import { useState } from 'react';
import { MailWarning, Send } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { resendConfirmation } from '@/lib/registrationEmail';
import { timeAgo } from '@/lib/format';
import type { Attendee } from '@/types';

const VISIBLE = 6;

/**
 * Dashboard card listing registrations whose confirmation email has not gone out, with a resend
 * button per person and for everyone. Hidden when every confirmation has been sent.
 */
export function PendingEmailsPanel() {
  const { attendees, currentEvent, refreshAttendee } = useAppData();
  const { addToast } = useToast();
  const canSend = usePermission('register');
  const [sending, setSending] = useState<string | 'all' | null>(null);
  const [showAll, setShowAll] = useState(false);

  const pending = attendees
    .filter(attendee => !attendee.confirmationEmailSentAt)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  if (!canSend || pending.length === 0) return null;
  const eventName = currentEvent?.name ?? 'Youth convention';

  const sendOne = async (attendee: Attendee) => {
    try {
      await resendConfirmation(attendee, eventName);
      return true;
    } catch (error) {
      addToast({ type: 'error', title: `Email to ${attendee.fullName} not sent`, description: error instanceof Error ? error.message : undefined, duration: 8000 });
      return false;
    } finally {
      void refreshAttendee(attendee.id).catch(() => undefined);
    }
  };

  const resendOne = async (attendee: Attendee) => {
    setSending(attendee.id);
    if (await sendOne(attendee)) addToast({ type: 'success', title: `Confirmation email sent to ${attendee.email}` });
    setSending(null);
  };

  const resendAll = async () => {
    setSending('all');
    let sent = 0;
    for (const attendee of pending) {
      if (await sendOne(attendee)) sent += 1;
    }
    setSending(null);
    if (sent) addToast({ type: 'success', title: `${sent} confirmation ${sent === 1 ? 'email' : 'emails'} sent` });
  };

  const visible = showAll ? pending : pending.slice(0, VISIBLE);
  return (
    <section className="portal-card mb-8 rounded-[28px] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300"><MailWarning className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h3 className="text-lg font-medium text-portal-ink">Confirmation emails not delivered</h3>
            <p className="mt-0.5 text-sm text-portal-label">
              {pending.length} {pending.length === 1 ? 'person has' : 'people have'} not received their confirmation email. Resend it with their details, tag and timetable.
            </p>
          </div>
        </div>
        <button
          onClick={() => void resendAll()}
          disabled={sending !== null}
          className="portal-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-portal-dark px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {sending === 'all' ? 'Sending…' : `Resend all (${pending.length})`}
        </button>
      </div>

      <ul className="mt-4 divide-y divide-portal-line">
        {visible.map(attendee => (
          <li key={attendee.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-portal-ink">{attendee.fullName} <span className="font-mono text-xs text-portal-label">{attendee.code}</span></p>
              <p className="truncate text-xs text-portal-label">
                {attendee.email} · registered {timeAgo(attendee.registeredAt)}
                {attendee.confirmationEmailError ? ` · failed: ${attendee.confirmationEmailError}` : ''}
              </p>
            </div>
            <button
              onClick={() => void resendOne(attendee)}
              disabled={sending !== null}
              className="portal-focus inline-flex min-h-10 items-center gap-1.5 rounded-full border border-portal-line px-4 text-xs font-medium text-portal-ink disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" /> {sending === attendee.id ? 'Sending…' : 'Resend email'}
            </button>
          </li>
        ))}
      </ul>
      {pending.length > VISIBLE && (
        <button onClick={() => setShowAll(value => !value)} className="mt-2 text-xs font-medium text-portal-ink underline underline-offset-2">
          {showAll ? 'Show fewer' : `Show all ${pending.length}`}
        </button>
      )}
    </section>
  );
}
