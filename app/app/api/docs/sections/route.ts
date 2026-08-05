import { NextResponse } from 'next/server';
import { createDocSection } from '@/lib/docs/data';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.page_id || !data.title || !data.content) {
      return NextResponse.json(
        { error: 'page_id, title, and content are required' },
        { status: 400 }
      );
    }

    const section = await createDocSection(data);
    return NextResponse.json(section);
  } catch (error) {
    console.error('Failed to create doc section:', error);
    return NextResponse.json({ error: 'Failed to create doc section' }, { status: 500 });
  }
}
