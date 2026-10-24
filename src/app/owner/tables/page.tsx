'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  Users, 
  Layers, 
  Info,
  AlertTriangle 
} from 'lucide-react';
import { db } from '@/lib/db';
import { Restaurant, DiningTable, SeatingMode, TableShape } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function TablesManagementPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mode, setMode] = useState<SeatingMode>('individual_tables');
  const [totalCapacity, setTotalCapacity] = useState<number>(48);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableArea, setNewTableArea] = useState('Main Dining Room');
  const [newTableShape, setNewTableShape] = useState<TableShape>('round');
  const [newTablePosX, setNewTablePosX] = useState(50);
  const [newTablePosY, setNewTablePosY] = useState(50);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'visual_editor'>('visual_editor');
  const [selectedEditTable, setSelectedEditTable] = useState<DiningTable | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const targetId = user?.ownedRestaurantId || 'rest-1';
      const rest = await db.getRestaurantById(targetId);
      if (rest) {
        setRestaurant(rest);
        setMode(rest.seatingManagementMode);
        setTotalCapacity(rest.totalSeatingCapacity);
        const tabList = await db.getTables(rest.id);
        setTables(tabList);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleUpdateModeAndCapacity = async () => {
    if (!restaurant) return;
    const updatedRest: Restaurant = {
      ...restaurant,
      seatingManagementMode: mode,
      totalSeatingCapacity: Number(totalCapacity)
    };
    await db.saveRestaurant(updatedRest);
    setRestaurant(updatedRest);
    setSaveMessage('Seating mode & capacity rules saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !newTableNumber.trim()) return;

    const newTab: DiningTable = {
      id: `tab-${Date.now()}`,
      restaurantId: restaurant.id,
      tableNumber: newTableNumber.trim(),
      capacity: Number(newTableCapacity),
      locationArea: newTableArea,
      isActive: true,
      shape: newTableShape,
      posX: Number(newTablePosX),
      posY: Number(newTablePosY)
    };

    await db.saveTable(newTab);
    setTables(prev => [...prev, newTab]);
    setNewTableNumber('');
    setNewTableCapacity(4);
    setSaveMessage(`Table ${newTab.tableNumber} added successfully.`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleToggleTableActive = async (table: DiningTable) => {
    const updated = { ...table, isActive: !table.isActive };
    await db.saveTable(updated);
    setTables(prev => prev.map(t => t.id === table.id ? updated : t));
  };

  const handleUpdateTablePosition = async (tableId: string, posX: number, posY: number, shape?: TableShape) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const updated: DiningTable = {
      ...table,
      posX,
      posY,
      ...(shape ? { shape } : {})
    };
    await db.saveTable(updated);
    setTables(prev => prev.map(t => t.id === tableId ? updated : t));
    if (selectedEditTable?.id === tableId) {
      setSelectedEditTable(updated);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    await db.deleteTable(tableId);
    setTables(prev => prev.filter(t => t.id !== tableId));
  };

  const totalSeatsInTables = tables
    .filter(t => t.isActive)
    .reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9]">
          Seating Capacity & Table Allocation Engine
        </h1>
        <p className="text-sm text-[#B7AAA0] mt-1">
          Configure real-time capacity validation, table assignments, and anti-overbooking rules.
        </p>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-[#132A1C] border border-[#22543D] text-xs text-[#86EFAC] font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-[#86EFAC]" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* CORE ENGINE CONFIGURATION */}
      <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
          Capacity Strategy & Mode
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Mode 1: Individual Tables */}
          <div
            onClick={() => setMode('individual_tables')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'individual_tables'
                ? 'bg-[#1C1917] border-[#8B5E45] ring-1 ring-[#8B5E45]'
                : 'bg-[#151311] border-[#332A25] hover:border-[#8B5E45]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#F5F0E9]">
                  Individual Table Management
                </span>
                <input
                  type="radio"
                  checked={mode === 'individual_tables'}
                  onChange={() => setMode('individual_tables')}
                  className="accent-[#8B5E45]"
                />
              </div>
              <p className="text-xs text-[#B7AAA0] mt-2 leading-relaxed">
                Reservations are assigned to concrete tables (e.g., T-01, Patio-4). Both the individual table capacity and total restaurant ceiling are checked simultaneously.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-[#C6A47E]">
              Recommended for full-service dining
            </div>
          </div>

          {/* Mode 2: Simple Total Capacity */}
          <div
            onClick={() => setMode('total_capacity')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'total_capacity'
                ? 'bg-[#1C1917] border-[#8B5E45] ring-1 ring-[#8B5E45]'
                : 'bg-[#151311] border-[#332A25] hover:border-[#8B5E45]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#F5F0E9]">
                  Total Seat Pool Mode
                </span>
                <input
                  type="radio"
                  checked={mode === 'total_capacity'}
                  onChange={() => setMode('total_capacity')}
                  className="accent-[#8B5E45]"
                />
              </div>
              <p className="text-xs text-[#B7AAA0] mt-2 leading-relaxed">
                The booking engine sums all overlapping party sizes against the overall seat limit without tying guests to specific table numbers until arrival.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-[#C6A47E]">
              Ideal for open seating or lounge layouts
            </div>
          </div>

        </div>

        {/* Total Overall Seating Limit Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#332A25]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8D8178] mb-1">
              Overall Restaurant Seating Limit
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={totalCapacity}
              onChange={(e) => setTotalCapacity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#332A25] bg-[#151311] text-sm text-[#F5F0E9] font-semibold focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
            <p className="text-[11px] text-[#8D8178] mt-1">
              Hard limit: any booking request exceeding remaining capacity for that time window is rejected.
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleUpdateModeAndCapacity}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              Save Capacity Engine Rules
            </button>
          </div>
        </div>

      </div>

      {/* SEATING LAYOUT & INVENTORY TABS */}
      <div className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Tab navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#332A25] pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
              Restaurant Seating Layout & Floor Plan
            </h3>
            <p className="text-xs text-[#B7AAA0] mt-0.5">
              {tables.length} tables registered ({totalSeatsInTables} active customer seats)
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-[#151311] rounded-xl border border-[#332A25]">
            <button
              type="button"
              onClick={() => setActiveTab('visual_editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'visual_editor'
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-sm'
                  : 'text-[#8D8178] hover:text-[#F5F0E9]'
              }`}
            >
              Visual Floor Plan Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#8B5E45] text-[#F5F0E9] shadow-sm'
                  : 'text-[#8D8178] hover:text-[#F5F0E9]'
              }`}
            >
              Table Inventory Grid
            </button>
          </div>
        </div>

        {/* VISUAL FLOOR PLAN EDITOR VIEW */}
        {activeTab === 'visual_editor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Floor Plan Canvas Preview (7 cols) */}
              <div className="lg:col-span-7 bg-[#111111] rounded-2xl p-4 sm:p-6 border border-[#332A25] relative overflow-hidden min-h-[380px] flex flex-col justify-between shadow-inner">
                {/* Architectural Wall boundary */}
                <div className="absolute inset-3 border-2 border-dashed border-[#332A25] rounded-xl pointer-events-none" />

                {/* Top Architectural Markers */}
                <div className="flex justify-between items-center z-10 text-[10px] text-[#C6A47E]">
                  <span className="px-2 py-0.5 rounded bg-[#181513] border border-[#332A25] uppercase font-mono">
                    Hearth Kitchen & Bar Pass
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#181513] border border-[#332A25] uppercase font-mono">
                    Sommelier Wine Cellar
                  </span>
                </div>

                {/* Tables on Floor */}
                <div className="relative w-full h-[300px] my-4">
                  {tables.map(table => {
                    const posX = table.posX ?? 50;
                    const posY = table.posY ?? 50;
                    const isSelected = selectedEditTable?.id === table.id;
                    const shape = table.shape || 'round';

                    return (
                      <div
                        key={table.id}
                        onClick={() => setSelectedEditTable(table)}
                        style={{
                          left: `${posX}%`,
                          top: `${posY}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        className={`absolute cursor-pointer transition-all duration-150 flex flex-col items-center justify-center p-2 text-center select-none ${
                          isSelected
                            ? 'ring-2 ring-[#C6A47E] scale-110 z-20'
                            : 'hover:scale-105 z-10'
                        } ${
                          shape === 'round'
                            ? 'w-16 h-16 rounded-full'
                            : shape === 'square'
                            ? 'w-16 h-16 rounded-xl'
                            : 'w-24 h-16 rounded-xl'
                        } ${
                          table.isActive
                            ? 'bg-[#EFEBE4] text-[#111111] shadow-md border-2 border-[#C6A47E]'
                            : 'bg-[#282828] text-[#8D8178] border border-[#332A25] line-through'
                        }`}
                        title={`Click to edit ${table.tableNumber}`}
                      >
                        <span className="text-[11px] font-bold font-serif leading-none">
                          {table.tableNumber}
                        </span>
                        <span className="text-[9px] text-[#8B5E45] font-semibold mt-0.5">
                          {table.capacity}p
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Architectural Markers */}
                <div className="flex justify-between items-center z-10 text-[10px] text-[#C6A47E]">
                  <span className="px-2 py-0.5 rounded bg-[#181513] border border-[#332A25] uppercase font-mono">
                    Entrance & Host Stand
                  </span>
                  <span className="text-[#8D8178] italic text-[11px]">
                    Click table on floor to reposition
                  </span>
                </div>
              </div>

              {/* Table Position & Shape Controls (5 cols) */}
              <div className="lg:col-span-5 bg-[#151311] rounded-2xl border border-[#332A25] p-5 space-y-4">
                {selectedEditTable ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#332A25] pb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A47E]">
                          Selected Table
                        </span>
                        <h4 className="font-serif text-lg font-bold text-[#F5F0E9]">
                          {selectedEditTable.tableNumber} ({selectedEditTable.locationArea})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEditTable(null)}
                        className="text-xs text-[#8D8178] hover:text-[#F5F0E9]"
                      >
                        Clear Selection
                      </button>
                    </div>

                    {/* Shape Selector */}
                    <div>
                      <label className="block text-xs font-semibold uppercase text-[#8D8178] mb-1.5">
                        Table Shape
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['round', 'square', 'rectangle'] as TableShape[]).map(sh => (
                          <button
                            key={sh}
                            type="button"
                            onClick={() => handleUpdateTablePosition(selectedEditTable.id, selectedEditTable.posX ?? 50, selectedEditTable.posY ?? 50, sh)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition cursor-pointer ${
                              (selectedEditTable.shape || 'round') === sh
                                ? 'bg-[#8B5E45] text-[#F5F0E9] border-[#8B5E45]'
                                : 'bg-[#181513] text-[#8D8178] border-[#332A25] hover:text-[#F5F0E9]'
                            }`}
                          >
                            {sh}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position Sliders */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-[#B7AAA0] mb-1">
                          <span>Horizontal Position (X)</span>
                          <span className="font-bold text-[#C6A47E]">{selectedEditTable.posX ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={selectedEditTable.posX ?? 50}
                          onChange={(e) => handleUpdateTablePosition(selectedEditTable.id, Number(e.target.value), selectedEditTable.posY ?? 50)}
                          className="w-full accent-[#8B5E45] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-[#B7AAA0] mb-1">
                          <span>Vertical Position (Y)</span>
                          <span className="font-bold text-[#C6A47E]">{selectedEditTable.posY ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="85"
                          value={selectedEditTable.posY ?? 50}
                          onChange={(e) => handleUpdateTablePosition(selectedEditTable.id, selectedEditTable.posX ?? 50, Number(e.target.value))}
                          className="w-full accent-[#8B5E45] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Table Status Toggle */}
                    <div className="pt-2 flex items-center justify-between border-t border-[#332A25]">
                      <button
                        type="button"
                        onClick={() => handleToggleTableActive(selectedEditTable)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          selectedEditTable.isActive
                            ? 'bg-[#132A1C] text-[#86EFAC] border-[#22543D]'
                            : 'bg-[#181513] text-[#8D8178] border-[#332A25]'
                        }`}
                      >
                        {selectedEditTable.isActive ? 'Active for Customer Booking' : 'Marked Inactive (Maintenance)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteTable(selectedEditTable.id);
                          setSelectedEditTable(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold p-1"
                      >
                        Delete Table
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-[#8D8178] space-y-2">
                    <Layers className="w-8 h-8 text-[#8B5E45] mx-auto opacity-70" />
                    <p className="text-xs font-semibold text-[#F5F0E9]">
                      Select a table on the floor plan
                    </p>
                    <p className="text-[11px] text-[#B7AAA0] max-w-xs mx-auto">
                      Click any table above to adjust its coordinates, shape (round/square/rectangle), or toggle availability.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Add Table Form */}
        <form onSubmit={handleAddTable} className="grid grid-cols-1 sm:grid-cols-6 gap-3 p-4 rounded-2xl bg-[#151311] border border-[#332A25]">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase text-[#8D8178] mb-1">Table Label / Number</label>
            <input
              type="text"
              placeholder="e.g. T-12, Booth 3"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#332A25] bg-[#181513] text-xs text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8D8178] mb-1">Seats</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-[#332A25] bg-[#181513] text-xs text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8D8178] mb-1">Shape</label>
            <select
              value={newTableShape}
              onChange={(e) => setNewTableShape(e.target.value as TableShape)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#332A25] bg-[#181513] text-xs text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            >
              <option value="round" className="bg-[#181513] text-[#F5F0E9]">Round</option>
              <option value="square" className="bg-[#181513] text-[#F5F0E9]">Square</option>
              <option value="rectangle" className="bg-[#181513] text-[#F5F0E9]">Rectangle</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#8D8178] mb-1">Area</label>
            <select
              value={newTableArea}
              onChange={(e) => setNewTableArea(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#332A25] bg-[#181513] text-xs text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            >
              <option value="Main Dining Room" className="bg-[#181513] text-[#F5F0E9]">Main Dining</option>
              <option value="Window Alcove" className="bg-[#181513] text-[#F5F0E9]">Window Alcove</option>
              <option value="Courtyard Terrace" className="bg-[#181513] text-[#F5F0E9]">Courtyard</option>
              <option value="Private Dining" className="bg-[#181513] text-[#F5F0E9]">Private Room</option>
              <option value="Bar / High-Top" className="bg-[#181513] text-[#F5F0E9]">Bar High-Top</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Table
            </button>
          </div>
        </form>

        {/* INVENTORY GRID VIEW */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  table.isActive 
                    ? 'bg-[#1C1917] border-[#332A25] shadow-sm' 
                    : 'bg-[#151311] border-[#332A25] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-serif font-bold text-lg text-[#F5F0E9]">
                      {table.tableNumber}
                    </span>
                    <p className="text-xs text-[#C6A47E] font-medium">
                      {table.locationArea} • <span className="capitalize">{table.shape || 'round'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151311] border border-[#332A25] text-xs font-bold text-[#C6A47E]">
                    <Users className="w-3.5 h-3.5" />
                    {table.capacity} Seats
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#332A25] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleTableActive(table)}
                    className={`font-semibold cursor-pointer ${table.isActive ? 'text-[#86EFAC]' : 'text-[#8D8178]'}`}
                  >
                    {table.isActive ? '● Active' : '○ Inactive'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table.id)}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
