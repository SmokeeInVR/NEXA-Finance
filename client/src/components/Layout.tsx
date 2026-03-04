import { BottomNav } from "./BottomNav";
import logoIcon from "@assets/N_Single_1769890208909.JPG";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

function NexaLogo() {
  return (
    <div className="relative w-10 h-10">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md" />
      {/* Logo image */}
      <img 
        src={logoIcon} 
        alt="Nexa Finance" 
        className="relative w-full h-full rounded-lg object-cover"
        data-testid="img-logo"
      />
    </div>
  );
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background font-body pb-24 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <NexaLogo />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Nexa Finance</p>
            <h1 className="text-lg font-display font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto w-full animate-in fade-in duration-500 slide-in-from-bottom-2">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
