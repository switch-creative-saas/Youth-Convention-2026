import type { Executive, Member } from '@/types';

type RegistrationAttachment = {
  filename: string;
  contentType: string;
  dataUrl: string;
};

type MemberConfirmationPayload = {
  type: 'member';
  to: string;
  subject: string;
  member: Pick<Member,
    'id' |
    'fullName' |
    'email' |
    'phoneNumber' |
    'fellowshipBand' |
    'conventionGroup' |
    'departments' |
    'registeredAt'
  >;
  attachment: RegistrationAttachment;
  statusUrl?: string;
  tagUrl?: string;
};

type ExecutiveConfirmationPayload = {
  type: 'executive';
  to: string;
  subject: string;
  executive: Pick<Executive,
    'id' |
    'fullName' |
    'email' |
    'phoneNumber' |
    'leadershipRole' |
    'department' |
    'fellowshipBand' |
    'registeredAt'
  > & {
    temporaryPassword: string;
  };
  statusUrl?: string;
  tagUrl?: string;
};

export type RegistrationConfirmationPayload = MemberConfirmationPayload | ExecutiveConfirmationPayload;

export async function sendRegistrationConfirmation(payload: RegistrationConfirmationPayload) {
  const endpoint = import.meta.env.VITE_CONFIRMATION_EMAIL_ENDPOINT as string | undefined;

  if (!endpoint) {
    throw new Error('Set VITE_CONFIRMATION_EMAIL_ENDPOINT to send confirmation emails.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Confirmation email failed with status ${response.status}.`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status-based message if the endpoint returns non-JSON.
    }
    throw new Error(message);
  }
}
