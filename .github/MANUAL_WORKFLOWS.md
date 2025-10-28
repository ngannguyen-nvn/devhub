# Manual GitHub Actions Workflows

This guide explains how to run GitHub Actions workflows manually instead of automatically.

---

## 🎯 Current Setup

Your E2E tests workflow now supports **both automatic and manual triggers**:

✅ **Automatic triggers:**
- Push to `main` or `claude/**` branches
- Pull requests to `main`

✅ **Manual trigger:**
- Run on-demand from GitHub UI
- Customize browser, test file, and mode

---

## 🚀 How to Run Tests Manually

### Step 1: Go to Actions Tab

1. Visit your repository: `https://github.com/ngannguyen-nvn/devhub`
2. Click the **"Actions"** tab at the top
3. You'll see a list of workflows on the left

### Step 2: Select Workflow

1. Click on **"E2E Tests"** in the left sidebar
2. You'll see the "Run workflow" button

### Step 3: Run Workflow

1. Click the **"Run workflow"** button (green button, top right)
2. A dropdown will appear with options:

```
Run workflow
┌─────────────────────────────────────────┐
│ Use workflow from                        │
│ Branch: main ▼                          │
│                                          │
│ Browser to test on                       │
│ chromium ▼                              │
│                                          │
│ Specific test file to run               │
│ [empty - runs all tests]                │
│                                          │
│ Run tests in headed mode                 │
│ ☐ (unchecked)                           │
│                                          │
│         [Run workflow]                   │
└─────────────────────────────────────────┘
```

3. Configure your options (see examples below)
4. Click **"Run workflow"** (green button at bottom)

### Step 4: Monitor Progress

1. The workflow will appear in the list with a yellow dot 🟡 (running)
2. Click on it to see live logs
3. Wait for completion: ✅ (success) or ❌ (failed)

---

## 📋 Manual Workflow Options

### Option 1: Browser Selection

Choose which browser to test on:

| Option | Description |
|--------|-------------|
| `chromium` | Default - fastest, used in CI |
| `firefox` | Test on Firefox |
| `webkit` | Test on Safari/WebKit |
| `all` | Run on all browsers |

**Example:** Test on Firefox
```
Browser: firefox
Test file: (empty)
Headed: unchecked
```

### Option 2: Specific Test File

Run only a specific test file instead of all tests:

**Examples:**

Run only workspace tests:
```
Browser: chromium
Test file: e2e/tests/workspaces.spec.ts
Headed: unchecked
```

Run only service manager tests:
```
Browser: chromium
Test file: e2e/tests/service-manager.spec.ts
Headed: unchecked
```

Run all Docker tests:
```
Browser: chromium
Test file: e2e/tests/docker-management.spec.ts
Headed: unchecked
```

### Option 3: Headed Mode

Watch tests run in a visible browser (useful for debugging):

```
Browser: chromium
Test file: (empty)
Headed: ✓ checked
```

**Note:** Headed mode shows the browser, but you won't see it in CI (runs on server). Use locally with `npm run test:e2e:headed` instead.

---

## 🎨 Common Use Cases

### Use Case 1: Quick Smoke Test

Run all tests on Chromium (fastest):
```
Browser: chromium
Test file: (empty)
Headed: unchecked
```

### Use Case 2: Debug Failing Test

Run specific failing test:
```
Browser: chromium
Test file: e2e/tests/service-manager.spec.ts
Headed: unchecked
```

### Use Case 3: Cross-Browser Testing

Run all tests on all browsers:
```
Browser: all
Test file: (empty)
Headed: unchecked
```

### Use Case 4: Test Single Feature

Test only workspace functionality:
```
Browser: chromium
Test file: e2e/tests/workspaces.spec.ts
Headed: unchecked
```

---

## 🔧 Switch to Manual-Only Mode

If you want to **disable automatic runs** and only run tests manually:

### Option A: Comment Out Auto Triggers

Edit `.github/workflows/e2e-tests.yml`:

```yaml
on:
  workflow_dispatch:
    # ... inputs ...

  # Automatic triggers (commented out)
  # push:
  #   branches: [main, claude/**]
  # pull_request:
  #   branches: [main]
```

