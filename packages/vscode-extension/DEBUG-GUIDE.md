# How to Debug VSCode Extension

## View Console Logs

### Method 1: Developer Tools (Recommended)
1. Open DevHub webview panel
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: **Developer: Open Webview Developer Tools**
4. Press Enter
5. Look at the Console tab

You should see logs like:
```
[Dashboard] Starting repo scan...
[Dashboard] Scan response: [...]
[Dashboard] Found X repositories
```

### Method 2: Extension Host Logs
1. Press `Ctrl+Shift+P`
2. Type: **Developer: Show Logs**
3. Select **Extension Host**
4. Look for `[MessageHandler]` and `[DevHubManager]` logs

## Test Scanning

1. Open DevHub panel
2. Click "Scan Workspace" button
3. Check the status text next to the button - it should say:
   - "Scanning..." (while running)
   - "X repositories found" (after scan)
   - "No repositories scanned yet" (if no results)

## Expected Console Output

After clicking "Scan Workspace", you should see:
```
[Dashboard] Starting repo scan...
[Dashboard] Scan response: [array or object]
[Dashboard] Response type: object or array
[Dashboard] Is array? true/false
[Dashboard] Parsed repositories: [...]
[Dashboard] Found X repositories
[Dashboard] Selected repos: X repos
```

If you see "Found 0 repositories", the scan didn't find any git repos in your workspace.

## Common Issues

1. **No repositories found**
   - Make sure your workspace folder contains git repositories
   - Check that git is initialized (`.git` folder exists)

2. **Error message appears**
   - Check the console for error details
   - Look at Extension Host logs for backend errors

3. **Scan button does nothing**
   - Open Webview DevTools and check Console for errors
   - Check if messageHandler is receiving the message
