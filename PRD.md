# Product Requirements Document: Clipping.AI

**Version:** 1.1
**Last Updated:** 2025-11-04
**Document Owner:** Product Team
**Status:** Draft for Review - Technical Refinements Applied

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [MVP Options & Scope](#mvp-options--scope)
3. [Problem Statement & Goals](#problem-statement--goals)
4. [Target Users](#target-users)
4. [Product Overview](#product-overview)
5. [Feature Requirements](#feature-requirements)
6. [User Flows](#user-flows)
7. [Technical Architecture](#technical-architecture)
8. [Database Schema](#database-schema)
9. [API Specifications](#api-specifications)
10. [UI/UX Requirements](#ui-ux-requirements)
11. [Security & Privacy](#security--privacy)
12. [Performance Requirements](#performance-requirements)
13. [Deployment Architecture](#deployment-architecture)
14. [Development Phases](#development-phases)
15. [Success Metrics](#success-metrics)
16. [Risks & Mitigations](#risks--mitigations)
17. [Open Questions](#open-questions)

---

## Executive Summary

**Clipping.AI** is an AI-powered competitive intelligence and market research platform that delivers personalized, automated reports via email. Users configure custom "clipping" reports on topics like competitors, market trends, or industry news, and receive beautifully formatted, actionable insights at their chosen frequency (daily/weekly).

### Key Value Propositions
- **Zero Research Time:** Automated competitive intelligence delivered to your inbox
- **AI-Powered Insights:** Claude-powered analysis with web search for current information
- **ChatGPT Pulse-Style UX:** Engaging headline format with expandable articles and AI-generated imagery
- **Frictionless Onboarding:** Test-drive reports before full registration
- **Mobile-First:** Fully responsive design for reading on any device
- **Collaborative:** Share reports publicly and send to team members

---

## Problem Statement & Goals

### Problem Statement
Business professionals spend hours weekly researching competitors, market trends, and industry news. This manual research is:
- Time-consuming and repetitive
- Often incomplete or biased
- Difficult to share with teams
- Hard to maintain consistency

### Goals
1. **Primary Goal:** Reduce competitive research time from hours to minutes per week
2. **Secondary Goals:**
   - Achieve 30% trial-to-paid conversion within 3 months
   - Maintain 70%+ email open rates
   - Enable users to set up their first report in under 3 minutes
   - Achieve mobile reading engagement of 60%+

### Success Criteria
- Users create and activate at least 1 report within first session
- 80% of reports are successfully generated and delivered on schedule
- Average user manages 2-3 active reports
- 40% of users share at least one report publicly

---

## Target Users

### Primary Persona: Marketing Manager Maria
- **Role:** Marketing Manager at B2B SaaS company (50-200 employees)
- **Pain Points:** Needs to track 3-5 competitors, stay on top of industry trends, report to leadership weekly
- **Goals:** Automate competitive research, impress leadership with insights, save 5+ hours/week
- **Tech Savvy:** Medium - comfortable with SaaS tools, prefers simple interfaces

### Secondary Persona: Founder Frank
- **Role:** Solo founder or startup CEO
- **Pain Points:** Wearing multiple hats, needs to stay informed but has no time
- **Goals:** Quick market insights to inform product decisions, investor updates
- **Tech Savvy:** High - technical founder, values automation

### Tertiary Persona: Consultant Claire
- **Role:** Independent business consultant serving multiple clients
- **Pain Points:** Needs to track different industries for different clients
- **Goals:** Deliver value to clients with minimal research time, white-label sharing
- **Tech Savvy:** Medium - uses many tools, values efficiency

---

## Product Overview

### Core Product Loop
1. User describes what they want to track (in natural language)
2. AI configures optimal search parameters and report structure
3. System generates report at scheduled intervals using web search + Claude
4. User receives email with TL;DR + link to full web report
5. User reads, shares, and refines parameters for next report

### Key Differentiators
- **Natural language configuration:** No complex forms, just describe what you need
- **Two-stage AI generation:** One Claude instance optimizes the prompt, another generates the report
- **Visual appeal:** AI-generated header images for each headline
- **Sharing-first:** Public links and social sharing built-in
- **Test-drive:** Try before committing (pre-registration trial)

---

## Feature Requirements

### 1. Landing Page & Pre-Registration Trial

#### 1.1 Landing Page (Public)
**Priority:** P0 (MVP)

**Description:**
Marketing-focused landing page that clearly communicates value and enables instant trial.

**Requirements:**
- Hero section with clear value proposition
- "Try it now" email input (no registration required)
- Example report preview/demo
- Pricing information (free tier vs. paid)
- Responsive design (mobile-first)
- Fast load time (<2s)

**User Flow:**
1. User lands on homepage
2. Sees value proposition and example
3. Enters email in prominent CTA
4. Proceeds to report configuration wizard

#### 1.2 Report Configuration Wizard (Pre-Auth)
**Priority:** P0 (MVP)

**Description:**
Guided, conversational interface to set up first report without registration.

**Requirements:**
- Step 1: Collect email address
- Step 2: Natural language input field asking "What would you like to track?"
  - Example prompts: "Track competitor X's product launches and pricing changes", "Monitor AI regulation news in EU"
  - Textarea with 500 char limit
  - Helper text with examples
- Step 3: AI processes input and suggests:
  - Report title
  - Key topics to monitor
  - Suggested search queries (editable)
  - Recommended frequency (daily/weekly)
- Step 4: User reviews and confirms
- Step 5: Prompt to create account to receive report
  - Email already filled
  - Password field
  - "Create Account & Generate First Report" CTA
- Loading state while first report generates
- Success screen with:
  - "Report generating, you'll receive email in ~2 minutes"
  - Link to view report immediately (creates session)
  - Prompt to verify email

**Technical Notes:**
- Store configuration temporarily (Redis, 24h TTL) before account creation
- Rate limit by IP: 3 trial reports per day to prevent abuse
- Email verification required before second report delivery

#### 1.3 First Report Generation
**Priority:** P0 (MVP)

**Requirements:**
- Generate report immediately upon signup (async job)
- Send email notification when ready (~1-3 minutes)
- Email contains:
  - Personalized greeting
  - 2-3 sentence TL;DR of key findings
  - 3 top headlines preview
  - "Read Full Report" CTA button
  - Unsubscribe link
- Report page accessible via unique URL
- Mark email as verified if user clicks link

---

### 2. Authentication & Account Management

#### 2.1 User Registration
**Priority:** P0 (MVP)

**Requirements:**
- Email + password signup (post-trial)
- Password requirements: min 8 chars, 1 number, 1 special char
- Email verification required (send verification link)
- JWT-based authentication
- Session management (7-day expiry, refresh token)
- "Remember me" option (30-day session)

**Security:**
- Bcrypt password hashing (12 rounds)
- Rate limiting on signup (5 attempts per IP per hour)
- Email uniqueness validation
- Prevent disposable email services (optional for MVP)

#### 2.2 User Login
**Priority:** P0 (MVP)

**Requirements:**
- Email + password login
- "Forgot password" flow
- JWT token issuance
- Rate limiting (10 failed attempts = 1h lockout)
- Redirect to dashboard on success

#### 2.3 Password Reset
**Priority:** P0 (MVP)

**Requirements:**
- "Forgot password" link on login page
- Enter email, receive reset link (expires in 1 hour)
- Reset link validates token and allows new password
- Invalidate all existing sessions on password change
- Rate limit reset requests (3 per hour per email)

#### 2.4 Account Settings
**Priority:** P1 (Post-MVP)

**Requirements:**
- Change email (requires verification)
- Change password (requires current password)
- Account deletion
- Email preferences (frequency, digest options)
- Timezone selection for delivery timing

---

### 3. Dashboard & Report Management

#### 3.1 Dashboard Overview
**Priority:** P0 (MVP)

**Description:**
Main authenticated view showing all user's reports and quick actions.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Clipping.AI                    [+ New Report] │
├─────────────────────────────────────────────┤
│  Your Reports (3)                            │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ 🖼️ Image     │  │ 🖼️ Image     │        │
│  │ Competitor X  │  │ AI Regulation│        │
│  │ Weekly • Mon  │  │ Daily • 9am  │        │
│  │ Last: 2h ago  │  │ Last: 5h ago │        │
│  │ [View] [•••]  │  │ [View] [•••] │        │
│  └──────────────┘  └──────────────┘        │
│                                              │
└─────────────────────────────────────────────┘
```

**Requirements:**
- Card-based layout for reports (responsive grid)
- Each card shows:
  - AI-generated thumbnail image
  - Report title
  - Frequency and schedule
  - Last generated time
  - Quick actions: View, Edit, Delete
- "New Report" CTA (prominent)
- Empty state for new users (onboarding prompt)
- Mobile: stack cards vertically
- Free tier limit indicator: "2 of 2 reports used. Upgrade for more."

#### 3.2 Report Card Actions
**Priority:** P0 (MVP)

**Requirements:**
- **View:** Navigate to latest report
- **Edit:** Open report settings
- **Delete:** Confirm dialog, then remove
- **Pause/Resume:** Toggle to stop/start generation (P1)
- **Duplicate:** Create copy with same settings (P1)
- **Three-dot menu** for secondary actions

#### 3.3 Create New Report Flow
**Priority:** P0 (MVP)

**Requirements:**
- Button from dashboard opens modal/new page
- Same conversational wizard as pre-auth trial:
  1. "What do you want to track?" (natural language)
  2. AI suggests configuration
  3. User reviews/edits
  4. Set frequency (daily at [time], weekly on [day] at [time])
  5. Add recipient emails (optional, MVP feature)
  6. "Create Report" → generates first report immediately
- Free tier: Show limit ("You've used 2 of 2 reports. Upgrade to create more.")
- Loading state during AI processing (1-3s)
- Success message + redirect to report page

---

### 4. Report Configuration & Settings

#### 4.1 Report Settings Page
**Priority:** P0 (MVP)

**Description:**
Detailed settings for each report, accessible via Edit from dashboard.

**Sections:**

**A. Basic Information**
- Report title (editable)
- Description (what this report tracks)
- Status: Active/Paused toggle

**B. Content Configuration**
- Natural language description (editable)
- Derived search parameters (shown as tags, editable)
  - Keywords
  - Sources to prioritize
  - Date range for search (last 24h, 7d, 30d)
- Tone/angle (e.g., "Focus on product changes", "Regulatory impacts", "Market opportunities")

**C. Schedule**
- Frequency: Daily, Weekly, Bi-weekly, Monthly
- Day of week (if weekly+)
- Time of day (dropdown, timezone-aware)
- Next scheduled generation (display)

**D. Recipients** (MVP Feature)
- Primary: User's email (always included, cannot remove)
- Additional emails: Add up to 5 emails (free tier limit)
- Input validation: email format
- Each recipient shows: email, [Remove] button
- "Add Email" button

**E. History**
- List of past generated reports (last 10, P1 for full history)
- Each shows: Date, Headline count, [View] link
- "View All History" link (P1)

**F. Danger Zone**
- Delete report (confirmation required)

**Save/Cancel buttons** at bottom

#### 4.2 AI Configuration Assistant
**Priority:** P0 (MVP)

**Description:**
When user updates the natural language description, AI re-analyzes and suggests updated parameters.

**Requirements:**
- Trigger: On save of description field (debounced)
- Show loading spinner
- API call to prompt optimizer Claude instance
- Display suggested changes as diff/comparison
- User can accept or reject suggestions
- Updates search parameters, keywords, sources

---

### 5. Report Generation System

#### 5.1 Two-Stage AI Generation
**Priority:** P0 (MVP)

**Architecture:**
```
User Config → Prompt Optimizer (Claude) → Optimized Prompt → Report Generator (Claude + Web Search) → Structured Report
```

**Stage 1: Prompt Optimizer**
- Input: User's natural language description + previous report feedback (if any)
- Model: Claude Sonnet
- Output: Optimized search strategy with:
  - Refined search queries (3-5 queries)
  - Key topics to focus on
  - Angle/perspective instructions
  - Recommended sources/filters
- Stored for reuse in next generation

**Stage 2: Report Generator**
- Input: Optimized prompt from Stage 1
- Model: Claude Sonnet with web search enabled
- Process:
  1. Execute search queries
  2. Analyze results for relevance and recency
  3. Identify 5-8 key headlines/topics
  4. For each headline:
     - Write engaging title (8-12 words)
     - Generate summary (2-3 sentences)
     - Write detailed article (300-500 words)
     - Suggest image generation prompt
  5. Structure output as JSON
- Output: Structured report JSON

#### 5.2 Image Generation
**Priority:** P0 (MVP)

**Requirements:**
- Use OpenAI's GPT-Image-1 model (image generation model)
- For each headline: generate relevant header image
- Image specs:
  - Size: 1200x630 (social media optimized)
  - Style: Professional, modern, abstract (avoid literal interpretations)
  - Format: PNG or JPEG
- Store images in Google Cloud Storage
- Generate alt text for accessibility
- Fallback: If generation fails, use gradient placeholder with headline text overlay

#### 5.3 Report Storage
**Priority:** P0 (MVP)

**Requirements:**
- Store generated reports in database (PostgreSQL on Neon)
- Each report includes:
  - Report ID (UUID)
  - User ID + Report Config ID
  - Generation timestamp
  - Status (generating, completed, failed)
  - Structured content (JSON):
    - Overall summary (TL;DR)
    - Headlines array (title, summary, article, image_url, image_alt)
    - Metadata (sources count, generation time)
  - Public URL slug (if shared)
- Archive old reports after 90 days (free tier), keep 1 year (paid tier)

#### 5.4 Scheduled Generation
**Priority:** P0 (MVP)

**Requirements:**
- Cron job system (node-cron or cloud scheduler)
- Check every hour for reports due to generate
- Queue generation jobs (BullMQ or similar)
- Process queue with concurrency limit (5 concurrent)
- Retry failed generations (3 attempts, exponential backoff)
- Send email notification on completion
- Log all generation attempts (success, failure, duration)

#### 5.5 Manual Generation
**Priority:** P1 (Post-MVP)

**Requirements:**
- "Generate Now" button on report settings page
- Rate limit: 1 manual generation per report per day (free tier)
- Queue job immediately
- Show progress indicator
- Redirect to report when complete

---

### 6. Report Viewing Experience

#### 6.1 Report Page Layout
**Priority:** P0 (MVP)

**Description:**
ChatGPT Pulse-inspired reading experience.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [Logo] Clipping.AI          [Share] [Menu] │
├─────────────────────────────────────────────┤
│  Report Title: Competitor X Intelligence     │
│  Generated: Nov 4, 2025 at 9:00 AM          │
│                                              │
│  📊 TL;DR Summary (3-4 sentences)           │
│                                              │
├─────────────────────────────────────────────┤
│  Headline 1 Title                            │
│  ┌──────────────────────────────────────┐  │
│  │  [AI Generated Image]                 │  │
│  └──────────────────────────────────────┘  │
│  Brief summary (2-3 sentences)...           │
│  [Read more ↓]                              │
├─────────────────────────────────────────────┤
│  Headline 2 Title                            │
│  ┌──────────────────────────────────────┐  │
│  │  [AI Generated Image]                 │  │
│  └──────────────────────────────────────┘  │
│  Brief summary...                            │
│  [Read more ↓]                              │
└─────────────────────────────────────────────┘
```

**Requirements:**
- Responsive layout (mobile-first)
- Sticky header with share/menu
- TL;DR section at top (collapsible on mobile)
- Headlines displayed as cards
- Click "Read more" expands full article inline (smooth animation)
- Images lazy-load
- Reading progress indicator (scroll-based)
- Beautiful typography (serif for articles, sans for UI)
- Dark mode toggle (P1)

#### 6.2 Expanded Article View
**Priority:** P0 (MVP)

**Requirements:**
- Click headline/image/read-more to expand
- Article content displays inline (no navigation)
- Close/collapse button
- Share individual article button
- Smooth expand/collapse animation
- Keyboard navigation (ESC to close)
- Focus management for accessibility

#### 6.3 Report Header Actions
**Priority:** P0 (MVP)

**Requirements:**
- **Share button:** Opens share modal
- **Menu (three dots):**
  - View previous reports (history dropdown)
  - Edit report settings
  - Download as PDF (P1)
  - Send to email (P1)
  - Subscribe/Unsubscribe

---

### 7. Sharing & Collaboration (MVP)

#### 7.1 Public Report Sharing
**Priority:** P0 (MVP)

**Description:**
Users can share reports via public links.

**Requirements:**
- "Share" button on report page
- Modal with options:
  - **Public Link:** Generate unique URL (report-id-slug)
  - Copy link button
  - QR code (P1)
  - Social share buttons: Twitter, LinkedIn, Email
- Toggle: "Make this report public"
  - Default: private (only owner can view)
  - Public: anyone with link can view
  - Persist setting (can toggle back to private)
- Public reports show:
  - No edit/delete options
  - "Created by Clipping.AI" branding
  - "Create your own report" CTA
  - Comment section (if enabled, P1)
- Analytics: Track views on public reports (P1)

#### 7.2 Individual Headline Sharing
**Priority:** P0 (MVP)

**Requirements:**
- Share icon on each headline card
- Share modal with:
  - Direct link to headline (anchor link)
  - Social share (Twitter, LinkedIn)
  - Copy link button
- Shared link scrolls to and highlights specific headline
- Meta tags for social previews (title, description, image)

#### 7.3 Multi-Recipient Email Delivery
**Priority:** P0 (MVP)

**Description:**
Send reports to multiple email addresses.

**Requirements:**
- Configure in report settings (see 4.1D)
- Free tier: up to 5 additional recipients per report
- Paid tier: up to 50 recipients (P1)
- Each recipient receives same email format
- Unsubscribe link is recipient-specific
- Track opens/clicks per recipient (optional, P1)
- Validation: block spam domains, verify format

#### 7.4 Email Unsubscribe
**Priority:** P0 (MVP)

**Requirements:**
- Unsubscribe link in every email footer
- Link contains token (report_id + recipient_email)
- Unsubscribe page:
  - Confirm: "You've been unsubscribed from [Report Name]"
  - Option: "Resubscribe" button
  - If owner: redirect to report settings instead
- Update recipient list in database
- Compliance: Required for email deliverability

---

### 8. Email System

#### 8.1 Report Delivery Email
**Priority:** P0 (MVP)

**Template:**
```
Subject: [Report Title] - [Date]

┌─────────────────────────────────────────┐
│  CLIPPING.AI                             │
├─────────────────────────────────────────┤
│  [Report Title]                          │
│  Generated on [Date]                     │
│                                          │
│  📊 Quick Summary                        │
│  [2-3 sentence TL;DR]                   │
│                                          │
│  Top Headlines:                          │
│  • [Headline 1]                         │
│  • [Headline 2]                         │
│  • [Headline 3]                         │
│                                          │
│  [Read Full Report Button]              │
│                                          │
│  ────────────────────────────────────   │
│  Unsubscribe | Report Settings          │
└─────────────────────────────────────────┘
```

**Requirements:**
- HTML + plain text versions
- Responsive email design (mobile-friendly)
- Inline CSS (email client compatibility)
- CTA button prominent and clickable
- Unique tracking pixel per email (optional, P1)
- Personalization: Use recipient's name if available
- Branding: Logo, colors consistent
- Footer: Unsubscribe, settings, company info

#### 8.2 Transactional Emails
**Priority:** P0 (MVP)

**Types:**
1. **Welcome Email:** After signup
   - Verify email CTA
   - Getting started tips
   - Link to create first report
2. **Email Verification:** Verify email link
3. **Password Reset:** Reset link (expires 1h)
4. **Report Generated:** Notification when first report ready
5. **Report Failed:** If generation fails, notify user

**Requirements:**
- Use Resend API
- Track delivery status
- Retry failed sends (3 attempts)
- Log all emails sent

#### 8.3 Email Deliverability
**Priority:** P0 (MVP)

**Requirements:**
- Configure SPF, DKIM, DMARC records
- Use Resend's authenticated domain
- Avoid spam trigger words
- Include unsubscribe link (CAN-SPAM compliance)
- Monitor bounce/complaint rates
- Warm up sending domain gradually (start slow, increase volume)

---

### 9. Comments System (Post-MVP)

#### 9.1 Report Comments
**Priority:** P1 (Post-MVP)

**Requirements:**
- Comment section below report
- Only visible on public reports
- Authenticated users: show name + avatar
- Anonymous users: can comment if report is public
  - Require name + email (not displayed publicly)
  - Moderate before showing (flag for review)
- Comment input: textarea, 500 char limit
- Display: threaded comments (1 level deep)
- Timestamp, user name
- Edit/delete own comments (if authenticated)
- Report owner can delete any comment
- No real-time updates (refresh to see new)

#### 9.2 Headline Comments
**Priority:** P1 (Post-MVP)

**Requirements:**
- Each headline can have separate comments
- Same rules as report comments
- Accessed via "Comments" link on headline card
- Count badge showing number of comments

#### 9.3 Comment Moderation
**Priority:** P1 (Post-MVP)

**Requirements:**
- Report owner receives email when new comment posted
- Spam detection (basic keyword filter)
- Flag/report comment button (abuse)
- Admin dashboard to review flagged comments (future)

---

### 10. Free Tier Limitations

**Priority:** P0 (MVP)

**Free Tier Includes:**
- 2 active reports maximum
- Weekly frequency minimum (no daily)
- Up to 5 additional email recipients per report
- 30-day report history
- Public sharing enabled
- Basic support (email only)

**Paid Tier Unlocks (P1):**
- Unlimited reports
- Daily frequency
- Up to 50 recipients per report
- 1-year report history
- PDF export
- Priority support
- API access (future)
- Custom branding (future)

**Enforcement:**
- Check limits before creating new report
- Show upgrade prompt when limit reached
- Block creation until user upgrades or deletes existing report
- Grace period: Allow existing reports to continue if user downgrades

---

## User Flows

### Flow 1: First-Time User → First Report

```
1. User lands on homepage
2. Reads value prop
3. Clicks "Try it free"
4. Enters email
5. Describes what to track: "Track competitor Acme Corp's product updates"
6. AI suggests:
   - Title: "Acme Corp Product Intelligence"
   - Keywords: Acme Corp, product launch, updates, features
   - Frequency: Weekly (Mondays at 9am)
7. User reviews, clicks "Looks good"
8. Prompted to create account (email prefilled)
9. Enters password, clicks "Create Account & Generate Report"
10. Loading screen: "Generating your first report..."
11. Success screen: "Report ready! Check your email."
12. Receives email with TL;DR + link
13. Clicks link → reads full report
14. Impressed, shares on LinkedIn
```

### Flow 2: Existing User → Create Second Report

```
1. User logs in
2. Dashboard shows existing report card
3. Clicks "+ New Report"
4. Modal opens
5. Describes: "Monitor AI regulation news in California"
6. AI suggests config
7. User edits frequency to Daily at 7am
8. Adds boss's email as recipient
9. Clicks "Create Report"
10. First report generates immediately
11. Receives confirmation
12. Dashboard now shows 2 report cards (2/2 used for free tier)
```

### Flow 3: User → Share Report Publicly

```
1. User opens latest report
2. Clicks "Share" button in header
3. Modal opens
4. Toggles "Make this report public"
5. Public URL generated: clipping.ai/r/acme-product-intel-a8f3
6. Clicks "Copy Link"
7. Pastes in Slack channel for team
8. Team members click link
9. See full report (no login required)
10. CTA at bottom: "Create your own report"
```

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Next.js Frontend (App Router)                      │    │
│  │  - Landing Page                                      │    │
│  │  - Dashboard                                         │    │
│  │  - Report Viewer                                     │    │
│  │  - Settings                                          │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/REST API
┌───────────────────────▼─────────────────────────────────────┐
│                  API Gateway (Express.js)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Auth      │  │   Reports    │  │   Generation    │   │
│  │   Service   │  │   Service    │  │   Service       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└───────┬────────────────┬────────────────────┬───────────────┘
        │                │                    │
        │                │                    │
┌───────▼────────┐  ┌────▼──────┐  ┌─────────▼─────────────┐
│   PostgreSQL   │  │   Redis   │  │   Job Queue (BullMQ)  │
│   (Neon)       │  │   Cache   │  │   - Generation Jobs   │
└────────────────┘  └───────────┘  │   - Email Jobs        │
                                    └───────────┬───────────┘
                                                │
                    ┌───────────────────────────▼───────────────┐
                    │        AI Generation Workers              │
                    │  ┌─────────────────────────────────────┐ │
                    │  │  Worker 1: Prompt Optimizer         │ │
                    │  │  (Claude Sonnet API)                │ │
                    │  └─────────────────────────────────────┘ │
                    │  ┌─────────────────────────────────────┐ │
                    │  │  Worker 2: Report Generator         │ │
                    │  │  (Claude Sonnet + Web Search)       │ │
                    │  └─────────────────────────────────────┘ │
                    │  ┌─────────────────────────────────────┐ │
                    │  │  Worker 3: Image Generator          │ │
                    │  │  (OpenAI GPT-Image-1)               │ │
                    │  └─────────────────────────────────────┘ │
                    └──────────────────┬────────────────────────┘
                                       │
                    ┌──────────────────▼────────────────────────┐
                    │        External Services                   │
                    │  - Resend (Email Delivery)                │
                    │  - Google Cloud Storage (Images)          │
                    │  - Anthropic API (Claude)                 │
                    │  - OpenAI API (Image Gen)                 │
                    └────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context + Server Components (minimize client state)
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Native fetch with Next.js Server Actions where possible
- **Email Rendering:** React Email for email templates

#### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js (TypeScript)
- **API Style:** RESTful
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** Zod schemas
- **Job Queue:** BullMQ (Redis-backed)
- **Scheduling:** node-cron or Google Cloud Scheduler
- **File Upload:** Multer (if needed)

#### Database
- **Primary Database:** PostgreSQL 15+ (hosted on Neon)
- **Cache:** Redis 7+
- **ORM:** Prisma ORM
- **Migrations:** Prisma Migrate

#### External Services
- **Email:** Resend API
- **AI - Claude:** Anthropic API (Claude Sonnet)
- **AI - Images:** OpenAI API (GPT-Image-1 or DALL-E 3)
- **Storage:** Google Cloud Storage (for images)
- **Monitoring:** Google Cloud Logging + Error Reporting

#### DevOps & Deployment
- **Containerization:** Docker + Docker Compose
- **Orchestration:** Google Cloud Run (serverless containers)
- **CI/CD:** GitHub Actions
- **Infrastructure:** Google Cloud Platform
  - Cloud Run (API + Workers)
  - Cloud SQL (managed PostgreSQL, or connect to Neon)
  - Cloud Storage (images)
  - Cloud Scheduler (cron jobs)
  - Cloud Load Balancing
- **Local Development:** Docker Compose (or OrbStack if preferred)
- **Database Management:** Neon CLI for migrations
- **Secrets Management:** Google Secret Manager

#### Development Tools
- **Monorepo:** Turborepo (optional) or simple npm workspaces
- **Linting:** ESLint
- **Formatting:** Prettier
- **Testing:**
  - Unit: Vitest
  - Integration: Supertest
  - E2E: Playwright (P1)
- **API Documentation:** OpenAPI/Swagger (P1)

---

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active' -- active, cancelled, suspended
);

CREATE INDEX idx_users_email ON users(email);
```

#### email_verifications
```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
```

#### password_resets
```sql
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
```

#### report_configs
```sql
CREATE TABLE report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL, -- natural language input
  status VARCHAR(50) DEFAULT 'active', -- active, paused, deleted

  -- AI-optimized parameters (JSON)
  search_parameters JSONB NOT NULL,
  -- Example: {
  --   "keywords": ["acme corp", "product launch"],
  --   "sources": ["techcrunch.com", "theverge.com"],
  --   "date_range": "7d",
  --   "search_queries": ["acme corp product updates", "acme new features"]
  -- }

  -- Schedule
  frequency VARCHAR(50) NOT NULL, -- daily, weekly, biweekly, monthly
  schedule_day VARCHAR(20), -- monday, tuesday, etc. (for weekly+)
  schedule_time TIME NOT NULL, -- e.g., 09:00:00
  next_generation_at TIMESTAMP,
  last_generation_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_report_configs_user ON report_configs(user_id);
CREATE INDEX idx_report_configs_next_gen ON report_configs(next_generation_at) WHERE status = 'active';
```

#### report_recipients
```sql
CREATE TABLE report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configs(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, unsubscribed
  unsubscribe_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,

  UNIQUE(report_config_id, email)
);

CREATE INDEX idx_report_recipients_config ON report_recipients(report_config_id);
CREATE INDEX idx_report_recipients_token ON report_recipients(unsubscribe_token);
```

#### generated_reports
```sql
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed

  -- Content (JSON)
  content JSONB,
  -- Example: {
  --   "summary": "This week, Acme Corp announced...",
  --   "headlines": [
  --     {
  --       "title": "Acme Launches AI-Powered Widget",
  --       "summary": "Brief summary...",
  --       "article": "Full article text...",
  --       "image_url": "https://storage.googleapis.com/...",
  --       "image_alt": "Abstract representation of AI technology",
  --       "sources": ["url1", "url2"]
  --     }
  --   ]
  -- }

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  public_slug VARCHAR(255) UNIQUE, -- URL-friendly slug
  view_count INTEGER DEFAULT 0,

  -- Metadata
  generation_started_at TIMESTAMP DEFAULT NOW(),
  generation_completed_at TIMESTAMP,
  generation_duration_ms INTEGER, -- tracking performance
  error_message TEXT, -- if failed

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_generated_reports_config ON generated_reports(report_config_id);
CREATE INDEX idx_generated_reports_user ON generated_reports(user_id);
CREATE INDEX idx_generated_reports_slug ON generated_reports(public_slug) WHERE is_public = TRUE;
CREATE INDEX idx_generated_reports_created ON generated_reports(created_at DESC);
```

#### generation_jobs
```sql
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configs(id) ON DELETE CASCADE,
  generated_report_id UUID REFERENCES generated_reports(id) ON DELETE SET NULL,

  status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
  job_type VARCHAR(50) NOT NULL, -- scheduled, manual

  -- Job queue metadata
  queue_id VARCHAR(255), -- BullMQ job ID
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_config ON generation_jobs(report_config_id);
```

#### email_logs
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_report_id UUID REFERENCES generated_reports(id) ON DELETE SET NULL,

  email_type VARCHAR(50) NOT NULL, -- report_delivery, verification, password_reset, etc.
  recipient_email VARCHAR(255) NOT NULL,

  status VARCHAR(50) DEFAULT 'queued', -- queued, sent, failed, bounced

  -- Resend metadata
  resend_id VARCHAR(255), -- Resend's email ID for tracking

  sent_at TIMESTAMP,
  opened_at TIMESTAMP, -- if tracking enabled
  clicked_at TIMESTAMP, -- if tracking enabled

  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_report ON email_logs(generated_report_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

#### comments (P1)
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
  headline_index INTEGER, -- null for report-level comments, 0-N for headline comments

  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null if anonymous
  author_name VARCHAR(255) NOT NULL, -- display name
  author_email VARCHAR(255), -- for anonymous users (not displayed)

  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, deleted

  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- for threading (1 level)

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_report ON comments(generated_report_id);
CREATE INDEX idx_comments_status ON comments(status);
```

#### sessions (optional, can use JWT stateless)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
```

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SubscriptionTier {
  free
  pro
  enterprise
}

enum SubscriptionStatus {
  active
  cancelled
  suspended
}

model User {
  id                 String             @id @default(uuid())
  email              String             @unique
  passwordHash       String             @map("password_hash")
  name               String?
  timezone           String             @default("America/Los_Angeles")
  emailVerified      Boolean            @default(false) @map("email_verified")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")
  subscriptionTier   SubscriptionTier   @default(free) @map("subscription_tier")
  subscriptionStatus SubscriptionStatus @default(active) @map("subscription_status")

  reportConfigs     ReportConfig[]
  generatedReports  GeneratedReport[]
  emailVerifications EmailVerification[]
  passwordResets    PasswordReset[]
  sessions          Session[]
  emailLogs         EmailLog[]
  comments          Comment[]

  @@map("users")
}

model EmailVerification {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  token      String    @unique
  expiresAt  DateTime  @map("expires_at")
  verifiedAt DateTime? @map("verified_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("email_verifications")
}

model PasswordReset {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  token     String    @unique
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_resets")
}

enum ReportStatus {
  active
  paused
  deleted
}

enum Frequency {
  daily
  weekly
  biweekly
  monthly
}

model ReportConfig {
  id                String      @id @default(uuid())
  userId            String      @map("user_id")
  title             String
  description       String
  status            ReportStatus @default(active)
  searchParameters  Json        @map("search_parameters")
  frequency         Frequency
  scheduleDay       String?     @map("schedule_day")
  scheduleTime      String      @map("schedule_time")
  nextGenerationAt  DateTime?   @map("next_generation_at")
  lastGenerationAt  DateTime?   @map("last_generation_at")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipients       ReportRecipient[]
  generatedReports GeneratedReport[]
  generationJobs   GenerationJob[]

  @@index([userId])
  @@index([nextGenerationAt])
  @@map("report_configs")
}

enum RecipientStatus {
  active
  unsubscribed
}

model ReportRecipient {
  id                String          @id @default(uuid())
  reportConfigId    String          @map("report_config_id")
  email             String
  status            RecipientStatus @default(active)
  unsubscribeToken  String?         @unique @map("unsubscribe_token")
  createdAt         DateTime        @default(now()) @map("created_at")
  unsubscribedAt    DateTime?       @map("unsubscribed_at")

  reportConfig ReportConfig @relation(fields: [reportConfigId], references: [id], onDelete: Cascade)

  @@unique([reportConfigId, email])
  @@index([reportConfigId])
  @@map("report_recipients")
}

enum GeneratedReportStatus {
  generating
  completed
  failed
}

model GeneratedReport {
  id                      String                @id @default(uuid())
  reportConfigId          String                @map("report_config_id")
  userId                  String                @map("user_id")
  status                  GeneratedReportStatus @default(generating)
  content                 Json?
  isPublic                Boolean               @default(false) @map("is_public")
  publicSlug              String?               @unique @map("public_slug")
  viewCount               Int                   @default(0) @map("view_count")
  generationStartedAt     DateTime              @default(now()) @map("generation_started_at")
  generationCompletedAt   DateTime?             @map("generation_completed_at")
  generationDurationMs    Int?                  @map("generation_duration_ms")
  errorMessage            String?               @map("error_message")
  createdAt               DateTime              @default(now()) @map("created_at")

  reportConfig   ReportConfig    @relation(fields: [reportConfigId], references: [id], onDelete: Cascade)
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  generationJobs GenerationJob[]
  emailLogs      EmailLog[]
  comments       Comment[]

  @@index([reportConfigId])
  @@index([userId])
  @@index([publicSlug])
  @@index([createdAt(sort: Desc)])
  @@map("generated_reports")
}

enum JobStatus {
  queued
  processing
  completed
  failed
}

enum JobType {
  scheduled
  manual
}

model GenerationJob {
  id                 String    @id @default(uuid())
  reportConfigId     String    @map("report_config_id")
  generatedReportId  String?   @map("generated_report_id")
  status             JobStatus @default(queued)
  jobType            JobType   @map("job_type")
  queueId            String?   @map("queue_id")
  attempts           Int       @default(0)
  maxAttempts        Int       @default(3) @map("max_attempts")
  startedAt          DateTime? @map("started_at")
  completedAt        DateTime? @map("completed_at")
  errorMessage       String?   @map("error_message")
  createdAt          DateTime  @default(now()) @map("created_at")

  reportConfig    ReportConfig     @relation(fields: [reportConfigId], references: [id], onDelete: Cascade)
  generatedReport GeneratedReport? @relation(fields: [generatedReportId], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([reportConfigId])
  @@map("generation_jobs")
}

enum EmailStatus {
  queued
  sent
  failed
  bounced
}

model EmailLog {
  id                 String       @id @default(uuid())
  userId             String?      @map("user_id")
  generatedReportId  String?      @map("generated_report_id")
  emailType          String       @map("email_type")
  recipientEmail     String       @map("recipient_email")
  status             EmailStatus  @default(queued)
  resendId           String?      @map("resend_id")
  sentAt             DateTime?    @map("sent_at")
  openedAt           DateTime?    @map("opened_at")
  clickedAt          DateTime?    @map("clicked_at")
  errorMessage       String?      @map("error_message")
  createdAt          DateTime     @default(now()) @map("created_at")

  user            User?            @relation(fields: [userId], references: [id], onDelete: SetNull)
  generatedReport GeneratedReport? @relation(fields: [generatedReportId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([generatedReportId])
  @@index([status])
  @@map("email_logs")
}

enum CommentStatus {
  pending
  approved
  rejected
  deleted
}

model Comment {
  id                 String        @id @default(uuid())
  generatedReportId  String        @map("generated_report_id")
  headlineIndex      Int?          @map("headline_index")
  userId             String?       @map("user_id")
  authorName         String        @map("author_name")
  authorEmail        String?       @map("author_email")
  content            String
  status             CommentStatus @default(pending)
  parentCommentId    String?       @map("parent_comment_id")
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")

  generatedReport GeneratedReport @relation(fields: [generatedReportId], references: [id], onDelete: Cascade)
  user            User?           @relation(fields: [userId], references: [id], onDelete: SetNull)
  parentComment   Comment?        @relation("CommentReplies", fields: [parentCommentId], references: [id], onDelete: Cascade)
  replies         Comment[]       @relation("CommentReplies")

  @@index([generatedReportId])
  @@index([status])
  @@map("comments")
}

model Session {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  token          String   @unique
  refreshToken   String?  @unique @map("refresh_token")
  expiresAt      DateTime @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")
  lastActivityAt DateTime @default(now()) @map("last_activity_at")
  ipAddress      String?  @map("ip_address")
  userAgent      String?  @map("user_agent")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}
```

---

## API Specifications

### Base URL
- **Development:** `http://localhost:3001/api`
- **Production:** `https://api.clipping.ai/api`

### Authentication
- JWT Bearer token in Authorization header
- Format: `Authorization: Bearer <token>`

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Or on error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { ... }
  }
}
```

### Endpoints

#### Authentication

**POST /api/auth/signup**
- **Description:** Create new user account
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "emailVerified": false
      },
      "token": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
  ```

**POST /api/auth/login**
- **Description:** Login user
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
  ```
- **Response:** Same as signup

**POST /api/auth/logout**
- **Description:** Logout (invalidate token)
- **Auth:** Required
- **Response:** `{ "success": true }`

**POST /api/auth/forgot-password**
- **Description:** Request password reset
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:** `{ "success": true, "message": "Reset email sent" }`

**POST /api/auth/reset-password**
- **Description:** Reset password with token
- **Auth:** None
- **Body:**
  ```json
  {
    "token": "reset-token",
    "newPassword": "NewSecurePass123!"
  }
  ```
- **Response:** `{ "success": true }`

**POST /api/auth/verify-email**
- **Description:** Verify email with token
- **Auth:** None
- **Body:**
  ```json
  {
    "token": "verification-token"
  }
  ```
- **Response:** `{ "success": true }`

**POST /api/auth/resend-verification**
- **Description:** Resend verification email
- **Auth:** Required
- **Response:** `{ "success": true }`

#### Report Configs

**GET /api/reports**
- **Description:** Get all report configs for user
- **Auth:** Required
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "reports": [
        {
          "id": "uuid",
          "title": "Competitor X Intelligence",
          "description": "Track competitor X product updates",
          "status": "active",
          "frequency": "weekly",
          "scheduleDay": "monday",
          "scheduleTime": "09:00:00",
          "nextGenerationAt": "2025-11-11T09:00:00Z",
          "lastGenerationAt": "2025-11-04T09:00:00Z",
          "recipientCount": 3,
          "generatedReportCount": 5
        }
      ],
      "limits": {
        "maxReports": 2,
        "currentReports": 1
      }
    }
  }
  ```

**POST /api/reports**
- **Description:** Create new report config
- **Auth:** Required
- **Body:**
  ```json
  {
    "description": "Track Acme Corp product updates and pricing changes",
    "frequency": "weekly",
    "scheduleDay": "monday",
    "scheduleTime": "09:00",
    "recipients": ["team@example.com"]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "report": {
        "id": "uuid",
        "title": "Acme Corp Product Intelligence",
        "searchParameters": {
          "keywords": ["acme corp", "product launch", "pricing"],
          "searchQueries": ["acme corp new products", "acme pricing updates"]
        },
        "...": "..."
      },
      "generationJobId": "uuid"
    }
  }
  ```

**GET /api/reports/:id**
- **Description:** Get single report config
- **Auth:** Required
- **Response:** Single report object

**PATCH /api/reports/:id**
- **Description:** Update report config
- **Auth:** Required
- **Body:** Partial report fields
- **Response:** Updated report object

**DELETE /api/reports/:id**
- **Description:** Delete report config
- **Auth:** Required
- **Response:** `{ "success": true }`

**POST /api/reports/:id/recipients**
- **Description:** Add recipient to report
- **Auth:** Required
- **Body:**
  ```json
  {
    "email": "newrecipient@example.com"
  }
  ```
- **Response:** `{ "success": true, "data": { "recipient": {...} } }`

**DELETE /api/reports/:id/recipients/:recipientId**
- **Description:** Remove recipient
- **Auth:** Required
- **Response:** `{ "success": true }`

**POST /api/reports/:id/generate**
- **Description:** Manually trigger report generation (P1)
- **Auth:** Required
- **Response:** `{ "success": true, "data": { "jobId": "uuid" } }`

#### Generated Reports

**GET /api/reports/:configId/generated**
- **Description:** Get generated reports for a config
- **Auth:** Required
- **Query Params:**
  - `limit` (default: 10)
  - `offset` (default: 0)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "reports": [
        {
          "id": "uuid",
          "status": "completed",
          "createdAt": "2025-11-04T09:05:00Z",
          "isPublic": false,
          "publicSlug": null,
          "viewCount": 0,
          "headlineCount": 6
        }
      ],
      "total": 15
    }
  }
  ```

**GET /api/generated/:id**
- **Description:** Get single generated report (full content)
- **Auth:** Required (or public if isPublic)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "reportConfig": {
        "title": "Competitor X Intelligence"
      },
      "status": "completed",
      "content": {
        "summary": "This week, Competitor X announced...",
        "headlines": [
          {
            "title": "Competitor X Launches AI Widget",
            "summary": "Brief 2-3 sentence summary...",
            "article": "Full article content...",
            "imageUrl": "https://storage.googleapis.com/...",
            "imageAlt": "Abstract AI representation",
            "sources": ["url1", "url2"]
          }
        ]
      },
      "createdAt": "2025-11-04T09:05:00Z",
      "isPublic": true,
      "publicSlug": "competitor-x-intel-nov-4",
      "viewCount": 42
    }
  }
  ```

**GET /api/r/:slug**
- **Description:** Get report by public slug (no auth)
- **Auth:** None
- **Response:** Same as above

**PATCH /api/generated/:id/share**
- **Description:** Toggle public sharing
- **Auth:** Required (must be owner)
- **Body:**
  ```json
  {
    "isPublic": true
  }
  ```
- **Response:** Updated report object with publicSlug

#### AI Configuration

**POST /api/ai/optimize-prompt**
- **Description:** Optimize user description into search parameters (internal use)
- **Auth:** Required
- **Body:**
  ```json
  {
    "description": "Track competitor X product launches"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "title": "Competitor X Product Intelligence",
      "searchParameters": {
        "keywords": ["competitor x", "product launch", "new features"],
        "searchQueries": ["competitor x product updates", "competitor x launches"],
        "sources": [],
        "dateRange": "7d"
      }
    }
  }
  ```

#### User

**GET /api/user/me**
- **Description:** Get current user profile
- **Auth:** Required
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "emailVerified": true,
        "subscriptionTier": "free",
        "subscriptionStatus": "active",
        "createdAt": "2025-10-01T00:00:00Z"
      }
    }
  }
  ```

**PATCH /api/user/me**
- **Description:** Update user profile
- **Auth:** Required
- **Body:** `{ "name": "New Name", "timezone": "America/New_York" }`
- **Response:** Updated user object

**DELETE /api/user/me**
- **Description:** Delete account
- **Auth:** Required
- **Response:** `{ "success": true }`

#### Unsubscribe

**GET /api/unsubscribe/:token**
- **Description:** Unsubscribe from report emails
- **Auth:** None
- **Response:** `{ "success": true, "message": "Unsubscribed successfully" }`

**POST /api/unsubscribe/:token/resubscribe**
- **Description:** Resubscribe
- **Auth:** None
- **Response:** `{ "success": true }`

---

## UI/UX Requirements

### Design System

**Color Palette:**
- Primary: Blue (#0066FF)
- Secondary: Purple (#7C3AED)
- Success: Green (#10B981)
- Error: Red (#EF4444)
- Warning: Amber (#F59E0B)
- Neutral: Gray scale (#F9FAFB to #111827)

**Typography:**
- Headings: Inter (sans-serif)
- Body: Inter (sans-serif)
- Articles: Georgia or Lora (serif, for readability)
- Code/Mono: Fira Code

**Spacing:** Tailwind's default scale (4px base)

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Component Requirements

#### Landing Page
- **Hero Section:**
  - Large headline (H1, 48px desktop, 32px mobile)
  - Subheadline (20px, muted)
  - Email input + CTA button (prominent, large)
  - Visual: Animated mockup or screenshot of report
- **Features Section:**
  - 3-column grid (1 column on mobile)
  - Icon + headline + description per feature
- **How It Works:**
  - 3-step process with visuals
  - Clear, concise copy
- **Pricing:**
  - Free tier highlighted
  - Simple comparison table (2 tiers)
- **Footer:**
  - Links: About, Privacy, Terms, Contact
  - Social icons (optional)

#### Dashboard
- **Layout:**
  - Sidebar navigation (P1, for now just header)
  - Main content area
  - Mobile: Bottom nav or hamburger menu
- **Report Cards:**
  - Thumbnail image (16:9 ratio, 300x169)
  - Title (bold, 18px)
  - Metadata (frequency, last gen time)
  - Hover: Subtle shadow lift
  - Actions: Icons for view, edit, delete
- **Empty State:**
  - Illustration
  - "Create your first report" CTA
  - Example prompt

#### Report Configuration Wizard
- **Multi-step form:**
  - Progress indicator (step 1 of 3)
  - Large text input for description
  - AI suggestions displayed as cards (can edit)
  - Schedule picker (dropdowns)
  - Recipient chips (add/remove)
- **Mobile:**
  - Full-screen modal
  - Larger touch targets
  - Sticky CTA button at bottom

#### Report Viewer
- **Layout:**
  - Sticky header (logo, share, menu)
  - Full-width content area
  - Max-width 800px for readability (desktop)
  - Mobile: Full width
- **TL;DR Section:**
  - Boxed/card style
  - Icon (lightbulb or summary icon)
  - 16px body text
- **Headline Cards:**
  - Image above, full width
  - Title (24px bold)
  - Summary (16px, gray)
  - "Read more" link (blue, underlined on hover)
- **Expanded Article:**
  - Smooth expand animation (200ms)
  - Serif font for body
  - Larger text (18px)
  - Ample line-height (1.7)
  - Sources linked at bottom
  - Close button (sticky at top-right of article)
- **Share Modal:**
  - Center modal (mobile: bottom sheet)
  - Copy link button (icon + text)
  - Social buttons (icons)
  - Toggle for public/private

#### Email Template
- **Design:**
  - Mobile-first (single column)
  - Max-width 600px
  - Header: Logo + branding color
  - Body: White background
  - CTA button: High contrast, large (44px min height)
  - Footer: Gray background, small text
- **Typography:**
  - Email-safe fonts: Arial, Helvetica, sans-serif
  - Inline styles (no external CSS)

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Color contrast: 4.5:1 minimum
- Keyboard navigation support
- Focus indicators visible
- ARIA labels on interactive elements
- Alt text on all images
- Semantic HTML (headings, nav, main, etc.)
- Screen reader tested (NVDA or VoiceOver)

### Mobile-Specific Requirements
- Touch targets: 44x44px minimum
- Swipe gestures: Swipe headline cards to access actions (P1)
- Bottom sheet modals for actions
- Sticky CTAs on long pages
- Optimized images (responsive, lazy-load)
- Fast load times (< 3s on 3G)

---

## Security & Privacy

### Authentication Security
- **Password Policy:**
  - Minimum 8 characters
  - At least 1 number and 1 special character
  - Bcrypt hashing with 12 rounds
  - No password hints/recovery questions
- **JWT:**
  - Short expiry (7 days for access token)
  - Refresh tokens with 30-day expiry
  - Signed with strong secret (256-bit)
  - Include user ID and email in payload
  - Validate on every protected route
- **Rate Limiting:**
  - Login: 10 attempts per hour per IP
  - Signup: 5 attempts per hour per IP
  - Password reset: 3 requests per hour per email
  - API endpoints: 100 req/min per user (adjust as needed)
- **Session Management:**
  - Invalidate all sessions on password change
  - Optional: Multi-device session management (P1)

### Data Protection
- **Encryption:**
  - HTTPS only (TLS 1.3)
  - Database: Encryption at rest (Neon handles this)
  - Secrets: Google Secret Manager
- **PII Handling:**
  - Minimize collection (only email, name, password)
  - No credit cards stored (use Stripe if monetizing)
  - User can delete account (hard delete or anonymize)
- **Email Privacy:**
  - Recipient emails not exposed publicly
  - Unsubscribe tokens are unique per recipient
  - No sharing of email lists

### API Security
- **Input Validation:**
  - Zod schemas on all inputs
  - Sanitize HTML/SQL (use ORM, parameterized queries)
  - File upload validation (if applicable)
- **CORS:**
  - Whitelist frontend domains only
  - No wildcard origins in production
- **Helmet.js:** Enable security headers
- **SQL Injection:** Use Prisma ORM (parameterized queries)
- **XSS Protection:**
  - Escape user content in emails and web
  - CSP headers

### Compliance
- **GDPR (if EU users):**
  - Privacy policy page
  - Cookie consent (if using analytics)
  - Right to deletion (account deletion)
  - Data export (P1)
- **CAN-SPAM:**
  - Unsubscribe link in all emails
  - Physical address in footer (P1)
  - Honor unsubscribe within 10 days
- **CCPA (if California users):**
  - Privacy policy disclosure
  - Opt-out of data selling (we don't sell, but clarify)

### Monitoring
- **Error Logging:**
  - Google Cloud Logging
  - Sanitize logs (no passwords, tokens)
- **Anomaly Detection:**
  - Alert on unusual activity (100+ failed logins)
  - Monitor API usage spikes
- **Security Audits:**
  - Periodic dependency updates (npm audit)
  - Code review for security issues

---

## Performance Requirements

### Latency Targets
- **Landing Page:** < 2s LCP (Largest Contentful Paint)
- **Dashboard:** < 1s to interactive
- **Report Viewer:** < 1.5s LCP
- **API Response Time:**
  - Auth endpoints: < 500ms
  - Report list: < 300ms
  - Generated report: < 500ms (excluding content size)

### Throughput
- **Concurrent Users:** Support 1,000 concurrent users (initial)
- **Report Generation:** 5 concurrent jobs (scale horizontally as needed)
- **Email Sending:** 100 emails/minute (Resend limits apply)

### Database Performance
- **Queries:** < 100ms for most queries
- **Indexes:** On frequently queried fields (user_id, report_config_id, etc.)
- **Connection Pooling:** Max 20 connections (Neon free tier limit)

### Caching Strategy
- **Redis Cache:**
  - User sessions (7-day TTL)
  - Report configurations (5-min TTL, invalidate on update)
  - Generated report content (1-hour TTL for public reports)
- **CDN (P1):**
  - Serve images from Google Cloud Storage with CDN
  - Cache static assets (Next.js images, CSS, JS)

### Optimization
- **Frontend:**
  - Code splitting (Next.js automatic)
  - Lazy load images (native loading="lazy")
  - Prefetch critical routes
  - Minimize bundle size (< 200KB initial JS)
- **Backend:**
  - Database query optimization (EXPLAIN queries)
  - Avoid N+1 queries (use Prisma's includes)
  - Gzip compression on API responses
- **Images:**
  - WebP format (fallback to JPEG)
  - Responsive images (Next.js Image component)
  - Max size: 200KB per image

### Scalability
- **Horizontal Scaling:**
  - Stateless API (multiple instances behind load balancer)
  - Job queue workers scale independently
- **Database:**
  - Start with Neon free tier
  - Upgrade to paid tier as usage grows
  - Consider read replicas (P1)
- **Storage:**
  - Google Cloud Storage (virtually unlimited)

---

## Deployment Architecture

### Infrastructure (Google Cloud Platform)

**Services Used:**
1. **Google Cloud Run:**
   - Deploy Next.js frontend (serverless container)
   - Deploy Express API (serverless container)
   - Deploy job workers (serverless container)
   - Auto-scaling based on requests
   - Pay-per-use pricing

2. **Neon PostgreSQL:**
   - Hosted PostgreSQL database
   - Serverless, auto-scaling
   - Use Neon CLI for migrations

3. **Google Cloud Storage:**
   - Store AI-generated images
   - Public bucket with signed URLs or public read
   - CDN-enabled

4. **Google Cloud Scheduler:**
   - Trigger cron jobs for report generation checks
   - Calls API endpoint: `POST /api/cron/check-scheduled-reports`

5. **Redis (Cloud Memorystore or Upstash):**
   - Session caching
   - Job queue (BullMQ)
   - Rate limiting

6. **Google Cloud Load Balancing:**
   - HTTPS load balancer
   - SSL/TLS termination
   - Route to Cloud Run services

7. **Google Secret Manager:**
   - Store secrets (DB URL, API keys, JWT secret)

8. **Google Cloud Logging & Monitoring:**
   - Application logs
   - Error tracking
   - Performance monitoring

### Deployment Architecture Diagram

```
                      ┌─────────────────┐
                      │   CloudFlare    │ (Optional CDN)
                      │   DNS + CDN     │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │  Google Cloud   │
                      │  Load Balancer  │
                      └────────┬────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
       ┌────────▼────────┐         ┌─────────▼────────┐
       │   Cloud Run     │         │   Cloud Run      │
       │   (Frontend)    │         │   (API)          │
       │   Next.js       │◄────────┤   Express.js     │
       └─────────────────┘         └─────────┬────────┘
                                             │
                            ┌────────────────┼────────────────┐
                            │                │                │
                   ┌────────▼────────┐  ┌────▼─────┐  ┌──────▼──────┐
                   │   Cloud Run     │  │  Neon    │  │   Redis     │
                   │   (Workers)     │  │  Postgres│  │  (Upstash)  │
                   │   BullMQ Jobs   │  └──────────┘  └─────────────┘
                   └────────┬────────┘
                            │
                   ┌────────▼────────────────────────┐
                   │  External APIs                  │
                   │  - Anthropic (Claude)           │
                   │  - OpenAI (Image Gen)           │
                   │  - Resend (Email)               │
                   └─────────────────────────────────┘

          ┌────────▼─────────┐
          │  Cloud Storage   │
          │  (Images)        │
          └──────────────────┘
```

### Docker Setup

**Repository Structure:**
```
clippingai/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Express.js backend
│   └── workers/          # Job workers
├── packages/
│   ├── database/         # Prisma schema & migrations
│   ├── shared/           # Shared types, utils
│   └── email-templates/  # React Email templates
├── docker-compose.yml    # Local development
├── Dockerfile.web        # Frontend container
├── Dockerfile.api        # Backend container
├── Dockerfile.workers    # Worker container
└── .env.example
```

**docker-compose.yml (Local Development):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: clippingai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clippingai
    volumes:
      - ./apps/web:/app/apps/web
      - /app/apps/web/node_modules
      - /app/node_modules
    depends_on:
      - postgres
      - api

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clippingai
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=local-dev-secret-change-in-production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
    volumes:
      - ./apps/api:/app/apps/api
      - /app/apps/api/node_modules
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  workers:
    build:
      context: .
      dockerfile: Dockerfile.workers
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clippingai
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GCS_BUCKET_NAME=${GCS_BUCKET_NAME}
    volumes:
      - ./apps/workers:/app/apps/workers
      - /app/apps/workers/node_modules
      - /app/node_modules
    depends_on:
      - postgres
      - redis
      - api

volumes:
  postgres_data:
```

**Dockerfile.web:**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/web"]
```

**Dockerfile.api:**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/package*.json ./

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
```

**Dockerfile.workers:**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/workers/package*.json ./apps/workers/
COPY packages/database/package*.json ./packages/database/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/workers

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/package*.json ./

CMD ["node", "apps/workers/dist/index.js"]
```

### CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [main]

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: us-central1

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Push API Image
        run: |
          gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/clippingai-api:$GITHUB_SHA apps/api

      - name: Deploy API to Cloud Run
        run: |
          gcloud run deploy clippingai-api \
            --image gcr.io/$GCP_PROJECT_ID/clippingai-api:$GITHUB_SHA \
            --region $GCP_REGION \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars DATABASE_URL=${{ secrets.DATABASE_URL }} \
            --set-env-vars JWT_SECRET=${{ secrets.JWT_SECRET }}

  deploy-web:
    runs-on: ubuntu-latest
    needs: deploy-api
    steps:
      # Similar steps for frontend deployment
      # ...

  deploy-workers:
    runs-on: ubuntu-latest
    needs: deploy-api
    steps:
      # Similar steps for workers deployment
      # ...

  migrate-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - name: Run Prisma Migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### Environment Variables

**.env.example:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/clippingai
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...

# Google Cloud
GCS_BUCKET_NAME=clippingai-images
GCP_PROJECT_ID=clippingai-123456

# App Config
NEXT_PUBLIC_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Email
FROM_EMAIL=noreply@clipping.ai
FROM_NAME=Clipping.AI

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_COMMENTS=false
ENABLE_MANUAL_GENERATION=false
```

---

## Development Phases

### Phase 1: MVP Foundation (Weeks 1-4)

**Week 1: Project Setup & Infrastructure**
- [ ] Initialize monorepo (npm workspaces or Turborepo)
- [ ] Set up Docker Compose for local development
- [ ] Configure Neon database, create Prisma schema
- [ ] Run initial migrations
- [ ] Set up Express.js API with TypeScript
- [ ] Set up Next.js frontend with App Router
- [ ] Configure Redis for caching
- [ ] Set up basic CI/CD pipeline (GitHub Actions)

**Week 2: Authentication & User Management**
- [ ] Implement user registration (signup endpoint)
- [ ] Implement login with JWT
- [ ] Password hashing with bcrypt
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] User profile endpoints (GET/PATCH /api/user/me)
- [ ] Frontend: Login/signup pages
- [ ] Frontend: Dashboard shell (auth-protected)

**Week 3: Report Configuration**
- [ ] Implement prompt optimizer (Claude API integration)
- [ ] Create report config endpoints (CRUD)
- [ ] Report recipient management
- [ ] Frontend: Report configuration wizard
- [ ] Frontend: Dashboard with report cards
- [ ] Free tier limit enforcement (2 reports max)

**Week 4: Report Generation - Part 1**
- [ ] Set up BullMQ job queue
- [ ] Implement report generator worker (Claude + web search)
- [ ] Integrate OpenAI image generation (GPT-Image-1/DALL-E)
- [ ] Store generated reports in database
- [ ] Upload images to Google Cloud Storage
- [ ] Basic error handling and retries

### Phase 2: Core Features (Weeks 5-8)

**Week 5: Report Generation - Part 2**
- [ ] Scheduled generation (cron job setup)
- [ ] Calculate next_generation_at timestamps
- [ ] Job monitoring and logging
- [ ] Frontend: Generation status indicators
- [ ] Frontend: View generated report (basic)

**Week 6: Email System**
- [ ] Integrate Resend API
- [ ] Create email templates (React Email)
- [ ] Report delivery email
- [ ] Transactional emails (welcome, verification, reset)
- [ ] Unsubscribe flow
- [ ] Email logging in database

**Week 7: Report Viewer**
- [ ] Build ChatGPT Pulse-style report page
- [ ] Headline cards with images
- [ ] Expandable article view
- [ ] Mobile-responsive design
- [ ] TL;DR section

**Week 8: Sharing & Multi-Recipient**
- [ ] Public report sharing (toggle + slug generation)
- [ ] Share modal with copy link
- [ ] Social share buttons (Twitter, LinkedIn)
- [ ] Individual headline sharing
- [ ] Multi-recipient email delivery
- [ ] Recipient-specific unsubscribe tokens

### Phase 3: Polish & Launch Prep (Weeks 9-10)

**Week 9: Landing Page & Onboarding**
- [ ] Design and build landing page
- [ ] Pre-auth trial flow (email → config → signup → first report)
- [ ] Onboarding wizard for new users
- [ ] Empty states and help text
- [ ] SEO optimization (meta tags, sitemap)

**Week 10: Testing, Security, & Deployment**
- [ ] Unit tests for critical paths (auth, report generation)
- [ ] Integration tests for API endpoints
- [ ] Security audit (input validation, rate limiting)
- [ ] Performance optimization (caching, query optimization)
- [ ] Deploy to Google Cloud (staging environment)
- [ ] End-to-end testing on staging
- [ ] Production deployment
- [ ] Monitoring setup (logs, alerts)

### Phase 4: Post-MVP Enhancements (Weeks 11+)

**P1 Features:**
- [ ] Comments system (reports + headlines)
- [ ] Full report history (searchable, filterable)
- [ ] Manual "Generate Now" button
- [ ] PDF export
- [ ] Advanced analytics (report views, email opens)
- [ ] User account settings (change email, timezone)
- [ ] Dark mode
- [ ] Pause/resume reports
- [ ] Duplicate report feature

**P2 Features:**
- [ ] Payment integration (Stripe)
- [ ] Paid tier with increased limits
- [ ] API access for paid users
- [ ] Custom branding (white-label reports)
- [ ] Team collaboration features
- [ ] Slack/Discord integrations
- [ ] Mobile app (React Native)

---

## Success Metrics

### Key Performance Indicators (KPIs)

**User Acquisition:**
- Target: 1,000 signups in first month
- Target: 30% trial-to-signup conversion
- Source tracking (where users come from)

**Engagement:**
- Target: 70% of users create at least 1 report
- Target: Average 2 active reports per user
- Target: 80% of reports successfully generated and delivered
- Target: 70%+ email open rate
- Target: 20%+ click-through rate (email to report)

**Retention:**
- Target: 60% week-1 retention
- Target: 40% month-1 retention
- Target: 10% month-3 retention

**Sharing:**
- Target: 40% of users share at least 1 report publicly
- Target: 100 public report views in first month

**Technical:**
- Target: 99% uptime
- Target: < 2s average page load time
- Target: < 5% email bounce rate
- Target: < 2% generation failure rate

### Analytics Implementation

**Tools:**
- Google Analytics 4 (frontend tracking)
- Mixpanel or Amplitude (product analytics, P1)
- PostHog (open-source alternative, P1)

**Events to Track:**
- User signup
- Email verification
- Report created
- Report generated (success/failure)
- Email sent
- Email opened (optional)
- Report viewed
- Report shared
- Link clicked
- User upgraded (when monetization added)

**Dashboards:**
- User acquisition funnel
- Report generation health (success rate, avg duration)
- Email deliverability (sent, bounced, opened, clicked)
- Engagement metrics (active users, reports per user)

---

## Risks & Mitigations

### Technical Risks

**Risk 1: AI API Costs**
- **Description:** Claude API + OpenAI image generation costs could spiral with scale
- **Likelihood:** High
- **Impact:** High
- **Mitigation:**
  - Set usage alerts on Anthropic/OpenAI accounts
  - Implement caching for similar prompts (dedup)
  - Monitor cost per report, set max budget
  - Consider cheaper alternatives (e.g., Stability AI for images)
  - Free tier limits prevent runaway costs initially

**Risk 2: Email Deliverability**
- **Description:** Emails land in spam, hurting engagement
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Configure SPF, DKIM, DMARC properly
  - Use authenticated domain with Resend
  - Warm up sending domain gradually
  - Monitor bounce/complaint rates
  - A/B test email copy to avoid spam triggers
  - Include unsubscribe link prominently

**Risk 3: Report Generation Failures**
- **Description:** Web search or AI generation fails, leaving users with no report
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Retry logic (3 attempts with exponential backoff)
  - Fallback: Send email with apology + explanation
  - Monitor failure rate, alert if > 5%
  - Provide manual "regenerate" option (P1)
  - Test with various prompts to ensure robustness

**Risk 4: Database Performance**
- **Description:** Slow queries as data grows
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Proper indexing from day 1
  - Use EXPLAIN to analyze slow queries
  - Archive old reports (90-day retention for free tier)
  - Implement read replicas if needed (P1)
  - Monitor query performance with Neon dashboard

### Business Risks

**Risk 5: Low User Adoption**
- **Description:** Users don't see value, don't create reports
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Strong onboarding (show value immediately)
  - Pre-auth trial to demonstrate quality
  - Clear examples and use cases on landing page
  - Iterate based on user feedback
  - Simple, intuitive UX

**Risk 6: Monetization Challenges**
- **Description:** Users unwilling to pay, free tier costs unsustainable
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Validate willingness to pay early (surveys, pre-orders)
  - Generous free tier to build trust, then upsell
  - Pricing research (competitor analysis)
  - Focus on business users (higher willingness to pay)
  - Consider usage-based pricing (per report)

**Risk 7: Competition**
- **Description:** Larger players (Google, OpenAI) release similar features
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Focus on niche (competitive intelligence for business)
  - Build strong brand and community
  - Superior UX and customization
  - Fast iteration based on feedback
  - Consider pivot or partnerships if needed

### Operational Risks

**Risk 8: Scaling Challenges**
- **Description:** Infrastructure can't handle user growth
- **Likelihood:** Low (good problem to have)
- **Impact:** High
- **Mitigation:**
  - Serverless architecture (Cloud Run auto-scales)
  - Horizontal scaling for workers
  - Load testing before major launches
  - Gradual rollout (beta → public)
  - Upgrade database plan as needed

**Risk 9: Security Breach**
- **Description:** User data compromised
- **Likelihood:** Low
- **Impact:** Very High
- **Mitigation:**
  - Follow security best practices (see Security section)
  - Regular dependency updates (npm audit)
  - Penetration testing (P1)
  - Incident response plan
  - Liability insurance (P1)

---

## Open Questions

1. **Image Generation:** If GPT-Image-1 is not yet available or too expensive, should we use DALL-E 3, Stability AI, or fallback to stock images (Unsplash API)?

2. **Natural Language Processing:** Should we add sentiment analysis or other NLP features to highlight positive/negative news about competitors?

3. **Personalization:** Should reports learn from user interactions (e.g., clicked headlines) to improve future reports? (ML/recommendation system)

4. **White-Label:** Should we allow paid users to remove "Clipping.AI" branding from reports? (Custom domain for reports?)

5. **API Access:** Should we offer a programmatic API for enterprise users to integrate reports into their own tools? (e.g., Slack bots, internal dashboards)

6. **Multi-Language:** Should we support non-English reports? (Translation API integration)

7. **Data Retention:** Beyond 90 days (free) / 1 year (paid), should we allow longer retention for higher tiers?

8. **Collaboration:** Should teams be able to collaborate on report configurations? (Shared workspaces, permissions)

9. **Advanced Filters:** Should users be able to filter sources (include/exclude domains) in the configuration?

10. **Feedback Loop:** Should users be able to rate headlines or provide feedback to improve future reports? (Thumbs up/down)

---

## Conclusion

This PRD outlines a comprehensive plan for building **Clipping.AI**, an AI-powered competitive intelligence platform. The MVP focuses on core value: automated, beautiful, shareable reports delivered via email. With a clear technical architecture, phased development plan, and attention to security and UX, we're positioned to launch a compelling product.

**Next Steps:**
1. Review and approve this PRD
2. Finalize design mockups (Figma)
3. Set up development environment (Docker, Neon, GCP)
4. Begin Phase 1: MVP Foundation

**Timeline:** 10 weeks to MVP launch, with post-MVP enhancements ongoing.

---

**Document Status:** Ready for Review
**Approvals Needed:** Product Lead, Engineering Lead, Design Lead

---

_This document is a living artifact and will be updated as requirements evolve._
