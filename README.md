# FlexLiving Reviews — Dashboard & Public Listings

A full-stack TypeScript project that lets managers **approve/disapprove** guest reviews and exposes a clean **public listings** page that shows **approved-only** reviews.

* **Admin Dashboard** (private): filter, search, and toggle approvals
* **Public Listings** (guest): read-only, approved reviews with sorting & paging
* **Backend**: Node/Express, Prisma, SQLite, Zod, JWT-in-cookie auth
* **Frontend**: React (Vite), TanStack Query, React Router

<br/>

## ✨ Features

* 🔐 **Secure admin login** using bcrypt + signed **HTTP-only** cookie (JWT)
* 🧹 **Strict validation** with Zod (env & request queries)
* 🧭 **Public API** returns **approved-only** and **safe** fields
* ⚡️ **Optimistic UI** for approve toggles in the dashboard
* 🗃️ **Prisma** schema & migrations (SQLite – dead simple to run)
* 🧪 Targeted tests for normalization, auth guard, and public filters

<br/>

## 🧩 Architecture

```
/backend
  src/
    app.ts                # express app wiring: CORS, cookies, helmet, routes, errors
    index.ts              # boot: validate env + start server
    config/env.ts         # Zod-validated environment loader (fail fast)
    db/prisma.ts          # Prisma client singleton
    middleware/requireAdmin.ts
    routes/
      auth.ts             # POST /login, GET /me, POST /logout
      reviews.ts          # admin: GET reviews, PATCH approve
      public.ts           # public: GET approved reviews
      health.ts
    services/
      hostaway/normalize.ts      # provider → canonical Review mapping
  prisma/
    schema.prisma         # Review model + helpful indexes
/frontend
  src/
    api/                  # fetch helpers (send cookies + CSRF header)
    components/ui/        # AppShell, Card, Button, Input, etc.
    pages/                # Dashboard.tsx, PublicListing.tsx, Login.tsx
    main.tsx, router.tsx
```

**Data model (Prisma `Review`):**

* `id` (e.g. `hostaway:7453`), `source`, `listingId`, `listingName?`
* `type` (`host_to_guest|guest_to_host`), `channel`, `status?`
* `rating?`, `categories JSON DEFAULT {}`, `text?`, `submittedAt`
* `authorName?`, `approved` (default `false`), timestamps
* Indexes: `@@index([listingId])`, `@@index([submittedAt])`, `@@index([listingId, submittedAt])`

> Categories are JSON to support provider-specific rating dimensions without schema churn.

<br/>

## 🚀 Quick Start (TL;DR)

> Requires **Node 18+** and **npm**. No external DB needed (uses SQLite).

```bash
# 1) Clone
git clone https://github.com/ab-yf/the-flex-practical-assessment.git
cd the-flex-practical-assessment

# 2) Install deps (root workspaces)
npm i

# 3) Create env files from examples
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4) Fill backend/.env
# - SESSION_SECRET: paste a long random
# - ADMIN_PASS_HASH: bcrypt hash of your demo admin password (see below)

# 5) Generate secrets (terminal helpers)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # SESSION_SECRET
node -e "require('bcryptjs').hash('demo1234',10).then(console.log)"       # ADMIN_PASS_HASH

# 6) Init DB (SQLite) & generate client
npm run db:migrate -w backend

# 7) Run dev servers (both, with CORS + cookies configured)
npm run dev
# backend: http://localhost:4000
# frontend: http://localhost:5173

# 8) Login (in the UI): http://localhost:5173/login
#   User: the ADMIN_USER you set (default 'admin')
#   Pass: the plaintext you hashed (e.g. demo1234)
```

> On Windows PowerShell, use `Copy-Item` instead of `cp`:
>
> ```powershell
> Copy-Item backend/.env.example backend/.env
> Copy-Item frontend/.env.example frontend/.env
> ```

<br/>

## ⚙️ Environment Variables

### `backend/.env` (created from `.env.example`)

