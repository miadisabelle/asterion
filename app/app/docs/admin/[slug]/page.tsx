'use client';

import { use, useState } from 'react';
import { useDocPage, updateDocSection, createDocSection, deleteDocSection } from '@/lib/docs/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MermaidDiagram, DIAGRAM_PRESETS } from '@/components/docs/mermaid-diagram';
import { DocCallout } from '@/components/docs/doc-callout';
import { 
  DOC_STATUSES, 
  DIAGRAM_TYPES, 
  CALLOUT_TYPES,
  type DocSection,
  type SectionType,
  type DiagramType,
  type CalloutType,
  type DocStatus
} from '@/lib/docs/types';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Save, 
  Trash2, 
  Eye, 
  Code, 
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  History
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default function DocAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: page, isLoading, error, mutate } = useDocPage(slug);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    notFound();
  }

  const handleAddSection = async () => {
    try {
      await createDocSection({
        page_id: page.id,
        title: 'New Section',
        content: 'Add content here...',
        section_type: 'text',
        sort_order: (page.sections?.length || 0) * 10
      });
      mutate();
    } catch (err) {
      console.error('Failed to add section:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link
            href={`/docs/${slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to page
          </Link>
          
          <div className="flex-1">
            <h1 className="font-semibold">Editing: {page.title}</h1>
          </div>

          <Button
            variant={previewMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto">
        {/* Page metadata */}
        <div className="mb-8 rounded-lg border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className={cn('text-sm mt-1 px-2 py-0.5 rounded inline-block', DOC_STATUSES[page.status].color)}>
                {DOC_STATUSES[page.status].label}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Origin</Label>
              <p className="text-sm mt-1">{page.origin}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm mt-1">{page.doc_type}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {page.sections?.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              isExpanded={editingSection === section.id}
              onToggle={() => setEditingSection(
                editingSection === section.id ? null : section.id
              )}
              onSave={async (data) => {
                await updateDocSection(section.id, data, 'Admin edit');
                mutate();
              }}
              onDelete={async () => {
                await deleteDocSection(section.id);
                mutate();
              }}
              previewMode={previewMode}
              canMoveUp={index > 0}
              canMoveDown={index < (page.sections?.length || 0) - 1}
            />
          ))}

          {(!page.sections || page.sections.length === 0) && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No sections yet. Add your first section to get started.
              </p>
            </div>
          )}
        </div>

        {/* Add section button */}
        <div className="mt-6">
          <Button onClick={handleAddSection} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SectionEditorProps {
  section: DocSection;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (data: Partial<DocSection>) => Promise<void>;
  onDelete: () => Promise<void>;
  previewMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function SectionEditor({
  section,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
  previewMode,
  canMoveUp,
  canMoveDown
}: SectionEditorProps) {
  const [title, setTitle] = useState(section.title);
  const [titleExplorer, setTitleExplorer] = useState(section.title_explorer || '');
  const [content, setContent] = useState(section.content);
  const [contentExplorer, setContentExplorer] = useState(section.content_explorer || '');
  const [sectionType, setSectionType] = useState<SectionType>(section.section_type as SectionType);
  const [diagramType, setDiagramType] = useState<DiagramType | ''>(section.diagram_type || '');
  const [diagramCode, setDiagramCode] = useState(section.diagram_code || '');
  const [calloutType, setCalloutType] = useState<CalloutType | ''>(section.callout_type || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        title_explorer: titleExplorer || null,
        content,
        content_explorer: contentExplorer || null,
        section_type: sectionType,
        diagram_type: diagramType || null,
        diagram_code: diagramCode || null,
        callout_type: calloutType || null
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertPreset = (preset: keyof typeof DIAGRAM_PRESETS) => {
    setDiagramCode(DIAGRAM_PRESETS[preset].trim());
    setDiagramType(preset as DiagramType);
  };

  if (previewMode) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {sectionType === 'diagram' && diagramCode && (
          <MermaidDiagram code={diagramCode} diagramType={diagramType || undefined} />
        )}
        {sectionType === 'callout' && (
          <DocCallout type={(calloutType as CalloutType) || 'info'}>
            {content}
          </DocCallout>
        )}
        {sectionType === 'text' && (
          <p className="text-muted-foreground">{content}</p>
        )}
        {sectionType === 'code' && (
          <pre className="rounded bg-muted p-4 text-sm overflow-x-auto">
            <code>{content}</code>
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Section header */}
      <div 
        className="flex items-center gap-2 p-4 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 font-medium">{title || 'Untitled Section'}</span>
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
          {sectionType}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* Section type selector */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Section Type</Label>
              <Select value={sectionType} onValueChange={(v) => setSectionType(v as SectionType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="diagram">Diagram</SelectItem>
                  <SelectItem value="callout">Callout</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="interactive">Interactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sectionType === 'diagram' && (
              <div>
                <Label>Diagram Type</Label>
                <Select value={diagramType} onValueChange={(v) => setDiagramType(v as DiagramType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIAGRAM_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sectionType === 'callout' && (
              <div>
                <Label>Callout Type</Label>
                <Select value={calloutType} onValueChange={(v) => setCalloutType(v as CalloutType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CALLOUT_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Title editors - dual pane */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Title (Technical)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Title (Explorer)</Label>
              <Input
                value={titleExplorer}
                onChange={(e) => setTitleExplorer(e.target.value)}
                placeholder="Optional alternative for Explorer mode"
                className="mt-1"
              />
            </div>
          </div>

          {/* Content editors - dual pane */}
          {sectionType === 'diagram' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Diagram Code (Mermaid)</Label>
                <div className="flex-1" />
                <span className="text-xs text-muted-foreground">Presets:</span>
                {Object.keys(DIAGRAM_PRESETS).slice(0, 4).map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertPreset(preset as keyof typeof DIAGRAM_PRESETS)}
                  >
                    {preset.replace('_', ' ')}
                  </Button>
                ))}
              </div>
              <Textarea
                value={diagramCode}
                onChange={(e) => setDiagramCode(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="flowchart TD\n  A --> B"
              />
              {diagramCode && (
                <div className="rounded-lg border p-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                  <MermaidDiagram code={diagramCode} diagramType={diagramType || undefined} />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Content (Technical)</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[200px]"
                />
              </div>
              <div>
                <Label>Content (Explorer)</Label>
                <Textarea
                  value={contentExplorer}
                  onChange={(e) => setContentExplorer(e.target.value)}
                  placeholder="Optional alternative for Explorer mode"
                  className="mt-1 min-h-[200px]"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Section'}
            </Button>
            <Link href={`/docs/admin/${section.page_id}/sections/${section.id}/history`}>
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <div className="flex-1" />
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
