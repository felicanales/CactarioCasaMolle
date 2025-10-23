# 🔐 Row-Level Security (RLS) Implementation Guide

## ⚠️ Critical Security Issue Detected

Supabase has detected that **10 tables** are publicly accessible without Row-Level Security (RLS) enabled. This means:

- ❌ Anyone can access all data in these tables
- ❌ No authentication required to read/modify data
- ❌ Data breaches and unauthorized access are possible
- ❌ Fails security compliance standards

**This must be fixed immediately for production deployments.**

---

## 📋 Tables Requiring RLS

| Table | Status | Risk Level |
|-------|--------|------------|
| `ejemplar` | ❌ No RLS | HIGH |
| `sectores` | ❌ No RLS | MEDIUM |
| `usuarios` | ❌ No RLS | CRITICAL |
| `especies` | ❌ No RLS | LOW |
| `purchases` | ❌ No RLS | HIGH |
| `purchase_items` | ❌ No RLS | HIGH |
| `receipts` | ❌ No RLS | HIGH |
| `receipt_items` | ❌ No RLS | HIGH |
| `public_views` | ❌ No RLS | LOW |
| `movimiento_de_inventario` | ❌ No RLS | HIGH |

---

## 🚀 Quick Fix (5 minutes)

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **SQL Editor** in the left sidebar
3. Create a new query

### Step 2: Execute the Security Script

**Copy and paste the entire contents** of `fastapi/app/core/rls_policies_secure.sql` into the SQL Editor.

Click **Run** or press `Ctrl+Enter`.

### Step 3: Verify Success

Run this verification query:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Expected Result:** All tables should show `rowsecurity = true`

---

## 📊 What the Security Script Does

### 1. **Enables RLS on All Tables** ✅

```sql
ALTER TABLE public.ejemplar ENABLE ROW LEVEL SECURITY;
```

This **immediately blocks** all unauthorized access until policies are defined.

### 2. **Creates Access Policies** ✅

The script creates specific policies for each table based on these principles:

#### 🔹 **Public Tables** (Anyone can read)
- `especies` - Species catalog (public botanical information)
- `sectores` - Sectors/areas (needed for QR code scanning)
- `public_views` - Analytics (public page view tracking)

#### 🔹 **Staff-Only Tables** (Authenticated users only)
- `ejemplar` - Inventory items (sensitive business data)
- `purchases` / `purchase_items` - Purchase records
- `receipts` / `receipt_items` - Receipt records
- `movimiento_de_inventario` - Audit trail (append-only)

#### 🔹 **Private Tables** (Users can only access their own data)
- `usuarios` - User profiles (users only see their own profile)

### 3. **Performance Indexes** ✅

Creates indexes on columns used in policies for fast query performance:

```sql
CREATE INDEX idx_usuarios_supabase_uid ON usuarios(supabase_uid);
CREATE INDEX idx_ejemplar_species_id ON ejemplar(species_id);
```

### 4. **Grants Proper Permissions** ✅

Sets PostgreSQL table permissions matching the RLS policies.

---

## 🔍 Understanding the Policies

### Example: `usuarios` Table

```sql
-- Users can only see their own profile
CREATE POLICY "usuarios_authenticated_select_own"
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth.uid()::text = supabase_uid);
```

**Explanation:**
- `TO authenticated` - Only logged-in users
- `USING (auth.uid()::text = supabase_uid)` - Filter: only rows where the user's ID matches

### Example: `especies` Table

```sql
-- Anyone (including anonymous) can read species
CREATE POLICY "especies_public_select"
ON public.especies
FOR SELECT
TO anon, authenticated
USING (true);
```

**Explanation:**
- `TO anon, authenticated` - Both logged-in and anonymous users
- `USING (true)` - No filter: all rows visible

---

## 🛠️ Customization Options

### Option A: Make `ejemplar` Public (for QR scanning)

If you want visitors to scan QR codes and see plant specimens, change:

```sql
-- FROM:
CREATE POLICY "ejemplar_authenticated_select"
ON public.ejemplar
FOR SELECT
TO authenticated

-- TO:
CREATE POLICY "ejemplar_public_select"
ON public.ejemplar
FOR SELECT
TO anon, authenticated
```

