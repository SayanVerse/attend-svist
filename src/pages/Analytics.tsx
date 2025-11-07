import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: attendanceData } = useQuery({
    queryKey: ["analytics", monthStart, monthEnd],
    queryFn: async () => {
      const { data: students } = await supabase
        .from("students")
        .select("id, name, university_roll");

      const { data: attendance } = await supabase
        .from("attendance")
        .select("student_id, status")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const studentStats = students?.map((student) => {
        const studentAttendance = attendance?.filter(
          (a) => a.student_id === student.id
        );
        const present = studentAttendance?.filter((a) => a.status === "present").length || 0;
        const absent = studentAttendance?.filter((a) => a.status === "absent").length || 0;
        const total = present + absent;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

        return {
          ...student,
          present,
          absent,
          total,
          percentage,
        };
      });

      return studentStats || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Student-wise attendance analysis for {format(new Date(), "MMMM yyyy")}
        </p>
      </div>

      <div className="grid gap-4">
        {attendanceData?.map((student) => (
          <Card key={student.id} className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div>
                  <span>{student.name}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({student.university_roll})
                  </span>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    parseFloat(student.percentage) >= 75
                      ? "text-success"
                      : parseFloat(student.percentage) >= 50
                      ? "text-accent"
                      : "text-destructive"
                  }`}
                >
                  {student.percentage}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-6">
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

              {/* Visual Progress Bar */}
              <div className="mt-4 h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    parseFloat(student.percentage) >= 75
                      ? "bg-success"
                      : parseFloat(student.percentage) >= 50
                      ? "bg-accent"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${student.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {attendanceData?.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No attendance data available for this month</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
