import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, Settings2, Receipt, Wallet, TrendingUp, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/spending", icon: Receipt, label: "Spend" },
  { href: "/accounts", icon: Wallet, label: "Accounts" },
  { href: "/banking", icon: Landmark, label: "Banking" },
  { href: "/invest", icon: TrendingUp, label: "Invest" },
  { href: "/business", icon: Briefcase, label: "Biz" },
  { href: "/settings", icon: Settings2, label: "Settings" },
];

function NavItem({ href, icon: Icon, label, active, compact = false }: { href: string; icon: any; label: string; active: boolean; compact?: boolean }) {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl transition-all duration-200 cursor-pointer",
          compact ? "justify-center px-3 py-2" : "flex-col justify-center px-3 py-2",
          active
            ? "text-primary bg-primary/10 shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
        )}
      >
        <Icon className={cn(compact ? "w-5 h-5" : "w-6 h-6", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
        <span className={cn("font-bold uppercase tracking-wider", compact ? "text-xs" : "text-[10px]")}>{label}</span>
      </div>
    </Link>
  );
}

export function DesktopNavRail() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background/95 backdrop-blur-md">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md" />
            <div className="relative w-full h-full rounded-lg bg-black border border-yellow-600/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A53E" strokeWidth="2" className="w-6 h-6">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold">Nexa Finance</p>
            <p className="text-sm font-semibold text-foreground">Desktop Navigation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
            compact
          />
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe md:hidden">
      <div className="flex h-16 items-center justify-around px-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <div key={item.href} className="flex-shrink-0">
            <NavItem
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={location === item.href}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
