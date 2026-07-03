import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Layers, Database, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  IdentificacionTarea,
  RegistroTiempos,
  ExcepcionLaboral,
  mockTareas,
  mockRegistroTiempos,
  mockExcepciones
} from './supabaseClient';

import Header from './components/Header';
import LoteSelector from './components/LoteSelector';
import GanttChart from './components/GanttChart';
import ExceptionsCalendar from './components/ExceptionsCalendar';

export default function App() {
  const [tareas, setTareas] = useState<IdentificacionTarea[]>([]);
  const [registroTiempos, setRegistroTiempos] = useState<RegistroTiempos[]>([]);
  const [exceptions, setExceptions] = useState<ExcepcionLaboral[]>([]);
  
  const [allLotes, setAllLotes] = useState<string[]>([]);
  const [selectedLotes, setSelectedLotes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core Data Fetcher
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    
    const supabase = getSupabaseClient();
    
    if (isSupabaseConfigured && supabase) {
      const anySupabase = supabase as any;
      try {
        // Fetch Subprocesses
        const { data: tData, error: tErr } = await anySupabase
          .from('identificacion_tarea_2')
          .select('*');
          
        if (tErr) throw tErr;

        // Fetch Timestamps
        const { data: rtData, error: rtErr } = await anySupabase
          .from('registro_tiempos_2')
          .select('*')
          .order('id_t', { ascending: true })
          .order('secuencia', { ascending: true });
          
        if (rtErr) throw rtErr;

        // Fetch Exceptions Calendar
        const { data: exData, error: exErr } = await anySupabase
          .from('excepciones_laborales')
          .select('*');
          
        if (exErr) throw exErr;

        // Set live DB state
        setTareas(tData || []);
        setRegistroTiempos(rtData || []);
        setExceptions(exData || []);

        // Compute unique batches available
        const lotes = Array.from(new Set((tData || []).map((t) => t.nro_lote)))
          .filter(Boolean)
          .sort();
        setAllLotes(lotes);

        // Auto-select first batch if none selected yet
        if (selectedLotes.length === 0 && lotes.length > 0) {
          setSelectedLotes([lotes[0]]);
          setActiveTab(lotes[0]);
        }
        
      } catch (err: any) {
        console.error('Error fetching Supabase data:', err);
        setErrorMsg(`Error al conectar con las tablas de Supabase: ${err.message || err}. Usando datos de simulación.`);
        
        // Fallback to beautiful mock data so app is not broken
        loadFallbackMockData();
      }
    } else {
      // Supabase is not configured, load demo mock data
      loadFallbackMockData();
    }
    
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [selectedLotes.length]);

  const loadFallbackMockData = () => {
    setTareas(mockTareas);
    setRegistroTiempos(mockRegistroTiempos);
    setExceptions(mockExcepciones);

    const lotes = Array.from(new Set(mockTareas.map((t) => t.nro_lote)))
      .filter(Boolean)
      .sort();
    setAllLotes(lotes);

    if (selectedLotes.length === 0 && lotes.length > 0) {
      setSelectedLotes([lotes[0]]);
      setActiveTab(lotes[0]);
    }
  };

  // Initial Fetch & Refresh logic
  useEffect(() => {
    fetchData();
  }, []);

  // Update active tab when selection changes to make sure active tab is always valid
  useEffect(() => {
    if (selectedLotes.length > 0 && !selectedLotes.includes(activeTab)) {
      setActiveTab(selectedLotes[0]);
    }
  }, [selectedLotes, activeTab]);

  // Calendar Exceptions Modifier logic
  const handleToggleException = async (fecha: string, newEsLaboral: boolean) => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    
    // Check default state for this date's day of week
    // Sunday (0) = false (non-working), Monday-Saturday (1-6) = true (working)
    const dateParts = fecha.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const defaultStatus = dateObj.getDay() !== 0;

    // Local state preview update for snappy response
    const updatedExceptions = [...exceptions];
    const existingIndex = updatedExceptions.findIndex((ex) => ex.fecha === fecha);

    if (newEsLaboral === defaultStatus) {
      // If matches default, delete exceptions
      if (existingIndex > -1) {
        updatedExceptions.splice(existingIndex, 1);
      }
      
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await (supabase as any)
            .from('excepciones_laborales')
            .delete()
            .eq('fecha', fecha);
            
          if (error) throw error;
        } catch (err: any) {
          console.error('Error deleting exception from Supabase:', err);
          alert(`No se pudo eliminar la excepción en Supabase: ${err.message}`);
        }
      }
    } else {
      // If differs from default, upsert exception
      if (existingIndex > -1) {
        updatedExceptions[existingIndex].es_laboral = newEsLaboral;
      } else {
        updatedExceptions.push({ fecha, es_laboral: newEsLaboral });
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await (supabase as any)
            .from('excepciones_laborales')
            .upsert({ fecha, es_laboral: newEsLaboral });
            
          if (error) throw error;
        } catch (err: any) {
          console.error('Error saving exception to Supabase:', err);
          alert(`No se pudo guardar la excepción en Supabase: ${err.message}`);
        }
      }
    }

    setExceptions(updatedExceptions);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12" id="app-root">
      {/* Max container constraint */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Dynamic header */}
        <Header
          onRefresh={fetchData}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
        />

        {/* Database Warning Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl flex items-start gap-3"
            id="error-banner"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Advertencia de Conectividad</p>
              <p className="text-xs text-amber-800 mt-1 font-medium">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Responsive Grid Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visualizer (Left side) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Batch Selector Widget */}
            <LoteSelector
              allLotes={allLotes}
              selectedLotes={selectedLotes}
              onChange={setSelectedLotes}
              isLoading={isLoading}
            />

            {/* Gantt Display Arena */}
            <div className="space-y-4">
              {selectedLotes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-full inline-block mb-3">
                    <Layers className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Sin lotes seleccionados</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                    Por favor, selecciona uno o más de los lotes de la sección superior para visualizar su diagrama de Gantt en tiempo real.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Dynamic Tab Bar for Multiple Batches */}
                  {selectedLotes.length > 1 && (
                    <div className="flex bg-white px-6 border border-slate-200 border-b-0 rounded-t-xl gap-2 overflow-x-auto scrollbar-none mb-0" id="tabs-bar">
                      {selectedLotes.map((lote) => {
                        const isActive = activeTab === lote;
                        return (
                          <button
                            key={lote}
                            onClick={() => setActiveTab(lote)}
                            id={`tab-button-${lote}`}
                            className={`px-5 py-3.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
                              isActive
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <span>Gantt: Lote #{lote}</span>
                            {isActive && (
                              <motion.div
                                layoutId="active-tab-line"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Render Chart Content with Smooth Transitions */}
                  <AnimatePresence mode="wait">
                    {activeTab && (
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <GanttChart
                          lote={activeTab}
                          tareas={tareas}
                          registroTiempos={registroTiempos}
                          exceptions={exceptions}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area: Calendar (Right side) */}
          <div className="lg:col-span-1">
            <ExceptionsCalendar
              exceptions={exceptions}
              onToggleException={handleToggleException}
              isLoading={isLoading}
            />
          </div>

        </div>

        {/* Footer Status Bar */}
        <footer className="mt-12 px-6 py-3 bg-slate-900 text-slate-400 flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase font-bold tracking-widest gap-2 rounded-xl shadow-md">
          <div className="flex gap-4">
            <span>DB: {isSupabaseConfigured ? 'Supabase Connected' : 'Demo Mode Active'}</span>
            <span>Mode: Production</span>
          </div>
          <div>
            Sesión: grover68111979@gmail.com - 10:42 AM
          </div>
        </footer>

      </div>
    </div>
  );
}
