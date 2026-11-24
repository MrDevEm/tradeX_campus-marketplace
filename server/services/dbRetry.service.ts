import { PrismaClient } from '@prisma/client';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

/**
 * Connect to PostgreSQL via Prisma Client with exponential backoff and maximum retry limits.
 */
export async function connectWithRetry(
  prismaClient: PrismaClient,
  options: RetryOptions = {}
): Promise<boolean> {
  const maxRetries = options.maxRetries ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 15000;
  const factor = options.factor ?? 2;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt++;
    try {
      await prismaClient.$connect();
      // Lightweight probe query to verify active connection
      await prismaClient.$queryRaw`SELECT 1`;
      console.log(`✅ [Database] Connected successfully to Neon PostgreSQL (attempt ${attempt}/${maxRetries}).`);
      return true;
    } catch (err) {
      console.warn(
        `⚠️ [Database] Connection attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : String(err)}`
      );

      if (attempt >= maxRetries) {
        console.error(`❌ [Database] Exhausted all ${maxRetries} connection attempts to database.`);
        return false;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const sleepTime = Math.min(currentDelay + jitter, maxDelayMs);
      console.log(`⏳ [Database] Retrying in ${Math.round(sleepTime)}ms...`);
      await new Promise((r) => setTimeout(r, sleepTime));
      currentDelay *= factor;
    }
  }

  return false;
}
