import { useState } from 'react';
import { Copy, ExternalLink, Mail, Send } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { PillButton } from '@/components/ui-kit/PillButton';
import { sendTimetableEmails } from '@/lib/registrationEmail';
import { timetableUrl } from '@/lib/supabase';

/**
 * Admin card under Convention Sessions: the public timetable link, and emailing the timetable to
 * people who registered before it was published (new registrations get it in their confirmation).
 */
export function TimetableSharing({ activeSessions }: { activeSessions: number }) {
  const { currentWorkspace, currentEvent, attendees } = useAppData();
  const { addToast } = useToast();
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!currentWorkspace || !currentEvent) return null;
  const link = timetableUrl(currentWorkspace.slug);
  const waiting = attendees.filter(attendee => !attendee.timetableEmailSentAt).length;
  const batch = Math.min(waiting, 90);

  const run = async (kind: 'preview' | 'send') => {
    setBusy(kind);
    setConfirming(false);
    try {
      const result = await sendTimetableEmails(currentEvent.id, { preview: kind === 'preview' });
      if (result.status === 'preview_sent') {
        addToast({ type: 'success', title: `Preview sent to ${result.to}`, duration: 7000 });
      } else {
        addToast({
          type: 'success',
          title: `Timetable emailed to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}`,
          description: result.remaining ? `${result.remaining} still to send. Send the rest tomorrow (the free email plan allows 100 a day).` : 'Everyone registered has the timetable.',
          duration: 9000,
        });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Timetable not sent', description: error instanceof Error ? error.message : undefined, duration: 9000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-portal-line p-4 sm:p-5">
      <h4 className="font-semibold text-portal-ink dark:text-white">Share the timetable</h4>
      <p className="mt-1 max-w-2xl text-sm text-portal-label">
        Attendees see the timetable on their status page and in their confirmation email. Anyone with this link can view, print or save it as a PDF.
      </p>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 max-w-full truncate rounded-full bg-portal-surface px-3 py-2 font-mono text-xs text-portal-label">{link}</span>
        <PillButton onClick={() => { void navigator.clipboard.writeText(link); addToast({ type: 'success', title: 'Timetable link copied' }); }}><Copy className="h-4 w-4" /> Copy link</PillButton>
        <a href={link} target="_blank" rel="noreferrer" className="portal-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-portal-line px-5 text-sm font-medium text-portal-ink"><ExternalLink className="h-4 w-4" /> Open</a>
      </div>

      <div className="mt-5 border-t border-portal-line pt-4">
        <p className="text-sm text-portal-ink dark:text-white">
          {activeSessions === 0
            ? 'Add sessions before emailing the timetable.'
            : waiting === 0
              ? 'Everyone registered has received the timetable by email.'
              : `${waiting} registered ${waiting === 1 ? 'person has' : 'people have'} not received the timetable by email yet.`}
        </p>
        {activeSessions > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <PillButton disabled={busy !== null} onClick={() => void run('preview')}><Mail className="h-4 w-4" /> {busy === 'preview' ? 'Sending…' : 'Send me a preview'}</PillButton>
            {waiting > 0 && (
              confirming ? (
                <>
                  <PillButton variant="dark" disabled={busy !== null} onClick={() => void run('send')}><Send className="h-4 w-4" /> Yes, email {batch} {batch === 1 ? 'person' : 'people'}</PillButton>
                  <PillButton disabled={busy !== null} onClick={() => setConfirming(false)}>Cancel</PillButton>
                </>
              ) : (
                <PillButton variant="dark" disabled={busy !== null} onClick={() => setConfirming(true)}><Send className="h-4 w-4" /> {busy === 'send' ? 'Sending…' : `Email timetable to ${batch}`}</PillButton>
              )
            )}
          </div>
        )}
        {waiting > 90 && <p className="mt-2 text-xs text-portal-label">Up to 90 are sent at a time because the free email plan allows 100 emails a day. Send the rest the next day.</p>}
      </div>
    </div>
  );
}
