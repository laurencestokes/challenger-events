# Firebase Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email Provider (Resend)
RESEND_API_KEY="your-resend-api-key"

# Super Admins (comma-separated emails)
SUPER_ADMIN_EMAILS="admin@challenger.com,super@challenger.com"

# Firebase Configuration (Client)
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Firebase Admin (Server)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Socket.io (for real-time features)
SOCKET_SECRET="your-socket-secret"
```

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `challenger-events`
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location (choose closest to your users)
5. Click "Done"

### 3. Get Firebase Config

1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → "Web"
4. Register app with name: `challenger-events-web`
5. Copy the config object to your `.env` file

### 4. Create Service Account

1. In Firebase Console, go to "Project settings"
2. Click "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. Copy the values to your `.env` file:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 5. Firestore Security Rules

Create a file `firestore.rules` in your project root:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Events
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        resource.data.adminIds[request.auth.uid] != null;
    }
    
    // Activities
    match /activities/{activityId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Scores
    match /scores/{scoreId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 6. Deploy Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

## Next Steps

1. Update your `.env` file with the Firebase configuration
2. Run the development server: `npm run dev`
3. Test the application
4. Set up real-time features with Socket.io

## Benefits of Firebase

- ✅ **Real-time updates** out of the box
- ✅ **Automatic scaling** 
- ✅ **No database setup** required
- ✅ **Generous free tier**
- ✅ **Built-in authentication** (though we're using NextAuth)
- ✅ **Offline support** (can be added later) 