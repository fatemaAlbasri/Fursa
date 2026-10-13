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
```

## Notes

