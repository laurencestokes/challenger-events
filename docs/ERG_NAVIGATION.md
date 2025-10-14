# Navigation Guide - Erg Live Competition

## How to Access the Erg Pages

### For Admins

You now have **3 ways** to access the erg head-to-head competition pages:

#### 1. Main Header Navigation (Desktop)
When logged in as an admin, you'll see in the top navigation bar:
- **"🚣 Erg Live"** link between "Manage Users" and "Create Event"

#### 2. Main Header Navigation (Mobile)
Tap the menu icon (☰) and scroll to find:
- **"🚣 Erg Live"** in the mobile menu

#### 3. Admin Layout Sub-Navigation
When on any admin page, you'll see a horizontal navigation bar below the main header:
- Dashboard
- Events
- Users
- Verification
- **🚣 Erg Live** ← New!
- Competition Weigh-In

### Direct URLs

You can also bookmark or directly navigate to:

#### Admin Pages (Authentication Required)
- **Setup**: `http://localhost:3000/admin/erg/head-to-head`
  - Select competitors and create a session

- **Control Panel**: `http://localhost:3000/admin/erg/head-to-head/[sessionId]/control`
  - Monitor session, get public URL, control session
  - Automatically redirected here after creating a session

#### Public Pages (No Authentication Required)
- **Live Display**: `http://localhost:3000/erg/live/[sessionId]`
  - Beautiful public display with live bar charts
  - Share this URL with spectators
  - Can be displayed on large screens/projectors

## Navigation Flow

### Typical User Journey

```
Admin Login
    ↓
Click "🚣 Erg Live" in header or admin nav
    ↓
/admin/erg/head-to-head (Setup Page)
    ↓ Select competitors & create session
/admin/erg/head-to-head/[sessionId]/control (Control Panel)
    ↓ Copy public URL or scan QR code
/erg/live/[sessionId] (Public Display)
    ↓ Watch live competition!
```

### Starting a Competition

1. **Navigate to Setup**:
   - Click "🚣 Erg Live" in the header
   - Or go to `/admin/erg/head-to-head`

2. **Create Session**:
   - Select Competitor 1 from dropdown
   - Select Competitor 2 from dropdown
   - Click "Create Session & Start"

3. **Access Control Panel**:
   - Automatically redirected to control panel
   - Monitor connection status
   - View real-time scores

4. **Share Public Display**:
   - Copy the public URL
   - Or scan the QR code
   - Open on spectator screens

5. **Start Python Client**:
   - Python client will detect the new session
   - Begin streaming erg data automatically

6. **Watch Live**:
   - Public display updates in real-time
   - Bar charts show live scores
   - Leader indicator shows who's ahead

### Stopping a Session

1. From the Control Panel
2. Click "Stop Session" button
3. Confirm the action
4. Automatically redirected back to setup page

## Navigation by Role

### Admin Users
✅ Can access all pages:
- Setup page (`/admin/erg/head-to-head`)
- Control panel (`/admin/erg/head-to-head/[sessionId]/control`)
- Public display (`/erg/live/[sessionId]`)

### Competitors/Regular Users
✅ Can access:
- Public display (`/erg/live/[sessionId]`)

❌ Cannot access:
- Setup page (redirected to home)
- Control panel (redirected to home)

### Unauthenticated Users
✅ Can access:
- Public display (`/erg/live/[sessionId]`) - No login required!

❌ Cannot access:
- Setup page (redirected to sign in)
- Control panel (redirected to sign in)

## Quick Access

### Keyboard Shortcuts (Browser Dependent)
- Press `/` to focus the search/address bar
- Type: `admin/erg` and autocomplete should suggest the page

### Bookmarking
For frequent access, bookmark:
- `http://localhost:3000/admin/erg/head-to-head`
- Or `http://yourdomain.com/admin/erg/head-to-head` in production

## Troubleshooting Navigation

### "🚣 Erg Live" Link Not Visible
**Problem**: You don't see the erg live link in navigation

**Solutions**:
1. Ensure you're logged in as an admin
2. Check your user role (should be 'ADMIN' or 'SUPER_ADMIN')
3. Refresh the page (Ctrl+R / Cmd+R)
4. Clear browser cache if using cached version

### Can't Access Admin Pages
**Problem**: Redirected to home page when trying to access admin pages

**Solutions**:
1. Verify you're logged in
2. Check your account has admin role
3. Contact a super admin to update your role

### Public Display Not Found
**Problem**: Public display shows "Session Not Found"

**Solutions**:
1. Verify the session ID in the URL is correct
2. Check the session hasn't been stopped
3. Ensure the session was created successfully
4. Check browser console for errors

## Mobile Navigation

### On Mobile Devices
1. Tap the menu icon (☰) in the top right
2. Scroll down to find "🚣 Erg Live"
3. Tap to navigate to the setup page

### Mobile-Optimized
- All pages are responsive and work on mobile
- Public display adjusts layout for smaller screens
- Control panel stacks elements vertically on mobile

## Visual Indicators

### Active Page Highlighting
The navigation system uses hover effects to show interactive elements:
- Hover over links to see color change
- Active page may have different styling (depending on implementation)

### Icons
- 🚣 = Erg Live Competition feature
- Makes it easy to identify in crowded navigation menus

## Production URLs

When deployed to production, replace `localhost:3000` with your domain:
- Setup: `https://yourdomain.com/admin/erg/head-to-head`
- Control: `https://yourdomain.com/admin/erg/head-to-head/[sessionId]/control`
- Public: `https://yourdomain.com/erg/live/[sessionId]`

## Integration with Existing Features

The erg live feature integrates seamlessly with:
- **User Management**: Competitors must be registered users
- **Admin System**: Uses existing admin authentication
- **Profile Data**: Pulls age, sex, weight from user profiles
- **Header/Navigation**: Consistent with existing UI patterns

## Summary

**For Quick Access**:
1. Look for **"🚣 Erg Live"** in the admin navigation
2. Or directly visit `/admin/erg/head-to-head`
3. Create a session and share the public URL

**For Spectators**:
1. Get the public URL from admin
2. Open in any browser (no login needed)
3. Watch the competition live!

The navigation is designed to be intuitive and consistent with your existing admin interface. 🎉

