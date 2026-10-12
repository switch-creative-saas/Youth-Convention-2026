import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Code2,
  HelpCircle,
  Laptop,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import youthLogo from '@/assets/youth-logo.png';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow?: string;
  compactVisual?: boolean;
  showBackToLogin?: boolean;
  showHeader?: boolean;
};

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
];

export function AuthLayout({ children, eyebrow = 'Convention Portal', compactVisual = false, showBackToLogin = false, showHeader = true }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <main className="portal-theme portal-canvas min-h-screen overflow-hidden">
      {showHeader && <AuthHeader eyebrow={eyebrow} showBackToLogin={showBackToLogin} />}
      <section className="grid min-h-screen lg:grid-cols-2">
        <AuthVisual compact={compactVisual} />
        <div className={`relative flex min-h-screen items-center justify-center px-5 sm:px-8 lg:px-12 ${showHeader ? 'py-24' : 'py-10'}`}>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_65%_20%,rgba(138,138,133,0.10),transparent_32%),radial-gradient(circle_at_20%_82%,rgba(138,138,133,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_65%_18%,rgba(138,138,133,0.16),transparent_34%),radial-gradient(circle_at_22%_78%,rgba(138,138,133,0.10),transparent_30%)]" />
          <motion.div
            className="w-full max-w-[430px]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="sr-only focus:not-sr-only focus:fixed focus:bottom-4 focus:right-4 focus:z-50 focus:rounded-xl focus:bg-portal-dark focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Return to login
          </button>
        </div>
      </section>
    </main>
  );
}

