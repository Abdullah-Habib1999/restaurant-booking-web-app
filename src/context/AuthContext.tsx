'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { db } from '@/lib/db';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  registerOwner: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    restaurantName: string;
    address: string;
    city: string;
    cuisineType: string;
    description: string;
    seatingCapacity: number;
    numTables: number;
    openTime: string;
    closeTime: string;
  }) => Promise<{ success: boolean; error?: string; restaurantId?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('restro_active_user_id') : null;
      if (savedUserId) {
        const found = await db.getUserById(savedUserId);
        if (found) {
          setUser(found);
        }
      }
      setInitialized(true);
    };
    init();
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    const found = await db.getUserByEmail(email);
    if (!found) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (found.password && password && found.password !== password) {
      return { success: false, error: 'Incorrect password entered. Please try again.' };
    }
    setUser(found);
    if (typeof window !== 'undefined') {
      localStorage.setItem('restro_active_user_id', found.id);
    }
    return { success: true, user: found };
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('restro_active_user_id');
    }
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    await db.saveUser(updated);
    setUser(updated);
  };

  const registerOwner = async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    restaurantName: string;
    address: string;
    city: string;
    cuisineType: string;
    description: string;
    seatingCapacity: number;
    numTables: number;
    openTime: string;
    closeTime: string;
  }): Promise<{ success: boolean; error?: string; restaurantId?: string }> => {
    const existing = await db.getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    const userId = `owner-${Date.now()}`;
    const restaurantId = `rest-${Date.now()}`;
    const slug = data.restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // 1. Create Restaurant with 'pending_approval' status
    const newRestaurant = {
      id: restaurantId,
      ownerId: userId,
      name: data.restaurantName,
      slug: slug || `restaurant-${Date.now()}`,
      tagline: 'Artisanal dining & hospitality',
      description: data.description,
      cuisineType: data.cuisineType.split(',').map(s => s.trim()).filter(Boolean),
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      postalCode: '10001',
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      priceTier: '$$' as const,
      seatingManagementMode: 'individual_tables' as const,
      totalSeatingCapacity: Number(data.seatingCapacity),
      slotDurationMinutes: 90,
      bufferTimeMinutes: 15,
      advanceBookingDays: 30,
      minPartySize: 1,
      maxPartySize: 12,
      cancellationPolicy: 'Free cancellation up to 2 hours in advance.',
      cancellationCutoffHours: 2,
      requiresManualApproval: false,
      status: 'pending_approval' as const,
      createdAt: new Date().toISOString()
    };

    await db.saveRestaurant(newRestaurant);

    // 2. Create tables evenly distributed based on numTables
    const avgSeats = Math.max(2, Math.floor(data.seatingCapacity / Math.max(1, data.numTables)));
    for (let i = 1; i <= data.numTables; i++) {
      await db.saveTable({
        id: `tab-${restaurantId}-${i}`,
        restaurantId,
        tableNumber: `T-${i < 10 ? '0' + i : i}`,
        capacity: avgSeats,
        locationArea: 'Main Dining Room',
        isActive: true
      });
    }

    // 3. Create Operating Hours
    const hours = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: `hour-${restaurantId}-${day}`,
      restaurantId,
      dayOfWeek: day,
      openTime: data.openTime || '12:00',
      closeTime: data.closeTime || '23:00',
      isClosed: day === 1 // Monday closed
    }));
    await db.saveRestaurantHours(restaurantId, hours);

    // 4. Create User Profile
    const newUser: UserProfile = {
      id: userId,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      role: 'restaurant_owner',
      password: data.password,
      ownedRestaurantId: restaurantId,
      createdAt: new Date().toISOString()
    };
    await db.saveUser(newUser);

    // Log the user in
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('restro_active_user_id', newUser.id);
    }

    return { success: true, restaurantId };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        logout,
        updateProfile,
        registerOwner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
