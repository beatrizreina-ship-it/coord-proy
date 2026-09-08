import React, { useState, useEffect, useCallback } from 'react';
import { Appointment, Project, Patient } from './types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { io } from 'socket.io-client';

const defaultProjects: Project[] = [];
const defaultPatients: Patient[] = [];
const defaultAppointments: Appointment[] = [];

// Initialize socket connection to the local server
const socket = io(`http://${window.location.hostname}:3001`);

const parseAppointments = (appointments: any[]) => {
  return appointments.map((a: any) => ({ 
    ...a, 
    date: new Date(a.date),
    recurrenceEndDate: a.recurrenceEndDate ? new Date(a.recurrenceEndDate) : undefined
  }));
};

const loadState = <T>(key: string, defaultValue: T, parser?: (v: any) => any): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parser ? parser(parsed) : parsed;
    }
  } catch (e) {
    console.error('Error loading state from localStorage', e);
  }
  return defaultValue;
};

export function useClinicalStore() {
  const [projects, setProjects] = useState<Project[]>(() => loadState('clincoord_projects', defaultProjects));
  const [patients, setPatients] = useState<Patient[]>(() => loadState('clincoord_patients', defaultPatients));
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadState('clincoord_appointments', defaultAppointments, parseAppointments));

  // Legacy cleanup
  useEffect(() => {
    if (projects.some(p => ['Ensayo Beta-Neuro', 'Estudio Alpha-Cardio'].includes(p.name) || ['p1', 'p2'].includes(p.id))) {
      setProjects(prev => prev.filter(p => !['Ensayo Beta-Neuro', 'Estudio Alpha-Cardio'].includes(p.name) && !['p1', 'p2'].includes(p.id)));
      setPatients(prev => prev.filter(p => !['p1', 'p2'].includes(p.projectId)));
      setAppointments(prev => prev.filter(a => !['p1', 'p2'].includes(a.projectId)));
    }
  }, []);

  // Sync with server
  useEffect(() => {
    const onInitialData = (data: { projects: Project[], patients: Patient[], appointments: any[] }) => {
      if (data) {
        if (data.projects?.length > 0) setProjects(data.projects);
        if (data.patients?.length > 0) setPatients(data.patients);
        if (data.appointments?.length > 0) setAppointments(parseAppointments(data.appointments));
      }
    };

    const onDataUpdated = (data: { projects: Project[], patients: Patient[], appointments: any[] }) => {
      if (data) {
        setProjects(data.projects || []);
        setPatients(data.patients || []);
        setAppointments(parseAppointments(data.appointments || []));
      }
    };

    socket.on('initial_data', onInitialData);
    socket.on('data_updated', onDataUpdated);

    return () => {
      socket.off('initial_data', onInitialData);
      socket.off('data_updated', onDataUpdated);
    };
  }, []);

  // Broadcast and local storage update helper
  const saveState = useCallback((newProjects: Project[], newPatients: Patient[], newAppointments: Appointment[]) => {
    localStorage.setItem('clincoord_projects', JSON.stringify(newProjects));
    localStorage.setItem('clincoord_patients', JSON.stringify(newPatients));
    localStorage.setItem('clincoord_appointments', JSON.stringify(newAppointments));
    
    // Broadcast changes to the server
    socket.emit('update_data', {
      projects: newProjects,
      patients: newPatients,
      appointments: newAppointments
    });
  }, []);

  // Listen to state changes and save (if changed locally)
  // We use a ref to prevent infinite loops from network updates
  const isNetworkUpdate = React.useRef(false);
  
  useEffect(() => {
    // When socket receives data, it sets state. We don't want to re-emit it.
    // However, the easiest way to manage this without complex refs in React is to 
    // let `saveState` be called explicitly inside the mutator functions below.
    // But since the current app uses `setProjects(prev => ...)` in many places,
    // we can use a debounced effect to sync state to server after any local change.
  }, [projects, patients, appointments]);
  
  // We'll wrap state setters to also trigger network sync immediately
  const handleUpdate = (
    updateFn: (p: Project[], pt: Patient[], a: Appointment[]) => void
  ) => {
    // We snapshot current, apply update, then save. 
    // To do this functionally with React state is tricky because of closures.
    // The simplest robust approach is emitting the data whenever the states change, 
    // BUT we need to avoid echo loops. Since we removed the auto-save useEffects,
    // we should call saveState inside the mutators.
  };

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Math.random().toString(36).substr(2, 9) };
    const nextProjects = [...projects, newProject];
    setProjects(nextProjects);
    saveState(nextProjects, patients, appointments);
    return newProject.id;
  };

  const updateProject = (updatedProject: Project) => {
    const nextProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(nextProjects);
    saveState(nextProjects, patients, appointments);
  };

  const deleteProject = (id: string) => {
    const nextProjects = projects.filter(p => p.id !== id);
    const nextPatients = patients.filter(p => p.projectId !== id);
    const nextAppointments = appointments.filter(a => a.projectId !== id);
    
    setProjects(nextProjects);
    setPatients(nextPatients);
    setAppointments(nextAppointments);
    saveState(nextProjects, nextPatients, nextAppointments);
  };

  const addPatient = (patient: Omit<Patient, 'id'>) => {
    const newPatient = { ...patient, id: Math.random().toString(36).substr(2, 9) };
    const nextPatients = [...patients, newPatient];
    setPatients(nextPatients);
    saveState(projects, nextPatients, appointments);
  };

  const deletePatient = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este paciente? Esta acción no se puede deshacer.')) {
      const nextPatients = patients.filter(p => p.id !== id);
      const nextAppointments = appointments.map(a => a.patientId === id ? { ...a, patientId: undefined } : a);
      
      setPatients(nextPatients);
      setAppointments(nextAppointments);
      saveState(projects, nextPatients, nextAppointments);
    }
  };

  const syncProjectPatients = (projectId: string, newPatients: {id?: string, name: string, color?: string}[]) => {
    setPatients(prev => {
      const otherPatients = prev.filter(p => p.projectId !== projectId);
      const updatedProjectPatients = newPatients.map(p => {
         if (p.id) {
           const existing = prev.find(ext => ext.id === p.id);
           return existing ? { ...existing, name: p.name, color: p.color } : { id: p.id, projectId, name: p.name, contact: '', notes: '', color: p.color };
         }
         return { id: Math.random().toString(36).substr(2, 9), projectId, name: p.name, contact: '', notes: '', color: p.color };
      });
      const nextPatients = [...otherPatients, ...updatedProjectPatients];
      
      // Delay saveState slightly to ensure it captures the current projects and appointments
      // Alternatively, we use the closure values but they might be stale if multiple updates happen.
      // For a robust sync we can just sync the entire state when this finishes.
      setTimeout(() => saveState(projects, nextPatients, appointments), 0);
      return nextPatients;
    });
  };

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const baseId = Math.random().toString(36).substr(2, 9);
    const newAppointments: Appointment[] = [];
    
    newAppointments.push({ ...appointment, id: baseId });

    if (appointment.recurrence !== 'none' && appointment.recurrenceEndDate) {
      const interval = appointment.recurrenceInterval || 1;
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

        if (isAfter(startOfDay(currentDate), endOfDay(appointment.recurrenceEndDate))) {
          break;
        }

        newAppointments.push({
          ...appointment,
          id: `${baseId}-${counter}`,
          date: currentDate
        });
      }
    }
    
    setAppointments(prev => {
      const nextAppointments = [...prev, ...newAppointments];
      setTimeout(() => saveState(projects, patients, nextAppointments), 0);
      return nextAppointments;
    });
  };

  const updateAppointment = (updatedAppointment: Appointment) => {
    const nextAppointments = appointments.map(a => a.id === updatedAppointment.id ? updatedAppointment : a);
    setAppointments(nextAppointments);
    saveState(projects, patients, nextAppointments);
  };

  const deleteAppointment = (appointment: Appointment) => {
    const baseId = appointment.id.split('-')[0];
    const targetDate = startOfDay(new Date(appointment.date));
    
    setAppointments(prev => {
      const nextAppointments = prev.filter(a => {
        const aBaseId = a.id.split('-')[0];
        if (aBaseId === baseId && !isBefore(startOfDay(new Date(a.date)), targetDate)) {
          return false;
        }
        return true;
      });
      setTimeout(() => saveState(projects, patients, nextAppointments), 0);
      return nextAppointments;
    });
  };

  return {
    projects,
    patients,
    appointments,
    addProject,
    updateProject,
    deleteProject,
    addPatient,
    deletePatient,
    syncProjectPatients,
    addAppointment,
    updateAppointment,
    deleteAppointment
  };
}