| Key               | What it does                    | Example                 |
| ----------------- | ------------------------------- | ----------------------- |
| `PORT`            | Backend port                    | `4000`                  |
| `NODE_ENV`        | `development`/`production`      | `development`           |
| `FRONTEND_ORIGIN` | Allowed CORS origin             | `http://localhost:5173` |
| `SESSION_SECRET`  | **Long random** for JWT signing | `7b4…(hex)…`            |
| `COOKIE_NAME`     | Session cookie name             | `flex_admin`            |
| `ADMIN_USER`      | Admin username                  | `admin`                 |
| `ADMIN_PASS_HASH` | Bcrypt hash of admin password   | `$2a$10$…`              |
| `DATABASE_URL`    | Prisma SQLite file URL          | `file:./dev.db`         |

**Helpers to generate values:**

```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# ADMIN_PASS_HASH for 'demo1234' (or use your own plaintext)
node -e "require('bcryptjs').hash('demo1234',10).then(console.log)"
```

### `frontend/.env` (created from `.env.example`)

| Key            | What it does                            | Example                 |
| -------------- | --------------------------------------- | ----------------------- |
| `VITE_API_URL` | Base URL of the backend for the browser | `http://localhost:4000` |

<br/>

## 🧪 Useful Scripts

From the repo root:

```bash
# Install dependencies (root + workspaces)
npm i

# Start backend only / frontend only
npm run dev -w backend
npm run dev -w frontend

# Start both (concurrently)
npm run dev

# Prisma (backend)
npm run db:studio   -w backend   # visual DB editor
npm run db:generate -w backend   # regenerate client
npm run db:migrate  -w backend   # apply migrations

# Tests (backend)
npm test -w backend
```

> SQLite DB file is at `backend/prisma/dev.db` (ignored by Git by default in this project).

<br/>

## 🔐 Authentication Model (How admin login works)

* **Login**: `POST /api/auth/login` with `{ username, password }`
  If bcrypt compare succeeds, backend returns **HTTP-only** cookie (`COOKIE_NAME`) containing a signed JWT (claims: `{ sub: <username> }`).
* **Session**: Browser sends cookie automatically with `credentials: "include"`.
* **CSRF guard**: All mutating requests must include header `X-Requested-With: fetch` (front-end sets this).
* **Me**: `GET /api/auth/me` returns `{ user, role: "admin" }` if cookie valid.
* **Logout**: `POST /api/auth/logout` clears the cookie.

**Protected admin routes** require the cookie and are guarded by `requireAdmin` middleware.
**Public routes** never require auth.

<br/>

## 📡 API Overview

Base URL = `http://localhost:4000/api`

### Auth (public)

* `POST /auth/login` → body `{ username, password }` → sets cookie on success
* `GET /auth/me` → `{ user, role }` if logged in
* `POST /auth/logout` → clears cookie

### Reviews — Manager (requires cookie)

* `GET /reviews/hostaway` (filters)
  Query (all optional):
  `q, id, listingId, channel, type, status, minRating, maxRating, from, to, limit (<=200), offset`
* `PATCH /reviews/:id/approve` → body `{ approved: boolean }`

> **CSRF header required** for PATCH:
> `X-Requested-With: fetch`

### Public Reviews (no auth)

* `GET /public/reviews`
  Query:

  * `listingId` *(optional)* — exact match
  * `sort` ∈ `newest | oldest | rating_desc | rating_asc` *(default: `newest`)*
  * `limit` *(1–200, default 12)*, `offset` *(>=0)*
    Returns **approved-only** reviews. Sorting is stable with `id` tie-breaker.

**Sample cURL:**

```bash
# Login (save cookie.txt)
curl -c cookie.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" -H "X-Requested-With: fetch" \
  --data '{"username":"admin","password":"demo1234"}'

# Manager: get reviews (with cookie)
curl -b cookie.txt "http://localhost:4000/api/reviews/hostaway?limit=20&offset=0"

# Manager: approve a review
curl -b cookie.txt -X PATCH http://localhost:4000/api/reviews/hostaway:7453/approve \
  -H "Content-Type: application/json" -H "X-Requested-With: fetch" \
  --data '{"approved":true}'

# Public: approved reviews for a listing
curl "http://localhost:4000/api/public/reviews?listingId=70985&sort=newest&limit=12&offset=0"
```

