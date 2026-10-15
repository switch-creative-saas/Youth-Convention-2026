// HTML for the attendee emails: the registration confirmation (with the convention timetable) and
// the timetable email for people who registered before the timetable was published.
// Table layout and inline styles only, so it renders in Gmail, Outlook and phone mail apps.
// Every value passed in must already be HTML-escaped (see escapeHtml in index.ts).

export interface EmailSession {
  date: string;
  start: string;
  end: string;
  title: string;
  description: string;
  location: string;
}

export interface EmailContext {
  logoUrl: string;
  workspaceName: string;
  eventName: string;
  eventDates: string;
  eventVenue: string;
  eventTheme: string;
  firstName: string;
  attendeeCode: string;
  statusUrl: string;
  timetableUrl: string;
}

const FONT = 'font-family:Arial,Helvetica,sans-serif;';
const p = (style: string, content: string) => `<p style="margin-top:0;margin-right:0;margin-left:0;${FONT}${style}">${content}</p>`;
const radius = (r: number) => `border-top-left-radius:${r}px;border-top-right-radius:${r}px;border-bottom-left-radius:${r}px;border-bottom-right-radius:${r}px;`;
const pad = (t: number, r: number, b: number, l: number) => `padding-top:${t}px;padding-right:${r}px;padding-bottom:${b}px;padding-left:${l}px;`;
const table = (content: string, style = '') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${style ? ` style="${style}"` : ''}>${content}</table>`;
const bodyRow = (content: string, padding = pad(0, 28, 24, 28)) => `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;${padding}">${content}</td></tr>`;

function shell(title: string, preheader: string, ctx: EmailContext, body: string, footerNote: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
</head>
<body style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;${pad(0, 0, 0, 0)}background-color:#f3f1ea;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:#f3f1ea;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f1ea" style="background-color:#f3f1ea;">
<tr><td align="center" style="${pad(32, 12, 32, 12)}">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td bgcolor="#0b4a43" style="background-color:#0b4a43;border-top-left-radius:20px;border-top-right-radius:20px;${pad(28, 28, 24, 28)}">
${table(`<tr>
<td width="64" valign="middle" style="width:64px;"><img src="${ctx.logoUrl}" width="56" height="56" alt="Youth Fellowship logo" border="0" style="display:block;width:56px;height:56px;${radius(12)}background-color:#ffffff;"></td>
<td valign="middle" style="padding-left:14px;">
${p('margin-bottom:4px;font-size:12px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#9fe3dc;', ctx.workspaceName)}
${p('margin-bottom:0;font-size:22px;line-height:28px;font-weight:bold;color:#ffffff;', ctx.eventName)}
</td></tr>`)}
</td></tr>
<tr><td height="6" bgcolor="#ff9f00" style="background-color:#ff9f00;font-size:0;line-height:0;height:6px;">&nbsp;</td></tr>
${body}
<tr><td bgcolor="#0b4a43" style="background-color:#0b4a43;border-bottom-left-radius:20px;border-bottom-right-radius:20px;${pad(20, 28, 22, 28)}">
${p('margin-bottom:6px;font-size:13px;line-height:19px;color:#d6efec;', `${ctx.workspaceName} &middot; ${ctx.eventName}`)}
${p('margin-bottom:0;font-size:12px;line-height:18px;color:#9fc7c2;', footerNote)}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string, primary: boolean) {
  const cell = primary
    ? `bgcolor="#069d92" style="background-color:#069d92;${radius(999)}"`
    : `bgcolor="#ffffff" style="background-color:#ffffff;border-top:1px solid #0b4a43;border-right:1px solid #0b4a43;border-bottom:1px solid #0b4a43;border-left:1px solid #0b4a43;${radius(999)}"`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" ${cell}>
<a href="${href}" target="_blank" style="display:inline-block;${pad(13, 26, 13, 26)}${FONT}font-size:15px;line-height:20px;font-weight:bold;color:${primary ? '#ffffff' : '#0b4a43'};text-decoration:none;">${label}</a>
</td></tr></table>`;
}

function buttons(items: Array<[string, string]>) {
  return items.map(([href, label], index) => `<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;${pad(index === 0 ? 20 : 4, 28, index === items.length - 1 ? 26 : 6, 28)}">${button(href, label, index === 0)}</td></tr>`).join('\n');
}

