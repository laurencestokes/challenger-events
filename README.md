# Challenger Events 🏆

A real-time fitness event management system that allows admins to create events and input scores for competitors, while competitors can view live leaderboards.

## ✨ Features

- **Magic Link Authentication** - No passwords required, just email verification
- **Role-based Access Control** - Super Admin, Admin, Competitor, and Viewer roles
- **Event Management** - Create events with unique codes and QR codes
- **Real-time Leaderboards** - Live score updates using WebSockets
- **Mobile Responsive** - Works seamlessly on all devices
- **Dark Mode Support** - Built-in theme switching

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Email provider (Resend, Gmail, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd challenger-events
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Environment Variables

Create a `.env` file in the root directory:

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

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with magic links
- **Real-time**: Socket.io
- **Email**: Resend (or any SMTP provider)

### Database Schema

- **Users**: Authentication and role management
- **Events**: Competition events with unique codes
- **Activities**: Individual exercises/workouts within events
- **Scores**: Competitor performance data
- **Teams**: Group management (optional)
- **Invitations**: Admin invitation system

## 🎯 Usage

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

## 🔧 API Endpoints

- `POST /api/events` - Create new events
- `GET /api/events` - Fetch user's events
- `POST /api/events/join` - Join an event with code
- `POST /api/scores` - Submit scores (admin only)
- `GET /api/events/[id]/leaderboard` - Get real-time leaderboard

## 🔒 Security Features

- Role-based access control
- Event code validation
- Rate limiting on score submissions
- Audit logging for all changes
- CSRF protection

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Other Platforms

- **Railway**: Easy PostgreSQL + deployment
- **Render**: Free tier available
- **DigitalOcean**: App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For issues or questions:
1. Check the [GitHub issues](https://github.com/your-username/challenger-events/issues)
2. Review the [SETUP.md](SETUP.md) documentation
3. Contact the development team

---

Built with ❤️ by the Challenger Events team
