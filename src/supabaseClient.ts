import { createClient } from '@supabase/supabase-js';

// Read from environment variables with safe casting
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Lazy initialization of the Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Types matching the Supabase tables
export interface IdentificacionTarea {
  id_t: string;
  nro_lote: string;
  id_prd_lin: string;
  etapa: string;
  paso: string;
  no_paso: number;
}

export interface RegistroTiempos {
  id_t: string;
  secuencia: number;
  fecha_hora_play: string | null;
  fecha_hora_stop: string | null;
  no_paso: number;
}

export interface ExcepcionLaboral {
  fecha: string; // YYYY-MM-DD
  es_laboral: boolean;
}

// Rich Mock Data for Demo Mode
export const mockTareas: IdentificacionTarea[] = [
  // LOTE-101 Tareas
  { id_t: 't1_1', nro_lote: 'LOTE-101', id_prd_lin: 'LINE-A', etapa: 'Carga de Material', paso: 'Paso 1', no_paso: 1 },
  { id_t: 't1_2', nro_lote: 'LOTE-101', id_prd_lin: 'LINE-A', etapa: 'Mezclado y Batido', paso: 'Paso 2', no_paso: 2 },
  { id_t: 't1_3', nro_lote: 'LOTE-101', id_prd_lin: 'LINE-A', etapa: 'Calentamiento', paso: 'Paso 3', no_paso: 3 },
  { id_t: 't1_4', nro_lote: 'LOTE-101', id_prd_lin: 'LINE-A', etapa: 'Control de Calidad', paso: 'Paso 4', no_paso: 4 },
  { id_t: 't1_5', nro_lote: 'LOTE-101', id_prd_lin: 'LINE-A', etapa: 'Envasado Final', paso: 'Paso 5', no_paso: 5 },

  // LOTE-102 Tareas
  { id_t: 't2_1', nro_lote: 'LOTE-102', id_prd_lin: 'LINE-B', etapa: 'Inspección de Botellas', paso: 'Paso 1', no_paso: 1 },
  { id_t: 't2_2', nro_lote: 'LOTE-102', id_prd_lin: 'LINE-B', etapa: 'Llenado Líquido', paso: 'Paso 2', no_paso: 2 },
  { id_t: 't2_3', nro_lote: 'LOTE-102', id_prd_lin: 'LINE-B', etapa: 'Sellado al Vacío', paso: 'Paso 3', no_paso: 3 },
  { id_t: 't2_4', nro_lote: 'LOTE-102', id_prd_lin: 'LINE-B', etapa: 'Etiquetado', paso: 'Paso 4', no_paso: 4 },

  // LOTE-103 Tareas
  { id_t: 't3_1', nro_lote: 'LOTE-103', id_prd_lin: 'LINE-C', etapa: 'Limpieza de Tolva', paso: 'Paso 1', no_paso: 1 },
  { id_t: 't3_2', nro_lote: 'LOTE-103', id_prd_lin: 'LINE-C', etapa: 'Dosificación', paso: 'Paso 2', no_paso: 2 },
];

// Current local time (reference): 2026-07-02T17:46:54-07:00
export const mockRegistroTiempos: RegistroTiempos[] = [
  // LOTE-101
  // t1_1: Carga de Material (Rule 1: Normal play/stop)
  { id_t: 't1_1', secuencia: 1, fecha_hora_play: '2026-07-02T08:00:00Z', fecha_hora_stop: '2026-07-02T09:30:00Z', no_paso: 1 },

  // t1_2: Mezclado (Rule 2: Stopped time between stop and next play)
  { id_t: 't1_2', secuencia: 1, fecha_hora_play: '2026-07-02T09:40:00Z', fecha_hora_stop: '2026-07-02T11:00:00Z', no_paso: 2 },
  { id_t: 't1_2', secuencia: 2, fecha_hora_play: '2026-07-02T11:15:00Z', fecha_hora_stop: '2026-07-02T12:00:00Z', no_paso: 2 },

  // t1_3: Calentamiento (Rule 3: Play without stop - still running)
  { id_t: 't1_3', secuencia: 1, fecha_hora_play: '2026-07-02T12:10:00Z', fecha_hora_stop: '2026-07-02T13:00:00Z', no_paso: 3 },
  { id_t: 't1_3', secuencia: 2, fecha_hora_play: '2026-07-02T13:05:00Z', fecha_hora_stop: null, no_paso: 3 },

  // t1_4: Control de Calidad (Rule 4: Stop without preceding play - orphan stop)
  { id_t: 't1_4', secuencia: 1, fecha_hora_play: null, fecha_hora_stop: '2026-07-02T14:15:00Z', no_paso: 4 },

  // t1_5: Envasado Final (Rule 5: Two plays in a row without stop - blank segment in between)
  { id_t: 't1_5', secuencia: 1, fecha_hora_play: '2026-07-02T14:30:00Z', fecha_hora_stop: null, no_paso: 5 },
  { id_t: 't1_5', secuencia: 2, fecha_hora_play: '2026-07-02T15:00:00Z', fecha_hora_stop: null, no_paso: 5 },

  // LOTE-102
  // t2_1: Inspección de Botellas
  { id_t: 't2_1', secuencia: 1, fecha_hora_play: '2026-07-02T07:30:00Z', fecha_hora_stop: '2026-07-02T09:00:00Z', no_paso: 1 },
  // t2_2: Llenado Líquido
  { id_t: 't2_2', secuencia: 1, fecha_hora_play: '2026-07-02T09:10:00Z', fecha_hora_stop: '2026-07-02T10:30:00Z', no_paso: 2 },
  { id_t: 't2_2', secuencia: 2, fecha_hora_play: '2026-07-02T10:45:00Z', fecha_hora_stop: '2026-07-02T12:00:00Z', no_paso: 2 },
  // t2_3: Sellado al Vacío
  { id_t: 't2_3', secuencia: 1, fecha_hora_play: '2026-07-02T12:30:00Z', fecha_hora_stop: '2026-07-02T14:00:00Z', no_paso: 3 },
  // t2_4: Etiquetado
  { id_t: 't2_4', secuencia: 1, fecha_hora_play: '2026-07-02T14:10:00Z', fecha_hora_stop: null, no_paso: 4 },

  // LOTE-103
  // t3_1: Limpieza de Tolva
  { id_t: 't3_1', secuencia: 1, fecha_hora_play: '2026-07-02T06:00:00Z', fecha_hora_stop: '2026-07-02T07:30:00Z', no_paso: 1 },
  // t3_2: Dosificación
  { id_t: 't3_2', secuencia: 1, fecha_hora_play: '2026-07-02T07:45:00Z', fecha_hora_stop: null, no_paso: 2 }
];

export const mockExcepciones: ExcepcionLaboral[] = [
  { fecha: '2026-07-01', es_laboral: false }, // Wednesday - holiday (normally work, but false = non-working)
  { fecha: '2026-07-05', es_laboral: true },  // Sunday - normally non-working, but true = working
  { fecha: '2026-07-12', es_laboral: true }   // Sunday - normally non-working, but true = working
];
