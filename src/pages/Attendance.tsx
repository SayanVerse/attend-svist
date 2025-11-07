import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, X } from "lucide-react";
import { format } from "date-fns";
import type { Student, Attendance } from "@/lib/types";

export default function AttendancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: 'present' | 'absent'; reason?: string }>>({});
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

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
    queryKey: ["attendance", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const { data: isHoliday } = useQuery({
    queryKey: ["holiday", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("holidays")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      return !!data;
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
          date: today,
          status: record.status,
          absence_reason: record.status === 'absent' ? record.reason : null,
        }, {
          onConflict: 'student_id,date'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved successfully");
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
        .eq("date", today);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance record removed");
    },
  });

  const markHolidayMutation = useMutation({
    mutationFn: async (note?: string) => {
      const { error } = await supabase
        .from("holidays")
        .insert({ date: today, note });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday"] });
      toast.success("Today marked as holiday");
    },
  });

  const filteredStudents = students?.filter(
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

  if (isHoliday) {
    return (
      <div className="space-y-6">
        <Card className="border-accent">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold">Today is a Holiday!</h2>
              <p className="text-muted-foreground">
                Attendance marking is disabled for today.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Attendance</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const note = prompt("Add a note (optional):");
            markHolidayMutation.mutate(note || undefined);
          }}
        >
          Mark Today as Holiday
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or roll number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading students...</div>
      ) : (
        <div className="grid gap-4">
          {filteredStudents?.map((student) => {
            const status = getAttendanceStatus(student.id);
            const isAbsent = status?.status === 'absent';
            const isPresent = status?.status === 'present';

            return (
              <Card key={student.id} className="transition-all hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Roll: {student.university_roll} • {student.phone_number}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isPresent ? "default" : "outline"}
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={isPresent ? "bg-success hover:bg-success/90" : ""}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant={isAbsent ? "default" : "outline"}
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={isAbsent ? "bg-destructive hover:bg-destructive/90" : ""}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Absent
                      </Button>
                      {status && (
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
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isAbsent && (
                    <Textarea
                      placeholder="Reason for absence..."
                      value={
                        ('absence_reason' in status ? status.absence_reason : status?.reason) || ""
                      }
                      onChange={(e) => handleReasonChange(student.id, e.target.value)}
                      onBlur={() => saveAttendanceMutation.mutate(student.id)}
                      className="mt-4"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
