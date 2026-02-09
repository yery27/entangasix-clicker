-- 1. Create App Settings Table for Maintenance Mode
CREATE TABLE IF NOT EXISTS public.server_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default maintenance mode setting if not exists
INSERT INTO public.server_settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.server_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings (needed for maintenance check)
CREATE POLICY "Public Read Settings" ON public.server_settings
    FOR SELECT USING (true);

-- Policy: Only Admins can update settings
-- Using a subquery optimization
CREATE POLICY "Admin Update Settings" ON public.server_settings
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL) AND
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    );

-- 2. Add Ban Reason to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT '';

-- 3. Add Lifetime Coins (if missing, for total stats editing)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lifetime_coins NUMERIC DEFAULT 0;
