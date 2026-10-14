# Fursa Backend

Node.js + Express + PostgreSQL (Supabase or local).

## Setup

```bash
npm install
cp .env.example .env    # then put the real DATABASE_URL in .env
npm run dev
```

Check it works: open http://localhost:5000/api/health — you should see `"database": "connected"`.

## Structure

```
src/
  server.js        # loads .env, tests the DB, starts the server
  app.js           # Express app, middleware, routes
  config/db.js     # PostgreSQL pool (use db.query everywhere)
  routes/          # one file per resource (auth, jobs, ...)
  middleware/
    auth.js        # signToken, requireAuth, requireRole
    upload.js      # CV / logo uploads (saved in backend/uploads/)
```

## Auth API

| Method | URL | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/signup` | FormData (or JSON without files), see below | `201 { token, user, needsPayment? }` |
| POST | `/api/auth/signin` | `{ email, password, role? }` (`role` = `jobseeker` / `company`, the tab picked) | `{ token, user }` |
| GET | `/api/auth/me` | header `Authorization: Bearer <token>` | `{ user }` |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ message }` (same answer whether or not the email exists) |
| POST | `/api/auth/reset-password` | `{ token, password }` (`token` from the reset link) | `{ message }` |
| POST | `/api/auth/profile/logout` | header `Authorization: Bearer <token>` | `{ message }`, then the frontend deletes its saved token |
| PUT | `/api/auth/profile/change-password` | `{ currentPassword, newPassword }` + Bearer token | `{ message }` |
| DELETE | `/api/auth/profile/account` | `{ password }` + Bearer token | `{ message }` (wrong password: `400` with `fields.password`) |

Sign up fields:
- **Job seeker:** `role=jobseeker`, `firstName`, `lastName`, `email`, `password`, `phone` (optional, 8 digits, `+973` is fine), `major`, `graduationStatus`, `skills` (repeat the field once per skill), `cv` (optional file, PDF/Word, max 5 MB)
- **Company:** `role=company`, `companyName`, `website?`, `industry`, `location`, `about?`, `firstName`, `lastName`, `email`, `password`, `plan` (`free` / `starter` / `growth`), `logo` (optional image)

Every company starts on the **Free** plan. If a paid plan was picked, the response has
`needsPayment: { planId, plan }`, and the payment step upgrades the subscription after payment.

Validation errors return `400 { error, fields: { fieldName: message } }`, so the form can show each message under its field.
A used email returns `409`.

### Forgot / reset password

`forgot-password` emails a link `FRONTEND_URL/reset-password?token=...`. The reset page reads `token` from the URL
and sends it with the new password to `reset-password`. A link works once, expires after 60 minutes,
and asking again cancels older links. A bad or expired link returns `400`.

Email settings in `.env` (without `SMTP_HOST` the email is printed in the backend console, handy for local testing):

```
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Fursa <you@gmail.com>"
```

`change-password` returns `400` with `fields.currentPassword` if the current password is wrong.

Protect a route:

```js
const { requireAuth, requireRole } = require('../middleware/auth');
router.post('/', requireAuth, requireRole('employer'), handler); // req.user = { id, role }
```

## Notes

