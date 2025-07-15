import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest, { params }: { params: { userid: string } }) {
  // Secure with a secret header
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { userid } = params;
  const path = `/public/profile/${userid}`;
  await revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
