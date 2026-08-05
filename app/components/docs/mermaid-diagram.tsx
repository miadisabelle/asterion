'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { DiagramType } from '@/lib/docs/types';

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#475569',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0a0a0b',
    mainBkg: '#1e293b',
    nodeBorder: '#475569',
    clusterBkg: '#1e293b',
    clusterBorder: '#475569',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
});

interface MermaidDiagramProps {
  code: string;
  diagramType?: DiagramType;
  className?: string;
}

export function MermaidDiagram({ code, diagramType, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const renderDiagram = useCallback(async () => {
    if (!code || !containerRef.current) return;

    try {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, code);
      setSvg(svg);
      setError(null);
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
    }
  }, [code]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        <p className="font-medium">Diagram Error</p>
        <pre className="mt-2 overflow-auto text-xs">{error}</pre>
        <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{code}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      data-diagram-type={diagramType}
    >
      {svg ? (
        <div 
          className="flex justify-center overflow-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}

// Preset diagram generators for common Asterion patterns
export const DIAGRAM_PRESETS = {
  layer_map: `
flowchart TB
  subgraph Operator["Operator Layer"]
    UI[Dashboard]
    API[API Surface]
  end
  subgraph Security["Security Layer"]
    Auth[Access Control]
    Audit[Audit Log]
  end
  subgraph Docs["Documentation Layer"]
    Specs[Specifications]
    Narratives[Narratives]
  end
  subgraph PDE["PDE Layer (Prompt Decomposition)"]
    Decomposition[Prompt Decomposition]
    Intents[Intents & Directions]
    Actions[Action Stacks]
  end
  subgraph Governance["Governance Layer"]
    Policies[Policies]
    Reviews[Reviews]
  end
  subgraph Memory["Memory Layer"]
    KG[Knowledge Graph]
    State[Persistent State]
  end
  subgraph Runtime["Runtime Layer"]
    Engine[Execution Engine]
    Agents[Agent Coordination]
  end
  
  Operator --> Security
  Security --> Docs
  Docs --> PDE
  PDE --> Governance
  Governance --> Memory
  Memory --> Runtime
`,

  tension_chart: `
flowchart LR
  subgraph Current["Current Reality"]
    C1[Where we are]
    C2[Constraints]
    C3[Resources]
  end
  
  subgraph Tension["Structural Tension"]
    T[Gap]
  end
  
  subgraph Desired["Desired Outcome"]
    D1[Where we want to be]
    D2[Success criteria]
    D3[Measurable result]
  end
  
  Current -->|creates| Tension
  Desired -->|creates| Tension
  Tension -->|resolves toward| Desired
`,

  telescope_tree: `
flowchart TD
  R[Root Tension]
  R --> A1[Action Step 1]
  R --> A2[Action Step 2]
  R --> A3[Action Step 3]
  
  A2 -->|telescopes| T1[Sub-Tension]
  T1 --> S1[Sub-Step 1]
  T1 --> S2[Sub-Step 2]
  
  S1 -->|telescopes| T2[Deep Tension]
  T2 --> D1[Deep Step 1]
  T2 --> D2[Deep Step 2]
  
  style R fill:#3b82f6
  style T1 fill:#8b5cf6
  style T2 fill:#ec4899
`,

  runtime_loop: `
flowchart TD
  A[Acknowledge] -->|what happened?| B[Analyze]
  B -->|why did it happen?| C[Update Chart]
  C -->|what needs to change?| D[Recommit or Redirect]
  D -->|execute| E[Action]
  E -->|observe results| A
  
  style A fill:#3b82f6
  style B fill:#8b5cf6
  style C fill:#ec4899
  style D fill:#f59e0b
`,

  github_sync: `
sequenceDiagram
  participant GH as GitHub
  participant WH as Webhook
  participant AST as Asterion
  participant DB as Database
  
  GH->>WH: Issue Created/Updated
  WH->>AST: Parse Event
  AST->>DB: Upsert Tension
  AST->>DB: Log Event
  AST-->>GH: Sync Status
`,
};
