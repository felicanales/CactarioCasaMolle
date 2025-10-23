-- =============================================================================
-- SECURE RLS POLICIES FOR CACTARIO CASA MOLLE
-- =============================================================================
-- This script implements Row-Level Security (RLS) following Supabase best practices
-- Execute this in the Supabase SQL Editor to fix all security warnings
--
-- IMPORTANT: Review and adjust policies based on your specific business requirements
-- =============================================================================

-- =============================================================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- =============================================================================
-- This immediately blocks unauthorized access until explicit policies are created

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejemplar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_de_inventario ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 2: DROP EXISTING POLICIES (for idempotency)
-- =============================================================================

-- usuarios
DROP POLICY IF EXISTS "usuarios_authenticated_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_authenticated_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_service_all" ON public.usuarios;

-- especies
DROP POLICY IF EXISTS "especies_public_select" ON public.especies;
DROP POLICY IF EXISTS "especies_authenticated_insert" ON public.especies;
DROP POLICY IF EXISTS "especies_authenticated_update" ON public.especies;
DROP POLICY IF EXISTS "especies_authenticated_delete" ON public.especies;
DROP POLICY IF EXISTS "especies_service_all" ON public.especies;

-- sectores
DROP POLICY IF EXISTS "sectores_public_select" ON public.sectores;
DROP POLICY IF EXISTS "sectores_authenticated_insert" ON public.sectores;
DROP POLICY IF EXISTS "sectores_authenticated_update" ON public.sectores;
DROP POLICY IF EXISTS "sectores_authenticated_delete" ON public.sectores;
DROP POLICY IF EXISTS "sectores_service_all" ON public.sectores;

-- ejemplar
DROP POLICY IF EXISTS "ejemplar_authenticated_select" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_authenticated_insert" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_authenticated_update" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_authenticated_delete" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_service_all" ON public.ejemplar;

-- purchases
DROP POLICY IF EXISTS "purchases_authenticated_select" ON public.purchases;
DROP POLICY IF EXISTS "purchases_authenticated_insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases_authenticated_update" ON public.purchases;
DROP POLICY IF EXISTS "purchases_authenticated_delete" ON public.purchases;
DROP POLICY IF EXISTS "purchases_service_all" ON public.purchases;

-- purchase_items
DROP POLICY IF EXISTS "purchase_items_authenticated_select" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_authenticated_insert" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_authenticated_update" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_authenticated_delete" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_service_all" ON public.purchase_items;

-- receipts
DROP POLICY IF EXISTS "receipts_authenticated_select" ON public.receipts;
DROP POLICY IF EXISTS "receipts_authenticated_insert" ON public.receipts;
DROP POLICY IF EXISTS "receipts_authenticated_update" ON public.receipts;
DROP POLICY IF EXISTS "receipts_authenticated_delete" ON public.receipts;
DROP POLICY IF EXISTS "receipts_service_all" ON public.receipts;

-- receipt_items
DROP POLICY IF EXISTS "receipt_items_authenticated_select" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_authenticated_insert" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_authenticated_update" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_authenticated_delete" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_service_all" ON public.receipt_items;

-- public_views
DROP POLICY IF EXISTS "public_views_anon_select" ON public.public_views;
DROP POLICY IF EXISTS "public_views_authenticated_all" ON public.public_views;
DROP POLICY IF EXISTS "public_views_service_all" ON public.public_views;

-- movimiento_de_inventario
DROP POLICY IF EXISTS "movimiento_inventario_authenticated_select" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_inventario_authenticated_insert" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_inventario_authenticated_update" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_inventario_authenticated_delete" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_inventario_service_all" ON public.movimiento_de_inventario;

-- =============================================================================
-- PART 3: CREATE OPTIMIZED INDEXES FOR POLICY PERFORMANCE
-- =============================================================================
-- These indexes improve RLS policy evaluation performance

-- If usuarios has a supabase_uid column for auth mapping:
CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_uid ON public.usuarios(supabase_uid);

-- Index foreign keys used in joins (if they exist):
CREATE INDEX IF NOT EXISTS idx_ejemplar_species_id ON public.ejemplar(species_id);
CREATE INDEX IF NOT EXISTS idx_ejemplar_sector_id ON public.ejemplar(sector_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);

