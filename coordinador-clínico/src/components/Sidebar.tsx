import React, { useState } from 'react';
import { Briefcase, Calendar as CalendarIcon, Plus, UserCircle, Settings, Edit3, ChevronRight, ChevronDown, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { Project, Appointment, Patient } from '../types';
import { isAfter, isBefore, addDays, startOfDay, isSameDay, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface SidebarProps {
  projects: Project[];
  patients: Patient[];
  appointments: Appointment[];
  selectedProjectId: string | null;
  selectedPatientId: string | null;
  onSelectProject: (id: string) => void;
  onSelectPatient: (id: string) => void;
  onClearSelection: () => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onNewPatient: () => void;
  onDeletePatient: (id: string) => void;
  onOpenSettings: () => void;
  onEditAppointment: (appointment: Appointment) => void;
}

export function Sidebar({ 
  projects, patients, appointments, 
  selectedProjectId, selectedPatientId, 
  onSelectProject, onSelectPatient, onClearSelection,
  onNewProject, onEditProject, onNewPatient, onDeletePatient, onOpenSettings,
  onEditAppointment
}: SidebarProps) {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const upcomingAppointments = appointments
    .filter(app => {
      const appDate = new Date(app.date);
      return isWithinInterval(appDate, { start: today, end: nextWeek });
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="w-72 bg-white border-r border-[#EAE7E2] p-6 flex flex-col gap-6 z-10 relative overflow-hidden h-full overflow-y-auto">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#BF0065] flex items-center gap-3">
            <div className="w-10 flex items-center justify-center shrink-0 text-4xl">
              🧠
            </div>
            <span className="leading-tight">Calendario de visitas</span>
          </h1>
          <div className="flex flex-col pl-[52px] gap-0.5">
            <span className="text-sm font-semibold text-gray-700">👤 María Pérez García</span>
            <span className="text-xs font-medium text-gray-500">Study Coordinator</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-hidden flex-1">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#999]">Proyectos Activos</h3>
              {(selectedProjectId || selectedPatientId) && (
                <button onClick={onClearSelection} className="text-[10px] text-[#007B83] font-bold uppercase hover:underline">
                  Ver Todo
                </button>
              )}
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-[45vh] pr-2 custom-scrollbar">
              {projects.length === 0 ? (
                 <p className="text-sm text-gray-400 italic">No hay proyectos activos.</p>
              ) : (
                projects.map(project => {
                  const projectPatients = patients.filter(p => p.projectId === project.id);
                  const isExpanded = expandedProjects[project.id];
                  const isSelected = selectedProjectId === project.id && !selectedPatientId;

                  return (
                    <div key={project.id} className="flex flex-col gap-1">
                      <div 
                        onClick={() => onSelectProject(project.id)}
                        className={`p-3 border rounded-xl transition-all relative group cursor-pointer ${
                          isSelected ? 'bg-[#F9F8F6] border-[#007B83] shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold text-[#4F4F4F] truncate pr-4 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${project.color}`}></span>
                            {project.name}
                          </p>
                        </div>
                        <p className="text-[11px] opacity-70 truncate mt-0.5 ml-4 pr-8">{project.generalData}</p>
                        
                        {projectPatients.length > 0 && (
                          <div 
                            className="mt-2 ml-4 flex gap-1 items-center text-[10px] text-gray-500 hover:text-gray-800"
                            onClick={(e) => toggleProject(project.id, e)}
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {projectPatients.length} pacientes
                          </div>
                        )}
                      </div>

                      {/* Nested Patients */}
                      {isExpanded && projectPatients.length > 0 && (
                        <div className="pl-6 space-y-1 mt-1 mb-2">
                          {projectPatients.map(patient => {
                            const isPatientSelected = selectedPatientId === patient.id;
                            return (
                              <div
                                key={patient.id}
                                onClick={() => onSelectPatient(patient.id)}
                                className={`text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${
                                  isPatientSelected ? 'bg-[#E5F2F3] text-[#007B83] font-semibold' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <span className="truncate">{patient.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {isPatientSelected && <CheckCircle2 size={12} className="text-[#007B83]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {upcomingAppointments.length > 0 && (
          <div className="mt-auto bg-amber-50 border border-amber-200 rounded-xl p-4 shrink-0 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Citas Próximas</h3>
            </div>
            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
              {upcomingAppointments.map(app => {
                const project = projects.find(p => p.id === app.projectId);
                return (
                  <div 
                    key={app.id} 
                    onClick={() => onEditAppointment(app)}
                    className="bg-white border border-amber-100/80 rounded-lg p-2.5 text-xs shadow-sm cursor-pointer hover:bg-amber-100/30 transition-colors border-l-2 flex flex-col gap-1"
                    style={{ borderLeftColor: project?.color ? project.color.replace('bg-[', '').replace(']', '') : '#f59e0b' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 capitalize">{format(new Date(app.date), 'dd MMM', { locale: es })}</span>
                      <span className="text-amber-700/80 font-medium text-[10px]">{format(new Date(app.date), 'HH:mm')}</span>
                    </div>
                    <span className="text-amber-800 truncate font-medium">{app.title}</span>
                    {project && (
                      <span className="text-amber-700/70 text-[9px] uppercase tracking-wider font-bold truncate">{project.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
