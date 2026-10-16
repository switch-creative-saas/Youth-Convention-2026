// Draws a convention tag as a PNG (used on screen, for downloads and printing, and as the
// confirmation email attachment). Both are ID-card designs with a QR code of the attendee ID:
// executives on a dark card with their leadership role, members on a milk card with their group.
// Both show band, group and department(s).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import youthLogo from '@/assets/youth-logo.png';
import type { TagAttendee } from '@/components/ConventionTag';
import { initials, tagNumber } from '@/lib/format';

const IMAGE_TIMEOUT_MS = 8000;

/** Loads an image for canvas drawing; gives up after a few seconds so a slow photo never blocks the tag. */
function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // Stored photos come from Supabase Storage; request CORS so the canvas can be exported.
    if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => reject(new Error('Image took too long to load.')), IMAGE_TIMEOUT_MS);
    image.onload = () => { window.clearTimeout(timer); resolve(image); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error('Image could not be loaded.')); };
    image.src = src;
  });
}

/** Photo is optional decoration: a failed load draws the placeholder instead of failing the tag. */
function loadOptionalImage(src?: string | null) {
  return src ? loadCanvasImage(src).catch(() => null) : Promise.resolve(null);
}

function qrImage(value: string, color = '#0e1312') {
  // xmlns is required for an SVG to load as an <img>/canvas image.
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value, size: 512, marginSize: 0, level: 'M', fgColor: color, bgColor: '#ffffff', xmlns: 'http://www.w3.org/2000/svg' }));
  return loadCanvasImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`).catch(() => null);
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
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
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

function polygon(context: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string) {
  context.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

/** Splits text into lines that fit maxWidth with the current font. */
function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  text.split(/\s+/).filter(Boolean).forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/**
 * Picks the largest font size (down to minSize) at which the text fits in maxLines lines of
 * maxWidth, then draws it centred on (x, centerY). The last line is ellipsised if it still overflows.
 */
function drawFittedText(context: CanvasRenderingContext2D, text: string, options: {
  x: number; centerY: number; maxWidth: number; maxLines: number; size: number; minSize: number;
  weight: number | string; family: string; lineHeight?: number; align?: CanvasTextAlign; tracking?: number;
}) {
  const { x, centerY, maxWidth, maxLines, minSize, weight, family, align = 'center' } = options;
  // Letter spacing (supported by current browsers; older ones simply draw without it).
  const spaced = context as CanvasRenderingContext2D & { letterSpacing?: string };
  const previousSpacing = spaced.letterSpacing;
  if (options.tracking) spaced.letterSpacing = `${options.tracking}px`;
  let size = options.size;
  let lines: string[] = [];
  for (; size >= minSize; size -= 2) {
    context.font = `${weight} ${size}px ${family}`;
    lines = wrapLines(context, text, maxWidth);
    if (lines.length <= maxLines && lines.every(item => context.measureText(item).width <= maxWidth)) break;
  }
  size = Math.max(size, minSize);
  context.font = `${weight} ${size}px ${family}`;
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trim()}…`;
  }
  const lineHeight = (options.lineHeight ?? 1.1) * size;
  context.textAlign = align;
  context.textBaseline = 'middle';
  const top = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((item, index) => context.fillText(item, x, top + index * lineHeight));
  // Some browsers report the default as an empty string, which is ignored when assigned back.
  if (options.tracking) spaced.letterSpacing = previousSpacing || '0px';
}

const SANS = 'Poppins, "Segoe UI", Arial, sans-serif';
const TEAL = '#069d92';
const BRIGHT_TEAL = '#08b8ad';
const DEEP_TEAL = '#0b4a43';
const ORANGE = '#ff9f00';

/** Hides placeholder values ("None", "Unassigned", the executive fallback) on tags. */
const show = (value?: string | null) => (value && value !== 'None' && value !== 'Executive' && value !== 'Unassigned' ? value : '—');

/**
 * Member tag: the executive ID-card layout on a milk background, with a rounded-square photo,
 * the group on a teal bar, and band and department(s) beside the QR code.
 */
