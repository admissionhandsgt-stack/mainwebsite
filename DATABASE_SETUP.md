# 🗄️ AdmissionHands — Supabase Database Setup

## ⚠️ REQUIRED: Run this SQL in your Supabase Dashboard

### Steps:
1. Go to **https://supabase.com/dashboard**
2. Open project: `nlxbqseaumhjenlnigxd`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Paste the entire contents of `supabase_setup_COMPLETE.sql`
6. Click **Run** (or press Ctrl+Enter)

### What this creates:

| Table | Purpose | Status |
|-------|---------|--------|
| `live_alerts` | Homepage alert banners | ✅ Already exists |
| `deemed_colleges` | Deemed college list (MBBS India page) | ✅ Already exists |
| `videos` | YouTube videos section | ❌ MISSING — needs creation |
| `recommended_colleges` | Featured colleges on homepage | ❌ MISSING |
| `mbbs_states` | States shown on MBBS India page | ❌ MISSING |
| `contact_info` | Phone/WhatsApp/email configuration | ❌ MISSING |
| `pg_colleges` | PG/MD-MS colleges | ❌ MISSING |
| `deemed_universities` | Deemed university details | ❌ MISSING |

### After running the SQL:
All admin panel sections will work fully with data.

### Storage Bucket:
The SQL also creates a `colleges` storage bucket for image uploads.
