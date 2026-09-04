import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import listingRoutes from './routes/listing.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import notificationRoutes from './routes/notification.routes';
import disputeRoutes from './routes/dispute.routes';
import reviewRoutes from './routes/review.routes';
import adminRoutes from './routes/admin/index.routes';
import { errorHandler } from './middleware/error-handler.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins for browser-based clients (admin dashboard).
// The mobile app doesn't send an Origin header, so it's unaffected by this list.
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

// Strict limiter specifically for login — only counts FAILED attempts,
// so legitimate users logging in successfully never get close to the limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

// Tighter limiter for OTP-related endpoints (verify, resend-code, verify-reset-code) —
// only counts failures, since a correct code shouldn't count against the user
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed attempts. Please try again in 15 minutes.' },
});

// Strict limiter for forgot-password — counts ALL requests (not just failures),
// since every call sends a real email regardless of whether the account exists
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in 15 minutes.' },
});

// General limiter for the rest of /api/auth (register) — counts all requests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// General limiter for everything else — basic abuse protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Payment initiation — creates real Flutterwave payment links, shouldn't be spammable
const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment attempts. Please try again in 15 minutes.' },
});

// Change password — brute-forceable "current password" field, same risk as login
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed attempts. Please try again in 15 minutes.' },
});

// Admin routes — small, trusted user base doing sensitive/financial actions;
// tighter than general traffic since admins never need anywhere close to 300 req/15min
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/verify', otpLimiter);
app.use('/api/auth/resend-code', otpLimiter);
app.use('/api/auth/verify-reset-code', otpLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/payments/initiate', paymentInitiateLimiter);
app.use('/api/users/me/change-password', changePasswordLimiter);
app.use('/api/admin', adminLimiter);
app.use(generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews', reviewRoutes);
//admin routes
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SpaceShare API is running' });
});

// Error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;