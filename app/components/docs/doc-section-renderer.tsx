'use client';

import { useAudienceMode } from '@/lib/docs/hooks';
import type { DocSection, AudienceMode } from '@/lib/docs/types';
import { MermaidDiagram } from './mermaid-diagram';
import { DocCallout } from './doc-callout';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface DocSectionRendererProps {
  section: DocSection;
  isAdmin?: boolean;
  onEdit?: () => void;
}

export function DocSectionRenderer({ section, isAdmin, onEdit }: DocSectionRendererProps) {
  const [audienceMode] = useAudienceMode();
  
  // Select content based on audience mode
  const title = getAudienceContent(section.title, section.title_explorer, audienceMode);
  const content = getAudienceContent(section.content, section.content_explorer, audienceMode);

  return (
    <section className="group relative">
      {isAdmin && (
        <button
          onClick={onEdit}
          className="absolute -left-12 top-0 hidden h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:flex group-hover:opacity-100"
        >
          Edit
        </button>
      )}
      
      {title && (
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      )}

      {section.section_type === 'text' && (
        <TextSection content={content} />
      )}

      {section.section_type === 'diagram' && (
        <DiagramSection 
          code={section.diagram_code || ''} 
          diagramType={section.diagram_type || undefined}
        />
      )}

      {section.section_type === 'callout' && (
        <DocCallout type={section.callout_type || 'info'}>
          <TextSection content={content} />
        </DocCallout>
      )}

      {section.section_type === 'code' && (
        <CodeSection content={content} />
      )}

      {section.section_type === 'interactive' && (
        <InteractiveSection section={section} />
      )}
    </section>
  );
}

function getAudienceContent(
  technical: string, 
  explorer: string | null, 
  mode: AudienceMode
): string {
  if (mode === 'explorer' && explorer) {
    return explorer;
  }
  return technical;
}

interface TextSectionProps {
  content: string;
}

function TextSection({ content }: TextSectionProps) {
  // Simple markdown-like rendering
  const lines = content.split('\n');
  
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {lines.map((line, i) => {
        // Headings
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold mt-8 mb-3">{line.slice(3)}</h2>;
        }
        // Bullet points
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc text-muted-foreground">
              {line.slice(2)}
            </li>
          );
        }
        // Empty lines
        if (!line.trim()) {
          return <br key={i} />;
        }
        // Regular paragraphs
        return <p key={i} className="text-muted-foreground mb-2">{line}</p>;
      })}
    </div>
  );
}

interface DiagramSectionProps {
  code: string;
  diagramType?: string;
}

function DiagramSection({ code, diagramType }: DiagramSectionProps) {
  return (
    <div className="my-6 rounded-lg border bg-card p-4">
      <MermaidDiagram 
        code={code} 
        diagramType={diagramType as DocSection['diagram_type']} 
      />
    </div>
  );
}

interface CodeSectionProps {
  content: string;
}

function CodeSection({ content }: CodeSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/code relative my-4 rounded-lg border bg-muted/50">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover/code:opacity-100"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto p-4">
        <code className="text-sm">{content}</code>
      </pre>
    </div>
  );
}

interface InteractiveSectionProps {
  section: DocSection;
}

function InteractiveSection({ section }: InteractiveSectionProps) {
  // Placeholder for custom interactive components
  // Can be extended based on metadata
  return (
    <div className="my-6 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Interactive component: {section.metadata?.component as string || 'unknown'}
      </p>
    </div>
  );
}
