import { PHOTO_BUCKET, errorMessage, supabase } from '@/lib/supabase';

/** Target size for attendee photos. The bucket rejects anything over 500 KB. */
export const PHOTO_TARGET_BYTES = 300 * 1024;
const MAX_DIMENSION = 900;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Unable to compress the photo.'))), 'image/jpeg', quality);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Resizes and re-encodes a photo as JPEG until it is under PHOTO_TARGET_BYTES. */
export async function compressPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const image = await loadImage(file);
  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to process the photo in this browser.');

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await toBlob(canvas, quality);
      if (blob.size <= PHOTO_TARGET_BYTES) return { blob, dataUrl: await blobToDataUrl(blob) };
    }
    scale *= 0.8;
  }
  throw new Error('This photo is too large even after compression. Please choose a smaller image.');
}

/** Uploads a compressed registration photo under the prefix returned by get_registration_form. */
export async function uploadRegistrationPhoto(pathPrefix: string, blob: Blob) {
  const path = `${pathPrefix}${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Photo upload failed: ${errorMessage(error)}`);
  return path;
}
