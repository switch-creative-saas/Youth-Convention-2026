import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle, Clock } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function MemberAttendance() {
  const { members, attendance, addAttendance } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const member = members.find(m => m.email === user?.email) || members[0];
  const [scanning, setScanning] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const myAttendance = attendance.filter(a => a.memberId === member.id);
  const isAlreadyCheckedIn = myAttendance.some(a => {
    const today = new Date().toDateString();
    return new Date(a.checkInTime).toDateString() === today;
  });

  const handleCheckIn = async () => {
    if (isAlreadyCheckedIn) return;
    setScanning(true);
    await new Promise(r => setTimeout(r, 2000));
    setScanning(false);
    setCheckedIn(true);
    addAttendance({
      memberId: member.id,
      memberName: member.fullName,
      checkInTime: new Date().toISOString(),
      verificationMethod: 'biometric',
      status: 'present',
      sessionName: 'Morning Session Day 1',
    });
    addToast({ type: 'success', title: 'Checked in successfully!' });
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <motion.h2 className="font-display font-bold text-2xl text-portal-ink dark:text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        My Attendance
      </motion.h2>

      {/* Check-in Button */}
      <motion.button
        className={`w-full rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 transition-all ${
          isAlreadyCheckedIn || checkedIn
            ? 'bg-portal-surface dark:bg-white/5 cursor-not-allowed'
            : 'bg-portal-dark shadow-lg hover:shadow-xl'
        }`}
        onClick={handleCheckIn}
        disabled={scanning || isAlreadyCheckedIn || checkedIn}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        whileHover={!isAlreadyCheckedIn && !checkedIn ? { y: -4 } : undefined}
        whileTap={!isAlreadyCheckedIn && !checkedIn ? { scale: 0.97 } : undefined}
      >
        {scanning ? (
          <>
            <Fingerprint className="w-12 h-12 text-white animate-pulse" />
            <p className="font-display font-bold text-xl text-white">Scanning...</p>
            <p className="text-sm text-white/70">Place your finger on the sensor</p>
          </>
        ) : isAlreadyCheckedIn || checkedIn ? (
          <>
            <CheckCircle className="w-12 h-12 text-portal-ink" />
            <p className="font-display font-bold text-xl text-portal-ink dark:text-white">Checked In</p>
            <p className="text-sm text-portal-label">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        ) : (
          <>
            <Fingerprint className="w-12 h-12 text-white" />
            <p className="font-display font-bold text-xl text-white">Check In Now</p>
            <p className="text-sm text-white/70">Tap to mark your attendance</p>
          </>
        )}
      </motion.button>

      {/* Attendance History */}
      <motion.div
        className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      >
        <h3 className="font-display font-semibold text-base text-portal-ink dark:text-white mb-4">Attendance History</h3>
        <div className="space-y-3">
          {myAttendance.length === 0 ? (
            <p className="text-sm text-portal-label text-center py-4">No attendance records yet</p>
          ) : (
            myAttendance.slice(0, 8).map((record, i) => (
              <motion.div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-xl bg-portal-surface dark:bg-white/[0.03]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-portal-surface flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-portal-ink" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-portal-ink dark:text-portal-label">{record.sessionName}</p>
                    <p className="text-xs text-portal-label">{new Date(record.checkInTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-portal-ink font-medium">
                  <Clock className="w-3 h-3" />
                  {new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
