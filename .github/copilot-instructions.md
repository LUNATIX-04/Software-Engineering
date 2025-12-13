# AI Coding Agent Instructions for ASAP Project

## Project Overview
**ASAP** is a web-based project and task management system built with **Next.js 15**, **React 19**, **Bun**, **Prisma**, and **Supabase** for the SE32 course. It's a full-stack application with role-based access control, task workflows, and real-time collaboration features.

---

## Core Architecture

### 1. Stack Overview
- **Frontend**: Next.js 15 (App Router), React 19, Radix UI components
- **Backend**: Elysia (Bun-native HTTP framework) + Next.js API routes
- **Runtime**: **Bun** (mandatory, NOT Node.js)—all commands use `bun` instead of `npm`
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Auth**: Supabase Auth (OAuth2 + traditional password-based)
- **Styling**: Tailwind CSS + custom theme system with localStorage persistence

### 2. Critical Request Flow
```
Request → Next.js API Routes [/api/[...elysia]/route.ts]
  ↓ (forwards to)
Elysia Server [src/server/elysia.ts] 
  ↓ (routes to feature modules)
src/server/routes/{projects|tasks|auth|...}.ts
  ↓ (uses)
Prisma Client → Supabase PostgreSQL
  ↓ (returns)
JSON response → Next.js Page/Component
```

All API endpoints go through Elysia; avoid creating separate Next.js route files.

---

## Key Developer Workflows

### Build & Run
```bash
# Development (includes Next.js + Elysia)
bun dev                # http://localhost:3000

# Separate API server (if needed)
bun run dev:api        # Elysia on different port

# Production build
bun run build
bun run start
```

### Database Migrations
```bash
# Generate Prisma client after schema changes
bunx prisma generate

# Sync schema to Supabase (first time or after schema.prisma changes)
bunx prisma db push

# View current schema state
bunx prisma studio
```

### Testing
```bash
bun run test           # Jest unit tests
npm run cypress:run    # E2E tests (Cucumber BDD format in cypress/e2e/)
```

**⚠️ Important**: Always use `bun` commands, never `npm install` or `npm run`.

---

## Project-Specific Patterns & Conventions

### 1. Role-Based Authorization
Three roles with explicit constants defined in `src/types/projects.ts`:
- **OWNER**: Project creator, full permissions
- **HEADER**: Department head (approve work, assign tasks)
- **MEMBER**: Standard user (perform assigned work)

Check role in server routes using `requireProjectMembership()` from `src/server/projects/permissions.ts` before operations.

```typescript
// Example from src/server/routes/projects.ts
const member = await requireProjectMembership(projectId, userId, ["OWNER", "HEADER"])
```

### 2. Middleware & Protected Routes
- Protected paths defined in `src/middleware.ts`: `/projects/*`, `/account/*`
- Middleware enforces Supabase session validation before rendering
- CSP headers configured for security; development mode allows unsafe-eval for Next.js

### 3. Component Structure
- **Page components** (`src/app/**/*.tsx`): Use `"use client"` for client interactivity
- **UI components** (`src/components/ui/*`): Reusable Radix UI-based primitives (Button, Dialog, Dropdown, etc.)
- **Feature components** (`src/components/{account|projects|tasks}/*`): Domain-specific logic
- **Layout components**: `src/components/layout/AppShell.tsx` manages global nav, auth state, real-time notifications

### 4. Data Fetching Patterns
- **Server-side**: Direct Prisma queries in API routes or server actions
- **Client-side**: 
  - API calls via custom endpoints (e.g., `POST /api/projects`)
  - Use `axios` or native `fetch` (no mandatory React Query usage, but `@tanstack/react-query` installed)
  - Example: `src/utils/projects/api.ts` exports functions like `updateProject()`, `fetchProjectDepartments()`

### 5. Database Schema Patterns
- **Prisma schema** (`prisma/schema.prisma`):
  - Uses both `public` and `auth` schemas
  - Composite keys for relationships (e.g., `ProjectMember` links `Profile`, `Project`, `ProjectDepartment`)
  - Soft deletes via status enums (e.g., `ProjectMemberStatus: ACTIVE | INVITED`)
  - Department color management with pastel generation (`src/utils/colors.ts`)

### 6. Environment Variables
**Public** (safe for frontend):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Secret** (server-only):
- `DATABASE_URL` (pgbouncer pool, port 6543)
- `DIRECT_URL` (direct connection, port 5432)
- `SUPABASE_SERVICE_ROLE_KEY` (do NOT expose in frontend)

