// POST /api/tensions/[id]/action-steps - Create action step
// GET /api/tensions/[id]/action-steps - List action steps

import { NextRequest, NextResponse } from 'next/server'
import { 
  getActionSteps,
  createActionStep,
  getTensionById,
  logEvent,
  type CreateActionStepInput
} from '@/lib/asterion'
import { openSubIssue } from '@/lib/asterion/github-sub-issue'
import { isWriter } from '@/lib/asterion/writer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const actionSteps = await getActionSteps(id)
    
    return NextResponse.json({ action_steps: actionSteps })
  } catch (error) {
    console.error('Error fetching action steps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch action steps' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as Omit<CreateActionStepInput, 'tension_id'> & { sub_issue?: boolean }
    const { sub_issue: wantsSubIssue = true, ...input } = body

    // A chart that records a GitHub issue gets its new step as a sub-issue of that
    // issue, when this instance holds a GitHub token (see github-sub-issue.ts) and
    // the request is a writer's (see writer.ts). Anyone else adds the step here only.
    const tension = wantsSubIssue ? await getTensionById(id) : null
    const linked = Boolean(tension?.github_owner && tension?.github_repo && tension?.github_issue_number)
    const outcome = linked && !isWriter(request)
      ? { kind: 'not-writer' as const }
      : tension
      ? await openSubIssue(
          { owner: tension.github_owner, repo: tension.github_repo, number: tension.github_issue_number },
          { title: input.title, description: input.description },
          { tensionTitle: tension.title, siteUrl: `${request.nextUrl.origin}/tensions/${id}` }
        )
      : { kind: 'not-linked' as const }
    const link = outcome.kind === 'created' ? outcome.link : outcome.kind === 'failed' ? outcome.link : undefined

    const actionStep = await createActionStep({
      ...input,
      tension_id: id,
      metadata: {
        ...(input.metadata || {}),
        ...(link ? { github: { subIssue: link } } : {}),
      },
    })
    
    await logEvent({
      event_type: 'action_step.created',
      tension_id: id,
      payload: { title: actionStep.title, ...(link ? { sub_issue: `${link.owner}/${link.repo}#${link.number}` } : {}) },
    })

    return NextResponse.json({
      action_step: actionStep,
      sub_issue: outcome.kind === 'created' ? outcome.link : null,
      // Said, never hidden: the step exists on the site either way.
      ...(outcome.kind === 'failed' ? { github_error: outcome.error } : {}),
      ...(outcome.kind === 'no-token' ? { github_note: 'This instance does not write to GitHub; the step stays on the site.' } : {}),
      ...(outcome.kind === 'not-writer' ? { github_note: 'Only a signed-in writer opens steps on GitHub (/signin); the step stays on the site.' } : {}),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating action step:', error)
    return NextResponse.json(
      { error: 'Failed to create action step' },
      { status: 500 }
    )
  }
}
