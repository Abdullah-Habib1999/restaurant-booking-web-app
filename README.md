# TableReserve: Multi-Restaurant Reservation & Pre-Ordering Platform

A modern, responsive full-stack web application designed for restaurant table reservations and advance food ordering. Customers can discover restaurants, verify real-time table seating capacity, pre-order Chef-curated dishes with locked-in prices, and receive immediate booking references. Restaurant owners manage their private console with live occupancy pacing, table allocations, interactive menu availability, and guest check-ins.

---

## 🌟 Key Architecture & Capabilities

### 1. Dual-Sided Portals
- **Customer Portal**:
  - **Home Page** with the headline *"Your Table. Your Time. Your Order."*, multi-parameter search, and featured destinations.
  - **Listing & Filter Directory** (`/restaurants`) filtering by cuisine, price tiers (`$`, `$$`, `$$$`, `$$$$`), party size, and availability.
  - **Interactive Detail & Pre-Order Flow** (`/restaurants/[slug]`): Real-time time slot capacity checking, category navigation, quantity selectors, live cart subtotals, server price snapshots, and confirmation reference generation.
  - **My Bookings Manager** (`/my-bookings`): Inspect active and historical reservations with itemized dish breakdowns and cancellation rules releasing table capacity.
  - **User & Persona Switcher** (`/profile` and Top Navbar): Instantly toggle between Customer and Restaurant Owner personas.

- **Restaurant Owner Portal**:
  - **Operations Overview** (`/owner/overview`): Real-time statistics including today's bookings, occupancy percentage, upcoming reservations, pre-order kitchen dish counts, and estimated revenue.
  - **Seating Capacity & Table Engine** (`/owner/tables`): Choose between *Individual Table Management* and *Total Seat Pool Mode*, add/edit tables, configure capacities, and prevent overbooking.
  - **Reservation & Pre-Order Console** (`/owner/reservations`): Manage arrival states (`Confirmed`, `Checked In`, `Completed`, `Cancelled`), view pre-ordered courses, and re-assign tables.
  - **Menu Management** (`/owner/menu`): Add categories and dishes, set prices, and toggle immediate dish availability (unavailable dishes cannot be pre-ordered).
  - **Restaurant Profile & Branding** (`/owner/profile`): Update venue details, address, cuisines, and cover media.
  - **Hours & Booking Rules** (`/owner/settings`): Configure slot duration (e.g., 90 mins), turnover buffer time, weekly schedules, cancellation cutoff notices, and manual approval requirements.

---

## 🛡️ Anti-Overbooking & Booking Business Rules

1. **Capacity Validation Engine**:
   - Compares overlapping time windows: `start < resEnd && end > resStart`.
   - Prevents total party count from exceeding the restaurant's active seating limit.
   - For individual table mode, automatically finds and allocates the best-fit active table with capacity `>= partySize`.
2. **Server Price Snapshotting**:
   - Order subtotals and taxes (8.875%) are calculated server-side.
   - Historical prices are locked into each reservation item, insulating existing bookings from subsequent menu price changes.
3. **Availability & Cancellation Pacing**:
   - Cancelled or no-show reservations immediately release reserved capacity back to the available pool.
   - Dishes flagged as `isAvailable = false` are blocked from pre-ordering.

---

## 🎨 Visual Design System

- **Warm White Background**: `#FAF9F6`
- **Main Surfaces**: `#FFFFFF`
- **Primary Brown**: `#795548`
- **Dark Brown**: `#4E342E`
- **Light Brown & Borders**: `#E8E1DA`
- **Typography & Aesthetics**: Clean typography with serif headlines, rounded cards, restrained shadows, and micro-interactions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- npm / npx

### Installation & Run

1. Clone or open the repository directory:
   ```bash
   cd "restront booking app"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the production bundle:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm run start
   # or development mode:
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🗄️ Database & Supabase Configuration

The application includes a dual-mode persistence architecture:
- By default, it operates in reactive local mode (`NEXT_PUBLIC_DATA_MODE=mock`), using comprehensive seed data and persistent browser storage.
- To connect to a live Supabase PostgreSQL database:
  1. Open [supabase/migrations/20261021_init_schema.sql](file:///c:/Users/abdul/OneDrive/Desktop/restront%20booking%20app/supabase/migrations/20261021_init_schema.sql) and execute the SQL migration in your Supabase SQL Editor.
  2. Copy `.env.example` to `.env.local` and configure your credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     NEXT_PUBLIC_DATA_MODE=supabase
     ```

---

## 🧪 Automated Acceptance Tests

To execute the programmatic test suite validating capacity allocation, overbooking rejection, pre-order pricing recalculation, and status transitions:

```bash
npx tsx test-acceptance.ts
```

All 8 backend and capacity engine tests will run and verify:
- Table inventory and total capacity verification.
- Slot generation based on operating hours.
- Overbooking rejection when party size exceeds available seats.
- Server-side pre-order price recalculation and reservation item snapshots.
- Capacity consumption and release upon cancellation.
- Rejection of unavailable menu items.
