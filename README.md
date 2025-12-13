# ASAP Project

Web-based project and task management system built with Next.js, Bun, Prisma, and Supabase for the SE32 course.

---

## 1. Prerequisites

- Bun `>= 1.1.0` (required)
- Node.js `>= 20` (recommended for tooling compatibility)
- Git
- Supabase account & project (Postgres + Auth enabled)
- Modern web browser (Chrome, Edge, Firefox)

---

## 2. Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ASAPSekmutt/Software-Engineering.git
   cd Software-Engineering
   ```

2. Switch to the latest release branch:
   ```bash
   git checkout Latest-Release-Version-
   ```

3. Install Bun (if you have not installed it yet):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

4. Install project dependencies with Bun:
   ```bash
   bun install
   ```

5. Generate Prisma client:
   ```bash
   bunx prisma generate
   ```

---

## 3. Configuration

1. Copy the example environment file and rename it:
   ```bash
   cp .env.example .env
   ```

2. Fill in the following variables in `.env`:

   - `DATABASE_URL`  
     Connection string to the **Supabase Postgres** (pgbouncer port, usually `6543`).

   - `DIRECT_URL`  
     Direct connection string to the same database (Postgres port `5432`).

   - `NEXT_PUBLIC_SUPABASE_URL`  
     Your Supabase project URL, e.g. `https://<project-ref>.supabase.co`.

   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  
     The **anon/public** API key from Supabase (safe to expose to frontend).

   - `SUPABASE_SERVICE_ROLE_KEY`  
     The **service role** key from Supabase (server-side only, do not expose in browser).

3. Make sure the `.env` file is placed in the project root (same level as `src`, `public`, `package.json`).

---

## 4. How to Run

### 4.1 Development server

Run the frontend (Next.js) using Bun:

```bash
bun dev
```

- Default URL: http://localhost:3000
- This will start the full web application for local development.

If you need to run the Elysia API server separately for development:

```bash
bun run dev:api
```

### 4.2 Production build (optional)

```bash
bun run build
bun run start
```

If you deploy the standalone API server:

```bash
bun run start:api
```

- `bun run build` – builds the Next.js app.
- `bun run start` – starts the production server.

---

## 5. Database & Importing Data (Supabase)

This project uses **Supabase** (Postgres + Auth) for data storage and authentication.

The database schema and logic are defined mainly in:

- `prisma/schema.prisma`
- SQL migration files under `supabase/migrations/*.sql`

### 5.1 Using the provided Supabase instance (recommended for TA)

For grading / testing, the project is configured to use our hosted Supabase instance via the values set in `.env` (the `.env` that we submit / provide to the TA).

- In this mode, **you do not need to import any SQL files manually**.
- The schema and initial data (including test users) are already created in the Supabase project.

### 5.2 Setting up your own Supabase database (for local development)

If you want to recreate the database in your own Supabase project:

1. Create a new project in Supabase.
2. In the Supabase dashboard, go to **SQL Editor**.
3. Run the SQL files from `supabase/migrations` **in order**, e.g.:

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

4. Update your `.env` to point `DATABASE_URL` / `DIRECT_URL` to this new Supabase database.
5. (Optional) If you modify the Prisma schema, sync it with:
   ```bash
   bunx prisma db push
   ```

6. Create the test users in Supabase Auth manually under **Authentication → Users** using the credentials described in the next section.

---

## 6. Test Credentials

The system has two main roles:

- **Head** – can perform work, approve work, assign tasks, and review tasks.
- **Member** – can perform assigned work and confirm task completion.

> Note: Replace the placeholders below with the actual emails and passwords that exist in your Supabase Auth project before submitting.

**Admin / Head account**

- Role: `Head`
- Email: `<HEAD_TEST_EMAIL>`
- Password: `<HEAD_TEST_PASSWORD>`

**Standard / Member account**

- Role: `Member`
- Email: `<MEMBER_TEST_EMAIL>`
- Password: `<MEMBER_TEST_PASSWORD>`

These accounts should be created in Supabase Auth so the TA can log in immediately without registering new users.

---

## 7. Project Status & Known Issues

- All features required by the **MVP** are implemented and working:
  - Project creation and management
  - Task management (create, assign, update status)
  - Departments and member management
  - Invitations and role-based access
  - Traditional login + Supabase-based authentication

- **Known Issues (Performance)**:
  - Initial page load and some heavier views (e.g., large projects with many tasks) can feel **slow** due to:
    - Multiple Supabase requests on first load
    - Animations / UI rendering in large task boards
  - On slower networks or machines, some pages may take a few seconds before becoming fully interactive.

- There are **no known functional bugs** blocking the core MVP flows. All main features are testable end-to-end; the current limitations are primarily about performance (loading speed), not missing functionality.

---

## 8. Extra Notes (Developer Convenience)

- Run tests (if needed) with:
  ```bash
  bun run test
  ```
  or using the configured tools like Cypress / Jest based on the course instructions.

- This project uses:
  - Next.js 15
  - React 19
  - Bun as the package manager and runtime
  - Prisma as ORM
  - Supabase (Postgres + Auth) as the backend-as-a-service
