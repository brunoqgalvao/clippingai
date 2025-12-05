# Report Generation Architecture

## Two Modes

### 1. Fast Pipeline (Default - Onboarding)
- **Speed:** ~45-60 seconds
- **Use case:** Onboarding, instant reports
- **Method:** Anthropic Claude + Tavily search
- **Quality improvements:**
  - 6 diverse queries (company, competitors x2, industry, tech, regulation)
  - Theme diversity enforcement in article selection
  - No duplicate topics allowed

### 2. Deep Research (Tela Agent)
- **Speed:** ~5-7 minutes
- **Use case:** Scheduled weekly reports, deep analysis
- **Method:** Autonomous Tela agent with unlimited web search
- **Trigger:** `useDeepResearch: true` in API request, or `USE_TELA_AGENT=true` env var

## Configuration

### Environment Variables

```bash
# Enable Tela globally (default: false, use fast pipeline)
USE_TELA_AGENT=true

# Tela API Key
TELA_API_KEY=f2dfc46a-16a3-4979-8a1f-fe7499733c64
```

### Per-Request Deep Research

```typescript
// In API call
{
  "companyName": "Stripe",
  "companyDomain": "stripe.com",
  "useDeepResearch": true  // Forces Tela agent
}
```

### Canvas ID
The prompt/canvas is configured in Tela's dashboard:
- Canvas ID: `70e2ea14-73d5-4406-a54c-b58f2c6274f6`

## API Details

**Endpoint:** `https://api.tela.com/v2/chat/completions`

**Request:**
```json
{
  "canvas_id": "70e2ea14-73d5-4406-a54c-b58f2c6274f6",
  "variables": {
    "company_name": "Acme Corp",
    "company_domain": "acme.com",
    "industry": "SaaS",
    "competitors": "Competitor1, Competitor2",
    "date_range": "7",
    "geography": "Global"
  }
}
```

**Response Structure:**
```typescript
{
  title: string;           // Report headline
  summary: string;         // Markdown TL;DR
  articles: [
    {
      title: string;
      summary: string;     // 2-3 sentences
      content: string;     // Full analysis with source citations
      sources: string[];   // URLs
      relevance: string;   // Why it matters to the company
    }
  ];
  research_notes: {
    searches_performed: string[];  // All queries used
    sources_reviewed: number;      // Total sources checked
    confidence_level: string;      // high/medium/low
    gaps: string;                  // What couldn't be found
  };
}
```

## Architecture

1. **Primary:** Tela Agent (autonomous research)
2. **Fallback:** Legacy multi-step pipeline (if Tela fails)

### Flow
```
generateReport()
  ↓
  USE_TELA_AGENT? → generateReportWithTelaAgent()
                         ↓
                    Call Tela API
                         ↓
                    Convert response
                         ↓
                    Generate images (OpenAI)
                         ↓
                    Update company knowledge
  ↓ (on error)
  generateReportLegacy() → Multi-step Anthropic + Tavily pipeline
```

## Files

- `apps/api/src/services/telaAgent.ts` - Tela API client and response conversion
- `apps/api/src/services/reportGeneration.ts` - Main generator with Tela integration

## Debugging

The debug trace (`Cmd+Shift+D` on Report page) will show:
- `tela_agent_start` - When Tela is called
- `tela_agent_response` - Response summary (title, article count, research notes)
- `tela_agent_error` - If Tela fails (before fallback)

Or for legacy:
- `legacy_pipeline_start` - When using fallback
- All the usual query/search/extraction steps

## Disabling Tela

To use the legacy pipeline:

```bash
USE_TELA_AGENT=false pnpm dev
```

Or set in `.env`:
```
USE_TELA_AGENT=false
```
