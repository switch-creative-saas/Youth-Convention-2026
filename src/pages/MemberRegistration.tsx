import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { AuthHeader } from '@/components/auth/AuthExperience';
import youthLogo from '@/assets/youth-logo.png';
import { ConventionTag, type TagAttendee } from '@/components/ConventionTag';
import { useToast } from '@/contexts/ToastContext';
import { sendRegistrationConfirmation } from '@/lib/registrationEmail';
import { createTagImage, tagImageForEmail } from '@/lib/tagImage';
import { getRegistrationForm, registerAttendee, type RegistrationForm } from '@/lib/api';
import { compressPhoto, uploadRegistrationPhoto } from '@/lib/photos';
import { statusUrl } from '@/lib/supabase';

const steps = ['Personal Information', 'Church Information', 'Fellowship', 'Confirmation', 'Complete'];
const NONE = 'none';

type FormState = {
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female' | '';
  dateOfBirth: string;
  address: string;
  occupation: string;
  emergencyContact: string;
  churchLocationId: string;
  profilePhoto: string;
  bandId: string;
  departmentIds: string[];
  noDepartment: boolean;
  isFirstTimer: boolean | null;
  wantsPermanentMembership: boolean | null;
};

type RegisteredMember = TagAttendee & {
  statusToken: string;
  registeredAt: string;
  email: string;
  phoneNumber: string;
};

const initialForm: FormState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  address: '',
  occupation: '',
  emergencyContact: '',
  churchLocationId: '',
  profilePhoto: '',
  bandId: '',
  departmentIds: [],
  noDepartment: false,
  isFirstTimer: null,
  wantsPermanentMembership: null,
};

function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value));
}