### 7. Theme & UI Customization
- **Theme system**: localStorage key `asap:theme-preference` with values: `standard|light|dark|red|green|yellow`
- **Theme initialization**: Inline script in `src/app/layout.tsx` prevents flash of unstyled content
- **Color utilities**: `sanitizeHexColor()`, `getContrastingTextColor()` in `src/utils/colors.ts`
- **Component library**: Radix UI wrapped in custom `src/components/ui/*` for theming consistency

### 8. Authentication Flows
- **OAuth2 (Google)**: `src/server/routes/auth.ts` handles callback + profile upsert
- **Traditional (email/password)**: `src/server/routes/traditional-auth.ts` with bcrypt hashing
- **Profile creation**: Auto-triggered on first OAuth login via `ensureProfileRecord()`
- **Session validation**: Via Supabase SSR client in middleware

---

## File Organization & Key Locations

| Purpose | Location |
|---------|----------|
| API route handlers | `src/server/routes/*.ts` |
| DB query helpers | `src/server/projects/db.ts`, etc. |
| Permission checks | `src/server/projects/permissions.ts` |
| Type definitions | `src/types/*.ts` |
| API client functions | `src/utils/{projects\|tasks\|profile}/api.ts` |
| Data prefetch helpers | `src/utils/{projects\|tasks}/prefetch.ts` |
| Database schema | `prisma/schema.prisma` |
| SQL migrations | `supabase/migrations/*.sql` |
| E2E tests | `cypress/e2e/`, `cypress/support/step_definitions/` |

---

## Performance & Known Issues

### Known Limitations
- **Initial page load**: Multiple Supabase requests on first load can feel slow
- **Large project views**: Task boards with many items may render slowly due to animations
- **No functional bugs**: All MVP features work end-to-end; issues are performance-related, not blockers

### Performance Tips
- Use Prisma `select` to fetch only needed fields
- Leverage Next.js ISR or static generation for frequently-accessed pages
- Batch Supabase calls where possible to reduce request overhead

---

## Common Tasks & Patterns

### Adding a New Endpoint
1. Create handler in `src/server/routes/[feature].ts` (register with Elysia)
2. Use Prisma for DB queries
3. Call `requireProjectMembership()` to verify authorization
4. Return JSON response (Elysia handles serialization)
5. Client-side: create API function in `src/utils/[feature]/api.ts`

### Adding a New Database Table
1. Update `prisma/schema.prisma`
2. Run `bunx prisma generate` to update Prisma client
3. Create SQL migration file in `supabase/migrations/` (if using manual migration for Supabase)
4. Run `bunx prisma db push` to sync

### Creating a Form Component
1. Use React Hook Form (`@hookform/resolvers`)
2. Integrate with Radix UI form components from `src/components/ui/`
3. Call API function from `src/utils/*/api.ts` on submit
4. Handle errors gracefully (show toast/error state)

### Testing
- Unit tests: Jest files in `src/` with `.test.ts` suffix
- E2E tests: Cypress feature files in `cypress/e2e/` with BDD syntax
- Step definitions: `cypress/support/step_definitions/` (hooks into feature files)

---

## Deployment

### Vercel Configuration
- Uses Next.js-native build system with Turbopack (configured in `next.config.ts`)
- Environment variables must be set in Vercel project settings (not committed to repo)
- For Supabase: ensure redirect URLs include Vercel domains and preview URLs
- **Node.js version**: 20+ recommended

### Critical Secrets
- Never commit `.env` (already in `.gitignore`)
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if accidentally exposed
- Only expose `NEXT_PUBLIC_*` variables to frontend

---

## Quick Reference: Useful Commands

```bash
# Install deps & generate Prisma
bun install && bunx prisma generate

# Development
bun dev

# Check for type errors
bunx tsc --noEmit

# Run tests
bun run test

# Run E2E tests (requires running dev server)
npm run cypress:run

# Prisma admin UI
bunx prisma studio

# Format & lint (check your package.json for actual commands)
bun run lint
bun run format
```

---

## Notes for AI Agents

1. **Always prioritize security**: Check authorization before DB operations; never expose service role key or sensitive env vars in responses
2. **Preserve existing patterns**: Follow established routing, component, and API patterns to maintain consistency
3. **Type safety**: Use TypeScript strictly; prefer type inference with Prisma models
4. **Bun requirement**: All runtime commands must use `bun`, not Node.js
5. **Supabase integration**: Leverage Supabase Auth for identity; use Prisma for data access
6. **Real-time features**: AppShell manages notifications; new real-time features should integrate with existing Supabase RealtimeChannel patterns
7. **Testing mindset**: Write E2E tests for critical flows; run locally before committing

---

**Last Updated**: December 2024  
**For questions**: Refer to README.md for setup and DEPLOY.md for deployment specifics.
