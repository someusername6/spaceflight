#!/bin/bash
# Enforces 400-line maximum for TypeScript and JavaScript files
# Run with: npm run check-size

MAX_LINES=400
FAILED=0

# Check TypeScript files in src/
for file in $(find src -name "*.ts" 2>/dev/null); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    FAILED=1
  fi
done

# Check JavaScript/MJS files in scripts/
for file in $(find scripts -name "*.mjs" 2>/dev/null); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $lines lines (max $MAX_LINES)"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo "All files under $MAX_LINES lines"
fi

exit $FAILED
