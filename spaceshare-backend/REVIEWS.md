# SpaceShare Backend — Security & Code Review
**Audit Date:** 2026-09-01  
**Scope:** Backend `spaceshare-backend/src` (shared admin + mobile endpoints).  
**Severity Legend:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW / INFO

---

## Executive Summary

| Category | Count | Breakdown |
|---|---|---|
| 🔴 **Critical** — immediate action required | 3 | CORS wildcard, No rate limiting, Flutterwave webhook missing signature verification |
| 🟠 **High** — attack surface active | 6 | JWT no revocation, bcrypt inconsistency, SQL refactor + potential JOIN N+1, verifyResetCode timing leak, payment callback XSS/open redirect, verificationCode 6-digit not rate limited |
| 🟡 **Medium** — defense-in-depth gaps | 8 | Helmet defaults only, email XSS (HTML interpolation), invitation findUnique tokenHash collision, password reuse check mobile bypass, reset-password-code after reuse, admin TTL no idle timeout, env secrets `as string` unchecked, Prisma error fall-through P2003 etc. leaked as generic fine (OK) — but no structured logging pipeline |
| 🟢 **Low / Info** | 4 | `updateMany` used where `update` enough in refund, duplicate `AuthRequest` interface, dangling string audit log desc, env secrets printed to console startup? Not seen but check |

**Overall Risk Level: HIGH.** Top-3 items below must be fixed before production deployment against NDPR / CBN financial processing requirements. None of the items block staging testing.

---

## 🔴 CRITICAL — Fix Before Production (3)

### 1. CORS is configured as wildcard `*` (No origin restriction)
**File:** `src/index.ts:22`
```ts
app.use(cors());  // ← defaults to { origin: "*" }
```

**Risk:** NDPR-required controls (shared admin backend) — any webpage on the internet can call `/api/admin/*` endpoints with `credentials: 'include'` if someone configures sameSite=none cookies later. Also means any arbitrary origin's browser JS can trigger side-effects (POST /mark-as-paid etc.) if admin has an active JWT in local/session storage on same browser (subdomain-iframe XSS pivot).

**Fix Required:** Whitelist only known-good origins:
```ts
const allowedOrigins = [
  process.env.FRONTEND_URL,        // Admin web
  process.env.MOBILE_BUNDLE_ID,    // Or mobile app scheme / deeplink host
  'capacitor://localhost',         // iOS Capacitor WebView
  'http://localhost',              // Android Capacitor WebView
  'spaceshare://payment-success',  // (if needed — payment deeplinks usually don't use CORS preflight)
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'));
  },
  credentials: false,  // ← stay false unless actually using cookies
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type'],
}));
```

---

### 2. No rate limiting anywhere.
**Affected files:** `src/routes/auth.routes.ts`, `/login`, `/payments/*`, `/admin/auth/login`, `/admin/invitation`, `/reset-password` all public or semi-public.

**Risk:**
- 6-digit verification code (auth.service.ts:189) → brute-force in ~5 hrs average (500k guesses at 250 rps = 6-digit all permutations). No per-IP / per-email rate limit = code crackable before 10-min TTL.
- `/admin/auth/login` password spray / dictionary attacks → 7d JWT is long-lived, takeover == full financial access (mark-as-paid, mark-refunded buttons).
- Flutterwave `/callback` endpoint unauthenticated → forced-refund attacker spamming `status=successful&transaction_id=` with forged ids to cause repeated verifyPayment calls hitting 3rd-party API limits.

**Fix Required (NDPR Art. 28 Data Security):** Add `express-rate-limit` 2 tiers:
```ts
// tier 1 — global per-IP (avoid abuse)
const globalLimit = rateLimit({ windowMs: 1*60*1000, max: 200 });
app.use(globalLimit);

// tier 2 — strict 10/min for auth
const strictAuth = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true });
app.use('/api/auth/login', strictAuth);
app.use('/api/admin/auth/login', strictAuth);
app.use('/api/auth/reset', strictAuth);
app.use('/api/payments/callback', rateLimit({ windowMs: 5*60*1000, max: 50 }));
```

---

