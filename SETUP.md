# Challenger Events - Setup Guide

## Overview

This is a real-time fitness event management system built with Next.js, Prisma, and NextAuth.js. It allows admins to create events and input scores for competitors, while competitors can view real-time leaderboards.

## Features

- **Magic Link Authentication**: No passwords required, just email verification
- **Role-based Access**: Super Admin, Admin, Competitor, and Viewer roles
- **Event Management**: Create events with unique codes and QR codes
- **Real-time Leaderboards**: Live score updates using WebSockets
- **Mobile Responsive**: Works on all devices
- **Dark Mode Support**: Built-in theme switching

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with magic links
- **Real-time**: Socket.io
- **Email**: Resend (or any SMTP provider)

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/challenger_events"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email Provider (Resend)
RESEND_API_KEY="your-resend-api-key"

# Super Admins (comma-separated emails)
SUPER_ADMIN_EMAILS="admin@challenger.com,super@challenger.com"

# Socket.io
SOCKET_SECRET="your-socket-secret"
```

### 2. Database Setup

1. Install PostgreSQL and create a database
2. Run the Prisma migration:
   ```bash
   npx prisma migrate dev
   ```
3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### 3. Email Provider Setup

For development, you can use:
- **Resend**: Sign up at resend.com and get an API key
- **Gmail**: Use Gmail SMTP settings
- **Mailtrap**: For testing

Update the NextAuth configuration in `app/api/auth/[...nextauth]/route.ts` with your email provider settings.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

## Usage

### For Admins

1. **Sign in** with your email (you'll receive a magic link)
2. **Create events** with unique codes
3. **Add activities** to events (workouts, exercises, etc.)
4. **Input scores** for competitors
5. **View real-time leaderboards**

### For Competitors

1. **Sign in** with your email
2. **Join events** using event codes
3. **View your performance** and leaderboards
4. **Track progress** over time

## Database Schema

The system includes the following main entities:

- **Users**: Authentication and role management
- **Events**: Competition events with unique codes
- **Activities**: Individual exercises/workouts within events
- **Scores**: Competitor performance data
- **Teams**: Group management (optional)
- **Invitations**: Admin invitation system

## API Endpoints

- `POST /api/events` - Create new events
- `GET /api/events` - Fetch user's events
- `POST /api/events/join` - Join an event with code
- `POST /api/scores` - Submit scores (admin only)
- `GET /api/events/[id]/leaderboard` - Get real-time leaderboard

## Real-time Features

The system uses Socket.io for real-time updates:
- Live score updates
- Leaderboard changes
- Event status updates
- Admin notifications

## Security Features

- Role-based access control
- Event code validation
- Rate limiting on score submissions
- Audit logging for all changes
- CSRF protection

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Other Platforms

- **Railway**: Easy PostgreSQL + deployment
- **Render**: Free tier available
- **DigitalOcean**: App Platform

## Customization

### Adding New Activity Types

1. Update the `ActivityType` enum in `prisma/schema.prisma`
2. Add scoring logic in `utils/scoring.ts`
3. Update the UI components

### Custom Scoring Systems

Modify the scoring logic in `utils/scoring.ts` to implement your specific scoring algorithms.

## Support

For issues or questions:
1. Check the GitHub issues
2. Review the documentation
3. Contact the development team

## License

This project is licensed under the MIT License. 