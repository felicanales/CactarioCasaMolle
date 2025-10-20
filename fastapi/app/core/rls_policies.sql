-- RLS Policies for Cactario Casa Molle
-- These policies ensure proper access control based on Supabase Auth

-- Enable RLS on all tables
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE especies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;

-- Policies for usuarios table
-- Only authenticated users can read their own data
CREATE POLICY "Users can view own profile" ON usuarios
    FOR SELECT USING (auth.uid()::text = supabase_uid);

-- Only service role can insert/update/delete users (admin operations)
CREATE POLICY "Service role can manage users" ON usuarios
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for especies table
-- Authenticated users can read all species
CREATE POLICY "Authenticated users can read species" ON especies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify species (admin operations)
CREATE POLICY "Service role can manage species" ON especies
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for sectores table
-- Authenticated users can read all sectors
CREATE POLICY "Authenticated users can read sectors" ON sectores
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify sectors (admin operations)
CREATE POLICY "Service role can manage sectors" ON sectores
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON usuarios TO authenticated;
GRANT SELECT ON especies TO authenticated;
GRANT SELECT ON sectores TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