### Option B: Add User Ownership to Purchases

If purchases should be private per-user, change:

```sql
-- FROM:
USING (true)

-- TO:
USING (created_by = auth.uid())
```

**Note:** This requires a `created_by` column in the `purchases` table.

### Option C: Add Role-Based Access (Admin/Staff)

If you have roles in JWT claims:

```sql
CREATE POLICY "admin_full_access"
ON public.purchases
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin');
```

---

## ✅ Testing Checklist

After applying the policies, test these scenarios:

### 1. Anonymous User (Not logged in)

```bash
# Should succeed (public tables)
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/especies?select=*' \
  -H "apikey: YOUR_ANON_KEY"

# Should fail (protected tables)
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/purchases?select=*' \
  -H "apikey: YOUR_ANON_KEY"
```

Expected: `[]` (empty array) or error for protected tables.

### 2. Authenticated User

```bash
# Should succeed (all authenticated tables)
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/purchases?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_JWT"
```

### 3. Service Role (Backend API)

```bash
# Should succeed (bypasses RLS)
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/purchases?select=*' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

---

## 🔧 Backend API Configuration

### Your FastAPI Backend (No Changes Needed)

Your FastAPI backend uses the **service role key**, which **bypasses RLS**. This is correct and secure because:

1. ✅ Your backend acts as a trusted server
2. ✅ You implement authorization in FastAPI middleware/routes
3. ✅ The service role key is never exposed to clients

```python
# In fastapi/app/core/supabase_auth.py
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_service() -> Client:
    # This client bypasses RLS - used in your API routes
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

**No changes needed** - your API will continue working normally.

### Next.js Frontend

If your Next.js app makes **direct Supabase calls** (not through your FastAPI), it uses the **anon key** which **respects RLS**.

Make sure users are authenticated:

```javascript
// In NextJS
const { data, error } = await supabase
  .from('especies')
  .select('*')
  // This will automatically apply RLS policies based on user's JWT
```

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter Warning 0013](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🆘 Troubleshooting

### Problem: "No rows returned after enabling RLS"

**Cause:** Policies are too restrictive or user is not authenticated.

**Fix:** 
1. Check if user is logged in: `SELECT auth.uid();`
2. Verify policy allows the operation: See policy `USING` clause
3. Check if `service_role` key is being used (bypasses RLS)

### Problem: "Permission denied for table"

**Cause:** PostgreSQL GRANT permissions missing.

**Fix:** Run the GRANT statements at the end of `rls_policies_secure.sql`

### Problem: "Policies slow down queries"

**Cause:** Missing indexes on policy filter columns.

**Fix:** 
```sql
CREATE INDEX idx_table_column ON table_name(column_used_in_policy);
```

---

## 📞 Next Steps

1. ✅ Execute `rls_policies_secure.sql` in Supabase SQL Editor
2. ✅ Run verification queries to confirm RLS is enabled
3. ✅ Test with anonymous and authenticated users
4. ✅ Review and adjust policies based on your business needs
5. ✅ Monitor Supabase logs for any policy violations

**After completing these steps, re-run the Supabase Linter to confirm all warnings are resolved.**

---

## 📝 Policy Summary by Table

| Table | Public Read | Auth Read | Auth Write | Notes |
|-------|-------------|-----------|------------|-------|
| `usuarios` | ❌ | Own only | Own only | Private profiles |
| `especies` | ✅ | ✅ | ✅ | Public catalog |
| `sectores` | ✅ | ✅ | ✅ | Public areas |
| `ejemplar` | ❌ | ✅ | ✅ | Staff inventory |
| `purchases` | ❌ | ✅ | ✅ | Staff only |
| `purchase_items` | ❌ | ✅ | ✅ | Staff only |
| `receipts` | ❌ | ✅ | ✅ | Staff only |
| `receipt_items` | ❌ | ✅ | ✅ | Staff only |
| `public_views` | ✅ | ✅ | ✅ | Analytics |
| `movimiento_de_inventario` | ❌ | ✅ | Insert only | Audit log |

---

**🔒 Security is not optional. Implement these policies before going to production.**

