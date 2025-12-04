# Feature: Stream History View

## Overview
Added a dedicated page to view the complete history of all reports generated for a specific stream/report config. Users can now see all past reports organized by date in a card-based timeline layout.

## Components Created

### StreamHistory Page
**Location:** `apps/web/src/pages/StreamHistory.tsx`

Features:
- Displays all reports for a specific stream
- Groups reports by month for easy navigation
- Shows report preview cards with:
  - Cover image (if available)
  - Generated date/time
  - Report summary excerpt
  - Number of articles analyzed
- Click on any report card to view the full report
- Sticky month headers for easy scrolling
- Empty state when no reports exist
- Loading state while fetching data
- Error handling with back navigation

### Styles
**Location:** `apps/web/src/styles/stream-history.css`

Styling includes:
- Responsive card grid layout (auto-fill based on screen size)
- Hover effects on report cards
- Timeline-style month grouping
- Sticky headers for navigation
- Consistent with existing design system
- Mobile-responsive

## Dashboard Updates

Updated `apps/web/src/pages/Dashboard.tsx` to add navigation to stream history:

1. **Clickable Stream Info**
   - Stream title and description are now clickable
   - Click navigates to `/streams/:id` to view history

2. **Clickable Stats**
   - The stats section (report count, recipients, latest date) is clickable
   - Also navigates to stream history

3. **New "View All" Button**
   - Primary action button showing "View All (X)" with report count
   - Only shown when stream has generated reports
   - Uses History icon for visual clarity

4. **Reorganized Action Buttons**
   - "View All" - Primary button to see all reports
   - "Latest Report" - Secondary button to jump to most recent
   - "Generate" - Trigger new report generation
   - "Settings" - Icon-only button for stream settings

## Routes

Added new route in `apps/web/src/App.tsx`:
```tsx
<Route path="/streams/:id" element={<StreamHistory />} />
```

## User Flow

1. User clicks on a stream card/title/stats on dashboard
2. Navigates to `/streams/:id`
3. Sees all reports grouped by month
4. Can click any report card to view full report
5. Can navigate back to dashboard via header button

## Benefits

- **Better Discoverability**: Users can now easily browse all past reports
- **Timeline View**: Chronological organization helps track trends over time
- **Visual Preview**: Card-based layout with images provides quick context
- **Improved UX**: Clear navigation and intuitive interactions
- **Scalability**: Handles many reports gracefully with month grouping

## Files Modified

- `apps/web/src/pages/StreamHistory.tsx` (new)
- `apps/web/src/styles/stream-history.css` (new)
- `apps/web/src/pages/Dashboard.tsx` (updated)
- `apps/web/src/App.tsx` (updated route)

## Testing

To verify the feature:
1. Login to the app
2. Go to dashboard
3. Click on a stream title or "View All" button
4. Should see history of all reports in timeline format
5. Click on any report card to view it
6. Navigate back to dashboard using header button
