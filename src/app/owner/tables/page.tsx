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
import { Restaurant, DiningTable, SeatingMode } from '@/types';

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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      isActive: true
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
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
          Seating Capacity & Table Allocation Engine
        </h1>
        <p className="text-sm text-[#6B625D] mt-1">
          Configure real-time capacity validation, table assignments, and anti-overbooking rules.
        </p>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* CORE ENGINE CONFIGURATION */}
      <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
          Capacity Strategy & Mode
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Mode 1: Individual Tables */}
          <div
            onClick={() => setMode('individual_tables')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'individual_tables'
                ? 'bg-[#FAF9F6] border-[#795548] ring-1 ring-[#795548]'
                : 'bg-white border-[#E8E1DA] hover:border-[#795548]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#1C1C1C]">
                  Individual Table Management
                </span>
                <input
                  type="radio"
                  checked={mode === 'individual_tables'}
                  onChange={() => setMode('individual_tables')}
                  className="accent-[#795548]"
                />
              </div>
              <p className="text-xs text-[#6B625D] mt-2 leading-relaxed">
                Reservations are assigned to concrete tables (e.g., T-01, Patio-4). Both the individual table capacity and total restaurant ceiling are checked simultaneously.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-[#795548]">
              Recommended for full-service dining
            </div>
          </div>

          {/* Mode 2: Simple Total Capacity */}
          <div
            onClick={() => setMode('total_capacity')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'total_capacity'
                ? 'bg-[#FAF9F6] border-[#795548] ring-1 ring-[#795548]'
                : 'bg-white border-[#E8E1DA] hover:border-[#795548]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#1C1C1C]">
                  Total Seat Pool Mode
                </span>
                <input
                  type="radio"
                  checked={mode === 'total_capacity'}
                  onChange={() => setMode('total_capacity')}
                  className="accent-[#795548]"
                />
              </div>
              <p className="text-xs text-[#6B625D] mt-2 leading-relaxed">
                The booking engine sums all overlapping party sizes against the overall seat limit without tying guests to specific table numbers until arrival.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-[#795548]">
              Ideal for open seating or lounge layouts
            </div>
          </div>

        </div>

        {/* Total Overall Seating Limit Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#E8E1DA]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B625D] mb-1">
              Overall Restaurant Seating Limit
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={totalCapacity}
              onChange={(e) => setTotalCapacity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-sm text-[#1C1C1C] font-semibold"
            />
            <p className="text-[11px] text-[#6B625D] mt-1">
              Hard limit: any booking request exceeding remaining capacity for that time window is rejected.
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleUpdateModeAndCapacity}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              Save Capacity Engine Rules
            </button>
          </div>
        </div>

      </div>

      {/* INDIVIDUAL TABLES MANAGEMENT (Only when table mode active) */}
      <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
              Dining Tables Inventory
            </h3>
            <p className="text-xs text-[#6B625D] mt-0.5">
              {tables.length} tables registered ({totalSeatsInTables} sum of table seats)
            </p>
          </div>
        </div>

        {/* Add Table Bar */}
        <form onSubmit={handleAddTable} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E1DA]">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#6B625D] mb-1">Table Label / Number</label>
            <input
              type="text"
              placeholder="e.g. T-12, Booth 3"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E8E1DA] bg-white text-xs text-[#1C1C1C]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#6B625D] mb-1">Seat Capacity</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E8E1DA] bg-white text-xs text-[#1C1C1C]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#6B625D] mb-1">Dining Area</label>
            <select
              value={newTableArea}
              onChange={(e) => setNewTableArea(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E8E1DA] bg-white text-xs text-[#1C1C1C]"
            >
              <option value="Main Dining Room">Main Dining Room</option>
              <option value="Window Alcove">Window Alcove</option>
              <option value="Courtyard Terrace">Courtyard Terrace</option>
              <option value="Private Dining">Private Dining Room</option>
              <option value="Bar / High-Top">Bar / High-Top</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Table
            </button>
          </div>
        </form>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <div
              key={table.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                table.isActive 
                  ? 'bg-white border-[#E8E1DA] shadow-xs' 
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-serif font-bold text-lg text-[#1C1C1C]">
                    {table.tableNumber}
                  </span>
                  <p className="text-xs text-[#795548] font-medium">
                    {table.locationArea}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF9F6] border border-[#E8E1DA] text-xs font-bold text-[#4E342E]">
                  <Users className="w-3.5 h-3.5" />
                  {table.capacity} Seats
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8E1DA]/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleTableActive(table)}
                  className={`font-semibold cursor-pointer ${table.isActive ? 'text-emerald-700' : 'text-gray-500'}`}
                >
                  {table.isActive ? '● Active' : '○ Inactive'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTable(table.id)}
                  className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                  title="Delete Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