async function drawMemberTag(context: CanvasRenderingContext2D, member: TagAttendee, eventName: string) {
  const { width, height } = context.canvas;
  const [youth, photo, qr] = await Promise.all([
    loadCanvasImage(youthLogo),
    loadOptionalImage(member.profilePhoto),
    qrImage(member.code, DEEP_TEAL),
  ]);

  // Card with rounded corners (transparent outside) and a warm milk gradient.
  roundedRect(context, 0, 0, width, height, 64);
  context.save();
  context.clip();
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#fffaf1');
  background.addColorStop(0.6, '#f8f0e1');
  background.addColorStop(1, '#f1e5ce');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  // Soft colour glows and angular facets.
  context.fillStyle = 'rgba(8,184,173,0.10)';
  context.beginPath();
  context.arc(1120, 130, 250, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(255,159,0,0.10)';
  context.beginPath();
  context.arc(30, 1880, 300, 0, Math.PI * 2);
  context.fill();
  polygon(context, [[0, 240], [480, 0], [780, 0], [0, 660]], 'rgba(11,74,67,0.035)');
  polygon(context, [[0, 660], [780, 0], [840, 0], [0, 720]], 'rgba(11,74,67,0.06)');
  polygon(context, [[width, 1040], [width, 1660], [620, height], [330, height]], 'rgba(11,74,67,0.035)');

  // Slanted accent bars: teal on the right, orange low on the left (reverse of the executive tag).
  for (let index = 0; index < 3; index += 1) {
    const top = 470 + index * 96;
    polygon(context, [[width, top], [width, top + 58], [1086, top + 100], [1086, top + 42]], BRIGHT_TEAL);
  }
  for (let index = 0; index < 3; index += 1) {
    const top = 1270 + index * 70;
    polygon(context, [[0, top], [52, top - 26], [52, top + 14], [0, top + 40]], ORANGE);
  }

  // Lanyard slot.
  roundedRect(context, 512, 62, 160, 36, 18);
  context.fillStyle = '#e7d9bf';
  context.fill();
  context.strokeStyle = 'rgba(11,74,67,0.18)';
  context.lineWidth = 3;
  context.stroke();

  // Header: logo badge and event name (wraps onto two lines instead of being cut off).
  roundedRect(context, 76, 142, 136, 136, 30);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = 'rgba(8,184,173,0.45)';
  context.lineWidth = 4;
  context.stroke();
  drawContainImage(context, youth, 86, 152, 116, 116);
  context.fillStyle = DEEP_TEAL;
  drawFittedText(context, eventName, { x: 244, centerY: 210, maxWidth: 850, maxLines: 2, size: 54, minSize: 34, weight: 700, family: SANS, lineHeight: 1.08, align: 'left' });

  // MEMBER pill.
  roundedRect(context, 432, 330, 320, 70, 35);
  context.fillStyle = ORANGE;
  context.fill();
  context.fillStyle = '#13201e';
  drawFittedText(context, 'MEMBER', { x: 592, centerY: 366, maxWidth: 280, maxLines: 1, size: 32, minSize: 24, weight: 800, family: SANS, tracking: 8 });

  // Rounded-square photo: offset teal block behind, white frame, orange corner brackets.
  const size = 500;
  const left = 592 - size / 2;
  const top = 482;
  roundedRect(context, left + 22, top + 22, size, size, 64);
  context.fillStyle = BRIGHT_TEAL;
  context.fill();
  roundedRect(context, left - 12, top - 12, size + 24, size + 24, 72);
  context.fillStyle = '#ffffff';
  context.fill();
  context.save();
  roundedRect(context, left, top, size, size, 60);
  context.clip();
  if (photo) {
    drawCoverImage(context, photo, left, top, size, size);
  } else {
    context.fillStyle = '#eadfc8';
    context.fillRect(left, top, size, size);
    context.fillStyle = DEEP_TEAL;
    drawFittedText(context, initials(member.fullName), { x: 592, centerY: top + size / 2, maxWidth: size * 0.8, maxLines: 1, size: 150, minSize: 80, weight: 800, family: SANS });
  }
  context.restore();
  context.strokeStyle = ORANGE;
  context.lineWidth = 12;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(left - 40, top + 90);
  context.lineTo(left - 40, top - 40);
  context.lineTo(left + 90, top - 40);
  context.stroke();
  context.beginPath();
  context.moveTo(left + size + 62, top + size - 70);
  context.lineTo(left + size + 62, top + size + 62);
  context.lineTo(left + size - 70, top + size + 62);
  context.stroke();

  // Name.
  context.fillStyle = DEEP_TEAL;
  drawFittedText(context, member.fullName.toUpperCase(), { x: 592, centerY: 1118, maxWidth: 1010, maxLines: 2, size: 80, minSize: 44, weight: 900, family: SANS, lineHeight: 1.0 });

  // Group on a teal bar.
  polygon(context, [[104, 1210], [1056, 1210], [1084, 1302], [132, 1302]], TEAL);
  context.fillStyle = '#ffffff';
  const group = show(member.conventionGroup);
  drawFittedText(context, (group === '—' ? 'Youth member' : group).toUpperCase(), { x: 592, centerY: 1257, maxWidth: 880, maxLines: 1, size: 46, minSize: 24, weight: 800, family: SANS });

  // Band and department(s).
  const rows: Array<[string, string, number]> = [
    ['FELLOWSHIP BAND', show(member.fellowshipBand), 1],
    [member.departments.length > 1 ? 'DEPARTMENTS' : 'DEPARTMENT', show(member.departments.join(', ')), 2],
  ];
  let rowTop = 1372;
  rows.forEach(([label, value, lines], index) => {
    context.fillStyle = '#b36b00';
    context.font = `700 26px ${SANS}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(label, 100, rowTop);
    context.fillStyle = '#1f2933';
    context.font = `700 40px ${SANS}`;
    const wraps = lines === 2 && context.measureText(value).width > 620;
    const valueCenter = wraps ? rowTop + 66 : rowTop + 46;
    drawFittedText(context, value, { x: 100, centerY: valueCenter, maxWidth: 620, maxLines: lines, size: 40, minSize: 26, weight: 700, family: SANS, align: 'left', lineHeight: 1.12 });
    if (index < rows.length - 1) {
      context.fillStyle = 'rgba(11,74,67,0.12)';
      context.fillRect(100, rowTop + 92, 620, 2);
    }
    rowTop += 128;
  });

  // QR code (the member ID, read by the check-in scanner).
  roundedRect(context, 784, 1336, 304, 304, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = 'rgba(11,74,67,0.15)';
  context.lineWidth = 3;
  context.stroke();
  if (qr) context.drawImage(qr, 806, 1358, 260, 260);
  context.fillStyle = '#6b7c79';
  drawFittedText(context, 'Scan to verify', { x: 936, centerY: 1676, maxWidth: 300, maxLines: 1, size: 24, minSize: 20, weight: 600, family: SANS });

  // ID.
  roundedRect(context, 100, 1712, 340, 86, 20);
  context.fillStyle = 'rgba(255,159,0,0.16)';
  context.fill();
  context.strokeStyle = ORANGE;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = DEEP_TEAL;
  drawFittedText(context, `ID : ${tagNumber(member.code)}`, { x: 270, centerY: 1756, maxWidth: 300, maxLines: 1, size: 40, minSize: 26, weight: 800, family: 'Inter, Arial, sans-serif' });

  // Signature line.
  context.fillStyle = 'rgba(11,74,67,0.55)';
  context.fillRect(700, 1798, 388, 3);
  context.fillStyle = DEEP_TEAL;
  context.font = 'italic 28px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Youth Exco Signature', 894, 1840);

  // Footer band.
  context.fillStyle = BRIGHT_TEAL;
  context.fillRect(0, 1906, width, 10);
  context.fillStyle = ORANGE;
  context.fillRect(0, 1916, width, height - 1916);
  context.fillStyle = '#13201e';
  drawFittedText(context, eventName.toUpperCase(), { x: 592, centerY: 1960, maxWidth: 1000, maxLines: 1, size: 30, minSize: 20, weight: 700, family: SANS });
  context.restore();
}

async function drawExecutiveTag(context: CanvasRenderingContext2D, executive: TagAttendee, eventName: string) {
  const { width, height } = context.canvas;
  const [youth, photo, qr] = await Promise.all([
    loadCanvasImage(youthLogo),
    loadOptionalImage(executive.profilePhoto),
    qrImage(executive.code),
  ]);

  // Card with rounded corners (transparent outside) and a dark gradient.
  roundedRect(context, 0, 0, width, height, 64);
  context.save();
  context.clip();
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#1f2928');
  background.addColorStop(0.55, '#141b1a');
  background.addColorStop(1, '#0b100f');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  // Angular facets.
  polygon(context, [[0, 240], [480, 0], [780, 0], [0, 660]], 'rgba(255,255,255,0.045)');
  polygon(context, [[0, 660], [780, 0], [870, 0], [0, 770]], 'rgba(0,0,0,0.28)');
  polygon(context, [[width, 1040], [width, 1660], [620, height], [330, height]], 'rgba(255,255,255,0.035)');
  polygon(context, [[width, 1660], [width, 1760], [790, height], [620, height]], 'rgba(0,0,0,0.25)');

  // Slanted accent bars on the right edge, teal ones low on the left.
  for (let index = 0; index < 3; index += 1) {
    const top = 470 + index * 96;
    polygon(context, [[width, top], [width, top + 58], [1086, top + 100], [1086, top + 42]], ORANGE);
  }
  for (let index = 0; index < 3; index += 1) {
    const top = 1270 + index * 70;
    polygon(context, [[0, top], [52, top - 26], [52, top + 14], [0, top + 40]], BRIGHT_TEAL);
  }

  // Lanyard slot.
  roundedRect(context, 512, 62, 160, 36, 18);
  context.fillStyle = '#060908';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.lineWidth = 3;
  context.stroke();

  // Header: logo badge and event name (wraps onto two lines instead of being cut off).
  roundedRect(context, 76, 142, 136, 136, 30);
  context.fillStyle = '#ffffff';
  context.fill();
  drawContainImage(context, youth, 86, 152, 116, 116);
  context.fillStyle = '#ffffff';
  drawFittedText(context, eventName, { x: 244, centerY: 210, maxWidth: 850, maxLines: 2, size: 54, minSize: 34, weight: 700, family: SANS, lineHeight: 1.08, align: 'left' });

  // EXECUTIVE pill.
  roundedRect(context, 412, 330, 360, 70, 35);
  context.fillStyle = TEAL;
  context.fill();
  context.fillStyle = '#ffffff';
  drawFittedText(context, 'EXECUTIVE', { x: 592, centerY: 366, maxWidth: 320, maxLines: 1, size: 32, minSize: 24, weight: 800, family: SANS, tracking: 8 });

  // Circular photo with a teal ring and an orange arc.
  const cx = 592;
  const cy = 730;
  const radius = 255;
  context.beginPath();
  context.arc(cx, cy, radius + 28, 0, Math.PI * 2);
  context.fillStyle = BRIGHT_TEAL;
  context.fill();
  context.beginPath();
  context.arc(cx, cy, radius + 10, 0, Math.PI * 2);
  context.fillStyle = '#0e1312';
  context.fill();
  context.strokeStyle = ORANGE;
  context.lineWidth = 12;
  context.lineCap = 'round';
  context.beginPath();
  context.arc(cx, cy, radius + 52, Math.PI * 1.08, Math.PI * 1.42);
  context.stroke();
  context.beginPath();
  context.arc(cx, cy, radius + 52, Math.PI * 0.08, Math.PI * 0.42);
  context.stroke();
  context.save();
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.clip();
  if (photo) {
    drawCoverImage(context, photo, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    context.fillStyle = '#2a3331';
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    context.fillStyle = '#d6efec';
    drawFittedText(context, initials(executive.fullName), { x: cx, centerY: cy, maxWidth: radius * 1.6, maxLines: 1, size: 150, minSize: 80, weight: 800, family: SANS });
  }
  context.restore();

  // Name.
  context.fillStyle = '#ffffff';
  drawFittedText(context, executive.fullName.toUpperCase(), { x: 592, centerY: 1112, maxWidth: 1010, maxLines: 2, size: 80, minSize: 44, weight: 900, family: SANS, lineHeight: 1.0 });

  // Leadership role on an orange bar.
  polygon(context, [[132, 1210], [1084, 1210], [1056, 1302], [104, 1302]], ORANGE);
  context.fillStyle = '#13201e';
  drawFittedText(context, (executive.leadershipRole || 'Executive').toUpperCase(), { x: 592, centerY: 1257, maxWidth: 880, maxLines: 1, size: 46, minSize: 24, weight: 800, family: SANS });

  // Band, group and department.
  const rows: Array<[string, string]> = [
    ['BAND', show(executive.fellowshipBand)],
    ['GROUP', show(executive.conventionGroup)],
    ['DEPARTMENT', show(executive.departments.join(', '))],
  ];
  rows.forEach(([label, value], index) => {
    const top = 1360 + index * 112;
    context.fillStyle = BRIGHT_TEAL;
    context.font = `700 26px ${SANS}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(label, 100, top);
    context.fillStyle = '#ffffff';
    drawFittedText(context, value, { x: 100, centerY: top + 44, maxWidth: 620, maxLines: 1, size: 40, minSize: 26, weight: 700, family: SANS, align: 'left' });
    if (index < rows.length - 1) {
      context.fillStyle = 'rgba(255,255,255,0.10)';
      context.fillRect(100, top + 84, 620, 2);
    }
  });

  // QR code (the executive ID, read by the check-in scanner).
  roundedRect(context, 784, 1336, 304, 304, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  if (qr) context.drawImage(qr, 806, 1358, 260, 260);
  context.fillStyle = '#9fb3b0';
  drawFittedText(context, 'Scan to verify', { x: 936, centerY: 1676, maxWidth: 300, maxLines: 1, size: 24, minSize: 20, weight: 600, family: SANS });

  // ID.
  roundedRect(context, 100, 1712, 340, 86, 20);
  context.fillStyle = 'rgba(8,184,173,0.16)';
  context.fill();
  context.strokeStyle = BRIGHT_TEAL;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = '#ffffff';
  drawFittedText(context, `ID : ${tagNumber(executive.code)}`, { x: 270, centerY: 1756, maxWidth: 300, maxLines: 1, size: 40, minSize: 26, weight: 800, family: 'Inter, Arial, sans-serif' });

  // Signature line.
  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.fillRect(700, 1798, 388, 3);
  context.fillStyle = '#b9c7c5';
  context.font = 'italic 28px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Youth Exco Signature', 894, 1840);

  // Footer band.
  context.fillStyle = ORANGE;
  context.fillRect(0, 1906, width, 10);
  context.fillStyle = TEAL;
  context.fillRect(0, 1916, width, height - 1916);
  context.fillStyle = '#ffffff';
  drawFittedText(context, eventName.toUpperCase(), { x: 592, centerY: 1960, maxWidth: 1000, maxLines: 1, size: 30, minSize: 20, weight: 700, family: SANS });
  context.restore();
}

/** Media team members (any department whose name contains "media") get the media tag and a back page. */
export function isMediaTeam(departments: string[]) {
  return departments.some(name => /media/i.test(name));
}

const MEDIA_ORANGE = '#ff7a00';

/** Black card with an orange glow from one corner (shared by the media front and back). */
function mediaBackground(context: CanvasRenderingContext2D, glowX: number, glowY: number) {
  const { width, height } = context.canvas;
  context.fillStyle = '#0b0b0b';
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, 1400);
  glow.addColorStop(0, 'rgba(255,122,0,0.62)');
  glow.addColorStop(0.45, 'rgba(255,90,0,0.20)');
  glow.addColorStop(1, 'rgba(255,90,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function lanyardSlot(context: CanvasRenderingContext2D) {
  roundedRect(context, 512, 62, 160, 36, 18);
  context.fillStyle = '#000000';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.18)';
  context.lineWidth = 3;
  context.stroke();
}

