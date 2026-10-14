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

Sign up fields:
- **Job seeker:** `role=jobseeker`, `firstName`, `lastName`, `email`, `password`, `phone` (optional, 8 digits, `+973` is fine), `major`, `graduationStatus`, `skills` (repeat the field once per skill), `cv` (optional file, PDF/Word, max 5 MB)
- **Company:** `role=company`, `companyName`, `website?`, `industry`, `location`, `about?`, `firstName`, `lastName`, `email`, `password`, `plan` (`free` / `starter` / `growth`), `logo` (optional image)

Every company starts on the **Free** plan. If a paid plan was picked, the response has
`needsPayment: { planId, plan }`, and the payment step upgrades the subscription after payment.

Validation errors return `400 { error, fields: { fieldName: message } }`, so the form can show each message under its field.
A used email returns `409`.

Protect a route:

```js
const { requireAuth, requireRole } = require('../middleware/auth');
router.post('/', requireAuth, requireRole('employer'), handler); // req.user = { id, role }
```

## Notes

