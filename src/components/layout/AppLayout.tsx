import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 sm:h-14 flex items-center border-b border-border px-3 sm:px-4">
            <SidebarTrigger className="mr-3 sm:mr-4" />
            <span className="text-sm text-muted-foreground font-medium">FluxoPro</span>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
