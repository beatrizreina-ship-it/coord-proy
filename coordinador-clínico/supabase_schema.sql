-- =============================================
-- ELIMINAR Y RECREAR TABLAS CON NOMBRES CORRECTOS
-- (orden importa: primero las dependientes)
-- =============================================

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS projects;

-- Proyectos
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "generalData" TEXT,
  observations TEXT,
  color TEXT,
  "startDate" TEXT,
  "visitPeriodicities" TEXT
);

-- Pacientes
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  notes TEXT,
  color TEXT
);

-- Citas
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "patientId" TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  time TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none',
  "recurrenceInterval" INTEGER,
  "recurrenceEndDate" TIMESTAMPTZ,
  "flexibilityDays" INTEGER,
  notes TEXT
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
