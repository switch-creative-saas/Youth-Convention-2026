// Draws a convention tag as a PNG (used for downloads and the confirmation email attachment).
import youthLogo from '@/assets/youth-logo.png';
import type { TagAttendee } from '@/components/ConventionTag';
import { tagNumber } from '@/lib/format';

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // Stored photos come from Supabase Storage; request CORS so the canvas can be exported.
    if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
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

/** Renders the tag; executives show EXECUTIVE and their leadership role instead of group and band. */
export async function createTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const heading = kind === 'executive' ? 'EXECUTIVE' : member.conventionGroup.toUpperCase();
  const strip = (kind === 'executive' ? member.leadershipRole || 'Executive' : member.fellowshipBand).toUpperCase();
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
  setFittedFont(context, 600, 44, '"Brush Script MT", "Segoe Script", cursive', eventName, 370, 26);
  context.fillText(eventName, 212, 110);
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
  context.fillText(heading, 592, 312);

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
  setFittedFont(context, 900, 43, 'Poppins, Arial, sans-serif', strip, 460, 30);
  context.fillText(strip, 592, 1542);

  context.fillStyle = teal;
  roundedRect(context, 376, 1628, 428, 82, 14);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '800 34px Inter, Arial, sans-serif';
  context.fillText(`ID : ${tagNumber(member.code)}`, 590, 1681);

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

/** Triggers a browser download of the tag PNG. */
export async function downloadTagImage(member: TagAttendee, eventName: string, kind: 'member' | 'executive' = 'member') {
  const url = await createTagImage(member, eventName, kind);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${member.code}-convention-tag.png`;
  anchor.click();
  return url;
}
