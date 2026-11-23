const nodeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const rawApiBaseUrl = (
  (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ||
  nodeEnv?.VITE_API_BASE_URL ||
  ''
).trim();

export const ENV = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/+$/, ''),
  requestTimeoutMs: 60000,
} as const;

export function isApiConfigured(): boolean {
  return ENV.apiBaseUrl.length > 0;
}
