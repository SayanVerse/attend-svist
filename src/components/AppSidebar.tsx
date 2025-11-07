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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Daily Attendance", icon: ClipboardList, path: "/attendance" },
  { title: "Students", icon: Users, path: "/students" },
  { title: "Holidays", icon: Calendar, path: "/holidays" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
  { title: "Export", icon: FileDown, path: "/export" },
];

export function AppSidebar() {
  const location = useLocation();
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r border-border/40 backdrop-blur-xl bg-white/70 dark:bg-card/70">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 rounded-full px-4 py-3 transition-all hover:scale-105 active:scale-95",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg font-semibold"
                            : "hover:bg-accent/50 hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {open && <span className="font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
