import { useState, useEffect, useCallback } from 'react';
import { Appointment, Project, Patient, CLINICAL_VISIT_PERIODS } from './types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  PROJECTS: 'cc_projects_cache',
  PATIENTS: 'cc_patients_cache',
  APPOINTMENTS: 'cc_appointments_cache',
};

const parseAppointments = (appointments: any[]): Appointment[] => {
  if (!Array.isArray(appointments)) return [];
  return appointments.map((a: any) => {
    let visitPeriod = a.visitPeriod;
    if (!visitPeriod && a.title) {
      const match = a.title.match(/^(Screening|D1|M0\.5|M0,5|M1\.5|M1,5|M2\.5|M2,5|M\d+)\b/i);
      if (match) {
        visitPeriod = match[1].replace(',', '.');
      }
    }
    return {
      ...a,
      visitPeriod,
      date: new Date(a.date),
      recurrenceEndDate: a.recurrenceEndDate ? new Date(a.recurrenceEndDate) : undefined
    };
  });
};

const loadFromLocalStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error caching ${key} to localStorage:`, err);
  }
};

const generateId = () => crypto.randomUUID();

export type SyncStatus = 'synced' | 'syncing' | 'error';

export function useClinicalStore() {
  // Initialize with local cache first to ensure immediate offline availability and instant rendering
  const [projects, setProjects] = useState<Project[]>(() => loadFromLocalStorage(STORAGE_KEYS.PROJECTS, []));
  const [patients, setPatients] = useState<Patient[]>(() => loadFromLocalStorage(STORAGE_KEYS.PATIENTS, []));
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const cached = loadFromLocalStorage<any[]>(STORAGE_KEYS.APPOINTMENTS, []);
    return parseAppointments(cached);
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [syncErrorDetail, setSyncErrorDetail] = useState<string | null>(null);

  // Keep localStorage synced whenever state changes
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.PATIENTS, patients);
  }, [patients]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
  }, [appointments]);

  // Fetch initial data from Supabase
  const fetchData = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncErrorDetail(null);
    try {
      const [projectsRes, patientsRes, appointmentsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('patients').select('*'),
        supabase.from('appointments').select('*')
      ]);

      let hasError = false;
      let errorMsg = '';

      if (projectsRes.error) {
        console.error('Error fetching projects from Supabase:', projectsRes.error);
        errorMsg = projectsRes.error.message || 'Error al cargar proyectos';
        hasError = true;
      } else if (projectsRes.data) {
        setProjects(projectsRes.data as Project[]);
      }

      if (patientsRes.error) {
        console.error('Error fetching patients from Supabase:', patientsRes.error);
        errorMsg = errorMsg || patientsRes.error.message || 'Error al cargar pacientes';
        hasError = true;
      } else if (patientsRes.data) {
        setPatients(patientsRes.data as Patient[]);
      }

      if (appointmentsRes.error) {
        console.error('Error fetching appointments from Supabase:', appointmentsRes.error);
        errorMsg = errorMsg || appointmentsRes.error.message || 'Error al cargar citas';
        hasError = true;
      } else if (appointmentsRes.data) {
        setAppointments(parseAppointments(appointmentsRes.data));
      }

      if (hasError) {
        setSyncStatus('error');
        setSyncErrorDetail(errorMsg);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (error: any) {
      console.error('Error connecting to Supabase:', error);
      setSyncStatus('error');
      setSyncErrorDetail(error?.message || 'Error de conexión con la base de datos');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup Realtime subscriptions
  useEffect(() => {
    const projectsSub = supabase.channel('public:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new as Project];
          });
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new as Project : p));
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    const patientsSub = supabase.channel('public:patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPatients(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new as Patient];
          });
        } else if (payload.eventType === 'UPDATE') {
          setPatients(prev => prev.map(p => p.id === payload.new.id ? payload.new as Patient : p));
        } else if (payload.eventType === 'DELETE') {
          setPatients(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    const appointmentsSub = supabase.channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, payload => {
        if (payload.eventType === 'INSERT') {
          setAppointments(prev => {
            if (prev.find(a => a.id === payload.new.id)) return prev;
            return [...prev, ...parseAppointments([payload.new])];
          });
        } else if (payload.eventType === 'UPDATE') {
          setAppointments(prev => prev.map(a => a.id === payload.new.id ? parseAppointments([payload.new])[0] : a));
        } else if (payload.eventType === 'DELETE') {
          setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(projectsSub);
      supabase.removeChannel(patientsSub);
      supabase.removeChannel(appointmentsSub);
    };
  }, []);

  const addProject = async (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: generateId() };
    setProjects(prev => [...prev, newProject]);
    setSyncStatus('syncing');

    try {
      const { error } = await supabase.from('projects').insert(newProject);
      if (error) {
        console.error('Error adding project to Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in addProject:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error guardando proyecto');
    }
    return newProject.id;
  };

  const updateProject = async (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSyncStatus('syncing');

    try {
      const { error } = await supabase.from('projects').update(updatedProject).eq('id', updatedProject.id);
      if (error) {
        console.error('Error updating project in Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in updateProject:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error actualizando proyecto');
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setPatients(prev => prev.filter(p => p.projectId !== id));
    setAppointments(prev => prev.filter(a => a.projectId !== id));
    setSyncStatus('syncing');

    try {
      await supabase.from('appointments').delete().eq('projectId', id);
      await supabase.from('patients').delete().eq('projectId', id);
      const { error } = await supabase.from('projects').delete().eq('id', id);

      if (error) {
        console.error('Error deleting project from Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in deleteProject:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error eliminando proyecto');
    }
  };

  const addPatient = async (patient: Omit<Patient, 'id'>) => {
    const newPatient = { ...patient, id: generateId() };
    setPatients(prev => [...prev, newPatient]);
    setSyncStatus('syncing');

    try {
      const { error } = await supabase.from('patients').insert(newPatient);
      if (error) {
        console.error('Error adding patient to Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in addPatient:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error añadiendo paciente');
    }
  };

  const deletePatient = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar a este paciente? Esta acción no se puede deshacer.')) {
      return;
    }

    setPatients(prev => prev.filter(p => p.id !== id));
    setAppointments(prev => prev.map(a => a.patientId === id ? { ...a, patientId: undefined } : a));
    setSyncStatus('syncing');

    try {
      await supabase.from('appointments').update({ patientId: null }).eq('patientId', id);
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) {
        console.error('Error deleting patient from Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in deletePatient:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error eliminando paciente');
    }
  };

  const syncProjectPatients = async (
    projectId: string, 
    newPatients: { id?: string; name: string; color?: string }[], 
    currentPatients: Patient[] = patients
  ) => {
    setSyncStatus('syncing');
    const otherPatients = currentPatients.filter(p => p.projectId !== projectId);
    const existingProjectPatients = currentPatients.filter(p => p.projectId === projectId);

    const updatedProjectPatients: Patient[] = [];
    const patientsToUpsert: Patient[] = [];
    const activeIds = new Set<string>();

    for (const p of newPatients) {
      if (!p.name.trim()) continue;

      if (p.id) {
        activeIds.add(p.id);
        const existing = existingProjectPatients.find(ext => ext.id === p.id);
        const updated: Patient = existing
          ? { ...existing, name: p.name, color: p.color }
          : { id: p.id, projectId, name: p.name, contact: '', notes: '', color: p.color };
        patientsToUpsert.push(updated);
        updatedProjectPatients.push(updated);
      } else {
        const newId = generateId();
        activeIds.add(newId);
        const newPat: Patient = { id: newId, projectId, name: p.name, contact: '', notes: '', color: p.color };
        patientsToUpsert.push(newPat);
        updatedProjectPatients.push(newPat);
      }
    }

    const patientsToDelete = existingProjectPatients.filter(p => !activeIds.has(p.id));

    setPatients([...otherPatients, ...updatedProjectPatients]);

    try {
      if (patientsToUpsert.length > 0) {
        const { error } = await supabase.from('patients').upsert(patientsToUpsert);
        if (error) console.error('Error upserting patients to Supabase:', error);
      }

      if (patientsToDelete.length > 0) {
        const idsToDelete = patientsToDelete.map(p => p.id);
        await supabase.from('patients').delete().in('id', idsToDelete);
        await supabase.from('appointments').update({ patientId: null }).in('patientId', idsToDelete);
      }
      setSyncStatus('synced');
      setSyncErrorDetail(null);
    } catch (err: any) {
      console.error('Error in syncProjectPatients:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error sincronizando pacientes');
    }
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    const baseId = generateId();
    const newAppointments: Appointment[] = [];
    
    newAppointments.push({ ...appointment, id: baseId });

    if (appointment.recurrence !== 'none') {
      const interval = appointment.recurrenceInterval || 1;
      const effectiveEndDate = appointment.recurrenceEndDate ?? addMonths(appointment.date, 12);
      let currentDate = appointment.date;
      let counter = 0;
      const MAX_OCCURRENCES = 365;
      
      while (true) {
        counter++;
        if (counter > MAX_OCCURRENCES) break;

        if (appointment.recurrence === 'daily') {
          currentDate = addDays(currentDate, interval);
        } else if (appointment.recurrence === 'weekly') {
          currentDate = addWeeks(currentDate, interval);
        } else if (appointment.recurrence === 'monthly') {
          currentDate = addMonths(currentDate, interval);
        }

        if (isAfter(startOfDay(currentDate), endOfDay(effectiveEndDate))) {
          break;
        }

        newAppointments.push({
          ...appointment,
          id: `${baseId}-${counter}`,
          date: currentDate,
          flexibilityDays: appointment.flexibilityDays,
        });
      }
    }
    
    setAppointments(prev => [...prev, ...newAppointments]);
    setSyncStatus('syncing');

    try {
      // Omit visitPeriod from DB payload since column does not exist in schema
      const dbAppointments = newAppointments.map(a => {
        const { visitPeriod, ...clean } = a;
        return {
          ...clean,
          date: a.date.toISOString(),
          recurrenceEndDate: a.recurrenceEndDate ? a.recurrenceEndDate.toISOString() : null,
        };
      });

      const { error } = await supabase.from('appointments').insert(dbAppointments);
      if (error) {
        console.error('Error adding appointments:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in addAppointment:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error guardando cita');
    }
  };

  const updateAppointment = async (updatedAppointment: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
    setSyncStatus('syncing');

    try {
      const { visitPeriod, ...clean } = updatedAppointment;
      const dbAppt = {
        ...clean,
        date: updatedAppointment.date.toISOString(),
        recurrenceEndDate: updatedAppointment.recurrenceEndDate ? updatedAppointment.recurrenceEndDate.toISOString() : null,
      };
      
      const { error } = await supabase.from('appointments').update(dbAppt).eq('id', updatedAppointment.id);
      if (error) {
        console.error('Error updating appointment:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error in updateAppointment:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error actualizando cita');
    }
  };

  const deleteAppointment = async (appointment: Appointment) => {
    const baseId = appointment.id.split('-')[0];
    const targetDate = startOfDay(new Date(appointment.date));
    
    const idsToDelete = appointments.filter(a => {
      const aBaseId = a.id.split('-')[0];
      if (aBaseId === baseId && !isBefore(startOfDay(new Date(a.date)), targetDate)) {
        return true;
      }
      return false;
    }).map(a => a.id);

    setAppointments(prev => prev.filter(a => !idsToDelete.includes(a.id)));
    setSyncStatus('syncing');

    if (idsToDelete.length > 0) {
      try {
        const { error } = await supabase.from('appointments').delete().in('id', idsToDelete);
        if (error) {
          console.error('Error deleting appointments:', error);
          setSyncStatus('error');
          setSyncErrorDetail(error.message);
        } else {
          setSyncStatus('synced');
          setSyncErrorDetail(null);
        }
      } catch (err: any) {
        console.error('Error in deleteAppointment:', err);
        setSyncStatus('error');
        setSyncErrorDetail(err?.message || 'Error eliminando cita');
      }
    }
  };

  const addClinicalSchedule = async (d1Appointment: Omit<Appointment, 'id'>) => {
    const d1Date = d1Appointment.date;
    const newAppointments: Appointment[] = [];

    const rawSuffix = d1Appointment.title
      .replace(/^(Screening|D1|M0\.5|M0,5|M1\.5|M1,5|M2\.5|M2,5|M\d+)\s*[–-]?\s*/i, '')
      .trim();
    const cleanSuffix = rawSuffix && !['inicio de tratamiento', 'visita'].includes(rawSuffix.toLowerCase())
      ? ` – ${rawSuffix}`
      : ' – Visita';

    const d1Title = d1Appointment.title.startsWith('D1') 
      ? d1Appointment.title 
      : `D1${cleanSuffix}`;

    newAppointments.push({
      ...d1Appointment,
      id: generateId(),
      title: d1Title,
      visitPeriod: 'D1',
      flexibilityDays: 0,
      recurrence: 'none',
    });

    for (const period of CLINICAL_VISIT_PERIODS) {
      if (period.daysFromD1 === null || period.daysFromD1 === 0) continue;
      const visitDate = addDays(d1Date, period.daysFromD1);
      newAppointments.push({
        id: generateId(),
        projectId: d1Appointment.projectId,
        patientId: d1Appointment.patientId,
        title: `${period.key}${cleanSuffix}`,
        category: d1Appointment.category,
        date: visitDate,
        time: d1Appointment.time,
        recurrence: 'none',
        recurrenceInterval: 1,
        flexibilityDays: period.defaultWindow,
        notes: '',
        visitPeriod: period.key,
      });
    }

    setAppointments(prev => [...prev, ...newAppointments]);
    setSyncStatus('syncing');

    try {
      const dbAppointments = newAppointments.map(a => {
        const { visitPeriod, ...clean } = a;
        return {
          ...clean,
          date: a.date.toISOString(),
          recurrenceEndDate: null,
        };
      });
      const { error } = await supabase.from('appointments').insert(dbAppointments);
      if (error) {
        console.error('Error adding clinical schedule to Supabase:', error);
        setSyncStatus('error');
        setSyncErrorDetail(error.message);
      } else {
        setSyncStatus('synced');
        setSyncErrorDetail(null);
      }
    } catch (err: any) {
      console.error('Error adding clinical schedule to Supabase:', err);
      setSyncStatus('error');
      setSyncErrorDetail(err?.message || 'Error en protocolo clínico');
    }
  };

  return {
    projects,
    patients,
    appointments,
    syncStatus,
    syncErrorDetail,
    retrySync: fetchData,
    addProject,
    updateProject,
    deleteProject,
    addPatient,
    deletePatient,
    syncProjectPatients,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addClinicalSchedule,
  };
}
