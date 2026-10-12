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
import { ConventionTag } from '@/components/ConventionTag';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { sendRegistrationConfirmation } from '@/lib/registrationEmail';
import { bandColors as BAND_COLORS } from '@/components/ui-kit/palette';
import type { Department, FellowshipBand, Member } from '@/types';

const steps = ['Personal Information', 'Church Information', 'Fellowship', 'Confirmation', 'Complete'];
const GROUPS = ['Group A', 'Group B', 'Group C', 'Group D'];

type FormState = {
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female' | '';
  dateOfBirth: string;
  address: string;
  occupation: string;
  emergencyContact: string;
  churchBranch: string;
  profilePhoto: string;
  fellowshipBand: FellowshipBand | '';
  departments: Department[];
  isFirstTimer: boolean | null;
  wantsPermanentMembership: boolean | null;
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
  churchBranch: '',
  profilePhoto: '',
  fellowshipBand: '',
  departments: [],
  isFirstTimer: null,
  wantsPermanentMembership: null,
};

function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value));
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawContainImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach(word => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[visibleLines.length - 1] ?? '';
    while (lastLine.length > 1 && context.measureText(`${lastLine}...`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[visibleLines.length - 1] = `${lastLine.trim()}...`;
  }

  visibleLines.forEach((item, index) => context.fillText(item, x, y + index * lineHeight));
}

function setFittedFont(context: CanvasRenderingContext2D, weight: number, size: number, family: string, text: string, maxWidth: number, minSize = 24) {
  let nextSize = size;
  do {
    context.font = `${weight} ${nextSize}px ${family}`;
    if (context.measureText(text).width <= maxWidth || nextSize <= minSize) break;
    nextSize -= 2;
  } while (nextSize >= minSize);
}

async function createTagImage(member: Member) {
  const canvas = document.createElement('canvas');
  canvas.width = 1184;
  canvas.height = 2008;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Unable to create tag image.');

  const imagePromises = [
    loadCanvasImage(youthLogo),
    member.profilePhoto ? loadCanvasImage(member.profilePhoto) : Promise.resolve(null),
  ] as const;

  const [youth, photo] = await Promise.all(imagePromises);
  const teal = '#069d92';
  const brightTeal = '#08b8ad';
  const orange = '#ff9f00';
  const charcoal = '#484848';

  const drawRing = (x: number, y: number, radius: number) => {
    context.save();
    context.fillStyle = brightTeal;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f7f7f7';
    context.beginPath();
    context.arc(x, y, radius - 28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = charcoal;
    context.beginPath();
    context.arc(x, y, radius - 58, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawDotGrid = (x: number, y: number, width: number, height: number) => {
    context.fillStyle = charcoal;
    for (let dotY = y + 6; dotY < y + height; dotY += 28) {
      for (let dotX = x + 6; dotX < x + width; dotX += 28) {
        context.beginPath();
        context.arc(dotX, dotY, 7, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  const drawStripes = (x: number, y: number, width: number, height: number) => {
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.strokeStyle = orange;
    context.lineWidth = 12;
    for (let offset = -height; offset < width + height; offset += 38) {
      context.beginPath();
      context.moveTo(x + offset, y);
      context.lineTo(x + offset + height, y + height);
      context.stroke();
    }
    context.restore();
  };

  const drawDiamond = (cx: number, cy: number, size: number) => {
    context.save();
    context.translate(cx, cy);
    context.rotate(Math.PI / 4);
    context.fillStyle = '#54b8ad';
    context.fillRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.56);
    context.strokeStyle = orange;
    context.lineWidth = 7;
    context.strokeRect(-size / 2, -size / 2, size, size);
    context.strokeRect(-size * 0.34, -size * 0.34, size * 0.68, size * 0.68);
    context.restore();
  };

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f7f7f7';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.strokeStyle = 'rgba(226,226,226,0.58)';
  context.lineWidth = 30;
  for (let offset = -canvas.height; offset < canvas.width; offset += 72) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + canvas.height, canvas.height);
    context.stroke();
  }
  context.restore();

  drawContainImage(context, youth, 72, 48, 124, 124);
  context.save();
  context.fillStyle = '#0b4a43';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  setFittedFont(context, 600, 44, '"Brush Script MT", "Segoe Script", cursive', 'Youth convention 2026', 370, 34);
  context.fillText('Youth convention 2026', 212, 110);
  context.restore();

  drawRing(1078, -34, 108);
  drawRing(640, 88, 108);
  drawRing(592, 1872, 108);
  drawRing(168, 1986, 108);
  drawDotGrid(774, 0, 148, 174);
  drawDotGrid(306, 1880, 160, 126);
  drawStripes(912, 88, 272, 140);
  drawStripes(0, 1740, 326, 140);
  drawDiamond(-58, 1128, 298);
  drawDiamond(1220, 620, 298);
  context.fillStyle = brightTeal;
  context.beginPath();
  context.arc(864, 186, 42, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(352, 1788, 42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#0b4a43';
  context.font = '600 48px Poppins, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(member.conventionGroup.toUpperCase(), 592, 312);

  context.fillStyle = charcoal;
  context.fillRect(300, 330, 580, 920);
  context.fillStyle = '#f7f7f7';
  context.fillRect(370, 352, 440, 44);
  context.fillRect(326, 398, 528, 820);
  if (photo) {
    drawCoverImage(context, photo, 326, 398, 528, 820);
  }
  context.fillStyle = charcoal;
  context.beginPath();
  context.moveTo(880, 1010);
  context.lineTo(880, 1250);
  context.lineTo(586, 1250);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(258, 1312);
  context.lineTo(1008, 1312);
  context.lineTo(940, 1534);
  context.lineTo(226, 1534);
  context.closePath();
  context.fillStyle = teal;
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '900 60px Poppins, Arial, sans-serif';
  setFittedFont(context, 900, 60, 'Poppins, Arial, sans-serif', member.fullName.toUpperCase(), 650, 36);
  drawWrappedText(context, member.fullName.toUpperCase(), 592, 1408, 650, 62, 2);

  context.beginPath();
  context.moveTo(246, 1448);
  context.lineTo(982, 1482);
  context.lineTo(936, 1582);
  context.lineTo(288, 1604);
  context.closePath();
  context.fillStyle = orange;
  context.fill();
  context.fillStyle = '#334155';
  context.font = '900 43px Poppins, Arial, sans-serif';
  setFittedFont(context, 900, 43, 'Poppins, Arial, sans-serif', member.fellowshipBand.toUpperCase(), 460, 30);
  context.fillText(member.fellowshipBand.toUpperCase(), 592, 1542);

  context.fillStyle = teal;
  roundedRect(context, 376, 1628, 428, 82, 14);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '800 34px Inter, Arial, sans-serif';
  context.fillText(`ID : ${member.id.replace(/^MOSYF-2026-/, '')}`, 590, 1681);

  context.strokeStyle = '#0b4a43';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(758, 1918);
  context.lineTo(1134, 1918);
  context.stroke();
  context.fillStyle = '#0b4a43';
  context.font = 'italic 28px Georgia, serif';
  context.textAlign = 'center';
  context.fillText('Youth Exco Signature', 956, 1974);

  return canvas.toDataURL('image/png');
}

export function MemberRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addMember, members, bands, departments, churchLocations, validateGeneratedLink, recordGeneratedLinkUse, getStatusUrl } = useAppData();
  const { addToast } = useToast();
  const token = new URLSearchParams(location.search).get('token');
  const registrationLink = validateGeneratedLink('member', token);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);
  const [emailingMemberId, setEmailingMemberId] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);

  const normalizedEmail = form.email.trim().toLowerCase();
  const emailExists = normalizedEmail
    ? members.some(member => member.email.trim().toLowerCase() === normalizedEmail)
    : false;

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 720;
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext('2d');

        if (!context) {
          update('profilePhoto', String(reader.result));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        update('profilePhoto', canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleDepartment = (department: Department) => {
    setForm(prev => {
      if (department === 'None') {
        return { ...prev, departments: prev.departments.includes('None') ? [] : ['None'] };
      }

      const withoutNone = prev.departments.filter(item => item !== 'None');
      const departments = withoutNone.includes(department)
        ? withoutNone.filter(item => item !== department)
        : [...withoutNone, department];

      return { ...prev, departments };
    });
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.profilePhoto) nextErrors.profilePhoto = 'Upload a clear photo for the convention tag.';
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone number is required.';
      if (!form.email.trim()) nextErrors.email = 'Email address is required.';
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
      if (emailExists) nextErrors.email = 'This email has already been used to register.';
      if (!form.gender) nextErrors.gender = 'Select gender.';
      if (!form.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.';
      if (!form.address.trim()) nextErrors.address = 'Address is required.';
      if (!form.occupation.trim()) nextErrors.occupation = 'Occupation or school is required.';
      if (!form.emergencyContact.trim()) nextErrors.emergencyContact = 'Emergency contact is required.';
    }

    if (step === 1) {
      if (!form.fellowshipBand) nextErrors.fellowshipBand = 'Select a fellowship band.';
      if (!form.churchBranch) nextErrors.churchBranch = 'Select a church branch.';
      if (form.departments.length === 0) nextErrors.departments = 'Select at least one department or None.';
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
    if (!registrationLink) {
      addToast({ type: 'error', title: 'Invalid registration link', description: "This registration link isn't valid." });
      return;
    }

    if (!validateStep()) return;
    setSubmitting(true);

    try {
      const member = addMember({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: normalizedEmail,
        gender: form.gender as 'Male' | 'Female',
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
        occupation: form.occupation.trim(),
        emergencyContact: form.emergencyContact.trim(),
        churchBranch: form.churchBranch,
        profilePhoto: form.profilePhoto,
        fellowshipBand: form.fellowshipBand as FellowshipBand,
        departments: form.departments.length ? form.departments : ['None'],
        isFirstTimer: form.isFirstTimer === true,
        wantsPermanentMembership: form.isFirstTimer ? form.wantsPermanentMembership : null,
      });

      setRegisteredMember(member);
      recordGeneratedLinkUse(registrationLink.id);
      setEmailingMemberId(member.id);
      setStep(3);
      addToast({ type: 'success', title: 'Registration complete', description: `${member.id} has been generated. Preparing confirmation email...` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      setErrors({ email: message });
      setStep(0);
      addToast({ type: 'error', title: 'Registration failed', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTag = async () => {
    if (!tagRef.current || !registeredMember) return;

    try {
      const imageUrl = await createTagImage(registeredMember);
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `${registeredMember.id}-convention-tag.png`;
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
    if (!registeredMember || emailingMemberId !== registeredMember.id) return;

    let cancelled = false;

    const sendEmail = async () => {
      try {
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        const imageUrl = await createTagImage(registeredMember);
        if (cancelled) return;

        await sendRegistrationConfirmation({
          type: 'member',
          to: registeredMember.email,
          subject: 'Your MOSYF Convention Registration is Confirmed',
          statusUrl: getStatusUrl(registeredMember),
          tagUrl: getStatusUrl(registeredMember),
          member: {
            id: registeredMember.id,
            fullName: registeredMember.fullName,
            email: registeredMember.email,
            phoneNumber: registeredMember.phoneNumber,
            fellowshipBand: registeredMember.fellowshipBand,
            conventionGroup: registeredMember.conventionGroup,
            departments: registeredMember.departments,
            registeredAt: registeredMember.registeredAt,
          },
          attachment: {
            filename: `${registeredMember.id}-convention-tag.png`,
            contentType: 'image/png',
            dataUrl: imageUrl,
          },
        });
        if (!cancelled) {
          setEmailingMemberId('');
          addToast({
            type: 'success',
            title: 'Confirmation email sent',
            description: `The convention tag was sent to ${registeredMember.email}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setEmailingMemberId('');
          addToast({
            type: 'warning',
            title: 'Email not sent automatically',
            description: error instanceof Error ? error.message : 'Unable to send confirmation email.',
            duration: 7000,
          });
        }
      }
    };

    void sendEmail();

    return () => {
      cancelled = true;
    };
  }, [addToast, emailingMemberId, registeredMember]);

  const printTag = () => window.print();

  const inputClass = (field: keyof FormState) =>
    `glass-input w-full ${errors[field] ? 'border-red-500 ring-[3px] ring-red-500/15' : ''}`;

  if (!registrationLink) {
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
      <AuthHeader eyebrow="Member Onboarding" homeHref="/convention/status" hireDeveloperHref={registeredMember?.statusToken ? `/convention/status/${registeredMember.statusToken}/hire` : '/convention/hire'} />
      <section className="no-print min-h-screen px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="relative overflow-hidden rounded-[30px] border border-white/10 bg-portal-dark p-5 text-white shadow-surface sm:p-6">
            <div className="absolute inset-0 bg-portal-dark" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img src={youthLogo} alt="MOSYF logo" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">MOSYF 2026</p>
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
              <p className="text-sm text-white/70">Member IDs are generated as searchable QR-linked records for biometric check-in and convention attendance.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {GROUPS.map(group => (
                  <span key={group} className="rounded-lg bg-white/10 px-3 py-2">{group}</span>
                ))}
                <span className="rounded-lg bg-white px-3 py-2 font-semibold text-portal-accent-ink">Group E for None</span>
              </div>
            </div>
            </div>
          </aside>

          <div className="portal-card rounded-[30px] p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="identity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={UserRound} title="Personal information" subtitle="These details will appear on the final convention tag." />

                  <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                    <div>
                      <label className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed bg-portal-from text-center transition ${errors.profilePhoto ? 'border-red-400' : 'border-portal-line hover:border-portal-accent'}`}>
                        {form.profilePhoto ? (
                          <img src={form.profilePhoto} alt="Uploaded member" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex flex-col items-center px-6 text-sm text-portal-label">
                            <Camera className="mb-3 h-10 w-10 text-portal-ink" />
                            Upload a clear photo
                          </span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={event => handlePhoto(event.target.files?.[0])} />
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
                      {[...bands.filter(band => band.active).map(band => band.name), 'None'].map(band => (
                        <GlassChoice
                          key={band}
                          label={band}
                          selected={form.fellowshipBand === band}
                          color={BAND_COLORS[band]}
                          onClick={() => update('fellowshipBand', band as FellowshipBand)}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="mt-6">
                    <Field label="Church Branch" error={errors.churchBranch}>
                      <select className={inputClass('churchBranch')} value={form.churchBranch} onChange={event => update('churchBranch', event.target.value)}>
                        <option value="">Select a church location</option>
                        {churchLocations.filter(location => location.active).map(location => <option key={location.id} value={location.name}>{location.name}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-6">
                    <Field label="Which department(s) do you serve in?" error={errors.departments}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[...departments.filter(department => department.active).map(department => department.name), 'None'].map(department => (
                          <GlassChoice
                            key={department}
                            label={department}
                            selected={form.departments.includes(department as Department)}
                          color={department === 'None' ? 'var(--muted)' : 'var(--accent)'}
                            onClick={() => toggleDepartment(department as Department)}
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
                      <div className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
                        <ConventionTag member={registeredMember} refProp={tagRef} />
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-portal-line bg-portal-surface p-5">
                            <h3 className="font-bold text-portal-ink">Convention tag details</h3>
                            <div className="mt-4 grid gap-3 text-sm">
                              {[
                                ['Name', registeredMember.fullName],
                                ['Member ID', registeredMember.id],
                                ['Assigned group', registeredMember.conventionGroup],
                                ['Fellowship band', registeredMember.fellowshipBand],
                                ['Departments', registeredMember.departments.join(', ')],
                                ['Registration date', formatRegistrationDate(registeredMember.registeredAt)],
                              ].map(([label, value]) => (
                                <div key={label} className="grid gap-1 rounded-xl bg-portal-surface p-3 sm:grid-cols-[150px_1fr]">
                                  <span className="text-xs font-semibold uppercase text-portal-label">{label}</span>
                                  <span className="font-medium text-portal-ink">{value || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button onClick={downloadTag} className="gradient-btn flex items-center justify-center gap-2">
                              <Download className="h-4 w-4" /> Download PNG
                            </button>
                            <button onClick={printTag} className="flex items-center justify-center gap-2 rounded-2xl border border-portal-line bg-portal-surface px-6 py-3 text-sm font-semibold text-portal-ink transition hover:bg-portal-surface">
                              <Printer className="h-4 w-4" /> Print / Save PDF
                            </button>
                          </div>
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
                  <button onClick={submit} disabled={submitting} className="flex min-h-11 items-center gap-2 rounded-full bg-portal-dark px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
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
          <ConventionTag member={registeredMember} />
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
