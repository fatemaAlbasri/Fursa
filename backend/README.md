# Fursa Backend

Node.js + Express + PostgreSQL (Supabase or local).

## Setup

```bash
npm install
npm run dev
```

Check it works: open http://localhost:5000/ — you should see `Your app is connected ...`.

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

## CV parsing API

| Method | URL | Body | Returns |
|---|---|---|---|
| POST | `/api/cv/parse` | FormData `cv` (no login, max 10 tries/hour per IP) | `{ cv, source }`; the file is **not** kept |
| POST | `/api/cv` | FormData `cv` + Bearer token (seeker) | `201 { resume, parsed, source, warning? }`; becomes the current CV (`source` is `null` if the CV couldn't be read) |
| GET | `/api/cv` | Bearer token (seeker) | `{ resume }` (`404` if none) |

`cv` looks like this (any field can be `null` / `[]` if the CV doesn't say):

```jsonc
{
  "firstName": "Sara", "lastName": "Ahmed Ali", "email": "sara.ali@example.com",
  "phone": "33445566",                     // 8 digits, without +973
  "major": "Computer Science",             // one of the sign up dropdown values
  "graduationStatus": "Final year student", // Graduated / Final year student / Student
  "yearsExperience": 0.8,
  "skills": ["React", "Node.js", "SQL"],
  "languages": ["Arabic", "English"],
  "experience": [{ "title": "Software Intern", "company": "Batelco", "start": "2025-06", "end": "2025-08" }]
}
```

`source` is `"ai"` (Gemini) or `"rules"` (backup parser). A CV with no readable text (scanned image) returns `422`.

**Sign up flow:** the page sends the CV to `/api/cv/parse` as soon as it's picked and fills in the empty fields
with the answer. Sign up then sends the CV as usual; the backend reads it again in the background and saves
`parsed_text`, `parsed_experience`, `parsed_languages` on `resumes` and `years_experience` on `seeker_profiles`.

**AI:** add `GEMINI_API_KEY=...` to `.env` to use Gemini (more accurate). `GEMINI_MODEL` is optional
(default `gemini-flash-latest`). Without a key (or if the AI call fails) a rule-based parser is used,
so it still works locally.

## AI CV Optimizer API

All routes need a Bearer token (seeker) and work on the seeker's current CV.

| Method | URL | Body | Returns |
|---|---|---|---|
| GET | `/api/cv/optimizer` | | `{ review, canReview }`; `review` is `null` until reviewed, `canReview` is `false` if the CV has no readable text |
| POST | `/api/cv/optimizer` | | `201 { review }`, or `200` if this CV was already reviewed (max 10 tries/hour per IP). Can take up to about 2 minutes, so show a loading state |
| POST | `/api/cv/optimizer/unlock` | `{ method }` (`card` / `benefitpay`) | `{ review }` with everything unlocked. Simulated; paying twice charges once |
| PATCH | `/api/cv/optimizer/suggestions/:id` | `{ status }` (`accepted` / `dismissed` / `pending`) | `{ suggestion }`; a locked one returns `403` |
| GET | `/api/cv/optimizer/improved-cv` | | PDF of the CV with the accepted suggestions |
| GET | `/api/cv/optimizer/report` | | PDF of the full report; `403` until unlocked |

The PDF routes need the token too, so fetch them as a blob rather than using a plain link.

`review` looks like this:

```jsonc
{
  "id": 2,
  "resume": { "id": 3, "fileName": "my_cv.pdf", "uploadedAt": "..." },
  "cvText": "Sara Ali\n...",        // for the "Your CV" panel; beforeText is copied from it exactly, so it can be highlighted
  "major": "Computer Science",
  "strengthScore": 72,
  "improvementsFound": 5,
  "isAdvanced": false,
  "suggestions": [
    { "id": 6, "section": "summary", "beforeText": "IT graduate looking for a job.", "locked": false,
      "afterText": "...", "reason": "...", "points": 7, "isFreePreview": true, "status": "pending" },
    { "id": 7, "section": "projects", "beforeText": "...", "locked": true, "hint": "..." }
  ],
  // not unlocked yet:
  "reportPrice": { "subtotalBhd": 2, "vatBhd": 0.2, "totalBhd": 2.2 },
  // unlocked instead:
  "potentialScore": 88,
  "comparison": [{ "key": "short_summary", "label": "A short, specific summary", "met": true }],
  "payment": { "paidAt": "...", "subtotalBhd": 2, "vatBhd": 0.2, "totalBhd": 2.2, "isSimulated": true }
}
```

`section` is `summary`, `projects`, `skills`, `education` or `layout`. For `layout`, `beforeText` and `afterText`
are the section headings joined with ` > `. An empty `beforeText` means the section is new (summary or skills only).

**Scoring:** Gemini marks each section against a fixed guide (summary 20, projects 25, skills 20, education 15, layout 20)
and the backend adds them up. A suggestion's points can't exceed what its section is missing, and
`potentialScore` is the score plus all the points, so it never passes 100.

**Only real facts:** `services/cvOptimizer.js` checks every rewrite and drops it if it adds a number, a known skill or a
name that isn't in the CV, or if its `beforeText` isn't in the CV. Spelling out a short form (JS to JavaScript) is allowed.

**Errors:** no `GEMINI_API_KEY` returns `503`. If Gemini fails after retrying (`GEMINI_FALLBACK_MODEL` is the last try,
default `gemini-flash-lite-latest`) it returns `502` and nothing is saved, so the seeker can try again.
PDF downloads return `422` for CVs with Arabic text, because the built-in PDF fonts only have Western letters.

## Notes