function idBox(code: string) {
  return table(`<tr><td bgcolor="#e8f7f5" style="background-color:#e8f7f5;${radius(14)}${pad(16, 18, 16, 18)}">
${p('margin-bottom:4px;font-size:12px;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:#0b4a43;', 'Your convention ID')}
<p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;font-family:'Courier New',Courier,monospace;font-size:24px;line-height:30px;font-weight:bold;color:#0b4a43;">${code}</p>
</td></tr>`, 'margin-bottom:22px;');
}

function conventionDetails(ctx: EmailContext) {
  return table(`<tr><td bgcolor="#fff6e5" style="background-color:#fff6e5;${radius(14)}${pad(18, 18, 18, 18)}">
${p('margin-bottom:10px;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#b36b00;', 'Convention details')}
${p('margin-bottom:6px;font-size:14px;line-height:21px;color:#1f2933;', `<strong>Dates:</strong> ${ctx.eventDates}`)}
${p('margin-bottom:6px;font-size:14px;line-height:21px;color:#1f2933;', `<strong>Venue:</strong> ${ctx.eventVenue}`)}
${p('margin-bottom:0;font-size:14px;line-height:21px;color:#1f2933;', `<strong>Theme:</strong> ${ctx.eventTheme}`)}
</td></tr>`);
}

/** The timetable grouped by day: a heading row per day, then one row per session (time | title). */
export function timetableSection(sessions: EmailSession[], dayLabels: Map<string, string>, venue: string) {
  if (sessions.length === 0) return '';
  const rows: string[] = [];
  let currentDay = '';
  let dayNumber = 0;
  for (const session of sessions) {
    if (session.date !== currentDay) {
      currentDay = session.date;
      dayNumber += 1;
      rows.push(`<tr><td colspan="2" style="${pad(dayNumber === 1 ? 4 : 16, 0, 8, 0)}border-bottom:2px solid #069d92;${FONT}font-size:14px;line-height:20px;font-weight:bold;color:#0b4a43;">Day ${dayNumber} &middot; ${dayLabels.get(session.date) ?? session.date}</td></tr>`);
    }
    const details = [
      session.description ? `<br><span style="font-weight:normal;font-size:13px;line-height:19px;color:#4b5563;">${session.description}</span>` : '',
      session.location && session.location !== venue ? `<br><span style="font-weight:normal;font-size:12px;line-height:18px;color:#8a8a85;">${session.location}</span>` : '',
    ].join('');
    rows.push(`<tr>
<td width="34%" valign="top" style="${pad(10, 10, 10, 0)}border-bottom:1px solid #ece9e1;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:19px;font-weight:bold;color:#0b4a43;">${session.start} &ndash; ${session.end}</td>
<td valign="top" style="${pad(10, 0, 10, 0)}border-bottom:1px solid #ece9e1;${FONT}font-size:14px;line-height:20px;font-weight:bold;color:#1f2933;">${session.title}${details}</td>
</tr>`);
  }
  return `${p('margin-bottom:12px;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#069d92;', 'Convention timetable')}
${table(rows.join('\n'))}`;
}

export interface ConfirmationDetails {
  attendeeName: string;
  kindLabel: string;
  groupName: string;
  roleLabel: string;
  roleValue: string;
  departments: string;
  registeredAt: string;
  tagUrl: string;
}

