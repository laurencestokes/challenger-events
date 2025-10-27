import * as admin from 'firebase-admin';

let appInitialized = false;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!privateKey) {
      console.warn('⚠️ FIREBASE_PRIVATE_KEY not set - Firebase Admin will not be initialized');
    } else {
      // Handle different private key formats
      let processedKey = privateKey;

      // Check if the private key is JSON-encoded
      if (processedKey.startsWith('{') && processedKey.includes('"privateKey"')) {
        try {
          const keyData = JSON.parse(processedKey);
          processedKey = keyData.privateKey;
        } catch (_jsonError) {
          // Try alternative JSON parsing
          try {
            const keyData = JSON.parse(processedKey);
            if (keyData.private_key) {
              processedKey = keyData.private_key;
            }
          } catch (_altError) {
            console.error('❌ Failed to parse JSON-encoded private key');
          }
        }
      }

      // Convert to proper OpenSSL format
      try {
        // Extract the base64 content between headers
        const beginMarker = '-----BEGIN PRIVATE KEY-----';
        const endMarker = '-----END PRIVATE KEY-----';

        if (processedKey.includes(beginMarker) && processedKey.includes(endMarker)) {
          // Extract just the base64 content
          const base64Content = processedKey
            .split(beginMarker)[1]
            .split(endMarker)[0]
            .replace(/\\n/g, '')
            .replace(/\n/g, '')
            .replace(/\s/g, '');

          console.log('Extracted base64 content length:', base64Content.length);

          // Reconstruct the key with proper formatting
          const lines = [];
          for (let i = 0; i < base64Content.length; i += 64) {
            lines.push(base64Content.substring(i, i + 64));
          }

          processedKey = `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
        } else {
          console.warn('Private key missing proper headers, using as-is');
        }
      } catch (keyError) {
        console.error('Error processing private key:', keyError);
        // Fall back to simple replacement
        processedKey = processedKey.replace(/\\n/g, '\n').trim();
      }

      // Validate the key format
      if (
        !processedKey.includes('-----BEGIN PRIVATE KEY-----') ||
        !processedKey.includes('-----END PRIVATE KEY-----')
      ) {
        console.warn('⚠️ Private key may not be in correct format');
      }

      try {
        // Try using application default credentials first
        try {
          admin.initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
          appInitialized = true;
          console.log('✅ Firebase Admin initialized with application default credentials');
        } catch (_defaultError) {
          console.log('Application default credentials failed, trying manual credentials...');

          // Fallback to manual credentials
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: processedKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
          appInitialized = true;
          console.log('✅ Firebase Admin initialized with manual credentials');
        }
      } catch (initError) {
        console.error('❌ Firebase Admin initialization failed:', initError);
        console.error('Init error details:', {
          message: initError instanceof Error ? initError.message : 'Unknown error',
          code: initError instanceof Error ? (initError as { code?: string }).code : 'Unknown code',
          stack: initError instanceof Error ? initError.stack?.substring(0, 500) : 'No stack trace',
        });
        throw initError;
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
} else {
  appInitialized = true;
}

export const adminStorage = appInitialized ? admin.storage() : null;
export default admin;
