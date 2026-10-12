import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function DataTable({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('portal-data-table min-w-full', className)} {...props} />;
}
