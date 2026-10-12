// SecuGen WebAPI client (Hamster Pro 20). The SgiBioSrv service must be installed and
// running on the check-in PC; it exposes HTTPS endpoints on localhost.
// Capture: POST /SGIFPCapture   Match: POST /SGIMatchScore

export const SECUGEN_SERVICE_URL = (import.meta.env.VITE_SECUGEN_SERVICE_URL as string | undefined) || 'https://localhost:8443';
const LICENSE = (import.meta.env.VITE_SECUGEN_LICENSE as string | undefined) ?? '';
/** SGIMatchScore returns 0-199. Scores at or above this are treated as a match. */
export const MATCH_THRESHOLD = Number(import.meta.env.VITE_SECUGEN_MATCH_THRESHOLD) || 100;
/** Minimum image quality (0-100) accepted for enrolment. */
export const ENROLL_MIN_QUALITY = 50;

const ERROR_MESSAGES: Record<number, string> = {
  51: 'System file load failure',
  52: 'Sensor chip initialization failed',
  53: 'Fingerprint scanner not found',
  54: 'Fingerprint capture timed out — place the finger on the scanner and try again',
  55: 'No scanner available',
  56: 'Scanner driver failed to load',
  57: 'Wrong image',
  58: 'Lack of USB bandwidth',
  59: 'Scanner is busy',
  60: 'Cannot read the scanner serial number',
  61: 'Unsupported scanner',
  63: 'SgiBioSrv did not start — try the capture again',
};

export class SecuGenError extends Error {
  code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.code = code;
  }
}

export interface CaptureResult {
  template: string;
  imageQuality: number;
  nfiq: number | null;
  serialNumber: string | null;
  model: string | null;
  bmpBase64: string | null;
}

async function post<T>(serviceUrl: string, path: string, params: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${serviceUrl.replace(/\/$/, '')}/${path}`, {
      method: 'POST',
      body: new URLSearchParams({ ...params, licstr: LICENSE }),
    });
  } catch {
    throw new SecuGenError(`Cannot reach the SecuGen WebAPI service at ${serviceUrl}. Install/start SgiBioSrv on this PC and open ${serviceUrl} once in the browser to trust its certificate.`);
  }
  if (!response.ok) throw new SecuGenError(`SecuGen service responded with HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

function check(errorCode: number) {
  if (errorCode !== 0) throw new SecuGenError(ERROR_MESSAGES[errorCode] ?? `Scanner error ${errorCode}`, errorCode);
}

export async function captureFingerprint(serviceUrl = SECUGEN_SERVICE_URL, options: { timeoutMs?: number; quality?: number } = {}): Promise<CaptureResult> {
  const result = await post<{
    ErrorCode: number; TemplateBase64?: string; ImageQuality?: number; NFIQ?: number;
    SerialNumber?: string; Model?: string; BMPBase64?: string;
  }>(serviceUrl, 'SGIFPCapture', {
    Timeout: String(options.timeoutMs ?? 10000),
    Quality: String(options.quality ?? ENROLL_MIN_QUALITY),
    templateFormat: 'ISO',
    imageWSQRate: '0.75',
  });
  check(result.ErrorCode);
  if (!result.TemplateBase64) throw new SecuGenError('The scanner returned no fingerprint template.');
  return {
    template: result.TemplateBase64,
    imageQuality: result.ImageQuality ?? 0,
    nfiq: result.NFIQ ?? null,
    serialNumber: result.SerialNumber ?? null,
    model: result.Model ?? null,
    bmpBase64: result.BMPBase64 ?? null,
  };
}

export async function matchScore(template1: string, template2: string, serviceUrl = SECUGEN_SERVICE_URL) {
  const result = await post<{ ErrorCode: number; MatchingScore?: number }>(serviceUrl, 'SGIMatchScore', {
    Template1: template1,
    Template2: template2,
    templateFormat: 'ISO',
  });
  check(result.ErrorCode);
  return result.MatchingScore ?? 0;
}

/** Matches a fresh capture against each stored template and returns the best score. */
export async function bestMatch(captured: string, enrollments: { id: string; template: string }[], serviceUrl = SECUGEN_SERVICE_URL) {
  let best: { enrollmentId: string; score: number } | null = null;
  for (const enrollment of enrollments) {
    const score = await matchScore(captured, enrollment.template, serviceUrl);
    if (!best || score > best.score) best = { enrollmentId: enrollment.id, score };
  }
  return best;
}
