import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { LogoVektor } from "@/components/branding/LogoVektor";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { useRecurringGenerator } from "@/hooks/useRecurringGenerator";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  useRecurringGenerator(user?.id);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        {/* Sidebar hidden on mobile — bottom nav takes over */}
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header: show sidebar trigger only on desktop */}
          <header className="h-14 flex items-center border-b border-border px-3 sm:px-4 sticky top-[env(safe-area-inset-top)] z-50 bg-background">
            {!isMobile && <SidebarTrigger className="mr-3 sm:mr-4" />}
            <LogoVektor size="sm" textClassName="text-muted-foreground" />
          </header>
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 pb-24 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      {isMobile && <MobileBottomNav />}
    </SidebarProvider>
  );
}
