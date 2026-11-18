import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query) as Record<string, unknown>;
      // Safely copy parsed values to req.query without replacing the getter
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          (req.query as Record<string, unknown>)[key] = value;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
