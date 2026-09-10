import React, { useState, useEffect, useCallback } from 'react';
import { Appointment, Project, Patient } from './types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { supabase } from './supabaseClient';

const defaultProjects: Project[] = [];
const defaultPatients: Patient[] = [];
const defaultAppointments: Appointment[] = [];

const parseAppointments = (appointments: any[]) => {
  return appointments.map((a: any) => ({ 
    ...a, 
    date: new Date(a.date),
    recurrenceEndDate: a.recurrenceEndDate ? new Date(a.recurrenceEndDate) : undefined
  }));
};

const generateId = () => crypto.randomUUID();

export function useClinicalStore() {
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [patients, setPatients] = useState<Patient[]>(defaultPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(defaultAppointments);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, patientsRes, appointmentsRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('patients').select('*'),
          supabase.from('appointments').select('*')
        ]);

        if (projectsRes.data) setProjects(projectsRes.data as Project[]);
        if (patientsRes.data) setPatients(patientsRes.data as Patient[]);
        if (appointmentsRes.data) setAppointments(parseAppointments(appointmentsRes.data));
      } catch (error) {
        console.error('Error fetching initial data from Supabase', error);
      }
    };

    fetchData();
  }, []);

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
    // Optimistic update
    setProjects(prev => [...prev, newProject]);
    const { error } = await supabase.from('projects').insert(newProject);
    if (error) console.error('Error adding project', error);
    return newProject.id;
  };

  const updateProject = async (updatedProject: Project) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    const { error } = await supabase.from('projects').update(updatedProject).eq('id', updatedProject.id);
    if (error) console.error('Error updating project', error);
  };

  const deleteProject = async (id: string) => {
    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== id));
    setPatients(prev => prev.filter(p => p.projectId !== id));
    setAppointments(prev => prev.filter(a => a.projectId !== id));
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) console.error('Error deleting project', error);
  };

  const addPatient = async (patient: Omit<Patient, 'id'>) => {
    const newPatient = { ...patient, id: generateId() };
    // Optimistic update
    setPatients(prev => [...prev, newPatient]);
    const { error } = await supabase.from('patients').insert(newPatient);
    if (error) console.error('Error adding patient', error);
  };

  const deletePatient = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este paciente? Esta acción no se puede deshacer.')) {
      // Optimistic update
      setPatients(prev => prev.filter(p => p.id !== id));
      setAppointments(prev => prev.map(a => a.patientId === id ? { ...a, patientId: undefined } : a));
      
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) console.error('Error deleting patient', error);
      
      // Update appointments on server too
      await supabase.from('appointments').update({ patientId: null }).eq('patientId', id);
    }
  };

  const syncProjectPatients = async (projectId: string, newPatients: {id?: string, name: string, color?: string}[]) => {
    const newPatientsToInsert: Patient[] = [];
    const patientsToUpdate: Patient[] = [];
    
    setPatients(prev => {
      const otherPatients = prev.filter(p => p.projectId !== projectId);
      const updatedProjectPatients = newPatients.map(p => {
         if (p.id) {
           const existing = prev.find(ext => ext.id === p.id);
           const updated = existing ? { ...existing, name: p.name, color: p.color } : { id: p.id, projectId, name: p.name, contact: '', notes: '', color: p.color };
           patientsToUpdate.push(updated);
           return updated;
         }
         const newPat = { id: generateId(), projectId, name: p.name, contact: '', notes: '', color: p.color };
         newPatientsToInsert.push(newPat);
         return newPat;
      });
      return [...otherPatients, ...updatedProjectPatients];
    });

    for (const pat of newPatientsToInsert) {
       await supabase.from('patients').insert(pat);
    }
    for (const pat of patientsToUpdate) {
       await supabase.from('patients').update(pat).eq('id', pat.id);
    }
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    const baseId = generateId();
    const newAppointments: Appointment[] = [];
    
    newAppointments.push({ ...appointment, id: baseId });

    if (appointment.recurrence !== 'none') {
      const interval = appointment.recurrenceInterval || 1;
      // If no end date is set, default to 1 year from the start date
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
          flexibilityDays: appointment.flexibilityDays // ensure flexibility is propagated
        });
      }
    }
    
    // Optimistic update
    setAppointments(prev => [...prev, ...newAppointments]);
    
    // Convert dates to strings for Supabase insertion
    const dbAppointments = newAppointments.map(a => ({
        ...a,
        date: a.date.toISOString(),
        recurrenceEndDate: a.recurrenceEndDate ? a.recurrenceEndDate.toISOString() : null
    }));

    const { error } = await supabase.from('appointments').insert(dbAppointments);
    if (error) console.error('Error adding appointments', error);
  };

  const updateAppointment = async (updatedAppointment: Appointment) => {
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
    
    const dbAppt = {
        ...updatedAppointment,
        date: updatedAppointment.date.toISOString(),
        recurrenceEndDate: updatedAppointment.recurrenceEndDate ? updatedAppointment.recurrenceEndDate.toISOString() : null
    };
    
    const { error } = await supabase.from('appointments').update(dbAppt).eq('id', updatedAppointment.id);
    if (error) console.error('Error updating appointment', error);
  };

  const deleteAppointment = async (appointment: Appointment) => {
    const baseId = appointment.id.split('-')[0];
    const targetDate = startOfDay(new Date(appointment.date));
    
    // Gather IDs to delete
    const idsToDelete = appointments.filter(a => {
      const aBaseId = a.id.split('-')[0];
      if (aBaseId === baseId && !isBefore(startOfDay(new Date(a.date)), targetDate)) {
        return true;
      }
      return false;
    }).map(a => a.id);

    // Optimistic update
    setAppointments(prev => prev.filter(a => !idsToDelete.includes(a.id)));
    
    // Delete from Supabase in batches or IN clause
    if (idsToDelete.length > 0) {
      const { error } = await supabase.from('appointments').delete().in('id', idsToDelete);
      if (error) console.error('Error deleting appointments', error);
    }
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
