import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, X, Trash2, Undo2, ArrowUpDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Student, Attendance } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function DatewiseAttendancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sortBy, setSortBy] = useState<"name" | "roll">("name");
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: 'present' | 'absent'; reason?: string }>>({});
  const [deletedAttendance, setDeletedAttendance] = useState<Attendance[] | null>(null);
  const queryClient = useQueryClient();
  const currentDate = format(selectedDate, "yyyy-MM-dd");

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setAttendanceData({});
      setDeletedAttendance(null);
    }
  };

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance", currentDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", currentDate);
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const { data: holiday } = useQuery({
    queryKey: ["holiday", currentDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("holidays")
        .select("*")
        .eq("date", currentDate)
        .maybeSingle();
      return data;
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const record = attendanceData[studentId];
      if (!record) return;

      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: studentId,
          date: currentDate,
          status: record.status,
          absence_reason: record.status === 'absent' ? record.reason : null,
        }, {
          onConflict: 'student_id,date'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved");
    },
    onError: () => {
      toast.error("Failed to save attendance");
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("student_id", studentId)
        .eq("date", currentDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance cleared");
    },
  });

  const clearAllAttendanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .delete()
        .eq("date", currentDate)
        .select();

      if (error) throw error;
      return data as Attendance[];
    },
    onSuccess: (data) => {
      setDeletedAttendance(data);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setAttendanceData({});
      toast.success("All attendance cleared for this date");
    },
  });

  const undoDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletedAttendance) return;

      const { error } = await supabase
        .from("attendance")
        .insert(deletedAttendance.map(a => ({
          student_id: a.student_id,
          date: a.date,
          status: a.status,
          absence_reason: a.absence_reason
        })));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setDeletedAttendance(null);
      toast.success("Attendance restored");
    },
  });

  const markHolidayMutation = useMutation({
    mutationFn: async (note?: string) => {
      const { error } = await supabase
        .from("holidays")
        .insert({ date: currentDate, note });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday"] });
      toast.success("Marked as holiday");
    },
  });

  const unmarkHolidayMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("date", currentDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday"] });
      toast.success("Holiday removed");
    },
  });

  const refreshAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance", currentDate] });
    queryClient.invalidateQueries({ queryKey: ["holiday", currentDate] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
    setAttendanceData({});
    toast.success("Refreshed");
  };

  const sortedStudents = students?.slice().sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return a.university_roll.localeCompare(b.university_roll);
    }
  });

  const filteredStudents = sortedStudents?.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.university_roll.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { status, reason: prev[studentId]?.reason }
    }));
    saveAttendanceMutation.mutate(studentId);
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], reason }
    }));
  };

  const getAttendanceStatus = (studentId: string) => {
    const existing = todayAttendance?.find(a => a.student_id === studentId);
    return existing || attendanceData[studentId];
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-4 pb-20"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Date-wise Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Mark attendance for any date using the calendar
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calendar Card */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  className="pointer-events-auto rounded-lg border"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                    ),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
                    day: cn(
                      "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-full"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                    day_today: "bg-accent text-accent-foreground rounded-full",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
              </div>
              <div className="text-center mt-4 text-lg font-semibold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>
            </CardContent>
          </Card>

          {/* Controls Card */}
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshAttendance}
                  className="btn-animated"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Select value={sortBy} onValueChange={(value: "name" | "roll") => setSortBy(value)}>
                  <SelectTrigger className="flex-1 btn-animated rounded-lg">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="roll">Sort by Roll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!holiday && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const note = prompt("Add a note (optional):");
                    markHolidayMutation.mutate(note || undefined);
                  }}
                  className="btn-animated w-full"
                >
                  Mark as Holiday
                </Button>
              )}

              {todayAttendance && todayAttendance.length > 0 && !holiday && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Clear all attendance for this date?")) {
                      clearAllAttendanceMutation.mutate();
                    }
                  }}
                  className="btn-animated w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}

              {deletedAttendance && (
                <Button
                  variant="outline"
                  onClick={() => undoDeleteMutation.mutate()}
                  className="btn-animated w-full"
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Undo Clear
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or roll..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
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

      {/* Holiday Banner */}
      {holiday && (
        <Card className="border-accent bg-accent/10 rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">🎉</div>
              <h3 className="text-xl font-bold">Holiday</h3>
              {holiday.note && (
                <p className="text-sm text-muted-foreground">{holiday.note}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Unmark this day as holiday?")) {
                    unmarkHolidayMutation.mutate();
                  }
                }}
                className="btn-animated mt-2"
              >
                Unmark Holiday
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {isLoading ? (
        <div className="text-center py-12">Loading students...</div>
      ) : holiday ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No attendance marking on holidays</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-3">
            {filteredStudents?.map((student, index) => {
              const status = getAttendanceStatus(student.id);
              const isAbsent = status?.status === 'absent';
              const isPresent = status?.status === 'present';

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={cn(
                    "glass-card hover:shadow-md transition-all rounded-[1.5rem]",
                    isPresent && "border-success/30",
                    isAbsent && "border-destructive/30"
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{student.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              Roll: {student.university_roll}
                            </p>
                          </div>
                          
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant={isPresent ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className={cn(
                                "flex-1 sm:flex-none btn-animated",
                                isPresent && "bg-success hover:bg-success/90 text-white"
                              )}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Present
                            </Button>
                            <Button
                              variant={isAbsent ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className={cn(
                                "flex-1 sm:flex-none btn-animated",
                                isAbsent && "bg-destructive hover:bg-destructive/90"
                              )}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                            {status && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteAttendanceMutation.mutate(student.id)}
                                className="h-9 w-9"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {isAbsent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <Textarea
                              placeholder="Reason for absence (optional)"
                              value={('absence_reason' in status ? status.absence_reason : status.reason) || ""}
                              onChange={(e) => handleReasonChange(student.id, e.target.value)}
                              onBlur={() => saveAttendanceMutation.mutate(student.id)}
                              className="text-sm resize-none"
                              rows={2}
                            />
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
