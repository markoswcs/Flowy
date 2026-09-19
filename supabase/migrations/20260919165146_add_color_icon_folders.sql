ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS icon text;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';