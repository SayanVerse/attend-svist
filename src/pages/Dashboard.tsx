import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckCircle, XCircle, Bell, BellOff, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ScrollReveal";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend
} from "recharts";

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

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const holidayDates = new Set(holidays?.map(h => h.date) || []);
      
      const allDays = eachDayOfInterval({
        start: new Date(monthStart),
        end: new Date(monthEnd)
      });

      const workingDays = allDays.filter(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        return !isWeekend(day) && !holidayDates.has(dateStr) && new Date(dateStr) <= new Date();
      });

      const attendanceByDate = data?.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { present: 0, absent: 0 };
        if (curr.status === "present") acc[curr.date].present++;
        if (curr.status === "absent") acc[curr.date].absent++;
        return acc;
      }, {} as Record<string, { present: number; absent: number }>) || {};

      const chartData = workingDays.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const stats = attendanceByDate[dateStr] || { present: 0, absent: 0 };
        return {
          date: format(day, "MMM dd"),
          present: stats.present,
          absent: stats.absent,
        };
      });

      const uniqueDates = new Set(data?.map(a => a.date) || []);
      const presentDays = data?.filter(a => a.status === "present").length || 0;
      const absentDays = data?.filter(a => a.status === "absent").length || 0;

      return {
        totalDays: workingDays.length,
        presentDays,
        absentDays,
        holidays: holidays?.length || 0,
        chartData,
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      <ScrollReveal>
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
      </ScrollReveal>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <ScrollReveal key={stat.title} delay={index * 0.1}>
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
            </ScrollReveal>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScrollReveal delay={0.2} direction="left">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attendance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  present: {
                    label: "Present",
                    color: "hsl(var(--success))",
                  },
                  absent: {
                    label: "Absent",
                    color: "hsl(var(--destructive))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="present" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--success))" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="absent" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--destructive))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.3} direction="right">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: {
                    label: "Days",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Working Days", value: monthlyStats?.totalDays || 0, fill: "hsl(var(--primary))" },
                      { name: "Present", value: monthlyStats?.presentDays || 0, fill: "hsl(var(--success))" },
                      { name: "Absent", value: monthlyStats?.absentDays || 0, fill: "hsl(var(--destructive))" },
                      { name: "Holidays", value: monthlyStats?.holidays || 0, fill: "hsl(var(--accent))" },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </motion.div>
  );
}
