import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest, { params }: { params: { userid: string } }) {
  const { userid } = params;
  console.log('API route HIT', params.userid);
  // Fetch user by uid
  const user = await getUserByUid(userid);
  if (user) {
    const freshUserSnap = await getDoc(doc(db, 'users', user.id));
    console.log('API: freshUserSnap', freshUserSnap.data());
  }
  console.log('API: user from getUserByUid', user);
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
