import { Router } from 'express';
import { register, verify, resendCode } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/resend-code', resendCode);

export default router;