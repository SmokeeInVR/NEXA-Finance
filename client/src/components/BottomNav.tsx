import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, Settings2, Receipt, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Home" },
    { href: "/spending", icon: Receipt, label: "Spend" },
    { href: "/accounts", icon: Wallet, label: "Accounts" },
    { href: "/invest", icon: TrendingUp, label: "Invest" },
    { href: "/business", icon: Briefcase, label: "Biz" },
    { href: "/settings", icon: Settings2, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-shrink-0">
              <div
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive
                    ? "text-primary bg-primary/5 -translate-y-1"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                )}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 mb-1 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
