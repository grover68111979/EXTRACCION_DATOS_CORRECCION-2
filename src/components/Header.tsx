import React, { useEffect, useState } from 'react';
import { RefreshCw, Database, AlertCircle, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../supabaseClient';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  autoRefreshIntervalMinutes?: number;
}

export default function Header({
  onRefresh,
  isLoading,
  lastUpdated,
  autoRefreshIntervalMinutes = 5
}: HeaderProps) {
  const [secondsLeft, setSecondsLeft] = useState(autoRefreshIntervalMinutes * 60);

  useEffect(() => {
    setSecondsLeft(autoRefreshIntervalMinutes * 60);
  }, [lastUpdated, autoRefreshIntervalMinutes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRefresh();
          return autoRefreshIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRefresh, autoRefreshIntervalMinutes]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-white border border-slate-200 p-6 mb-6 rounded-xl shadow-sm" id="app-header">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              Gantt Pro <span className="text-slate-400 font-normal ml-1 text-sm">v2.4</span>
            </h1>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Supabase
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Visualizador de subprocesos por lote y gestión de excepciones de calendario laboral
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Badge */}
          {isSupabaseConfigured ? (
            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200">
              <Database className="w-4 h-4 text-slate-500" />
              <span>Conectado a Supabase</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-100">
              <AlertCircle className="w-4 h-4" />
              <div className="flex flex-col text-left">
                <span className="font-semibold">Modo Demostración</span>
                <span className="text-[10px] text-amber-600/90 leading-tight">Usa variables de entorno para datos reales</span>
              </div>
            </div>
          )}

          {/* Countdown & Refresh */}
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <div className="text-right px-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">Autorefresco</p>
              <p className="text-xs font-mono font-semibold text-slate-700">{formatTime(secondsLeft)}</p>
            </div>
            
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2 px-3 rounded-lg border border-transparent transition-all shadow-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Refrescar datos ahora"
              id="refresh-button"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-right text-[10px] text-slate-400 mt-2 font-mono">
          Última actualización: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </header>
  );
}
