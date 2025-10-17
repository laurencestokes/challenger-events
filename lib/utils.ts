import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import QRCode from 'qrcode';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a unique 6-8 character alphanumeric event code
export function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate QR code for event
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Check if user is admin or super admin
export function isAdmin(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

// Check if user is super admin
export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN';
}

// Format date for display
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Calculate score percentage
export function calculateScorePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export function calculateAgeFromDateOfBirth(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

export function convertFirestoreTimestamp(timestamp: unknown): Date | null {
  if (!timestamp) return null;

  // Handle Firestore Timestamp objects
  if (typeof timestamp === 'object' && timestamp !== null) {
    // Check if it's a Firestore Timestamp with seconds and nanoseconds
    if ('seconds' in timestamp && typeof (timestamp as { seconds: number }).seconds === 'number') {
      return new Date((timestamp as { seconds: number }).seconds * 1000);
    } else if (
      'toDate' in timestamp &&
      typeof (timestamp as { toDate: () => Date }).toDate === 'function'
    ) {
      return (timestamp as { toDate: () => Date }).toDate();
    }
  }

  // Handle regular Date objects
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Handle string dates
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle number timestamps
  if (typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// Firestore timestamp type
interface FirestoreTimestamp {
  type: 'firestore/timestamp/1.0';
  seconds: number;
  nanoseconds: number;
}

function convertFirestoreTimestampToDate(timestamp: FirestoreTimestamp): Date {
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
}

export function formatTimestamp(timestamp: Date | string | number | FirestoreTimestamp): string {
  let date: Date;

  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'type' in timestamp &&
    timestamp.type === 'firestore/timestamp/1.0'
  ) {
    date = convertFirestoreTimestampToDate(timestamp as FirestoreTimestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    date = new Date();
  }

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export function formatFullTimestamp(
  timestamp: Date | string | number | FirestoreTimestamp,
  options: { dateOnly?: boolean } = {},
): string {
  let date: Date;

  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'type' in timestamp &&
    timestamp.type === 'firestore/timestamp/1.0'
  ) {
    date = convertFirestoreTimestampToDate(timestamp as FirestoreTimestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    date = new Date();
  }

  if (options.dateOnly) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } else {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
