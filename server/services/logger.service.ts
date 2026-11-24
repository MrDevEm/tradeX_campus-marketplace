import type { Request } from 'express';

export interface LogPayload {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  environment: string;
  service: string;
  meta?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    code?: string;
    statusCode?: number;
    stack?: string;
  };
  request?: {
    method: string;
    url: string;
    path: string;
    ip?: string;
    userAgent?: string;
  };
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
  'cvv',
]);

/**
 * Recursively sanitize sensitive keys from metadata before logging.
 */
function sanitizeMeta(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeMeta);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeMeta(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Ship log to Axiom Ingest API if credentials are configured in environment variables.
 */
async function shipToAxiom(payload: LogPayload): Promise<void> {
  const axiomToken = process.env.AXIOM_TOKEN;
  const axiomDataset = process.env.AXIOM_DATASET;

  if (!axiomToken || !axiomDataset) {
    return;
  }

  try {
    const res = await fetch(`https://api.axiom.co/v1/datasets/${axiomDataset}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${axiomToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([payload]),
    });
    if (!res.ok) {
      console.warn(`[Logger] Axiom log ingestion returned status: ${res.status}`);
    }
  } catch (err) {
    console.warn('[Logger] Axiom network dispatch error:', err instanceof Error ? err.message : err);
  }
}

export function logError(err: unknown, req?: Request, meta?: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === 'production';
  const errObj = err instanceof Error ? err : new Error(String(err));
  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const code = (err as { code?: string }).code || 'SERVER_ERROR';

  const payload: LogPayload = {
    level: 'error',
    message: errObj.message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'tradeX-backend',
    error: {
      name: errObj.name,
      message: errObj.message,
      code,
      statusCode,
      stack: isProd ? undefined : errObj.stack,
    },
    meta: meta ? (sanitizeMeta(meta) as Record<string, unknown>) : undefined,
  };

  if (req) {
    payload.request = {
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  console.error(`[Error] [${payload.timestamp}] ${payload.message}`, {
    statusCode,
    code,
    path: req?.path,
  });

  // Ship to Axiom asynchronously without blocking the request loop
  shipToAxiom(payload).catch(() => {});
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const payload: LogPayload = {
    level: 'info',
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'tradeX-backend',
    meta: meta ? (sanitizeMeta(meta) as Record<string, unknown>) : undefined,
  };

  console.log(`[Info] [${payload.timestamp}] ${payload.message}`);
  shipToAxiom(payload).catch(() => {});
}
