import { useEffect, useState } from 'react';
import type React from 'react';
import { UserRound } from 'lucide-react';
import youthLogo from '@/assets/youth-logo.png';
import type { Attendee } from '@/types';
import { tagNumber } from '@/lib/format';
import { createTagImage } from '@/lib/tagImage';

/** The fields a printed tag needs; satisfied by Attendee and by the public status payload. */
export type TagAttendee = Pick<Attendee, 'fullName' | 'code' | 'conventionGroup' | 'fellowshipBand' | 'leadershipRole' | 'departments'> & {
  profilePhoto?: string;
  statusToken?: string;
};

type ConventionTagProps = {
  member: TagAttendee;
  eventName?: string;
  refProp?: React.RefObject<HTMLDivElement | null>;
};

type ExecutiveConventionTagProps = {
  executive: TagAttendee;
  eventName?: string;
  refProp?: React.RefObject<HTMLDivElement | null>;
};

function CornerRings({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="relative h-28 w-28 rounded-full border-[14px] border-[#08b8ad] bg-white">
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4b4b4b]" />
      </div>
    </div>
  );
}

function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, #4b4b4b 0 3.5px, transparent 4px)',
        backgroundSize: '14px 14px',
      }}
    />
  );
}

function StripeBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #ff9f00 0 7px, transparent 7px 18px)',
      }}
    />
  );
}

function DiamondAccent({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="absolute inset-0 rotate-45 border-[4px] border-[#ff9f00]" />
      <div className="absolute inset-6 rotate-45 border-[4px] border-[#ff9f00]" />
      <div className="absolute left-8 top-8 h-28 w-28 rotate-45 bg-[#54b8ad]" />
    </div>
  );
}

