# Verification Steps: n8n Assistants Visibility

## Context

The n8n assistants (`n8n-workflow` and `n8n-multi-workflow`) were missing from the assistants list because they weren't included in the default assistant presets. This has been fixed by adding them to `assistantPresets.ts`.

## Prerequisites

- Development server is running at http://localhost:5173/#/guid
- Code changes have been compiled (dev server should auto-rebuild)

## Verification Steps

### Step 1: Refresh the Browser

**Action**: Hard refresh the browser page
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

**Why**: The assistant list is loaded on page initialization. A hard refresh ensures you get the latest compiled code.

### Step 2: Navigate to the GUID Page

**Action**: Ensure you're on http://localhost:5173/#/guid

**What to look for**:
- The main chat interface should be visible
- The assistant selector should be present (typically a dropdown or list)

### Step 3: Check Assistant List

**Action**: Open the assistant selector

**Expected result**: You should now see these n8n assistants in the list:
- **n8n-workflow** - "n8n智能工作流助手" (n8n intelligent workflow assistant)
- **n8n-multi-workflow** - "n8n多工作流调度助手" (n8n multi-workflow scheduling assistant)

**Location**: Check in:
1. **Primary location**: GUID page (`/#/guid`) - assistant selector dropdown
2. **Settings**: Navigate to `/#/settings/agent` - assistant configuration list

### Step 4: Verify Assistant Details

**For `n8n-workflow`**:
- Icon: 🔄 (cycle emoji)
- Provider: `n8n`
- Type: `n8n-workflow`
- Description should mention workflow automation

**For `n8n-multi-workflow`**:
- Icon: 🔀 (shuffle emoji)
- Provider: `n8n`
- Type: `n8n-multi-workflow`
- Description should mention multi-workflow scheduling

### Step 5: Test Assistant Selection

**Action**: Try selecting one of the n8n assistants from the list

**Expected result**:
- The assistant should become active
- The chat interface should update to show it's connected to n8n
- No console errors should appear

## Troubleshooting

### If n8n assistants still don't appear:

#### Option A: Clear Application Storage
1. Open browser DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Clear:
   - Local Storage
   - Session Storage
   - IndexedDB
4. Hard refresh the page

#### Option B: Restart the Development Server
1. Stop the dev server (`Ctrl + C` in terminal)
2. Clear any build cache: `bun run clean` (if available)
3. Restart: `bun run start`
4. Wait for compilation to complete
5. Hard refresh browser

#### Option C: Check Browser Console
1. Open DevTools (`F12`)
2. Check **Console** tab for errors
3. Look for:
   - Import errors from `assistantPresets.ts`
   - Type errors related to assistant definitions
   - Runtime errors when loading assistants

#### Option D: Verify Code Changes
1. Open `src/common/presets/assistantPresets.ts`
2. Confirm these entries exist in the `assistantPresets` array:
   ```typescript
   {
     id: 'n8n-workflow',
     name: 'n8n智能工作流助手',
     description: '...',
     icon: '🔄',
     provider: 'n8n',
     type: 'n8n-workflow',
     // ...
   }
   ```
   ```typescript
   {
     id: 'n8n-multi-workflow',
     name: 'n8n多工作流调度助手',
     description: '...',
     icon: '🔀',
     provider: 'n8n',
     type: 'n8n-multi-workflow',
     // ...
   }
   ```

### If assistants appear but don't work:

This verification only covers **visibility**. For functional testing:
- Ensure n8n servers are running (see `N8N_STARTUP_GUIDE.md`)
- Check n8n service configuration
- Verify workflow IDs are correct
- See `PROBLEME_N8N_TIMEOUT.md` for connectivity issues

## Success Criteria

✅ **Verification passes if**:
1. Both n8n assistants appear in the assistant list
2. You can select them without errors
3. The UI reflects the selected assistant

❌ **Verification fails if**:
1. n8n assistants are missing from the list
2. Console shows errors when loading assistants
3. Selecting an assistant causes crashes or errors

## Next Steps After Verification

Once visibility is confirmed:
1. Test actual n8n workflow execution (see `TEST_N8N_MAINTENANT.md`)
2. Verify multi-workflow scheduling functionality
3. Check n8n server connectivity
4. Test end-to-end conversation flow

## Files Modified

- `src/common/presets/assistantPresets.ts` - Added n8n assistant definitions

## Related Documentation

- `N8N_INTEGRATION_FINALE.md` - Full n8n integration overview
- `N8N_AVAILABILITY_FIX.md` - Details of this specific fix
- `MIGRATION_N8N_COMPLETE.md` - Complete n8n migration guide
- `src/agent/n8n/README.md` - n8n agent documentation
