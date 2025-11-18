# Report Generation - Quick Iteration Guide

## Current Flow (End-to-End)

```
User → Onboarding Flow
  ↓
1. Email Input
  ↓
2. Company Detection (API: /api/onboarding/detect)
  ↓
3. Company Verification
  ↓
4. Report Generation (API: /api/reports/generate)
  ↓
5. Save to Database (with publicSlug)
  ↓
6. Navigate to /report with state data
  ↓
7. Report Viewer displays the report
```

## Simplified Flow for Iteration (API-First)

You can bypass the entire onboarding and generate reports directly:

### Step 1: Generate Report via API

```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Anthropic",
    "companyDomain": "anthropic.com",
    "industry": "AI/ML",
    "dateRange": 7,
    "isPublic": true,
    "saveToDatabase": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Over the past 7 days, Anthropic...",
    "articles": [...],
    "metadata": {...},
    "reportId": "clxx123...",
    "publicSlug": "anthropic-media-monitoring-abc123"
  }
}
```

### Step 2: View Report in Browser

```
http://localhost:5173/report/public/{publicSlug}
```

Or by ID:
```
http://localhost:5173/report/{reportId}
```

## Quick Test Script

Use the provided test script:

```bash
chmod +x test-report.sh
./test-report.sh "Anthropic" "anthropic.com" "AI/ML"
```

## Report Generation Pipeline

### Current Implementation

1. **Query Planning** (Claude Sonnet 4.5)
   - Generates 5-7 optimized search queries
   - Focused on media monitoring (news, trends, competitors)

2. **Web Search** (Tavily)
   - Executes searches with date filtering
   - Fallback: 7 days → 30 days → 365 days
   - Returns articles with title, URL, content, date

3. **Article Ranking** (Claude Sonnet 4.5)
   - Selects top 5 most relevant articles
   - Criteria: relevance, recency, quality, uniqueness

4. **Summarization** (Claude Sonnet 4.5)
   - Creates 2-3 sentence preview
   - Generates 300-500 word analysis
   - Extracts key points

5. **TLDR Synthesis** (Claude Sonnet 4.5)
   - Creates compelling summary
   - Acknowledges time period
   - Highlights patterns and insights

6. **Image Generation** (OpenAI GPT-Image-1)
   - Generates editorial-style images
   - Premium publication aesthetic
   - Based on article descriptions

### Output Structure

```typescript
interface GeneratedReport {
  summary: string;              // Time-aware TLDR
  articles: Article[];          // 5 articles with images
  metadata: {
    totalSearches: number;      // Queries executed
    articlesFound: number;      // Total results
    articlesSelected: number;   // Final count
    generationTime: number;     // Duration in ms
  }
}

interface Article {
  id: string;
  title: string;
  summary: string;              // 2-3 sentences
  content: string;              // 300-500 words
  imageUrl?: string;            // Generated image
  imageAlt?: string;            // Image description
  sources: string[];            // Source URLs
  publishedAt?: string;         // Publication date
}
```

## Iteration Workflow

### 1. Generate Report
```bash
./test-report.sh "Company Name" "domain.com" "Industry"
```

### 2. Get Public URL
Copy the `publicSlug` from the response

### 3. View in Browser
```
http://localhost:5173/report/public/{publicSlug}
```

### 4. Iterate on Design/Content
- Modify report viewer: `apps/web/src/pages/Report.tsx`
- Modify styles: `apps/web/src/styles/report.css`
- Modify generation logic: `apps/api/src/services/reportGeneration.ts`

### 5. Test Again
Generate a new report to see changes

## Key Files

- **Report Generation:** `apps/api/src/services/reportGeneration.ts`
- **Report API:** `apps/api/src/routes/reports.ts`
- **Report Viewer:** `apps/web/src/pages/Report.tsx`
- **Report Styles:** `apps/web/src/styles/report.css`
- **Storage:** `apps/api/src/services/reportStorage.ts`

## Database

Reports are stored in PostgreSQL via Prisma:
- **Table:** `Report`
- **Fields:** id, userId, companyName, reportType, content (JSON), publicSlug, createdAt
- **Public Access:** `/report/public/{publicSlug}`
- **Private Access:** `/report/{id}` (requires auth eventually)

## Next Steps for Improvement

### Content Quality
- [ ] Better query generation (more specific to company)
- [ ] Smarter article selection (avoid duplicates)
- [ ] Richer summarization (more actionable insights)
- [ ] Sentiment analysis
- [ ] Trend detection

### Visual Design
- [ ] Better typography
- [ ] Enhanced layout
- [ ] Interactive elements
- [ ] Data visualizations
- [ ] Charts and graphs

### Features
- [ ] PDF export
- [ ] Email delivery
- [ ] Custom date ranges
- [ ] Filter by topic
- [ ] Save/bookmark articles
