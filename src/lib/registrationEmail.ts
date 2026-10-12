type RegistrationAttachment = {
  filename: string;
  contentType: string;
  dataUrl: string;
};

type MemberConfirmationPayload = {
  type: 'member';
  to: string;
  subject: string;
  member: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    fellowshipBand: string;
    conventionGroup: string;
    departments: string[];
    registeredAt: string;
  };
  attachment?: RegistrationAttachment;
  statusUrl?: string;
  tagUrl?: string;
};

type ExecutiveConfirmationPayload = {
  type: 'executive';
  to: string;
  subject: string;
  executive: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    leadershipRole: string;
    department: string;
    fellowshipBand: string;
    registeredAt: string;
  };
  statusUrl?: string;
  tagUrl?: string;
};

export type RegistrationConfirmationPayload = MemberConfirmationPayload | ExecutiveConfirmationPayload;

export async function sendRegistrationConfirmation(payload: RegistrationConfirmationPayload) {
  const endpoint = import.meta.env.VITE_CONFIRMATION_EMAIL_ENDPOINT as string | undefined;

  // Email is optional: without an endpoint the attendee still gets their tag and status link on screen.
  if (!endpoint) return false;

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
  return true;
}
