-- =============================================================================
-- ENHANCED RLS POLICIES WITH OWNERSHIP CONTROL
-- =============================================================================
-- This script implements SECURE Row-Level Security based on actual table schemas
-- Users can only access their OWN data based on user_id/created_by columns
-- 
-- SCHEMA DISCOVERED:
-- - ejemplar.user_id → Users own specific specimens
-- - purchases.created_by → Users own their purchases
-- - receipts.received_by → Users own receipts they received
-- - movimiento_de_inventario.user_id → Users see their inventory movements
-- - usuarios.supabase_uid → Maps to auth.uid()
-- 
-- Execute in Supabase SQL Editor AFTER creating helper function
-- =============================================================================

-- =============================================================================
-- STEP 0: CREATE HELPER FUNCTION (Maps auth.uid to usuarios.id)
-- =============================================================================
-- This function converts Supabase auth UUID to your usuarios.id (int8)

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.usuarios 
  WHERE supabase_uid = auth.uid() 
  AND active = true
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;

-- =============================================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =============================================================================

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
-- STEP 2: DROP EXISTING POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_active_only" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_service_all" ON public.usuarios;

DROP POLICY IF EXISTS "especies_public_select" ON public.especies;
DROP POLICY IF EXISTS "especies_authenticated_manage" ON public.especies;
DROP POLICY IF EXISTS "especies_service_all" ON public.especies;

DROP POLICY IF EXISTS "sectores_public_select" ON public.sectores;
DROP POLICY IF EXISTS "sectores_authenticated_manage" ON public.sectores;
DROP POLICY IF EXISTS "sectores_service_all" ON public.sectores;

DROP POLICY IF EXISTS "ejemplar_select_own" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_insert_own" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_update_own" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_delete_own" ON public.ejemplar;
DROP POLICY IF EXISTS "ejemplar_service_all" ON public.ejemplar;

DROP POLICY IF EXISTS "purchases_select_own" ON public.purchases;
DROP POLICY IF EXISTS "purchases_insert_own" ON public.purchases;
DROP POLICY IF EXISTS "purchases_update_own" ON public.purchases;
DROP POLICY IF EXISTS "purchases_service_all" ON public.purchases;

DROP POLICY IF EXISTS "purchase_items_select_via_purchase" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_insert_own" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_update_via_purchase" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items_service_all" ON public.purchase_items;

DROP POLICY IF EXISTS "receipts_select_own" ON public.receipts;
DROP POLICY IF EXISTS "receipts_insert_own" ON public.receipts;
DROP POLICY IF EXISTS "receipts_update_own" ON public.receipts;
DROP POLICY IF EXISTS "receipts_service_all" ON public.receipts;

DROP POLICY IF EXISTS "receipt_items_select_via_receipt" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_insert_own" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_update_via_receipt" ON public.receipt_items;
DROP POLICY IF EXISTS "receipt_items_service_all" ON public.receipt_items;

DROP POLICY IF EXISTS "public_views_anon_select" ON public.public_views;
DROP POLICY IF EXISTS "public_views_anon_insert" ON public.public_views;
DROP POLICY IF EXISTS "public_views_service_all" ON public.public_views;

DROP POLICY IF EXISTS "movimiento_select_own" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_insert_own" ON public.movimiento_de_inventario;
DROP POLICY IF EXISTS "movimiento_service_all" ON public.movimiento_de_inventario;

-- =============================================================================
-- STEP 3: CREATE PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_uid ON public.usuarios(supabase_uid) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_active ON public.usuarios(active);

CREATE INDEX IF NOT EXISTS idx_ejemplar_user_id ON public.ejemplar(user_id);
CREATE INDEX IF NOT EXISTS idx_ejemplar_species_id ON public.ejemplar(species_id);
CREATE INDEX IF NOT EXISTS idx_ejemplar_sector_id ON public.ejemplar(sector_id);

CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);

CREATE INDEX IF NOT EXISTS idx_receipts_received_by ON public.receipts(received_by);
CREATE INDEX IF NOT EXISTS idx_receipts_purchase_id ON public.receipts(purchase_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);

CREATE INDEX IF NOT EXISTS idx_movimiento_user_id ON public.movimiento_de_inventario(user_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_specimen_id ON public.movimiento_de_inventario(specimen_id);

-- =============================================================================
-- STEP 4: USUARIOS TABLE POLICIES
-- =============================================================================
-- Users can view their own profile and other active users (for collaboration)
-- Users can only update their own profile

-- View own profile
CREATE POLICY "usuarios_select_own"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
    supabase_uid = auth.uid()
    OR active = true  -- Can see other active users (for mentions, assignments, etc.)
);

