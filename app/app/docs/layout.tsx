'use client';

import { useState } from 'react';
import { DocSidebar } from '@/components/docs/doc-sidebar';
import { AudienceToggle } from '@/components/docs/audience-toggle';
import { DocSearch } from '@/components/docs/doc-search';
import { useIsMobile } from '@/components/ui/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import Link from 'next/link';
import { BookOpen, Home, Menu } from 'lucide-react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 -ml-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
          </Link>
          
          <Link href="/docs" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Asterion Docs</span>
            <span className="sm:hidden">Docs</span>
          </Link>
          
          <div className="flex-1 max-w-md mx-2 md:mx-4">
            <DocSearch />
          </div>
          
          <div className="ml-auto">
            <AudienceToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 border-r bg-muted/30 flex-shrink-0">
            <DocSidebar className="sticky top-14 h-[calc(100vh-3.5rem)]" />
          </aside>
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Documentation Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex h-14 items-center gap-2 border-b px-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Documentation</span>
              </div>
              <DocSidebar 
                className="h-[calc(100vh-3.5rem)]" 
                onNavigate={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
