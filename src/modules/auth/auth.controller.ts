import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { created, ok } from '../../utils/response';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'rt';

/**
 * FE nằm trên vercel.app, BE trên onrender.com → hai site khác nhau,
 * nên cookie bắt buộc SameSite=None + Secure thì trình duyệt mới gửi kèm.
 * Ở localhost thì Secure=false vì http://localhost không có TLS.
 */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? ('none' as const) : ('lax' as const),
    path: '/api/v1/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 86_400_000,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
}

function readRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body, req);
  return created(res, result);
}

export async function login(req: Request, res: Response) {
  const { refreshToken, refreshId, ...rest } = await authService.login(req.body, req);
  void refreshId;
  setRefreshCookie(res, refreshToken);
  return ok(res, rest);
}

export async function refresh(req: Request, res: Response) {
  const raw = readRefreshCookie(req) ?? '';
  const { refreshToken, refreshId, ...rest } = await authService.refresh(raw, req);
  void refreshId;
  setRefreshCookie(res, refreshToken);
  return ok(res, rest);
}

export async function logout(req: Request, res: Response) {
  await authService.logout(readRefreshCookie(req), req);
  clearRefreshCookie(res);
  return ok(res, { message: 'Đã đăng xuất' });
}

export async function logoutAll(req: Request, res: Response) {
  await authService.logoutAll(req.user!.id, req);
  clearRefreshCookie(res);
  return ok(res, { message: 'Đã đăng xuất khỏi tất cả thiết bị' });
}

export async function sendOtp(req: Request, res: Response) {
  return ok(res, await authService.sendOtp(req.body));
}

export async function verifyOtp(req: Request, res: Response) {
  const result = await authService.verifyOtp(req.body, req);
  if ('refreshToken' in result && result.refreshToken) {
    const { refreshToken, refreshId, ...rest } = result;
    void refreshId;
    setRefreshCookie(res, refreshToken);
    return ok(res, rest);
  }
  return ok(res, result);
}

export async function forgotPassword(req: Request, res: Response) {
  return ok(res, await authService.forgotPassword(req.body.identifier));
}

export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body, req);
  clearRefreshCookie(res);
  return ok(res, result);
}

export async function changePassword(req: Request, res: Response) {
  const { refreshToken, refreshId, ...rest } = await authService.changePassword(
    req.user!.id,
    req.body,
    req,
    readRefreshCookie(req),
  );
  void refreshId;
  setRefreshCookie(res, refreshToken);
  return ok(res, rest);
}

export async function me(req: Request, res: Response) {
  return ok(res, await authService.getMe(req.user!.id));
}

export async function sessions(req: Request, res: Response) {
  return ok(res, await authService.listSessions(req.user!.id, readRefreshCookie(req)));
}

export async function revokeSession(req: Request, res: Response) {
  await authService.revokeSession(req.user!.id, req.params.id, req);
  return ok(res, { message: 'Đã đăng xuất thiết bị' });
}

export async function addIdentifier(req: Request, res: Response) {
  return created(res, await authService.addIdentifier(req.user!.id, req.body.identifier));
}
