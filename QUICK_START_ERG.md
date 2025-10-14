# Quick Start: Concept2 Erg Live Competition 🚣

Get your head-to-head erg competition running in 5 minutes!

## ⚡ Quick Setup

### 1. Add Environment Variable

Add to your `.env` file:
```bash
ERG_API_SECRET="generate-a-random-32-char-secret-here"
```

Generate a secret:
```bash
# On Mac/Linux
openssl rand -hex 32

# Or use any password generator (32+ characters)
```

### 2. Start the Server

```bash
npm run dev
```

This now runs the custom Socket.IO server (not standard Next.js).

### 3. Development Mode (No Python Client Needed!)

For development and testing, you can use **Demo Mode** which generates mock erg data automatically.

**Python Client** is in an separate repository (currently: challenger-data). See `PYTHON_CLIENT.md` for integration details.

## 🎯 Run a Competition

### Admin Side (Browser)

1. Go to: `http://localhost:3000/admin/erg/head-to-head`
2. Select 2 competitors from dropdowns
3. Click **"Create Session & Start"**
4. On the control panel, click **🧪 Start Demo Mode** (development only)
5. Copy the public display URL from the control panel

### Spectator Side (Public Display)

1. Open the public URL (or scan QR code)
2. Watch the live bar charts update in real-time!
3. See who's leading with live scores

### Demo Mode (Browser)

Demo Mode will automatically:
- Generate realistic erg data
- Simulate two competitors racing
- Update scores every second
- Show "Demo data streaming..." indicator
- Auto-stop after 2000m

**For Production**: Connect the real Python client (see `PYTHON_CLIENT.md`)

## 📁 Files Created

### Backend
- `server.js` - Custom Socket.IO server
- `lib/socket-client.ts` - Socket.IO client utilities
- `hooks/useErgSocket.ts` - React hook for real-time erg data
- `app/api/erg/sessions/route.ts` - Session management API
- `app/api/erg/data/route.ts` - Alternative HTTP endpoint with HMAC

### Frontend
- `app/admin/erg/head-to-head/page.tsx` - Admin: Select competitors
- `app/admin/erg/head-to-head/[sessionId]/control/page.tsx` - Admin: Control panel
- `app/erg/live/[sessionId]/page.tsx` - Public: Live display with bar charts

### Documentation
- `docs/ERG_LIVE_SETUP.md` - Complete setup guide
- `QUICK_START_ERG.md` - This file


## 🎨 Display Customization

Edit `app/erg/live/[sessionId]/page.tsx` to customize:
- Bar colors (currently blue and purple gradients)
- Layout and sizing
- Metrics displayed
- Animations and transitions

## 🐛 Troubleshooting

**"Failed to load users" error?**
- Make sure you're logged in as an admin
- Refresh the page if you just logged in
- Check browser console for detailed error messages
- Verify your user account has admin role

**Python client can't connect?**
- Ensure server is running (`npm run dev`)
- Check SERVER_URL is correct
- Verify ERG_API_SECRET matches in both .env files

**No data on public display?**
- Check Python client is authenticated (see "✅" in console)
- Verify session ID matches
- Check browser console for Socket.IO errors

**Competitor missing profile data?**
- Go to Admin > Users
- Edit user and add: date of birth, sex, bodyweight
- Required for score calculations

## 📚 More Information

For detailed documentation, see:
- **Full Setup Guide**: `docs/ERG_LIVE_SETUP.md`
- **Architecture Details**: See ERG_LIVE_SETUP.md


