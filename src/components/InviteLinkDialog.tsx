import { Copy, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

/** Shown when the invite email could not be sent: the admin shares the one-time link privately instead. */
export function InviteLinkDialog({ email, link, onClose }: { email: string; link: string; onClose: () => void }) {
  const { addToast } = useToast();
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    addToast({ type: 'success', title: 'Invite link copied' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="invite-link-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="portal-card relative w-full max-w-md !bg-portal-from p-6">
        <button aria-label="Close" onClick={onClose} className="portal-focus absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-portal-label"><X className="h-5 w-5" /></button>
        <h3 id="invite-link-title" className="pr-8 text-lg font-medium text-portal-ink">Send this link to {email}</h3>
        <p className="mt-2 text-sm leading-6 text-portal-label">
          Access was granted, but the invite email couldn't be sent. Send this one-time link privately (e.g. WhatsApp). It lets them set their password, so don't post it in a group. It expires after 24 hours.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-portal-line p-2">
          <input readOnly value={link} aria-label="Invite link" className="min-w-0 flex-1 bg-transparent text-xs text-portal-ink outline-none" />
          <button aria-label="Copy invite link" onClick={() => void copy()} className="portal-focus grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-portal-surface"><Copy className="h-4 w-4 text-portal-label" /></button>
        </div>
      </div>
    </div>
  );
}
