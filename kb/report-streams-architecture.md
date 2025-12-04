# Report Streams Architecture - Implementation Guide

## What We're Building

Transforming from **one-off reports** to **ongoing report streams** (subscriptions).

### Before (Current State)
- User generates individual reports
- Dashboard shows list of generated reports
- Each report is standalone
- No ongoing subscriptions

### After (Streams Architecture)
- User creates **Report Configs** (streams) for companies
- Each stream generates reports automatically (daily/weekly/monthly)
- Dashboard shows streams with latest report for each
- Can manage recipients, edit settings, pause/resume

---

## What's Already Built ✅

### 1. Database Schema (Already Perfect!)
The schema already supports this:

**ReportConfig** - The "stream"
- title, description, reportType
- frequency (daily/weekly/monthly), scheduleTime
- searchParameters (company, industry, competitors)
- status (active/paused/deleted)
- Tracks nextGenerationAt, lastGenerationAt

**ReportRecipient** - Email subscribers
- Linked to ReportConfig
- Can unsubscribe
- Status tracking

**GeneratedReport** - Individual reports
- Linked to Report Config (FK: reportConfigId)
- Contains actual report content
- Status: generating/completed/failed

### 2. Backend API Routes ✅

**File:** `apps/api/src/routes/reportConfigs.ts` (550+ lines)

Complete CRUD for report configs:
- `POST /api/report-configs` - Create new stream
- `GET /api/report-configs` - List user's streams
- `GET /api/report-configs/:id` - Get stream details
- `PATCH /api/report-configs/:id` - Update stream settings
- `DELETE /api/report-configs/:id` - Delete stream (soft delete)

Recipient management:
- `POST /api/report-configs/:id/recipients` - Add email recipients
- `DELETE /api/report-configs/:id/recipients/:recipientId` - Remove recipient

Manual generation:
- `POST /api/report-configs/:id/generate` - Trigger generation now

**Features:**
- ✅ Authentication required (requireAuth middleware)
- ✅ Ownership verification (user can only edit their own configs)
- ✅ Automatic next generation time calculation
- ✅ Includes latest generated report in list response
- ✅ Returns count of total reports generated

### 3. Frontend API Client ✅

**File:** `apps/web/src/lib/api.ts` (added ~200 lines)

Complete TypeScript client:
- `createReportConfig(input)` - Create stream
- `getReportConfigs()` - List streams
- `getReportConfig(id)` - Get stream details
- `updateReportConfig(id, updates)` - Update stream
- `deleteReportConfig(id)` - Delete stream
- `addReportConfigRecipients(id, emails)` - Add recipients
- `removeReportConfigRecipient(configId, recipientId)` - Remove recipient
- `generateReportForConfig(configId)` - Generate now

**TypeScript Types:**
```typescript
interface ReportConfig {
  id: string;
  title: string;
  description: string;
  reportType: 'competitor_landscape' | 'market_landscape' | 'media_monitoring';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  scheduleTime: string; // "09:00"
  searchParameters: {
    companyName?: string;
    companyDomain?: string;
    industry?: string;
    competitors?: string[];
    keywords?: string[];
  };
  recipients?: ReportRecipient[];
  generatedReports?: StoredReport[]; // Latest reports
  _count?: { generatedReports: number }; // Total count
}
```

### 4. Server Integration ✅

**File:** `apps/api/src/index.ts`
- Imported reportConfigsRoutes
- Mounted at `/api/report-configs`
- Protected by auth middleware

---

## What Needs to Be Built 🚧

### 1. Update Dashboard to Show Streams

**Current Dashboard (`apps/web/src/pages/Dashboard.tsx`):**
```typescript
// Currently fetches individual reports:
const userReports = await getReportsByUserId(currentUser.id);
```

**New Dashboard:**
```typescript
// Should fetch report configs (streams):
const reportConfigs = await getReportConfigs();
```

**UI Changes:**
Each card should show:
- Stream title (e.g., "Anthropic Competitor Intelligence")
- Frequency badge ("Weekly", "Daily")
- Status (Active, Paused)
- Latest report thumbnail
- Report count ("12 reports generated")
- Recipients count ("Sent to 3 people")
- Actions:
  - "View Latest Report"
  - "Generate Now"
  - "Edit Settings" (gear icon)
  - "Pause/Resume" toggle

**Empty State:**
- "No report streams yet"
- "Create your first weekly intelligence stream"
- CTA: "Create Stream"

### 2. Create Stream Creation Page

**New Page:** `apps/web/src/pages/CreateStream.tsx`

**Flow:**
1. **Company Info**
   - Company name (text input)
   - Company domain (text input)
   - Industry (dropdown or text)

2. **Report Type**
   - Competitor Intelligence (track competitors)
   - Market Trends (track industry)
   - Media Monitoring (track your company mentions)

3. **Criteria**
   - For Competitor: List competitor names
   - For Market: Keywords to track
   - For Media: Company keywords

