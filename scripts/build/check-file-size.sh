#!/bin/bash
# Enforces 400-line maximum for TypeScript, JavaScript, and CSS files
# Run with: npm run check-size

MAX_LINES=400
FAILED=0

# Check TypeScript files in src/ (excluding auto-generated geometry files)
for file in $(find src -name "*.ts" 2>/dev/null | grep -v "ship-geometry-"); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    echo "  REQUIRED: Split into modules. Do NOT compress code or shorten output."
    echo "  See CLAUDE.md 'Formatting Rules' section."
    FAILED=1
  fi
done

# Check JavaScript/MJS files in scripts/
for file in $(find scripts -name "*.mjs" 2>/dev/null); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    echo "  REQUIRED: Split into modules. Do NOT compress code or shorten output."
    echo "  See CLAUDE.md 'Formatting Rules' section."
    FAILED=1
  fi
done

# Check CSS files in src/
for file in $(find src -name "*.css" 2>/dev/null); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    echo "  REQUIRED: Split into modules. Do NOT compress code or shorten output."
    echo "  See CLAUDE.md 'Formatting Rules' section."
    FAILED=1
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo "All files under $MAX_LINES lines"
fi

exit $FAILED
