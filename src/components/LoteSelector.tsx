import React from 'react';
import { Layers, Check } from 'lucide-react';

interface LoteSelectorProps {
  allLotes: string[];
  selectedLotes: string[];
  onChange: (lotes: string[]) => void;
  isLoading: boolean;
}

export default function LoteSelector({
  allLotes,
  selectedLotes,
  onChange,
  isLoading
}: LoteSelectorProps) {
  const toggleLote = (lote: string) => {
    if (selectedLotes.includes(lote)) {
      onChange(selectedLotes.filter((item) => item !== lote));
    } else {
      onChange([...selectedLotes, lote]);
    }
  };

  const selectAll = () => {
    onChange([...allLotes]);
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6" id="lote-selector-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">Selección de Lotes</h3>
            <p className="text-xs text-slate-500 font-medium">Selecciona uno o más para visualizar su Gantt en pestañas independientes</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={selectAll}
            className="text-slate-900 hover:text-black font-semibold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            disabled={isLoading || allLotes.length === 0}
          >
            Seleccionar todos
          </button>
          <button
            onClick={selectNone}
            className="text-slate-500 hover:text-slate-800 font-semibold bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            disabled={isLoading}
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-3 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-slate-800 border-t-transparent animate-spin" />
          Cargando lotes disponibles...
        </div>
      ) : allLotes.length === 0 ? (
        <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
          No se encontraron lotes disponibles en la base de datos.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {allLotes.map((lote) => {
            const isSelected = selectedLotes.includes(lote);
            return (
              <button
                key={lote}
                onClick={() => toggleLote(lote)}
                id={`lote-btn-${lote}`}
                className={`group flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-blue-100 border-blue-200 text-blue-700 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                </div>
                <span>{lote}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
