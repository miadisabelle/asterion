import { NextResponse } from 'next/server';
import { getDocPageWithSections, updateDocPage, deleteDocPage, getDocPageBySlug } from '@/lib/docs/data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await getDocPageWithSections(slug);
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to get doc page:', error);
    return NextResponse.json({ error: 'Failed to get doc page' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await request.json();
    
    // Get page by slug first to get ID
    const existing = await getDocPageBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const page = await updateDocPage(existing.id, data);
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to update doc page:', error);
    return NextResponse.json({ error: 'Failed to update doc page' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const existing = await getDocPageBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await deleteDocPage(existing.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete doc page:', error);
    return NextResponse.json({ error: 'Failed to delete doc page' }, { status: 500 });
  }
}
