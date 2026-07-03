import React from 'react';
import { ArrowRight, Info, Clock, AlertTriangle } from 'lucide-react';
import { IdentificacionTarea, RegistroTiempos, ExcepcionLaboral } from '../supabaseClient';

interface GanttChartProps {
  lote: string;
  tareas: IdentificacionTarea[];
  registroTiempos: RegistroTiempos[];
  exceptions: ExcepcionLaboral[];
}

interface TimelineSegment {
  start: Date;
  end: Date;
  type: 'green' | 'red' | 'blank';
  description?: string;
}

interface TimelineMarker {
  time: Date;
  type: 'red-line' | 'arrow';
}

export default function GanttChart({
  lote,
  tareas,
  registroTiempos,
  exceptions
}: GanttChartProps) {
  const currentTime = new Date();

  // Filter subprocesses and times for this specific batch
  const batchSubprocesses = tareas
    .filter((t) => t.nro_lote === lote)
    .sort((a, b) => a.no_paso - b.no_paso);

  const batchSubprocessIds = batchSubprocesses.map((p) => p.id_t);
  const batchTimes = registroTiempos.filter((t) => batchSubprocessIds.includes(t.id_t));

  // Check if we have any time records
  const hasRecords = batchTimes.length > 0;

  // 1. Dynamic axis bounds calculation
  let minTime = new Date();
  let maxTime = new Date();

  if (hasRecords) {
    const times: number[] = [];
    let hasRunningProcess = false;

    batchTimes.forEach((rec) => {
      if (rec.fecha_hora_play) times.push(new Date(rec.fecha_hora_play).getTime());
      if (rec.fecha_hora_stop) {
        times.push(new Date(rec.fecha_hora_stop).getTime());
      } else if (rec.fecha_hora_play) {
        // If a segment is still running, the limit includes current time
        hasRunningProcess = true;
      }
    });

    if (hasRunningProcess) {
      times.push(currentTime.getTime());
    }

    if (times.length > 0) {
      minTime = new Date(Math.min(...times));
      maxTime = new Date(Math.max(...times));
    }
  }

  // Guard: if min and max are equal or records are missing, set a default 8-hour window
  const durationMs = maxTime.getTime() - minTime.getTime();
  if (durationMs <= 0) {
    // If no records, show from 8:00 AM to 6:00 PM today
    minTime = new Date();
    minTime.setHours(8, 0, 0, 0);
    maxTime = new Date();
    maxTime.setHours(18, 0, 0, 0);
  } else if (durationMs < 60000) {
    // Add 30 mins padding on both sides if range is too narrow (under 1 minute)
    minTime = new Date(minTime.getTime() - 30 * 60 * 1000);
    maxTime = new Date(maxTime.getTime() + 30 * 60 * 1000);
  } else {
    // Standard minor padding (e.g., 5% of the range) to avoid visual clipping
    const padding = Math.max(durationMs * 0.05, 10 * 60 * 1000); // at least 10 minutes
    minTime = new Date(minTime.getTime() - padding);
    maxTime = new Date(maxTime.getTime() + padding);
  }

  const rangeMs = maxTime.getTime() - minTime.getTime();

  // Helper to convert date to timeline percentage
  const getPct = (date: Date): number => {
    const pct = ((date.getTime() - minTime.getTime()) / rangeMs) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Helper to check if a date (day) is a working day based on exceptions and defaults
  const isWorkingDay = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const exception = exceptions.find((ex) => ex.fecha === dateStr);
    if (exception !== undefined) {
      return exception.es_laboral;
    }

    // Default: Mon-Sat are working (1-6), Sunday (0) is rest
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0;
  };

  // 2. Generate list of days covered by the chart to draw shaded background grids
  const getShadedDays = () => {
    const days: Array<{ startPct: number; endPct: number; isWorking: boolean; dateStr: string }> = [];
    const startDay = new Date(minTime.getFullYear(), minTime.getMonth(), minTime.getDate());
    const endDay = new Date(maxTime.getFullYear(), maxTime.getMonth(), maxTime.getDate());

    const d = new Date(startDay);
    while (d <= endDay) {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);

      // Clamp to chart bounds
      const activeStart = dayStart < minTime ? minTime : dayStart;
      const activeEnd = dayEnd > maxTime ? maxTime : dayEnd;

      if (activeStart < activeEnd) {
        const working = isWorkingDay(d);
        const startPct = getPct(activeStart);
        const endPct = getPct(activeEnd);
        days.push({
          startPct,
          endPct,
          isWorking: working,
          dateStr: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  // 3. Generate shift references shading for working days
  const getShadedShifts = () => {
    const shifts: Array<{ startPct: number; endPct: number; label: string }> = [];
    const startDay = new Date(minTime.getFullYear(), minTime.getMonth(), minTime.getDate());
    const endDay = new Date(maxTime.getFullYear(), maxTime.getMonth(), maxTime.getDate());

    const d = new Date(startDay);
    while (d <= endDay) {
      if (isWorkingDay(d)) {
        // Shift 1: 07:00 to 15:00
        const s1Start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0, 0);
        const s1End = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 0, 0);
        
        // Shift 2: 14:30 to 22:00
        const s2Start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 14, 30, 0);
        const s2End = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0, 0);

        // Shift 1 clamp
        const activeS1Start = s1Start < minTime ? minTime : s1Start;
        const activeS1End = s1End > maxTime ? maxTime : s1End;
        if (activeS1Start < activeS1End) {
          shifts.push({
            startPct: getPct(activeS1Start),
            endPct: getPct(activeS1End),
            label: 'Turno 1 (7:00 - 15:00)'
          });
        }

        // Shift 2 clamp
        const activeS2Start = s2Start < minTime ? minTime : s2Start;
        const activeS2End = s2End > maxTime ? maxTime : s2End;
        if (activeS2Start < activeS2End) {
          shifts.push({
            startPct: getPct(activeS2Start),
            endPct: getPct(activeS2End),
            label: 'Turno 2 (14:30 - 22:00)'
          });
        }
      }
      d.setDate(d.getDate() + 1);
    }
    return shifts;
  };

  // 4. Generate visual segments and markers for each subprocess row according to instructions
  const getSubprocessTimeline = (subprocessId: string) => {
    const records = batchTimes
      .filter((t) => t.id_t === subprocessId)
      .sort((a, b) => a.secuencia - b.secuencia);

    const segments: TimelineSegment[] = [];
    const markers: TimelineMarker[] = [];

    let lastEvent: { type: 'play' | 'stop'; time: Date } | null = null;

    for (const rec of records) {
      const hasPlay = rec.fecha_hora_play !== null && rec.fecha_hora_play !== undefined;
      const hasStop = rec.fecha_hora_stop !== null && rec.fecha_hora_stop !== undefined;

      const pTime = hasPlay ? new Date(rec.fecha_hora_play!) : null;
      const sTime = hasStop ? new Date(rec.fecha_hora_stop!) : null;

      if (hasPlay && hasStop) {
        // Transition from previous state to this play
        if (lastEvent) {
          if (lastEvent.type === 'stop') {
            // Rule 2: Stopped time between stop and next play -> RED segment
            segments.push({
              start: lastEvent.time,
              end: pTime!,
              type: 'red',
              description: `Detenido: ${formatDuration(pTime!.getTime() - lastEvent.time.getTime())}`
            });
          } else if (lastEvent.type === 'play') {
            // Rule 5: Two plays in a row without a stop in between -> BLANK
            segments.push({
              start: lastEvent.time,
              end: pTime!,
              type: 'blank',
              description: 'Datos ambiguos (Play seguido de Play sin Stop)'
            });
          }
        }

        // Rule 1: Normal play/stop pair -> GREEN segment and RED vertical line at stop
        segments.push({
          start: pTime!,
          end: sTime!,
          type: 'green',
          description: `Activo: ${formatDuration(sTime!.getTime() - pTime!.getTime())}`
        });
        markers.push({ time: sTime!, type: 'red-line' });

        lastEvent = { type: 'stop', time: sTime! };

      } else if (hasPlay && !hasStop) {
        // Transition from previous state to this play
        if (lastEvent) {
          if (lastEvent.type === 'stop') {
            segments.push({
              start: lastEvent.time,
              end: pTime!,
              type: 'red',
              description: `Detenido: ${formatDuration(pTime!.getTime() - lastEvent.time.getTime())}`
            });
          } else if (lastEvent.type === 'play') {
            segments.push({
              start: lastEvent.time,
              end: pTime!,
              type: 'blank',
              description: 'Datos ambiguos (Play seguido de Play sin Stop)'
            });
          }
        }

        lastEvent = { type: 'play', time: pTime! };

      } else if (!hasPlay && hasStop) {
        // Rule 4: Orphan stop -> RED line marker only, no fill before
        markers.push({ time: sTime!, type: 'red-line' });
        lastEvent = { type: 'stop', time: sTime! };
      }
    }

    // Final check: if the last event was a PLAY, draw a green segment to current time with right arrow (Rule 3)
    if (lastEvent && lastEvent.type === 'play') {
      segments.push({
        start: lastEvent.time,
        end: currentTime,
        type: 'green',
        description: `Activo (en curso): ${formatDuration(currentTime.getTime() - lastEvent.time.getTime())}`
      });
      markers.push({ time: currentTime, type: 'arrow' });
    }

    return { segments, markers };
  };

  // Duration formatter helper
  const formatDuration = (ms: number): string => {
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Dynamic axis ticks formatter (creates 5 logical tick marks across the dynamic timeline)
  const getTicks = () => {
    const ticks: Date[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      ticks.push(new Date(minTime.getTime() + (rangeMs * i) / (count - 1)));
    }
    return ticks;
  };

  const shadedDays = getShadedDays();
  const shadedShifts = getShadedShifts();
  const timelineTicks = getTicks();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id={`gantt-chart-${lote}`}>
      {/* Chart Header Info */}
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            Gantt: Lote #{lote}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 font-medium">
            Eje dinámico: {minTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({minTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}) → {maxTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({maxTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
          </p>
        </div>

        {/* Dynamic Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-emerald-400/30 border border-emerald-500 rounded-xs" />
            <span className="text-slate-500 font-medium">Activo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-red-400/20 border-r border-red-500 rounded-xs" />
            <span className="text-slate-500 font-medium">Detenido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-white border border-dashed border-slate-300 rounded-xs" />
            <span className="text-slate-500 font-medium">Ambiguo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-red-500" />
            <span className="text-slate-500 font-medium">Stop Huérfano</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-emerald-600 rounded-xs" />
            <span className="text-slate-500 font-medium">En curso</span>
          </div>
        </div>
      </div>

      {!hasRecords ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl mb-3">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h5 className="font-semibold text-slate-800 text-sm">Sin registros de tiempo</h5>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Este lote está registrado pero no posee ninguna entrada en la tabla <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-600">registro_tiempos_2</code>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Main Gantt Arena */}
          <div className="min-w-[700px] p-6 relative">
            
            {/* 1. Timeline Horizontal Axis (TICK HEADERS) */}
            <div className="flex border-b border-slate-100 pb-2 mb-4 relative" style={{ marginLeft: '13rem' }}>
              {timelineTicks.map((tick, idx) => {
                const pct = getPct(tick);
                return (
                  <div
                    key={`tick-${idx}`}
                    className="absolute -translate-x-1/2 flex flex-col items-center font-mono"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="text-[10px] font-bold text-slate-400">
                      {tick.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[8px] text-slate-300 font-bold scale-90">
                      {tick.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="w-px h-1.5 bg-slate-200 mt-1" />
                  </div>
                );
              })}
              {/* Spacer so headers have space */}
              <div className="h-6" />
            </div>

            {/* 2. Subprocess Grid Rows */}
            <div className="space-y-4 relative">
              
              {/* Background Grid Layer (applies across all rows) */}
              <div className="absolute inset-y-0 right-0 left-0 pointer-events-none" style={{ left: '13rem' }}>
                
                {/* A. Non-working day shading */}
                {shadedDays.map((day, idx) => (
                  <div
                    key={`shaded-day-${idx}`}
                    className={`absolute inset-y-0 ${
                      day.isWorking ? 'bg-transparent' : 'bg-slate-100/40 border-x border-slate-200/20 pattern-grid'
                    }`}
                    style={{
                      left: `${day.startPct}%`,
                      width: `${day.endPct - day.startPct}%`
                    }}
                    title={day.isWorking ? '' : `Día no laboral: ${day.dateStr}`}
                  >
                    {!day.isWorking && (
                      <div className="absolute top-1 left-2 text-[8px] font-bold text-slate-400 font-sans tracking-wider rotate-90 origin-top-left">
                        NO LABORAL ({day.dateStr})
                      </div>
                    )}
                  </div>
                ))}

                {/* B. Working Shifts Guide lines (faint shading) */}
                {shadedShifts.map((shift, idx) => (
                  <div
                    key={`shaded-shift-${idx}`}
                    className="absolute inset-y-0 bg-blue-500/[0.01] border-x border-dashed border-blue-500/[0.03]"
                    style={{
                      left: `${shift.startPct}%`,
                      width: `${shift.endPct - shift.startPct}%`
                    }}
                    title={shift.label}
                  />
                ))}

                {/* Draw fine grid lines for each tick */}
                {timelineTicks.map((tick, idx) => {
                  const pct = getPct(tick);
                  return (
                    <div
                      key={`gridline-${idx}`}
                      className="absolute inset-y-0 border-l border-slate-100"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {/* Rows layout */}
              {batchSubprocesses.map((sp) => {
                const { segments, markers } = getSubprocessTimeline(sp.id_t);

                return (
                  <div
                    key={sp.id_t}
                    id={`gantt-row-${sp.id_t}`}
                    className="flex items-center min-h-12 relative group"
                  >
                    {/* Left Column: Subprocess Label */}
                    <div className="w-48 pr-4 shrink-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{(sp.no_paso).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {sp.id_prd_lin}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 mt-0.5 line-clamp-1 title-hover" title={sp.etapa}>
                        {sp.etapa}
                      </span>
                    </div>

                    {/* Right Column: Interactive Timeline Track */}
                    <div className="flex-1 h-8 bg-slate-50/50 rounded border border-slate-100 relative overflow-hidden group-hover:bg-slate-50/80 transition-all">
                      
                      {/* Active Segments Render */}
                      {segments.map((seg, sIdx) => {
                        const startPct = getPct(seg.start);
                        const endPct = getPct(seg.end);
                        const widthPct = endPct - startPct;

                        if (widthPct <= 0) return null;

                        let colorClass = '';
                        let isCurrentlyRunning = false;
                        
                        // Check if this segment represents active (en curso) vs static active
                        if (seg.type === 'green') {
                          if (seg.description?.includes('en curso')) {
                            isCurrentlyRunning = true;
                            colorClass = 'bg-emerald-500/40 border-l border-emerald-600 text-slate-800';
                          } else {
                            colorClass = 'bg-emerald-400/30 border-l border-emerald-500 text-slate-800';
                          }
                        } else if (seg.type === 'red') {
                          // Rule 2: Stopped/Wait segment -> RED
                          colorClass = 'bg-red-400/20 text-slate-700';
                        } else {
                          // Rule 5: Ambiguous segment -> BLANK (uncolored)
                          colorClass = 'bg-white border-x border-dashed border-slate-300 text-slate-500';
                        }

                        return (
                          <div
                            key={`seg-${sIdx}`}
                            className={`absolute inset-y-1 rounded-sm flex items-center justify-center transition-all duration-150 text-[10px] font-semibold px-1.5 cursor-pointer overflow-hidden ${colorClass}`}
                            style={{
                              left: `${startPct}%`,
                              width: `${widthPct}%`
                            }}
                            title={`${seg.description || ''} (${seg.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${seg.end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`}
                          >
                            {/* Only show duration text inside if it fits visually */}
                            {widthPct > 8 && seg.type !== 'blank' && (
                              <span className="truncate scale-90">
                                {formatDuration(seg.end.getTime() - seg.start.getTime())}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Event Markers Render */}
                      {markers.map((mark, mIdx) => {
                        const pct = getPct(mark.time);

                        if (mark.type === 'red-line') {
                          // Rule 1 & 4: Red vertical line indicating Stop event
                          return (
                            <div
                              key={`mark-${mIdx}`}
                              className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-10 transition-transform cursor-pointer"
                              style={{ left: `${pct}%` }}
                              title={`Marcador de STOP: ${mark.time.toLocaleTimeString()}`}
                            />
                          );
                        } else if (mark.type === 'arrow') {
                          // Rule 3: Arrow at the right tip indicating continuous play
                          return (
                            <div
                              key={`mark-${mIdx}`}
                              className="absolute top-0 bottom-0 flex items-center justify-center z-15"
                              style={{ left: `calc(${pct}% - 6px)` }}
                              title="En curso"
                            >
                              <div className="border-y-8 border-y-transparent border-l-[12px] border-l-emerald-600"></div>
                            </div>
                          );
                        }
                        return null;
                      })}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      )}

      {/* Helper Legend Sheet */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-[11px] font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-400/30 border border-emerald-500"></div>
          <span>Activo (Play-Stop)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400/20 border-r border-red-500"></div>
          <span>Detenido (Stop-Play)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white border border-dashed border-slate-300"></div>
          <span>Ambiguo (Play-Play)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-[2px] bg-red-500"></div>
          <span>Stop Huérfano / Línea de parada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-600"></div>
          <span>En Curso (Flecha)</span>
        </div>
      </div>
    </div>
  );
}