4. **Schedule**
   - Frequency: Daily / Weekly / Biweekly / Monthly
   - Time: "09:00 AM" (time picker)
   - Day: "Monday" (if weekly/biweekly/monthly)

5. **Recipients**
   - Email list (add multiple)
   - "team@company.com, ceo@company.com"

6. **Review & Create**
   - Show summary
   - "Create Stream" button
   - Immediately generates first report

**Route:** `/streams/create` or `/create-stream`

### 3. Stream Settings/Edit Page

**New Page:** `apps/web/src/pages/StreamSettings.tsx`

**Route:** `/streams/:id/settings`

**Tabs:**
1. **General**
   - Title (editable)
   - Description (editable)
   - Status toggle (Active/Paused)

2. **Criteria**
   - Company info
   - Keywords/competitors (editable)
   - Report type (read-only)

3. **Schedule**
   - Frequency (editable)
   - Time (editable)
   - Day (editable if weekly+)
   - Next generation: "Tomorrow at 9:00 AM"

4. **Recipients**
   - List of emails
   - Add new recipients
   - Remove recipients
   - Each shows status (Active/Unsubscribed)

5. **History**
   - List of generated reports
   - Click to view
   - Regenerate option

6. **Danger Zone**
   - Delete stream
   - Archive stream

### 4. Update Onboarding Flow

**Current:** Creates one-off report

**New:** Creates Report Config (stream)

**Changes to `apps/web/src/pages/Onboarding.tsx`:**

After signup step, instead of immediate generation:
```typescript
// Create a report config
const config = await createReportConfig({
  title: `${companyInfo.name} Weekly Intelligence`,
  description: `Weekly competitive intelligence for ${companyInfo.name}`,
  reportType: 'media_monitoring',
  frequency: 'weekly',
  scheduleTime: '09:00',
  scheduleDay: 'monday',
  searchParameters: {
    companyName: companyInfo.name,
    companyDomain: companyInfo.domain,
    industry: companyInfo.industry,
    competitors: companyInfo.competitors,
    dateRange: '7d',
  },
  recipients: [user.email],
});

// Then generate first report immediately
const { jobId } = await generateReportForConfig(config.id);

// Poll for completion and show report
```

**Result:**
- User gets their first report
- **AND** has an ongoing weekly stream set up
- Dashboard will show this stream
- Next Monday at 9am, another report auto-generates

### 5. Dashboard "New Stream" Button

**Current:** Goes to `/onboarding`

**New:** Goes to `/streams/create` (or `/create-stream`)

**Change:**
```typescript
// In Dashboard.tsx
<button onClick={() => navigate('/streams/create')}>
  <Plus size={20} />
  New Stream
</button>
```

### 6. Job Queue Integration

**When to generate reports:**
1. **Manual:** User clicks "Generate Now" on a stream
2. **Scheduled:** Cron job checks `nextGenerationAt` and queues reports
3. **First time:** After creating stream, generate immediately

**Scheduled Generation (Not Yet Built):**

**New File:** `apps/api/src/jobs/scheduler.ts`

```typescript
import cron from 'node-cron';
import { prisma } from '@clippingai/database';
import { addReportJob } from '../services/jobQueue.js';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('🔍 Checking for reports to generate...');

  const now = new Date();

  // Find configs that are due for generation
  const dueConfigs = await prisma.reportConfig.findMany({
    where: {
      status: 'active',
      nextGenerationAt: {
        lte: now,
      },
    },
  });

  console.log(`📋 Found ${dueConfigs.length} reports to generate`);

  for (const config of dueConfigs) {
    try {
      const params = config.searchParameters as any;

      // Queue the job
      await addReportJob({
        companyName: params.companyName || 'Unknown',
        companyDomain: params.companyDomain || '',
        industry: params.industry,
        competitors: params.competitors,
        reportType: config.reportType,
        dateRange: parseInt(params.dateRange) || 7,
        userId: config.userId,
        reportConfigId: config.id,
        isPublic: false,
      });

      // Update next generation time
      const nextRun = calculateNextRun(config.frequency, config.scheduleTime);

      await prisma.reportConfig.update({
        where: { id: config.id },
        data: {
          lastGenerationAt: now,
          nextGenerationAt: nextRun,
        },
      });

      console.log(`✅ Queued generation for "${config.title}"`);
    } catch (error) {
      console.error(`❌ Failed to queue "${config.title}":`, error);
    }
  }
});

function calculateNextRun(frequency: string, scheduleTime: string): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}
```

**Start scheduler in `apps/api/src/index.ts`:**
```typescript
import './jobs/scheduler.js'; // Auto-runs cron
```

---

## Implementation Checklist

### Phase 1: Dashboard Streams View (1-2 hours)
- [ ] Update Dashboard to fetch `getReportConfigs()` instead of `getReportsByUserId()`
- [ ] Update Dashboard cards to show stream info (frequency, status, recipient count)
- [ ] Add "Generate Now" button to each card
- [ ] Add "Edit Settings" button to each card
- [ ] Update empty state messaging
- [ ] Change "New Report" to go to `/streams/create`

