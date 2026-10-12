export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

/** Downloads rows as a UTF-8 CSV (opens directly in Excel). */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Downloads the first <canvas> inside an element as PNG (used for QR codes). */
export function downloadCanvas(container: HTMLElement | null, filename: string) {
  const canvas = container?.querySelector('canvas');
  if (!canvas) return;
  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = filename;
  anchor.click();
}

const FALLBACK_COLORS = ['var(--dark-card)', 'var(--accent)', 'var(--muted)', 'var(--bg-to)', 'var(--label-ink)'];
export function seriesColor(index: number, color?: string | null) {
  return color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/** Short number printed on a tag: the last segment of the attendee code (MOSYF-2026-0042 -> 0042). */
export function tagNumber(code: string) {
  return code.split('-').pop() ?? code;
}
