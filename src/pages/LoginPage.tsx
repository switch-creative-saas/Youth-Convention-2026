import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import youthLogo from '@/assets/youth-logo.png';
import { DevQuickLogin, type DevQuickLoginOption } from '@/components/auth/DevQuickLogin';
import { LoginIllustration } from '@/components/auth/LoginIllustration';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';

const DEV_LOGIN_OPTIONS: DevQuickLoginOption[] = [
  { label: 'Super Admin', email: 'superadmin@mosyf.org', password: 'admin123' },
  { label: 'Executive', email: 'executive@mosyf.org', password: 'exec123' },
];

function dashboardPath(role?: string) {
  if (role === 'super_admin' || role === 'admin') return '/admin/dashboard';
  if (role === 'executive') return '/executive/dashboard';
  if (role === 'member') return '/member/home';
  return '/login';
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const completeLogin = (role?: string) => { setSuccess(true); window.setTimeout(() => navigate(dashboardPath(role), { replace: true }), 520); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) { addToast({ type: 'success', title: 'Welcome back.', description: 'Taking you to your dashboard.' }); completeLogin(result.role); }
      else { setError("Those credentials don't match our records."); addToast({ type: 'error', title: 'Sign in failed', description: "Those credentials don't match our records." }); }
    } catch { setError('Something went wrong. Please check your connection and try again.'); addToast({ type: 'error', title: 'Network error', description: 'Please check your connection and try again.' }); }
    finally { setLoading(false); }
  };
  const handleDevLogin = async (option: DevQuickLoginOption) => {
    setEmail(option.email); setPassword(option.password); setError(''); setLoading(true);
    try {
      const result = await login(option.email, option.password);
      if (result.success) { addToast({ type: 'success', title: 'Logged in as ' + option.label, description: 'Development shortcut authenticated.' }); completeLogin(result.role); }
      else setError("Those development credentials don't match our records.");
    } catch { setError('Something went wrong. Please check your connection and try again.'); }
    finally { setLoading(false); }
  };

  return <main className="portal-theme portal-canvas min-h-[100dvh] overflow-x-hidden">
    <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-5 sm:px-8">
      <Link to="/login" aria-label="MOSYF login" className="portal-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-portal-line px-3 text-sm font-medium text-portal-ink"><img src={youthLogo} alt="" className="h-7 w-7 object-contain" /> MOSYF</Link>
      <div className="flex items-center gap-2"><button type="button" onClick={toggleTheme} aria-label="Change theme" title="Change theme" className="portal-focus grid h-11 w-11 place-items-center rounded-full border border-portal-line text-portal-ink">{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button><Link to="/register/member" className="portal-focus inline-flex min-h-11 items-center rounded-full border border-portal-line px-3 text-xs font-medium text-portal-ink sm:px-4 sm:text-sm">Have a registration link?</Link></div>
    </header>
    <section className="relative mx-auto flex min-h-[calc(100dvh-84px)] max-w-[1400px] items-center justify-center px-4 pb-8 sm:px-8">
      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 lg:block"><LoginIllustration side="left" /></div><div className="absolute right-4 top-1/2 hidden -translate-y-1/2 lg:block"><LoginIllustration side="right" /></div>
      <motion.div className="relative z-10 w-full max-w-[420px] rounded-[32px] border border-portal-line bg-white p-6 shadow-[0_20px_60px_rgb(40_37_22_/_0.12)] dark:bg-portal-surface sm:p-9" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="mb-7 text-center"><h1 className="text-3xl font-semibold text-portal-ink">Welcome back</h1><p className="mx-auto mt-2 max-w-[250px] text-sm leading-6 text-portal-label">Sign in to your MOSYF Convention Portal.</p></div>
        {error && <p role="alert" className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div><label htmlFor="email" className="sr-only">Email address</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required aria-invalid={Boolean(error)} className="portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 text-sm text-portal-ink outline-none placeholder:text-portal-label focus:border-portal-accent focus:ring-2 focus:ring-portal-accent/45 dark:bg-[#1E1E1C]" /></div>
          <div><label htmlFor="password" className="sr-only">Password</label><div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" required aria-invalid={Boolean(error)} className="portal-focus h-[52px] w-full rounded-2xl border border-portal-line bg-white px-4 pr-16 text-sm text-portal-ink outline-none placeholder:text-portal-label focus:border-portal-accent focus:ring-2 focus:ring-portal-accent/45 dark:bg-[#1E1E1C]" /><button type="button" onClick={() => setShowPassword(current => !current)} className="portal-focus absolute right-2 top-1/2 min-h-9 -translate-y-1/2 px-2 text-xs font-medium text-portal-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
          <button type="button" onClick={() => setForgotOpen(true)} className="portal-focus text-left text-sm font-medium text-portal-ink">Forgot password?</button>
          <motion.button type="submit" disabled={loading || success} className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-portal-dark px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-75 dark:bg-portal-accent dark:text-portal-accent-ink" whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>{loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white dark:border-portal-ink/25 dark:border-t-portal-ink" /> : success ? 'Welcome back' : <>Sign In <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>}</motion.button>
        </form>
        <DevQuickLogin visible={import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'} options={DEV_LOGIN_OPTIONS} disabled={loading || success} activeEmail={email} onSelect={handleDevLogin} />
        <p className="mt-7 text-center text-xs text-portal-label">Have a registration link? <Link to="/register/member" className="font-semibold text-portal-ink underline underline-offset-4">Register now</Link></p>
      </motion.div>
    </section>
    {forgotOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title"><div className="w-full max-w-sm rounded-[28px] border border-portal-line bg-portal-from p-6 shadow-surface"><h2 id="forgot-password-title" className="text-lg font-semibold text-portal-ink">Password help</h2><p className="mt-2 text-sm leading-6 text-portal-label">Please contact a convention admin to reset your password.</p><button type="button" onClick={() => setForgotOpen(false)} className="portal-focus mt-5 min-h-11 rounded-full bg-portal-dark px-5 text-sm font-medium text-white">Close</button></div></div>}
  </main>;
}
