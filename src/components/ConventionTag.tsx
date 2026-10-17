import { useEffect, useState } from 'react';
import type React from 'react';
import type { Attendee } from '@/types';
import { tagNumber } from '@/lib/format';
import { createMediaPassImages, createTagImage } from '@/lib/tagImage';

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
 * on-screen tag always matches the file. Media team members also have a media pass (front and
 * back): a switch picks which one is shown and printed; the pass prints front and back side by side.
 * The ids are used by the print stylesheet.
 */
function TagImage({ attendee, eventName, kind, refProp }: { attendee: TagAttendee; eventName: string; kind: 'member' | 'executive'; refProp?: React.RefObject<HTMLDivElement | null> }) {
  const key = [kind, attendee.code, attendee.fullName, attendee.leadershipRole, attendee.fellowshipBand, attendee.conventionGroup, attendee.departments.join(','), attendee.profilePhoto ?? '', eventName].join('|');
  const [rendered, setRendered] = useState<{ key: string; url: string | null; media: { front: string; back: string } | null }>({ key: '', url: null, media: null });
  const [view, setView] = useState<'tag' | 'media'>('tag');
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([createTagImage(attendee, eventName, kind), createMediaPassImages(attendee, eventName, kind).catch(() => null)])
      .then(([url, media]) => { if (!cancelled) setRendered({ key, url, media }); })
      .catch(() => { if (!cancelled) setRendered({ key, url: null, media: null }); });
    return () => { cancelled = true; };
    // `key` captures every field the drawing uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = rendered.key === key;
  const media = ready ? rendered.media : null;
  const showingMedia = Boolean(media) && view === 'media';
  const dark = kind === 'executive' || showingMedia;
  const tag = (
    <div
      ref={refProp}
      id={kind === 'executive' ? 'executive-convention-tag' : 'convention-tag'}
      className={`relative mx-auto aspect-[592/1004] w-full max-w-[430px] overflow-hidden rounded-[28px] shadow-2xl print:shadow-none ${showingMedia ? 'tag-has-back' : ''} ${dark ? 'bg-[#0b0b0b] text-white' : 'bg-[#fbf6ec] text-[#0b4a43]'}`}
    >
      {ready && rendered.url ? (
        showingMedia && media ? (
          <>
            <img src={media.front} alt={`${attendee.fullName} media pass`} className={`h-full w-full object-contain ${showBack ? 'hidden print:block' : ''}`} />
            <img src={media.back} alt={`${attendee.fullName} media pass, back`} className={`h-full w-full object-contain ${showBack ? '' : 'hidden print:block'}`} />
          </>
        ) : (
          <img src={rendered.url} alt={`${attendee.fullName} convention tag`} className="h-full w-full object-contain" />
        )
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
  if (!media) return tag;
  const option = (value: 'tag' | 'media', label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => { setView(value); setShowBack(false); }}
      className={`min-h-10 flex-1 rounded-full px-3 text-xs font-bold ${view === value ? 'bg-portal-dark text-white' : 'text-portal-ink'}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div className="no-print mx-auto mb-3 flex max-w-[430px] gap-1 rounded-full border border-portal-line p-1">
        {option('tag', 'Convention tag')}
        {option('media', 'Media pass')}
      </div>
      {tag}
      {showingMedia && (
        <button type="button" onClick={() => setShowBack(value => !value)} className="no-print mx-auto mt-3 flex min-h-10 items-center justify-center rounded-full border border-portal-line px-4 text-xs font-bold text-portal-ink">
          {showBack ? 'Show front of media pass' : 'Show back of media pass'}
        </button>
      )}
    </div>
  );
}

export function ConventionTag({ member, eventName = 'Youth convention', refProp }: ConventionTagProps) {
  return <TagImage attendee={member} eventName={eventName} kind="member" refProp={refProp} />;
}

export function ExecutiveConventionTag({ executive, eventName = 'Youth convention', refProp }: ExecutiveConventionTagProps) {
  return <TagImage attendee={executive} eventName={eventName} kind="executive" refProp={refProp} />;
}