-- If you have created_by or user_id columns for ownership tracking:
-- CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases(created_by);
-- CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON public.receipts(created_by);

-- =============================================================================
-- PART 4: USUARIOS TABLE POLICIES
-- =============================================================================
-- Users can only view and update their own profile
-- Service role has full access for admin operations

CREATE POLICY "usuarios_authenticated_select_own"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
    auth.uid()::text = supabase_uid
);

CREATE POLICY "usuarios_authenticated_update_own"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth.uid()::text = supabase_uid)
WITH CHECK (auth.uid()::text = supabase_uid);

CREATE POLICY "usuarios_service_all"
ON public.usuarios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 5: ESPECIES TABLE POLICIES (Species Catalog)
-- =============================================================================
-- PUBLIC ACCESS: Anyone (including anonymous) can read species
-- STAFF ACCESS: Authenticated users can manage species (add/edit/delete)
-- This is common for public botanical gardens/catalogs

CREATE POLICY "especies_public_select"
ON public.especies
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "especies_authenticated_insert"
ON public.especies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "especies_authenticated_update"
ON public.especies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "especies_authenticated_delete"
ON public.especies
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "especies_service_all"
ON public.especies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 6: SECTORES TABLE POLICIES (Sectors/Areas Catalog)
-- =============================================================================
-- PUBLIC ACCESS: Anyone can view sectors (needed for QR code scanning)
-- STAFF ACCESS: Only authenticated users can manage sectors

CREATE POLICY "sectores_public_select"
ON public.sectores
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "sectores_authenticated_insert"
ON public.sectores
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "sectores_authenticated_update"
ON public.sectores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "sectores_authenticated_delete"
ON public.sectores
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "sectores_service_all"
ON public.sectores
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 7: EJEMPLAR TABLE POLICIES (Specimen/Inventory Items)
-- =============================================================================
-- RESTRICTED: Only authenticated users can access ejemplar data
-- This is sensitive inventory information
--
-- OPTION A: If ejemplar should be visible to public (for QR scanning):
--   Change TO authenticated below to: TO anon, authenticated
--
-- OPTION B: If ejemplar has a created_by/user_id column for ownership:
--   Add ownership filters like: USING (created_by = auth.uid())

CREATE POLICY "ejemplar_authenticated_select"
ON public.ejemplar
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ejemplar_authenticated_insert"
ON public.ejemplar
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "ejemplar_authenticated_update"
ON public.ejemplar
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "ejemplar_authenticated_delete"
ON public.ejemplar
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "ejemplar_service_all"
ON public.ejemplar
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 8: PURCHASES TABLE POLICIES
-- =============================================================================
-- STAFF ONLY: Only authenticated users can manage purchases
--
-- OPTION: If purchases have user ownership, add filters:
--   USING (created_by = auth.uid()) for user-scoped access

CREATE POLICY "purchases_authenticated_select"
ON public.purchases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "purchases_authenticated_insert"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "purchases_authenticated_update"
ON public.purchases
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "purchases_authenticated_delete"
ON public.purchases
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "purchases_service_all"
ON public.purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 9: PURCHASE_ITEMS TABLE POLICIES
-- =============================================================================

CREATE POLICY "purchase_items_authenticated_select"
ON public.purchase_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "purchase_items_authenticated_insert"
ON public.purchase_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "purchase_items_authenticated_update"
ON public.purchase_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "purchase_items_authenticated_delete"
ON public.purchase_items
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "purchase_items_service_all"
ON public.purchase_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 10: RECEIPTS TABLE POLICIES
-- =============================================================================

CREATE POLICY "receipts_authenticated_select"
ON public.receipts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "receipts_authenticated_insert"
ON public.receipts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "receipts_authenticated_update"
ON public.receipts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "receipts_authenticated_delete"
ON public.receipts
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "receipts_service_all"
ON public.receipts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 11: RECEIPT_ITEMS TABLE POLICIES
-- =============================================================================

