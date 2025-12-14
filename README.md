# ASAP Project

Web-based project and task management system built with **Next.js**, **React**, **Bun**, **Prisma**, and **Supabase** for the SE course.

---

## 1. Prerequisites

Software required:

- **Bun** `>= 1.1.0` (required runtime & package manager)
- **Node.js** `>= 20` (recommended for tooling / IDE integration)
- **Git**
- **Supabase** account & project (Postgres + Auth enabled)
- Modern web browser (Chrome, Edge, Firefox)

Optional (for advanced usage only):

- PostgreSQL client tools (`psql`, `pg_dump`) – already used to generate the SQL files in `database/` (but not suggest, please use in supabase)

---

## 2. Installation

1. **Clone the repository (main branch only)**

   ```bash
   git clone https://github.com/ASAPSekmutt/Software-Engineering.git
   cd Software-Engineering
   # No branch switching required – use `main`
   ```

2. **Install Bun (if you have not installed it yet)**

   ```bash
   curl -fsSL https://bun.sh/install | bash
   # then restart your shell so that `bun` is on PATH
   ```

3. **Install project dependencies**

   ```bash
   bun install
   ```

4. **Generate Prisma client**

   ```bash
   bunx prisma generate
   ```

---

## 3. Configuration (Environment Variables)

1. **Create your `.env` file**

   ```bash
   cp .env.example .env
   ```

2. **Fill in the required variables in `.env`**

   All of the following values come from your Supabase project:

   - `DATABASE_URL`  
     Connection string to Supabase Postgres via **pgbouncer** (usually port `6543`).

   - `DIRECT_URL`  
     Direct connection string to the same database (Postgres port `5432`).  
     Used by Prisma for migrations and tooling.

   - `NEXT_PUBLIC_SUPABASE_URL`  
     Your Supabase project URL, e.g. `https://<project-ref>.supabase.co`.

   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  
     The **anon/public** API key from Supabase (safe to expose to frontend).

   - `SUPABASE_SERVICE_ROLE_KEY`  
     The **service role** key from Supabase.  
     Used only on the server (in `src/utils/supabase/service-role.ts`) to perform privileged operations (e.g., profile updates under RLS).  
     **Never** expose this key to the browser or commit it to Git.

3. **Location of `.env`**

   Make sure `.env` is placed in the project root (same level as `src`, `public`, `package.json`).

---

## 4. Database Setup & Importing Data

This project is designed to run on **Supabase** (Postgres + Auth). There are three ways to prepare the database depending on your needs.

### 4.1 Recommended (Supabase + Prisma `db push`)

Use this for a fresh Supabase project when you do not need to reproduce production data exactly.

1. Create a new Supabase project.
2. In the Supabase dashboard, copy the **connection string** for the database and fill in `DATABASE_URL` and `DIRECT_URL` in `.env`.
3. From the project root, push the Prisma schema to the database:

   ```bash
   bunx prisma db push
   ```

   This will create all tables in the `public` schema according to `prisma/schema.prisma`.  
   The `auth` schema and `auth.users` table are automatically managed by Supabase.

4. Use the Supabase UI under **Authentication → Users** to create the test users described in the **Test Credentials** section.

### 4.2 Alternative: Supabase migrations (closer to production)

If you want to recreate the schema using the same SQL migrations that the project uses in production, you can run the files under `supabase/migrations/` in order.

1. Open **SQL Editor** in your Supabase project.
2. For each file in `supabase/migrations`, copy the contents and run them, in order, for example:

   1. `0001_create_profiles_table.sql`  
   2. `0002_add_profile_preferences.sql`  
   3. `0002_create_projects_table.sql`  
   4. `0003_add_profile_password.sql`  
   5. `0004_add_profile_auth_method.sql`  
   6. `0005_drop_profile_auth_method.sql`  
   7. `0006_add_profile_bio.sql`  
   8. `0007_add_project_last_used.sql`  
   9. `0008_project_usage_table.sql`  
   10. `0009_project_members_and_invites.sql`  
   11. `0010_add_department_to_project_invites.sql`  
   12. `0011_add_invite_usage_limits.sql`  
   13. `0012_add_project_tasks.sql`

