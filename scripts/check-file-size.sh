#!/bin/bash
# Enforces 300-line maximum for all TypeScript files
# Run with: npm run check-size

MAX_LINES=300
FAILED=0

for file in $(find src -name "*.ts" 2>/dev/null); do
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
