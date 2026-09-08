import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const handleClearData = () => {
    if (window.confirm('¿Está seguro de borrar TODOS los datos de la aplicación? Esto no se puede deshacer.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col border border-[#EAE7E2]">
        <div className="px-6 py-4 border-b border-[#EAE7E2] flex justify-between items-center bg-white">
          <h2 className="text-sm font-bold text-[#007B83]">Configuración del Sistema</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-red-800">Borrar todos los datos</h4>
                <p className="text-[10px] text-red-600 mt-1">Eliminará proyectos, pacientes y citas permanentemente.</p>
              </div>
              <button 
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Trash2 size={14} /> Resetear
              </button>
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] text-gray-400">Portal Clínico v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
