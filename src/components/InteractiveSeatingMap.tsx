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
      className="bg-[#181513] rounded-3xl border border-[#332A25] p-3.5 sm:p-6 shadow-xl shadow-black/50 flex flex-col space-y-3.5 select-none w-full max-w-full overflow-hidden"
    >
      
      {/* MAP HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#332A25] pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C6A47E] animate-pulse"></span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#C6A47E]">
              Interactive Floor Plan • Cinema-Style Seating
            </span>
          </div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-[#F5F0E9] mt-0.5">
            {restaurantName} Seating Layout
          </h3>
        </div>

        {/* View mode toggle & Zoom buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-xl bg-[#151311] border border-[#332A25] p-0.5 sm:p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('isometric')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'isometric' 
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-xs' 
                  : 'text-[#B7AAA0] hover:text-[#F5F0E9]'
              }`}
            >
              3D View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('topDown')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'topDown' 
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-xs' 
                  : 'text-[#B7AAA0] hover:text-[#F5F0E9]'
              }`}
            >
              2D Plan
            </button>
          </div>

          <div className="flex items-center rounded-xl bg-[#151311] border border-[#332A25] p-0.5 sm:p-1 shadow-xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917] transition cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917] transition cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-[#B7AAA0] hover:text-[#F5F0E9] hover:bg-[#1C1917] transition cursor-pointer"
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SEATING COLOR LEGEND */}
      <div className="flex items-center justify-start sm:justify-between flex-wrap gap-x-3 gap-y-1.5 py-2 px-3.5 rounded-2xl bg-[#151311] border border-[#332A25] text-[11px] shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#EFEBE4] border border-[#C5BAAF] inline-block shadow-xs"></span>
          <span className="text-[#B7AAA0] font-medium">Available</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#8B5E45] border border-[#C6A47E] inline-block ring-2 ring-[#C6A47E]/40 shadow-xs"></span>
          <span className="text-[#F5F0E9] font-bold">Selected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#282828] border border-[#444444] inline-block"></span>
          <span className="text-[#8D8178] font-medium">Booked</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-400 inline-block"></span>
          <span className="text-[#B7AAA0] font-medium">Held</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#1C1917] border border-[#332A25] inline-block text-[#666] text-[8px] flex items-center justify-center">✕</span>
          <span className="text-[#8D8178] font-medium">Unavailable</span>
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
        className="relative w-full h-[400px] xs:h-[440px] sm:h-[520px] rounded-3xl bg-[#111111] border border-[#332A25] overflow-hidden shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        
        {/* Subtle grid background to simulate hardwood or architectural tiles */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(#332A25 1.5px, transparent 1.5px),
              linear-gradient(to right, #1C1917 1px, transparent 1px),
              linear-gradient(to bottom, #1C1917 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-[#0B0B0B]/80 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-[#C6A47E] gap-2">
            <span className="w-4 h-4 border-2 border-[#C6A47E] border-t-transparent rounded-full animate-spin"></span>
            Syncing live seating availability...
          </div>
        )}

        {/* Mobile touch pan indicator badge */}
        <div className="absolute top-2 right-2 z-20 pointer-events-none opacity-85 sm:hidden flex items-center gap-1 bg-[#1C1917]/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-[#C6A47E] font-medium border border-[#332A25] shadow-xs">
          <Move className="w-3 h-3" />
          <span>Pan & Zoom enabled</span>
        </div>

        {/* FIXED VIRTUAL STAGE CANVAS */}
        {(() => {
          const virtualW = 620;
          const virtualH = 480;
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
              <div className="absolute top-2 left-6 right-6 h-7 sm:h-8 rounded-xl bg-[#181513] border border-[#38251F] flex items-center justify-between px-3 sm:px-4 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#C6A47E] pointer-events-none shadow-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">Open Kitchen & Hearth</span>
                </span>
                <span className="text-[8px] sm:text-[9px] text-[#8D8178] shrink-0">Pass</span>
              </div>

              {/* Entrance Door at Bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-[#1C1917] border border-[#38251F] text-[9px] sm:text-[10px] font-bold text-[#C6A47E] shadow-sm flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                <Compass className="w-3 h-3 text-[#C6A47E]" />
                Guest Entrance
              </div>

              {/* Bar / Wine Counter on Right */}
              <div className="absolute top-14 right-2 w-9 h-40 rounded-2xl bg-[#181513] border border-[#38251F] flex flex-col items-center justify-center text-[8px] font-bold uppercase tracking-widest text-[#C6A47E] pointer-events-none origin-center shadow-sm">
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

                // Determine table background styling based on state
                let tableBg = 'bg-[#1C1917] text-[#F5F0E9] border-[#54372D] hover:border-[#C6A47E] hover:bg-[#25211E]';
                if (isSelected) {
                  tableBg = 'bg-[#8B5E45] text-[#F5F0E9] border-[#C6A47E] shadow-xl ring-4 ring-[#C6A47E]/30 scale-105';
                } else if (isBooked) {
                  tableBg = 'bg-[#242424] text-[#888888] border-[#3A3A3A] opacity-90 cursor-not-allowed';
                } else if (isHeld) {
                  tableBg = 'bg-[#38251F] text-amber-300 border-amber-600 cursor-not-allowed';
                } else if (isUnavailable) {
                  tableBg = 'bg-[#181513] text-[#555555] border-[#25201C] cursor-not-allowed';
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
                          ? (isSelected ? '0 14px 28px -4px rgba(0, 0, 0, 0.7)' : '0 6px 14px -2px rgba(0,0,0,0.5)')
                          : '0 2px 6px rgba(0,0,0,0.4)'
                      }}
                    >
                      <span className="font-serif font-bold text-xs tracking-tight">
                        {table.tableNumber}
                      </span>
                      <span className={`text-[8.5px] font-semibold flex items-center gap-0.5 ${
                        isSelected ? 'text-[#F5F0E9]' : 'text-[#B7AAA0]'
                      }`}>
                        <Users className="w-2.5 h-2.5 text-[#C6A47E]" />
                        {table.capacity}p
                      </span>

                      {/* Status Indicator Icon */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C6A47E] text-[#1C1917] flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      {isBooked && (
                        <div className="absolute -top-1 -right-1 px-1 rounded-sm bg-[#111111] text-[#999999] text-[8px] font-mono border border-[#3A3A3A]">
                          BOOKED
                        </div>
                      )}
                    </div>

                    {/* INDIVIDUAL CINEMA SEATS AROUND THIS TABLE */}
                    <div className="pointer-events-auto">
                      {table.seats.map((seat, seatIdx) => {
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

                        // Distinct, visible seat styling
                        let seatBg = 'bg-[#EFEBE4] border-[#A89F91] text-[#1C1917] hover:bg-white hover:border-[#C6A47E]';
                        if (isSeatSelected) {
                          seatBg = 'bg-[#8B5E45] border-[#C6A47E] text-[#F5F0E9] ring-2 ring-[#C6A47E] shadow-sm';
                        } else if (isSeatBooked) {
                          seatBg = 'bg-[#2E2E2E] border-[#484848] text-[#888888] cursor-not-allowed';
                        } else if (isSeatHeld) {
                          seatBg = 'bg-amber-500 border-amber-300 text-amber-950 cursor-not-allowed';
                        } else if (isSeatUnavailable) {
                          seatBg = 'bg-[#1C1917] border-[#332A25] text-[#555555] cursor-not-allowed';
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
                              <span className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center text-[7.5px] sm:text-[8.5px] font-bold transition-transform hover:scale-125 active:scale-110 shadow-xs ${seatBg}`}>
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
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-40 bg-[#181513]/95 text-[#F5F0E9] px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl backdrop-blur-md text-xs shadow-xl flex items-center gap-2.5 border border-[#332A25] animate-in fade-in duration-150">
            {hoveredSeat ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#C6A47E] shrink-0"></div>
                <div className="truncate">
                  <span className="font-semibold text-[#F5F0E9]">{hoveredSeat.tableNumber}</span> • Seat #{hoveredSeat.seatNumber}
                  <span className="ml-2 text-[10px] uppercase font-bold text-[#C6A47E] tracking-wider">
                    {hoveredSeat.status}
                  </span>
                </div>
              </>
            ) : hoveredTable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#8B5E45] shrink-0"></div>
                <div className="truncate">
                  <span className="font-semibold text-[#F5F0E9]">{hoveredTable.tableNumber}</span> ({hoveredTable.locationArea}) • {hoveredTable.capacity} Guests
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
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#151311] border border-[#332A25] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div>
          <span className="text-[#B7AAA0]">Your Seat Choice: </span>
          {selectedTableId ? (
            <span className="font-bold text-[#F5F0E9]">
              {tables.find(t => t.tableId === selectedTableId)?.tableNumber}
              {selectedSeats.length > 0 && ` (Seats: ${selectedSeats.join(', ')})`}
              {' • '}
              <span className="text-[#C6A47E] font-medium">
                {tables.find(t => t.tableId === selectedTableId)?.locationArea}
              </span>
            </span>
          ) : (
            <span className="font-medium italic text-[#8D8178]">
              Tap any table or seat on the map above to select your location.
            </span>
          )}
        </div>

        {selectedTableId && (
          <button
            type="button"
            onClick={() => onSelectTable('')}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer self-start sm:self-auto"
          >
            Clear Selection
          </button>
        )}
      </div>

    </div>
  );
}