### Option B: Use Manual-Only Workflow

1. Rename the example file:
   ```bash
   mv .github/workflows/e2e-tests-manual-only.yml.example \
      .github/workflows/e2e-tests.yml
   ```

2. Commit and push:
   ```bash
   git add .github/workflows/e2e-tests.yml
   git commit -m "Switch to manual-only E2E tests"
   git push
   ```

### Option C: Delete Automatic Triggers

Edit `.github/workflows/e2e-tests.yml` and remove:

```yaml
# DELETE THESE LINES
push:
  branches: [main, claude/**]
pull_request:
  branches: [main]
```

Keep only:
```yaml
on:
  workflow_dispatch:
    # ... inputs ...
```

---

## 📊 Cost Savings with Manual Mode

### Automatic Mode (Current)
```
300 runs/month @ 6 min = 1,800 minutes
✅ Within free tier (2,000 min)
```

### Manual-Only Mode
```
~50 runs/month @ 6 min = 300 minutes
✅ Big savings! 1,700 minutes to spare
```

**When to use manual-only:**
- Personal projects with few contributors
- Want to control when tests run
- Save GitHub Actions minutes
- Run tests only before releases

**When to use automatic:**
- Team projects with multiple contributors
- Want immediate feedback on every push
- Have unlimited free minutes (public repo)
- CI/CD pipeline requires it

---

## 🎯 Using GitHub CLI

You can also trigger workflows from the command line:

### Install GitHub CLI

```bash
# macOS
brew install gh

# Linux
sudo apt install gh

# Or download from: https://cli.github.com
```

### Authenticate

```bash
gh auth login
```

### Run Workflow Manually

```bash
# Run with default options
gh workflow run "E2E Tests" --repo ngannguyen-nvn/devhub

# Run with specific browser
gh workflow run "E2E Tests" \
  --repo ngannguyen-nvn/devhub \
  --field browser=firefox

# Run specific test file
gh workflow run "E2E Tests" \
  --repo ngannguyen-nvn/devhub \
  --field test_file=e2e/tests/workspaces.spec.ts

# Run with all options
gh workflow run "E2E Tests" \
  --repo ngannguyen-nvn/devhub \
  --field browser=chromium \
  --field test_file=e2e/tests/service-manager.spec.ts \
  --field headed=false
```

### Check Status

```bash
# List recent runs
gh run list --workflow="E2E Tests" --repo ngannguyen-nvn/devhub

# View specific run
gh run view <run-id> --repo ngannguyen-nvn/devhub

# Watch run in real-time
gh run watch <run-id> --repo ngannguyen-nvn/devhub
```

---

## 📱 GitHub Mobile App

You can also trigger workflows from the GitHub mobile app:

1. Open GitHub app
2. Go to your repository
3. Tap "Actions"
4. Select "E2E Tests" workflow
5. Tap "Run workflow"
6. Choose options
7. Tap "Run workflow" button

---

## ⚡ Quick Reference

| Method | Pros | Cons |
|--------|------|------|
| **Automatic** | Immediate feedback, no action needed | Uses more minutes |
| **Manual (UI)** | Full control, visual interface | Requires manual action |
| **Manual (CLI)** | Scriptable, faster | Requires gh CLI setup |
| **Manual (Mobile)** | Run from anywhere | Limited options |

---

## 🔍 Troubleshooting

### "Run workflow" button not showing

**Problem:** Button doesn't appear in Actions tab

**Solution:**
1. Make sure `workflow_dispatch:` is in your workflow file
2. Push the changes to GitHub
3. Refresh the Actions page

### Workflow doesn't start

**Problem:** Clicked "Run workflow" but nothing happens

**Solution:**
1. Check if you have permissions (need write access)
2. Check if branch exists
3. Look for error messages in Actions tab

### Can't select different browser

**Problem:** Browser option showing as text field

**Solution:**
- Make sure `type: choice` is set in workflow file
- Refresh the page after updating workflow

---

## 📚 Additional Resources

- [GitHub Actions Manual Triggers](https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Workflow Dispatch Inputs](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputs)

---

**Last updated:** 2025-10-28
**Workflow file:** `.github/workflows/e2e-tests.yml`
