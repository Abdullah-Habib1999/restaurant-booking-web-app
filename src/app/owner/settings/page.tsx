'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Restaurant, RestaurantHours } from '@/types';
import { Clock, Shield, Check, Calendar, AlertCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function OwnerSettingsPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Policy form states
  const [slotDuration, setSlotDuration] = useState(90);
  const [bufferTime, setBufferTime] = useState(15);
  const [minParty, setMinParty] = useState(1);
  const [maxParty, setMaxParty] = useState(10);
  const [cutoffHours, setCutoffHours] = useState(2);
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const targetId = user?.ownedRestaurantId || 'rest-1';
      const rest = await db.getRestaurantById(targetId);
      if (rest) {
        setRestaurant(rest);
        setSlotDuration(rest.slotDurationMinutes);
        setBufferTime(rest.bufferTimeMinutes);
        setMinParty(rest.minPartySize);
        setMaxParty(rest.maxPartySize);
        setCutoffHours(rest.cancellationCutoffHours);
        setCancellationPolicy(rest.cancellationPolicy);
        setRequiresApproval(rest.requiresManualApproval);

        const hList = await db.getRestaurantHours(rest.id);
        setHours(hList);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleUpdateHour = (dayIdx: number, field: 'openTime' | 'closeTime' | 'isClosed', val: any) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayIdx ? { ...h, [field]: val } : h));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const updated: Restaurant = {
      ...restaurant,
      slotDurationMinutes: Number(slotDuration),
      bufferTimeMinutes: Number(bufferTime),
      minPartySize: Number(minParty),
      maxPartySize: Number(maxParty),
      cancellationCutoffHours: Number(cutoffHours),
      cancellationPolicy,
      requiresManualApproval: requiresApproval
    };

    await Promise.all([
      db.saveRestaurant(updated),
      db.saveRestaurantHours(restaurant.id, hours)
    ]);

    setRestaurant(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#6B625D]">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
          Booking Rules & Operating Hours
        </h1>
        <p className="text-sm text-[#6B625D] mt-1">
          Configure service window pacing, cancellation terms, and opening schedules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Booking Engine Rules */}
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
            Reservation Timing & Party Pacing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">
                Reservation Slot Duration (Minutes)
              </label>
              <input
                type="number"
                min={30}
                max={240}
                step={15}
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C] font-semibold"
              />
              <p className="text-[10px] text-[#6B625D] mt-1">Typical table seating duration before turning over.</p>
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">
                Buffer Time Between Turnovers (Minutes)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                step={5}
                value={bufferTime}
                onChange={(e) => setBufferTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C] font-semibold"
              />
              <p className="text-[10px] text-[#6B625D] mt-1">Kitchen reset and table sanitation buffer.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-[#E8E1DA]">
            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Minimum Party Size</label>
              <input
                type="number"
                min={1}
                max={10}
                value={minParty}
                onChange={(e) => setMinParty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Maximum Party Size</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxParty}
                onChange={(e) => setMaxParty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E1DA]">
            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-[#1C1C1C]">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="accent-[#795548] w-4 h-4"
              />
              Require manual owner confirmation before bookings are finalized (Pending state)
            </label>
          </div>
        </div>

        {/* Operating Hours Table */}
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
            Weekly Operating Schedule
          </h3>
          <p className="text-xs text-[#6B625D]">
            The availability engine automatically restricts bookings outside these hours.
          </p>

          <div className="divide-y divide-[#E8E1DA]/60">
            {DAYS.map((dayName, idx) => {
              const dayHour = hours.find(h => h.dayOfWeek === idx) || {
                openTime: '12:00',
                closeTime: '23:00',
                isClosed: false
              };
              return (
                <div key={dayName} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="w-32 font-bold text-[#1C1C1C]">
                    {dayName}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#6B625D]">
                      <input
                        type="checkbox"
                        checked={dayHour.isClosed}
                        onChange={(e) => handleUpdateHour(idx, 'isClosed', e.target.checked)}
                        className="accent-[#795548]"
                      />
                      Closed All Day
                    </label>

                    {!dayHour.isClosed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dayHour.openTime}
                          onChange={(e) => handleUpdateHour(idx, 'openTime', e.target.value)}
                          className="px-2 py-1 rounded-lg border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                        />
                        <span className="text-[#6B625D]">to</span>
                        <input
                          type="time"
                          value={dayHour.closeTime}
                          onChange={(e) => handleUpdateHour(idx, 'closeTime', e.target.value)}
                          className="px-2 py-1 rounded-lg border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white rounded-3xl border border-[#E8E1DA] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
            Cancellation & Modification Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">
                Cancellation Cutoff Notice (Hours)
              </label>
              <input
                type="number"
                min={0}
                max={72}
                value={cutoffHours}
                onChange={(e) => setCutoffHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold uppercase text-[#6B625D] mb-1">
              Public Policy Text
            </label>
            <textarea
              rows={2}
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved ? (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> All settings updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            Save Booking Rules & Hours
          </button>
        </div>

      </form>
    </div>
  );
}
