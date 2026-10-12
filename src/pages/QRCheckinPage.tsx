import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, XCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { AuthHeader } from '@/components/auth/AuthExperience';
import { getAttendeeStatus, type AttendeeStatus } from '@/lib/api';
import { downloadCanvas } from '@/lib/format';

/** Personal check-in QR: encodes the attendee code, which the check-in desk can scan into the lookup field. */
export function QRCheckinPage() {
  const { token } = useParams();
  // Tagged with the token it belongs to, so loading is derived instead of set inside the effect.
  const [result, setResult] = useState<{ token?: string; status: AttendeeStatus | null }>({ status: null });
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAttendeeStatus(token)
      .then(status => { if (!cancelled) setResult({ token, status }); })
      .catch(() => { if (!cancelled) setResult({ token, status: null }); });
    return () => { cancelled = true; };
  }, [token]);

  const loading = Boolean(token) && result.token !== token;
  const status = result.token === token ? result.status : null;

  return (
    <div className="portal-theme portal-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-8 pt-28">
      <AuthHeader homeHref={token ? `/convention/status/${token}` : '/convention/status'} hireDeveloperHref="/convention/hire" />
      <motion.div className="w-full max-w-[420px]" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}>
        <div className="portal-card p-5 text-center sm:p-8">
          {loading ? (
            <div className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></div>
          ) : !status ? (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-300" />
              <h2 className="mt-4 font-display text-2xl font-bold text-portal-ink">Check-in code not found</h2>
              <p className="mt-2 text-sm text-portal-label">This link is invalid or the registration was removed.</p>
              <Link to="/convention/status" className="mt-6 inline-flex rounded-full bg-portal-dark px-5 py-2.5 text-sm font-medium text-white">Search status</Link>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-2xl text-portal-ink mb-2">Scan to Check In</h2>
              <p className="text-sm text-portal-label mb-6">Show this code at the check-in desk</p>
              <div className="flex justify-center mb-6">
                <div className="p-1 rounded-[24px]" style={{ background: 'var(--accent)' }}>
                  <div ref={qrRef} className="bg-white p-5 rounded-[20px]">
                    <QRCodeCanvas value={status.code} size={220} marginSize={2} />
                  </div>
                </div>
              </div>
              <h3 className="font-display font-semibold text-lg text-portal-ink">{status.fullName}</h3>
              <p className="font-mono text-sm text-portal-ink mt-1">{status.code}</p>
              <p className="text-xs text-portal-label mt-3">{status.event.name}</p>
              <motion.button onClick={() => downloadCanvas(qrRef.current, `${status.code}-check-in.png`)} className="mt-6 flex min-h-11 items-center gap-2 mx-auto px-6 py-2.5 rounded-full bg-portal-dark text-white text-sm font-medium transition-colors" whileTap={{ scale: 0.97 }}>
                <Download className="w-4 h-4" /> Save to Phone
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