### Phase 2: Create Stream Page (2-3 hours)
- [ ] Create `apps/web/src/pages/CreateStream.tsx`
- [ ] Multi-step form (5 steps: Company → Type → Criteria → Schedule → Recipients)
- [ ] Form validation with Zod
- [ ] Create stream via API
- [ ] Immediately generate first report
- [ ] Poll for completion
- [ ] Redirect to dashboard showing new stream

### Phase 3: Stream Settings Page (2-3 hours)
- [ ] Create `apps/web/src/pages/StreamSettings.tsx`
- [ ] Load stream data on mount
- [ ] Editable fields for title, description, criteria
- [ ] Schedule editor (frequency, time, day)
- [ ] Recipients management (add/remove)
- [ ] History list (past generated reports)
- [ ] Pause/Resume toggle
- [ ] Delete stream (with confirmation)

### Phase 4: Update Onboarding (1 hour)
- [ ] Modify onboarding to create ReportConfig instead of one-off
- [ ] Set default frequency to "weekly"
- [ ] Add user email as default recipient
- [ ] Generate first report immediately
- [ ] Show success message: "Your weekly stream is now active!"

### Phase 5: Scheduled Generation (2-3 hours)
- [ ] Create `apps/api/src/jobs/scheduler.ts`
- [ ] Implement cron job (every hour)
- [ ] Calculate next run time logic
- [ ] Update report config after generation
- [ ] Start scheduler in server
- [ ] Add environment variable for cron schedule

### Phase 6: Testing & Polish (2 hours)
- [ ] Test create stream flow end-to-end
- [ ] Test edit stream settings
- [ ] Test manual generation
- [ ] Test scheduled generation (wait for cron)
- [ ] Test pause/resume
- [ ] Test delete stream
- [ ] Test recipient management
- [ ] Mobile responsive check

---

## Total Estimated Time: 10-14 hours

**High Priority:**
1. Dashboard update (most visible change)
2. Create stream page (core functionality)
3. Update onboarding (first-time user experience)

**Medium Priority:**
4. Stream settings (power users)
5. Scheduled generation (automation)

**Low Priority:**
6. Advanced features (history, analytics)

---

## User Experience Flow

### First-Time User
1. Lands on site, enters email
2. If existing: Login → Dashboard (sees existing streams)
3. If new: Onboarding → Creates account
4. Onboarding auto-creates first stream: "Weekly Intelligence"
5. First report generates immediately
6. Views report → Beautiful
7. Goes to dashboard → Sees 1 stream active
8. Next week: Gets email with new report automatically

### Returning User
1. Login → Dashboard
2. Sees list of active streams:
   - "Anthropic Competitor Intel" - Weekly - 5 reports - Active
   - "AI Market Trends" - Daily - 23 reports - Active
3. Clicks stream → Views latest report
4. Clicks "Edit" → Changes recipients, adds team emails
5. Clicks "Generate Now" → Gets fresh report in 2 mins
6. Clicks "New Stream" → Creates stream for different company

### Power User
1. Has 10+ streams for different companies
2. Each stream has multiple recipients
3. Some daily, some weekly
4. Edits criteria as market changes
5. Pauses streams when not needed
6. Reviews history to track trends over time

---

## Architecture Benefits

### For Users
- ✅ Set it and forget it (automated reports)
- ✅ Multiple streams for different needs
- ✅ Team collaboration (multiple recipients)
- ✅ Flexible scheduling
- ✅ Historical tracking

### For Product
- ✅ Recurring value (not one-off)
- ✅ Higher engagement (weekly touchpoints)
- ✅ Natural upgrade path (free: 1 stream, pro: unlimited)
- ✅ Viral growth (recipients can sign up)
- ✅ Data insights (which industries/types popular)

### For Development
- ✅ Database schema already supports it
- ✅ Clean separation of concerns (config vs report)
- ✅ Background jobs handle generation
- ✅ Easy to add features (analytics, templates, etc.)

---

## Next Steps

**Option A: Full Implementation** (10-14 hours)
- I can implement all 6 phases systematically
- Result: Complete report streams architecture
- Users manage ongoing subscriptions, not one-off reports

**Option B: Minimal Viable Streams** (4-6 hours)
- Phase 1: Dashboard update
- Phase 2: Create stream page
- Phase 4: Update onboarding
- Skip settings page and scheduler for now
- Manual generation only

**Option C: Hybrid Approach**
- Keep current dashboard showing individual reports
- Add "Streams" tab/page separately
- Let users choose: one-off OR stream
- Gradual migration

---

## Questions to Decide

1. **Timeline:** How quickly do you need this?
2. **Scope:** Full implementation or MVP?
3. **Migration:** What happens to existing generated reports?
4. **Default:** Should onboarding create a stream or one-off?
5. **UI:** Separate streams page or replace dashboard?

---

**Current Status:** Backend 100% ready. Frontend needs UI components (4-14 hours depending on scope).

Let me know which approach you prefer and I'll implement it!

---

**Created:** November 18, 2025
**Status:** Design Complete, Ready to Build
