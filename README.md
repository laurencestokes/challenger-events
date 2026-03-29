# Challenger Events

A real-time fitness competition platform where admins create events with scored activities, competitors join via event codes and submit scores, and leaderboards update live.

[![CI](https://github.com/challengerco/challenger-events/actions/workflows/ci.yml/badge.svg)](https://github.com/challengerco/challenger-events/actions/workflows/ci.yml)

![Challenger Logo](./challenger-logo.png)

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Quick Start

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore, Authentication (Email/Password), and Storage enabled
- A [Resend](https://resend.com) API key for transactional email

### Setup

```bash
git clone <your-repo-url>
cd challenger-events
npm install
cp ENV_TEMPLATE.txt .env.local
# Fill in your Firebase and Resend credentials in .env.local
```

### Run

```bash
npm run dev          # Custom server with Socket.io (recommended)
npm run dev:next     # Next.js dev mode only (no real-time)
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Roles & Auth

- Firebase email/password authentication with email verification
- Four roles: **Super Admin**, **Admin**, **Competitor**, **Viewer**
- Protected routes with role-based access control

### Events & Scoring

- Admins create events with a unique 6-character join code and optional QR code
- Events contain **activities** (e.g. Back Squat, 500m Row, 4km Bike)
- Each activity uses a **scoring system** (powered by `@challengerco/challenger-data`) that normalises raw values (kg, seconds, metres) into comparable scores
- Competitors join events by code and submit personal scores via their profile
- Admins can submit scores on behalf of competitors, manage weigh-ins, and verify competition data

### Teams

- Create teams, invite members by code, assign teams to events
- Team scoring supports SUM, AVERAGE, and BEST aggregation methods
- Team leaderboards alongside individual leaderboards

### Real-time

- Live leaderboard updates via Socket.io (custom `server.js` runs alongside Next.js)
- Server-Sent Events (SSE) as an alternative transport for workout reveals and score updates
- Live erg (rowing machine) competitions: head-to-head and team modes with real-time metrics

### UI

- Mobile-responsive with Tailwind CSS
- Dark mode via `next-themes`
- Orbitron display font for headings
- Score calculator, performance graphs, achievement badges, social media image generator

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Firebase Firestore (NoSQL) |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Real-time | Socket.io + SSE |
| Styling | Tailwind CSS |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod validation (profile page) |
| Email | Resend |
| Scoring | `@challengerco/challenger-data` |

### Data Flow

1. API routes (`app/api/`) authenticate via `Authorization: Bearer <firebase-uid>` header
2. Routes call Firestore operations in `lib/firestore.ts`
3. Client pages use TanStack Query (`useQuery`/`useMutation`) with centralised query keys (`lib/queryKeys.ts`)
4. Mutations invalidate relevant query caches for instant UI updates
5. Socket.io pushes real-time events for leaderboards and erg sessions

## Project Structure

```
challenger-events/
├── app/
│   ├── api/                 # API routes (events, scores, teams, users, erg, auth)
│   ├── admin/               # Admin pages (event/user/team management, erg control)
│   ├── events/              # Public event browsing, joining, leaderboards, calculators
│   ├── dashboard/           # Competitor/admin dashboard
│   ├── erg/                 # Live erg display pages
│   ├── profile/             # User profile and score history
│   ├── teams/               # Team browsing and management
│   ├── auth/                # Sign in, email verification
│   └── public/              # Public profiles and leaderboards (no auth required)
├── components/              # React components (modals, UI primitives, dashboards)
│   └── ui/                  # Reusable UI primitives (Button, Card, Input, Accordion)
├── constants/               # Scoring systems, event types, achievements
├── contexts/                # AuthContext (provides useAuth hook)
├── hooks/                   # Custom hooks (useSSE, useErgSocket, useMockErgData)
├── lib/                     # Core libraries
│   ├── firestore.ts         # All Firestore CRUD operations
│   ├── api-client.ts        # Authenticated fetch wrapper
│   ├── queryKeys.ts         # TanStack Query key factory
│   ├── utils.ts             # Shared utilities (roles, dates, QR codes)
│   └── score-totals.ts      # Score aggregation logic
├── utils/                   # Domain utilities
│   ├── scoring.ts           # Score calculation with ChallengerData
│   ├── scoreCalculation.ts  # Score calculation orchestration
│   ├── achievementCalculation.ts  # Achievement badge logic
│   ├── teamScoring.ts       # Team score aggregation and ranking
│   └── postcodeUtils.ts     # Postcode lookup and distance calculation
├── __tests__/               # Jest test suites (mirrors source structure)
├── server.js                # Custom Node.js server (Next.js + Socket.io)
└── CLAUDE.md                # AI assistant instructions
```

## Scripts

```bash
# Development
npm run dev              # Custom server with Socket.io
npm run dev:next         # Next.js only (no Socket.io)

# Build & Production
npm run build            # Production build
npm start                # Production server

# Quality
npm run check-types      # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier auto-format
npm run check-format     # Verify formatting
npm run validate         # All checks sequentially
npm run validate-parallel # All checks in parallel

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Environment Variables

Copy `ENV_TEMPLATE.txt` to `.env.local` and fill in all values. Key variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` (7 vars) | Firebase client SDK config |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `RESEND_API_KEY` | Transactional email |
| `SOCKET_SECRET` | Socket.io authentication |
| `NEXT_PUBLIC_APP_URL` | Base URL for email links |

### Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Firestore Database**
4. Enable **Storage**
5. Copy the web app config to `NEXT_PUBLIC_FIREBASE_*` variables
6. Generate a service account key (Project Settings > Service Accounts) and copy to `FIREBASE_*` variables

## Testing

The project uses **Jest** with **React Testing Library**. Tests cover utilities, constants, and all components.

```bash
npm test                 # Run all 49 suites (~600 tests)
npm run test:coverage    # Generate coverage report
```

Coverage is collected for `components/`, `lib/` (utils, api-client, score-totals), `utils/`, and `constants/`. Coverage thresholds are enforced in CI.

### Test Structure

```
__tests__/
├── components/          # Component tests (rendering, interactions, mocked API)
│   └── ui/              # UI primitive tests
├── constants/           # Data integrity and lookup function tests
├── lib/                 # Utility and API client tests
└── utils/               # Scoring, achievements, team scoring, postcodes
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Set all environment variables from `.env.local`
4. Deploy

> **Note:** The custom `server.js` (Socket.io) requires a Node.js runtime. Vercel's serverless functions don't support persistent WebSocket connections. For full real-time support, deploy to a platform that supports custom servers (Railway, Render, DigitalOcean App Platform).

## Contributing

1. Create a branch from `main`
2. Make changes following existing patterns
3. Run `npm run validate` to check types, lint, and build
4. Run `npm test` to verify all tests pass
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`npm run commit`)
6. Open a Pull Request

### Code Style

- **Prettier**: single quotes, 100-char line width, trailing commas, semicolons
- **ESLint**: unused variables prefixed with `_`
- **TypeScript**: strict mode, no implicit any
- **Path aliases**: `@lib/`, `@components/`, `@utils/`, `@constants/`, `@hooks/`, `@contexts/`

### Versioning

Uses [SemVer](https://semver.org/). Bump with `npm version [patch|minor|major]`, then push with tags.

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## License

See [LICENSE.md](LICENSE.md)
