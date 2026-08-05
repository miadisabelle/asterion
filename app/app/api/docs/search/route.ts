import { NextResponse } from 'next/server';
import { searchDocs } from '@/lib/docs/data';
import type { DocOrigin, DocType, DocStatus } from '@/lib/docs/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const origin = searchParams.get('origin') as DocOrigin | null;
    const doc_type = searchParams.get('doc_type') as DocType | null;
    const status = searchParams.get('status') as DocStatus | null;

    if (!query) {
      return NextResponse.json([]);
    }

    const results = await searchDocs(query, {
      origin: origin || undefined,
      doc_type: doc_type || undefined,
      status: status || undefined,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to search docs:', error);
    return NextResponse.json({ error: 'Failed to search docs' }, { status: 500 });
  }
}
