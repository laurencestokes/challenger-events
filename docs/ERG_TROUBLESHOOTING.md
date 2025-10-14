# Erg Live - Troubleshooting Guide

## Common Issues and Solutions

### "Session not found" Error

**Problem**: After creating a session, you're redirected to the control panel but see "Failed to load session" with error: `{"error":"Session not found"}`

**Root Cause**: Sessions are stored in memory on the Node.js server. If the server restarts or you're using the wrong dev command, sessions are lost.

**Solution**:

1. **Ensure you're using the custom server**:
   ```bash
   # Correct command (uses server.js with Socket.IO)
   npm run dev
   
   # Wrong command (standard Next.js, no Socket.IO)
   npm run dev:next
   ```

2. **Restart the server** if you just made changes:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

3. **Check server logs** for session creation:
   ```
   Session created and stored: session_1760299690767_digddv
   ```

4. **Session persistence**: Remember that sessions are stored in memory and will be lost when:
   - Server restarts
   - Server crashes
   - You switch branches or rebuild
   
   For production, you should implement database storage.

---

### "Failed to load users" Error

**Problem**: On the setup page, you see "Failed to load users"

**Solutions**:

1. **Verify you're logged in as an admin**
   - Check your user role in the database
   - Log out and log back in
   - Check browser console for auth errors

2. **Check authentication**:
   ```javascript
   // Open browser console (F12)
   // Check if user is loaded:
   localStorage.getItem('firebase:authUser')
   ```

3. **Refresh the page** after logging in

4. **Clear browser cache** if persisting

---

### Python Client Can't Connect

**Problem**: Python client shows connection refused or timeout

**Solutions**:

1. **Verify server is running**:
   ```bash
   npm run dev
   ```
   Look for: `> Ready on http://localhost:3000`

2. **Check Socket.IO is active**:
   ```
   > Socket.IO server running
   ```

3. **Verify environment variables**:
   ```bash
   # In python-client directory
   echo $ERG_API_SECRET
   echo $SERVER_URL
   ```

4. **Test connection**:
   ```bash
   curl http://localhost:3000/api/erg/data
   ```
   Should return: `{"status":"ok","message":"Erg data API is running",...}`

---

### Socket.IO Not Available

**Problem**: API endpoint shows `"socketIOAvailable": false`

**Root Cause**: Using standard Next.js dev server instead of custom server

**Solution**:
```bash
# Stop current server
# Use custom server command:
npm run dev
```

**Verify**:
```bash
curl http://localhost:3000/api/erg/data
```
Should show: `"socketIOAvailable": true`

---

### Public Display Shows "Disconnected"

**Problem**: Public display page shows red "DISCONNECTED" status

**Solutions**:

1. **Check Socket.IO connection** (browser console):
   ```javascript
   // Should see:
   Socket.IO connected: <socket-id>
   ```

2. **Verify session exists**:
   - Check the session ID in the URL
   - Ensure session wasn't stopped
   - Try refreshing the page

3. **CORS issues** (if accessing from different domain):
   - Update CORS settings in `server.js`
   - Use same domain for all pages

---

### "Waiting for competitors to start..." Never Changes

**Problem**: Public display stays on waiting message, no data appears

**Checklist**:

1. ✅ **Python client is running and authenticated**
   ```
   ✅ Authentication successful
   Waiting for competition sessions...
   ```

2. ✅ **Python client received the session**
   ```
   NEW COMPETITION SESSION
   Session ID: session_xxx
   ```

3. ✅ **Data is streaming**
   ```
   ⏱️  5.0s | Comp1: 42.5 (225m) | Comp2: 40.3 (215m)
   ```

4. ✅ **Session IDs match**
   - Check Python console for session ID
   - Check browser URL for session ID
   - They must match exactly

**If still not working**:
- Check browser console for errors
- Verify Socket.IO connection (green dot on page)
- Try refreshing the public display page
- Restart Python client

---

### Competitor Missing Profile Data

**Problem**: Error when selecting competitor: "Missing required profile data (weight, age, sex)"

**Solution**:

1. Go to **Admin > Users**
2. Find the user and click edit
3. Add missing data:
   - **Date of Birth** (for age calculation)
   - **Sex** (M or F)
   - **Body Weight** (in kg)
4. Save changes
5. Return to erg setup page and try again

---

### Session Stops Unexpectedly

**Problem**: Session ends or data stops streaming mid-competition

**Possible Causes**:

1. **Admin stopped session** - Check control panel
2. **Python client disconnected** - Check Python terminal
3. **Server restarted** - Check server logs
4. **Network issue** - Check internet connection

**Recovery**:
- Create a new session
- Restart Python client
- Ensure stable network connection

---

## Development Issues

### TypeScript Errors

**Problem**: Type errors in IDE for `global.ergSessions` or `global.io`

**Solution**: Type declarations are in each file using `declare global`. If still seeing errors:

```typescript
// Add to a .d.ts file or at top of file:
declare global {
  var ergSessions: Map<string, any> | undefined;
  var io: any;
}
```

---

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find and kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Then restart:
npm run dev
```

---

### Hot Reload Not Working

**Problem**: Changes to Socket.IO code not reflected

**Reason**: Custom server requires manual restart for some changes

**Solution**:
- Stop server (Ctrl+C)
- Restart: `npm run dev`
- Alternatively, use `nodemon` for auto-restart (not included by default)

---

## Production Issues

### Socket.IO Connection Fails in Production

**Checklist**:

1. ✅ **HTTPS enabled** (required for secure WebSockets)
2. ✅ **CORS configured** properly in `server.js`
3. ✅ **Firewall allows WebSocket connections**
4. ✅ **Correct URL in NEXT_PUBLIC_APP_URL**
5. ✅ **Server using custom server.js** (not serverless)

---

### Sessions Lost After Deployment

**Problem**: Sessions disappear after deploy

**Reason**: In-memory storage is cleared on restart

**Solution**: Implement database storage (Firebase, MongoDB, PostgreSQL)

**Quick fix for testing**:
- Keep server running continuously
- Don't redeploy during active sessions

---

## Getting More Help

### Enable Debug Logging

**Server-side** (server.js):
```javascript
// Add at top of server.js
process.env.DEBUG = 'socket.io:*';
```

**Client-side** (browser console):
```javascript
localStorage.debug = 'socket.io-client:*';
// Refresh page
```

### Check Logs

**Server logs**:
- Session creation: "Session created and stored: session_xxx"
- Socket connections: "Client connected: <id>"
- Python auth: "Python client authenticated: <id>"

**Browser console** (F12):
- Socket.IO connection status
- API request/response errors
- React component errors

**Python client**:
- Connection status
- Authentication result
- Data streaming status

---

## Still Having Issues?

1. Check all environment variables are set correctly
2. Ensure you're using `npm run dev` (not `npm run dev:next`)
3. Verify all dependencies are installed: `npm install`
4. Try in incognito/private browsing mode
5. Check browser console and server logs for specific errors
6. Restart everything: server, Python client, browser

If problems persist, check:
- Node.js version (18+ required)
- Python version (3.8+ required)
- Firewall settings
- Antivirus software (may block WebSocket connections)