export function ConventionTag({ member, eventName = 'Youth convention', refProp }: ConventionTagProps) {
  return (
    <div
      ref={refProp}
      id="convention-tag"
      className="relative mx-auto aspect-[592/1004] w-full max-w-[430px] overflow-hidden bg-[#f7f7f7] text-slate-950 shadow-2xl print:shadow-none"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.82) 0 19px, rgba(226,226,226,0.34) 20px 36px)',
        }}
      />

      <div className="absolute left-[5.4%] top-[2%] flex h-[6.6%] w-[33%] items-center gap-[3%]">
        <img src={youthLogo} alt={eventName} className="h-full w-auto shrink-0 object-contain" />
        <p
          className="line-clamp-2 min-w-0 text-[clamp(0.62rem,2.4vw,0.92rem)] font-semibold leading-[1.05] text-[#0b4a43]"
          style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}
        >
          {eventName}
        </p>
      </div>

      <CornerRings className="-right-[8%] -top-[5%]" />
      <CornerRings className="left-[39%] -top-[1.5%]" />
      <CornerRings className="bottom-[-3.5%] left-[38%]" />
      <CornerRings className="bottom-[-6%] left-[1%]" />
      <DotGrid className="right-[23%] top-0 h-[8.4%] w-[12%]" />
      <DotGrid className="bottom-[0.5%] left-[26%] h-[7.2%] w-[14%]" />
      <StripeBlock className="right-0 top-[4.5%] h-[7%] w-[34%]" />
      <StripeBlock className="bottom-[4.8%] left-0 h-[7%] w-[27%]" />
      <div className="absolute right-[24%] top-[7.4%] h-[4.2%] w-[7.2%] rounded-full bg-[#08b8ad]" />
      <div className="absolute bottom-[8.9%] left-[26.5%] h-[4.2%] w-[7.2%] rounded-full bg-[#08b8ad]" />
      <DiamondAccent className="-left-[14%] top-[44%] h-[26%] w-[26%]" />
      <DiamondAccent className="right-[-13%] top-[18%] h-[26%] w-[26%]" />
      <div className="absolute bottom-[4.6%] left-0 h-[6.5%] w-[2.4%] border-[5px] border-[#08b8ad]" />

      <p className="absolute left-0 right-0 top-[13.5%] text-center text-[clamp(1rem,4.2vw,1.45rem)] font-semibold uppercase leading-none text-[#0b4a43]">
        {member.conventionGroup}
      </p>

      <div className="absolute left-[25.5%] top-[16.4%] h-[45.5%] w-[49%]">
        <div className="absolute inset-0 bg-[#484848]" />
        <div className="absolute left-[10%] top-[2.4%] h-[4.7%] w-[80%] bg-[#f7f7f7]" />
        <div className="absolute left-[3.8%] top-[7%] h-[84%] w-[92.4%] overflow-hidden bg-[#f7f7f7]">
          {member.profilePhoto ? (
            <img src={member.profilePhoto} alt={member.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[#d5d5d5]">
              <UserRound className="h-20 w-20" />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 h-[25%] w-[50%] bg-[#484848]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </div>

      <div
        className="absolute left-[19.3%] top-[65.2%] grid h-[10.8%] w-[65.8%] place-items-center bg-[#069d92] px-[8%] text-center"
        style={{ clipPath: 'polygon(4% 0, 100% 0, 94% 100%, 0 100%)' }}
      >
        <p className="max-w-full break-words text-[clamp(1.1rem,5vw,1.8rem)] font-black uppercase leading-none text-white">
          {member.fullName}
        </p>
      </div>

      <div
        className="absolute left-[20.8%] top-[72.1%] grid h-[7.6%] w-[62%] place-items-center bg-[#ff9f00] px-[8%] text-center"
        style={{ clipPath: 'polygon(0 0, 100% 22%, 94% 100%, 5% 100%)' }}
      >
        <p className="max-w-full truncate text-[clamp(0.95rem,3.8vw,1.45rem)] font-black uppercase text-[#334155]">
          {member.fellowshipBand}
        </p>
      </div>

      <div className="absolute left-[31.8%] top-[80.8%] rounded-lg bg-[#069d92] px-[4%] py-[1.4%] text-center text-[clamp(0.78rem,3.2vw,1.1rem)] font-bold leading-none text-white">
        ID : {tagNumber(member.code)}
      </div>

      <div className="absolute bottom-[4.8%] right-[4%] h-px w-[32%] bg-[#0b4a43]" />
      <p className="absolute bottom-[1.9%] right-[8%] font-serif text-[clamp(0.65rem,2.6vw,0.95rem)] italic text-[#0b4a43]">
        Youth Exco Signature
      </p>
    </div>
  );
}

/**
 * Executive tag: shows the same PNG that is downloaded, printed and emailed (drawn by tagImage.ts),
 * so the on-screen tag always matches the file.
 */
export function ExecutiveConventionTag({ executive, eventName = 'Youth convention', refProp }: ExecutiveConventionTagProps) {
  const key = [executive.code, executive.fullName, executive.leadershipRole, executive.fellowshipBand, executive.conventionGroup, executive.departments.join(','), executive.profilePhoto ?? '', eventName].join('|');
  const [rendered, setRendered] = useState<{ key: string; url: string | null }>({ key: '', url: null });

  useEffect(() => {
    let cancelled = false;
    createTagImage(executive, eventName, 'executive')
      .then(url => { if (!cancelled) setRendered({ key, url }); })
      .catch(() => { if (!cancelled) setRendered({ key, url: null }); });
    return () => { cancelled = true; };
    // `key` captures every field the drawing uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = rendered.key === key;
  return (
    <div
      ref={refProp}
      id="executive-convention-tag"
      className="relative mx-auto aspect-[592/1004] w-full max-w-[430px] overflow-hidden rounded-[28px] bg-[#141b1a] text-white shadow-2xl print:shadow-none"
    >
      {ready && rendered.url ? (
        <img src={rendered.url} alt={`${executive.fullName} executive tag`} className="h-full w-full object-contain" />
      ) : (
        <div className="grid h-full w-full place-items-center p-8 text-center">
          {ready ? (
            <div>
              <p className="text-2xl font-black uppercase">{executive.fullName}</p>
              <p className="mt-2 text-sm font-bold uppercase text-[#ff9f00]">{executive.leadershipRole || 'Executive'}</p>
              <p className="mt-4 font-mono text-sm">ID : {tagNumber(executive.code)}</p>
            </div>
          ) : (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#08b8ad]" />
          )}
        </div>
      )}
    </div>
  );
}
