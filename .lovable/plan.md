# Food Truck Finder App — Build Plan

## Overview
A full-stack web app where local food truck vendors sign up, create profiles, and manage their real-time location, schedule, menu, and photos. Visitors browse nearby open trucks on an interactive map, filter by cuisine, and view truck details.

## Tech Stack
- **Frontend**: TanStack Start + React + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (PostgreSQL, Auth, Storage)
- **Map**: Google Maps Platform (connector)
- **Queries**: TanStack Query

## Database Schema

### `profiles`
Extends `auth.users` with vendor-facing fields.
- `id` (uuid, FK → auth.users, PK)
- `display_name` (text)
- `avatar_url` (text)
- `created_at`, `updated_at`

### `food_trucks`
Core truck listing. One per vendor.
- `id` (uuid, PK)
- `owner_id` (uuid, FK → auth.users, NOT NULL)
- `name` (text, NOT NULL)
- `description` (text)
- `cuisine_type` (text, NOT NULL) — e.g. "Tacos", "Burgers", "Dessert"
- `photo_url` (text)
- `is_active` (boolean, default true)
- `current_location` (point/geometry OR lat/lng + address text)
- `current_location_address` (text)
- `is_open_now` (boolean, default false)
- `created_at`, `updated_at`

### `menu_items`
Items for each truck.
- `id` (uuid, PK)
- `truck_id` (uuid, FK → food_trucks, NOT NULL)
- `name` (text, NOT NULL)
- `description` (text)
- `price` (numeric, NOT NULL)
- `photo_url` (text)
- `created_at`

### `schedules`
Recurring weekly schedule entries.
- `id` (uuid, PK)
- `truck_id` (uuid, FK → food_trucks, NOT NULL)
- `day_of_week` (int, 0–6, NOT NULL)
- `start_time` (time, NOT NULL)
- `end_time` (time, NOT NULL)
- `location_name` (text)
- `location_address` (text)
- `latitude`, `longitude` (numeric)

## Phase 1: Foundation
1. **Migrations**: Create all tables with RLS policies, GRANTs, and auto-profile trigger.
2. **Auth setup**: Configure email/password + Google OAuth.
3. **Google Maps**: Connect Google Maps Platform connector.
4. **Storage**: Create bucket for truck/food images.

## Phase 2: Public Browse Experience
1. **Home / Browse page** (`/`): List view of active trucks.
   - Filter by cuisine type, search by name.
   - "Open Now" toggle based on schedule.
   - Sort by distance (if geolocation granted).
2. **Map view**: Toggle between list and map. Show truck pins with info cards.
3. **Truck detail page** (`/truck/$truckId`):
   - Photos, description, cuisine.
   - Full menu with prices.
   - Weekly schedule.
   - Current location on map.

## Phase 3: Vendor Dashboard
1. **Auth pages** (`/auth`): Sign in / sign up with email + Google.
2. **Vendor layout** (`/_authenticated`):
   - **Dashboard** (`/dashboard`): Overview — edit truck profile, toggle open/closed, update live location.
   - **Menu manager** (`/dashboard/menu`): Add/edit/delete menu items with photos.
   - **Schedule manager** (`/dashboard/schedule`): Set weekly recurring schedule.

## Phase 4: Polish
- Responsive design.
- Real-time "open now" badge computed from schedule.
- Loading skeletons.
- Empty states.
- SEO meta per route.

## Open Questions
Before I start building, I need to confirm one thing:

**User profiles**: Beyond the food truck listing itself (name, photo, description), do vendors need a separate personal profile (e.g., a display name or avatar shown on reviews or in the app)? Or is the truck profile the only profile needed?
