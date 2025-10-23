-- =============================================================================
-- ⚠️ DEPRECATED - Use rls_policies_secure.sql instead
-- =============================================================================
-- This file has been superseded by a more secure and comprehensive version.
-- Please use: fastapi/app/core/rls_policies_secure.sql
--
-- The new file includes:
-- - More granular policies
-- - Performance indexes
-- - Better documentation
-- - Proper ownership and role-based access control
-- =============================================================================

-- RLS Policies for Cactario Casa Molle
-- These policies ensure proper access control based on Supabase Auth
-- IMPORTANT: Execute this SQL in Supabase SQL Editor to apply all security policies

-- =============================================================================
-- STEP 1: Enable RLS on ALL tables
-- =============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE especies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejemplar ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento_de_inventario ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Drop existing policies (if re-running this script)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Service role can manage users" ON usuarios;
DROP POLICY IF EXISTS "Authenticated users can read species" ON especies;
DROP POLICY IF EXISTS "Service role can manage species" ON especies;
DROP POLICY IF EXISTS "Authenticated users can read sectors" ON sectores;
DROP POLICY IF EXISTS "Service role can manage sectors" ON sectores;

-- =============================================================================
-- STEP 3: Policies for USUARIOS table
-- =============================================================================
-- Authenticated users can view their own profile
CREATE POLICY "Users can view own profile" ON usuarios
    FOR SELECT 
    TO authenticated
    USING (auth.uid()::text = supabase_uid);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update own profile" ON usuarios
    FOR UPDATE 
    TO authenticated
    USING (auth.uid()::text = supabase_uid)
    WITH CHECK (auth.uid()::text = supabase_uid);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role can manage users" ON usuarios
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 4: Policies for ESPECIES table (Species)
-- =============================================================================
-- Authenticated users can read all species
CREATE POLICY "Authenticated users can read species" ON especies
    FOR SELECT 
    TO authenticated
    USING (true);

-- Service role can manage species (for admin operations)
CREATE POLICY "Service role can manage species" ON especies
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can insert species (if needed by your app)
CREATE POLICY "Authenticated users can insert species" ON especies
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update species (if needed by your app)
CREATE POLICY "Authenticated users can update species" ON especies
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 5: Policies for SECTORES table (Sectors)
-- =============================================================================
-- Authenticated users can read all sectors
CREATE POLICY "Authenticated users can read sectors" ON sectores
    FOR SELECT 
    TO authenticated
    USING (true);

-- Service role can manage sectors
CREATE POLICY "Service role can manage sectors" ON sectores
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can insert sectors (if needed by your app)
CREATE POLICY "Authenticated users can insert sectors" ON sectores
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update sectors (if needed by your app)
CREATE POLICY "Authenticated users can update sectors" ON sectores
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 6: Policies for EJEMPLAR table (Specimens/Instances)
-- =============================================================================
-- Authenticated users can read all ejemplares
CREATE POLICY "Authenticated users can read ejemplar" ON ejemplar
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can insert ejemplares
CREATE POLICY "Authenticated users can insert ejemplar" ON ejemplar
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update ejemplares
CREATE POLICY "Authenticated users can update ejemplar" ON ejemplar
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Authenticated users can delete ejemplares
CREATE POLICY "Authenticated users can delete ejemplar" ON ejemplar
    FOR DELETE 
    TO authenticated
    USING (true);

-- Service role has full access
CREATE POLICY "Service role can manage ejemplar" ON ejemplar
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 7: Policies for PURCHASES table
-- =============================================================================
-- Authenticated users can read all purchases
CREATE POLICY "Authenticated users can read purchases" ON purchases
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can create purchases
CREATE POLICY "Authenticated users can create purchases" ON purchases
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update purchases
CREATE POLICY "Authenticated users can update purchases" ON purchases
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage purchases" ON purchases
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 8: Policies for PURCHASE_ITEMS table
-- =============================================================================
-- Authenticated users can read all purchase items
CREATE POLICY "Authenticated users can read purchase_items" ON purchase_items
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can create purchase items
CREATE POLICY "Authenticated users can create purchase_items" ON purchase_items
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update purchase items
CREATE POLICY "Authenticated users can update purchase_items" ON purchase_items
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage purchase_items" ON purchase_items
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 9: Policies for RECEIPTS table
-- =============================================================================
-- Authenticated users can read all receipts
CREATE POLICY "Authenticated users can read receipts" ON receipts
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can create receipts
CREATE POLICY "Authenticated users can create receipts" ON receipts
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update receipts
CREATE POLICY "Authenticated users can update receipts" ON receipts
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage receipts" ON receipts
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 10: Policies for RECEIPT_ITEMS table
-- =============================================================================
-- Authenticated users can read all receipt items
CREATE POLICY "Authenticated users can read receipt_items" ON receipt_items
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can create receipt items
CREATE POLICY "Authenticated users can create receipt_items" ON receipt_items
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update receipt items
CREATE POLICY "Authenticated users can update receipt_items" ON receipt_items
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage receipt_items" ON receipt_items
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 11: Policies for PUBLIC_VIEWS table
-- =============================================================================
-- Anyone can read public views (including anonymous users)
CREATE POLICY "Anyone can read public_views" ON public_views
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Only authenticated users can create/update public views
CREATE POLICY "Authenticated users can manage public_views" ON public_views
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage public_views" ON public_views
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 12: Policies for MOVIMIENTO_DE_INVENTARIO table (Inventory Movements)
-- =============================================================================
-- Authenticated users can read all inventory movements
CREATE POLICY "Authenticated users can read movimiento_inventario" ON movimiento_de_inventario
    FOR SELECT 
    TO authenticated
    USING (true);

-- Authenticated users can create inventory movements
CREATE POLICY "Authenticated users can create movimiento_inventario" ON movimiento_de_inventario
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update inventory movements
CREATE POLICY "Authenticated users can update movimiento_inventario" ON movimiento_de_inventario
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role can manage movimiento_inventario" ON movimiento_de_inventario
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 13: Grant necessary schema and table permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT to authenticated users on all tables
GRANT SELECT ON usuarios TO authenticated;
GRANT SELECT ON especies TO authenticated;
GRANT SELECT ON sectores TO authenticated;
GRANT SELECT ON ejemplar TO authenticated;
GRANT SELECT ON purchases TO authenticated;
GRANT SELECT ON purchase_items TO authenticated;
GRANT SELECT ON receipts TO authenticated;
GRANT SELECT ON receipt_items TO authenticated;
GRANT SELECT ON public_views TO anon, authenticated;
GRANT SELECT ON movimiento_de_inventario TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (as needed)
GRANT INSERT, UPDATE, DELETE ON especies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sectores TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ejemplar TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchase_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON receipts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON receipt_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON movimiento_de_inventario TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================================================
-- VERIFICATION QUERIES (Run these to check your RLS status)
-- =============================================================================
-- Check which tables have RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check all policies:
-- SELECT schemaname, tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';
