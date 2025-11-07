export interface Student {
  id: string;
  name: string;
  university_roll: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  absence_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface AttendanceWithStudent extends Attendance {
  students: Student;
}
