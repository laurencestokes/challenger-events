# 🏆 Challenger Events

A real-time fitness event management system that allows admins to create events and input scores for competitors, while competitors can view live leaderboards.

[![CI](https://github.com/challengerco/challenger-events/actions/workflows/ci.yml/badge.svg)](https://github.com/challengerco/challenger-events/actions/workflows/ci.yml)

![Challenger Logo](./challenger-logo.png)


# Table of Contents

1. [Quick start guide](#-quick-start-guide)
   1. [Prerequisites](#prerequisites)
   2. [Installing](#installing)
   3. [Environment Setup](#environment-setup)
   4. [Firebase Setup](#firebase-setup)
   5. [Running the Application](#running-the-application)
2. [Features](#-features)
3. [Architecture](#-architecture)
4. [API Reference](#-api-reference)
5. [Usage Examples](#-usage-examples)
6. [Development](#-development)
7. [Deployment](#-deployment)
8. [Testing](#-testing)
9. [Contributing](#-contributing)

## Challenger Events Management System

This is a comprehensive, real-time fitness event management system built with Next.js and Firebase. It provides a complete solution for creating, managing, and scoring fitness competitions with live leaderboards and role-based access control.

The system supports:

- **Firebase Authentication**: Email/password with email verification
- **Role-based Access Control**: Super Admin, Admin, Competitor, and Viewer roles
- **Event Management**: Create events with unique codes and QR codes
- **Real-time Leaderboards**: Live score updates using WebSockets
- **Mobile Responsive**: Works seamlessly on all devices
- **Dark Mode Support**: Built-in theme switching

## Quick Example:

```typescript
// Create a new event
const event = {
  name: "Powerlifting Championship",
  code: "PL2024",
  activities: ["Squat", "Bench Press", "Deadlift"],
  startDate: new Date(),
  endDate: new Date()
};

// Join an event
const joinEvent = async (eventCode: string) => {
  const response = await fetch('/api/events/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCode })
  });
  return response.json();
};

// Submit a score (admin only)
const submitScore = async (eventId: string, competitorId: string, activity: string, score: number) => {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, competitorId, activity, score })
  });
  return response.json();
};
```

## 🚀 Quick start guide

### Prerequisites

- Node.js 18+
- Firebase project
- Email provider (Resend, Gmail, etc.)

### Installing

```bash
git clone <your-repo-url>
cd challenger-events
npm install
```

### Environment Setup

1. **Copy the environment template**
   ```bash
   cp ENV_TEMPLATE.txt .env
   ```

2. **Edit the `.env` file** with your configuration:
   ```env
   # Firebase Configuration (Client)
   NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
   NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

   # Firebase Admin (Server)
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

   # Email Provider (Resend)
   RESEND_API_KEY="your-resend-api-key"

   # Socket.io (for real-time features)
   SOCKET_SECRET="your-socket-secret"
   ```

### Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication** (Email/Password)
3. **Enable Firestore Database**
4. **Get your Firebase config**:
   - Go to Project Settings → Your Apps
   - Add a web app if you haven't already
   - Copy the config object to your `.env` file
5. **Create a service account**:
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Download the JSON file and copy values to `.env`

### Running the Application

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

## ✨ Features

---

### Authentication & Authorization

- **Firebase Authentication**: Email/password with email verification
- **Role-based Access**: Super Admin, Admin, Competitor, Viewer roles
- **Email Verification**: Required for first-time users
- **Protected Routes**: Automatic redirection based on user role

### Event Management

- **Create Events**: Admins can create events with unique codes
- **QR Code Generation**: Automatic QR codes for easy event joining
- **Activity Management**: Add multiple activities to events
- **Event Codes**: Unique codes for event identification

### Real-time Features

- **Live Leaderboards**: Real-time score updates using Socket.io
- **Live Notifications**: Instant updates for score changes
- **WebSocket Integration**: Efficient real-time communication

### User Experience

- **Mobile Responsive**: Works seamlessly on all devices
- **Dark Mode**: Built-in theme switching
- **Loading States**: Smooth loading experiences
- **Error Handling**: Comprehensive error handling and user feedback

## 🏗️ Architecture

---

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **Real-time**: Socket.io
- **Email**: Resend (or any SMTP provider)
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation

### Database Schema (Firestore Collections)

- **users**: User profiles and role management
- **events**: Competition events with unique codes
- **activities**: Individual exercises/workouts within events
- **scores**: Competitor performance data
- **teams**: Group management (optional)

### Project Structure

```
challenger-events/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── events/            # Event management
├── components/            # Reusable React components
├── contexts/             # React context providers
├── lib/                  # Utility libraries
├── styles/               # Global styles
└── utils/                # Helper functions
```

## 📚 API Reference

---

### Authentication Endpoints

#### `POST /api/auth/signin`

Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `POST /api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### Event Management

#### `POST /api/events`

Create a new event (admin only).

**Request Body:**
```json
{
  "name": "Powerlifting Championship",
  "code": "PL2024",
  "activities": ["Squat", "Bench Press", "Deadlift"],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

#### `GET /api/events`

Get all events for the current user.

#### `POST /api/events/join`

Join an event using event code.

**Request Body:**
```json
{
  "eventCode": "PL2024"
}
```

#### `GET /api/events/[id]`

Get specific event details.

#### `PUT /api/events/[id]`

Update event details (admin only).

### Score Management

#### `POST /api/scores`

Submit a score for a competitor (admin only).

**Request Body:**
```json
{
  "eventId": "event123",
  "competitorId": "user456",
  "activity": "Squat",
  "score": 150
}
```

#### `GET /api/events/[id]/leaderboard`

Get real-time leaderboard for an event.

### User Management

#### `GET /api/user`

Get current user data.

#### `PUT /api/user`

Update user profile.

### Utility Endpoints

#### `GET /api/test-env`

Test environment variables configuration.

## 💡 Usage Examples

---

### For Admins

```typescript
// Create a new event
const createEvent = async (eventData) => {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  return response.json();
};

// Submit a score
const submitScore = async (scoreData) => {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scoreData)
  });
  return response.json();
};

// Get leaderboard
const getLeaderboard = async (eventId) => {
  const response = await fetch(`/api/events/${eventId}/leaderboard`);
  return response.json();
};
```

### For Competitors

```typescript
// Join an event
const joinEvent = async (eventCode) => {
  const response = await fetch('/api/events/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCode })
  });
  return response.json();
};

// Get user's events
const getUserEvents = async () => {
  const response = await fetch('/api/events');
  return response.json();
};
```

### Real-time Updates

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Listen for score updates
socket.on('scoreUpdate', (data) => {
  console.log('New score:', data);
  // Update leaderboard
});

// Listen for event updates
socket.on('eventUpdate', (data) => {
  console.log('Event updated:', data);
  // Refresh event data
});
```

## 🛠️ Development

---

### Setup

```bash
git clone <repository-url>
cd challenger-events
npm install
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run check-types  # TypeScript type checking
npm run validate     # Run all checks
```

### Code Quality

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Husky**: Git hooks for pre-commit checks
- **Commitizen**: Conventional commit messages

### Development Mode

```bash
npm run dev
```

This will start the development server with hot reloading.

## 🚀 Deployment

---

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set environment variables** in Vercel dashboard
4. **Deploy**

### Other Platforms

- **Railway**: Easy deployment with environment variables
- **Render**: Free tier available
- **DigitalOcean**: App Platform
- **Firebase Hosting**: Direct integration with Firebase services

### Environment Variables for Production

Make sure to set all required environment variables in your deployment platform:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `RESEND_API_KEY`
- `SOCKET_SECRET`

## ✅ Testing

---

1. **Clone the repository**
2. **Install dependencies**: `npm ci`
3. **Set up environment variables**
4. **Run tests**: `npm test`

### Testing Checklist

- [ ] Environment variables are properly configured
- [ ] Firebase project is set up correctly
- [ ] Authentication flow works
- [ ] Event creation and management
- [ ] Score submission and leaderboards
- [ ] Real-time updates via WebSocket
- [ ] Mobile responsiveness
- [ ] Dark mode functionality

## 📝 Contributing

---

### How to contribute summary

- Create a branch from the `main` branch and submit a Pull Request (PR)
- Explain what the PR fixes or improves
- Use sensible commit messages which follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) specification
- Use a sensible number of commit messages

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm test`
5. **Format code**: `npm run format`
6. **Commit changes**: `git commit -m 'feat: add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Add proper error handling
- Include appropriate comments
- Write meaningful commit messages

### Version Bumping

Our versioning uses [SemVer](https://semver.org/) and our commits follow the [Conventional Commits](https://www.conventionalcommits.org/en/about/) specification.

1. Make changes
2. Commit those changes
3. Pull all the tags
4. Run `npm version [patch|minor|major]`
5. Stage the changes
6. Commit with `git commit -m "chore: bumped version to $version"`
7. Push changes and tag

## 📘 Changelog

---

See [CHANGELOG.md](CHANGELOG.md)

## 📄 License

---

MIT

---

Built with ❤️ by the Challenger Events team
