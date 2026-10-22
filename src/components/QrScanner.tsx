import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

const SCAN_INTERVAL_MS = 180;

/** Uses the browser's built-in QR detector when it has one (Android Chrome), otherwise jsQR (iPad/iPhone Safari). */
async function createDetector(): Promise<Detector | null> {
  const Native = (window as unknown as { BarcodeDetector?: DetectorConstructor & { getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!Native) return null;
  try {
    const formats = (await Native.getSupportedFormats?.()) ?? [];
    return formats.includes('qr_code') ? new Native({ formats: ['qr_code'] }) : null;
  } catch {
    return null;
  }
}

function cameraError(error: unknown) {
  const name = (error as { name?: string })?.name;
  if (!window.isSecureContext) return 'The camera only works on the secure (https) site.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked. Allow the camera for this site in the browser settings, then tap "Start camera".';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'Could not start the camera.';
}

/**
 * Live camera QR reader for tablets and phones. Calls onScan with the decoded text of each QR code
 * it sees (the parent handles duplicates). `paused` stops decoding without turning the camera off.
 */
export function QrScanner({ onScan, paused = false }: { onScan: (text: string) => void; paused?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; status: 'running' | 'error'; message?: string }>({ key: '', status: 'running' });
  const key = `${facing}:${attempt}`;

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let lastScan = 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        const detector = await createDetector();
        if (stopped) return;
        setState({ key, status: 'running' });

        const tick = async (time: number) => {
          if (stopped) return;
          frame = window.requestAnimationFrame(tick);
          if (pausedRef.current || time - lastScan < SCAN_INTERVAL_MS || video.readyState < 2 || !video.videoWidth) return;
          lastScan = time;
          try {
            let text: string | null = null;
            if (detector) {
              const codes = await detector.detect(video);
              text = codes[0]?.rawValue ?? null;
            } else if (context) {
              // Downscale for speed; tag QR codes are large enough to read at this size.
              const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
            if (text && !stopped) onScanRef.current(text.trim());
          } catch {
            // A frame that cannot be decoded is simply skipped.
          }
        };
        frame = window.requestAnimationFrame(tick);
      } catch (error) {
        if (!stopped) setState({ key, status: 'error', message: cameraError(error) });
      }
    };
    void start();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
    };
    // `key` restarts the camera when the facing mode changes or the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const failed = state.key === key && state.status === 'error';
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-black">
      <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
      {!failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className={`relative h-[62%] aspect-square rounded-3xl border-4 ${paused ? 'border-white/30' : 'border-white/80'}`}>
            {!paused && <div className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse bg-[#08b8ad]" />}
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
          <div>
            <CameraOff className="mx-auto h-10 w-10 opacity-80" />
            <p className="mt-3 text-sm">{state.message}</p>
            <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black">
              <Camera className="h-4 w-4" /> Start camera
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setFacing(value => (value === 'environment' ? 'user' : 'environment'))}
        className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs font-bold text-white backdrop-blur"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Switch camera
      </button>
    </div>
  );
}
