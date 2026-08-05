'use client';

import Link from 'next/link';
import { useDocNavigation, useAudienceMode } from '@/lib/docs/hooks';
import { DOC_ORIGINS } from '@/lib/docs/types';
import { 
  GraduationCap, 
  Code, 
  BookOpen, 
  Settings, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const ORIGIN_ICONS = {
  academic: GraduationCap,
  technical: Code,
  narrative: BookOpen,
  operational: Settings,
};

export default function DocsHomePage() {
  const { data: navigation, isLoading } = useDocNavigation();
  const [audienceMode] = useAudienceMode();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-10 w-64 rounded bg-muted" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const origins = ['academic', 'technical', 'narrative', 'operational'] as const;

  return (
    <div className="p-8 max-w-5xl">
      {/* Hero */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">
          {audienceMode === 'explorer' ? (
            <>
              Welcome to Asterion
              <Sparkles className="inline-block ml-3 h-8 w-8 text-pink-400" />
            </>
          ) : (
            'Asterion Documentation'
          )}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {audienceMode === 'explorer' ? (
            "Asterion is like a super-smart system that helps people build software together. Think of it as a magical notebook that remembers everything, helps you plan big projects, and makes sure nothing gets lost!"
          ) : (
            "Asterion is a recursive execution operating substrate for managing structural tensions, cross-repository orchestration, and persistent runtime memory across distributed software development."
          )}
        </p>
      </div>

      {/* Origin Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {origins.map((origin) => {
          const config = DOC_ORIGINS[origin];
          const Icon = ORIGIN_ICONS[origin];
          const pages = navigation?.[origin] || [];

          return (
            <div
              key={origin}
              className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{config.label}</h2>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>

              {pages.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {pages.slice(0, 3).map((page) => {
                    const title = audienceMode === 'explorer' && page.title_explorer
                      ? page.title_explorer
                      : page.title;
                    return (
                      <li key={page.id}>
                        <Link
                          href={`/docs/${page.slug}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {title}
                        </Link>
                      </li>
                    );
                  })}
                  {pages.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      +{pages.length - 3} more
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground/70">
                  No documentation yet
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Start */}
      <div className="mt-12 rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-xl font-semibold mb-2">
          {audienceMode === 'explorer' ? "Ready to Explore?" : "Getting Started"}
        </h2>
        <p className="text-muted-foreground mb-4">
          {audienceMode === 'explorer' ? (
            "Start with 'What is Asterion?' to understand the basics, then explore the diagrams to see how everything connects!"
          ) : (
            "Start with the core concepts in Academic origins, then move to Technical for implementation details. Operational docs cover day-to-day usage patterns."
          )}
        </p>
        <Link
          href="/docs/what-is-asterion"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Start Reading
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
