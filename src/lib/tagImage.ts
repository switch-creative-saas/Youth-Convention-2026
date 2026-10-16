// Draws a convention tag as a PNG (used for downloads, the on-screen executive tag and the
// confirmation email attachment). Members keep the light patterned design; executives get a
// dark ID-card design with their leadership role, band, group, department and a QR code.
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

function qrImage(value: string) {
  // xmlns is required for an SVG to load as an <img>/canvas image.
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value, size: 512, marginSize: 0, level: 'M', fgColor: '#0e1312', bgColor: '#ffffff', xmlns: 'http://www.w3.org/2000/svg' }));
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
  weight: number | string; family: string; lineHeight?: number; align?: CanvasTextAlign;
}) {
  const { x, centerY, maxWidth, maxLines, minSize, weight, family, align = 'center' } = options;
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
}

const SANS = 'Poppins, "Segoe UI", Arial, sans-serif';
const SCRIPT = '"Brush Script MT", "Segoe Script", cursive';
const TEAL = '#069d92';
const BRIGHT_TEAL = '#08b8ad';
const ORANGE = '#ff9f00';
const CHARCOAL = '#484848';

async function drawMemberTag(context: CanvasRenderingContext2D, member: TagAttendee, eventName: string) {
  const { width, height } = context.canvas;
  const [youth, photo] = await Promise.all([loadCanvasImage(youthLogo), loadOptionalImage(member.profilePhoto)]);

  const drawRing = (x: number, y: number, radius: number) => {
    context.save();
    context.fillStyle = BRIGHT_TEAL;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f7f7f7';
    context.beginPath();
    context.arc(x, y, radius - 28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = CHARCOAL;
    context.beginPath();
    context.arc(x, y, radius - 58, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawDotGrid = (x: number, y: number, gridWidth: number, gridHeight: number) => {
    context.fillStyle = CHARCOAL;
    for (let dotY = y + 6; dotY < y + gridHeight; dotY += 28) {
      for (let dotX = x + 6; dotX < x + gridWidth; dotX += 28) {
        context.beginPath();
        context.arc(dotX, dotY, 7, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  const drawStripes = (x: number, y: number, stripeWidth: number, stripeHeight: number) => {
    context.save();
    context.beginPath();
    context.rect(x, y, stripeWidth, stripeHeight);
    context.clip();
    context.strokeStyle = ORANGE;
    context.lineWidth = 12;
    for (let offset = -stripeHeight; offset < stripeWidth + stripeHeight; offset += 38) {
      context.beginPath();
      context.moveTo(x + offset, y);
      context.lineTo(x + offset + stripeHeight, y + stripeHeight);
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
    context.strokeStyle = ORANGE;
    context.lineWidth = 7;
    context.strokeRect(-size / 2, -size / 2, size, size);
    context.strokeRect(-size * 0.34, -size * 0.34, size * 0.68, size * 0.68);
    context.restore();
  };

  context.fillStyle = '#f7f7f7';
  context.fillRect(0, 0, width, height);
  context.save();
  context.strokeStyle = 'rgba(226,226,226,0.58)';
  context.lineWidth = 30;
  for (let offset = -height; offset < width; offset += 72) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + height, height);
    context.stroke();
  }
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
  context.fillStyle = BRIGHT_TEAL;
  context.beginPath();
  context.arc(864, 186, 42, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(352, 1788, 42, 0, Math.PI * 2);
  context.fill();

  // Header: logo, then the event name on up to two lines, kept clear of the ring beside it.
  drawContainImage(context, youth, 64, 40, 132, 132);
  context.fillStyle = '#0b4a43';
  drawFittedText(context, eventName, { x: 210, centerY: 108, maxWidth: 300, maxLines: 2, size: 46, minSize: 26, weight: 600, family: SCRIPT, lineHeight: 1.05, align: 'left' });

  context.fillStyle = '#0b4a43';
  drawFittedText(context, member.conventionGroup.toUpperCase(), { x: 592, centerY: 296, maxWidth: 760, maxLines: 1, size: 48, minSize: 30, weight: 600, family: SANS });

  context.fillStyle = CHARCOAL;
  context.fillRect(300, 330, 580, 920);
  context.fillStyle = '#f7f7f7';
  context.fillRect(370, 352, 440, 44);
  context.fillRect(326, 398, 528, 820);
  if (photo) drawCoverImage(context, photo, 326, 398, 528, 820);
  polygon(context, [[880, 1010], [880, 1250], [586, 1250]], CHARCOAL);

  polygon(context, [[258, 1312], [1008, 1312], [940, 1534], [226, 1534]], TEAL);
  context.fillStyle = '#ffffff';
  drawFittedText(context, member.fullName.toUpperCase(), { x: 592, centerY: 1390, maxWidth: 650, maxLines: 2, size: 60, minSize: 36, weight: 900, family: SANS, lineHeight: 1.04 });

  polygon(context, [[246, 1448], [982, 1482], [936, 1582], [288, 1604]], ORANGE);
  context.fillStyle = '#334155';
  drawFittedText(context, member.fellowshipBand.toUpperCase(), { x: 592, centerY: 1532, maxWidth: 520, maxLines: 1, size: 43, minSize: 28, weight: 900, family: SANS });

  context.fillStyle = TEAL;
  roundedRect(context, 376, 1628, 428, 82, 14);
  context.fill();
  context.fillStyle = '#ffffff';
  drawFittedText(context, `ID : ${tagNumber(member.code)}`, { x: 590, centerY: 1670, maxWidth: 380, maxLines: 1, size: 34, minSize: 26, weight: 800, family: 'Inter, Arial, sans-serif' });

  context.strokeStyle = '#0b4a43';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(758, 1918);
  context.lineTo(1134, 1918);
  context.stroke();
  context.fillStyle = '#0b4a43';
  context.font = 'italic 28px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText('Youth Exco Signature', 956, 1974);
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
  drawFittedText(context, 'E X E C U T I V E', { x: 592, centerY: 366, maxWidth: 320, maxLines: 1, size: 32, minSize: 24, weight: 800, family: SANS });

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
  const show = (value?: string | null) => (value && value !== 'None' && value !== 'Executive' && value !== 'Unassigned' ? value : '—');
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

/** Renders the tag as a PNG data URL. */
export async function createTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const canvas = document.createElement('canvas');
  canvas.width = 1184;
  canvas.height = 2008;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create tag image.');
  if (kind === 'executive') await drawExecutiveTag(context, member, eventName);
  else await drawMemberTag(context, member, eventName);
  return canvas.toDataURL('image/png');
}

/**
 * Tag PNG for attaching to an email, or undefined if it cannot be made quickly. The email must
 * never wait on (or fail because of) the attachment: it already links to the tag download page.
 */
export async function tagImageForEmail(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  try {
    return await Promise.race([
      createTagImage(member, eventName, kind),
      new Promise<undefined>(resolve => window.setTimeout(() => resolve(undefined), 10000)),
    ]);
  } catch {
    return undefined;
  }
}

/** Triggers a browser download of the tag PNG. */
export async function downloadTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const url = await createTagImage(member, eventName, kind);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${member.code}-convention-tag.png`;
  anchor.click();
  return url;
}