3. Keep `.env` pointing at this Supabase project. You can still use `bunx prisma db push` later if you change the Prisma schema.

### 4.3 Importing DB schema & seed data from SQL files (for local Postgres / reproducible demo)

The repository includes **exported SQL** under `database/`:

- Combined convenience dumps (single file for app data – mostly for quick local demos):
  - `database/schema.sql` – schema for the application tables in the `public` schema (profiles, projects, project_members, tasks, etc.) plus RLS policies.
  - `database/seed_data.sql` – data dump for both `auth` and `public` schemas (used to reproduce our current demo data).
- Supabase-style per‑schema exports (recommended when you want to mirror the production Supabase project):
  - `database/supabase only/auth_schema.sql` – schema for the `auth` schema.
  - `database/supabase only/public_schema.sql` – schema for the `public` schema.
  - `database/supabase only/storage_schema.sql` – schema for Supabase Storage tables.
  - `database/supabase only/storage_seed.sql` – seed data for Storage metadata (buckets/objects).

Because Supabase uses **multiple schemas** (`public`, `auth`, `storage`) and different seed files, it is **not recommended** to rely on a single schema file by itself.  
If you want a database that matches the Supabase project, please use the files in `database/supabase only/` (together with `database/seed_data.sql` for application data) instead of importing only `database/schema.sql`.

Example for a local Postgres instance:

```bash
# Example using psql against a local Postgres
psql "<your-local-postgres-connection-string>" -f "database/supabase only/auth_schema.sql"
psql "<your-local-postgres-connection-string>" -f "database/supabase only/public_schema.sql"
psql "<your-local-postgres-connection-string>" -f "database/supabase only/storage_schema.sql"

# Then load seed data (app + storage)
psql "<your-local-postgres-connection-string>" -f database/seed_data.sql
psql "<your-local-postgres-connection-string>" -f "database/supabase only/storage_seed.sql"
```

> For Supabase: you can paste the contents of these files into the SQL Editor as well, but be aware that the seed files contain real sample data (emails, example files, etc.) and should only be used for demo/testing, not production.

---

## 5. How to Run the Application

### 5.1 Development server

Start the Next.js app (including API proxy) using Bun:

```bash
bun dev
```

- Default URL: <http://localhost:3000>
- This runs Next.js 16 with the integrated Elysia API route at `/api/[...elysia]`.

If you want to run the standalone Elysia API server directly (not required for normal dev):

```bash
bun run dev:api
```

### 5.2 Production build (local)

```bash
bun run build
bun run start
```

Optional: start API-only server:

```bash
bun run start:api
```

- `bun run build` – builds the Next.js app using Turbopack.
- `bun run start` – starts the production server.

---

## 6. Test Credentials

The system distinguishes between two main roles:

- **Admin / Owner** – can create projects, manage departments, invite members, and manage tasks.
- **Standard Member** – can join projects, view tasks, and work on assigned tasks.

please use the following accounts (these should exist in the Supabase Auth project used for the submission; if not, they can be created manually with these exact values):

### 6.1 Admin / Owner Project

- Role in project: `Teacher - HEADER (PROJECT OWNER)`
- Email: `helicop@gmail.com`
- Password: `helicop`

### 6.2 Standard Member Project (Member, Header)

- Role in project: `Student - HEADER`
- Email: `soriya88@gmail.com`
- Password: `123456`

> If you are using our hosted Supabase instance (the one whose keys are in the submitted `.env`), these accounts will already be present.  
> If you set up your own Supabase project, please create these users under **Authentication → Users** and then invite them into a project through the UI. (can use dump seed data)

