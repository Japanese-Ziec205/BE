import { Router } from 'express';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  loginLimiter,
  otpSendLimiter,
  passwordResetLimiter,
  refreshLimiter,
  registerLimiter,
} from '../../middlewares/rateLimit';
import * as ctrl from './auth.controller';
import {
  addIdentifierSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from './auth.validators';

const router = Router();

// --- Công khai ---
router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(ctrl.register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(ctrl.login));
router.post('/refresh', refreshLimiter, asyncHandler(ctrl.refresh));
router.post('/logout', asyncHandler(ctrl.logout));

router.post('/otp/send', otpSendLimiter, validate(sendOtpSchema), asyncHandler(ctrl.sendOtp));
router.post('/otp/verify', validate(verifyOtpSchema), asyncHandler(ctrl.verifyOtp));

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(ctrl.forgotPassword),
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(ctrl.resetPassword),
);

// --- Cần đăng nhập ---
router.use(authenticate);

router.get('/me', asyncHandler(ctrl.me));
router.post('/logout-all', asyncHandler(ctrl.logoutAll));
router.post('/change-password', validate(changePasswordSchema), asyncHandler(ctrl.changePassword));
router.get('/sessions', asyncHandler(ctrl.sessions));
router.delete('/sessions/:id', asyncHandler(ctrl.revokeSession));
router.post('/identifiers', validate(addIdentifierSchema), asyncHandler(ctrl.addIdentifier));

export default router;
