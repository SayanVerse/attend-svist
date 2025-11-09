import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, X, CalendarIcon, ChevronLeft, ChevronRight, Trash2, Undo2, ArrowUpDown } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Student, Attendance } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

export default function AttendancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sortBy, setSortBy] = useState<"name" | "roll">("name");
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: 'present' | 'absent'; reason?: string }>>({});
  const [deletedAttendance, setDeletedAttendance] = useState<Attendance[] | null>(null);
  const queryClient = useQueryClient();
  const currentDate = format(selectedDate, "yyyy-MM-dd");

  // Swipe gestures for date navigation
  useSwipeGesture({
    onSwipeLeft: () => setSelectedDate(addDays(selectedDate, 1)),
    onSwipeRight: () => setSelectedDate(subDays(selectedDate, 1)),
  });

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

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-4 pb-20"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Attendance</h2>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              className="btn-animated"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="btn-animated min-w-[180px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="btn-animated"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={sortBy} onValueChange={(value: "name" | "roll") => setSortBy(value)}>
            <SelectTrigger className="w-[150px] btn-animated rounded-lg">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="roll">Sort by Roll</SelectItem>
            </SelectContent>
          </Select>

          {!holiday && (
            <Button
              variant="outline"
              onClick={() => {
                const note = prompt("Add a note (optional):");
                markHolidayMutation.mutate(note || undefined);
              }}
              className="btn-animated"
            >
              Mark Holiday
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
              className="btn-animated"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}

          {deletedAttendance && (
            <Button
              variant="outline"
              onClick={() => undoDeleteMutation.mutate()}
              className="btn-animated"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo
            </Button>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              className="btn-animated flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="btn-animated flex-1">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">{format(selectedDate, "PP")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="btn-animated flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: "name" | "roll") => setSortBy(value)}>
              <SelectTrigger className="flex-1 btn-animated">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="roll">Sort by Roll</SelectItem>
              </SelectContent>
            </Select>

            {!holiday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const note = prompt("Add a note (optional):");
                  markHolidayMutation.mutate(note || undefined);
                }}
                className="btn-animated flex-shrink-0"
              >
                Mark Holiday
              </Button>
            )}
          </div>

          {todayAttendance && todayAttendance.length > 0 && !holiday && (
            <Button
              variant="destructive"
              size="sm"
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
              size="sm"
              onClick={() => undoDeleteMutation.mutate()}
              className="btn-animated w-full"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo
            </Button>
          )}
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
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="glass-card hover:shadow-md transition-all rounded-[1.5rem]">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base truncate">{student.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              Roll: {student.university_roll}
                            </p>
                          </div>

                          {status && !holiday && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                deleteAttendanceMutation.mutate(student.id);
                                setAttendanceData(prev => {
                                  const newData = { ...prev };
                                  delete newData[student.id];
                                  return newData;
                                });
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2 w-full">
                          <Button
                            size="sm"
                            variant={isPresent ? "default" : "outline"}
                            onClick={() => handleStatusChange(student.id, 'present')}
                            disabled={!!holiday}
                            className={cn(
                              "btn-animated flex-1 text-xs md:text-sm",
                              isPresent && "bg-success hover:bg-success/90"
                            )}
                          >
                            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="truncate">Present</span>
                          </Button>
                          <Button
                            size="sm"
                            variant={isAbsent ? "default" : "outline"}
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            disabled={!!holiday}
                            className={cn(
                              "btn-animated flex-1 text-xs md:text-sm",
                              isAbsent && "bg-destructive hover:bg-destructive/90"
                            )}
                          >
                            <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="truncate">Absent</span>
                          </Button>
                        </div>

                        {isAbsent && !holiday && (
                          <Textarea
                            placeholder="Reason for absence..."
                            value={attendanceData[student.id]?.reason || ""}
                            onChange={(e) => handleReasonChange(student.id, e.target.value)}
                            onBlur={() => saveAttendanceMutation.mutate(student.id)}
                            className="min-h-[60px] text-sm w-full"
                          />
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
