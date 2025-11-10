import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { BarChart3, CalendarIcon, X, ArrowUpDown, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<"total" | "datewise">("total");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "roll">("name");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const monthStartStr = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEndStr = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
  const currentDate = format(selectedDate, "yyyy-MM-dd");

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: totalSummary } = useQuery({
    queryKey: ["analytics-total", monthStartStr, monthEndStr],
    queryFn: async () => {
      const { data: attendance } = await supabase
        .from("attendance")
        .select("student_id, status, date, created_at")
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
      
      // Only count holidays that have already occurred (up to today)
      const holidaysUpToToday = holidays?.filter(h => new Date(h.date) <= today) || [];
      const holidayDates = new Set(holidaysUpToToday.map(h => h.date));
      
      // Calculate working days: count only weekdays (Mon-Fri) up to today, excluding holidays
      let workingDays = 0;
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      // Determine the last date to consider
      let lastDateToConsider: Date;
      if (selectedMonth.getMonth() === today.getMonth() && selectedMonth.getFullYear() === today.getFullYear()) {
        // Current month: only count up to today
        lastDateToConsider = today;
      } else if (selectedMonth > today) {
        // Future month: no working days yet
        lastDateToConsider = new Date(monthStart.getTime() - 1); // No days to count
      } else {
        // Past month: count all days in the month
        lastDateToConsider = monthEnd;
      }
      
      // Count weekdays (Mon-Fri) excluding holidays
      for (let d = new Date(monthStart); d <= lastDateToConsider; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = format(d, "yyyy-MM-dd");
        
        // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
          workingDays++;
        }
      }

      const studentStats = students?.map((student) => {
        // Filter attendance for this student within date range and up to today
        const studentAttendance = attendance?.filter(
          (a) => a.student_id === student.id && new Date(a.date) <= today
        ) || [];
        
        // Group by date to handle any duplicate entries (keep latest)
        const attendanceByDate = new Map();
        studentAttendance.forEach(record => {
          const existing = attendanceByDate.get(record.date);
          if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
            attendanceByDate.set(record.date, record);
          }
        });
        
        // Count unique present and absent days
        const uniqueAttendance = Array.from(attendanceByDate.values());
        const present = uniqueAttendance.filter((a) => a.status === "present").length;
        const absent = uniqueAttendance.filter((a) => a.status === "absent").length;
        
        const percentage = workingDays > 0 ? Math.min(100, ((present / workingDays) * 100)).toFixed(1) : "0.0";

        return {
          ...student,
          present,
          absent,
          total: workingDays,
          percentage,
        };
      });

      return studentStats || [];
    },
    enabled: viewMode === "total",
  });

  const { data: datewiseAttendance } = useQuery({
    queryKey: ["analytics-datewise", currentDate],
    queryFn: async () => {
      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          students (name, university_roll)
        `)
        .eq("date", currentDate);

      return attendance || [];
    },
    enabled: viewMode === "datewise",
  });

  const { data: studentDetailedAttendance } = useQuery({
    queryKey: ["student-detailed-attendance", selectedStudentId, monthStartStr, monthEndStr],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      
      const { data: attendance } = await supabase
        .from("attendance")
        .select("date, status, absence_reason, created_at")
        .eq("student_id", selectedStudentId)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr)
        .order("date", { ascending: false });

      // Group by date to handle duplicates (keep latest)
      const attendanceByDate = new Map();
      attendance?.forEach(record => {
        const existing = attendanceByDate.get(record.date);
        if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
          attendanceByDate.set(record.date, record);
        }
      });

      return Array.from(attendanceByDate.values());
    },
    enabled: !!selectedStudentId,
  });

  const selectedStudent = students?.find(s => s.id === selectedStudentId);

  const sortData = (data: any[]) => {
    return data.slice().sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return a.university_roll.localeCompare(b.university_roll);
      }
    });
  };

  const filterData = (data: any[]) => {
    return data.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.university_roll.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const displayData = viewMode === "total" 
    ? filterData(sortData(totalSummary || []))
    : filterData(sortData(datewiseAttendance?.map(a => ({
        ...a.students,
        status: a.status,
        absence_reason: a.absence_reason
      })) || []));

  const refreshAnalytics = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics-total"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-datewise"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success("Analytics refreshed");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-20"
    >
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Attendance analysis and reports
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAnalytics}
            className="btn-animated flex-shrink-0"
            title="Refresh Analytics"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant={viewMode === "total" ? "default" : "outline"}
            onClick={() => setViewMode("total")}
            className="flex-1 btn-animated"
          >
            Total Summary
          </Button>
          <Button
            variant={viewMode === "datewise" ? "default" : "outline"}
            onClick={() => setViewMode("datewise")}
            className="flex-1 btn-animated"
          >
            Date-wise
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {viewMode === "total" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="btn-animated w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">{format(selectedMonth, "MMMM yyyy")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {viewMode === "datewise" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="btn-animated w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">{format(selectedDate, "PPP")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          <div className="relative flex-1">
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={sortBy} onValueChange={(value: "name" | "roll") => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[150px] btn-animated">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="roll">Sort by Roll</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="grid gap-3">
        {viewMode === "total" && displayData.map((student: any, index) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card 
              className="glass-card hover:shadow-md transition-all rounded-[1.5rem] cursor-pointer"
              onClick={() => setSelectedStudentId(student.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm md:text-base">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{student.name}</div>
                      <div className="text-xs font-normal text-muted-foreground truncate">
                        Roll: {student.university_roll}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xl sm:text-2xl font-bold flex-shrink-0",
                        parseFloat(student.percentage) >= 75
                          ? "text-success"
                          : parseFloat(student.percentage) >= 50
                          ? "text-accent"
                          : "text-destructive"
                      )}
                    >
                      {student.percentage}%
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs mb-3 flex-wrap gap-2">
                  <div className="flex gap-3 sm:gap-4">
                    <div>
                      <span className="text-muted-foreground">Present: </span>
                      <span className="font-semibold text-success">{student.present}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Absent: </span>
                      <span className="font-semibold text-destructive">{student.absent}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold">{student.total}</span>
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      parseFloat(student.percentage) >= 75
                        ? "bg-success"
                        : parseFloat(student.percentage) >= 50
                        ? "bg-accent"
                        : "bg-destructive"
                    )}
                    style={{ width: `${student.percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {viewMode === "datewise" && displayData.map((student: any, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card className="glass-card rounded-[1.5rem]">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base truncate">{student.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Roll: {student.university_roll}
                    </p>
                    {student.absence_reason && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        Reason: {student.absence_reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-semibold px-3 py-1 rounded-full flex-shrink-0 self-start",
                      student.status === "present"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {student.status === "present" ? "Present" : "Absent"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {displayData.length === 0 && (
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No data available</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {selectedStudent?.name}
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Roll: {selectedStudent?.university_roll}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 mt-4">
            {studentDetailedAttendance && studentDetailedAttendance.length > 0 ? (
              studentDetailedAttendance.map((record) => {
                const date = new Date(record.date);
                const dayName = format(date, "EEEE");
                const formattedDate = format(date, "dd MMM yyyy");
                
                return (
                  <div
                    key={record.date}
                    className={cn(
                      "p-3 rounded-lg border",
                      record.status === "present" 
                        ? "bg-success/5 border-success/20" 
                        : "bg-destructive/5 border-destructive/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{dayName}</div>
                        <div className="text-xs text-muted-foreground">{formattedDate}</div>
                        {record.absence_reason && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Reason: {record.absence_reason}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0",
                          record.status === "present"
                            ? "bg-success text-white"
                            : "bg-destructive text-white"
                        )}
                      >
                        {record.status === "present" ? "Present" : "Absent"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No attendance records found for this month
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
