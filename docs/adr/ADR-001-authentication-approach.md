# ADR-001: Authentication Approach

Status: Accepted
Deciders: devs, devops
Date: 2025-10-7

## Context

The application needs a simple, secure, and low‑ops authentication solution that works with Next.js App Router, supports OAuth (Google), protects server and client routes, and plays well with SSR. We also need a consistent way to store user profile data and preferences (e.g., theme, department layout).

## Decision

Adopt Supabase Auth for authentication and session management. Use `@supabase/ssr` to bridge sessions between client and server with cookies, protect sensitive routes with Next.js Middleware, and maintain user profile data in the Postgres `profiles` table managed by Supabase.

## Frameworks / Libraries

- Next.js 14 (App Router)
- Supabase Auth via `@supabase/supabase-js` and `@supabase/ssr`
- Next.js Middleware for route protection

## Session Strategy

- Token type: Supabase issues short‑lived JWT access tokens with refresh tokens.
- Client side: `createBrowserClient` from `@supabase/ssr` (browser path) manages the session, storing tokens in browser storage under the hood.
- Server side (SSR/API/Middleware): `createServerClient` from `@supabase/ssr` reads/writes session cookies via Next `cookies()`/`NextResponse`. Cookies are HttpOnly and set with secure attributes in production.
- Route protection: Next Middleware (`src/middleware.ts`) checks `supabase.auth.getSession()` and rewrites unauthorized requests to `/401` for paths under `/Projects`, `/account`, etc...

Notes:
- Keep cookies `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict` where safe) in production.
- Supabase SDK handles refresh flow automatically.

## Improvements

- Open-redirect protection: Only allow same-origin relative `next` redirects in the OAuth callback. Implemented in `src/app/auth/callback/route.ts`.
- Site-wide security headers via middleware `src/middleware.ts`:
  - Content-Security-Policy:
    - `default-src 'self'`
    - `base-uri 'self'`, `frame-ancestors 'none'`, `object-src 'none'`
    - `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` only in development)
    - `style-src 'self' 'unsafe-inline'`
    - `connect-src 'self' https://*.supabase.co wss://*.supabase.co` (and the exact Supabase origin)
    - `img-src 'self' data: blob: https:`, `font-src 'self' data:`
    - `form-action 'self'`
  - Other headers: `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - HSTS (`Strict-Transport-Security`) is set automatically on HTTPS.
  - Middleware matcher expanded to cover most routes so CSP applies broadly while auth checks still target protected paths.

## Where User Records Live

- Identity: Supabase Auth (managed by Supabase). Includes provider identities (e.g., Google) and primary user id.
- Profile & preferences: Postgres table `profiles` (managed via Supabase). Fields currently used include: `id`, `email`, `full_name`, `avatar_url`, `last_sign_in`, `department_layout`, `theme`.
  - Read in `src/components/layout/AppShell.tsx` via `supabase.from('profiles')`.
  - On sign-in we import provider metadata (Google `full_name`, `name`, `display_name`, `picture`) into the in-app profile state and use it to backfill `full_name`/`avatar_url` when database values are missing. We ignore provider or stored values that match the email to avoid showing the email address as the display name.

## Redirect URIs

- OAuth redirect: `{origin}/auth/callback`
  - Initiated in `AppShell.tsx` using `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${window.location.origin}/auth/callback', queryParams: { prompt: 'select_account' }}})`.
  - Supabase must allow the following URLs in the working page:
    - Local: `http://localhost:3000/auth/callback`
    - Production: `https://ASAP.com/auth/callback` (maybe change in future about web domain)
- Callback handler: `src/app/auth/callback/route.ts` exchanges the `code` for a session and redirects to the `next` param when present; defaults to `/Projects`.
- Sign‑out redirect: `/Homepage` (see `handleSignOut` in `AppShell.tsx`).
- Protected routes: `/Projects/**`, `/account/**` require a valid session (enforced in middleware).

## Operational Checklist

- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Supabase Auth settings:
  - Add allowed callback URLs for local and production.
  - Enable Google provider and supply client credentials.
- Security:
  - Enforce HTTPS in production; set HSTS.
  - Verify cookies are `Secure`/`HttpOnly`/`SameSite`.

## Testing

- Local sign‑in with Google flows to `/auth/callback` and redirects to `/Projects`.
- Middleware denies unauthenticated access to `/Projects` and `/account` (rewrites to `/401`).
- Sign‑out clears cookies/session and redirects to `/Homepage`.
