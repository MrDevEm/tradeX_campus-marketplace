const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

export const ENV = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/+$/, ''),
  requestTimeoutMs: 12000,
} as const;

export function isApiConfigured(): boolean {
  return ENV.apiBaseUrl.length > 0;
}
