# SpaceShare Backend API

Node.js + Express + TypeScript backend for the SpaceShare venue marketplace.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon cloud-hosted)
- **ORM:** Prisma v5
- **Auth:** JWT (7 day expiry)
- **Email:** Brevo (transactional emails)
- **Payments:** Paystack + Flutterwave (coming soon)

---

## Getting Started

### Prerequisites
- Node.js v22+
- npm

### Installation

```bash
cd spaceshare-backend
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL="your-neon-postgresql-connection-string"
JWT_SECRET="your-jwt-secret"
BREVO_API_KEY="your-brevo-api-key"
SENDER_EMAIL="your-verified-sender-email"
PORT=5000
```

### Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

---

## Database

PostgreSQL hosted on [Neon](https://neon.tech).

### Run Migrations

```bash
npx prisma migrate dev
```

### View Database

```bash
npx prisma studio
```

---

## Project Structure
src/

├── controllers/      # Request handlers

├── routes/           # API route definitions

├── services/         # Business logic

├── utils/            # Prisma client and helpers

└── index.ts          # App entry point

---

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/verify` | Verify email with 6-digit code | No |
| POST | `/api/auth/resend-code` | Resend verification code | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| POST | `/api/auth/forgot-password` | Send password reset code | No |
| POST | `/api/auth/verify-reset-code` | Verify password reset code | No |
| POST | `/api/auth/reset-password` | Reset password | No |

---

## Request & Response Examples

### POST `/api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "role": "GUEST"
}
```

**Response `201`:**
```json
{
  "message": "Account created. Please verify your email.",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "role": "GUEST"
  }
}
```

---

### POST `/api/auth/verify`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "message": "Email verified successfully",
  "token": "eyJhbGci...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "role": "GUEST"
  }
}
```

---

### POST `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "role": "GUEST"
  }
}
```

---

### POST `/api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response `200`:**
```json
{
  "message": "If this email exists, a reset code has been sent"
}
```

---

### POST `/api/auth/verify-reset-code`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "message": "Code verified",
  "userId": "clxxx"
}
```

---

### POST `/api/auth/reset-password`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewPassword@123"
}
```

**Response `200`:**
```json
{
  "message": "Password reset successful"
}
```

---

## User Roles

| Role | Description |
|------|-------------|
| `GUEST` | Can browse and book venues |
| `HOST` | Can list and manage venues |

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description here"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / invalid credentials |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (`@$!%*?&`)

---

## Notes for Web Developer

- All endpoints are prefixed with `/api`
- JWT token must be sent in the `Authorization` header as `Bearer <token>` for protected routes (coming soon)
- Verification codes expire after **10 minutes**
- JWT tokens expire after **7 days**
- The `role` field on register must be exactly `"GUEST"` or `"HOST"`
- Brevo IP restriction may need your server IP whitelisted at [app.brevo.com/security/authorised_ips](https://app.brevo.com/security/authorised_ips)

---

## Coming Soon

- Venue CRUD endpoints (Host)
- Booking endpoints (Guest)
- Payment integration (Paystack + Flutterwave)
- Review endpoints
- Wishlist endpoints
- Profile endpoints