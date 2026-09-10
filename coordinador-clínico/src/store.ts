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
  const isNetworkUpdate = React.useRef(false);
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    const onInitialData = (data: { projects: Project[], patients: Patient[], appointments: any[] }) => {
      if (data && (data.projects?.length > 0 || data.patients?.length > 0 || data.appointments?.length > 0)) {
        isNetworkUpdate.current = true;
        if (data.projects?.length > 0) setProjects(data.projects);
        if (data.patients?.length > 0) setPatients(data.patients);
        if (data.appointments?.length > 0) setAppointments(parseAppointments(data.appointments));
      }
    };

    const onDataUpdated = (data: { projects: Project[], patients: Patient[], appointments: any[] }) => {
      if (data) {
        isNetworkUpdate.current = true;
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

  // Auto-save to localStorage and emit to server when local state changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Always save to localStorage on any state change
    localStorage.setItem('clincoord_projects', JSON.stringify(projects));
    localStorage.setItem('clincoord_patients', JSON.stringify(patients));
    localStorage.setItem('clincoord_appointments', JSON.stringify(appointments));

    // If the change came from the server, don't emit it back
    if (isNetworkUpdate.current) {
      isNetworkUpdate.current = false;
      return;
    }

    // Otherwise, broadcast local changes to the server
    socket.emit('update_data', {
      projects,
      patients,
      appointments
    });
  }, [projects, patients, appointments]);

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Math.random().toString(36).substr(2, 9) };
    setProjects(prev => [...prev, newProject]);
    return newProject.id;
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setPatients(prev => prev.filter(p => p.projectId !== id));
    setAppointments(prev => prev.filter(a => a.projectId !== id));
  };

  const addPatient = (patient: Omit<Patient, 'id'>) => {
    const newPatient = { ...patient, id: Math.random().toString(36).substr(2, 9) };
    setPatients(prev => [...prev, newPatient]);
  };

  const deletePatient = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este paciente? Esta acción no se puede deshacer.')) {
      setPatients(prev => prev.filter(p => p.id !== id));
      setAppointments(prev => prev.map(a => a.patientId === id ? { ...a, patientId: undefined } : a));
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
      return [...otherPatients, ...updatedProjectPatients];
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
    
    setAppointments(prev => [...prev, ...newAppointments]);
  };

  const updateAppointment = (updatedAppointment: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
  };

  const deleteAppointment = (appointment: Appointment) => {
    const baseId = appointment.id.split('-')[0];
    const targetDate = startOfDay(new Date(appointment.date));
    
    setAppointments(prev => prev.filter(a => {
      const aBaseId = a.id.split('-')[0];
      if (aBaseId === baseId && !isBefore(startOfDay(new Date(a.date)), targetDate)) {
        return false;
      }
      return true;
    }));
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
