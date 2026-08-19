#!/bin/bash
# Diagnostic script to check if the DeepSeek Harness is properly set up

set -e

HARNESS_DIR="${DSH_HARNESS:-../deepseek-harness}"
HARNESS_DIR=$(cd "$HARNESS_DIR" 2>/dev/null && pwd || echo "")

echo "=== DeepSeek Harness Diagnostic ==="
echo ""

# Check 1: Does the harness directory exist?
if [ -z "$HARNESS_DIR" ]; then
    echo "❌ Harness directory not found at ../deepseek-harness"
    echo "   Set DSH_HARNESS environment variable to the correct path"
    exit 1
fi

echo "✅ Harness directory: $HARNESS_DIR"
echo ""

# Check 2: Is it built?
echo "Checking if harness is built..."
if [ -f "$HARNESS_DIR/packages/client/web/lib/seed.js" ]; then
    echo "✅ Harness appears to be built (web/lib/seed.js exists)"
else
    echo "❌ Harness is not built"
    echo "   Run: cd $HARNESS_DIR && pnpm install && pnpm run build"
    exit 1
fi
echo ""

# Check 3: Check the seed.js file
echo "Checking seed.js for React import..."
if grep -q "react" "$HARNESS_DIR/packages/client/web/lib/seed.js"; then
    echo "✅ seed.js contains React reference"
else
    echo "⚠️  seed.js doesn't contain React reference - this is unexpected"
fi
echo ""

# Check 4: Is the web server running?
echo "Checking if web server is running on port 3080..."
if curl -s http://127.0.0.1:3080/ > /dev/null 2>&1; then
    echo "✅ Web server is responding on port 3080"

    # Check 5: Check for __DSH_BOOT__
    echo ""
    echo "Checking for __DSH_BOOT__ in HTML..."
    if curl -s http://127.0.0.1:3080/ | grep -q "__DSH_BOOT__"; then
        echo "✅ __DSH_BOOT__ is present in the page"
    else
        echo "❌ __DSH_BOOT__ is missing - harness may not be initializing correctly"
    fi

    # Check 6: Check for our plugin
    echo ""
    echo "Checking if plugin is in boot graph..."
    if curl -s http://127.0.0.1:3080/ | grep -q "dsh-client-ui-terminal"; then
        echo "✅ Plugin appears in boot graph"
    else
        echo "⚠️  Plugin not found in boot graph - may not be installed"
    fi
else
    echo "❌ Web server is not running on port 3080"
    echo "   Try port 3081 or start the server:"
    echo "   cd $HARNESS_DIR && pnpm dsh web --port 3081"

    # Try 3081
    echo ""
    echo "Checking port 3081..."
    if curl -s http://127.0.0.1:3081/ > /dev/null 2>&1; then
        echo "✅ Found server on port 3081"
    else
        echo "❌ No server found on 3081 either"
    fi
fi

echo ""
echo "=== Recommendations ==="
echo ""
echo "1. If harness is not built:"
echo "   cd $HARNESS_DIR && pnpm install && pnpm run build"
echo ""
echo "2. If web server is not running:"
echo "   cd $HARNESS_DIR && pnpm dsh web --port 3081"
echo ""
echo "3. If plugin is not installed:"
echo "   cd $HARNESS_DIR"
echo "   pnpm dsh plugin --profile web add file://$(pwd)/packages/client"
echo ""
echo "4. To test in browser:"
echo "   Open http://127.0.0.1:3081"
echo "   Open DevTools Console"
echo "   Type: window.__DSH_MODULES__"
echo "   Check if .seed has 'react'"
