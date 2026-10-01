export interface Project {
  id: string;
  name: string;
  generalData: string;
  observations: string;
  color?: string;
  startDate?: string;
  visitPeriodicities?: string;
}

export interface Patient {
  id: string;
  projectId: string;
  name: string;
  contact: string;
  notes: string;
  color?: string;
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
  visitPeriod?: string; // Clinical period: 'D1', 'M0.5', 'M1', etc.
}

// Clinical trial visit schedule - each period defined relative to D1
export interface ClinicalVisitPeriod {
  key: string;
  label: string;
  daysFromD1: number | null; // null = Screening (manual date)
  defaultWindow: number;     // ± flexibility days
}

export const CLINICAL_VISIT_PERIODS: ClinicalVisitPeriod[] = [
  { key: 'Screening', label: 'Screening (pre-D1)',   daysFromD1: null, defaultWindow: 3  },
  { key: 'D1',        label: 'D1 – Día 1',           daysFromD1: 0,    defaultWindow: 0  },
  { key: 'M0.5',      label: 'M0.5 (Día 15)',        daysFromD1: 15,   defaultWindow: 3  },
  { key: 'M1',        label: 'M1 (Día 30)',           daysFromD1: 30,   defaultWindow: 3  },
  { key: 'M1.5',      label: 'M1.5 (Día 45)',        daysFromD1: 45,   defaultWindow: 3  },
  { key: 'M2',        label: 'M2 (Día 60)',           daysFromD1: 60,   defaultWindow: 3  },
  { key: 'M2.5',      label: 'M2.5 (Día 75)',        daysFromD1: 75,   defaultWindow: 3  },
  { key: 'M3',        label: 'M3 (Día 90)',           daysFromD1: 90,   defaultWindow: 3  },
  { key: 'M6',        label: 'M6 (Día 180)',          daysFromD1: 180,  defaultWindow: 7  },
  { key: 'M9',        label: 'M9 (Día 270)',          daysFromD1: 270,  defaultWindow: 7  },
  { key: 'M12',       label: 'M12 (Día 360)',         daysFromD1: 360,  defaultWindow: 10 },
  { key: 'M15',       label: 'M15 (Día 450)',         daysFromD1: 450,  defaultWindow: 10 },
  { key: 'M18',       label: 'M18 (Día 540)',         daysFromD1: 540,  defaultWindow: 10 },
  { key: 'M21',       label: 'M21 (Día 630)',         daysFromD1: 630,  defaultWindow: 10 },
  { key: 'M24',       label: 'M24 (Día 720)',         daysFromD1: 720,  defaultWindow: 10 },
  { key: 'M27',       label: 'M27 (Día 810)',         daysFromD1: 810,  defaultWindow: 10 },
  { key: 'M30',       label: 'M30 (Día 900)',         daysFromD1: 900,  defaultWindow: 10 },
  { key: 'M33',       label: 'M33 (Día 990)',         daysFromD1: 990,  defaultWindow: 10 },
  { key: 'M36',       label: 'M36 (Día 1080)',        daysFromD1: 1080, defaultWindow: 10 },
];

