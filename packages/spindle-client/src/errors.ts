export type FireflareErrorPayload = {
  success?: boolean;
  code?: string;
  error?: string;
  details?: unknown;
  field?: string;
  status?: string;
};

export class FireflareApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown, code?: string) {
    super(message);
    this.name = 'FireflareApiError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

export class FireflareTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FireflareTimeoutError';
  }
}

export class FireflarePollTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FireflarePollTimeoutError';
  }
}

export function normalizeFireflareError(status: number, payload: unknown): FireflareApiError {
  if (payload && typeof payload === 'object') {
    const body = payload as FireflareErrorPayload;
    const message = typeof body.error === 'string' ? body.error : `Fireflare request failed with status ${status}`;
    return new FireflareApiError(message, status, payload, body.code);
  }

  return new FireflareApiError(`Fireflare request failed with status ${status}`, status, payload);
}
