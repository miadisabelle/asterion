import { NextResponse } from 'next/server';
import { getDocPages, createDocPage } from '@/lib/docs/data';
import type { DocOrigin, DocType, DocStatus } from '@/lib/docs/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin') as DocOrigin | null;
    const doc_type = searchParams.get('doc_type') as DocType | null;
    const status = searchParams.get('status') as DocStatus | null;

    const pages = await getDocPages({
      origin: origin || undefined,
      doc_type: doc_type || undefined,
      status: status || undefined,
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Failed to get doc pages:', error);
    return NextResponse.json({ error: 'Failed to get doc pages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.slug || !data.title || !data.origin) {
      return NextResponse.json(
        { error: 'slug, title, and origin are required' },
        { status: 400 }
      );
    }

    const page = await createDocPage(data);
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to create doc page:', error);
    return NextResponse.json({ error: 'Failed to create doc page' }, { status: 500 });
  }
}
