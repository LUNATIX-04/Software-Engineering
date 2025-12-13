# Account Authentication Enhancements

## Goals
- Move every account-facing control into the new `Setting Account` experience by surfacing identity + personalization information in one place.
- Enforce that Google-only accounts create a fallback password immediately after signing in so they can still access the product through the traditional login screen.
- Let traditional (email + password) users link their profile to Google OAuth so they can seamlessly switch sign-in providers later.

## Updated UX

### Account Settings dialog
- The avatar dropdown opens a floating `Setting Account` dialog instead of navigating away, so changes never interrupt the current page.
- The dialog stacks cards vertically: **Account snapshot**, **Authentication**, then **Workspace personalization**.
- New `Authentication` card shows:
  - Primary email (read-only).
  - Password status (`Required`, `Pending setup`, `Last updated on …`).
  - Google status (`Connected`, `Not linked`).
  - CTA buttons: `Set password`, `Update password`, `Connect Google`, `Manage Google link`.
- All auth-related actions (password rotation, Google linking/unlinking) live here—no changes to the traditional sign-in screen.

### Google-first flow (require password)
1. User taps `Continue with Google`, completes the OAuth flow, and returns with a valid Supabase session.
2. `/auth/callback` detects `profile.passwordHash` is `null` → set `sessionStorage` flag `needsPasswordBootstrap`.
3. User is redirected to `/auth/bootstrap-password` (new client page) before `/projects`.
4. Screen asks the user to pick a password (and confirm) with copy explaining why.
5. Submits to `POST /api/auth/password/bootstrap`:
   - Validates Supabase session, enforces minimum password rules, hashes password via `bcrypt`.
   - Calls Supabase Admin API to set the password for the authenticated user (`auth.admin.updateUserById`).
   - Updates `profiles.password_hash`, `profiles.password_set_at`.
6. On success we clear the `needsPasswordBootstrap` flag and send them to `/projects`.

### Password-first flow (link Google via Account Settings)
1. From the `Authentication` card, user sees Google state.
2. If not linked, `Connect Google` triggers `supabase.auth.linkIdentity({ provider: "google" })`.
3. Supabase returns an `otp` URL; redirect user to Google OAuth. After the provider finishes, Supabase adds a new entry in `auth.identities`.
4. In `/auth/callback` we detect that the signed-in user initiated a linking flow (presence of `link_identity=google` in search params or a stored flag) and call new endpoint `POST /api/auth/google/finalize-link`.
5. Endpoint verifies the session, ensures Google identity exists, writes `profiles.google_linked_at = now()` and `profiles.google_profile = metadata`.
6. UI updates to show Google is connected and offers `Disconnect` (which would call `supabase.auth.unlinkIdentity`).

### Mixed flow guardrails
- While `needsPasswordBootstrap` flag is true, user cannot access the rest of the app (AppShell checks the flag and redirects to `/auth/bootstrap-password`).
- When a user tries to unlink Google and has no password yet, block the action and prompt them to set a password first.

## Backend & API changes

### Database
- `profiles.password_hash` already signals password presence; add:
  - `password_set_at TIMESTAMPTZ NULL`.
  - `google_linked_at TIMESTAMPTZ NULL`.
  - `google_profile JSONB NULL` (store avatar + email for quick access).
- Add partial index `CREATE INDEX profiles_google_linked_idx ON public.profiles (google_linked_at) WHERE google_linked_at IS NOT NULL`.

### Endpoints
1. `POST /api/auth/password/bootstrap`
   - Body: `{ password: string }`.
   - Requires active session, rejects if `password_hash` already exists.
   - Hashes password, updates Supabase user password + profile row, returns `204`.
2. `POST /api/auth/password/update`
   - For existing password owners (both Google + password) to rotate passwords, reuses hashing logic, requires `currentPassword`.
3. `POST /api/auth/google/link`
   - Returns the `url` from `supabase.auth.linkIdentity({ provider: "google" })` and stores a short-lived `linkIntentId` in Redis/session.
4. `POST /api/auth/google/finalize-link`
   - Validates session + stored `linkIntentId`, confirms `identities` table has a Google record, updates `profiles.google_linked_at` + `google_profile`.
5. `POST /api/auth/google/unlink`
   - Calls `supabase.auth.unlinkIdentity(identityId)`; refuses if password missing.

### Session middleware
- Whenever AppShell receives `profile.passwordHash === null`, redirect to `/auth/bootstrap-password` unless pathname already starts with `/auth`. This ensures the requirement is enforced even if users hit `/projects` manually.

## Frontend work
- Add `AuthenticationCard` to the Account Settings dialog:
  - Shows status text from `profile`.
  - Buttons open new dialogs (`Set password`, `Link Google`) that wrap the API calls.
- Create `/auth/bootstrap-password/page.tsx` with a simple two-field form and success path.
- Extend notifications to cover bootstrap success, link success, unlink success, and relevant error states.
- Update the auth context so a successful bootstrap updates `profile.passwordHash` & `passwordSetAt` locally without a full reload.

## Security considerations
- All new endpoints verify the Supabase session server-side (`createClient`) to prevent CSRF.
- Password bootstrap endpoints enforce strong passwords (min length, optional zxcvbn score) before hashing.
- Linking endpoints store intent tokens server-side so an attacker cannot call finalize without first initiating the link.
- When unlinking Google, ensure at least one credential method remains (password hash must exist).

## Rollout plan
1. Ship DB migration adding the new columns.
2. Deploy backend endpoints and AppShell guard (they are backward compatible).
3. Release frontend UI but hide the Google-link button behind a feature flag until QA verifies the new flow.
4. Run backfill job setting `password_set_at` for users with non-null `password_hash`.
5. Monitor Supabase auth logs for errors during the bootstrap period.
