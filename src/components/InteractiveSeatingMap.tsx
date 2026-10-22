'use client';

import React, { useState, useMemo } from 'react';
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
  Sparkles
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
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0); // 0 or 15 degrees for isometric tilt
  const [viewMode, setViewMode] = useState<'isometric' | 'topDown'>('isometric');
  const [hoveredTable, setHoveredTable] = useState<TableSeatStatus | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<{ tableNumber: string; seatNumber: number; status: string } | null>(null);

  // Group tables by location area for visual architecture
  const locationAreas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach(t => {
      if (t.locationArea) set.add(t.locationArea);
    });
    return Array.from(set);
  }, [tables]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.75));
  const handleResetView = () => {
    setZoom(1);
    setRotationAngle(0);
    setViewMode('isometric');
  };

  return (
    <div className="bg-[#FAF9F6] rounded-3xl border border-[#E6DDD3] p-5 sm:p-6 shadow-sm flex flex-col space-y-4 select-none">
      
      {/* MAP HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DDD3] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#795548] animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#795548]">
              Interactive Floor Plan • Cinema-Style Seating
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-[#201B18] mt-0.5">
            {restaurantName} Seating Layout
          </h3>
        </div>

        {/* View mode toggle & Zoom buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl bg-white border border-[#E6DDD3] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('isometric')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'isometric' 
                  ? 'bg-[#3B2924] text-white shadow-2xs' 
                  : 'text-[#776B63] hover:text-[#201B18]'
              }`}
            >
              3D Isometric
            </button>
            <button
              type="button"
              onClick={() => setViewMode('topDown')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'topDown' 
                  ? 'bg-[#3B2924] text-white shadow-2xs' 
                  : 'text-[#776B63] hover:text-[#201B18]'
              }`}
            >
              2D Plan
            </button>
          </div>

          <div className="flex items-center rounded-xl bg-white border border-[#E6DDD3] p-1 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-[#776B63] hover:text-[#201B18] hover:bg-[#F8F5F0] transition cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SEATING COLOR LEGEND */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-2 px-3 rounded-2xl bg-white border border-[#E6DDD3] text-xs shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-[#EFEBE4] border border-[#C5BAAF] inline-block shadow-2xs"></span>
          <span className="text-[#6B625D] text-[11px] font-medium">Available</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-[#3B2924] border border-[#201B18] inline-block ring-2 ring-[#795548]/40 shadow-xs"></span>
          <span className="text-[#201B18] text-[11px] font-bold">Selected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-[#4A433F] border border-[#332D29] inline-block"></span>
          <span className="text-[#6B625D] text-[11px] font-medium">Booked</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-600 inline-block"></span>
          <span className="text-[#6B625D] text-[11px] font-medium">Held (5m)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-gray-300 border border-gray-400 inline-block line-through text-gray-500 text-[8px] flex items-center justify-center">✕</span>
          <span className="text-[#6B625D] text-[11px] font-medium">Maintenance</span>
        </div>
      </div>

      {/* FLOOR PLAN CANVAS STAGE */}
      <div className="relative w-full h-[460px] sm:h-[500px] rounded-3xl bg-white border border-[#E6DDD3] overflow-hidden shadow-inner flex items-center justify-center">
        
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

        {/* 3D / ISOMETRIC CONTAINER */}
        <div
          className="relative w-full h-full transition-transform duration-300 ease-out origin-center"
          style={{
            transform: viewMode === 'isometric'
              ? `scale(${zoom}) rotateX(24deg) rotateZ(-6deg)`
              : `scale(${zoom})`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* ARCHITECTURAL RESTAURANT MARKERS */}
          {/* Kitchen / Chef Pass Area */}
          <div className="absolute top-2 left-6 right-6 h-8 rounded-xl bg-[#3B2924]/5 border border-[#3B2924]/20 flex items-center justify-between px-4 text-[10px] uppercase font-bold tracking-widest text-[#795548]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Open Kitchen & Wood-Fired Hearth
            </span>
            <span className="text-[9px] text-[#A89F91]">Service Area</span>
          </div>

          {/* Entrance Door at Bottom */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#E9DFD2] border border-[#C5BAAF] text-[10px] font-bold text-[#3B2924] shadow-2xs flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-[#795548]" />
            Guest Entrance & Host Stand
          </div>

          {/* Bar / Wine Counter on Right */}
          <div className="absolute top-20 right-3 w-10 h-44 rounded-2xl bg-[#E6DDD3]/60 border border-[#C5BAAF] flex flex-col items-center justify-center text-[9px] font-bold uppercase tracking-widest text-[#795548] rotate-90 sm:rotate-0 origin-center">
            <span className="[writing-mode:vertical-rl] tracking-wider text-[9px]">Sommelier Wine Cellar</span>
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
            
            // Width / Height based on shape & capacity
            let tableWidth = 64;
            let tableHeight = 64;
            if (isRound) {
              tableWidth = 66;
              tableHeight = 66;
            } else if (isRectangle) {
              tableWidth = table.capacity >= 10 ? 120 : 96;
              tableHeight = 56;
            } else {
              tableWidth = 64;
              tableHeight = 64;
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
                {/* 3D TABLE TOP SURFACE */}
                <div
                  onClick={() => {
                    if (isSelectable) {
                      onSelectTable(table.tableId);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center p-2 border-2 transition-all cursor-pointer ${
                    isRound ? 'rounded-full' : 'rounded-2xl'
                  } ${tableBg}`}
                  style={{
                    width: `${tableWidth}px`,
                    height: `${tableHeight}px`,
                    boxShadow: viewMode === 'isometric' 
                      ? (isSelected ? '0 12px 24px -4px rgba(59, 41, 36, 0.4)' : '0 6px 12px -2px rgba(0,0,0,0.12)')
                      : undefined
                  }}
                >
                  <span className="font-serif font-bold text-xs tracking-tight">
                    {table.tableNumber}
                  </span>
                  <span className={`text-[9px] font-semibold flex items-center gap-0.5 ${
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
                    // Position seats evenly around table perimeter
                    const totalSeats = table.seats.length;
                    const angle = (seatIdx / totalSeats) * 2 * Math.PI;
                    const radiusX = (tableWidth / 2) + 12;
                    const radiusY = (tableHeight / 2) + 12;
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
                      <button
                        key={seat.seatId}
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
                        className={`absolute w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-bold transition-transform cursor-pointer hover:scale-125 ${seatBg}`}
                        style={{
                          left: `calc(50% + ${seatX}px)`,
                          top: `calc(50% + ${seatY}px)`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 15
                        }}
                        title={`Table ${table.tableNumber} • Seat ${seat.seatNumber} (${seat.status})`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

        {/* HOVER TOOLTIP / INSPECTOR POPUP */}
        {(hoveredSeat || hoveredTable) && (
          <div className="absolute bottom-4 left-4 z-40 bg-[#201B18]/95 text-white px-3.5 py-2 rounded-xl backdrop-blur-md text-xs shadow-lg flex items-center gap-3 border border-white/10 animate-in fade-in duration-150">
            {hoveredSeat ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[#E9DFD2]"></div>
                <div>
                  <span className="font-semibold">{hoveredSeat.tableNumber}</span> • Seat #{hoveredSeat.seatNumber}
                  <span className="ml-2 text-[10px] uppercase font-bold text-[#E9DFD2] tracking-wider">
                    {hoveredSeat.status}
                  </span>
                </div>
              </>
            ) : hoveredTable ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[#795548]"></div>
                <div>
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
      <div className="p-3.5 rounded-2xl bg-white border border-[#E6DDD3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
              Click any available table or seat on the map above to select your location.
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
