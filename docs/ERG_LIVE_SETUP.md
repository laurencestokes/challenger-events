# Concept2 Erg Live Head-to-Head Competition Setup

Complete guide for setting up and running live head-to-head erg competitions with real-time display.

## Architecture Overview

```
┌──────────────────┐         Socket.IO           ┌──────────────────┐
│  Python Client   │ ←──────────────────────────→ │   Next.js App    │
│  (erg_client.py) │                              │  (server.js)     │
└────────┬─────────┘                              └────────┬─────────┘
         │                                                  │
         │ USB/Bluetooth                                    │ Socket.IO
         ↓                                                  ↓
┌──────────────────┐                              ┌──────────────────┐
│  Concept2 Ergs   │                              │  Web Browsers    │
│  (2 machines)    │                              │  - Admin Control │
└──────────────────┘                              │  - Public Display│
                                                   └──────────────────┘
```

## Features

- **Real-time Streaming**: Live erg data streamed via Socket.IO
- **Bidirectional Communication**: Web app sends competitor data to Python script
- **Dual Bar Charts**: Beautiful side-by-side comparison with live score updates
- **Admin Control Panel**: Easy setup and management of competitions
- **Public Display URL**: Share via link or QR code for spectators
- **Secure Authentication**: HMAC-based security for Python client connections
- **Automatic Score Calculation**: Based on age, sex, weight, and performance metrics

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Concept2 erg(s) with PM5 monitor (for production)
- Modern web browser

## Setup Instructions

### 1. Server Configuration

#### Add Environment Variable

Add to your `.env` file:

```bash
# Generate a strong secret (minimum 32 characters)
# On Unix/Mac: openssl rand -hex 32
# Or use a password generator
ERG_API_SECRET="your-very-long-random-secret-key-here-min-32-chars"
```

#### Install Dependencies

Socket.IO is already included in your `package.json`. No additional installation needed.

#### Start the Server

```bash
npm run dev
```

This now runs the custom Socket.IO server (via `server.js`) instead of the standard Next.js dev server.

### 2. Python Client Setup

#### Navigate to Python Client Directory

```bash
cd python-client
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment

Create a `.env` file in the `python-client` directory:

```bash
SERVER_URL=http://localhost:3000
ERG_API_SECRET=your-very-long-random-secret-key-here-min-32-chars
```

**Important**: `ERG_API_SECRET` must match the server's `.env` file exactly.

#### Run the Python Client

```bash
python erg_client.py
```

You should see:
```
Connecting to http://localhost:3000...
Connected to server: http://localhost:3000
✅ Authentication successful
Waiting for competition sessions...
```

## Usage Workflow

### Step 1: Admin Setup

1. Log in as an admin
2. Navigate to: **Admin > Erg > Head-to-Head**
   - Direct URL: `http://localhost:3000/admin/erg/head-to-head`

3. Select two competitors from the dropdown
   - Ensure both competitors have complete profile data (weight, age, sex)
   - If data is missing, update it in the user management section first

4. Click **"Create Session & Start"**

### Step 2: Control Panel

After creating a session, you'll be taken to the control panel where you can:

- **Monitor connection status** (Socket.IO, Session, Python Client)
- **View current scores** for both competitors in real-time
- **Get the public display URL** and QR code
- **Share with spectators** via link or QR code
- **Stop the session** when complete

### Step 3: Python Client (Automatic)

The Python client will automatically:

1. Receive the session notification
2. Display competitor information (name, age, sex, weight)
3. Start streaming erg data
4. Calculate scores based on metrics and competitor attributes
5. Send updates to the server every second (or faster)

Console output will show:
```
==================================================
NEW COMPETITION SESSION
==================================================
Session ID: session_1234567890_abc123

Competitor 1: John Doe
  Age: 28
  Sex: male
  Weight: 75kg

Competitor 2: Jane Smith
  Age: 25
  Sex: female
  Weight: 65kg
==================================================

🎬 Starting erg data stream...
⏱️  5.0s | Comp1: 42.5 (225m) | Comp2: 40.3 (215m)
```

### Step 4: Public Display

Share the public URL with spectators:

**URL Format**: `http://localhost:3000/erg/live/{sessionId}`

The public display shows:

- **Live bar charts** for both competitors
- **Real-time scores** with smooth animations
- **Current metrics** (distance, pace, power, heart rate)
- **Leader indicator** showing who's ahead and by how much
- **Connection status** (live/disconnected)

Perfect for displaying on a large screen or projector at your venue!

## Customizing the Score Algorithm

The Python client includes a `calculate_score()` method that you can customize for your event's scoring system:

```python
def calculate_score(self, metrics: Dict, competitor_data: Dict) -> float:
    """
    Customize this method with your scoring algorithm
    
    Available inputs:
    - metrics['pace'] - seconds per 500m
    - metrics['distance'] - total meters
    - metrics['power'] - watts
    - metrics['heartRate'] - beats per minute
    - metrics['strokeRate'] - strokes per minute
    - metrics['calories'] - calories burned
    - competitor_data['age'] - competitor age
    - competitor_data['sex'] - 'male' or 'female'
    - competitor_data['weight'] - kilograms
    """
    
    # Example: Your custom scoring logic here
    base_score = metrics['distance'] / 10
    pace_adjustment = (200 - metrics['pace']) / 2
    
    # Age adjustments
    age = competitor_data['age']
    if age > 40:
        base_score *= 1.1  # 10% bonus for masters
    
    # Sex adjustments
    if competitor_data['sex'] == 'female':
        base_score *= 1.15  # Adjust based on your standards
    
    return round(base_score + pace_adjustment, 1)
```

