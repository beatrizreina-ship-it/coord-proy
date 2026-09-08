export interface Project {
  id: string;
  name: string;
  generalData: string;
  observations: string;
  color: string;
  startDate?: string;
  visitPeriodicities?: string;
}

export interface Patient {
  id: string;
  projectId: string;
  name: string;
  contact: string;
  notes: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Appointment {
  id: string;
  projectId: string;
  patientId?: string;
  title: string;
  category: string;
  date: Date;
  time?: string;
  recurrence: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date;
  flexibilityDays?: number;
  notes: string;
}
