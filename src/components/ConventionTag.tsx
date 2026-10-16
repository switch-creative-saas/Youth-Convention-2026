import { useEffect, useState } from 'react';
import type React from 'react';
import type { Attendee } from '@/types';
import { tagNumber } from '@/lib/format';
import { createTagBackImage, createTagImage, isMediaTeam } from '@/lib/tagImage';

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

/**
 * Shows the same PNG that is downloaded, printed and emailed (drawn by tagImage.ts), so the
 * on-screen tag always matches the file. Media team tags also have a back, shown with a toggle
 * on screen and beside the front when printed. The ids are used by the print stylesheet.
 */
function TagImage({ attendee, eventName, kind, refProp }: { attendee: TagAttendee; eventName: string; kind: 'member' | 'executive'; refProp?: React.RefObject<HTMLDivElement | null> }) {
  const key = [kind, attendee.code, attendee.fullName, attendee.leadershipRole, attendee.fellowshipBand, attendee.conventionGroup, attendee.departments.join(','), attendee.profilePhoto ?? '', eventName].join('|');
  const [rendered, setRendered] = useState<{ key: string; url: string | null; back: string | null }>({ key: '', url: null, back: null });
  const [showBack, setShowBack] = useState(false);
  const media = isMediaTeam(attendee.departments);

  useEffect(() => {
    let cancelled = false;
    Promise.all([createTagImage(attendee, eventName, kind), createTagBackImage(attendee, eventName, kind).catch(() => null)])
      .then(([url, back]) => { if (!cancelled) setRendered({ key, url, back }); })
      .catch(() => { if (!cancelled) setRendered({ key, url: null, back: null }); });
    return () => { cancelled = true; };
    // `key` captures every field the drawing uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = rendered.key === key;
  const dark = kind === 'executive' || media;
  const back = ready ? rendered.back : null;
  const tag = (
    <div
      ref={refProp}
      id={kind === 'executive' ? 'executive-convention-tag' : 'convention-tag'}
      className={`relative mx-auto aspect-[592/1004] w-full max-w-[430px] overflow-hidden rounded-[28px] shadow-2xl print:shadow-none ${back ? 'tag-has-back' : ''} ${dark ? 'bg-[#0b0b0b] text-white' : 'bg-[#fbf6ec] text-[#0b4a43]'}`}
    >
      {ready && rendered.url ? (
        <>
          <img src={rendered.url} alt={`${attendee.fullName} convention tag`} className={`h-full w-full object-contain ${back && showBack ? 'hidden print:block' : ''}`} />
          {back && <img src={back} alt={`${attendee.fullName} convention tag, back`} className={`h-full w-full object-contain ${showBack ? '' : 'hidden print:block'}`} />}
        </>
      ) : (
        <div className="grid h-full w-full place-items-center p-8 text-center">
          {ready ? (
            <div>
              <p className="text-2xl font-black uppercase">{attendee.fullName}</p>
              <p className="mt-2 text-sm font-bold uppercase text-[#ff9f00]">{kind === 'executive' ? attendee.leadershipRole || 'Executive' : attendee.conventionGroup}</p>
              <p className="mt-4 font-mono text-sm">ID : {tagNumber(attendee.code)}</p>
            </div>
          ) : (
            <div className={`h-8 w-8 animate-spin rounded-full border-2 border-t-[#08b8ad] ${dark ? 'border-white/20' : 'border-[#0b4a43]/20'}`} />
          )}
        </div>
      )}
    </div>
  );
  if (!back) return tag;
  return (
    <div>
      {tag}
      <button type="button" onClick={() => setShowBack(value => !value)} className="no-print mx-auto mt-3 flex min-h-10 items-center justify-center rounded-full border border-portal-line px-4 text-xs font-bold text-portal-ink">
        {showBack ? 'Show front of tag' : 'Show back of tag'}
      </button>
    </div>
  );
}

export function ConventionTag({ member, eventName = 'Youth convention', refProp }: ConventionTagProps) {
  return <TagImage attendee={member} eventName={eventName} kind="member" refProp={refProp} />;
}

export function ExecutiveConventionTag({ executive, eventName = 'Youth convention', refProp }: ExecutiveConventionTagProps) {
  return <TagImage attendee={executive} eventName={eventName} kind="executive" refProp={refProp} />;
}
