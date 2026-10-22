-- ====================================================================
-- Multi-Restaurant Reservation & Pre-Ordering Platform Schema
-- Database: PostgreSQL (Supabase Compatible)
-- ====================================================================

-- 1. Profiles (Customers & Restaurant Owners)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'restaurant_owner', 'admin')) DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    cuisine_type TEXT[] NOT NULL DEFAULT '{}',
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cover_image_url TEXT,
    logo_url TEXT,
    price_tier TEXT NOT NULL CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')) DEFAULT '$$',
    seating_management_mode TEXT NOT NULL CHECK (seating_management_mode IN ('total_capacity', 'individual_tables')) DEFAULT 'individual_tables',
    total_seating_capacity INTEGER NOT NULL CHECK (total_seating_capacity >= 0),
    slot_duration_minutes INTEGER NOT NULL DEFAULT 90,
    buffer_time_minutes INTEGER NOT NULL DEFAULT 15,
    advance_booking_days INTEGER NOT NULL DEFAULT 30,
    min_party_size INTEGER NOT NULL DEFAULT 1,
    max_party_size INTEGER NOT NULL DEFAULT 20,
    cancellation_policy TEXT DEFAULT 'Cancellations made at least 2 hours prior to reservation time will receive a full pre-order refund.',
    cancellation_cutoff_hours INTEGER NOT NULL DEFAULT 2,
    requires_manual_approval BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'published', 'suspended')) DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Restaurant Operating Hours
CREATE TABLE IF NOT EXISTS public.restaurant_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(restaurant_id, day_of_week)
);

-- 4. Restaurant Closures / Special Holidays
CREATE TABLE IF NOT EXISTS public.restaurant_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    closure_date DATE NOT NULL,
    reason TEXT,
    UNIQUE(restaurant_id, closure_date)
);

-- 5. Individual Seating Tables
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location_area TEXT DEFAULT 'Main Dining', -- 'Main Dining', 'Patio', 'Window', 'Private Room'
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(restaurant_id, table_number)
);

-- 6. Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 7. Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_vegetarian BOOLEAN NOT NULL DEFAULT false,
    is_vegan BOOLEAN NOT NULL DEFAULT false,
    is_gluten_free BOOLEAN NOT NULL DEFAULT false,
    preparation_notes TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')) DEFAULT 'confirmed',
    assigned_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    special_requests TEXT,
    order_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    order_tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimated_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Reservation Items (Historical immutable price & details snapshot)
CREATE TABLE IF NOT EXISTS public.reservation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    special_instructions TEXT
);

-- 10. Reservation Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS public.reservation_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- Indexes for High Performance Querying & Anti-Overbooking
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON public.restaurants(status);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date ON public.reservations(restaurant_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.tables(restaurant_id);

-- ====================================================================
-- Row Level Security (RLS) Policies
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & update their own profile
CREATE POLICY profiles_user_policy ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Restaurants: Public can view published restaurants; Owners manage their own
CREATE POLICY restaurants_public_view ON public.restaurants
    FOR SELECT USING (status = 'published');
CREATE POLICY restaurants_owner_manage ON public.restaurants
    FOR ALL USING (auth.uid() = owner_id);

-- Tables: Public can view active tables; Owners manage
CREATE POLICY tables_owner_manage ON public.tables
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid())
    );

-- Menu Categories & Items: Public view; Owners manage
CREATE POLICY menu_categories_public ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY menu_categories_owner ON public.menu_categories
    FOR ALL USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_categories.restaurant_id AND r.owner_id = auth.uid()));

CREATE POLICY menu_items_public ON public.menu_items FOR SELECT USING (true);
CREATE POLICY menu_items_owner ON public.menu_items
    FOR ALL USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid()));

-- Reservations: Customer views their own; Restaurant owner views their restaurant's bookings
CREATE POLICY reservations_customer_view ON public.reservations
    FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY reservations_customer_insert ON public.reservations
    FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY reservations_owner_view ON public.reservations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid())
    );
