import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function ResetPasswordPage() {
  const { updatePassword, logout, passwordRecovery, user } = useAuth();
  const isInvite = passwordRecovery === 'invite';
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
      if (isInvite) {
        // Invited staff stay signed in and go straight to their dashboard.
        addToast({ type: 'success', title: 'Welcome aboard', description: 'Your password is set.' });
        navigate('/admin/dashboard', { replace: true });
      } else {
        addToast({ type: 'success', title: 'Password updated', description: 'Sign in with your new password.' });
        await logout();
        navigate('/login', { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the password.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 text-sm text-portal-ink outline-none dark:bg-[#1E1E1C]';

  return (
    <main className="portal-theme portal-canvas grid min-h-[100dvh] place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] space-y-4 rounded-[32px] border border-portal-line bg-white p-6 shadow-surface dark:bg-portal-surface sm:p-9">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-portal-ink">{isInvite ? 'Welcome — set your password' : 'Choose a new password'}</h1>
          <p className="mt-2 text-sm text-portal-label">
            {isInvite ? `You've been given access to the convention dashboard${user?.email ? ` as ${user.email}` : ''}. Choose a password to finish.` : 'This replaces your current password.'}
          </p>
        </div>
        {error && <p role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <input type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
        <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={event => setConfirm(event.target.value)} className={inputClass} />
        <button type="submit" disabled={saving} className="flex h-[52px] w-full items-center justify-center rounded-full bg-portal-dark text-sm font-semibold text-white disabled:opacity-70">
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
