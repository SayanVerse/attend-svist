import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckCircle, XCircle, Bell, BellOff } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { requestNotificationPermission } = useNotifications();
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationEnabled(Notification.permission === "granted");
    }
  }, []);
  
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: studentsCount } = useQuery({
    queryKey: ["students-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("status")
        .eq("date", today);
      
      const present = data?.filter(a => a.status === "present").length || 0;
      const absent = data?.filter(a => a.status === "absent").length || 0;
      
      return { present, absent, total: present + absent };
    },
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-stats", monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("date, status")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const uniqueDates = new Set(data?.map(a => a.date) || []);
      const presentDays = data?.filter(a => a.status === "present").length || 0;
      const absentDays = data?.filter(a => a.status === "absent").length || 0;

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      return {
        totalDays: uniqueDates.size,
        presentDays,
        absentDays,
        holidays: holidays?.length || 0,
      };
    },
  });

  const stats = [
    {
      title: "Total Students",
      value: studentsCount || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Present Today",
      value: todayAttendance?.present || 0,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Absent Today",
      value: todayAttendance?.absent || 0,
      icon: XCircle,
      color: "text-destructive",
    },
    {
      title: "Holidays This Month",
      value: monthlyStats?.holidays || 0,
      icon: Calendar,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your attendance system
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={notificationEnabled ? "secondary" : "default"}
            onClick={() => {
              requestNotificationPermission();
              setTimeout(() => {
                if ("Notification" in window) {
                  setNotificationEnabled(Notification.permission === "granted");
                }
              }, 500);
            }}
            className="gap-2"
          >
            {notificationEnabled ? (
              <>
                <Bell className="h-4 w-4" />
                Notifications On
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                Enable Notifications
              </>
            )}
          </Button>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card transition-all hover:shadow-lg btn-animated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Teaching Days</span>
                <span className="text-2xl font-bold">{monthlyStats?.totalDays || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-success">Present Records</span>
                <span className="text-2xl font-bold text-success">{monthlyStats?.presentDays || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-destructive">Absent Records</span>
                <span className="text-2xl font-bold text-destructive">{monthlyStats?.absentDays || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-accent">Holidays</span>
                <span className="text-2xl font-bold text-accent">{monthlyStats?.holidays || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
