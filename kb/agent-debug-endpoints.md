# Agent Debug System

Hidden development tools for inspecting the research agent's behavior.

## UI Access (Hidden)

**Keyboard Shortcut:** `Cmd/Ctrl + Shift + D` on the Report page

This opens a slide-out debug panel showing:
- Generation stats (duration, step count, company)
- Filterable step list (all, research, searches, decisions)
- Expandable steps with full prompts, responses, and data
- Color-coded by step type

## API Endpoints

### Get Full Trace
```bash
curl http://localhost:3001/api/reports/__debug/trace
```
Returns the complete trace including all prompts, responses, and data.

### Get Trace Summary
```bash
curl http://localhost:3001/api/reports/__debug/trace/summary
```
Returns a concise summary with timing info and data (no full prompts/responses).

## Usage Flow

1. Generate a report via the UI or API
2. Open the debug panel with `Cmd/Ctrl + Shift + D`
3. Explore the agent's reasoning step by step

Note: Trace is always captured for every report generation.

## Trace Structure

```typescript
interface AgentTrace {
  startTime: number;
  endTime?: number;
  input: ReportGenerationInput;
  steps: AgentTraceStep[];
}

interface AgentTraceStep {
  step: string;           // e.g., "query_planning_start", "deep_research_iteration_1_decision"
  timestamp: number;
  prompt?: string;        // The full prompt sent to Claude
  response?: string;      // The raw response from Claude
  data?: any;            // Structured data (queries, search results, decisions, etc.)
}
```

## Step Types Captured

- `report_generation_start` - Initial input
- `query_planning_start/complete` - Query generation with prompts/responses
- `search_start/complete` - Tavily searches with results
- `extraction_start/complete` - Article selection
- `deep_research_start` - Per-article deep research begins
- `deep_research_iteration_N_prompt` - Agent decision prompt
- `deep_research_iteration_N_decision` - Agent's choice (search more or done)
- `deep_research_search` - Follow-up searches
- `deep_research_search_results` - Results from follow-up
- `deep_research_complete` - Summary of research phase
- `summarization_start/complete` - Article summarization
- `report_generation_complete` - Final stats
