import React, { useState } from 'react';
import { Appointment, Project, Patient } from './types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

const defaultProjects: Project[] = [];

const defaultPatients: Patient[] = [];

const defaultAppointments: Appointment[] = [];

const loadState = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (key === 'clincoord_appointments') {
        return parsed.map((a: any) => ({ 
          ...a, 
          date: new Date(a.date),
          recurrenceEndDate: a.recurrenceEndDate ? new Date(a.recurrenceEndDate) : undefined
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading state from localStorage', e);
  }
  return defaultValue;
};

export function useClinicalStore() {
  const [projects, setProjects] = useState<Project[]>(() => loadState('clincoord_projects', defaultProjects));
  const [patients, setPatients] = useState<Patient[]>(() => loadState('clincoord_patients', defaultPatients));
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadState('clincoord_appointments', defaultAppointments));

  // One-time cleanup to remove the legacy sample projects if they persist in local storage
  React.useEffect(() => {
    if (projects.some(p => ['Ensayo Beta-Neuro', 'Estudio Alpha-Cardio'].includes(p.name) || ['p1', 'p2'].includes(p.id))) {
      setProjects(prev => prev.filter(p => !['Ensayo Beta-Neuro', 'Estudio Alpha-Cardio'].includes(p.name) && !['p1', 'p2'].includes(p.id)));
      setPatients(prev => prev.filter(p => !['p1', 'p2'].includes(p.projectId)));
      setAppointments(prev => prev.filter(a => !['p1', 'p2'].includes(a.projectId)));
    }
  }, []);

  // Auto-save effects
  React.useEffect(() => {
    localStorage.setItem('clincoord_projects', JSON.stringify(projects));
  }, [projects]);

  React.useEffect(() => {
    localStorage.setItem('clincoord_patients', JSON.stringify(patients));
  }, [patients]);

  React.useEffect(() => {
    localStorage.setItem('clincoord_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Math.random().toString(36).substr(2, 9) };
    setProjects([...projects, newProject]);
    return newProject.id;
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setPatients(prev => prev.filter(p => p.projectId !== id));
    setAppointments(prev => prev.filter(a => a.projectId !== id));
  };

  const addPatient = (patient: Omit<Patient, 'id'>) => {
    const newPatient = { ...patient, id: Math.random().toString(36).substr(2, 9) };
    setPatients([...patients, newPatient]);
  };

  const deletePatient = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este paciente? Esta acción no se puede deshacer.')) {
      setPatients(patients.filter(p => p.id !== id));
      // Remove patient assignment from existing appointments
      setAppointments(appointments.map(a => a.patientId === id ? { ...a, patientId: undefined } : a));
    }
  };

  const syncProjectPatients = (projectId: string, newPatients: {id?: string, name: string}[]) => {
    setPatients(prev => {
      const otherPatients = prev.filter(p => p.projectId !== projectId);
      const updatedProjectPatients = newPatients.map(p => {
         if (p.id) {
           const existing = prev.find(ext => ext.id === p.id);
           return existing ? { ...existing, name: p.name } : { id: p.id, projectId, name: p.name, contact: '', notes: '' };
         }
         return { id: Math.random().toString(36).substr(2, 9), projectId, name: p.name, contact: '', notes: '' };
      });
      return [...otherPatients, ...updatedProjectPatients];
    });
  };

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const baseId = Math.random().toString(36).substr(2, 9);
    const newAppointments: Appointment[] = [];
    
    // Always add the initial appointment
    newAppointments.push({ ...appointment, id: baseId });

    if (appointment.recurrence !== 'none' && appointment.recurrenceEndDate) {
      const interval = appointment.recurrenceInterval || 1;
      let currentDate = appointment.date;
      let counter = 0;
      const MAX_OCCURRENCES = 365; // Safety limit
      
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
    setAppointments(appointments.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
  };

  const deleteAppointment = (appointment: Appointment) => {
    const baseId = appointment.id.split('-')[0];
    const targetDate = startOfDay(new Date(appointment.date));
    
    setAppointments(prev => prev.filter(a => {
      // If it belongs to the same recurrence series and its date is on or after the target date, remove it.
      const aBaseId = a.id.split('-')[0];
      if (aBaseId === baseId && !isBefore(startOfDay(new Date(a.date)), targetDate)) {
        return false; // remove
      }
      return true; // keep
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
