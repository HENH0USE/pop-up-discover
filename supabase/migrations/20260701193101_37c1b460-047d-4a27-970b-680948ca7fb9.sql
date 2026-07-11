ALTER TABLE public.food_trucks ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs from names, ensuring uniqueness
WITH slugged AS (
  SELECT
    id,
    regexp_replace(
      trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
      '-+', '-', 'g'
    ) AS base,
    row_number() OVER (
      PARTITION BY regexp_replace(
        trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
        '-+', '-', 'g'
      )
      ORDER BY created_at
    ) AS rn
  FROM public.food_trucks
  WHERE slug IS NULL
)
UPDATE public.food_trucks ft
SET slug = CASE
  WHEN s.base = '' OR s.base IS NULL THEN 'truck-' || substr(ft.id::text, 1, 6)
  WHEN s.rn = 1 THEN s.base
  ELSE s.base || '-' || s.rn::text
END
FROM slugged s
WHERE ft.id = s.id;

CREATE UNIQUE INDEX IF NOT EXISTS food_trucks_slug_key ON public.food_trucks (slug);