# Sulyap

A Provincial Tourism Office-Supported Web Platform for Discovering Lesser-Known Tourist
Destinations in Pampanga. Capstone project, Holy Angel University, School of Computing.

| Folder    | What it is                                                     |
| --------- | -------------------------------------------------------------- |
| `client/` | Presentation tier: React (Vite), Tailwind CSS                  |
| `server/` | Logic tier: Node.js + Express REST API                         |
| `server/db/` | Data tier scripts: PostgreSQL schema (migrations) and seeds |
| `legacy/` | The earlier TypeScript prototype, kept for reference only      |

## First-time setup

1. Install Node.js 20 or newer.
2. In this folder, run `npm install` (installs both `client` and `server`).
3. Copy `server/.env.example` to `server/.env` and fill it in. Never commit `.env` files.
4. With `DATABASE_URL` set to the Supabase **Session pooler** connection string:
   - `npm run db:migrate` creates the tables
   - `npm run db:seed` adds jurisdictions, categories, criteria, and staff accounts
     (initial password = `SEED_STAFF_PASSWORD`)

## Everyday commands

| Command                 | Does                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Starts the API (port 4000) and the website (port 5173) together      |
| `npm run build`         | Builds the website into `client/dist`                                |
| `npm run lint`          | Checks the code for mistakes                                         |
| `npm run db:check`      | Tests the schema and seeds on a temporary in-memory database         |
| `npm run db:seed:demo`  | Loads TEST-ONLY demo data (`@example.com` accounts)                  |
| `npm run db:clear:demo` | Removes all demo data, keeping setup data and staff accounts         |

In development, open http://localhost:5173/dev/components to see every shared component, and use
the "Preview as" switcher (bottom left) to view the pages as each role.

## Rules the code follows

- Passwords are hashed with bcrypt (cost 12). Every SQL query uses `$1, $2...` parameters.
- The browser only talks to the Express API. Supabase keys stay on the server.
- No AI or machine learning anywhere: all screening is rule-based.
