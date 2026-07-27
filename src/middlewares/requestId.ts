import type { NextFunction, Request, Response } from 'express';
import { generateUuid } from '../utils/crypto';

/** Gắn ID cho mỗi request để lần vết log xuyên suốt một luồng xử lý. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('X-Request-Id');
  const id = incoming && incoming.length <= 64 ? incoming : generateUuid();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
