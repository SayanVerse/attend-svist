import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileDown, Calendar, FileSpreadsheet } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

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

      const { data: allStudents } = await supabase
        .from("students")
        .select("*")
        .order("university_roll");

      if (!allStudents || allStudents.length === 0) {
        toast.error("No students found");
        return;
      }

      const rows = allStudents.map((student) => {
        const record = attendance?.find((a: any) => a.student_id === student.id);
        return {
          "Student Name": student.name,
          "Roll Number": student.university_roll,
          "Phone": student.phone_number,
          "Status": record?.status || "Absent",
          "Absence Reason": record?.absence_reason || "-",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      XLSX.writeFile(workbook, `attendance_${selectedDate}.xlsx`);
      toast.success("Daily report exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export daily report");
    }
  };

  const handleExportMonthly = async () => {
    try {
      const monthStart = `${selectedMonth}-01`;
      const monthDate = new Date(selectedMonth + "-01");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          students (name, university_roll)
        `)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const { data: allStudents } = await supabase
        .from("students")
        .select("*")
        .order("university_roll");

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (!allStudents || allStudents.length === 0) {
        toast.error("No students found");
        return;
      }

      const daysInMonth = getDaysInMonth(monthDate);
      const holidayCount = holidays?.length || 0;
      const workingDays = daysInMonth - holidayCount;

      const studentMap = new Map();
      allStudents.forEach((student) => {
        studentMap.set(student.id, {
          name: student.name,
          roll: student.university_roll,
          present: 0,
          absent: 0,
        });
      });

      attendance?.forEach((record: any) => {
        const student = studentMap.get(record.student_id);
        if (student) {
          if (record.status === "present") {
            student.present++;
          }
        }
      });

      const rows = Array.from(studentMap.values()).map((student: any) => {
        const absent = workingDays - student.present;
        const percentage = workingDays > 0 ? ((student.present / workingDays) * 100).toFixed(1) : "0.0";
        return {
          "Student Name": student.name,
          "Roll Number": student.roll,
          "Present Days": student.present,
          "Absent Days": absent,
          "Total Working Days": workingDays,
          "Attendance %": `${percentage}%`,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Summary");

      XLSX.writeFile(workbook, `monthly_report_${selectedMonth}.xlsx`);
      toast.success("Monthly report exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export monthly report");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Export Data</h2>
        <p className="text-sm text-muted-foreground">
          Export attendance records to Excel format
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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
              <Button onClick={handleExportDaily} className="w-full btn-animated">
                <FileDown className="mr-2 h-4 w-4" />
                Export Daily Report (.xlsx)
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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
              <Button onClick={handleExportMonthly} className="w-full btn-animated">
                <FileDown className="mr-2 h-4 w-4" />
                Export Monthly Report (.xlsx)
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">About Exports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Daily reports include all students with their attendance status and absence reasons</p>
            <p>• Monthly reports provide summary statistics for each student</p>
            <p>• All students appear in exports, even if attendance wasn't marked (counted as absent)</p>
            <p>• Reports are in Excel (.xlsx) format, compatible with Microsoft Excel and Google Sheets</p>
            <p>• Monthly reports account for holidays when calculating percentages</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
