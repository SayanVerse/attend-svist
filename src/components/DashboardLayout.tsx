import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  FileDown, 
  ClipboardList 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { Footer } from "./Footer";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Daily Attendance", icon: ClipboardList, path: "/attendance" },
  { title: "Students", icon: Users, path: "/students" },
  { title: "Holidays", icon: Calendar, path: "/holidays" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
  { title: "Export", icon: FileDown, path: "/export" },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 w-full border-b backdrop-blur-2xl bg-white/60 dark:bg-card/60 border-white/30 shadow-lg"
      >
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
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
          <ThemeToggle />
        </div>
      </motion.header>

      <div className="container px-4 py-6">
        {/* Mobile Navigation */}
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-2 md:hidden scrollbar-hide">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap btn-animated",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "glass-card hover:shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Desktop Navigation */}
        <nav className="mb-8 hidden md:flex md:gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all btn-animated",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "glass-card hover:shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Main Content */}
        <main>{children}</main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
