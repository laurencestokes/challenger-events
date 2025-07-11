import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, updateUser } from '@/lib/firestore';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, bodyweight, age, sex } = body;

    // Validate input
    const updates: Partial<{
      name: string;
      bodyweight: number;
      age: number;
      sex: 'M' | 'F';
    }> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (bodyweight !== undefined) {
      const weight = Number(bodyweight);
      if (isNaN(weight) || weight < 0) {
        return NextResponse.json({ error: 'Invalid bodyweight' }, { status: 400 });
      }
      updates.bodyweight = weight;
    }

    if (age !== undefined) {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
      }
      updates.age = ageNum;
    }

    if (sex !== undefined) {
      if (sex !== 'M' && sex !== 'F') {
        return NextResponse.json({ error: 'Invalid sex value' }, { status: 400 });
      }
      updates.sex = sex;
    }

    await updateUser(user.id, updates);

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: { ...user, ...updates },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
