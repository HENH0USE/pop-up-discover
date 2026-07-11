ALTER TABLE public.food_trucks
  ADD COLUMN IF NOT EXISTS spot_photo_url text,
  ADD COLUMN IF NOT EXISTS menu_photo_url text;