import React, { useState, useEffect } from 'react';
import { X, Trash2, CalendarDays, Sparkles } from 'lucide-react';
import { Appointment, Project, RecurrenceType, Patient, CLINICAL_VISIT_PERIODS } from '../types';
import { format } from 'date-fns';

interface AppointmentModalProps {
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id'> | Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onGenerateClinicalSchedule?: (d1Appointment: Omit<Appointment, 'id'>) => Promise<void> | void;
  projects: Project[];
  patients: Patient[];
  initialDate?: Date;
  initialData?: Appointment;
}

export function AppointmentModal({ 
  onClose, 
  onSave, 
  onDelete, 
  onGenerateClinicalSchedule,
  projects, 
  patients, 
  initialDate, 
  initialData 
}: AppointmentModalProps) {
  const [projectId, setProjectId] = useState(initialData?.projectId || projects[0]?.id || '');
  const [patientId, setPatientId] = useState(initialData?.patientId || '');
  const [title, setTitle] = useState(initialData?.title || '');
  
  const initialCat = initialData?.category;
  const isCustom = initialCat && !['Visita', 'Pedir hielo', 'Enfermería', 'Analítica / Laboratorio'].includes(initialCat);
  const [categoryPreset, setCategoryPreset] = useState<string>(isCustom ? 'custom' : (initialCat || 'Visita'));
  const [customCategory, setCustomCategory] = useState<string>(isCustom ? initialCat : '');
  
  const [date, setDate] = useState(initialData?.date ? format(initialData.date, 'yyyy-MM-dd') : (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));
  const [time, setTime] = useState(initialData?.time || '09:00');
  
  // Clinical protocol visit period
  const [visitPeriod, setVisitPeriod] = useState<string>(initialData?.visitPeriod || '');
  const [autoGenerateProtocol, setAutoGenerateProtocol] = useState<boolean>(true);
  const [flexibilityDays, setFlexibilityDays] = useState(initialData?.flexibilityDays ?? 0);
  
  // Legacy / advanced recurrence
  const [showAdvancedRecurrence, setShowAdvancedRecurrence] = useState<boolean>(
    Boolean(initialData?.recurrence && initialData.recurrence !== 'none')
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>(initialData?.recurrence || 'none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialData?.recurrenceInterval || 1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData?.recurrenceEndDate ? format(initialData.recurrenceEndDate, 'yyyy-MM-dd') : '');
  
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If initialData has a title starting with a period key and no visitPeriod, detect it
  useEffect(() => {
    if (!visitPeriod && initialData?.title) {
      const match = initialData.title.match(/^(Screening|D1|M0\.5|M0,5|M1\.5|M1,5|M2\.5|M2,5|M\d+)\b/i);
      if (match) {
        setVisitPeriod(match[1].replace(',', '.'));
      }
    }
  }, [initialData, visitPeriod]);

  const handlePeriodChange = (selectedKey: string) => {
    setVisitPeriod(selectedKey);

    if (selectedKey === 'none') {
      return;
    }

    const period = CLINICAL_VISIT_PERIODS.find(p => p.key === selectedKey);
    if (period) {
      setFlexibilityDays(period.defaultWindow);

      // Auto-set title nicely if empty or generic
      const isGeneric = !title || title.trim() === 'Visita' || /^(Screening|D1|M0\.5|M0,5|M1\.5|M1,5|M2\.5|M2,5|M\d+)\s*[–-]?/i.test(title);
      if (isGeneric) {
        if (selectedKey === 'Screening') {
          setTitle('Screening – Pruebas iniciales');
        } else if (selectedKey === 'D1') {
          setTitle('D1 – Inicio de tratamiento');
        } else {
          setTitle(`${period.key} – Visita`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !date || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const appointmentDate = new Date(`${date}T${time || '00:00'}:00`);
      const finalCategory = categoryPreset === 'custom' ? customCategory : categoryPreset;
      
      const apptData: Omit<Appointment, 'id'> | Appointment = {
        ...(initialData ? { id: initialData.id } : {}),
        projectId,
        patientId: patientId || undefined,
        title,
        category: finalCategory,
        date: appointmentDate,
        time,
        recurrence: showAdvancedRecurrence ? recurrence : 'none',
        recurrenceInterval: showAdvancedRecurrence ? recurrenceInterval : 1,
        recurrenceEndDate: showAdvancedRecurrence && recurrenceEndDate ? new Date(recurrenceEndDate + 'T23:59:59') : undefined,
        flexibilityDays,
        notes,
        visitPeriod: visitPeriod && visitPeriod !== 'none' ? visitPeriod : undefined,
      };

      // If D1 and autoGenerateProtocol is enabled for a new appointment, generate full protocol
      if (visitPeriod === 'D1' && autoGenerateProtocol && onGenerateClinicalSchedule && !initialData) {
        await onGenerateClinicalSchedule(apptData);
      } else {
        await onSave(apptData);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => p.projectId === projectId);

  // Auto-clear patient if project changes and patient doesn't belong to it
  useEffect(() => {
    if (patientId && !filteredPatients.find(p => p.id === patientId)) {
      setPatientId('');
    }
  }, [projectId, filteredPatients, patientId]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-[#EAE7E2]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE7E2] flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#007B83]" />
            <h2 className="text-sm font-bold text-[#007B83]">
              {initialData ? 'Editar Tarea Clínica' : 'Nueva Tarea Clínica'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="overflow-y-auto p-6">
          <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Título */}
              <div className="md:col-span-1">
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Título de la cita *
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                  placeholder="Ej. D1 – Visita basal, M0,5 – Analítica..."
                  required
                />
              </div>

              {/* Categoría */}
              <div className="md:col-span-1">
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Categoría de la Tarea *
                </label>
                <select
                  value={categoryPreset}
                  onChange={e => setCategoryPreset(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83] mb-2"
                >
                  <option value="Visita">Visita</option>
                  <option value="Analítica / Laboratorio">Analítica / Laboratorio</option>
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
                    className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                    placeholder="Escribe la categoría..."
                    required
                  />
                )}
              </div>

              {/* Proyecto Clínico */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Proyecto Clínico *
                </label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                  required
                >
                  <option value="" disabled>Seleccione un proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Paciente */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Paciente
                </label>
                <select
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                >
                  <option value="">-- Sin asignar --</option>
                  {filteredPatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Fecha *
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                  required
                />
              </div>

              {/* Hora */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                  Hora
                </label>
                <input 
                  type="time" 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                />
              </div>
            </div>

            {/* SECCIÓN DEL PROTOCOLO CLÍNICO / PERIODICIDAD */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EAE7E2] flex flex-col gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase font-bold text-[#007B83] flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-[#007B83]" />
                    Periodicidad del Protocolo Clínico
                  </label>
                  <span className="text-[10px] font-semibold text-[#007B83] bg-[#007B83]/10 px-2 py-0.5 rounded-full">
                    Protocolo Actividades
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">
                  ¿A qué mes o período de visita corresponde?
                </p>
                
                <select
                  value={visitPeriod || 'none'}
                  onChange={e => handlePeriodChange(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-white border border-[#007B83]/30 rounded-lg outline-none focus:border-[#007B83] shadow-sm text-gray-800"
                >
                  <option value="none">-- Cita puntual (sin período de protocolo) --</option>
                  
                  <optgroup label="Fase Inicial / Pruebas">
                    <option value="Screening">Screening (Días -35 a -1) – Pruebas iniciales (±3 días)</option>
                    <option value="D1">⭐ D1 – Día 1 (Inicio de tratamiento)</option>
                  </optgroup>
                  
                  <optgroup label="Core Treatment cada 15 días (Ventana ±3 días)">
                    <option value="M0.5">M0,5 – Mitad de mes 1 (Día 15 / ±3 días)</option>
                    <option value="M1">M1 – Mes 1 (Día 30 / ±3 días)</option>
                    <option value="M1.5">M1,5 – Mitad de mes 2 (Día 45 / ±3 días)</option>
                    <option value="M2">M2 – Mes 2 (Día 60 / ±3 días)</option>
                    <option value="M2.5">M2,5 – Mitad de mes 3 (Día 75 / ±3 días)</option>
                    <option value="M3">M3 – Mes 3 (Día 90 / ±3 días)</option>
                  </optgroup>
                  
                  <optgroup label="Seguimiento semestral (Ventana ±7 días)">
                    <option value="M6">M6 – Mes 6 (Día 180 / ±7 días)</option>
                    <option value="M9">M9 – Mes 9 (Día 270 / ±7 días)</option>
                  </optgroup>
                  
                  <optgroup label="Seguimiento trimestral / anual (Ventana ±10 días)">
                    <option value="M12">M12 – Mes 12 / 1 año (Día 360 / ±10 días)</option>
                    <option value="M15">M15 – Mes 15 (Día 450 / ±10 días)</option>
                    <option value="M18">M18 – Mes 18 (Día 540 / ±10 días)</option>
                    <option value="M21">M21 – Mes 21 (Día 630 / ±10 días)</option>
                    <option value="M24">M24 – Mes 24 / 2 años (Día 720 / ±10 días)</option>
                    <option value="M27">M27 – Mes 27 (Día 810 / ±10 días)</option>
                    <option value="M30">M30 – Mes 30 (Día 900 / ±10 días)</option>
                    <option value="M33">M33 – Mes 33 (Día 990 / ±10 días)</option>
                    <option value="M36">M36 – Mes 36 / 3 años (Día 1080 / ±10 días)</option>
                  </optgroup>
                </select>
              </div>

              {/* Banner generador cuando se elige D1 */}
              {visitPeriod === 'D1' && !initialData && (
                <div className="bg-emerald-50 border border-emerald-300/80 rounded-xl p-3.5 flex flex-col gap-2 transition-all">
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-900 select-none">
                        <input 
                          type="checkbox"
                          checked={autoGenerateProtocol}
                          onChange={e => setAutoGenerateProtocol(e.target.checked)}
                          className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                        />
                        Generar automáticamente todas las visitas del protocolo a partir de D1
                      </label>
                      <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                        Se añadirán automáticamente todas las citas cada 15 días: <strong>M0,5</strong> (D15), <strong>M1</strong> (D30), <strong>M1,5</strong> (D45), <strong>M2</strong> (D60), <strong>M2,5</strong> (D75), <strong>M3</strong> (D90) con margen de <strong>±3 días</strong>; <strong>M6 y M9</strong> con <strong>±7 días</strong>; y las visitas anuales/trimestrales con <strong>±10 días</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Ventana de Amplitud (Flexibilidad) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-200/70">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                    Ventana de Amplitud (Flexibilidad)
                  </label>
                  <select
                    value={flexibilityDays}
                    onChange={e => setFlexibilityDays(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-md outline-none focus:border-[#007B83]"
                  >
                    <option value={0}>Día exacto (sin ventana)</option>
                    <option value={1}>± 1 día</option>
                    <option value={2}>± 2 días</option>
                    <option value={3}>± 3 días (Protocolo D1 a M3)</option>
                    <option value={7}>± 7 días (Protocolo M6 y M9)</option>
                    <option value={10}>± 10 días (Protocolo M12 en adelante)</option>
                    <option value={14}>± 14 días</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  {flexibilityDays > 0 ? (
                    <span className="text-[11px] text-[#007B83] bg-[#007B83]/10 px-2.5 py-1.5 rounded-md font-medium">
                      ✓ Margen de ±{flexibilityDays} días visible en el calendario
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      Cita programada para el día exacto
                    </span>
                  )}
                </div>
              </div>

              {/* Opción desplegable para repetición personalizada */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedRecurrence(!showAdvancedRecurrence)}
                  className="text-[10px] text-gray-500 hover:text-gray-700 underline font-medium"
                >
                  {showAdvancedRecurrence ? '− Ocultar repetición estándar' : '+ ¿Necesitas repetición periódica fija (semanal / mensual / cada X días)?'}
                </button>

                {showAdvancedRecurrence && (
                  <div className="mt-2.5 p-3 bg-white border border-gray-200 rounded-lg flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Tipo</label>
                        <select
                          value={recurrence}
                          onChange={e => setRecurrence(e.target.value as RecurrenceType)}
                          className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded outline-none"
                        >
                          <option value="none">Sin repetición</option>
                          <option value="daily">Cada X días</option>
                          <option value="weekly">Cada X semanas</option>
                          <option value="monthly">Cada X meses</option>
                        </select>
                      </div>
                      {recurrence !== 'none' && (
                        <>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Cada (número)</label>
                            <input 
                              type="number"
                              min="1"
                              value={recurrenceInterval}
                              onChange={e => setRecurrenceInterval(Number(e.target.value))}
                              className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Hasta (opcional)</label>
                            <input 
                              type="date"
                              value={recurrenceEndDate}
                              onChange={e => setRecurrenceEndDate(e.target.value)}
                              className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Notas / Incidencias */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">
                Anotaciones / Incidencias
              </label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#007B83] min-h-[75px] resize-none"
                placeholder="Notas de evolución, pruebas a realizar, etc..."
              />
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EAE7E2] flex justify-between gap-3 bg-white">
          <div>
            {initialData && onDelete && (
              <button 
                type="button" 
                onClick={() => {
                  onDelete(initialData);
                  onClose();
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
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
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              form="appointment-form"
              type="submit"
              disabled={isSubmitting}
              className="bg-[#007B83] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-[#006066] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : initialData ? 'Guardar Cambios' : (visitPeriod === 'D1' && autoGenerateProtocol ? 'Guardar y Generar Protocolo' : 'Programar Tarea')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
