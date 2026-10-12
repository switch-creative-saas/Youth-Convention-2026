import { Resend } from 'resend';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

type EmailContent = {
  html: string;
  text: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, key: string, fallback = '') {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value: string) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

function detailsTable(rows: Array<[string, string]>) {
  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(value || 'Not provided')}</td>
    </tr>
  `).join('');
}

function wrapEmail(title: string, intro: string, rows: Array<[string, string]>, footer: string, links?: { statusUrl?: string; tagUrl?: string }) {
  const linkHtml = links?.statusUrl || links?.tagUrl ? `
    <div style="margin:22px 0 0;display:flex;gap:10px;flex-wrap:wrap;">
      ${links.statusUrl ? `<a href="${escapeHtml(links.statusUrl)}" style="display:inline-block;background:#083f63;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 16px;font-size:13px;font-weight:700;">VIEW MY CONVENTION STATUS</a>` : ''}
      ${links.tagUrl ? `<a href="${escapeHtml(links.tagUrl)}" style="display:inline-block;background:#f8fafc;color:#083f63;text-decoration:none;border:1px solid #cbd5e1;border-radius:12px;padding:12px 16px;font-size:13px;font-weight:700;">PRINT MY CONVENTION TAG</a>` : ''}
    </div>
  ` : '';

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="background:#083f63;border-radius:22px 22px 0 0;padding:26px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#bfdbfe;">MOSYF Youth Convention 2026</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h1>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 22px 22px;padding:26px;">
          <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.65;">${escapeHtml(intro)}</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tbody>${detailsTable(rows)}</tbody>
          </table>
          ${linkHtml}
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footer)}</p>
        </div>
      </div>
    </div>
  `;
}

function buildMemberEmail(payload: Record<string, unknown>): EmailContent {
  const member = isRecord(payload.member) ? payload.member : {};
  const departments = Array.isArray(member.departments)
    ? member.departments.filter((item): item is string => typeof item === 'string').join(', ')
    : '';

  const rows: Array<[string, string]> = [
    ['Member ID', getString(member, 'id')],
    ['Full Name', getString(member, 'fullName')],
    ['Email', getString(member, 'email')],
    ['Phone', getString(member, 'phoneNumber')],
    ['Fellowship Band', getString(member, 'fellowshipBand')],
    ['Convention Group', getString(member, 'conventionGroup')],
    ['Departments', departments],
    ['Registered At', formatDate(getString(member, 'registeredAt'))],
    ['Registration Status', 'Confirmed'],
  ];

  return {
    html: wrapEmail(
      'Your MOSYF Convention Registration is Confirmed',
      `Hello ${escapeHtml(getString(member, 'fullName').split(' ')[0] || 'there')}, your registration for the Mountain of Solution Youth Fellowship Convention has been successfully received.`,
      rows,
      'Convention details, status updates, tag printing, biometric verification, food, souvenir, and activity status will be available through your personal convention status link.',
      { statusUrl: getString(payload, 'statusUrl'), tagUrl: getString(payload, 'tagUrl') }
    ),
    text: rows.map(([label, value]) => `${label}: ${value || 'Not provided'}`).join('\n'),
  };
}

function buildExecutiveEmail(payload: Record<string, unknown>): EmailContent {
  const executive = isRecord(payload.executive) ? payload.executive : {};
  const rows: Array<[string, string]> = [
    ['Executive ID', getString(executive, 'id')],
    ['Full Name', getString(executive, 'fullName')],
    ['Email', getString(executive, 'email')],
    ['Phone', getString(executive, 'phoneNumber')],
    ['Assigned Role', getString(executive, 'leadershipRole')],
    ['Department', getString(executive, 'department')],
    ['Fellowship Band', getString(executive, 'fellowshipBand')],
    ['Temporary Password', getString(executive, 'temporaryPassword')],
    ['Registered At', formatDate(getString(executive, 'registeredAt'))],
    ['Registration Status', 'Confirmed'],
  ];

  return {
    html: wrapEmail(
      'Your MOSYF Convention Registration is Confirmed',
      `Hello ${escapeHtml(getString(executive, 'fullName').split(' ')[0] || 'there')}, your executive registration for the Mountain of Solution Youth Fellowship Convention has been successfully received.`,
      rows,
      'Your executive tag and status portal will reflect admin approval once an authorized admin approves your executive registration.',
      { statusUrl: getString(payload, 'statusUrl'), tagUrl: getString(payload, 'tagUrl') }
    ),
    text: rows.map(([label, value]) => `${label}: ${value || 'Not provided'}`).join('\n'),
  };
}

function attachmentFromPayload(payload: Record<string, unknown>) {
  const attachment = isRecord(payload.attachment) ? payload.attachment : null;
  if (!attachment) return undefined;

  const dataUrl = getString(attachment, 'dataUrl');
  const filename = getString(attachment, 'filename', 'convention-tag.png');
  if (!dataUrl) return undefined;

  return [{
    filename,
    content: dataUrl.includes(',') ? dataUrl.split(',').at(-1) ?? dataUrl : dataUrl,
  }];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server.' });
    return;
  }

  if (!from) {
    res.status(500).json({ error: 'RESEND_FROM_EMAIL is not configured on the server.' });
    return;
  }

  const payload = isRecord(req.body) ? req.body : {};
  const type = getString(payload, 'type');
  const to = getString(payload, 'to');
  const subject = getString(payload, 'subject');

  if (type !== 'member' && type !== 'executive') {
    res.status(400).json({ error: 'Invalid confirmation email type.' });
    return;
  }

  if (!to || !subject) {
    res.status(400).json({ error: 'Email recipient and subject are required.' });
    return;
  }

  const resend = new Resend(apiKey);
  const content = type === 'member' ? buildMemberEmail(payload) : buildExecutiveEmail(payload);
  const attachments = type === 'member' ? attachmentFromPayload(payload) : undefined;
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: content.html,
    text: content.text,
    replyTo: replyTo || undefined,
    attachments,
    tags: [
      { name: 'registration_type', value: type },
    ],
  });

  if (error) {
    res.status(502).json({ error: error.message || 'Resend rejected the confirmation email.' });
    return;
  }

  res.status(200).json({ id: data?.id });
}
