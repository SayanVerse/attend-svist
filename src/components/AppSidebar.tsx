import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  FileDown, 
  ClipboardList,
  CalendarDays
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
  { title: "Today's Attendance", icon: ClipboardList, path: "/attendance" },
  { title: "Date-wise Attendance", icon: CalendarDays, path: "/datewise-attendance" },
  { title: "Students", icon: Users, path: "/students" },
  { title: "Holidays", icon: Calendar, path: "/holidays" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
  { title: "Export", icon: FileDown, path: "/export" },
];

export function AppSidebar() {
  const location = useLocation();
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-12 transition-all",
                        isActive && "bg-primary/10 text-primary font-semibold border-l-4 border-primary"
                      )}
                    >
                      <Link to={item.path} className="flex items-center gap-3 px-3">
                        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        <span className={cn(
                          "transition-opacity duration-200",
                          !open && "opacity-0 w-0"
                        )}>
                          {item.title}
                        </span>
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
