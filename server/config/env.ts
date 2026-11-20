import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (nodeEnv === 'production') {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production. Refusing to start server with insecure default secret.'
      );
    }
    // Safe development fallback
    return 'tradex-dev-jwt-key-campus-marketplace-2026';
  }
  return secret;
}

export const ENV = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    ...(process.env.APP_URL ? [process.env.APP_URL] : []),
  ],
};
