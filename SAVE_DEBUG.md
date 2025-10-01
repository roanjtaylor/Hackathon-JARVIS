# Save Function Debug Guide

## How to test if save is working:

1. **Open Browser Console** (F12 or Right-click → Inspect → Console tab)

2. **Try to save a session** by clicking the Save button

3. **Look for these logs in console:**

### Expected logs on successful save:
```
🔄 Starting save session...
✅ User authenticated: <user-id>
📦 Session data to save: {...}
➕ Creating new session
✅ Session created successfully: {...}
✅ Save completed successfully
```

### Expected logs on successful load:
```
🔄 Loading sessions...
✅ User authenticated: <user-id>
✅ Sessions loaded: X sessions
Sessions data: [...]
```

## Common Issues:

### Issue 1: "column conversation_log does not exist"
**Solution:** Run the migration in Supabase SQL Editor:
1. Go to https://zsbrocvqqgtgkdtulxhs.supabase.co
2. Click "SQL Editor"
3. Run the script from `scripts/migrate-db.sql`

### Issue 2: "Not authenticated"
**Solution:** Make sure you're logged in. Check auth state in console.

### Issue 3: "No error but sessions don't appear"
**Solution:** Check if `loadSessions()` is being called after save. The save should trigger a state update that includes the new session in the sessions list.

## Manual Database Check:

1. Go to Supabase Dashboard → Table Editor
2. Select `sessions` table
3. Verify:
   - Table exists
   - `conversation_log` column exists (type: jsonb)
   - RLS policies allow insert/select for authenticated users

## Test Data Flow:

1. User clicks Save → Modal opens
2. User enters title → Clicks Save in modal
3. `handleSaveConfirm` called with title
4. `saveSession(title)` called from store
5. Data sent to Supabase
6. On success: `currentSessionId` set, `sessions` array updated
7. Sessions sidebar re-renders with new session
