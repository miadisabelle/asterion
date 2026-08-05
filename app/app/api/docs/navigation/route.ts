import { NextResponse } from 'next/server';
import { getDocNavigation } from '@/lib/docs/data';

export async function GET() {
  try {
    const navigation = await getDocNavigation();
    return NextResponse.json(navigation);
  } catch (error) {
    console.error('Failed to get doc navigation:', error);
    return NextResponse.json({ error: 'Failed to get doc navigation' }, { status: 500 });
  }
}
