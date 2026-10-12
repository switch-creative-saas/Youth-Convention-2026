import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { bandColors as BAND_COLORS } from '@/components/ui-kit/palette';
import { useNavigate } from 'react-router-dom';

export function MemberProfile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { members } = useAppData();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const member = members.find(m => m.email === user?.email) || members[0];
  const bandColor = BAND_COLORS[member.fellowshipBand];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <motion.h2 className="font-display font-bold text-2xl text-portal-ink dark:text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        My Profile
      </motion.h2>

      {/* Profile Card */}
      <motion.div
        className="rounded-3xl p-6 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08] text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-portal-dark font-display text-2xl font-bold text-white shadow-lg">
          {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <h3 className="font-display font-bold text-xl text-portal-ink dark:text-white mt-4">{member.fullName}</h3>
        <p className="text-sm text-portal-label mt-1">{member.email}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--surface)', color: bandColor }}>{member.fellowshipBand}</span>
          {member.departments.slice(0, 3).map(d => (
            <span key={d} className="px-3 py-1 rounded-full text-xs font-medium bg-portal-surface text-portal-ink">{d}</span>
          ))}
        </div>
      </motion.div>

      {/* Details */}
      <motion.div
        className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      >
        <h3 className="font-display font-semibold text-base text-portal-ink dark:text-white mb-4">Personal Information</h3>
        <div className="space-y-3">
          {[
            { label: 'Phone', value: member.phoneNumber },
            { label: 'Gender', value: member.gender },
            { label: 'Date of Birth', value: new Date(member.dateOfBirth).toLocaleDateString() },
            { label: 'Address', value: member.address },
            { label: 'Occupation', value: member.occupation },
            { label: 'Emergency Contact', value: member.emergencyContact },
            { label: 'Church Branch', value: member.churchBranch },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-portal-line dark:border-white/[0.04] last:border-0">
              <span className="text-sm text-portal-label">{item.label}</span>
              <span className="text-sm font-medium text-portal-ink dark:text-portal-label">{item.value}</span>
            </div>
          ))}
        </div>
        <motion.button
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-portal-line dark:border-white/10 text-sm font-medium text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/5"
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowEditModal(true)}
        >
          <Pencil className="w-4 h-4" /> Edit Profile
        </motion.button>
      </motion.div>

      {/* Settings */}
      <motion.div
        className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      >
        <h3 className="font-display font-semibold text-base text-portal-ink dark:text-white mb-4">Settings</h3>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between py-3 border-b border-portal-line dark:border-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-portal-label" />}
            <span className="text-sm text-portal-ink dark:text-portal-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div className={`relative w-12 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-portal-dark' : 'bg-portal-surface'}`}>
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 py-3 text-red-500 mt-1"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-4">Edit Profile</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-portal-label">Full Name</label><input className="glass-input w-full mt-1" defaultValue={member.fullName} /></div>
              <div><label className="text-xs text-portal-label">Phone</label><input className="glass-input w-full mt-1" defaultValue={member.phoneNumber} /></div>
              <div><label className="text-xs text-portal-label">Email</label><input className="glass-input w-full mt-1" defaultValue={member.email} /></div>
              <div><label className="text-xs text-portal-label">Address</label><textarea className="glass-input w-full mt-1 min-h-[60px]" defaultValue={member.address} /></div>
              <div><label className="text-xs text-portal-label">Occupation</label><input className="glass-input w-full mt-1" defaultValue={member.occupation} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-portal-line text-sm font-medium text-portal-ink hover:bg-portal-surface">Cancel</button>
              <button onClick={() => { setShowEditModal(false); addToast({ type: 'success', title: 'Profile updated!' }); }} className="flex-1 py-2.5 rounded-xl gradient-btn text-sm font-medium">Save</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-2">Logout?</h3>
            <p className="text-sm text-portal-label mb-4">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-portal-line text-sm font-medium text-portal-ink hover:bg-portal-surface">Cancel</button>
              <button onClick={handleLogout} className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-medium text-white">Logout</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