export function MemberRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const [formData, setFormData] = useState<RegistrationForm | null>(null);
  const [formState, setFormState] = useState<'loading' | 'ready' | 'invalid'>(token ? 'loading' : 'invalid');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<RegisteredMember | null>(null);
  const [emailingMemberId, setEmailingMemberId] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getRegistrationForm(token)
      .then(data => {
        if (cancelled) return;
        if (!data || data.kind !== 'member') { setFormState('invalid'); return; }
        setFormData(data);
        setFormState('ready');
      })
      .catch(() => { if (!cancelled) setFormState('invalid'); });
    return () => { cancelled = true; };
  }, [token]);

  const eventName = formData?.event.name ?? 'Youth convention';
  const normalizedEmail = form.email.trim().toLowerCase();

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    setProcessingPhoto(true);
    try {
      const { blob, dataUrl } = await compressPhoto(file);
      setPhotoBlob(blob);
      update('profilePhoto', dataUrl);
    } catch (error) {
      setErrors(prev => ({ ...prev, profilePhoto: error instanceof Error ? error.message : 'Unable to use this photo.' }));
    } finally {
      setProcessingPhoto(false);
    }
  };

  const toggleDepartment = (departmentId: string) => {
    setForm(prev => {
      if (departmentId === NONE) {
        return { ...prev, noDepartment: !prev.noDepartment, departmentIds: [] };
      }
      const departmentIds = prev.departmentIds.includes(departmentId)
        ? prev.departmentIds.filter(item => item !== departmentId)
        : [...prev.departmentIds, departmentId];
      return { ...prev, departmentIds, noDepartment: false };
    });
    setErrors(prev => { const next = { ...prev }; delete next.departments; return next; });
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.profilePhoto) nextErrors.profilePhoto = 'Upload a clear photo for the convention tag.';
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone number is required.';
      if (!form.email.trim()) nextErrors.email = 'Email address is required.';
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
      if (!form.gender) nextErrors.gender = 'Select gender.';
      if (!form.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.';
      if (!form.address.trim()) nextErrors.address = 'Address is required.';
      if (!form.occupation.trim()) nextErrors.occupation = 'Occupation or school is required.';
      if (!form.emergencyContact.trim()) nextErrors.emergencyContact = 'Emergency contact is required.';
    }

    if (step === 1) {
      if (!form.bandId) nextErrors.fellowshipBand = 'Select a fellowship band.';
      if (formData?.churchLocations.length && !form.churchLocationId) nextErrors.churchBranch = 'Select a church branch.';
      if (formData?.departments.length && form.departmentIds.length === 0 && !form.noDepartment) nextErrors.departments = 'Select at least one department or None.';
    }

    if (step === 2) {
      if (form.isFirstTimer === null) nextErrors.isFirstTimer = 'Select an option.';
      if (form.isFirstTimer && form.wantsPermanentMembership === null) {
        nextErrors.wantsPermanentMembership = 'Select a permanent membership response.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep(current => Math.min(current + 1, steps.length - 1));
  };

  const previous = () => setStep(current => Math.max(current - 1, 0));

  const submit = async () => {
    if (!token || !formData) return;
    if (!validateStep()) return;
    setSubmitting(true);

    try {
      const photoPath = photoBlob ? await uploadRegistrationPhoto(formData.photoPathPrefix, photoBlob) : null;
      const bandId = form.bandId === NONE ? null : form.bandId;
      const result = await registerAttendee(token, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: normalizedEmail,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
        occupation: form.occupation.trim(),
        emergencyContact: form.emergencyContact.trim(),
        churchLocationId: form.churchLocationId || null,
        bandId,
        departmentIds: form.departmentIds,
        isFirstTimer: form.isFirstTimer === true,
        wantsPermanentMembership: form.isFirstTimer ? form.wantsPermanentMembership : null,
        photoPath,
      });

      const member: RegisteredMember = {
        code: result.code,
        statusToken: result.statusToken,
        registeredAt: result.registeredAt,
        fullName: form.fullName.trim(),
        email: normalizedEmail,
        phoneNumber: form.phoneNumber.trim(),
        conventionGroup: result.groupName ?? 'Unassigned',
        fellowshipBand: formData.bands.find(band => band.id === bandId)?.name ?? 'None',
        departments: formData.departments.filter(department => form.departmentIds.includes(department.id)).map(department => department.name),
        leadershipRole: '',
        profilePhoto: form.profilePhoto,
      };
      setRegisteredMember(member);
      setEmailingMemberId(member.code);
      setStep(3);
      addToast({ type: 'success', title: 'Registration complete', description: `${member.code} has been generated.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      if (/email/i.test(message)) { setErrors({ email: message }); setStep(0); }
      addToast({ type: 'error', title: 'Registration failed', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTag = async () => {
    if (!tagRef.current || !registeredMember) return;

    try {
      const imageUrl = await createTagImage(registeredMember, eventName);
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `${registeredMember.code}-convention-tag.png`;
      anchor.click();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to generate image.',
      });
    }
  };

  useEffect(() => {
    if (!registeredMember || emailingMemberId !== registeredMember.code) return;

    let cancelled = false;

    const sendEmail = async () => {
      try {
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        // The attachment is optional: on slow phones the email goes out without it rather than not at all.
        const imageUrl = await tagImageForEmail(registeredMember, eventName);
        if (cancelled) return;

        const result = await sendRegistrationConfirmation(registeredMember.statusToken, { tagPng: imageUrl });
        if (!cancelled) {
          setEmailingMemberId('');
          if (result.status === 'sent') addToast({ type: 'success', title: 'Confirmation email sent', description: `Your convention details and tag were sent to ${registeredMember.email}.` });
        }
      } catch (error) {
        if (!cancelled) {
          setEmailingMemberId('');
          addToast({
            type: 'warning',
            title: 'Confirmation email not sent',
            description: `${error instanceof Error ? error.message : 'Unable to send the email.'} Download your tag below and keep your status link.`,
            duration: 7000,
          });
        }
      }
    };

    void sendEmail();

    return () => {
      cancelled = true;
    };
  }, [addToast, emailingMemberId, registeredMember, eventName]);

  const printTag = () => window.print();

  const inputClass = (field: keyof FormState) =>
    `glass-input w-full ${errors[field] ? 'border-red-500 ring-[3px] ring-red-500/15' : ''}`;

  if (formState === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center portal-theme portal-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" />
      </main>
    );
  }

  if (formState === 'invalid' || !formData) {
    return (
      <main className="min-h-screen portal-theme portal-canvas">
        <AuthHeader eyebrow="Member Onboarding" homeHref="/convention/status" hireDeveloperHref="/convention/hire" />
        <section className="flex min-h-screen items-center justify-center px-5 py-24">
          <motion.div
            className="w-full max-w-md rounded-[28px] border border-portal-line bg-white/75 p-8 text-center shadow-[0_24px_80px_rgba(138,138,133,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black">Admin Link Required</h1>
            <p className="mt-3 text-sm leading-6 text-portal-label dark:text-white/55">This registration link isn't valid or has expired. Please request a fresh member invitation from an admin.</p>
            <button onClick={() => navigate('/convention/status')} className="mt-7 rounded-2xl bg-portal-dark px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 dark:bg-portal-dark dark:text-white">
              Convention Status
            </button>
          </motion.div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen portal-theme portal-canvas">
      <AuthHeader eyebrow="Member Onboarding" homeHref="/convention/status" hireDeveloperHref={registeredMember ? `/convention/status/${registeredMember.statusToken}/hire` : '/convention/hire'} />
      <section className="no-print min-h-screen px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden rounded-[30px] border border-white/10 bg-portal-dark p-5 text-white shadow-surface sm:p-6">
            <div className="absolute inset-0 bg-portal-dark" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img src={youthLogo} alt="MOSYF logo" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">{eventName}</p>
                <h1 className="text-2xl font-black leading-tight">Member Onboarding</h1>
              </div>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-4 lg:overflow-visible">
              {steps.slice(0, 4).map((label, index) => (
                <div key={label} className="flex shrink-0 items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-full border ${index <= step ? 'border-white bg-white text-portal-accent-ink' : 'border-white/20 text-white/45'}`}>
                    {index < step ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`text-sm ${index <= step ? 'font-semibold text-white' : 'text-white/50'} lg:block`}>{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/12 bg-white/[0.07] p-4 lg:mt-10">
              <p className="text-sm text-white/70">Your member ID is generated when you register and is used for fingerprint check-in at the convention. You are placed in a group automatically.</p>
              {formData.groups.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {formData.groups.map(group => (
                    <span key={group.id} className={group.forUnbanded ? 'rounded-lg bg-white px-3 py-2 font-semibold text-portal-accent-ink' : 'rounded-lg bg-white/10 px-3 py-2'}>
                      {group.name}{group.forUnbanded ? ' (no band)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
            </div>
          </aside>

          <div className="portal-card min-w-0 rounded-[30px] p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="identity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={UserRound} title="Personal information" subtitle="These details will appear on the final convention tag." />

                  <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                    <div>
                      <label className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed bg-portal-from text-center transition ${errors.profilePhoto ? 'border-red-400' : 'border-portal-line hover:border-portal-accent'}`}>
                        {processingPhoto ? (
                          <span className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" />
                        ) : form.profilePhoto ? (
                          <img src={form.profilePhoto} alt="Uploaded member" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex flex-col items-center px-6 text-sm text-portal-label">
                            <Camera className="mb-3 h-10 w-10 text-portal-ink" />
                            Upload a clear photo
                          </span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={event => void handlePhoto(event.target.files?.[0])} />
                      </label>
                      {errors.profilePhoto && <ErrorText>{errors.profilePhoto}</ErrorText>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name" error={errors.fullName} className="sm:col-span-2">
                        <input className={inputClass('fullName')} value={form.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Enter full name" />
                      </Field>
                      <Field label="Phone Number" error={errors.phoneNumber}>
                        <input className={inputClass('phoneNumber')} value={form.phoneNumber} onChange={event => update('phoneNumber', event.target.value)} placeholder="+234..." />
                      </Field>
                      <Field label="Email Address" error={errors.email}>
                        <input type="email" className={inputClass('email')} value={form.email} onChange={event => update('email', event.target.value)} placeholder="name@email.com" />
                      </Field>
                      <Field label="Gender" error={errors.gender}>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Male', 'Female'] as const).map(gender => (
                            <SelectPill key={gender} selected={form.gender === gender} onClick={() => update('gender', gender)}>{gender}</SelectPill>
                          ))}
                        </div>
                      </Field>
                      <Field label="Date of Birth" error={errors.dateOfBirth}>
                        <input type="date" className={inputClass('dateOfBirth')} value={form.dateOfBirth} onChange={event => update('dateOfBirth', event.target.value)} />
                      </Field>
                      <Field label="Address" error={errors.address} className="sm:col-span-2">
                        <textarea className={`${inputClass('address')} min-h-24 py-3`} value={form.address} onChange={event => update('address', event.target.value)} placeholder="Residential address" />
                      </Field>
                      <Field label="Occupation/School" error={errors.occupation}>
                        <input className={inputClass('occupation')} value={form.occupation} onChange={event => update('occupation', event.target.value)} placeholder="Student, worker, school..." />
                      </Field>
                      <Field label="Emergency Contact" error={errors.emergencyContact}>
                        <input className={inputClass('emergencyContact')} value={form.emergencyContact} onChange={event => update('emergencyContact', event.target.value)} placeholder="Emergency phone number" />
                      </Field>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="church" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={UsersRound} title="Fellowship and departments" subtitle="Animated glass cards make each selection clear before submission." />

                  <Field label="Which fellowship band do you belong to?" error={errors.fellowshipBand}>
                    <div className="grid gap-3 sm:grid-cols-5">
                      {[...formData.bands, { id: NONE, name: 'None', color: null }].map(band => (
                        <GlassChoice
                          key={band.id}
                          label={band.name}
                          selected={form.bandId === band.id}
                          color={band.color || 'var(--accent)'}
                          onClick={() => update('bandId', band.id)}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="mt-6">
                    <Field label="Church Branch" error={errors.churchBranch}>
                      <select className={inputClass('churchLocationId')} value={form.churchLocationId} onChange={event => { update('churchLocationId', event.target.value); setErrors(prev => { const next = { ...prev }; delete next.churchBranch; return next; }); }}>
                        <option value="">Select a church location</option>
                        {formData.churchLocations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-6">
                    <Field label="Which department(s) do you serve in?" error={errors.departments}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[...formData.departments, { id: NONE, name: 'None' }].map(department => (
                          <GlassChoice
                            key={department.id}
                            label={department.name}
                            selected={department.id === NONE ? form.noDepartment : form.departmentIds.includes(department.id)}
                            color={department.id === NONE ? 'var(--muted)' : 'var(--accent)'}
                            onClick={() => toggleDepartment(department.id)}
                          />
                        ))}
                      </div>
                    </Field>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="first-timer" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={ShieldCheck} title="First timer details" subtitle="Permanent membership response is stored with the registration record." />

                  <Field label="Are you a first timer?" error={errors.isFirstTimer}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DecisionCard selected={form.isFirstTimer === true} title="Yes" description="This is my first time attending." onClick={() => update('isFirstTimer', true)} />
                      <DecisionCard selected={form.isFirstTimer === false} title="No" description="I have attended before." onClick={() => { update('isFirstTimer', false); update('wantsPermanentMembership', null); }} />
                    </div>
                  </Field>

                  <AnimatePresence>
                    {form.isFirstTimer === true && (
                      <motion.div className="mt-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Field label="Would you like to become a permanent member of Mountain of Solution Youth Fellowship?" error={errors.wantsPermanentMembership}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DecisionCard selected={form.wantsPermanentMembership === true} title="Yes" description="Register me as a permanent member." onClick={() => update('wantsPermanentMembership', true)} />
                            <DecisionCard selected={form.wantsPermanentMembership === false} title="No" description="Convention registration only." onClick={() => update('wantsPermanentMembership', false)} />
                          </div>
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="tag" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  {registeredMember ? (
                    <>
                      <Header icon={BadgeCheck} title="Convention tag ready" subtitle="Download or print this tag immediately for convention access." />
                      <div className="grid gap-6 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
                        <ConventionTag member={registeredMember} eventName={eventName} refProp={tagRef} />
                        <div className="min-w-0 space-y-4">
                          <div className="rounded-2xl border border-portal-line bg-portal-surface p-5">
                            <h3 className="font-bold text-portal-ink">Convention tag details</h3>
                            <div className="mt-4 grid gap-3 text-sm">
                              {[
                                ['Name', registeredMember.fullName],
                                ['Member ID', registeredMember.code],
                                ['Assigned group', registeredMember.conventionGroup],
                                ['Fellowship band', registeredMember.fellowshipBand],
                                ['Departments', registeredMember.departments.join(', ')],
                                ['Registration date', formatRegistrationDate(registeredMember.registeredAt)],
                              ].map(([label, value]) => (
                                <div key={label} className="grid gap-1 rounded-xl bg-portal-surface p-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                                  <span className="text-xs font-semibold uppercase text-portal-label">{label}</span>
                                  <span className="break-words font-medium text-portal-ink">{value || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button onClick={() => void downloadTag()} className="gradient-btn flex items-center justify-center gap-2">
                              <Download className="h-4 w-4" /> Download PNG
                            </button>
                            <button onClick={printTag} className="flex items-center justify-center gap-2 rounded-2xl border border-portal-line bg-portal-surface px-6 py-3 text-sm font-semibold text-portal-ink transition hover:bg-portal-surface">
                              <Printer className="h-4 w-4" /> Print / Save PDF
                            </button>
                          </div>
                          <button onClick={() => navigate(`/convention/status/${registeredMember.statusToken}`)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-portal-line px-6 py-3 text-sm font-semibold text-portal-ink">
                            View my convention status
                          </button>
                          <p className="text-xs leading-5 text-portal-label">
                            Bookmark your status page:{' '}
                            <span className="break-all text-portal-ink">{statusUrl(registeredMember.statusToken)}</span>
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                      <Header icon={BadgeCheck} title="Tag not generated yet" subtitle="Complete the registration details first so a member ID, group, QR code, and convention tag can be created." />
                      <button onClick={() => setStep(0)} className="gradient-btn">
                        Return to registration
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {step < 3 && (
              <div className="mt-8 flex items-center justify-between border-t border-portal-line pt-5">
                <button onClick={previous} className={`flex min-h-11 items-center gap-2 rounded-full border border-portal-line px-4 py-2 text-sm font-semibold text-portal-ink transition hover:bg-portal-surface ${step === 0 ? 'invisible' : ''}`}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                {step < 2 ? (
                  <button onClick={next} className="flex min-h-11 items-center gap-2 rounded-full bg-portal-dark px-5 py-2 text-sm font-semibold text-white">
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => void submit()} disabled={submitting || processingPhoto} className="flex min-h-11 items-center gap-2 rounded-full bg-portal-dark px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                    {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
                    Complete Registration
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {registeredMember && (
        <section className="hidden print:block">
          <ConventionTag member={registeredMember} eventName={eventName} />
        </section>
      )}
    </main>
  );
}

function Header({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-portal-accent text-portal-accent-ink">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-portal-ink">{title}</h2>
        <p className="mt-1 text-sm text-portal-label">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-portal-ink">{label}</span>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs font-semibold text-red-600">{children}</p>;
}

function SelectPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`h-12 rounded-xl border text-sm font-bold transition ${selected ? 'border-portal-line bg-portal-dark text-white' : 'border-portal-line bg-portal-surface text-portal-label hover:border-portal-line'}`}>
      {children}
    </button>
  );
}

function GlassChoice({ label, selected, color, onClick }: { label: string; selected: boolean; color: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative min-h-24 overflow-hidden rounded-2xl border p-4 text-left shadow-sm backdrop-blur transition"
      style={{
        borderColor: selected ? color : 'var(--surface-line)',
        background: selected ? 'var(--dark-card)' : 'var(--surface)',
        color: selected ? 'white' : 'var(--ink)',
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10 flex items-center justify-between gap-3 text-sm font-black">
        {label}
        {selected && <Check className="h-4 w-4" />}
      </span>
      <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-portal-surface" />
      <span className="absolute bottom-3 left-4 h-1 w-12 rounded-full bg-current opacity-30" />
    </motion.button>
  );
}

function DecisionCard({ selected, title, description, onClick }: { selected: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${selected ? 'border-portal-accent bg-portal-accent text-portal-accent-ink shadow-lg shadow-surface' : 'border-portal-line bg-portal-surface text-portal-ink hover:border-portal-accent'}`}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="flex items-center justify-between text-lg font-black">
        {title}
        {selected && <Check className="h-5 w-5" />}
      </span>
      <span className={selected ? 'mt-2 block text-sm text-portal-accent-ink' : 'mt-2 block text-sm text-portal-label'}>{description}</span>
    </motion.button>
  );
}