export function AuthHeader({ eyebrow = 'Convention Portal', showBackToLogin = false, homeHref = '/login', hireDeveloperHref = '/convention/hire' }: { eyebrow?: string; showBackToLogin?: boolean; homeHref?: string; hireDeveloperHref?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2">
        <Link to={homeHref} className="portal-focus flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-portal-line bg-portal-from px-3 py-1.5">
          <img src={youthLogo} alt="MOSYF logo" className="h-8 w-8 rounded-lg object-contain ring-1 ring-portal-accent dark:ring-white/10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-portal-ink dark:text-white">MOSYF</p>
            <p className="truncate text-[11px] font-medium text-portal-label dark:text-white/50">{eyebrow}</p>
          </div>
        </Link>
        <nav aria-label="Portal navigation" className="flex shrink-0 items-center gap-1.5 rounded-full bg-portal-from">
          {hireDeveloperHref && (
            <Link to={hireDeveloperHref} aria-label="Hire a Developer" title="Hire a Developer" className="portal-focus inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-portal-line px-3 text-xs text-portal-ink">
              <Code2 aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Hire a Developer</span>
            </Link>
          )}
          {showBackToLogin && (
            <Link to="/login" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-portal-label transition hover:bg-portal-surface focus:outline-none focus:ring-2 focus:ring-portal-accent dark:text-white/65 dark:hover:bg-white/10 sm:flex">
              <ArrowLeft className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
          <a href="mailto:help@mosyf.org" className="portal-focus grid h-11 w-11 place-items-center rounded-full border border-portal-line text-portal-label" aria-label="Help" title="Help">
            <HelpCircle className="h-4 w-4" />
          </a>
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Theme preference" title="Theme preference" className="portal-focus grid h-11 w-11 place-items-center rounded-full border border-portal-line text-portal-ink">
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'system' ? <Laptop className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-portal-line bg-portal-from text-portal-ink">
        <DropdownMenuRadioGroup value={theme} onValueChange={value => setTheme(value as ThemePreference)}>
          {themeOptions.map(({ value, label, icon: Icon }) => <DropdownMenuRadioItem key={value} value={value} className="min-h-11 gap-2 rounded-full focus:bg-portal-accent focus:text-portal-accent-ink"><Icon className="h-4 w-4" />{label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex rounded-xl border border-portal-line bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.06]" role="group" aria-label="Theme preference">
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`grid h-7 w-7 place-items-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-portal-accent ${
            theme === value ? 'bg-portal-dark text-white shadow-sm dark:bg-portal-dark dark:text-white' : 'text-portal-label hover:text-portal-ink dark:text-white/55 dark:hover:text-white'
          }`}
          aria-label={`${label} mode`}
          title={`${label} mode`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

export function AuthVisual({ compact = false }: { compact?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false });
  const current = useRef({ x: 0.5, y: 0.5 });
  const target = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      setPointer(prev => ({ ...prev, x: current.current.x, y: current.current.y }));
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion]);

  const movePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    target.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    setPointer(prev => ({ ...prev, active: true }));
  };

  return (
    <aside
      ref={panelRef}
      onPointerMove={movePointer}
      onPointerLeave={() => setPointer(prev => ({ ...prev, active: false }))}
      className={`relative overflow-hidden bg-portal-dark text-white ${compact ? 'hidden md:block lg:block' : 'hidden lg:block'}`}
      style={{
        '--mx': `${pointer.x * 100}%`,
        '--my': `${pointer.y * 100}%`,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-portal-dark" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.88)_0.7px,transparent_0.8px)] [background-size:22px_22px]" />
      <motion.div
        className="absolute h-72 w-72 rounded-full bg-portal-surface blur-3xl"
        animate={{ opacity: pointer.active ? 1 : 0, x: `calc(${pointer.x * 100}vw - 12rem)`, y: `calc(${pointer.y * 100}vh - 12rem)` }}
        transition={{ duration: 0.35 }}
      />

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-8 xl:p-12">
        <motion.div className="mt-20 max-w-xl" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/70 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-portal-accent" /> Mountain of Solution Youth Fellowship
          </div>
          <h1 className="max-w-lg text-5xl font-black leading-[0.94] tracking-tight xl:text-6xl">MOSYF Convention Portal</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/68">Connecting the youth. Building community. Creating a convention experience that moves with you.</p>
        </motion.div>

        <MountainScene x={pointer.x} y={pointer.y} />

        <div className="grid max-w-lg grid-cols-3 gap-3 text-xs text-white/55">
          {['Fast access', 'Secure roles', 'Live convention'].map(item => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl">
              <Check className="mb-3 h-4 w-4 text-portal-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,rgba(18,18,18,0.62))]" />
    </aside>
  );
}

function MountainScene({ x, y }: { x: number; y: number }) {
  const shiftX = (x - 0.5) * 28;
  const shiftY = (y - 0.5) * 22;

  return (
    <div className="absolute inset-x-0 bottom-16 h-[48vh] min-h-[380px]">
      <motion.div
        className="absolute left-[18%] top-[10%] h-64 w-64 rounded-full bg-portal-surface blur-3xl"
        style={{ transform: `translate3d(${shiftX * 0.5}px, ${shiftY * 0.4}px, 0)` }}
      />
      <motion.svg
        viewBox="0 0 720 520"
        className="absolute inset-x-0 bottom-0 h-full w-full"
        style={{ transform: `translate3d(${shiftX * 0.18}px, ${shiftY * 0.16}px, 0)` }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="authMountainLine" x1="90" x2="640" y1="120" y2="440">
            <stop stopColor="var(--accent)" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="var(--accent)" stopOpacity="0.62" />
            <stop offset="1" stopColor="var(--muted)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="authGlassPlane" x1="120" x2="600" y1="130" y2="440">
            <stop stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <motion.path d="M52 418 L212 192 L316 332 L424 106 L668 418" fill="none" stroke="url(#authMountainLine)" strokeWidth="2" strokeLinecap="round" />
        <motion.path d="M98 418 L250 248 L350 366 L466 188 L636 418" fill="none" stroke="rgba(255,255,255,0.23)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M212 192 L316 332 L424 106 L668 418 L52 418 Z" fill="url(#authGlassPlane)" />
        <path d="M250 248 L350 366 L466 188 L636 418 L98 418 Z" fill="rgba(255,255,255,0.035)" />
        {Array.from({ length: 13 }, (_, index) => {
          const cx = 105 + index * 45;
          const cy = 350 - Math.sin(index * 0.8) * 54;
          return <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 2.3 : 1.4} fill="rgba(138,138,133,0.58)" />;
        })}
        <path d="M98 418 C202 360 282 382 362 338 C450 290 540 344 636 260" fill="none" stroke="rgba(138,138,133,0.22)" strokeWidth="1" strokeDasharray="8 12" />
      </motion.svg>
    </div>
  );
}

export function AuthPanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-8">
      <motion.div className="mb-5 flex items-center gap-3 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <img src={youthLogo} alt="MOSYF logo" className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <p className="text-sm font-bold">MOSYF</p>
          <p className="text-xs text-portal-label dark:text-white/50">Convention Portal</p>
        </div>
      </motion.div>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-3xl font-black tracking-tight text-portal-ink dark:text-white sm:text-4xl">{title}</h2>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
      <p className="mt-3 text-sm leading-6 text-portal-label dark:text-white/54">{subtitle}</p>
    </div>
  );
}

export function AuthErrorState({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, x: [0, -4, 4, -2, 2, 0] }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
