import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 Testing Environment Variables...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log(
    'NEXT_PUBLIC_FIREBASE_API_KEY:',
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:',
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID:',
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:',
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:',
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
  );
  console.log(
    'NEXT_PUBLIC_FIREBASE_APP_ID:',
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
  );

  const allVariablesSet =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!allVariablesSet) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please check your .env file and ensure all Firebase variables are set.');
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  console.log('\n✅ All environment variables are set!');
  return NextResponse.json({ message: 'Environment variables are properly configured' });
}
