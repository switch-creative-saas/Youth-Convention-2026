import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';

export type DevQuickLoginOption = {
  label: string;
  email: string;
  password: string;
};

type DevQuickLoginProps = {
  visible?: boolean;
  options: DevQuickLoginOption[];
  disabled?: boolean;
  activeEmail?: string;
  onSelect: (option: DevQuickLoginOption) => void;
};

export function DevQuickLogin({ visible = true, options, disabled = false, activeEmail, onSelect }: DevQuickLoginProps) {
  if (!visible || !(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true')) return null;

  return (
    <section className="mt-7 border-t border-portal-line pt-5 dark:border-white/10" aria-label="Development quick login">
      <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-portal-label dark:text-white/35">
        <Code2 className="h-3.5 w-3.5 text-portal-ink dark:text-portal-ink" />
        Quick Login <span className="text-portal-label dark:text-white/20">.</span> Dev Mode
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {options.map(option => {
          const active = activeEmail === option.email;

          return (
            <motion.button
              key={option.email}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={`group relative min-w-28 overflow-hidden rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-portal-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? 'border-portal-line bg-portal-surface text-portal-ink dark:border-portal-line dark:bg-portal-surface dark:text-portal-ink'
                  : 'border-portal-line bg-white/45 text-portal-label hover:border-portal-line hover:bg-white/70 hover:text-portal-ink dark:border-white/10 dark:bg-white/[0.045] dark:text-white/58 dark:hover:border-portal-line dark:hover:bg-white/[0.08] dark:hover:text-white'
              }`}
              whileHover={{ y: -1, scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
            >
              <span className="pointer-events-none absolute inset-0 bg-portal-accent opacity-0 transition group-hover:opacity-10" />
              <span className="relative">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
