'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Users, 
  Check, 
  Clock, 
  ShieldAlert, 
  Compass, 
  Eye, 
  Layers,
  Sparkles,
  Move,
  Maximize2
} from 'lucide-react';
import { TableSeatStatus } from '@/types';

interface InteractiveSeatingMapProps {
  restaurantName: string;
  tables: TableSeatStatus[];
  partySize: number;
  selectedTableId: string | null;
  selectedSeats: number[];
  onSelectTable: (tableId: string, initialSeats?: number[]) => void;
  onSelectSeat: (tableId: string, seatNumber: number) => void;
  isLoading?: boolean;
}

export default function InteractiveSeatingMap({
  restaurantName,
  tables,
  partySize,
  selectedTableId,
  selectedSeats,
  onSelectTable,
  onSelectSeat,
  isLoading = false
}: InteractiveSeatingMapProps) {
  // Mobile detection & container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const isMobile = containerWidth < 640;

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'isometric' | 'topDown'>('isometric');
  const [hoveredTable, setHoveredTable] = useState<TableSeatStatus | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<{ tableNumber: string; seatNumber: number; status: string } | null>(null);

  // Measure container width with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(width);
        // On very small screens, default to 2D Plan for cleaner tap accuracy if user hasn't explicitly set isometric
        if (width < 440) {
          setViewMode('topDown');
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Touch drag / pan state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchZoom = useRef<number>(1);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on canvas background, not on interactive table/seat buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.interactive-table')) {
      return;
    }
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Touch pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDist.current = dist;
      initialPinchZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleChange = dist / initialPinchDist.current;
      const newZoom = Math.min(Math.max(initialPinchZoom.current * scaleChange, 0.75), 1.75);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDist.current = null;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 1.75));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.75));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setViewMode(isMobile ? 'topDown' : 'isometric');
  };

  return (
    <div 
      ref={containerRef}
      className="bg-[#FAF9F6] rounded-3xl border border-[#E6DDD3] p-3.5 sm:p-6 shadow-sm flex flex-col space-y-3.5 select-none w-full max-w-full overflow-hidden"
    >
      
      {/* MAP HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E6DDD3] pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#795548] animate-pulse"></span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#795548]">
              Interactive Floor Plan • Cinema-Style Seating
            </span>
          </div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-[#201B18] mt-0.5">
            {restaurantName} Seating Layout
          </h3>
        </div>

        {/* View mode toggle & Zoom buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-xl bg-white border border-[#E6DDD3] p-0.5 sm:p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('isometric')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'isometric' 
                  ? 'bg-[#3B2924] text-white shadow-2xs' 
                  : 'text-[#776B63] hover:text-[#201B18]'
              }`}
            >
              3D View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('topDown')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'topDown' 
                  ? 'bg-[#3B2924] text-white shadow-2xs' 
                  : 'text-[#776B63] hover:text-[#201B18]'
              }`}
            >
              2D Plan
            </button>
          </div>

          <div className="flex items-center rounded-xl bg-white border border-[#E6DDD3] p-0.5 sm:p-1 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SEATING COLOR LEGEND */}
      <div className="flex items-center justify-start sm:justify-between flex-wrap gap-x-3 gap-y-1.5 py-2 px-3 rounded-2xl bg-white border border-[#E6DDD3] text-[11px] shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#EFEBE4] border border-[#C5BAAF] inline-block shadow-2xs"></span>
          <span className="text-[#6B625D] font-medium">Available</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#3B2924] border border-[#201B18] inline-block ring-2 ring-[#795548]/40 shadow-xs"></span>
          <span className="text-[#201B18] font-bold">Selected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#4A433F] border border-[#332D29] inline-block"></span>
          <span className="text-[#6B625D] font-medium">Booked</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400 border border-amber-600 inline-block"></span>
          <span className="text-[#6B625D] font-medium">Held</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-gray-300 border border-gray-400 inline-block text-gray-500 text-[8px] flex items-center justify-center">✕</span>
          <span className="text-[#6B625D] font-medium">Unavailable</span>
        </div>
      </div>

      {/* FLOOR PLAN CANVAS STAGE */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[400px] xs:h-[440px] sm:h-[520px] rounded-3xl bg-white border border-[#E6DDD3] overflow-hidden shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        
        {/* Subtle grid background to simulate hardwood or architectural tiles */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(#D7CCC8 1px, transparent 1px),
              linear-gradient(to right, #F5EFEB 1px, transparent 1px),
              linear-gradient(to bottom, #F5EFEB 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-[#795548] gap-2">
            <span className="w-4 h-4 border-2 border-[#795548] border-t-transparent rounded-full animate-spin"></span>
            Syncing live seating availability...
          </div>
        )}

        {/* Mobile touch pan indicator badge */}
        <div className="absolute top-2 right-2 z-20 pointer-events-none opacity-80 sm:hidden flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-[#795548] font-medium border border-[#E6DDD3] shadow-2xs">
          <Move className="w-3 h-3" />
          <span>Pan & Zoom enabled</span>
        </div>

        {/* FIXED VIRTUAL STAGE CANVAS
            We fix the virtual floorplan canvas to 620px x 480px.
            On smaller screens (e.g. mobile 320px-440px), autoFitScale perfectly shrinks the layout
            so that percentage distances are preserved in true proportion without any tables overlapping. */}
        {(() => {
          const virtualW = 620;
          const virtualH = 480;
          // Available stage width and height inside the container padding
          const stageW = containerWidth > 0 ? containerWidth - 16 : 360;
          const stageH = isMobile ? (containerWidth < 380 ? 380 : 420) : 500;
          const fitScale = Math.min(1, stageW / virtualW, stageH / virtualH);
          const effectiveScale = fitScale * zoom;

          return (
            <div
              className="relative transition-transform duration-150 ease-out origin-center shrink-0"
              style={{
                width: `${virtualW}px`,
                height: `${virtualH}px`,
                transform: viewMode === 'isometric'
                  ? `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale}) rotateX(24deg) rotateZ(-6deg)`
                  : `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* ARCHITECTURAL RESTAURANT MARKERS */}
              {/* Kitchen / Chef Pass Area */}
              <div className="absolute top-2 left-6 right-6 h-7 sm:h-8 rounded-xl bg-[#3B2924]/5 border border-[#3B2924]/20 flex items-center justify-between px-3 sm:px-4 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#795548] pointer-events-none">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-600 shrink-0"></span>
                  <span className="truncate">Open Kitchen & Hearth</span>
                </span>
                <span className="text-[8px] sm:text-[9px] text-[#A89F91] shrink-0">Pass</span>
              </div>

              {/* Entrance Door at Bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-[#E9DFD2] border border-[#C5BAAF] text-[9px] sm:text-[10px] font-bold text-[#3B2924] shadow-2xs flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                <Compass className="w-3 h-3 text-[#795548]" />
                Guest Entrance
              </div>

              {/* Bar / Wine Counter on Right */}
              <div className="absolute top-14 right-2 w-9 h-40 rounded-2xl bg-[#E6DDD3]/60 border border-[#C5BAAF] flex flex-col items-center justify-center text-[8px] font-bold uppercase tracking-widest text-[#795548] pointer-events-none origin-center">
                <span className="[writing-mode:vertical-rl] tracking-wider text-[8px]">Wine Cellar</span>
              </div>

              {/* RENDER EACH TABLE & ITS SURROUNDING SEATS */}
              {tables.map(table => {
                const isSelected = selectedTableId === table.tableId;
                const isBooked = table.status === 'booked';
                const isHeld = table.status === 'held';
                const isUnavailable = table.status === 'unavailable' || !table.isActive;
                const isSelectable = !isBooked && !isHeld && !isUnavailable;

                // Geometry shapes
                const isRound = table.shape === 'round';
                const isRectangle = table.shape === 'rectangle' || table.capacity >= 6;
                
                // Width / Height based on shape & capacity calibrated for virtual 620px canvas
                let tableWidth = 56;
                let tableHeight = 56;
                if (isRound) {
                  tableWidth = 58;
                  tableHeight = 58;
                } else if (isRectangle) {
                  tableWidth = table.capacity >= 10 ? 116 : 82;
                  tableHeight = 50;
                } else {
                  tableWidth = 54;
                  tableHeight = 54;
                }

                // Determine table background styling based on cinema state
                let tableBg = 'bg-[#FAF6F0] text-[#201B18] border-[#C5BAAF] hover:border-[#795548]';
                if (isSelected) {
                  tableBg = 'bg-[#3B2924] text-[#F8F5F0] border-[#201B18] shadow-lg ring-4 ring-[#795548]/30 scale-105';
                } else if (isBooked) {
                  tableBg = 'bg-[#4A433F] text-gray-300 border-[#332D29] opacity-90 cursor-not-allowed';
                } else if (isHeld) {
                  tableBg = 'bg-amber-100 text-amber-900 border-amber-400 cursor-not-allowed';
                } else if (isUnavailable) {
                  tableBg = 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
                }

                return (
                  <div
                    key={table.tableId}
                    className="absolute transition-all duration-200 group"
                    style={{
                      left: `${table.posX}%`,
                      top: `${table.posY}%`,
                      transform: `translate(-50%, -50%) rotate(${table.shape === 'rectangle' && table.capacity >= 6 ? (table.posX > 75 ? 90 : 0) : 0}deg)`,
                      zIndex: isSelected ? 20 : 10
                    }}
                    onMouseEnter={() => setHoveredTable(table)}
                    onMouseLeave={() => setHoveredTable(null)}
                  >
                    {/* TABLE TOP SURFACE */}
                    <div
                      onClick={() => {
                        if (isSelectable) {
                          onSelectTable(table.tableId);
                        }
                      }}
                      className={`interactive-table relative flex flex-col items-center justify-center p-1.5 border-2 transition-all cursor-pointer select-none ${
                        isRound ? 'rounded-full' : 'rounded-2xl'
                      } ${tableBg}`}
                      style={{
                        width: `${tableWidth}px`,
                        height: `${tableHeight}px`,
                        boxShadow: viewMode === 'isometric' 
                          ? (isSelected ? '0 12px 24px -4px rgba(59, 41, 36, 0.4)' : '0 6px 12px -2px rgba(0,0,0,0.12)')
                          : '0 2px 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <span className="font-serif font-bold text-xs tracking-tight">
                        {table.tableNumber}
                      </span>
                      <span className={`text-[8.5px] font-semibold flex items-center gap-0.5 ${
                        isSelected ? 'text-[#E9DFD2]' : 'text-[#776B63]'
                      }`}>
                        <Users className="w-2.5 h-2.5" />
                        {table.capacity}p
                      </span>

                      {/* Status Indicator Icon */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#795548] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      {isBooked && (
                        <div className="absolute -top-1 -right-1 px-1 rounded-sm bg-gray-900 text-gray-200 text-[8px] font-mono">
                          BOOKED
                        </div>
                      )}
                    </div>

                    {/* INDIVIDUAL CINEMA SEATS AROUND THIS TABLE */}
                    <div className="pointer-events-auto">
                      {table.seats.map((seat, seatIdx) => {
                        // Position seats evenly around table perimeter with calibrated separation
                        const totalSeats = table.seats.length;
                        const angle = (seatIdx / totalSeats) * 2 * Math.PI;
                        const radiusX = (tableWidth / 2) + 11;
                        const radiusY = (tableHeight / 2) + 11;
                        const seatX = Math.cos(angle) * radiusX;
                        const seatY = Math.sin(angle) * radiusY;

                        const isSeatSelected = isSelected && (selectedSeats.length === 0 || selectedSeats.includes(seat.seatNumber));
                        const isSeatBooked = seat.status === 'booked' || isBooked;
                        const isSeatHeld = seat.status === 'held' || isHeld;
                        const isSeatUnavailable = seat.status === 'unavailable' || isUnavailable;

                        let seatBg = 'bg-[#FAF6F0] border-[#BCAAA4] text-[#3B2924] hover:bg-[#EFEBE4] hover:border-[#795548]';
                        if (isSeatSelected) {
                          seatBg = 'bg-[#3B2924] border-[#201B18] text-white ring-2 ring-[#795548] shadow-xs';
                        } else if (isSeatBooked) {
                          seatBg = 'bg-[#4A433F] border-[#332D29] text-gray-400 cursor-not-allowed';
                        } else if (isSeatHeld) {
                          seatBg = 'bg-amber-400 border-amber-600 text-amber-950 cursor-not-allowed';
                        } else if (isSeatUnavailable) {
                          seatBg = 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed';
                        }

                        return (
                          <div
                            key={seat.seatId}
                            className="absolute flex items-center justify-center"
                            style={{
                              left: `calc(50% + ${seatX}px)`,
                              top: `calc(50% + ${seatY}px)`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 15
                            }}
                          >
                            {/* Generous touch hit-target wrapping the seat icon */}
                            <button
                              type="button"
                              disabled={isSeatBooked || isSeatHeld || isSeatUnavailable}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSeat(table.tableId, seat.seatNumber);
                              }}
                              onMouseEnter={() => setHoveredSeat({
                                tableNumber: table.tableNumber,
                                seatNumber: seat.seatNumber,
                                status: isSeatSelected ? 'Selected' : isSeatBooked ? 'Booked' : isSeatHeld ? 'Held' : 'Available'
                              })}
                              onMouseLeave={() => setHoveredSeat(null)}
                              className="w-7 h-7 -m-1 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none"
                              title={`Table ${table.tableNumber} • Seat ${seat.seatNumber} (${seat.status})`}
                              aria-label={`Select seat ${seat.seatNumber} at table ${table.tableNumber}`}
                            >
                              <span className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center text-[7.5px] sm:text-[8.5px] font-bold transition-transform hover:scale-125 active:scale-110 shadow-2xs ${seatBg}`}>
                                {seat.seatNumber}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* HOVER TOOLTIP / INSPECTOR POPUP */}
        {(hoveredSeat || hoveredTable) && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-40 bg-[#201B18]/95 text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl backdrop-blur-md text-xs shadow-lg flex items-center gap-2.5 border border-white/10 animate-in fade-in duration-150">
            {hoveredSeat ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#E9DFD2] shrink-0"></div>
                <div className="truncate">
                  <span className="font-semibold">{hoveredSeat.tableNumber}</span> • Seat #{hoveredSeat.seatNumber}
                  <span className="ml-2 text-[10px] uppercase font-bold text-[#E9DFD2] tracking-wider">
                    {hoveredSeat.status}
                  </span>
                </div>
              </>
            ) : hoveredTable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#795548] shrink-0"></div>
                <div className="truncate">
                  <span className="font-semibold">{hoveredTable.tableNumber}</span> ({hoveredTable.locationArea}) • {hoveredTable.capacity} Guests
                  <span className={`ml-2 text-[10px] uppercase font-bold tracking-wider ${
                    hoveredTable.status === 'available' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {hoveredTable.status}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        )}

      </div>

      {/* BOTTOM SELECTION STATUS BANNER */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E6DDD3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div>
          <span className="text-[#776B63]">Your Seat Choice: </span>
          {selectedTableId ? (
            <span className="font-bold text-[#201B18]">
              {tables.find(t => t.tableId === selectedTableId)?.tableNumber}
              {selectedSeats.length > 0 && ` (Seats: ${selectedSeats.join(', ')})`}
              {' • '}
              <span className="text-[#795548] font-medium">
                {tables.find(t => t.tableId === selectedTableId)?.locationArea}
              </span>
            </span>
          ) : (
            <span className="font-medium italic text-[#776B63]">
              Tap any table or seat on the map above to select your location.
            </span>
          )}
        </div>

        {selectedTableId && (
          <button
            type="button"
            onClick={() => onSelectTable('')}
            className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition cursor-pointer self-start sm:self-auto"
          >
            Clear Selection
          </button>
        )}
      </div>

    </div>
  );
}