### 3. Flutterwave payment flow — Callback unauthenticated + no webhook signature check.
**Files:**
- `src/routes/payment.routes.ts:8` → `GET /callback` PUBLIC (no signature auth).
- `src/services/payment.service.ts:76-131` → `verifyPayment()` trusts any `transaction_id` query param.

**Current Risk Chain:**
1. Anyone can call: `GET /api/payments/callback?status=successful&transaction_id=<id>`. 
2. Backend does GET `/v3/transactions/<id>/verify` with server Bearer token. That's **BETTER** than nothing (because you ask Flutterwave server side if payment was real — you must keep this step, never remove it). 
3. However: Attacker crafts a VALID transaction_id from *their own separate Flutterwave account/merchant* (payment id format is guessable or leaks in client-side mobile logs). If your Flutterwave secret key happens to have permission to view any public charge (depends on Flutterwave API scoping — for standard accounts it should only view YOUR merchant's transactions, but verify with them), status=successful could falsely set booking PAID even if they paid with stolen card / chargeback pending.

**Worse, Missing: Flutterwave Webhook Handler**  
If you later add the async webhook (which Flutterwave docs recommend for retries), you must verify `x-flutterwave-signature: sha256(body, WEBHOOK_HASH)` header is valid before processing. Right now the code has NO webhook route at all, only GET callback — you're relying on mobile webview re-opening after payment. If user closes webview early, money taken but booking stays PENDING.

**Short-term fix you MUST do NOW:**
- Keep `verifyPayment()` server-to-server (good!), but add check: `data.currency === 'NGN'` (or expected), AND `data.meta.bookingId === booking.id` (already there), AND most importantly **`data.customer.email.toLowerCase() === bookingGuest.email.toLowerCase()`** → because attacker paying with stolen card will have different customer email. You already have data.meta.bookingId check (great). Add the customer.email cross-check to prevent using a transaction for another SpaceShare account.

- Add idempotency key column to Transaction: after first SUCCESSFUL write on `providerRef`, reject any later `verifyPayment` call with same tx_ref even if Flutterwave says "successful" (prevents replay on retried callbacks from causing double state transitions in the future).

- **If you add a POST /webhook route → signature check NON-NEGOTIABLE.**

---

## 🟠 HIGH SEVERITY (6)

### 4. JWT has no revocation mechanism — session stays valid for 7 days even if admin suspended/logged out.
**Files:** `auth.middleware.ts:19`, `admin.auth.service.ts:27` → `expiresIn: '7d'`. No `jti` claim, no token blacklist/whitelist.

**Risk:** An admin who resigns but has a valid 7-day JWT on their laptop can still call `/api/admin/transactions/:id/mark-as-paid` for a full week after being marked SUSPENDED. `admin.auth.service.ts:16` checks `user.status === 'SUSPENDED'` ONLY at login time, not on every request. JWT has `role` claim baked in — a suspended admin's existing tokens still have role=ADMIN.

**Fix (in auth.middleware before calling `next()`):** After decoding, do 1 extra prisma lookup for `{ id: decoded.userId, select: { status: true, role: true } }` and confirm `status==='ACTIVE'` + role matches. (Cache with Redis later, but Prisma-only acceptable during pilot.) OR short token to `1h` + 7d refresh token in DB with revoke flag.

---

### 5. bcrypt hash cost inconsistency (10 vs 12 rounds = security downgrade 4× on user profile route).
**Files:**
- `services/auth.service.ts:50` → `bcrypt.hash(password, 12)` ✅
- `services/admin/invitation.service.ts:122` → `bcrypt.hash(password, 12)` ✅
- `services/user.service.ts:60` → `bcrypt.hash(newPassword, 10)` ← 🟠 4× weaker

**Risk:** If `user.service.ts` change-password endpoint is the one users actually hit after signing up, 10-round hashes are 4× faster to crack for attackers with access to a DB dump (NDPR breach scenario). A 2026 GPU cluster cracks bcrypt 10 at ~160k h/s; 12 at ~40k h/s — difference matters in offline hash attacks.

**Fix:** user.service.ts line 60 → 12. (Do NOT raise to 14+ without measuring server login time — each +1 doubles CPU cost on login endpoint.)

---

### 6. verifyResetCode — timing-attackable string comparison.
**File:** `services/auth.service.ts:228`
```ts
if (verificationCode.code !== code) throw new Error('Invalid verification code');
```

**Risk:** JavaScript `!==` on strings short-circuits on first mismatched byte, so attacker can measure response times in microseconds to know byte-by-byte whether they're getting closer to the 6-digit code. Not the end of the world for 6-digit (only 1M combos), but combined with missing rate limit (item #2) this becomes a viable crack in practice.

**Fix:** Use Node.js timing-safe compare:
```ts
import { timingSafeEqual, scryptSync } from 'crypto';
const aBuf = Buffer.from(code);
const bBuf = Buffer.from(verificationCode.code);
if (aBuf.length !== bBuf.length || !timingSafeEqual(aBuf, bBuf)) throw BadRequestError;
```

Or simpler: hash both first then compare (constant-time internally):
```ts
const hashA = crypto.createHash('sha256').update(code).digest();
const hashB = crypto.createHash('sha256').update(verificationCode.code).digest();
if (!timingSafeEqual(hashA, hashB)) ...
```

---

### 7. Payment callback redirect — URL based on user-controlled `status` + deeplink protocol.
**File:** `controllers/payment.controller.ts:20-30`
```ts
if (status !== 'successful' || !transaction_id) {
  return res.redirect(`spaceshare://payment-failed`);
}
```

**Low severity but worth flagging:** If you later change to redirect back to a user-controlled FRONTEND_URL path (e.g. `returnUrl` query param added later → open redirect vulnerability). For now `spaceshare://` scheme is fixed so it's not an open redirect. **Keep it this way** — never accept a `redirect_url` query param from the client on callback without origin whitelist.

