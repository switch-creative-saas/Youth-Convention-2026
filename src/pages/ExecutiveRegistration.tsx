import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ShieldAlert, Ticket, Upload } from 'lucide-react';
import { AuthHeader } from '@/components/auth/AuthExperience';
import { useToast } from '@/contexts/ToastContext';
import { sendRegistrationConfirmation } from '@/lib/registrationEmail';
import { getRegistrationForm, registerAttendee, type RegistrationForm } from '@/lib/api';
import { compressPhoto, uploadRegistrationPhoto } from '@/lib/photos';
import { statusUrl } from '@/lib/supabase';

export function ExecutiveRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const [formData, setFormData] = useState<RegistrationForm | null>(null);
  const [formState, setFormState] = useState<'loading' | 'ready' | 'invalid'>(token ? 'loading' : 'invalid');
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ code: string; statusToken: string } | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    leadershipRole: '',
    departmentId: '',
    bandId: '',
    phoneNumber: '',
    email: '',
    address: '',
    profilePhoto: '',
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getRegistrationForm(token)
      .then(data => {
        if (cancelled) return;
        if (!data || data.kind !== 'executive') { setFormState('invalid'); return; }
        setFormData(data);
        setFormState('ready');
      })
      .catch(() => { if (!cancelled) setFormState('invalid'); });
    return () => { cancelled = true; };
  }, [token]);

  const update = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = async (file?: File) => {
    if (!file) return;
    setProcessingPhoto(true);
    try {
      const { blob, dataUrl } = await compressPhoto(file);
      setPhotoBlob(blob);
      update('profilePhoto', dataUrl);
    } catch (error) {
      addToast({ type: 'error', title: error instanceof Error ? error.message : 'Unable to use this photo.' });
    } finally {
      setProcessingPhoto(false);
    }
  };

  const submit = async () => {
    if (!token || !formData) return;
    const needsDepartment = formData.departments.length > 0;
    const needsBand = formData.bands.length > 0;
    if (!form.fullName.trim() || !form.leadershipRole.trim() || (needsDepartment && !form.departmentId) || (needsBand && !form.bandId) || !form.phoneNumber.trim() || !form.email.trim() || !form.address.trim() || !photoBlob) {
      addToast({ type: 'error', title: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    try {
      const email = form.email.trim().toLowerCase();
      const photoPath = await uploadRegistrationPhoto(formData.photoPathPrefix, photoBlob);
      const registered = await registerAttendee(token, {
        fullName: form.fullName.trim(),
        leadershipRole: form.leadershipRole.trim(),
        departmentIds: form.departmentId ? [form.departmentId] : [],
        bandId: form.bandId || null,
        phoneNumber: form.phoneNumber.trim(),
        email,
        address: form.address.trim(),
        photoPath,
      });
      setResult({ code: registered.code, statusToken: registered.statusToken });
      addToast({ type: 'success', title: 'Executive registration complete!' });

      try {
        const sent = await sendRegistrationConfirmation({
          type: 'executive',
          to: email,
          subject: `Your ${formData.event.name} registration is confirmed`,
          statusUrl: statusUrl(registered.statusToken),
          tagUrl: statusUrl(registered.statusToken),
          executive: {
            id: registered.code,
            fullName: form.fullName.trim(),
            email,
            phoneNumber: form.phoneNumber.trim(),
            leadershipRole: form.leadershipRole,
            department: formData.departments.find(item => item.id === form.departmentId)?.name ?? '',
            fellowshipBand: formData.bands.find(item => item.id === form.bandId)?.name ?? 'None',
            registeredAt: registered.registeredAt,
          },
        });
        if (sent) addToast({ type: 'success', title: 'Confirmation email sent', description: `Your status link was sent to ${email}.` });
      } catch (emailError) {
        addToast({ type: 'warning', title: 'Email not sent automatically', description: emailError instanceof Error ? emailError.message : undefined, duration: 7000 });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Unable to complete registration', description: error instanceof Error ? error.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'glass-input w-full';
  const label = 'mb-2 block text-sm font-semibold text-portal-ink dark:text-white/70';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden portal-theme portal-canvas p-4 pt-28">
      <AuthHeader eyebrow="Executive Onboarding" homeHref="/convention/status" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(138,138,133,0.20),transparent_30%),radial-gradient(circle_at_75%_75%,rgba(138,138,133,0.14),transparent_30%)]" />
      <motion.div className="relative z-10 w-full max-w-[620px]" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <div className="rounded-[30px] border border-portal-line bg-white/82 p-6 shadow-[0_28px_90px_rgba(138,138,133,0.13)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-white/[0.065] sm:p-8">
          {formState === 'loading' ? (
            <div className="grid place-items-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></div>
          ) : formState === 'invalid' || !formData ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><ShieldAlert className="w-8 h-8" /></div>
              <h2 className="text-2xl font-black">Admin Link Required</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-portal-label dark:text-white/55">Executive registration is restricted to active links generated by an admin. This link may be invalid or expired.</p>
              <button onClick={() => navigate('/convention/status')} className="mt-6 rounded-2xl bg-portal-dark px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">Convention Status</button>
            </div>
          ) : !result ? (
            <>
              <div className="mb-7">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-portal-ink">{formData.event.name}</p>
                <h2 className="text-3xl font-black tracking-tight">Executive Leadership Registration</h2>
                <p className="mt-2 text-sm text-portal-label dark:text-white/52">Register as an executive for {formData.workspaceName}.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className={label}>Full Name *</label><input className={inputClass} value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Full Name" /></div>
                <div>
                  <label className={label}>Leadership Role *</label>
                  {formData.leadershipRoles.length > 0 ? (
                    <select className={inputClass} value={form.leadershipRole} onChange={e => update('leadershipRole', e.target.value)}>
                      <option value="">Select Role</option>
                      {formData.leadershipRoles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
                    </select>
                  ) : (
                    <input className={inputClass} value={form.leadershipRole} onChange={e => update('leadershipRole', e.target.value)} placeholder="e.g. Secretary" />
                  )}
                </div>
                {formData.departments.length > 0 && (
                  <div>
                    <label className={label}>Department *</label>
                    <select className={inputClass} value={form.departmentId} onChange={e => update('departmentId', e.target.value)}>
                      <option value="">Select Department</option>
                      {formData.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </div>
                )}
                {formData.bands.length > 0 && (
                  <div>
                    <label className={label}>Fellowship Band *</label>
                    <select className={inputClass} value={form.bandId} onChange={e => update('bandId', e.target.value)}>
                      <option value="">Select Band</option>
                      {formData.bands.map(band => <option key={band.id} value={band.id}>{band.name}</option>)}
                    </select>
                  </div>
                )}
                <div><label className={label}>Phone Number *</label><input className={inputClass} value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} placeholder="+234..." /></div>
                <div className="sm:col-span-2"><label className={label}>Email *</label><input type="email" className={inputClass} value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" /></div>
                <div className="sm:col-span-2"><label className={label}>Home Address *</label><textarea className={`${inputClass} min-h-[60px]`} value={form.address} onChange={e => update('address', e.target.value)} placeholder="Your address" /></div>
                <div className="sm:col-span-2">
                  <label className={label}>Profile Photo *</label>
                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-portal-line bg-portal-surface transition-colors dark:border-white/10 dark:bg-white/[0.035]">
                    {processingPhoto ? <span className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /> : form.profilePhoto ? (
                      <img src={form.profilePhoto} alt="Profile preview" className="w-24 h-24 rounded-full object-cover border-4 border-white/60 shadow-lg" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-portal-label" />
                        <p className="text-xs text-portal-label">Click to upload executive profile photo</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={e => void handlePhotoChange(e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <motion.button onClick={() => void submit()} disabled={submitting || processingPhoto} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-portal-dark text-sm font-bold text-white shadow-[0_18px_44px_rgba(138,138,133,0.28)] transition-all disabled:opacity-80" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Register as Executive <ArrowRight className="h-4 w-4" /></>}
              </motion.button>
            </>
          ) : (
            <motion.div className="text-center py-6" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-portal-surface text-portal-ink"><Check className="h-10 w-10" /></div>
              <h3 className="text-2xl font-black text-portal-ink">Registration Complete</h3>
              <div className="mt-4 inline-block font-mono font-bold text-lg text-portal-ink bg-portal-surface px-6 py-3 rounded-xl">{result.code}</div>
              <p className="text-sm text-portal-label mt-3">Your Executive ID</p>
              <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-portal-label">Keep your status link to view and print your convention tag: <span className="break-all text-portal-ink">{statusUrl(result.statusToken)}</span></p>
              <motion.button onClick={() => navigate(`/convention/status/${result.statusToken}`)} className="mt-6 gradient-btn flex items-center gap-2 px-6 py-2.5 mx-auto" whileTap={{ scale: 0.97 }}>
                <Ticket className="w-4 h-4" /> View my convention status
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
