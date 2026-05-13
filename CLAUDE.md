# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Custom Node.js server with Socket.io (recommended)
npm run dev:next     # Direct Next.js dev mode (no Socket.io)

# Build & Production
npm run build        # Next.js production build
npm start            # Production server

# Type checking & linting
npm run check-types  # TypeScript type checking (tsc --noEmit)
npm run lint         # ESLint
npm run format       # Prettier auto-format
npm run check-format # Verify formatting

# Testing
npm test             # Run Jest tests
npm test -- path/to/file.test.ts  # Run a single test file
npm run test:watch   # Watch mode
npm run test:coverage

# All checks
npm run validate     # Sequential: types, format, lint, build
npm run validate-parallel # Same checks in parallel
```

`postinstall` runs `scripts/patch-design-system.js`; `prebuild` runs `scripts/write-commit-hash.js`. If either fails, install/build breaks — fix the script rather than skipping it.

## Architecture Overview

**Stack:** Next.js 14 App Router + Firebase (Firestore + Auth + Storage) + Socket.io

This is a fitness competition management platform. Admins create events with activities, competitors join and submit scores, and leaderboards update in real-time.

### Key Concepts

- **Events** have a unique 6-char `code` used for joining. Events contain **Activities** (individual scored challenges).
- **Scores** are submitted per-activity per-user. `rawValue` is stored alongside `calculatedScore` (after applying the scoring system).
- **Scoring systems** live in `constants/scoringSystems.ts` and power the score calculation logic.
- **Participations** join users to events (and optionally to teams within that event).
- **Roles:** `SUPER_ADMIN > ADMIN > COMPETITOR > VIEWER`. Role checks: `isAdmin()`, `isSuperAdmin()` in `lib/utils.ts`.

### Data Layer

All Firestore operations go through `lib/firestore.ts` (~1000+ lines). No ORM — raw Firebase SDK. Firebase Admin SDK is initialized in `lib/firebase-admin.ts` and used only in API routes (server-side).

### Client Data Fetching

TanStack Query v5 is the client-side data layer. Query keys are centralized in `lib/queryKeys.ts` (e.g. `queryKeys.events.leaderboard(id)`) — use the factory rather than inlining keys so cache invalidation stays correct. After mutations, invalidate the relevant keys to refresh the UI.

### Auth

- Firebase email/password auth with email verification required before access
- `contexts/AuthContext.tsx` provides `useAuth()` — exposes `user` (Firestore user doc), `firebaseUser` (Firebase Auth user), `loading`, `initialized`
- API routes expect `Authorization: Bearer <firebase-uid>` header
- `lib/api-client.ts` wraps `fetch` and automatically adds the Bearer token

### API Routes (`app/api/`)

Pattern in every API route:
1. Extract Bearer token from `Authorization` header
2. Look up user by UID, verify role
3. Parse + validate request body
4. Call Firestore functions
5. Return JSON

### Real-time

- Custom `server.js` runs Next.js alongside Socket.io on the same port
- Live leaderboard updates pushed via Socket.io
- `hooks/useErgSocket.ts` and `hooks/useTeamErgSocket.ts` for rowing machine real-time data
- SSE hooks (`hooks/useSSE.ts`) as an alternative transport

### Routing

- `app/admin/` — admin-only pages (event/user/team management, score entry tool)
- `app/events/` — public event browsing and joining
- `app/dashboard/` — competitor dashboard
- `app/erg/` — rowing machine interface
- `app/auth/` — sign in / email verification

### Scoring Systems

Scoring systems are configured in `constants/scoringSystems.ts`. The `@challengerco/challenger-data` package provides powerlifting standards and Wilks/DOTS coefficient calculations. Calculation orchestration lives in `utils/scoring.ts` and `utils/scoreCalculation.ts`; team aggregation (SUM/AVERAGE/BEST) is in `utils/teamScoring.ts`. Note the split: `lib/` is core/infra, `utils/` is domain logic.

### Testing

Jest with React Testing Library. Tests live in `__tests__/` mirroring source structure. Coverage is scoped (see `jest.config.js`): only `components/`, `utils/`, `constants/`, and `lib/{utils,api-client,score-totals}.ts` count toward coverage. Thresholds (lines 72, branches 55, functions 65) are enforced — adding uncovered code in a tracked path can break CI.

### Deployment Constraint

The custom `server.js` (Next.js + Socket.io on one port) requires a persistent Node runtime. Vercel serverless does not support this — real-time features (live leaderboards, erg sockets) only work on platforms with long-lived processes (Railway, Render, etc.).

## Environment Variables

Required in `.env.local` — see `ENV_TEMPLATE.txt` for all variables. Key ones:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config (7 vars)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK
- `RESEND_API_KEY` — email service (also used to subscribe new accounts and emailed guests as Resend contacts for broadcasts)
- `SOCKET_SECRET` — Socket.io authentication
- `NEXT_PUBLIC_APP_URL` — base URL for links in emails

## Conventions

- Prettier: single quotes, 100-char line width, trailing commas, semicolons
- ESLint: unused variables prefixed with `_` are allowed
- Git: Commitizen conventional commits (`npm run commit`)
- Images: Firebase Storage, served via `firebasestorage.googleapis.com`
- Tailwind custom theme: primary color is orange, `Orbitron` font for display/headings
- Path aliases (defined in `tsconfig.json` and `jest.config.js`): `@lib/`, `@components/`, `@utils/`, `@constants/`, `@hooks/`, `@contexts/` — prefer these over relative imports
