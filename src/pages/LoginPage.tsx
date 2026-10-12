import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import youthLogo from '@/assets/youth-logo.png';
import { LoginIllustration } from '@/components/auth/LoginIllustration';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resetError, setResetError] = useState('');
  const { login, requestPasswordReset, user, isLoading, authLinkError } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (!isLoading && user && !success) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccess(true);
        addToast({ type: 'success', title: 'Welcome back.', description: 'Taking you to your dashboard.' });
        window.setTimeout(() => navigate('/admin/dashboard', { replace: true }), 520);
      } else {
        setError(result.error ?? "Those credentials don't match our records.");
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (event: React.FormEvent) => {
    event.preventDefault(); setResetError(''); setResetState('sending');
    try {
      await requestPasswordReset(resetEmail);
      setResetState('sent');
    } catch (cause) {
      setResetError(cause instanceof Error ? cause.message : 'Unable to send the reset email.');
      setResetState('idle');
    }
  };

  const closeForgot = () => { setForgotOpen(false); setResetState('idle'); setResetError(''); };

  return <main className="portal-theme portal-canvas min-h-[100dvh] overflow-x-hidden">
    <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-5 sm:px-8">
      <Link to="/login" aria-label="MOSYF login" className="portal-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-portal-line px-3 text-sm font-medium text-portal-ink"><img src={youthLogo} alt="" className="h-7 w-7 object-contain" /> MOSYF</Link>
      <div className="flex items-center gap-2"><button type="button" onClick={toggleTheme} aria-label="Change theme" title="Change theme" className="portal-focus grid h-11 w-11 place-items-center rounded-full border border-portal-line text-portal-ink">{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button><Link to="/convention/status" className="portal-focus inline-flex min-h-11 items-center rounded-full border border-portal-line px-3 text-xs font-medium text-portal-ink sm:px-4 sm:text-sm">Check convention status</Link></div>
    </header>
    <section className="relative mx-auto flex min-h-[calc(100dvh-84px)] max-w-[1400px] items-center justify-center px-4 pb-8 sm:px-8">
      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 lg:block"><LoginIllustration side="left" /></div><div className="absolute right-4 top-1/2 hidden -translate-y-1/2 lg:block"><LoginIllustration side="right" /></div>
      <motion.div className="relative z-10 w-full max-w-[420px] rounded-[32px] border border-portal-line bg-white p-6 shadow-[0_20px_60px_rgb(40_37_22_/_0.12)] dark:bg-portal-surface sm:p-9" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="mb-7 text-center"><h1 className="text-3xl font-semibold text-portal-ink">Welcome back</h1><p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-portal-label">Sign in to your convention admin dashboard.</p></div>
        {authLinkError && !error && <p role="alert" className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">That email link has expired or was already used ({authLinkError}). Ask your admin to send a new invite, or use "Forgot password?".</p>}
        {error && <p role="alert" className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div><label htmlFor="email" className="sr-only">Email address</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required aria-invalid={Boolean(error)} className="portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 text-sm text-portal-ink outline-none placeholder:text-portal-label focus:border-portal-accent focus:ring-2 focus:ring-portal-accent/45 dark:bg-[#1E1E1C]" /></div>
          <div><label htmlFor="password" className="sr-only">Password</label><div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" required aria-invalid={Boolean(error)} className="portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 pr-16 text-sm text-portal-ink outline-none placeholder:text-portal-label focus:border-portal-accent focus:ring-2 focus:ring-portal-accent/45 dark:bg-[#1E1E1C]" /><button type="button" onClick={() => setShowPassword(current => !current)} className="portal-focus absolute right-2 top-1/2 min-h-9 -translate-y-1/2 px-2 text-xs font-medium text-portal-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
          <button type="button" onClick={() => { setResetEmail(email); setForgotOpen(true); }} className="portal-focus text-left text-sm font-medium text-portal-ink">Forgot password?</button>
          <motion.button type="submit" disabled={loading || success || !email || !password} className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-portal-dark px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-75 dark:bg-portal-accent dark:text-portal-accent-ink" whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>{loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white dark:border-portal-ink/25 dark:border-t-portal-ink" /> : success ? 'Welcome back' : <>Sign In <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>}</motion.button>
        </form>
        <p className="mt-7 text-center text-xs text-portal-label">Attendees don't sign in. Use the registration link from your admin, or <Link to="/convention/status" className="font-semibold text-portal-ink underline underline-offset-4">check your status</Link>.</p>
      </motion.div>
    </section>
    {forgotOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
      <form onSubmit={sendReset} className="w-full max-w-sm rounded-[28px] border border-portal-line bg-portal-from p-6 shadow-surface">
        <h2 id="forgot-password-title" className="text-lg font-semibold text-portal-ink">Reset your password</h2>
        {resetState === 'sent' ? (
          <p className="mt-2 text-sm leading-6 text-portal-label">If an account exists for <span className="font-medium text-portal-ink">{resetEmail}</span>, a reset link is on its way. Open it on this device to choose a new password.</p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-portal-label">Enter your account email and we'll send you a link to set a new password.</p>
            <input type="email" required value={resetEmail} onChange={event => setResetEmail(event.target.value)} placeholder="Email address" className="portal-focus mt-4 h-12 w-full rounded-2xl border border-portal-line bg-white px-4 text-sm text-portal-ink outline-none dark:bg-[#1E1E1C]" />
            {resetError && <p className="mt-2 text-xs text-red-600">{resetError}</p>}
          </>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={closeForgot} className="portal-focus min-h-11 flex-1 rounded-full border border-portal-line px-5 text-sm font-medium text-portal-ink">Close</button>
          {resetState !== 'sent' && <button type="submit" disabled={resetState === 'sending' || !resetEmail} className="portal-focus min-h-11 flex-1 rounded-full bg-portal-dark px-5 text-sm font-medium text-white disabled:opacity-60">{resetState === 'sending' ? 'Sending…' : 'Send link'}</button>}
        </div>
      </form>
    </div>}
  </main>;
}