/** Rounded square rotated 45° (the media photo frame). */
function diamondPath(context: CanvasRenderingContext2D, cx: number, cy: number, side: number, radius: number) {
  context.save();
  context.translate(cx, cy);
  context.rotate(Math.PI / 4);
  roundedRect(context, -side / 2, -side / 2, side, side, radius);
  context.restore();
}

/**
 * Media tag front: giant MEDIA lettering down a white strip on the left, outlined MEDIA type behind,
 * a diamond photo on an orange glow, and the convention details on a white panel.
 */
async function drawMediaFront(context: CanvasRenderingContext2D, attendee: TagAttendee, eventName: string, kind: 'member' | 'executive') {
  const { width, height } = context.canvas;
  const [youth, photo, qr] = await Promise.all([
    loadCanvasImage(youthLogo),
    loadOptionalImage(attendee.profilePhoto),
    qrImage(attendee.code, '#0b0b0b'),
  ]);
  const strip = 330;
  const panelX = 384;
  const centerX = (panelX + width - 60) / 2;

  roundedRect(context, 0, 0, width, height, 64);
  context.save();
  context.clip();
  mediaBackground(context, width, height);

  // Outlined MEDIA type behind the right-hand panel.
  context.save();
  context.beginPath();
  context.rect(strip, 0, width - strip, height);
  context.clip();
  context.strokeStyle = 'rgba(255,255,255,0.09)';
  context.lineWidth = 3;
  context.font = `900 300px ${SANS}`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  for (let row = 0; row < 7; row += 1) context.strokeText('MEDIA', row % 2 ? strip - 120 : strip + 20, 330 + row * 290);
  context.restore();

  // White strip with giant MEDIA lettering reading bottom to top.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, strip, height);
  context.save();
  context.translate(strip - 34, height - 60);
  context.rotate(-Math.PI / 2);
  context.font = `900 360px ${SANS}`;
  const lettering = context.measureText('MEDIA').width;
  context.scale((height - 120) / lettering, 1);
  context.fillStyle = '#0b0b0b';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText('MEDIA', 0, 0);
  context.restore();
  context.fillStyle = MEDIA_ORANGE;
  context.fillRect(strip, 0, 8, height);

  lanyardSlot(context);

  // Header.
  roundedRect(context, panelX, 140, 112, 112, 26);
  context.fillStyle = '#ffffff';
  context.fill();
  drawContainImage(context, youth, panelX + 8, 148, 96, 96);
  context.fillStyle = '#ffffff';
  drawFittedText(context, eventName, { x: panelX + 136, centerY: 196, maxWidth: width - panelX - 136 - 60, maxLines: 2, size: 42, minSize: 28, weight: 700, family: SANS, lineHeight: 1.08, align: 'left' });
  context.fillStyle = MEDIA_ORANGE;
  drawFittedText(context, 'OFFICIAL MEDIA TEAM', { x: centerX, centerY: 318, maxWidth: width - panelX - 60, maxLines: 1, size: 28, minSize: 20, weight: 800, family: SANS, tracking: 10 });

  // Diamond photo on an orange gradient diamond.
  const cy = 690;
  const glow = context.createLinearGradient(centerX - 300, cy - 300, centerX + 300, cy + 300);
  glow.addColorStop(0, '#ffb000');
  glow.addColorStop(1, '#ff4d00');
  diamondPath(context, centerX, cy, 470, 60);
  context.fillStyle = glow;
  context.fill();
  context.save();
  diamondPath(context, centerX, cy, 400, 48);
  context.clip();
  if (photo) {
    drawCoverImage(context, photo, centerX - 290, cy - 290, 580, 580);
  } else {
    context.fillStyle = '#1d1d1d';
    context.fillRect(centerX - 290, cy - 290, 580, 580);
    context.fillStyle = '#ffffff';
    drawFittedText(context, initials(attendee.fullName), { x: centerX, centerY: cy, maxWidth: 300, maxLines: 1, size: 130, minSize: 70, weight: 800, family: SANS });
  }
  context.restore();

  // Name and role.
  context.fillStyle = '#ffffff';
  drawFittedText(context, attendee.fullName.toUpperCase(), { x: centerX, centerY: 1095, maxWidth: width - panelX - 70, maxLines: 2, size: 70, minSize: 38, weight: 900, family: SANS, lineHeight: 1.02 });
  context.fillStyle = MEDIA_ORANGE;
  const role = kind === 'executive' && attendee.leadershipRole ? attendee.leadershipRole : 'Media Team';
  drawFittedText(context, role.toUpperCase(), { x: centerX, centerY: 1190, maxWidth: width - panelX - 70, maxLines: 1, size: 32, minSize: 22, weight: 800, family: SANS });

  // White details panel.
  roundedRect(context, panelX, 1250, width - panelX - 60, 330, 36);
  context.fillStyle = '#ffffff';
  context.fill();
  const rows: Array<[string, string]> = [
    ['GROUP', show(attendee.conventionGroup)],
    ['BAND', show(attendee.fellowshipBand)],
    ['DEPARTMENT', show(attendee.departments.join(', '))],
  ];
  rows.forEach(([label, value], index) => {
    const top = 1300 + index * 100;
    context.fillStyle = '#8a8a85';
    context.font = `700 22px ${SANS}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(label, panelX + 40, top);
    context.fillStyle = '#0b0b0b';
    drawFittedText(context, value, { x: panelX + 40, centerY: top + 36, maxWidth: width - panelX - 140, maxLines: 1, size: 36, minSize: 22, weight: 800, family: SANS, align: 'left' });
  });

  // ID and QR code.
  context.fillStyle = '#ffffff';
  drawFittedText(context, `ID : ${tagNumber(attendee.code)}`, { x: panelX, centerY: 1680, maxWidth: 420, maxLines: 1, size: 48, minSize: 28, weight: 800, family: 'Inter, Arial, sans-serif', align: 'left' });
  context.fillStyle = 'rgba(255,255,255,0.65)';
  drawFittedText(context, 'Press access · all sessions', { x: panelX, centerY: 1740, maxWidth: 420, maxLines: 1, size: 26, minSize: 20, weight: 600, family: SANS, align: 'left' });
  roundedRect(context, width - 60 - 210, 1612, 210, 210, 22);
  context.fillStyle = '#ffffff';
  context.fill();
  if (qr) context.drawImage(qr, width - 60 - 195, 1627, 180, 180);

  // Footer.
  context.fillStyle = MEDIA_ORANGE;
  context.fillRect(panelX, 1880, width - panelX - 60, 4);
  context.fillStyle = '#ffffff';
  drawFittedText(context, eventName.toUpperCase(), { x: centerX, centerY: 1940, maxWidth: width - panelX - 70, maxLines: 1, size: 28, minSize: 18, weight: 700, family: SANS });
  context.restore();
}

/** Media tag back: faded MEDIA TEAM type, a large QR code, the ID and what the pass allows. */
async function drawMediaBack(context: CanvasRenderingContext2D, attendee: TagAttendee, eventName: string, kind: 'member' | 'executive') {
  const { width, height } = context.canvas;
  const [youth, qr] = await Promise.all([loadCanvasImage(youthLogo), qrImage(attendee.code, '#0b0b0b')]);

  roundedRect(context, 0, 0, width, height, 64);
  context.save();
  context.clip();
  mediaBackground(context, 0, 0);

  // Faded stacked MEDIA / TEAM lettering.
  context.fillStyle = 'rgba(255,255,255,0.06)';
  context.font = `900 330px ${SANS}`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  ['MEDIA', 'TEAM', 'MEDIA', 'TEAM', 'MEDIA', 'TEAM', 'MEDIA'].forEach((word, row) => context.fillText(word, -30, 330 + row * 290));

  lanyardSlot(context);

  roundedRect(context, 532, 140, 120, 120, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  drawContainImage(context, youth, 541, 149, 102, 102);
  context.fillStyle = '#ffffff';
  drawFittedText(context, eventName, { x: 592, centerY: 318, maxWidth: 960, maxLines: 1, size: 40, minSize: 26, weight: 700, family: SANS });

  context.fillStyle = 'rgba(255,255,255,0.75)';
  drawFittedText(context, 'SCAN TO VERIFY', { x: 592, centerY: 452, maxWidth: 800, maxLines: 1, size: 28, minSize: 20, weight: 500, family: SANS, tracking: 10 });
  context.fillStyle = '#ffffff';
  drawFittedText(context, 'MEDIA PASS', { x: 592, centerY: 522, maxWidth: 900, maxLines: 1, size: 70, minSize: 40, weight: 900, family: SANS });

  roundedRect(context, 292, 600, 600, 600, 44);
  context.fillStyle = '#ffffff';
  context.fill();
  if (qr) context.drawImage(qr, 332, 640, 520, 520);

  roundedRect(context, 312, 1240, 560, 92, 46);
  context.fillStyle = '#ffffff';
  context.fill();
  context.fillStyle = '#0b0b0b';
  drawFittedText(context, attendee.code, { x: 592, centerY: 1287, maxWidth: 500, maxLines: 1, size: 42, minSize: 26, weight: 800, family: 'Inter, Arial, sans-serif' });

  context.fillStyle = '#ffffff';
  drawFittedText(context, attendee.fullName, { x: 592, centerY: 1420, maxWidth: 1000, maxLines: 1, size: 56, minSize: 32, weight: 800, family: SANS });
  context.fillStyle = MEDIA_ORANGE;
  const role = kind === 'executive' && attendee.leadershipRole ? `${attendee.leadershipRole} · Media Team` : 'Media Team';
  drawFittedText(context, role.toUpperCase(), { x: 592, centerY: 1484, maxWidth: 1000, maxLines: 1, size: 30, minSize: 20, weight: 800, family: SANS });

  context.fillStyle = 'rgba(255,255,255,0.72)';
  drawFittedText(context, 'This pass identifies the holder as an official member of the convention media team, authorised to photograph, film and cover convention sessions.', { x: 592, centerY: 1640, maxWidth: 960, maxLines: 3, size: 32, minSize: 24, weight: 500, family: SANS, lineHeight: 1.35 });
  context.fillStyle = 'rgba(255,255,255,0.5)';
  drawFittedText(context, 'If found, please return it to the media desk.', { x: 592, centerY: 1790, maxWidth: 960, maxLines: 1, size: 26, minSize: 20, weight: 500, family: SANS });

  const band = context.createLinearGradient(0, 0, width, 0);
  band.addColorStop(0, '#ffb000');
  band.addColorStop(1, '#ff4d00');
  context.fillStyle = band;
  context.fillRect(0, 1890, width, height - 1890);
  context.fillStyle = '#0b0b0b';
  drawFittedText(context, `MEDIA  ·  ${eventName.toUpperCase()}`, { x: 592, centerY: 1950, maxWidth: 1040, maxLines: 1, size: 32, minSize: 20, weight: 800, family: SANS });
  context.restore();
}

function newCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1184;
  canvas.height = 2008;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create tag image.');
  return { canvas, context };
}

/** Renders the front of the tag as a PNG data URL (media team members get the media design). */
export async function createTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const { canvas, context } = newCanvas();
  if (isMediaTeam(member.departments)) await drawMediaFront(context, member, eventName, kind);
  else if (kind === 'executive') await drawExecutiveTag(context, member, eventName);
  else await drawMemberTag(context, member, eventName);
  return canvas.toDataURL('image/png');
}

/** Back of the tag as a PNG data URL; only media team members have one (null otherwise). */
export async function createTagBackImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  if (!isMediaTeam(member.departments)) return null;
  const { canvas, context } = newCanvas();
  await drawMediaBack(context, member, eventName, kind);
  return canvas.toDataURL('image/png');
}

function withinSeconds<T>(promise: Promise<T>, seconds: number) {
  return Promise.race([promise, new Promise<undefined>(resolve => window.setTimeout(() => resolve(undefined), seconds * 1000))])
    .catch(() => undefined);
}

/**
 * Tag PNGs (front, and back for the media team) for attaching to an email, each left out if it
 * cannot be made quickly. The email must never wait on (or fail because of) the attachments:
 * it already links to the tag download page.
 */
export async function tagImagesForEmail(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const [tagPng, tagBackPng] = await Promise.all([
    withinSeconds(createTagImage(member, eventName, kind), 10),
    withinSeconds(createTagBackImage(member, eventName, kind), 10),
  ]);
  return { tagPng: tagPng ?? undefined, tagBackPng: tagBackPng ?? undefined };
}

function saveDataUrl(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

/** Triggers a browser download of the tag PNG (and the back, for the media team). */
export async function downloadTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const url = await createTagImage(member, eventName, kind);
  saveDataUrl(url, `${member.code}-convention-tag.png`);
  const back = await createTagBackImage(member, eventName, kind);
  if (back) window.setTimeout(() => saveDataUrl(back, `${member.code}-convention-tag-back.png`), 400);
  return url;
}
