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
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { BarChart3, CalendarIcon, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<"total" | "datewise">("total");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "roll">("name");

  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
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
    queryKey: ["analytics-total", monthStart, monthEnd],
    queryFn: async () => {
      const { data: attendance } = await supabase
        .from("attendance")
        .select("student_id, status, date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const daysInMonth = getDaysInMonth(selectedMonth);
      const holidayCount = holidays?.length || 0;
      const workingDays = daysInMonth - holidayCount;

      const studentStats = students?.map((student) => {
        const studentAttendance = attendance?.filter(
          (a) => a.student_id === student.id
        );
        const present = studentAttendance?.filter((a) => a.status === "present").length || 0;
        const totalMarked = studentAttendance?.length || 0;
        const absent = workingDays - present;
        const percentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(1) : "0.0";

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
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
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

        {viewMode === "total" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="btn-animated">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedMonth, "MMMM yyyy")}
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
              <Button variant="outline" className="btn-animated">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
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

        <div className="flex gap-2">
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
            <SelectTrigger className="w-[140px] btn-animated">
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
            <Card className="glass-card hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div>
                    <span>{student.name}</span>
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({student.university_roll})
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-xl font-bold",
                      parseFloat(student.percentage) >= 75
                        ? "text-success"
                        : parseFloat(student.percentage) >= 50
                        ? "text-accent"
                        : "text-destructive"
                    )}
                  >
                    {student.percentage}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex gap-4">
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
            <Card className="glass-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Roll: {student.university_roll}
                    </p>
                    {student.absence_reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reason: {student.absence_reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold px-3 py-1 rounded-full",
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
    </motion.div>
  );
}
