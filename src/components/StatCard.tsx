import { motion, useReducedMotion } from 'framer-motion';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { BigStat } from '@/components/ui-kit/BigStat';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  trend?: string;
  trendUp?: boolean;
  isLive?: boolean;
  delay?: number;
}

export function StatCard({ icon: Icon, label, value, isLive, delay = 0 }: StatCardProps) {
  const reducedMotion = useReducedMotion();
  const { count } = useAnimatedCounter(value, 220, !reducedMotion);

  return (
    <motion.div
      className="min-w-0"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: reducedMotion ? 0 : Math.min(delay, 0.08) }}
    >
      <BigStat value={reducedMotion ? value : count} label={label} icon={Icon} labelBadge={isLive ? <span className="rounded-full bg-portal-accent px-2 py-0.5 text-[10px] font-medium text-portal-accent-ink">Live</span> : undefined} />
    </motion.div>
  );
}
