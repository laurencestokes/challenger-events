import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ERG_API_SECRET = process.env.ERG_API_SECRET;
const MAX_TIMESTAMP_DIFF = 60 * 1000; // 60 seconds

/**
 * Verify HMAC signature to ensure request is from authorized Python client
 */
function verifySignature(payload: string, signature: string, timestamp: string): boolean {
  if (!ERG_API_SECRET) {
    console.error('ERG_API_SECRET not configured');
    return false;
  }

  // Verify timestamp to prevent replay attacks
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();

  if (Math.abs(now - requestTime) > MAX_TIMESTAMP_DIFF) {
    console.error('Request timestamp too old or in future');
    return false;
  }

  // Create HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', ERG_API_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error('Signature comparison failed:', error);
    return false;
  }
}

/**
 * POST /api/erg/data
 *
 * HTTP-based alternative to Socket.IO for receiving erg data
 * Secured with HMAC signature verification
 *
 * Headers required:
 * - X-Erg-Signature: HMAC signature
 * - X-Erg-Timestamp: ISO timestamp
 *
 * Body:
 * {
 *   "sessionId": "session_123",
 *   "competitorIndex": 0 | 1,
 *   "metrics": {
 *     "pace": 125,
 *     "distance": 2500,
 *     "power": 250,
 *     "heartRate": 165,
 *     "strokeRate": 28,
 *     "calories": 145
 *   },
 *   "calculatedScore": 85.5
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Erg-Signature');
    const timestamp = request.headers.get('X-Erg-Timestamp');

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing security headers (X-Erg-Signature, X-Erg-Timestamp)' },
        { status: 401 },
      );
    }

    const body = await request.text();

    // Verify the signature
    if (!verifySignature(body, signature, timestamp)) {
      console.error('Invalid signature or timestamp');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);

    // Validate required fields
    if (
      !data.sessionId ||
      data.competitorIndex === undefined ||
      !data.metrics ||
      data.calculatedScore === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields (sessionId, competitorIndex, metrics, calculatedScore)' },
        { status: 400 },
      );
    }

    // Validate competitor index
    if (data.competitorIndex !== 0 && data.competitorIndex !== 1) {
      return NextResponse.json({ error: 'competitorIndex must be 0 or 1' }, { status: 400 });
    }

    console.log('Received valid erg data:', {
      sessionId: data.sessionId,
      competitorIndex: data.competitorIndex,
      score: data.calculatedScore,
    });

    // Broadcast via Socket.IO if available
    if (global.io) {
      global.io.to(`session:${data.sessionId}`).emit('erg:update', {
        competitorIndex: data.competitorIndex,
        metrics: data.metrics,
        calculatedScore: data.calculatedScore,
        timestamp: new Date().toISOString(),
      });
      console.log('Broadcasted to Socket.IO clients');
    } else {
      console.warn('Socket.IO not available, data not broadcasted');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing erg data:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/erg/data
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Erg data API is running',
    socketIOAvailable: !!global.io,
    timestamp: new Date().toISOString(),
  });
}
