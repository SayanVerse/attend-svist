import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileDown, Calendar, Users, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

export default function ExportPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const handleExportDaily = async () => {
    try {
      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          students (name, university_roll, phone_number)
        `)
        .eq("date", selectedDate);

      if (!attendance || attendance.length === 0) {
        toast.error("No attendance records found for this date");
        return;
      }

      // Create CSV content
      const headers = ["Student Name", "Roll Number", "Phone", "Status", "Absence Reason"];
      const rows = attendance.map((record: any) => [
        record.students.name,
        record.students.university_roll,
        record.students.phone_number,
        record.status,
        record.absence_reason || "-",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${selectedDate}.csv`;
      a.click();

      toast.success("Daily report exported successfully");
    } catch (error) {
      toast.error("Failed to export daily report");
    }
  };

  const handleExportMonthly = async () => {
    try {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = `${selectedMonth}-31`;

      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          students (name, university_roll)
        `)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (!attendance || attendance.length === 0) {
        toast.error("No attendance records found for this month");
        return;
      }

      // Group by student
      const studentMap = new Map();
      attendance.forEach((record: any) => {
        const key = record.student_id;
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            name: record.students.name,
            roll: record.students.university_roll,
            present: 0,
            absent: 0,
          });
        }
        const stats = studentMap.get(key);
        if (record.status === "present") stats.present++;
        else stats.absent++;
      });

      const headers = ["Student Name", "Roll Number", "Present Days", "Absent Days", "Total", "Percentage"];
      const rows = Array.from(studentMap.values()).map((student: any) => {
        const total = student.present + student.absent;
        const percentage = ((student.present / total) * 100).toFixed(1);
        return [
          student.name,
          student.roll,
          student.present,
          student.absent,
          total,
          `${percentage}%`,
        ];
      });

      const csv = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monthly_report_${selectedMonth}.csv`;
      a.click();

      toast.success("Monthly report exported successfully");
    } catch (error) {
      toast.error("Failed to export monthly report");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
        <p className="text-muted-foreground">
          Export attendance records to CSV format
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Report
            </CardTitle>
            <CardDescription>
              Export attendance for a specific date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-date">Select Date</Label>
              <Input
                id="daily-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button onClick={handleExportDaily} className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Export Daily Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Monthly Report
            </CardTitle>
            <CardDescription>
              Export monthly summary with statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-date">Select Month</Label>
              <Input
                id="monthly-date"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <Button onClick={handleExportMonthly} className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Export Monthly Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            About Exports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Daily reports include detailed attendance with absence reasons</p>
          <p>• Monthly reports provide summary statistics for each student</p>
          <p>• All exports are in CSV format, compatible with Excel and Google Sheets</p>
          <p>• Reports include student names, roll numbers, and attendance data</p>
        </CardContent>
      </Card>
    </div>
  );
}
