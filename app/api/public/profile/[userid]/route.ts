import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getUserByProfileName } from '@/lib/firestore';
import { db } from '@/lib/firebase';

export async function GET(_request: NextRequest, { params }: { params: { userid: string } }) {
  const { userid } = params;

  // Try to fetch user by profile name first, then by UID
  let user = await getUserByProfileName(userid);
  if (!user) {
    user = await getUserByUid(userid);
  }

  if (!user || !user.publicProfileEnabled) {
    return NextResponse.json({ user: null }, { status: 404 });
  }

  // Fetch all scores for this user (event and personal) using user.id
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const scoresRef = collection(db, 'scores');
  const q = query(scoresRef, where('userId', '==', user.id));
  const querySnapshot = await getDocs(q);
  const scores = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ user, scores });
}
