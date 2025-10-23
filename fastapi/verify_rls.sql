-- =============================================================================
-- RLS VERIFICATION SCRIPT
-- =============================================================================
-- Run this script AFTER executing rls_policies_secure.sql to verify everything
-- is configured correctly.
-- =============================================================================

-- =============================================================================
-- 1. CHECK THAT RLS IS ENABLED ON ALL TABLES
-- =============================================================================
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'usuarios', 'especies', 'sectores', 'ejemplar',
        'purchases', 'purchase_items', 'receipts', 'receipt_items',
        'public_views', 'movimiento_de_inventario'
    )
ORDER BY 
    CASE WHEN rowsecurity = true THEN 1 ELSE 0 END,
    tablename;

-- Expected: All tables should show '✅ ENABLED'

-- =============================================================================
-- 2. COUNT POLICIES PER TABLE
-- =============================================================================
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have multiple policies (at least 2-5)

-- =============================================================================
-- 3. CHECK POLICY DETAILS
-- =============================================================================
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅'
        ELSE '⚠️ RESTRICTIVE'
    END as type,
    cmd as operation,
    CASE 
        WHEN 'authenticated' = ANY(roles) AND 'anon' = ANY(roles) THEN 'Public + Auth'
        WHEN 'authenticated' = ANY(roles) THEN 'Auth Only'
        WHEN 'anon' = ANY(roles) THEN 'Anon Only'
        WHEN 'service_role' = ANY(roles) THEN 'Service Role'
        ELSE array_to_string(roles, ', ')
    END as access_level
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =============================================================================
-- 4. CHECK TABLE PERMISSIONS (GRANTS)
-- =============================================================================
SELECT 
    table_name,
    grantee,
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN (
        'usuarios', 'especies', 'sectores', 'ejemplar',
        'purchases', 'purchase_items', 'receipts', 'receipt_items',
        'public_views', 'movimiento_de_inventario'
    )
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- =============================================================================
-- 5. CHECK INDEXES FOR POLICY PERFORMANCE
-- =============================================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_%uid%'
        OR indexname LIKE 'idx_%species%'
        OR indexname LIKE 'idx_%sector%'
        OR indexname LIKE 'idx_%user%'
    )
ORDER BY tablename, indexname;

-- Expected: Should see indexes like idx_usuarios_supabase_uid, idx_ejemplar_species_id

-- =============================================================================
-- 6. SECURITY CHECK: NO TABLES WITHOUT RLS
-- =============================================================================
SELECT 
    tablename,
    '⚠️ WARNING: RLS NOT ENABLED' as warning
FROM pg_tables 
WHERE schemaname = 'public'
    AND rowsecurity = false
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%';

-- Expected: No rows (all tables should have RLS enabled)

-- =============================================================================
-- 7. TEST POLICY LOGIC (SIMULATED)
-- =============================================================================
-- This shows what policies would apply for different roles

SELECT 
    'ANONYMOUS USER' as user_type,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND 'anon' = ANY(roles)
ORDER BY tablename;

SELECT 
    'AUTHENTICATED USER' as user_type,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND 'authenticated' = ANY(roles)
ORDER BY tablename;

-- =============================================================================
-- 8. SUMMARY REPORT
-- =============================================================================
WITH table_security AS (
    SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
        AND t.tablename IN (
            'usuarios', 'especies', 'sectores', 'ejemplar',
            'purchases', 'purchase_items', 'receipts', 'receipt_items',
            'public_views', 'movimiento_de_inventario'
        )
    GROUP BY t.tablename, t.rowsecurity
)
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true AND policy_count > 0 THEN '✅ SECURE'
        WHEN rowsecurity = true AND policy_count = 0 THEN '⚠️ RLS ON, NO POLICIES'
        WHEN rowsecurity = false THEN '❌ NOT SECURE'
    END as security_status,
    policy_count as policies
FROM table_security
ORDER BY 
    CASE 
        WHEN rowsecurity = true AND policy_count > 0 THEN 1
        WHEN rowsecurity = true AND policy_count = 0 THEN 2
        ELSE 3
    END,
    tablename;

-- =============================================================================
-- EXPECTED RESULTS SUMMARY
-- =============================================================================
-- All tables should show:
-- ✅ RLS Enabled: true
-- ✅ Policy count: 2-5 policies per table
-- ✅ No warnings about missing RLS
-- ✅ Indexes exist for policy columns
-- 
-- If you see any ❌ or ⚠️, review and re-run rls_policies_secure.sql
-- =============================================================================