## Integrating Real Concept2 Ergs

The current implementation uses simulated data. To connect to actual Concept2 ergs:

### Option 1: PyRow (USB Connection)

1. Install PyRow:
```bash
pip install pyrow pyserial
```

2. Connect ergs via USB

3. Update `erg_client.py` - replace `simulate_erg_data()` with actual erg reading code (see comments in the file)

### Option 2: Bluetooth PM5

For Bluetooth-enabled PM5 monitors, you can use:
- Concept2 SDK
- Custom Bluetooth implementation
- Third-party libraries

Refer to Concept2's developer documentation for details.

## Troubleshooting

### Python Client Can't Connect

**Symptom**: "Connection refused" or timeout errors

**Solutions**:
- Ensure the Next.js server is running (`npm run dev`)
- Check `SERVER_URL` is correct (default: `http://localhost:3000`)
- Verify firewall isn't blocking the connection
- Try `http://127.0.0.1:3000` instead of `localhost`

### Authentication Failed

**Symptom**: "❌ Authentication failed: Invalid API secret"

**Solutions**:
- Verify `ERG_API_SECRET` matches in both `.env` files (server and Python client)
- Check for extra whitespace or quotes
- Ensure the secret is at least 32 characters
- Restart both server and Python client after changing secrets

### No Data on Public Display

**Symptom**: Public page shows "Waiting for competitors to start..."

**Solutions**:
- Verify Python client is running and authenticated
- Check Python client console for "NEW COMPETITION SESSION" message
- Ensure session ID matches
- Check browser console for Socket.IO connection errors
- Try refreshing the public display page

### Competitors Missing Profile Data

**Symptom**: Error when creating session about missing data

**Solutions**:
- Navigate to Admin > Users
- Edit the user and add:
  - Date of birth
  - Sex (M/F)
  - Bodyweight (kg)
- Save and try creating the session again

### Socket.IO Connection Issues

**Symptom**: "🔴 DISCONNECTED" status on public display

**Solutions**:
- Check browser console for errors
- Verify server is running with custom server (`npm run dev`, not `npm run dev:next`)
- Clear browser cache and reload
- Check CORS settings if accessing from different domain

## Production Deployment

### Important Notes

1. **Custom Server Required**: The Socket.IO implementation requires a custom server (`server.js`), which is not compatible with Vercel's serverless functions.

2. **Deployment Options**:
   - **Self-hosted**: Deploy to a VM (DigitalOcean, AWS EC2, etc.)
   - **Heroku**: Supports custom servers
   - **Railway**: Easy deployment with custom servers
   - **Render**: Supports Node.js custom servers

3. **Environment Variables**: Ensure all environment variables are set in production:
   ```bash
   ERG_API_SECRET=your-production-secret
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NODE_ENV=production
   ```

4. **HTTPS Required**: Use HTTPS in production for secure WebSocket connections

5. **Python Client Connection**: Update `SERVER_URL` to your production domain

### Example Production Start

```bash
npm run build
npm start
```

## API Reference

### Socket.IO Events

#### Client → Server

- `python:authenticate` - Authenticate Python client with API secret
- `session:join` - Join a session room (viewers)
- `erg:data` - Send erg metrics and calculated score
- `session:stop` - Stop a session (admin)

#### Server → Client

- `python:authenticated` - Authentication result
- `session:new` - New session created with competitor data
- `erg:update` - Real-time erg data update
- `session:ended` - Session has ended
- `session:python-disconnected` - Python client disconnected

### REST API Endpoints

- `POST /api/erg/sessions` - Create new head-to-head session
- `GET /api/erg/sessions?sessionId={id}` - Get session details
- `POST /api/erg/data` - HTTP alternative for sending erg data (with HMAC)
- `GET /api/erg/data` - Health check

## Security Best Practices

1. **Keep Secrets Secret**: Never commit `ERG_API_SECRET` to version control
2. **Use Strong Secrets**: Minimum 32 characters, use `openssl rand -hex 32`
3. **HTTPS in Production**: Always use HTTPS for production deployments
4. **Rotate Secrets**: Change secrets periodically
5. **Limit Access**: Only authorized Python clients should have the secret
6. **Monitor Logs**: Watch for authentication failures

## Support

For issues, questions, or feature requests, contact your development team or refer to the main project documentation.

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for more than 2 competitors
- [ ] Historical data storage and replay
- [ ] Multiple event types (rowing, skiing, biking)
- [ ] Live video integration
- [ ] Mobile app for spectators
- [ ] Advanced analytics and insights
- [ ] Integration with Concept2 Logbook
- [ ] Multi-session management
- [ ] Automated highlights and clips

