# Company Knowledge Base System

## Overview

The Company Knowledge Base is a persistent, self-learning system that builds and maintains structured intelligence about your company. It gets smarter with each report, providing progressively better context and analysis.

## How It Works

### 1. Knowledge Framework

Each company has a structured knowledge profile:

```typescript
{
  // Core Identity
  companyName: "Your Company",
  companyDomain: "company.com",
  industry: "AI/ML",

  // Competitive Intelligence
  competitors: ["CompetitorA", "CompetitorB"],
  competitiveDynamics: {
    "CompetitorA": {
      strength: "Market leader with 40% share",
      weakness: "Slow product iteration cycle"
    }
  },

  // Market Position
  marketPosition: "Emerging player in enterprise AI automation",
  keyProducts: ["Product X", "Product Y"],
  targetMarket: "Enterprise B2B SaaS",
  strategicFocus: ["AI integration", "International expansion"],

  // Recent History
  recentNews: [
    { date: "2025-11-15", summary: "Launched new AI product" },
    { date: "2025-11-10", summary: "Raised $50M Series B" }
  ]
}
```

### 2. Knowledge Lifecycle

#### **On First Report**
```
1. Initialize knowledge base with basic info:
   - Company name, domain, industry
   - Competitors (if provided)

2. Generate report as usual

3. Extract knowledge from report:
   - Claude analyzes all articles
   - Identifies: competitors, products, strategic focus
   - Updates knowledge base
```

#### **On Subsequent Reports**
```
1. Load existing knowledge base

2. Inject knowledge into article prompts:
   "Known competitors: CompetitorA, CompetitorB
    Strategic focus: AI integration, expansion
    Recent developments: Launched Product X..."

3. Generate better reports with context

4. Extract NEW knowledge:
   - Only facts not already known
   - Update recent developments
   - Expand competitor insights
```

### 3. Knowledge Injection (The Smart Part)

Knowledge is added to prompts as **"Background Context (for inspiration)"**:

```
**BACKGROUND CONTEXT (for inspiration - do not force connections):**
Known competitors: CompetitorA, CompetitorB
Market position: Leading provider of AI automation
Strategic focus areas: AI integration, international expansion
Recent developments:
2025-11-15: Launched new AI product
2025-11-10: Raised $50M Series B
```

**Key Principle:** The context is marked as "for inspiration" to **avoid over-steering** the model. It won't force connections that don't exist in the sources.

### 4. Knowledge Extraction

After each report, Claude analyzes the content:

**Extraction Prompt:**
```
"Extract NEW knowledge about {Company} from this report:

ONLY extract facts EXPLICITLY stated
Focus on NEW information not already in knowledge base
Be concise - extract key facts only

Return JSON:
{
  "competitors": ["New Competitor"],
  "marketPosition": "Updated position",
  "keyProducts": ["Product 3"],
  "strategicFocus": ["New focus area"],
  "recentDevelopments": [...],
  "competitiveInsights": {...}
}"
```

**Smart Merging:**
- Competitors: Deduplicated list
- Products: Cumulative (keeps growing)
- Recent news: Last 10 developments
- Strategic focus: Evolves over time

## Benefits

### 1. **Progressive Intelligence**
- First report: Basic analysis
- 5th report: Deep competitive insights with historical context
- 20th report: Expert-level understanding of your market position

### 2. **Competitor Awareness**
Articles automatically recognize when discussing your competitors and provide relevant context:
- "CompetitorA just launched X - given their strength in Y and weakness in Z, this means..."

### 3. **Strategic Relevance**
Every article considers your company's actual strategic focus:
- If you're focused on "AI integration", AI news gets better analysis
- If competitor strength is "price leadership", pricing news gets flagged

### 4. **Historical Context**
- "This is CompanyX's 3rd acquisition this quarter..."
- "Building on their recent Product Y launch..."

## Database Schema

```prisma
model CompanyKnowledgeBase {
  id             String   @id
  userId         String   @unique
  companyName    String
  companyDomain  String
  industry       String?

  // Structured Framework
  competitors    String[]
  marketPosition String?
  keyProducts    String[]
  targetMarket   String?
  strategicFocus String[]

  // Recent Context
  recentNews     Json?    // Last 10 developments

  // Competitive Intel
  competitiveDynamics Json? // Competitor strengths/weaknesses

  // Metadata
  reportCount    Int
  lastUpdated    DateTime
  createdAt      DateTime
}
```

## API Usage

### Initialize Knowledge Base
```typescript
await initializeCompanyKnowledge(
  userId,
  "Anthropic",
  "anthropic.com",
  "AI/ML",
  ["OpenAI", "Google DeepMind"]
);
```

### Generate Report with Knowledge
```typescript
await generateReport({
  companyName: "Anthropic",
  companyDomain: "anthropic.com",
  industry: "AI/ML",
  userId: "user-123", // ← Enables knowledge base
  // ... other params
});
```

The knowledge base is loaded and used automatically when `userId` is provided.

### Get Knowledge
```typescript
const knowledge = await getCompanyKnowledge(userId);
```

## Frontend Display (Future)

You could show the knowledge base in the UI:

```
┌─────────────────────────────────────┐
│ YOUR COMPANY INTELLIGENCE PROFILE   │
├─────────────────────────────────────┤
│ Competitors (3)                     │
│ • CompetitorA - Market leader       │
│ • CompetitorB - Price leader        │
│ • CompetitorC - Innovation leader   │
│                                     │
│ Key Products (5)                    │
│ • Product X, Product Y, ...         │
│                                     │
│ Strategic Focus                     │
│ • AI Integration                    │
│ • International Expansion           │
│                                     │
│ Recent Activity (10)                │
│ • Nov 15: Launched Product X        │
│ • Nov 10: Raised $50M Series B      │
│ • ...                               │
└─────────────────────────────────────┘
```

## Key Design Principles

1. **Non-Invasive**: Knowledge is "inspiration" not hard constraints
2. **Incremental**: Learns gradually, doesn't overwhelm
3. **Factual**: Only stores facts explicitly found in sources
4. **Structured**: Framework ensures consistent, queryable data
5. **Recent-Aware**: Keeps last 10 developments for context

## Files

- **Database Schema:** `packages/database/prisma/schema.prisma`
- **Knowledge Service:** `apps/api/src/services/companyKnowledge.ts`
- **Integration:** `apps/api/src/services/reportGeneration.ts`

## Migration

Run when database is set up:
```bash
cd packages/database
npx prisma migrate dev --name add_company_knowledge_base
```

This creates the `company_knowledge_base` table.
