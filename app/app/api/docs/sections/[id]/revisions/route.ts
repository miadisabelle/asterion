import { NextResponse } from 'next/server';
import { getDocRevisions } from '@/lib/docs/data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const revisions = await getDocRevisions(id);
    return NextResponse.json(revisions);
  } catch (error) {
    console.error('Failed to get doc revisions:', error);
    return NextResponse.json({ error: 'Failed to get doc revisions' }, { status: 500 });
  }
}