---

## 7. Demo Video

A short demo of the main features (login, project creation, departments, members, tasks, and submissions) is available here:

- **Demo Clip:** <https://youtu.be/khxXDjqK9G4>

This video demonstrates the primary flows that a reviewer can follow when checking the system.

---

## 8. Project Status & Known Issues

### 8.1 Implemented features

The following core features are implemented and working end-to-end:

- Traditional login (email/password) via Supabase Auth
- Google OAuth login via Supabase
- Project management:
  - Create, edit, delete projects
  - Project dashboard with overview and usage tracking
- Department management:
  - Create, rename, delete departments
  - Assign department colors and heads
- Member management:
  - Invite members via invite links
  - Role management (`OWNER`, `HEADER`, `MEMBER`)
- Task management:
  - Create tasks within a project/department
  - Assign members, change status (`IN_PROGRESS`, `BLOCKED`, `SUBMITTED`)
  - Submit work and review submissions
- Account settings:
  - Update profile (name, bio, avatar)
  - Change password (for traditional auth users)

### 8.2 Known issues / limitations

- **Performance:**  
  - Initial load for large projects (many tasks/members) can be slow due to multiple Supabase requests and complex UI rendering.  
  - Some dashboards may take a few seconds to become fully interactive on slower networks or machines.

- **RLS / Database limitations:**  
  - The app relies on Supabase Row Level Security (RLS) policies. If the database is not initialized using the provided SQL/migrations or Prisma schema, profile / membership creation may fail with RLS errors.

- **Non-blocking issues:**  
  - Minor styling glitches on very small screen sizes.  
  - Some edge cases around invite links (e.g., expired links) are handled with generic error messages rather than detailed UI.

There are **no known critical bugs** that block the main flows listed above. All required features for the assignment are testable.

---

## 9. Notes for TA / Developers

- To run automated tests (where configured):

  ```bash
  bun run test
  ```

- Tech stack summary:
  - Next.js 16 (App Router, Turbopack)
  - React 19
  - Bun (runtime + package manager)
  - Elysia (API server inside the project, used via `/api/[...elysia]`)
  - Prisma ORM (`prisma/schema.prisma`)
  - Supabase Postgres + Auth (backing database and authentication)

If anything in this README is unclear during review or testing, please follow the demo video and the steps in sections **3–6**, which are sufficient to bring the system up and log in with test users.

---

## 10. Deployment & Supabase Seed Data

### 10.1 Hosted deployment (Vercel)

- Production deployment (used for the course submission):  
  <https://software-engineering-jmylsporv-asap8.vercel.app/>

This instance is connected to our Supabase project and pre‑seeded with the two demo accounts from **Test Credentials**.

### 10.2 Importing `database` seed into Supabase

If you want your own Supabase project to look like our demo data (projects, members, tasks, and example files), you can import the SQL files under `database/` directly into Supabase.

Because Supabase uses multiple schemas (`public`, `auth`, `storage`), **do not** rely on `database/schema.sql` alone. Instead, use the per‑schema files together with the combined seed:

1. In Supabase, open **SQL Editor** for your project.
2. Run the schema files in this order (each in a separate query tab or upload):
   - `database/supabase only/auth_schema.sql`
   - `database/supabase only/public_schema.sql`
   - `database/supabase only/storage_schema.sql`
3. Then run the seed data files:
   - `database/seed_data.sql` – inserts demo data into the `auth` and `public` schemas  
     (only the two test users `helicop@gmail.com` and `soriya88@gmail.com` and their related projects/tasks are included; other personal data has been removed).
   - `database/supabase only/storage_seed.sql` – inserts storage metadata (buckets/objects) used by the demo (project images, profile pictures for those two users).

> These SQL files are meant only for demo and testing. Do not use them as‑is for real production data. For a clean production database, prefer the approaches in **4.1** or **4.2** instead.
