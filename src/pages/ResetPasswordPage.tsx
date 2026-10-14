import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const COPY = {
  invite: {
    title: 'Welcome — set your password',
    body: (email: string) => `You've been given access to the convention dashboard${email ? ` as ${email}` : ''}. Choose a password to finish.`,
    button: 'Set password and continue',
  },
  recovery: {
    title: 'Choose a new password',
    body: (email: string) => `This replaces the current password${email ? ` for ${email}` : ''}.`,
    button: 'Update password',
  },
  magiclink: {
    title: "You're signed in",
    body: (email: string) => `Set a password${email ? ` for ${email}` : ''} so you can sign in with your email and password next time, or skip and continue to the dashboard.`,
    button: 'Set password and continue',
  },
} as const;

/** Shown after an invite, password-reset or magic-link email link; the link has already signed the user in. */
export function ResetPasswordPage() {
  const { updatePassword, logout, passwordRecovery, dismissPasswordSetup, user, isLoading } = useAuth();
  const kind = passwordRecovery || 'recovery';
  const copy = COPY[kind];
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setSaving(true);
    try {
      await updatePassword(password);
      if (kind === 'recovery') {
        addToast({ type: 'success', title: 'Password updated', description: 'Sign in with your new password.' });
        await logout();
        navigate('/login', { replace: true });
      } else {
        // Invited staff and magic-link sign-ins stay signed in and go straight to their dashboard.
        addToast({ type: 'success', title: kind === 'invite' ? 'Welcome aboard' : 'Password set', description: 'Your password is saved.' });
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to update the password.';
      // No session means the email link expired or was already used before it could sign in.
      setError(/session/i.test(message) ? 'This link has expired or was already used. Use "Forgot password?" on the sign-in page to get a new one.' : message);
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    dismissPasswordSetup();
    navigate('/admin/dashboard', { replace: true });
  };

  const inputClass = 'portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 text-sm text-portal-ink outline-none dark:bg-[#1E1E1C]';

  if (isLoading) {
    return (
      <main className="portal-theme portal-canvas grid min-h-[100dvh] place-items-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" />
      </main>
    );
  }

  return (
    <main className="portal-theme portal-canvas grid min-h-[100dvh] place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] space-y-4 rounded-[32px] border border-portal-line bg-white p-6 shadow-surface dark:bg-portal-surface sm:p-9">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-portal-ink">{copy.title}</h1>
          <p className="mt-2 text-sm text-portal-label">{copy.body(user?.email ?? '')}</p>
        </div>
        {error && <p role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <input type="password" autoComplete="new-password" placeholder="New password (at least 8 characters)" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
        <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={event => setConfirm(event.target.value)} className={inputClass} />
        <button type="submit" disabled={saving} className="flex h-[52px] w-full items-center justify-center rounded-full bg-portal-dark text-sm font-semibold text-white disabled:opacity-70">
          {saving ? 'Saving…' : copy.button}
        </button>
        {kind === 'magiclink' && (
          <button type="button" onClick={skip} disabled={saving} className="flex h-11 w-full items-center justify-center rounded-full border border-portal-line text-sm font-medium text-portal-ink">
            Skip for now
          </button>
        )}
      </form>
    </main>
  );
}
