ALTER TABLE public.food_trucks
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS card_text_color text,
  ADD COLUMN IF NOT EXISTS card_accent_color text;