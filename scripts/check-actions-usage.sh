#!/bin/bash

# Check GitHub Actions usage
# Requires: gh CLI (GitHub CLI)

echo "📊 GitHub Actions Usage Report"
echo "================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not installed"
    echo "Install: https://cli.github.com/"
    echo ""
    echo "Alternative: Check manually at:"
    echo "https://github.com/settings/billing/summary"
    exit 1
fi

# Get workflow runs
echo "Recent workflow runs:"
gh run list --repo ngannguyen-nvn/devhub --workflow e2e-tests.yml --limit 10

echo ""
echo "💰 To check billing:"
echo "https://github.com/settings/billing/summary"
echo ""
echo "📦 To check storage usage:"
echo "https://github.com/ngannguyen-nvn/devhub/actions/caches"
