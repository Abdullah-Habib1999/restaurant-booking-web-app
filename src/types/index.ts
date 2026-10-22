export type UserRole = 'customer' | 'restaurant_owner' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  password?: string;
  ownedRestaurantId?: string;
  createdAt: string;
}

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';
export type SeatingMode = 'total_capacity' | 'individual_tables';
export type RestaurantStatus = 'draft' | 'pending_approval' | 'published' | 'suspended';

export interface RestaurantHours {
  id: string;
  restaurantId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  openTime: string; // "11:00"
  closeTime: string; // "23:00"
  isClosed: boolean;
}

export interface RestaurantClosure {
  id: string;
  restaurantId: string;
  closureDate: string; // "YYYY-MM-DD"
  reason?: string;
}

export type TableShape = 'round' | 'square' | 'rectangle';

export interface DiningTable {
  id: string;
  restaurantId: string;
  tableNumber: string; // e.g. "T-01", "Table 4", "VIP-A"
  capacity: number;
  locationArea: string; // "Main Dining Room", "Patio", "Window", "Terrace", "Private Room"
  isActive: boolean;
  shape?: TableShape; // 'round' | 'square' | 'rectangle'
  posX?: number; // X coordinate on floor plan (0-100 percentage or canvas px)
  posY?: number; // Y coordinate on floor plan (0-100 percentage or canvas px)
  rotation?: number; // in degrees
}

export interface TableSeatStatus {
  tableId: string;
  tableNumber: string;
  capacity: number;
  shape: TableShape;
  locationArea: string;
  isActive: boolean;
  posX: number;
  posY: number;
  status: 'available' | 'selected' | 'booked' | 'held' | 'unavailable';
  heldExpiresAt?: number; // timestamp
  bookedByReference?: string;
  seats: {
    seatNumber: number;
    seatId: string;
    status: 'available' | 'selected' | 'booked' | 'held' | 'unavailable';
  }[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isNonVegetarian?: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  preparationNotes?: string;
  displayOrder: number;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  description?: string;
  isActive: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  cuisineType: string[];
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  coverImageUrl: string;
  logoUrl?: string;
  priceTier: PriceTier;
  seatingManagementMode: SeatingMode;
  totalSeatingCapacity: number;
  slotDurationMinutes: number;
  bufferTimeMinutes: number;
  advanceBookingDays: number;
  minPartySize: number;
  maxPartySize: number;
  cancellationPolicy: string;
  cancellationCutoffHours: number;
  requiresManualApproval: boolean;
  status: RestaurantStatus;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export type ReservationStatus = 
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface PreOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface Reservation {
  id: string;
  bookingReference: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  reservationDate: string; // "YYYY-MM-DD"
  startTime: string; // "19:00"
  endTime: string; // "20:30"
  status: ReservationStatus;
  assignedTableId?: string;
  assignedTableName?: string;
  assignedSeatNumbers?: number[]; // e.g. [1, 2, 3, 4]
  specialRequests?: string;
  orderSubtotal: number;
  orderTax: number;
  estimatedTotal: number;
  items: PreOrderItem[];
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlotAvailability {
  time: string;
  formattedTime: string;
  isAvailable: boolean;
  reason?: string;
  remainingSeats: number;
  maxPartyAllowed: number;
  suggestedTableId?: string;
}
