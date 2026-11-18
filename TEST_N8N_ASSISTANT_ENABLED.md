# Test: n8n Assistant Enabled on /guid Welcome Page

## Changes Made

1. ✅ Added `resourceDir: 'assistant/n8n-workflow'` to n8n-workflow preset
2. ✅ Added `resourceDir: 'assistant/n8n-multi-workflow'` to n8n-multi-workflow preset
3. ✅ Created rule files:
   - `assistant/n8n-workflow/n8n-workflow.md` (English)
   - `assistant/n8n-workflow/n8n-workflow.zh-CN.md` (Chinese)
   - `assistant/n8n-multi-workflow/n8n-multi-workflow.md` (English)
   - `assistant/n8n-multi-workflow/n8n-multi-workflow.zh-CN.md` (Chinese)
4. ✅ Updated `assistantPresets.ts` with proper ruleFiles configuration
5. ✅ Default agent is already set to 'custom:builtin-n8n-workflow' in useGuidAgentSelection.ts line 50

## What to Test in Browser

Navigate to: **http://localhost:5173/#/guid**

### Expected Results:

1. **Assistant Selection Area** should show:
   - n8n Workflow assistant (🔄) as available
   - It should be selected by default
   - Description: "Execute n8n workflows and display results in a modern chat interface."

2. **No more "No assistants configured" message**

3. **You should be able to**:
   - Type a message in the input box
   - Send the message
   - Create a conversation with the n8n assistant

4. **Assistant dropdown** should show:
   - n8n Workflow (🔄)
   - n8n Multi Workflow (🔀)
   - Other available assistants (Cowork, PPTX Generator, etc.)

### If Hot Reload Didn't Work:

If the changes are not visible:
1. Refresh the browser page (F5)
2. Or restart the dev server:
   ```bash
   # Stop current server (Ctrl+C in terminal ID 5)
   npm run start
   ```

## Verification Steps:

1. Open browser at http://localhost:5173/#/guid
2. Check console for any errors (F12 → Console)
3. Verify n8n Workflow appears in assistant selector
4. Try sending a test message like "Generate a work program for cash inventory"
5. Confirm conversation is created and n8n workflow is called

## Technical Details:

- Default agent key: `custom:builtin-n8n-workflow`
- Preset ID: `n8n-workflow`
- Preset agent type: `n8n`
- The assistant uses the rule files from `assistant/n8n-workflow/` directory
- The `isMainAgentAvailable()` function in useGuidAgentSelection.ts returns true for 'n8n' type (line 514)

## Troubleshooting:

If still seeing "No assistants configured":

1. Check browser console for errors
2. Verify the files exist:
   ```powershell
   Get-ChildItem "g:\Aionui_client\assistant\n8n-workflow"
   Get-ChildItem "g:\Aionui_client\assistant\n8n-multi-workflow"
   ```
3. Verify the preset configuration is loaded:
   - Open DevTools Console
   - Type: `window.__ASSISTANT_PRESETS__` (if exposed)
   - Or check Network tab for any failed resource loads

## Success Criteria:

✅ n8n Workflow assistant appears and is selectable
✅ Can send messages and create conversations
✅ No "No assistants configured" error
✅ Default selection is n8n Workflow
