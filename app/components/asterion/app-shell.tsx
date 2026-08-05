'use client'

import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Target,
  FolderKanban,
  Layers,
  Network,
  Activity,
  BookOpen,
  Rss,
  Settings,
  Menu,
  X,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Feed', href: '/feed', icon: Rss },
  { name: 'Tensions', href: '/tensions', icon: Target },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Layers', href: '/layers', icon: Layers },
  { name: 'Graph', href: '/graph', icon: Network },
  { name: 'Events', href: '/events', icon: Activity },
  { name: 'Threads', href: '/threads', icon: BookOpen },
  { name: 'Docs', href: '/docs', icon: BookOpen },
]

// Context for managing sidebar state
const SidebarContext = createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

interface AppShellProps {
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode
}

export function AppShell({ children, title, actions }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const pathname = usePathname()

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-sidebar">
            <SidebarContent pathname={pathname} onNavigate={() => {}} />
          </aside>
        )}

        {/* Mobile Sidebar Drawer */}
        {isMobile && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent 
                pathname={pathname} 
                onNavigate={() => setIsOpen(false)} 
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content Area */}
        <main className={cn(
          'flex-1 flex flex-col min-h-screen',
          !isMobile && 'pl-64'
        )}>
          {/* Top Header Bar */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-14 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 -ml-2"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                {title && (
                  <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

interface SidebarContentProps {
  pathname: string
  onNavigate: () => void
}

function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">Asterion</h1>
          <p className="text-xs text-muted-foreground">Runtime Substrate</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    'min-h-[44px]', // iOS touch target
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground active:bg-sidebar-accent/70'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
            'min-h-[44px]',
            'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground active:bg-sidebar-accent/70'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  )
}
