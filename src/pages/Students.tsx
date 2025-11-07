import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Edit, Trash2, User, Upload } from "lucide-react";
import type { Student } from "@/lib/types";

const SEED_STUDENTS = [
  { roll: "24100124031", name: "SAYAN MAITI", phone: "9609800163" },
  { roll: "24100124032", name: "SAYAN PORIA", phone: "8972154339" },
  { roll: "24100124033", name: "SAYAN SAU", phone: "9933696766" },
  { roll: "24100124034", name: "SAYANDEEP GURIA", phone: "8944824435" },
  { roll: "24100124035", name: "SHAYNA MANDAL", phone: "8100048180" },
  { roll: "24100124036", name: "SHIROPA KUNDU", phone: "9147056136" },
  { roll: "24100124037", name: "SUPARNA GHOSH", phone: "7810978879" },
  { roll: "24100124038", name: "SUVANKAR MAITY", phone: "8927767452" },
  { roll: "24100124039", name: "SUBHADIP GUCHHAIT", phone: "6295613750" },
  { roll: "24100124040", name: "SUBHAMOY ADHIKARY", phone: "9432388748" },
  { roll: "24100124041", name: "SUBHRANIL JANA", phone: "8777032056" },
  { roll: "24100124042", name: "SUDIP BHUNIA", phone: "9332856782" },
  { roll: "24100124043", name: "SUDIPTA DEY", phone: "6296041299" },
  { roll: "24100124044", name: "SUDIPTYO DAS", phone: "8017948509" },
  { roll: "24100124045", name: "SUKANYA JHANJ", phone: "9674615887" },
  { roll: "24100124046", name: "SUMAN DAS", phone: "9733757133" },
  { roll: "24100124047", name: "SWAPNANEEL CHAKRABORTY", phone: "7890371878" },
  { roll: "24100124048", name: "SWASTIKA ROY CHOWDHURY", phone: "9903841259" },
  { roll: "24100124049", name: "TAMALIKA DAS", phone: "9832491319" },
  { roll: "24100124050", name: "TANUMOY DEY", phone: "7439687217" },
  { roll: "24100124051", name: "TRITHA MONDAL", phone: "8100073740" },
  { roll: "24100124052", name: "VIKRAM KUMAR", phone: "9748293212" },
  { roll: "24100124053", name: "ROHIT KUMAR", phone: "9903105550" },
  { roll: "24100124054", name: "ROHIT SHARMA", phone: "7004329163" },
  { roll: "24100124055", name: "PAPIYA MONDAL", phone: "9933633613" },
  { roll: "24100124056", name: "PITU GUCHHAIT", phone: "9339438728" },
  { roll: "24100124057", name: "PRATIK ACHARYA", phone: "6295617917" },
  { roll: "24100124058", name: "PRIOTOSH CHAKRABARTY", phone: "8910073181" },
  { roll: "24100124059", name: "PRIYANKA PRAMANIK", phone: "6294535628" },
  { roll: "24100124060", name: "MD ASFAQUE ALAM", phone: "9832736893" }
];

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    university_roll: "",
    phone_number: "",
  });
  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("students").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student added successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add student");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("students")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update student");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete student");
    },
  });

  const seedStudentsMutation = useMutation({
    mutationFn: async () => {
      const studentsToInsert = SEED_STUDENTS.map(s => ({
        university_roll: s.roll,
        name: s.name,
        phone_number: s.phone
      }));

      const { error } = await supabase
        .from("students")
        .upsert(studentsToInsert, {
          onConflict: 'university_roll',
          ignoreDuplicates: true
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Students imported successfully");
    },
    onError: () => {
      toast.error("Failed to import students");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", university_roll: "", phone_number: "" });
    setEditingStudent(null);
    setDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      university_roll: student.university_roll,
      phone_number: student.phone_number,
    });
    setDialogOpen(true);
  };

  const filteredStudents = students?.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.university_roll.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            Manage your student database
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => seedStudentsMutation.mutate()}
            disabled={seedStudentsMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import 30 Students
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Edit Student" : "Add New Student"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roll">University Roll</Label>
                <Input
                  id="roll"
                  value={formData.university_roll}
                  onChange={(e) =>
                    setFormData({ ...formData, university_roll: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStudent ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents?.map((student) => (
            <Card key={student.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Roll: {student.university_roll}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.phone_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this student?")) {
                          deleteMutation.mutate(student.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredStudents?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No students found
        </div>
      )}
    </div>
  );
}
