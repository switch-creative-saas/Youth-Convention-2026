import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, LogIn, ShieldAlert, Upload } from 'lucide-react';
import { AuthHeader } from '@/components/auth/AuthExperience';
import { useAppData } from '@/contexts/AppDataContext';
import { addRegisteredAuthUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sendRegistrationConfirmation } from '@/lib/registrationEmail';
import { EXECUTIVE_ROLES } from '@/types';
import type { FellowshipBand, Department } from '@/types';

export function ExecutiveRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addExecutive, bands, departments, validateGeneratedLink, recordGeneratedLinkUse, getStatusUrl } = useAppData();
  const { addToast } = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const registrationLink = validateGeneratedLink('executive', token);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newId, setNewId] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    leadershipRole: '',
    department: '' as Department | '',
    fellowshipBand: '' as FellowshipBand | '',
    phoneNumber: '',
    email: '',
    address: '',
    profilePhoto: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Please select an image file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update('profilePhoto', String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!registrationLink) {
      addToast({ type: 'error', title: 'Invalid executive registration link' });
      return;
    }

    if (!form.fullName || !form.leadershipRole || !form.department || !form.fellowshipBand || !form.phoneNumber || !form.email || !form.address || !form.profilePhoto) {
      addToast({ type: 'error', title: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));

    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const exec = addExecutive({
        fullName: form.fullName.trim(),
        leadershipRole: form.leadershipRole,
        department: form.department as Department,
        fellowshipBand: form.fellowshipBand as FellowshipBand,
        phoneNumber: form.phoneNumber.trim(),
        email: normalizedEmail,
        address: form.address.trim(),
        profilePhoto: form.profilePhoto,
      });
      const password = `exec-${exec.id.slice(-4)}`;

      addRegisteredAuthUser({
        email: exec.email,
        password,
        user: { email: exec.email, name: exec.fullName, role: 'executive' },
      });
      recordGeneratedLinkUse(registrationLink.id);
      setNewId(exec.id);
      setTempPassword(password);
      setSuccess(true);
      addToast({ type: 'success', title: 'Executive registration complete!', description: 'Preparing confirmation email...' });

      try {
        await sendRegistrationConfirmation({
          type: 'executive',
          to: exec.email,
          subject: 'Your MOSYF Convention Registration is Confirmed',
          statusUrl: getStatusUrl(exec),
          tagUrl: getStatusUrl(exec),
          executive: {
            id: exec.id,
            fullName: exec.fullName,
            email: exec.email,
            phoneNumber: exec.phoneNumber,
            leadershipRole: exec.leadershipRole,
            department: exec.department,
            fellowshipBand: exec.fellowshipBand,
            registeredAt: exec.registeredAt,
            temporaryPassword: password,
          },
        });
        addToast({ type: 'success', title: 'Confirmation email sent', description: `Dashboard details were sent to ${exec.email}.` });
      } catch (emailError) {
        addToast({
          type: 'warning',
          title: 'Email not sent automatically',
          description: emailError instanceof Error ? emailError.message : 'Unable to send confirmation email.',
          duration: 7000,
        });
      }
    } catch (error) {
      addToast({ type: 'error', title: error instanceof Error ? error.message : 'Unable to complete registration' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'glass-input w-full';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden portal-theme portal-canvas p-4 pt-28">
      <AuthHeader eyebrow="Executive Onboarding" showBackToLogin />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(138,138,133,0.20),transparent_30%),radial-gradient(circle_at_75%_75%,rgba(138,138,133,0.14),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(138,138,133,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(138,138,133,0.12)_1px,transparent_1px)] [background-size:48px_48px] dark:opacity-[0.14] dark:[background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)]" />
      <motion.div
        className="relative z-10 w-full max-w-[620px]"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="rounded-[30px] border border-portal-line bg-white/82 p-6 shadow-[0_28px_90px_rgba(138,138,133,0.13)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-white/[0.065] sm:p-8"
        >
          {!registrationLink ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black">Admin Link Required</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-portal-label dark:text-white/55">
                Executive registration is restricted to active links generated by an admin. This link may be invalid or expired.
              </p>
              <button onClick={() => navigate('/login')} className="mt-6 rounded-2xl bg-portal-dark px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 dark:bg-portal-dark dark:text-white">
                Go to Login
              </button>
            </div>
          ) : !success ? (
            <>
              <div className="mb-7">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-portal-ink dark:text-portal-ink">Invitation verified</p>
                <h2 className="text-3xl font-black tracking-tight">Executive Leadership Registration</h2>
                <p className="mt-2 text-sm text-portal-label dark:text-white/52">Create your MOSYF executive portal profile.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Full Name *</label>
                  <input className={inputClass} value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Full Name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Leadership Role *</label>
                  <select className={inputClass} value={form.leadershipRole} onChange={e => update('leadershipRole', e.target.value)}>
                    <option value="">Select Role</option>
                    {EXECUTIVE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Department *</label>
                  <select className={inputClass} value={form.department} onChange={e => update('department', e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.filter(department => department.active).map(department => <option key={department.id} value={department.name}>{department.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Fellowship Band *</label>
                  <select className={inputClass} value={form.fellowshipBand} onChange={e => update('fellowshipBand', e.target.value)}>
                    <option value="">Select Band</option>
                    {bands.filter(band => band.active).map(band => <option key={band.id} value={band.name}>{band.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Phone Number *</label>
                  <input className={inputClass} value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} placeholder="+234..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Email *</label>
                  <input type="email" className={inputClass} value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Home Address *</label>
                  <textarea className={`${inputClass} min-h-[60px]`} value={form.address} onChange={e => update('address', e.target.value)} placeholder="Your address" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70">Profile Photo *</label>
                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-portal-line bg-portal-surface transition-colors hover:border-portal-line dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-portal-line">
                    {form.profilePhoto ? (
                      <img src={form.profilePhoto} alt="Profile preview" className="w-24 h-24 rounded-full object-cover border-4 border-white/60 shadow-lg" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-portal-label" />
                        <p className="text-xs text-portal-label">Click to upload executive profile photo</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={e => handlePhotoChange(e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <motion.button
                onClick={submit}
                disabled={submitting}
                className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-portal-dark text-sm font-bold text-white shadow-[0_18px_44px_rgba(138,138,133,0.28)] transition-all disabled:opacity-80"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Register as Executive <ArrowRight className="h-4 w-4" /></>}
              </motion.button>
            </>
          ) : (
            <motion.div className="text-center py-6" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-portal-surface text-portal-ink">
                <Check className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-portal-ink">Registration Complete</h3>
              <div className="mt-4 inline-block font-mono font-bold text-lg text-portal-ink bg-portal-surface px-6 py-3 rounded-xl">{newId}</div>
              <p className="text-sm text-portal-label mt-3">Your Executive ID</p>
              <div className="mt-4 rounded-2xl bg-portal-surface dark:bg-white/5 border border-portal-line dark:border-white/10 p-4 text-left">
                <p className="text-xs uppercase tracking-wider text-portal-label">Dashboard Access</p>
                <p className="text-sm text-portal-ink dark:text-portal-label mt-2">Email: <span className="font-medium">{form.email.trim().toLowerCase()}</span></p>
                <p className="text-sm text-portal-ink dark:text-portal-label mt-1">Temporary password: <span className="font-mono font-semibold">{tempPassword}</span></p>
              </div>
              <motion.button onClick={() => navigate('/login')} className="mt-6 gradient-btn flex items-center gap-2 px-6 py-2.5 mx-auto" whileTap={{ scale: 0.97 }}>
                <LogIn className="w-4 h-4" /> Go to Login
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
