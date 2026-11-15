import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Express 4 does not catch rejected promises - this forwards them to the error handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

const send = (res: Response, status: number, code: string, message: string, details?: unknown): void => {
  res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
};

export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ApiError) {
    send(res, err.status, err.code, err.message, err.details);
    return;
  }
  if (err instanceof ZodError) {
    send(
      res,
      400,
      'VALIDATION_ERROR',
      'Request validation failed.',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
    return;
  }
  const type = (err as { type?: string } | undefined)?.type;
  if (type === 'entity.parse.failed') {
    send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
    return;
  }
  if (type === 'entity.too.large') {
    send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    return;
  }
  console.error('[unhandled]', err);
  send(res, 500, 'INTERNAL_ERROR', 'Unexpected server error.');
};
