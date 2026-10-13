import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { ProjectModal } from './components/ProjectModal';
import { AppointmentModal } from './components/AppointmentModal';
import { SettingsModal } from './components/SettingsModal';
import { useClinicalStore } from './store';
import { Project, Appointment } from './types';
import { isWithinInterval, startOfDay, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Menu, RefreshCw, Cloud, CloudUpload, Check } from 'lucide-react';

export default function App() {
  const { 
    projects, 
    patients, 
    appointments, 
    syncStatus, 
    syncErrorDetail,
    retrySync,
    syncAllToCloud,
    addProject, 
    updateProject, 
    deletePatient, 
    syncProjectPatients, 
    addAppointment, 
    updateAppointment, 
    deleteAppointment, 
    addClinicalSchedule 
  } = useClinicalStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    const result = await syncAllToCloud();
    setSyncFeedback(result.message);
    setTimeout(() => {
      setSyncFeedback(null);
    }, 4500);
  };

  const handleDayClick = (date: Date) => {
    if (projects.length === 0) {
      alert("Por favor, crea un proyecto primero antes de añadir citas.");
      return;
    }
    setSelectedDate(date);
    setEditingAppointment(undefined);
    setIsAppointmentModalOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingProject(undefined);
  };

  const handleSaveProject = async (projectData: Omit<Project, 'id'> | Project, projectPatients: {id?: string, name: string, color?: string}[]) => {
    let savedProjectId = '';
    if ('id' in projectData) {
      updateProject(projectData as Project);
      savedProjectId = projectData.id;
    } else {
      savedProjectId = await addProject(projectData);
    }
    // Pass patients explicitly to avoid stale closure after async addProject
    syncProjectPatients(savedProjectId, projectPatients, patients);
  };

  const handleSaveAppointment = (appointment: Omit<Appointment, 'id'> | Appointment) => {
    if ('id' in appointment) {
      updateAppointment(appointment as Appointment);
    } else {
      addAppointment(appointment);
    }
  };

  const filteredAppointments = appointments.filter(app => {
    if (selectedProjectId && app.projectId !== selectedProjectId) return false;
    if (selectedPatientId && app.patientId !== selectedPatientId) return false;
    return true;
  });

  const today = startOfDay(new Date());
  const upcomingWindow = addDays(today, 7);
  const upcomingAppointments = appointments
    .filter(app => {
      const appDate = new Date(app.date);
      return isWithinInterval(appDate, { start: today, end: upcomingWindow });
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF9F6] text-[#4F4F4F] font-sans">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile drawer & Desktop fixed */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out z-50 md:z-10 h-full`}>
        <Sidebar 
          projects={projects}
          patients={patients}
          appointments={appointments}
          selectedProjectId={selectedProjectId}
          selectedPatientId={selectedPatientId}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setSelectedPatientId(null);
            setIsMobileMenuOpen(false); // Close menu on select in mobile
          }}
          onSelectPatient={(id) => {
            setSelectedPatientId(id);
            setIsMobileMenuOpen(false);
          }}
          onClearSelection={() => {
            setSelectedProjectId(null);
            setSelectedPatientId(null);
            setIsMobileMenuOpen(false);
          }}
          onNewProject={() => { setEditingProject(undefined); setIsProjectModalOpen(true); setIsMobileMenuOpen(false); }}
          onEditProject={openEditProject}
          onNewPatient={() => {}}
          onDeletePatient={deletePatient}
          onOpenSettings={() => { setIsSettingsModalOpen(true); setIsMobileMenuOpen(false); }}
          onEditAppointment={handleAppointmentClick}
        />
      </div>
      
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="bg-white border-b border-[#EAE7E2] px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <button 
              className="md:hidden p-1 mr-1 text-gray-600 hover:bg-gray-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-[#007B83] hidden sm:inline">Viendo:</span>
            <span className="text-sm font-semibold text-[#4F4F4F] truncate max-w-[120px] sm:max-w-none">
              {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : 'Todos los Proyectos'}
            </span>
            {selectedPatientId && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-[#4F4F4F] truncate max-w-[100px] sm:max-w-none">{patients.find(p => p.id === selectedPatientId)?.name}</span>
              </>
            )}

            {/* Botón y estado de Copia Online en la Nube */}
            <div className="relative ml-2 flex items-center">
              {syncStatus === 'synced' && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300/80 hover:bg-emerald-100 transition-all shadow-xs cursor-pointer"
                  title="Guardado automáticamente en la nube. Pulsa para forzar guardado en todos los dispositivos."
                >
                  <Cloud size={13} className="text-emerald-600 shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline">Copia online activa</span>
                  <span className="sm:hidden">Online</span>
                </button>
              )}

              {syncStatus === 'syncing' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <RefreshCw size={11} className="animate-spin text-blue-600 shrink-0" />
                  <span className="hidden sm:inline">Guardando en la nube...</span>
                  <span className="sm:hidden">Guardando...</span>
                </span>
              )}

              {syncStatus === 'error' && (
                <button 
                  type="button"
                  onClick={handleManualSync}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all shadow-xs cursor-pointer animate-pulse" 
                  title={syncErrorDetail ? `Aviso: ${syncErrorDetail}. Pulsa para sincronizar ahora.` : "Pulsa para subir copia a la nube y sincronizar todos tus dispositivos."}
                >
                  <CloudUpload size={13} className="text-amber-700 shrink-0" />
                  <span>Subir copia a la nube</span>
                </button>
              )}

              {syncFeedback && (
                <div className="absolute left-0 top-full mt-1.5 z-50 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-gray-700">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditingProject(undefined); setIsProjectModalOpen(true); }}
              className="bg-[#007B83] text-white px-3 md:px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm hover:bg-[#00666D] transition-colors whitespace-nowrap"
            >
              <span className="hidden sm:inline">Añadir Proyecto</span>
              <span className="sm:hidden">+ Proy</span>
            </button>
            <button 
              onClick={() => {
                if (selectedProjectId) {
                  const p = projects.find(p => p.id === selectedProjectId);
                  if (p) openEditProject(p);
                }
              }}
              disabled={!selectedProjectId}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors border whitespace-nowrap ${selectedProjectId ? 'bg-[#F9F8F6] border-[#EAE7E2] text-[#4F4F4F] hover:bg-gray-50' : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              <span className="hidden sm:inline">Editar Proyecto</span>
              <span className="sm:hidden">Editar</span>
            </button>
          </div>
        </header>
        
        <CalendarView 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          appointments={filteredAppointments}
          projects={projects}
          patients={patients}
          onDayClick={handleDayClick}
          onAppointmentClick={handleAppointmentClick}
        />
      </main>

      {/* Modals */}
      {isProjectModalOpen && (
        <ProjectModal 
          onClose={handleCloseProjectModal}
          onSave={handleSaveProject}
          initialData={editingProject}
          initialPatients={editingProject ? patients.filter(p => p.projectId === editingProject.id) : undefined}
        />
      )}

      {isAppointmentModalOpen && (
        <AppointmentModal 
          onClose={() => setIsAppointmentModalOpen(false)}
          onSave={handleSaveAppointment}
          onDelete={deleteAppointment}
          onGenerateClinicalSchedule={addClinicalSchedule}
          projects={projects}
          patients={patients}
          initialDate={selectedDate}
          initialData={editingAppointment}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}
      
    </div>
  );
}
