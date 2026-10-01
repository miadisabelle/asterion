/**
 * A step added on the site to a chart that records a GitHub issue opens a
 * sub-issue of that issue, through @miadi/github-actions.
 *
 * Only an instance holding MIADI_GH_TOKEN does this: the gaia instance, which
 * is reachable on the tailnet only. The public deployments have no token and
 * no sign-in, so a step added there stays on the site.
 *
 * The sub-issue then comes back as structure: Miadi's webhook writes its chart
 * into the repository's issue charts through coaia-narrative, telescoped under
 * the parent's, and the next projection adopts this step as the step that
 * telescopes to it (coaia-projection.mjs).
 */

import { createGithubActions, GithubActionError } from '@miadi/github-actions'

export interface SubIssueLink {
  owner: string
  repo: string
  number: number
  id: number
  url: string
  attached: boolean
}

export type SubIssueOutcome =
  | { kind: 'not-linked' }
  | { kind: 'no-token' }
  | { kind: 'created'; link: SubIssueLink }
  | { kind: 'failed'; error: string; link?: SubIssueLink }

export function subIssuesEnabled(): boolean {
  return Boolean(process.env.MIADI_GH_TOKEN)
}

export async function openSubIssue(
  parent: { owner: string | null; repo: string | null; number: number | null },
  step: { title: string; description?: string | null },
  context: { tensionTitle: string; siteUrl?: string | null }
): Promise<SubIssueOutcome> {
  if (!parent.owner || !parent.repo || !parent.number) return { kind: 'not-linked' }
  const token = process.env.MIADI_GH_TOKEN
  if (!token) return { kind: 'no-token' }

  const body = [
    step.description?.trim() || null,
    `A step of ${parent.owner}/${parent.repo}#${parent.number} (${context.tensionTitle}), added in Asterion${context.siteUrl ? `: ${context.siteUrl}` : '.'}`,
  ].filter(Boolean).join('\n\n')

  try {
    const gh = createGithubActions({ token, userAgent: 'asterion' })
    const { subIssue } = await gh.createSubIssue(
      { owner: parent.owner, repo: parent.repo, number: parent.number },
      { title: step.title, body }
    )
    return {
      kind: 'created',
      link: { owner: parent.owner, repo: parent.repo, number: subIssue.number, id: subIssue.id, url: subIssue.html_url, attached: true },
    }
  } catch (err) {
    if (err instanceof GithubActionError) {
      const made = err.createdIssue
      return {
        kind: 'failed',
        error: err.message,
        link: made
          ? { owner: parent.owner, repo: parent.repo, number: made.number, id: made.id, url: made.html_url, attached: false }
          : undefined,
      }
    }
    return { kind: 'failed', error: 'GitHub could not be reached' }
  }
}
