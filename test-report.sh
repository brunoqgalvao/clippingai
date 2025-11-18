#!/bin/bash

# Quick report generation test script
# Usage: ./test-report.sh "Company Name" "domain.com" "Industry"

COMPANY_NAME="${1:-Anthropic}"
DOMAIN="${2:-anthropic.com}"
INDUSTRY="${3:-AI/ML}"

echo "🚀 Generating report for: $COMPANY_NAME"
echo "📅 Date range: 7 days"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"companyName\": \"$COMPANY_NAME\",
    \"companyDomain\": \"$DOMAIN\",
    \"industry\": \"$INDUSTRY\",
    \"dateRange\": 7,
    \"isPublic\": true,
    \"saveToDatabase\": true
  }")

echo "$RESPONSE"
echo ""

# Extract publicSlug using grep and sed (no jq needed)
PUBLIC_SLUG=$(echo "$RESPONSE" | grep -o '"publicSlug":"[^"]*"' | sed 's/"publicSlug":"\(.*\)"/\1/')

if [ -n "$PUBLIC_SLUG" ]; then
  echo "✅ Report generated successfully!"
  echo "🔗 View at: http://localhost:5173/report/public/$PUBLIC_SLUG"
  echo ""
  echo "Opening in browser..."
  open "http://localhost:5173/report/public/$PUBLIC_SLUG" 2>/dev/null || echo "(Open the URL above in your browser)"
else
  echo "⚠️  No publicSlug found in response. Check for errors above."
fi
