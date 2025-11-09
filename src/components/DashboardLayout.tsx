import { useLocation } from "react-router-dom";
import { ClipboardList, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 w-full flex">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 w-full border-b backdrop-blur-3xl bg-white/40 dark:bg-card/40 border-white/30 shadow-lg"
          >
            <div className="container flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                >
                  <ClipboardList className="h-5 w-5 text-primary-foreground" />
                </motion.div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  AttendPro
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => signOut()}
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.header>

          <div className="container px-4 py-6 flex-1">
            <main>{children}</main>
            <Footer />
          </div>
        </div>
        
        <ScrollToTop />
      </div>
    </SidebarProvider>
  );
}
