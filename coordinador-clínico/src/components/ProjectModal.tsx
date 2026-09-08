import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Project, Patient } from '../types';

interface ProjectModalProps {
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> | Project, patients: {id?: string, name: string, color?: string}[]) => void;
  initialData?: Project;
  initialPatients?: Patient[];
}

const PASTEL_COLORS = [
  'bg-[#B5D8EB]',
  'bg-[#B5EAD7]',
  'bg-[#E2D5F8]',
  'bg-[#FFDAC1]',
  'bg-[#FFF4CB]',
  'bg-[#F3F4F6]'
];

export function ProjectModal({ onClose, onSave, initialData, initialPatients }: ProjectModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [observations, setObservations] = useState(initialData?.observations || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');

  const [numPatients, setNumPatients] = useState<number>(initialPatients?.length || 0);
  const [patientsList, setPatientsList] = useState<{id?: string, name: string, color?: string}[]>(
    initialPatients ? initialPatients.map(p => ({id: p.id, name: p.name, color: p.color})) : []
  );

  const handleNumPatientsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value) || 0;
    setNumPatients(num);
    setPatientsList(prev => {
      if (num > prev.length) {
        return [...prev, ...Array(num - prev.length).fill({name: '', color: PASTEL_COLORS[0]})];
      } else if (num < prev.length) {
        return prev.slice(0, num);
      }
      return prev;
    });
  };

  const handlePatientNameChange = (index: number, newName: string) => {
    const newList = [...patientsList];
    newList[index] = { ...newList[index], name: newName };
    setPatientsList(newList);
  };

  const handlePatientColorChange = (index: number, newColor: string) => {
    const newList = [...patientsList];
    newList[index] = { ...newList[index], color: newColor };
    setPatientsList(newList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const projectData = {
      ...(initialData ? { id: initialData.id } : {}),
      name,
      generalData: `${numPatients} Pacientes`,
      observations,
      startDate
    };

    onSave(projectData, patientsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col border border-[#EAE7E2]">
        <div className="px-6 py-4 border-b border-[#EAE7E2] flex justify-between items-center bg-white">
          <h2 className="text-sm font-bold text-[#2D5A4C]">{initialData ? 'Editar Proyecto Clínico' : 'Nuevo Proyecto Clínico'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Nombre del Estudio/Proyecto *</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
              placeholder="Ej. Estudio Alpha-Cardio"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Primer Día del Proyecto</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Nº de Pacientes</label>
              <input 
                type="number" 
                min="0"
                max="50"
                value={numPatients}
                onChange={handleNumPatientsChange}
                className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB]"
                placeholder="0"
              />
            </div>
          </div>

          {numPatients > 0 && (
            <div className="bg-[#F9F8F6] p-3 rounded-xl border border-[#EAE7E2]">
              <label className="text-[10px] uppercase font-bold text-[#999] block mb-2">Pacientes y sus Colores</label>
              <div className="flex flex-col gap-3">
                {patientsList.map((patient, index) => (
                  <div key={index} className="flex flex-col gap-2 bg-white p-2 border border-gray-200 rounded-md">
                    <input
                      type="text"
                      value={patient.name}
                      onChange={e => handlePatientNameChange(index, e.target.value)}
                      className="w-full text-xs p-1 border-b border-gray-100 outline-none focus:border-[#B5D8EB]"
                      placeholder={`Nombre del paciente ${index + 1}`}
                      required
                    />
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-400">Color:</span>
                      {PASTEL_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handlePatientColorChange(index, c)}
                          className={`w-4 h-4 rounded-full ${c} ${patient.color === c || (!patient.color && c === PASTEL_COLORS[0]) ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <label className="text-[10px] uppercase font-bold text-[#999] block mb-1">Observaciones</label>
            <textarea 
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="w-full text-xs p-2 bg-[#F9F8F6] border border-gray-200 rounded-md outline-none focus:border-[#B5D8EB] min-h-[80px] resize-none"
              placeholder="Notas generales del proyecto..."
            />
          </div>

          <div className="mt-4 flex items-center justify-end">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-[#4F4F4F] hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#B5D8EB] text-[#1E3A4C] px-6 py-2 rounded-lg text-xs font-bold hover:shadow-md transition-shadow"
              >
                Guardar Proyecto
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