-- Update own profile only
CREATE POLICY "usuarios_update_own"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (supabase_uid = auth.uid())
WITH CHECK (supabase_uid = auth.uid());

-- Service role bypass
CREATE POLICY "usuarios_service_all"
ON public.usuarios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 5: ESPECIES TABLE POLICIES (Public Catalog)
-- =============================================================================
-- Anyone can read species (public botanical information)
-- Authenticated users can manage (for staff/gardeners)

CREATE POLICY "especies_public_select"
ON public.especies
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "especies_authenticated_manage"
ON public.especies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "especies_service_all"
ON public.especies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 6: SECTORES TABLE POLICIES (Public Areas)
-- =============================================================================
-- Anyone can read sectors (needed for QR scanning)
-- Authenticated users can manage

CREATE POLICY "sectores_public_select"
ON public.sectores
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "sectores_authenticated_manage"
ON public.sectores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "sectores_service_all"
ON public.sectores
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 7: EJEMPLAR TABLE POLICIES (User-Owned Specimens)
-- =============================================================================
-- OWNERSHIP BASED: Users can only see/modify THEIR OWN specimens
-- This is the most restrictive policy - users own specific plant specimens

-- Select own specimens
CREATE POLICY "ejemplar_select_own"
ON public.ejemplar
FOR SELECT
TO authenticated
USING (user_id = public.get_current_user_id());

-- Insert specimens (automatically assigned to current user)
CREATE POLICY "ejemplar_insert_own"
ON public.ejemplar
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.get_current_user_id());

-- Update own specimens
CREATE POLICY "ejemplar_update_own"
ON public.ejemplar
FOR UPDATE
TO authenticated
USING (user_id = public.get_current_user_id())
WITH CHECK (user_id = public.get_current_user_id());

-- Delete own specimens
CREATE POLICY "ejemplar_delete_own"
ON public.ejemplar
FOR DELETE
TO authenticated
USING (user_id = public.get_current_user_id());

-- Service role bypass
CREATE POLICY "ejemplar_service_all"
ON public.ejemplar
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 8: PURCHASES TABLE POLICIES (User-Owned Purchases)
-- =============================================================================
-- Users can only see/modify their own purchases

-- Select own purchases
CREATE POLICY "purchases_select_own"
ON public.purchases
FOR SELECT
TO authenticated
USING (created_by = public.get_current_user_id());

-- Insert purchases (assigned to current user)
CREATE POLICY "purchases_insert_own"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (created_by = public.get_current_user_id());

-- Update own purchases
CREATE POLICY "purchases_update_own"
ON public.purchases
FOR UPDATE
TO authenticated
USING (created_by = public.get_current_user_id())
WITH CHECK (created_by = public.get_current_user_id());

-- Service role bypass
CREATE POLICY "purchases_service_all"
ON public.purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 9: PURCHASE_ITEMS TABLE POLICIES (Via Parent Purchase)
-- =============================================================================
-- Users can access purchase items if they own the parent purchase

-- Select items from own purchases
CREATE POLICY "purchase_items_select_via_purchase"
ON public.purchase_items
FOR SELECT
TO authenticated
USING (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE created_by = public.get_current_user_id()
    )
);

-- Insert items to own purchases
CREATE POLICY "purchase_items_insert_own"
ON public.purchase_items
FOR INSERT
TO authenticated
WITH CHECK (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE created_by = public.get_current_user_id()
    )
);

-- Update items from own purchases
CREATE POLICY "purchase_items_update_via_purchase"
ON public.purchase_items
FOR UPDATE
TO authenticated
USING (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE created_by = public.get_current_user_id()
    )
)
WITH CHECK (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE created_by = public.get_current_user_id()
    )
);

-- Service role bypass
CREATE POLICY "purchase_items_service_all"
ON public.purchase_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 10: RECEIPTS TABLE POLICIES (User-Owned Receipts)
-- =============================================================================
-- Users can only see receipts they received

-- Select own receipts
CREATE POLICY "receipts_select_own"
ON public.receipts
FOR SELECT
TO authenticated
USING (received_by = public.get_current_user_id());

-- Insert receipts (assigned to current user)
CREATE POLICY "receipts_insert_own"
ON public.receipts
FOR INSERT
TO authenticated
WITH CHECK (received_by = public.get_current_user_id());