<br/>

## 🖥️ Frontend Pages

* **/login**: simple form; hints provided for demo creds (from your `.env`).
* **/** (Dashboard, protected): Filters + table + approve toggles (optimistic).
* **/public**: Enter `listingId`, choose sort, paginate and **Refresh**. Displays approved reviews only.

> The frontend uses `fetch(..., { credentials: "include", headers: { "X-Requested-With": "fetch" } })` for protected calls so cookies + CSRF work correctly.

<br/>

## 🧰 Development & Data

* **DB Migrations**: `npm run prisma:migrate -w backend`
* **Prisma Studio**: `npm run prisma:studio -w backend` to view/edit rows quickly
* **Seeding**: For demo content you can insert a few `Review` rows via Studio or a quick script. The public page shows only rows with `approved = true`.

**Minimal seed via Prisma Studio:**

1. Run `npm run prisma:studio -w backend`
2. Open your browser → create a `Review` with:

   * `id`: e.g. `hostaway:9001`
   * `source`: `hostaway`
   * `listingId`: e.g. `70985`
   * `type`: `guest_to_host`
   * `channel`: `airbnb`
   * `rating`: `4.8`
   * `categories`: `{}` (leave default)
   * `text`, `submittedAt`, `authorName`
   * `approved`: `true` (so it appears publicly)

<br/>

## 🛡️ Security Notes (what’s in place)

* **HTTP-only session cookie** signed with `SESSION_SECRET` (`SameSite=Lax`; `Secure` in production)
* **CSRF**: require `X-Requested-With: fetch` on mutating requests
* **CORS**: whitelisted `FRONTEND_ORIGIN` and `credentials: true`
* **Public API**: returns **only safe fields** (no private feedback/URLs)
* **Zod**: runtime validation for env and request queries (limits, enums, coercion)

> For production hardening: add rate limiting, audit logs, HTTPS termination, and rotate secrets periodically.

<br/>

## 🐞 Troubleshooting

* **Login says “Invalid credentials”**

  * Ensure `ADMIN_USER` matches your UI input
  * Ensure `ADMIN_PASS_HASH` is a bcrypt hash of your plaintext (no quotes/spaces)
* **401 on admin APIs in browser but Postman works**

  * Frontend calls must include `credentials: "include"` and header `X-Requested-With: "fetch"`
  * Check `FRONTEND_ORIGIN` matches the exact Vite URL
* **ZodError: “Too big: limit <= 200”**

  * Backend caps `limit` at 200. Lower the frontend request or paginate.
* **CORS errors**

  * Ensure `FRONTEND_ORIGIN` is exactly `http://localhost:5173` (or your deployed URL)

<br/>

## 🧭 Design Choices (interview ready)

* **Canonical `Review` model**: provider-agnostic; normalizers convert remote shapes → our schema.
* **SQLite + Prisma**: trivial local setup, real migrations, easy swap to Postgres later.
* **JWT in HTTP-only cookie**: safer than localStorage; works seamlessly with `credentials: "include"`.
* **Zod** for runtime validation: TS types aren’t enough at the network boundary; Zod guarantees consistent input.
* **Separate public vs admin endpoints**: least-privilege and simpler caching/validation.

<br/>

## 📄 License

MIT — use freely for evaluation and learning.

---

### Reviewer Checklist

* [ ] Clone & `npm i`
* [ ] Create `.env` files from examples, generate secrets, run `npm run prisma:migrate -w backend`
* [ ] `npm run dev` (both servers come up: 4000/5173)
* [ ] Login at `/login` (admin/demo password you chose)
* [ ] Dashboard: filter & approve toggle works
* [ ] Public: enter listingId, sort, paginate;
