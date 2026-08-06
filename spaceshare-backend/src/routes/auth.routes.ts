import { Router } from 'express';
import {
  register,
  verify,
  resendCode,
  login,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
  googleAuth,
  appleAuth,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/resend-code', resendCode);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordController);
router.post('/verify-reset-code', verifyResetCodeController);
router.post('/reset-password', resetPasswordController);
router.post('/google', googleAuth);
router.post('/apple', appleAuth);

export default router;