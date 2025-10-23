# 🔐 Security Checklist - RLS Configuration

## ⚠️ CRITICAL: Security Issues Detected

Supabase has detected **10 tables** without Row-Level Security (RLS) enabled.

**Risk Level**: 🔴 **CRITICAL** - Your database is publicly accessible

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Choose Your Security Level

**TWO OPTIONS AVAILABLE:**

#### 🟡 Option A: Generic Policies (Shared Data)
All staff see all data. Good for small teams (3-5 people).

```
fastapi/app/core/rls_policies_secure.sql
```

#### 🟢 Option B: Ownership Policies (Private Data) ⭐ RECOMMENDED
Each user only sees THEIR OWN data. Best for security and compliance.

```
fastapi/app/core/rls_policies_ownership.sql
```

**Copy and paste** the entire content of your chosen file into Supabase SQL Editor.

Click **Run** or press `Ctrl+Enter`

📖 **Not sure which?** Read: `fastapi/RLS_COMPARISON_GUIDE.md`

### Step 3: Verify Success

**Copy and paste** the entire content of this file:
```
fastapi/verify_rls.sql
```

Click **Run** or press `Ctrl+Enter`

**Expected result**: All tables should show "✅ SECURE"

---

## 📋 Tables Fixed

- [x] `usuarios` - User profiles
- [x] `especies` - Species catalog
- [x] `sectores` - Sectors/areas
- [x] `ejemplar` - Inventory items
- [x] `purchases` - Purchase records
- [x] `purchase_items` - Purchase line items
- [x] `receipts` - Receipt records
- [x] `receipt_items` - Receipt line items
- [x] `public_views` - Analytics tracking
- [x] `movimiento_de_inventario` - Inventory movements

---

## 🔍 What Changed?

### Before (Insecure):
```
❌ Any user can access all data
❌ No authentication required
❌ Data breaches possible
```

### After (Secure):
```
✅ RLS enabled on all tables
✅ Access controlled by policies
✅ Anonymous users: Limited access
✅ Authenticated users: Proper access
✅ Service role: Full access (your API)
```

---

## 🎯 Access Control Summary

### Option A: Generic Policies (rls_policies_secure.sql)

| User Type | Species | Sectors | Ejemplar | Purchases | Users |
|-----------|---------|---------|----------|-----------|-------|
| **Anonymous** | Read | Read | ❌ | ❌ | ❌ |
| **Authenticated** | Full | Full | **ALL** | **ALL** | Own only |
| **Service Role** | Full | Full | Full | Full | Full |

**= All users see all data**

---

### Option B: Ownership Policies (rls_policies_ownership.sql) ⭐ RECOMMENDED

| User Type | Species | Sectors | Ejemplar | Purchases | Users |
|-----------|---------|---------|----------|-----------|-------|
| **Anonymous** | Read | Read | ❌ | ❌ | ❌ |
| **Authenticated** | Full | Full | **OWN ONLY** | **OWN ONLY** | Own + Active |
| **Service Role** | Full | Full | Full | Full | Full |

**= Each user only sees THEIR data**

**Based on discovered schema:**
- `ejemplar.user_id` → User ownership
- `purchases.created_by` → User ownership  
- `receipts.received_by` → User ownership
- `movimiento_de_inventario.user_id` → User ownership

---

## 🔧 Impact on Your Application

### ✅ FastAPI Backend (No Changes Needed)
Your backend uses `SUPABASE_SERVICE_ROLE_KEY` which **bypasses RLS**.

**Result**: Your API endpoints continue working exactly as before.

### ✅ Next.js Frontend (Works Automatically)
Your frontend uses `SUPABASE_ANON_KEY` which **respects RLS**.

**Result**: Users must be authenticated to access protected data.

---

## 🧪 Testing

### Test 1: Anonymous User (Should Fail)
```bash
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/purchases?select=*' \
  -H "apikey: YOUR_ANON_KEY"
```
**Expected**: Empty array `[]` or error

### Test 2: Authenticated User (Should Succeed)
```bash
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/especies?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_JWT"
```
**Expected**: Array with species data

### Test 3: Service Role (Should Succeed)
```bash
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/purchases?select=*' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```
**Expected**: Array with all purchases

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `fastapi/app/core/rls_policies_secure.sql` | **Generic policies** - All users share data |
| `fastapi/app/core/rls_policies_ownership.sql` | **Ownership policies** - Private data per user ⭐ |
| `fastapi/RLS_COMPARISON_GUIDE.md` | **Read this first** - Compare both options |
| `fastapi/verify_rls.sql` | Verification queries |
| `fastapi/RLS_SECURITY_GUIDE.md` | Complete guide with customization options |
| `DEPLOYMENT_GUIDE.md` | Updated with security steps |

---

## 🆘 Troubleshooting

### "No rows returned after enabling RLS"
✅ **Normal** - This means RLS is working correctly
- Check if user is authenticated
- Verify policy allows the operation
- Use service_role key for admin operations

### "Permission denied for table"
✅ Run the GRANT statements in `rls_policies_secure.sql`

### "Policy too slow"
✅ Check that indexes were created (see verification script)

---

## ✅ Final Checklist

### Security Implementation
- [ ] Read `RLS_COMPARISON_GUIDE.md` to choose between Generic vs Ownership
- [ ] Decided on: ⬜ Generic (`rls_policies_secure.sql`) or ⬜ Ownership (`rls_policies_ownership.sql`)
- [ ] Executed chosen SQL script in Supabase SQL Editor
- [ ] Verified all tables show "✅ SECURE" in verification script

### If Using Ownership Policies:
- [ ] Verified `get_current_user_id()` function works correctly
- [ ] Updated existing records with ownership (`user_id`, `created_by`, etc.)
- [ ] Tested that users only see their own data

### Testing & Validation
- [ ] Tested API endpoints still work (service_role bypasses RLS)
- [ ] Tested authenticated user access in frontend
- [ ] Created test users and verified data isolation
- [ ] Reviewed and customized policies for your needs (optional)
- [ ] Documented choice and any custom changes

---

## 🎉 Success Criteria

When complete, you should see:

1. ✅ All 10 tables have RLS enabled
2. ✅ Supabase Linter shows 0 security warnings
3. ✅ API endpoints continue working
4. ✅ Frontend authentication flows work correctly
5. ✅ Anonymous users cannot access sensitive data

---

## 📞 Support

- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **Database Linter**: https://supabase.com/docs/guides/database/database-linter
- **Community Discord**: https://discord.supabase.com

---

**⏱️ Estimated Time**: 5 minutes  
**🔴 Priority**: CRITICAL - Do before production deployment  
**💰 Cost**: $0 (included in Supabase free tier)

---

✅ **After completing these steps, your database will be secure and compliant with best practices.**