-- Update own receipts
CREATE POLICY "receipts_update_own"
ON public.receipts
FOR UPDATE
TO authenticated
USING (received_by = public.get_current_user_id())
WITH CHECK (received_by = public.get_current_user_id());

-- Service role bypass
CREATE POLICY "receipts_service_all"
ON public.receipts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 11: RECEIPT_ITEMS TABLE POLICIES (Via Parent Receipt)
-- =============================================================================

-- Select items from own receipts
CREATE POLICY "receipt_items_select_via_receipt"
ON public.receipt_items
FOR SELECT
TO authenticated
USING (
    receipt_id IN (
        SELECT id FROM public.receipts 
        WHERE received_by = public.get_current_user_id()
    )
);

-- Insert items to own receipts
CREATE POLICY "receipt_items_insert_own"
ON public.receipt_items
FOR INSERT
TO authenticated
WITH CHECK (
    receipt_id IN (
        SELECT id FROM public.receipts 
        WHERE received_by = public.get_current_user_id()
    )
);

-- Update items from own receipts
CREATE POLICY "receipt_items_update_via_receipt"
ON public.receipt_items
FOR UPDATE
TO authenticated
USING (
    receipt_id IN (
        SELECT id FROM public.receipts 
        WHERE received_by = public.get_current_user_id()
    )
)
WITH CHECK (
    receipt_id IN (
        SELECT id FROM public.receipts 
        WHERE received_by = public.get_current_user_id()
    )
);

-- Service role bypass
CREATE POLICY "receipt_items_service_all"
ON public.receipt_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 12: PUBLIC_VIEWS TABLE POLICIES (Analytics)
-- =============================================================================
-- Anyone can read/write (for tracking page views)

CREATE POLICY "public_views_anon_select"
ON public.public_views
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public_views_anon_insert"
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
-- STEP 13: MOVIMIENTO_DE_INVENTARIO POLICIES (User-Owned Movements)
-- =============================================================================
-- Audit table: Users can see their own inventory movements
-- INSERT only (no updates/deletes to preserve audit trail)

-- Select own movements
CREATE POLICY "movimiento_select_own"
ON public.movimiento_de_inventario
FOR SELECT
TO authenticated
USING (user_id = public.get_current_user_id());

-- Insert movements (assigned to current user)
CREATE POLICY "movimiento_insert_own"
ON public.movimiento_de_inventario
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.get_current_user_id());

-- NOTE: No UPDATE or DELETE policies - audit trail should be immutable

-- Service role bypass
CREATE POLICY "movimiento_service_all"
ON public.movimiento_de_inventario
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 14: GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Public tables
GRANT SELECT ON public.especies TO anon, authenticated;
GRANT SELECT ON public.sectores TO anon, authenticated;
GRANT SELECT, INSERT ON public.public_views TO anon, authenticated;

-- Authenticated user tables
GRANT SELECT, UPDATE ON public.usuarios TO authenticated;
GRANT ALL ON public.especies TO authenticated;
GRANT ALL ON public.sectores TO authenticated;
GRANT ALL ON public.ejemplar TO authenticated;
GRANT ALL ON public.purchases TO authenticated;
GRANT ALL ON public.purchase_items TO authenticated;
GRANT ALL ON public.receipts TO authenticated;
GRANT ALL ON public.receipt_items TO authenticated;
GRANT SELECT, INSERT ON public.movimiento_de_inventario TO authenticated;

-- Service role (full access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================================================
-- STEP 15: VERIFICATION QUERIES
-- =============================================================================

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check helper function works:
-- SELECT public.get_current_user_id();  -- Should return your user ID when authenticated

-- Test as authenticated user:
-- SELECT * FROM ejemplar;  -- Should only see YOUR specimens
-- SELECT * FROM purchases;  -- Should only see YOUR purchases

-- =============================================================================
-- SECURITY SUMMARY
-- =============================================================================
--
-- OWNERSHIP MODEL:
-- ✅ ejemplar: Users own specimens via user_id
-- ✅ purchases: Users own purchases via created_by
-- ✅ receipts: Users own receipts via received_by
-- ✅ movimiento_de_inventario: Users see own movements via user_id
-- ✅ usuarios: Users see own profile + other active users
--
-- PUBLIC ACCESS:
-- ✅ especies: Anyone can read (public catalog)
-- ✅ sectores: Anyone can read (QR scanning)
-- ✅ public_views: Anyone can read/write (analytics)
--
-- AUDIT PROTECTION:
-- ✅ movimiento_de_inventario: INSERT only (no updates/deletes)
--
-- =============================================================================