export function confirmationEmail(ctx: EmailContext, details: ConfirmationDetails, timetable: string) {
  const detailRow = (label: string, value: string, last = false) => {
    const border = last ? '' : 'border-bottom:1px solid #ece9e1;';
    return `<tr>
<td width="42%" style="${pad(11, 0, 11, 0)}${border}${FONT}font-size:12px;line-height:18px;text-transform:uppercase;letter-spacing:1px;color:#8a8a85;">${label}</td>
<td style="${pad(11, 0, 11, 0)}${border}${FONT}font-size:14px;line-height:20px;font-weight:bold;color:#1f2933;">${value}</td>
</tr>`;
  };
  const body = [
    bodyRow(`${p('margin-bottom:6px;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#069d92;', 'Registration confirmed')}
<h1 style="margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;${FONT}font-size:24px;line-height:31px;font-weight:bold;color:#1f2933;">Hello ${ctx.firstName}, you're in!</h1>
${p('margin-bottom:22px;font-size:15px;line-height:24px;color:#4b5563;', `Thank you for registering as a ${details.kindLabel} for <strong style="color:#1f2933;">${ctx.eventName}</strong>. Keep this email &mdash; your convention tag, the timetable and your personal status page are below.`)}
${idBox(ctx.attendeeCode)}
${table([
    detailRow('Name', details.attendeeName),
    detailRow('Group', details.groupName),
    detailRow(details.roleLabel, details.roleValue),
    detailRow('Department(s)', details.departments),
    detailRow('Registered', details.registeredAt, true),
  ].join('\n'), 'border-top:1px solid #ece9e1;')}`, pad(30, 28, 8, 28)),
    bodyRow(conventionDetails(ctx), pad(18, 28, 6, 28)),
    buttons([[details.tagUrl, 'Download my convention tag'], [ctx.statusUrl, 'View my convention status']]),
    timetable ? bodyRow(timetable, pad(4, 28, 8, 28)) : '',
    timetable ? buttons([[ctx.timetableUrl, 'View, print or download the timetable']]) : '',
    bodyRow(`${p('margin-bottom:8px;font-size:14px;line-height:20px;font-weight:bold;color:#1f2933;', 'On arrival')}
${p('margin-bottom:4px;font-size:14px;line-height:22px;color:#4b5563;', '&bull; Bring your printed tag or show it on your phone.')}
${p('margin-bottom:4px;font-size:14px;line-height:22px;color:#4b5563;', '&bull; Your fingerprint is captured at the check-in desk for attendance, food and souvenirs.')}
${p('margin-bottom:0;font-size:14px;line-height:22px;color:#4b5563;', '&bull; Your status page updates as your check-ins are recorded.')}`, pad(0, 28, 28, 28)),
  ].join('\n');
  return shell(
    `${ctx.eventName} &mdash; Registration confirmed`,
    `You're registered for ${ctx.eventName}. Your ID is ${ctx.attendeeCode} &mdash; your tag and the timetable are inside.`,
    ctx,
    body,
    "You received this email because you registered for the convention. If this wasn't you, reply to this email and let us know.",
  );
}

export function timetableEmail(ctx: EmailContext, timetable: string) {
  const body = [
    bodyRow(`${p('margin-bottom:6px;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#069d92;', 'Timetable')}
<h1 style="margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;${FONT}font-size:24px;line-height:31px;font-weight:bold;color:#1f2933;">Hello ${ctx.firstName}, here's the convention timetable</h1>
${p('margin-bottom:22px;font-size:15px;line-height:24px;color:#4b5563;', `The sessions and times for <strong style="color:#1f2933;">${ctx.eventName}</strong> are ready. You can also view, print or save the timetable as a PDF from the link below &mdash; it always shows the latest times.`)}
${idBox(ctx.attendeeCode)}
${conventionDetails(ctx)}`, pad(30, 28, 22, 28)),
    bodyRow(timetable, pad(0, 28, 8, 28)),
    buttons([[ctx.timetableUrl, 'View, print or download the timetable'], [ctx.statusUrl, 'View my convention status']]),
  ].join('\n');
  return shell(
    `${ctx.eventName} &mdash; Timetable`,
    `Sessions and times for ${ctx.eventName}.`,
    ctx,
    body,
    'You received this email because you registered for the convention. Reply to this email if you have any questions.',
  );
}