---

### 8. acceptAdminInvitation — findUnique on `tokenHash` + no email index.
**File:** `services/admin/invitation.service.ts:110`
```ts
const invitation = await prisma.adminInvitation.findUnique({ where: { tokenHash } });
if (invitation.email !== normalizedEmail) throw BadRequestError;
```

**Risk:** SHA256 collision theoretically possible, plus — if invitation A has hash H, and attacker inputs email B (not A's email) with correct token, line 116 throws "Invalid invitation" — good. But `findUnique` on tokenHash means you need a DB UNIQUE constraint on `AdminInvitation.tokenHash` in Prisma schema. Check schema.prisma for:
```prisma
model AdminInvitation {
  tokenHash String @unique  // ← MUST have this. Otherwise 2 rows can share same hash leading to ambiguous fetch.
}
```

If missing, add it + migrate. Not a bug today (Prisma throws if not unique on findUnique), but better for correctness.

---

### 9. Password Reuse (isPasswordReused) check applied ONLY for `transport === 'web_link'`, bypass on mobile OTP flow.
**File:** `services/auth.service.ts:250-280` → `resetPassword()`:
```ts
if (transport === 'web_link') {  // <- inside this block only:
  const isReused = await isPasswordReused(user.id, newPassword);
  ... prisma.passwordHistory.create(...)
} else {
  // Mobile OTP flow — no history, no reuse check, no record written to history
}
```

**Risk:** A user who keeps resetting via SMS OTP (mobile) can keep reusing the same password forever — bypasses your PasswordHistory security model entirely. Also: isPasswordReused + history write happens only on web_link, so password changes from the mobile OTP path are never recorded in history → future web resets don't prevent reuse of passwords changed on mobile.

**Fix:** Move the `isPasswordReused` check + `prisma.passwordHistory.create` call OUTSIDE the if/else, to run regardless of transport.

---

## 🟡 MEDIUM SEVERITY (8)

### 10. Helmet defaults used — CSP not configured, breaks admin dashboard when inline JS/scripts loaded.
**File:** `index.ts:21` → `app.use(helmet())` only.

**Not a security bug per-se (helmet defaults are strict), but you'll have admin dashboard issues** because helmet blocks:
- Inline scripts/styles (React dev builds use inline hot-reload chunks).
- `img-src` data: URIs for base64 avatars.
- `connect-src` to admin API if admin dashboard on different origin than backend.

**Fix:** Explicit helmet config, NOT default:
```ts
app.use(helmet({
  contentSecurityPolicy: NODE_ENV==='production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],   // remove if you use hashes
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
    }
  } : false,
  crossOriginEmbedderPolicy: false,
}));
```
Turn off in dev; enable strict in prod with explicit directives.

---

### 11. Email templates — XSS via unescaped HTML interpolation in Brevo body.
**File:** `services/email.service.ts:28`
```ts
<h2 style="color:#6200EE;">${title}</h2>
<p>${body}</p>                  // ← UNESCAPED HTML
```

If `title` or `body` ever comes from user-generated content (e.g. dispute message quoted in email, guest name with `<script>alert(1)</script>` → triggers JS on the unlucky webmail viewer that still runs scripts in HTML emails). Most webmail strips scripts today, but XSS hygiene says escape.

**Fix:** Use `escape-html` NPM package:
```ts
import escapeHtml from 'escape-html';
<h2>${escapeHtml(title)}</h2>
<p>${escapeHtml(body)}</p>
```
For the verification `<h1>${code}</h1>` it's already safe (6-digit numeric from crypto.randomInt), no XSS there.

---

### 12. JWT secret + Flutterwave secrets cast `as string` — undefined if missing in prod env.
**Pattern seen 10+ places:** `process.env.JWT_SECRET as string`.

**Risk:** If env var is missing (e.g. Docker secret not mounted in deploy), `as string` lies to TypeScript. Runtime `jwt.sign(undefined)` → throws, but worse: `jwt.verify(token, undefined)` returns different errors than you think, and in some JWT lib versions `undefined` secret = `none` algorithm accepted.

**Fix:** Single startup validation file `utils/env.ts`:
```ts
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`FATAL: ${name} env var is missing. Application cannot start.`);
  return v;
}
```
Replace every `process.env.X as string` with `requireEnv('X')` so crash happens at boot, not during a payment.

---

### 13. Auth reset code — after verifyResetCode succeeds, code not invalidated for the 10-min window → Reusable.
**File:** `services/auth.service.ts:219-232` → `verifyResetCode()` returns success but DOES NOT delete or flag the code. An attacker who sniffs one 6-digit code (via shoulder surf, SIM swap, email compromise) can reset password multiple times before expiry.

**You DO delete in `resetPassword` with `prisma.verificationCode.delete` (line 272).** Good. But after verifyResetCode returns success, the code is still usable. In most secure flows, `verify` should move a state flag to "verified" and invalidate the code (or require a cryptographically derived short-lived nonce returned by verify, passed to resetPassword).

Medium severity. Fix by adding optional `usedAt` flag OR in the verifyResetCode success response return a server-signed short-TTL nonce (JWT with 2-min expiry) that resetPassword requires instead of raw code.

---

### 14. Admin 7d JWT — no idle timeout.
If admin leaves laptop open with admin dashboard overnight → token still valid 7 days. Medium risk (NDPR access control Art. 32(1)). Recommend: implement idle timeout = 30 min via lastActivityAt column OR refresh token rotation.

---

### 15. Prisma error codes not exhaustive — P2003 FK violation, P2010 raw, P2021 missing table fall through to 500 generic. Fine, OK.
But log format uses `console.error` → not structured JSON for tracing (Google Cloud / AWS logs can't parse). Low priority but NDPR audit trail requires timestamps + correlation IDs eventually.

---

### 16. Authentication middleware `role` not type-enforced — string comparison `!== 'ADMIN'` allows casing tricks in JWT payload.
**File:** `middleware/admin/admin.middleware.ts:10`

Currently the JWT is signed server-side only so role only comes from us → no actual risk today. But defense-in-depth: uppercase the claim before compare, or use enum:
```ts
const role = (decoded.role || '').toUpperCase();
req.userRole = role;
```

---

### 17. N+1 query potential in `listTransactions`:
`prisma.transaction.findMany({ include: txInclude })` does JOIN guest/bankAccount/listing/host/bankAccount/cancelledBy — 1 query, fine ✅ (no N+1 because it's a single findMany with includes).

BUT in `markAsPaid` guard dispute check: if a malicious admin calls markAsPaid on 10,000 different booking ids in rapid sequence, each call does 2-3 queries each. That's handled per-request correctly; no batch batching. Low priority — rate limit (item #2) fixes this.

---

## 🟢 LOW / INFO (4)

### 18. markAsRefunded used `updateMany` for single row id → use `update` (semantic clarity).
No bug, just confusing for future maintainers who wonder why multiple rows expected.

### 19. Duplicate `AuthRequest` interface declared in 2 files:
- `middleware/auth.middleware.ts:4`
- `middleware/admin/admin.middleware.ts:4`

Move to shared `types/express.d.ts` to avoid property drift (today they are identical, tomorrow one adds `adminId`/`actorId` etc. and bugs appear).

### 20. Dangling audit log string in markPayoutsAsPaid (old bug from before rewrite):
Line 1191 description was previously truncated. ChatGPT's current rewrite fixed it to include proper bookingNumber end of string. ✅ Fixed now.

### 21. Transaction findUnique on `/detail/:id` — no object-level authorization check that admin should even see row.
Currently `requireAdmin` on route means ANY admin can read ANY transaction by id. For single admin workspace (current) OK. For multi-admin role segmentation later: add `if (actor.scope === 'FINANCE_ONLY' && tx.type === PAYMENT) return 403` etc. Not today.

---

## ✅ Positive Security Controls (Good Job — Keep!)

| Control | Why correct |
|---|---|
| Passwords bcrypt hashed (min 12, invitation/auth path 12). User.changePassword 10 (item#5 to fix) | ✅ Stored hashes never exposed, compare constant-time. |
| Payment verification uses server-to-server Flutterwave check | ✅ Never trusts client-side status. |
| `verificationCode.code` / `AdminInvitation.tokenHash` stored as SHA256 in DB, not plaintext | ✅ DB leak doesn't give attacker direct code tokens. |
| Global error handler strips Prisma details + stacktraces | ✅ No SQL detail leakage. CustomError subclass safe messages only exposed. |
| Admin routes: `/auth` and `/invitation` open; everything else `authenticate + requireAdmin` chained router | ✅ Correct router placement. No admin privilege bypass via routes order. |
| markPayoutsAsPaid 5 ironclad guards + open dispute blocker | ✅ CBN required. Finance actions triple-checked pre and post write. |
| prisma.$transaction atomic writes for payout/refund | ✅ Partial writes not possible (no money movement without all rows updated consistently). |
| Reset-password "don't leak email exists" pattern | ✅ Timing-equal response regardless of email registration state. |
| 7-status decoder returns booking.status CANCELLED explicitly | ✅ No phantom refund rows shown on non-cancelled bookings. |
| Cancellation metadata stored explicitly enum `cancelledByRole` not inferred by email match | ✅ NDPR audit trail clean. |

---

## Recommended Action Priority (Next 3 Steps Backend Team)

| Step | Item | Time to fix |
|---|---|---|
| 🥇 1 | Add CORS whitelist (item #1) + requireEnv validation (item #12) | 2h |
| 🥈 2 | Add express-rate-limit 2 tiers (item #2). Critical before launch. | 3h |
| 🥉 3 | Fix bcrypt cost 10→12 (#5) + passwordHistory bypass on mobile (#9) + verifyResetCode timing-safe compare (#6) | 1.5h |
| 4 | JWT revocation lookup per request (#4) or 1h access + refresh | 3h |
| 5 | Payment customer.email cross-check + idempotency (#3 short-term) + eventually real signature-verified webhook POST route | 4h |
| 6 | Email HTML escape (#11) + helmet CSP prod config (#10) | 2h |
| 7 | Remaining mediums (#7, #8, #13, #14, #16, #19) | 4h |

---

*Reviewer: SpaceShare Backend Security Audit | 2026-09-01 | Severity re-assessed quarterly or after every endpoint merge to `/admin/*`.*