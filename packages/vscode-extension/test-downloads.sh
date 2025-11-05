#!/bin/bash

# Test if prebuild downloads work on your machine

echo "Testing GitHub release downloads..."
echo ""

TEST_URL="https://github.com/WiseLibs/better-sqlite3/releases/download/v12.4.1/better-sqlite3-v12.4.1-node-v127-linux-x64.tar.gz"
TEST_FILE="/tmp/test-sqlite-download.tar.gz"

echo "Test URL: $TEST_URL"
echo ""

# Try wget
echo "1. Testing with wget..."
if command -v wget &> /dev/null; then
    if wget -q --timeout=10 -O "$TEST_FILE" "$TEST_URL" 2>&1; then
        if [ -f "$TEST_FILE" ]; then
            SIZE=$(ls -lh "$TEST_FILE" | awk '{print $5}')
            echo "   ✅ wget SUCCESS! Downloaded $SIZE"
            rm -f "$TEST_FILE"
        else
            echo "   ❌ wget FAILED - file not created"
        fi
    else
        echo "   ❌ wget FAILED"
    fi
else
    echo "   ⚠️  wget not installed"
fi

echo ""

# Try curl
echo "2. Testing with curl..."
if command -v curl &> /dev/null; then
    if curl -f -sS -L --max-time 10 -A "Mozilla/5.0" -o "$TEST_FILE" "$TEST_URL" 2>&1; then
        if [ -f "$TEST_FILE" ]; then
            SIZE=$(ls -lh "$TEST_FILE" | awk '{print $5}')
            echo "   ✅ curl SUCCESS! Downloaded $SIZE"
            rm -f "$TEST_FILE"
        else
            echo "   ❌ curl FAILED - file not created"
        fi
    else
        echo "   ❌ curl FAILED"
    fi
else
    echo "   ⚠️  curl not installed"
fi

echo ""
echo "Summary:"
echo "--------"
echo "If either wget or curl succeeded, marketplace packaging will work on your machine."
echo "If both failed, you'll need to use CI/CD (GitHub Actions) for marketplace publishing."
