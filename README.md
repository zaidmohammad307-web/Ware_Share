# WareShare

A marketplace for renting warehouse space: hosts list warehouses, renters
book space by date and area, and both sides chat, review and track bookings.
Bilingual (English / Arabic) with multi-currency pricing.

| Part | Stack | Hosted on |
|---|---|---|
| `api/` | Node 22, Express 4, MongoDB (Mongoose 8), Socket.IO, Cloudinary | Render |
| `client/` | React 18, Vite, Tailwind, React Router, Leaflet, Recharts | Vercel |

## Running locally

```bash
# API
cd api
cp .env.example .env      # fill in DB_URL, JWT_SECRET, Cloudinary keys, ADMIN_EMAIL
yarn install
yarn start                # http://localhost:8000

# Client (separate terminal)
cd client
cp .env.example .env      # VITE_BASE_URL=http://localhost:8000
yarn install
yarn dev                  # http://localhost:5173
```

## Checks

Both `api/` and `client/` have:

```bash
yarn lint    # ESLint
yarn test    # api: node:test, client: Vitest
```

`client/` also has `yarn build`. CI (`.github/workflows/ci.yml`) runs all of
these plus a dependency audit on every push and pull request.

## Code layout

```
api/
  index.js          Express app, security middleware, rate limits, Socket.IO chat
  routes/           URL → controller wiring (auth middleware applied here)
  controllers/      Request handlers / business logic
  models/           Mongoose schemas and indexes
  middlewares/      isLoggedIn, optionalUser, isAdmin
  config/           Insurance, packing and delivery pricing rules
  utils/            Auth cookie/token, mailer, admin check, upload checks
  test/             Unit tests (database mocked)
client/src/
  api/              Every backend call, grouped by area (use these, not axios directly)
  pages/            One component per route (lazy-loaded in App.jsx)
  components/ui/    Shared UI pieces
  providers/        User, places and language/currency context
  hooks/            Auth, favorites, unread-count hooks
```

## Security notes

- **Admin** is the account whose email equals `ADMIN_EMAIL` (server-side
  check). If it is unset, nobody is admin. Registering with that email is blocked.
- **Host verification documents** are uploaded as private Cloudinary assets;
  only the admin endpoint returns (signed) links to them.
- **Public host profiles** show company name, location, website and "about"
  only — never phone, tax ID or registration number.
- **Payments** are a demo: the renter marks a booking as paid. Replace this
  with a payment provider's webhook before taking real money.
- Secrets live only in `.env` files, which are git-ignored.