CREATE POLICY "receipt_items_authenticated_select"
ON public.receipt_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "receipt_items_authenticated_insert"
ON public.receipt_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "receipt_items_authenticated_update"
ON public.receipt_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "receipt_items_authenticated_delete"
ON public.receipt_items
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "receipt_items_service_all"
ON public.receipt_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 12: PUBLIC_VIEWS TABLE POLICIES
-- =============================================================================
-- This table tracks public page views (analytics)
-- Anonymous users can read, authenticated users can write

CREATE POLICY "public_views_anon_select"
ON public.public_views
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public_views_authenticated_all"
ON public.public_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "public_views_service_all"
ON public.public_views
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 13: MOVIMIENTO_DE_INVENTARIO TABLE POLICIES (Inventory Movements)
-- =============================================================================
-- AUDIT TABLE: Staff can view all movements, create new entries
-- Updates/Deletes restricted to maintain audit trail integrity

CREATE POLICY "movimiento_inventario_authenticated_select"
ON public.movimiento_de_inventario
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "movimiento_inventario_authenticated_insert"
ON public.movimiento_de_inventario
FOR INSERT
TO authenticated
WITH CHECK (true);

-- OPTIONAL: Allow updates (uncomment if needed)
-- CREATE POLICY "movimiento_inventario_authenticated_update"
-- ON public.movimiento_de_inventario
-- FOR UPDATE
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- OPTIONAL: Allow deletes (uncomment if needed, but NOT recommended for audit tables)
-- CREATE POLICY "movimiento_inventario_authenticated_delete"
-- ON public.movimiento_de_inventario
-- FOR DELETE
-- TO authenticated
-- USING (true);

CREATE POLICY "movimiento_inventario_service_all"
ON public.movimiento_de_inventario
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- PART 14: GRANT SCHEMA AND TABLE PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant SELECT to anonymous and authenticated users on public-facing tables
GRANT SELECT ON public.especies TO anon, authenticated;
GRANT SELECT ON public.sectores TO anon, authenticated;
GRANT SELECT ON public.public_views TO anon, authenticated;

-- Grant CRUD to authenticated users on operational tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.especies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ejemplar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_items TO authenticated;
GRANT SELECT, INSERT ON public.public_views TO anon, authenticated;
GRANT SELECT, INSERT ON public.movimiento_de_inventario TO authenticated;

-- Grant ALL to service_role (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================================================
-- PART 15: VERIFICATION QUERIES
-- =============================================================================
-- Run these queries after executing this script to verify everything is set up correctly

-- Check RLS is enabled on all tables:
-- SELECT 
--     schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- Check all policies created:
-- SELECT 
--     schemaname, tablename, policyname, 
--     permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- Check table permissions:
-- SELECT 
--     grantee, table_schema, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
-- ORDER BY table_name, grantee, privilege_type;

-- Test policy as authenticated user (replace with your JWT):
-- SET request.jwt.claim.sub = 'YOUR_USER_UUID';
-- SELECT * FROM public.usuarios LIMIT 1;

-- =============================================================================
-- NOTES AND CUSTOMIZATION GUIDE
-- =============================================================================
--
-- 1. OWNERSHIP-BASED POLICIES:
--    If your tables have user_id or created_by columns, replace:
--      USING (true) 
--    with:
--      USING (user_id = auth.uid())
--
-- 2. ROLE-BASED POLICIES:
--    If you have custom roles (admin, manager, etc.) in JWT claims:
--      USING ((auth.jwt() ->> 'role') = 'admin')
--
-- 3. TENANT/ORGANIZATION POLICIES:
--    For multi-tenant apps with tenant_id or organization_id:
--      USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--
-- 4. TIME-BASED POLICIES:
--    Restrict access to recent records:
--      USING (created_at > now() - interval '30 days')
--
-- 5. PERFORMANCE OPTIMIZATION:
--    - Always index columns used in USING() clauses
--    - Keep policy logic simple (complex joins slow down queries)
--    - Use database functions for reusable policy logic
--
-- 6. TESTING CHECKLIST:
--    □ Test as anonymous user (should be denied on most tables)
--    □ Test as authenticated user (should see allowed data)
--    □ Test as service_role (should bypass all RLS)
--    □ Test INSERT/UPDATE with invalid data (should be denied)
--    □ Verify indexes exist on policy filter columns
--
-- =============================================================================

