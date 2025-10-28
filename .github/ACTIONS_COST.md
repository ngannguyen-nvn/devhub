# GitHub Actions Cost Analysis for DevHub

## TL;DR

✅ **If repo is PUBLIC**: Completely FREE, unlimited
✅ **If repo is PRIVATE**: FREE for ~300 runs/month (well within the 2,000 minute limit)

---

## Free Tier Limits

| Repository Type | Actions Minutes | Storage | Cost |
|----------------|----------------|---------|------|
| **Public** | ♾️ Unlimited | ♾️ Unlimited | $0 |
| **Private (Free)** | 2,000/month | 500 MB | $0 |

## Your Workflow Costs

### Per Run Metrics

```
OS: Ubuntu (1x multiplier)
Runtime: ~5-6 minutes
Artifacts: ~5 MB

Cost per run (if private):
- Minutes: 6 × 1x = 6 minutes
- Storage: 5 MB × 30 days retention = 5 MB
```

### Monthly Estimate (Private Repo)

```
Scenario 1: Active Development
- 10 runs/day × 30 days = 300 runs
- 300 × 6 minutes = 1,800 minutes
- Storage: 300 × 5 MB = 1.5 GB (but auto-cleaned after 30 days)
✅ Status: Within free tier (200 minutes to spare)

Scenario 2: Production
- 3 runs/day × 30 days = 90 runs
- 90 × 6 minutes = 540 minutes
✅ Status: Well within free tier (1,460 minutes to spare)
```

## Cost Optimization Strategies

### 1. Path Filters (Saves ~30% minutes)

Only run tests when code changes, not docs:

```yaml
on:
  push:
    paths:
      - 'frontend/**'
      - 'backend/**'
      - 'e2e/**'
```

### 2. Concurrency Control (Saves ~20% minutes)

Cancel old runs when new commits are pushed:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 3. Reduce Artifact Retention (Saves storage)

```yaml
retention-days: 7  # Instead of 30
```

### 4. Skip CI on Docs

```bash
git commit -m "Update README [skip ci]"
```

### 5. Run Only on Important Branches

```yaml
on:
  push:
    branches: [main]  # Remove feature branches
  pull_request:
    branches: [main]
```

## Monitoring Your Usage

### Web Dashboard

1. Go to: https://github.com/settings/billing/summary
2. View "Actions & Packages" section
3. See real-time usage

### GitHub CLI

```bash
# List recent runs
gh run list --repo ngannguyen-nvn/devhub --workflow e2e-tests.yml

# View specific run
gh run view <run-id>

# Or use our helper script
./scripts/check-actions-usage.sh
```

## Cost Breakdown by OS

| OS | Multiplier | 6-min Run | Monthly (300 runs) |
|----|-----------|-----------|-------------------|
| **Linux** (Current) | 1x | 6 minutes | 1,800 minutes |
| Windows | 2x | 12 minutes | 3,600 minutes ⚠️ |
| macOS | 10x | 60 minutes | 18,000 minutes ❌ |

✅ **You're using Linux (Ubuntu)** - the most cost-effective option!

## When You'd Need to Pay

### Private Repository Scenarios

You'd exceed free tier (2,000 min/month) if:

```
❌ 15 runs/day @ 6 min = 2,700 minutes/month
❌ 10 runs/day @ 10 min = 3,000 minutes/month (if tests are slower)
❌ Using macOS runners = 10x cost
```

### Overage Costs (Private Repos Only)

If you exceed 2,000 minutes on a free plan:

| OS | Cost per Minute |
|----|----------------|
| Linux | $0.008 |
| Windows | $0.016 |
| macOS | $0.08 |

**Example overage:**
- 500 extra minutes on Linux = 500 × $0.008 = **$4.00**

## Recommendations

### For Active Development (Private Repo)

1. ✅ Use current workflow as-is (you're within limits)
2. ✅ Implement path filters to save ~30%
3. ✅ Add concurrency control to cancel old runs
4. ✅ Monitor usage monthly

### For Production (Private Repo)

1. ✅ Run only on `main` and PRs
2. ✅ Reduce artifact retention to 7 days
3. ✅ Use path filters
4. ✅ Consider upgrading to Pro plan if needed ($4/month for 3,000 minutes)

### For Public Repo

1. ✅ Do nothing! Enjoy unlimited free Actions
2. ✅ Run tests as often as you want
3. ✅ No optimization needed

## Quick Reference

**Check if your repo is public/private:**
```bash
# Visit your repo and look for the badge near the name
https://github.com/ngannguyen-nvn/devhub

🔓 Public = Free unlimited
🔒 Private = 2,000 minutes/month free
```

**Your current status:**
```
Workflow: e2e-tests.yml
Runtime: ~6 minutes
Monthly runs: ~300 (estimated)
Monthly minutes: ~1,800
Free tier: 2,000 minutes

✅ You're safe! 200 minutes buffer.
```

## Need Help?

- 📊 Check usage: https://github.com/settings/billing/summary
- 📖 GitHub pricing: https://github.com/pricing
- 💬 GitHub support: https://support.github.com

---

**Last updated:** 2025-10-28
**Workflow:** `.github/workflows/e2e-tests.yml`
