import { NextResponse } from 'next/server';
import { updateDocSection, deleteDocSection, getDocRevisions } from '@/lib/docs/data';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { edit_summary, ...updateData } = data;

    const section = await updateDocSection(id, updateData, edit_summary);
    return NextResponse.json(section);
  } catch (error) {
    console.error('Failed to update doc section:', error);
    return NextResponse.json({ error: 'Failed to update doc section' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteDocSection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete doc section:', error);
    return NextResponse.json({ error: 'Failed to delete doc section' }, { status: 500 });
  }
}
