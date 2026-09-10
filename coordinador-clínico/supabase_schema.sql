-- Execute this in the Supabase SQL Editor

-- Create Projects Table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generalData TEXT,
  observations TEXT,
  color TEXT,
  startDate TEXT,
  visitPeriodicities TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Patients Table
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  notes TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Appointments Table
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  patientId TEXT REFERENCES patients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  time TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none',
  recurrenceInterval INTEGER,
  recurrenceEndDate TIMESTAMP WITH TIME ZONE,
  flexibilityDays INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up Row Level Security (RLS)
-- Allow all operations for development. For a real app, you'd secure these properly.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for projects" ON projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read-write for patients" ON patients
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read-write for appointments" ON appointments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Turn on Realtime for these tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
