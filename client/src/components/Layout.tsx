import { DesktopNavRail, BottomNav } from "./BottomNav";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

function NexaLogo() {
  return (
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md" />
      <div className="relative w-full h-full rounded-lg bg-black border border-yellow-600/50 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A53E" strokeWidth="2" className="w-6 h-6">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
    </div>
  );
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <DesktopNavRail />

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 safe-top md:px-8">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <NexaLogo />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Nexa Finance</p>
              <h1 className="text-lg font-display font-bold tracking-tight text-foreground">
                {title}
              </h1>
            </div>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:px-8 lg:px-10 md:pb-8 animate-in fade-in duration-500 slide-in-from-bottom-2">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
