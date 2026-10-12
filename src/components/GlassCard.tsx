import { Card } from '@/components/ui-kit/Card';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, onClick }: GlassCardProps) {
  return (
    <Card className={className} hover={hover} onClick={onClick}>
      {children}
    </Card>
  );
}
