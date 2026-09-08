import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Appointment, Project, RecurrenceType, Patient } from '../types';
import { format } from 'date-fns';

interface AppointmentModalProps {
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id'> | Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  projects: Project[];
  patients: Patient[];
  initialDate?: Date;
  initialData?: Appointment;
}

export function AppointmentModal({ onClose, onSave, onDelete, projects, patients, initialDate, initialData }: AppointmentModalProps) {
  const [projectId, setProjectId] = useState(initialData?.projectId || projects[0]?.id || '');
  const [patientId, setPatientId] = useState(initialData?.patientId || '');
  const [title, setTitle] = useState(initialData?.title || '');
  
  const initialCat = initialData?.category;
  const isCustom = initialCat && !['Visita', 'Pedir hielo', 'Enfermería'].includes(initialCat);
  const [categoryPreset, setCategoryPreset] = useState<string>(isCustom ? 'custom' : (initialCat || 'Visita'));
  const [customCategory, setCustomCategory] = useState<string>(isCustom ? initialCat : '');
  
  const [date, setDate] = useState(initialData?.date ? format(initialData.date, 'yyyy-MM-dd') : (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));
  const [time, setTime] = useState(initialData?.time || '09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(initialData?.recurrence || 'none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialData?.recurrenceInterval || 1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData?.recurrenceEndDate ? format(initialData.recurrenceEndDate, 'yyyy-MM-dd') : '');
  const [flexibilityDays, setFlexibilityDays] = useState(initialData?.flexibilityDays || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !date) return;
    
    const appointmentDate = new Date(`${date}T${time || '00:00'}:00`);
    const finalCategory = categoryPreset === 'custom' ? customCategory : categoryPreset;
    
    onSave({
      ...(initialData ? { id: initialData.id } : {}),
      projectId,
      patientId: patientId || undefined,
      title,
      category: finalCategory,
      date: appointmentDate,
      time,
      recurrence,
      recurrenceInterval,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate + 'T23:59:59') : undefined,
      flexibilityDays,
      notes
    });
    onClose();
  };

  const filteredPatients = patients.filter(p => p.projectId === projectId);

  // Auto-clear patient if project changes and patient doesn't belong to it
  useEffect(() => {
    if (patientId && !filteredPatients.find(p => p.id === patientId)) {
      setPatientId('');
    }
  }, [projectId, filteredPatients, patientId]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#EAE7E2]">
        <div className="px-6 py-4 border-b border-[#EAE7E2] flex justify-between items-center bg-white">
          <h2 className="text-sm font-bold text-[#007B83]">{initialData ? 'Editar Tarea Clínica' : 'Nueva Tarea Clínica'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-1">
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Título de la cita *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  placeholder="Ej. Visita basal, Seguimiento mensual..."
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Categoría de la Tarea *</label>
                <select
                  value={categoryPreset}
                  onChange={e => setCategoryPreset(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB] mb-2"
                >
                  <option value="Visita">Visita</option>
                  <option value="Pedir hielo">Pedir hielo</option>
                  <option value="Enfermería">Enfermería</option>
                  <option value="">Sin categoría</option>
                  <option value="custom">Otra (Especificar...)</option>
                </select>
                {categoryPreset === 'custom' && (
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                    placeholder="Escribe la categoría..."
                    required
                  />
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Proyecto Clínico *</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  required
                >
                  <option value="" disabled>Seleccione un proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Paciente</label>
                <select
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                >
                  <option value="">-- Sin asignar --</option>
                  {filteredPatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Fecha *</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Hora</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Ventana Flexible</label>
                  <select
                    value={flexibilityDays}
                    onChange={e => setFlexibilityDays(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  >
                    <option value={0}>Día exacto</option>
                    <option value={1}>± 1 día</option>
                    <option value={2}>± 2 días</option>
                    <option value={3}>± 3 días</option>
                    <option value={7}>± 7 días</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={recurrence !== 'none' ? 'sm:col-span-1' : 'sm:col-span-3'}>
                  <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Periodicidad</label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                  >
                    <option value="none">Única</option>
                    <option value="daily">Días</option>
                    <option value="weekly">Semanas</option>
                    <option value="monthly">Meses</option>
                  </select>
                </div>
                {recurrence !== 'none' && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Cada (X)</label>
                      <input 
                        type="number"
                        min="1"
                        value={recurrenceInterval}
                        onChange={e => setRecurrenceInterval(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Fecha Fin</label>
                      <input 
                        type="date"
                        value={recurrenceEndDate}
                        onChange={e => setRecurrenceEndDate(e.target.value)}
                        className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Anotaciones / Incidencias</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB] min-h-[80px] resize-none"
                placeholder="Notas de evolución, requerimientos del paciente..."
              />
            </div>
            
          </form>
        </div>

        <div className="px-6 py-4 border-t border-[#EAE7E2] flex justify-between gap-3 bg-white">
          <div>
            {initialData && onDelete && (
              <button 
                type="button" 
                onClick={() => {
                  onDelete(initialData);
                  onClose();
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Borrar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-[#4F4F4F] hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              form="appointment-form"
              type="submit"
              className="bg-[#B5D8EB] text-[#1E3A4C] px-6 py-2 rounded-lg text-xs font-bold hover:shadow-md transition-shadow"
            >
              {initialData ? 'Guardar Cambios' : 'Programar Tarea'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
