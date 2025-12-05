# Product Backlog

## Onboarding Experience Improvements

### ✅ Completed

#### 1. Report Storage and Association
**Status**: ✅ DONE
**Priority**: High
**Description**: Generated reports during onboarding are not properly stored and associated with users.

**Solution Implemented**:
- Implemented anonymous user conversion pattern
- Added UserStatus enum (ANONYMOUS → ACTIVE)
- Store real user email from the start (not anonymous@domain)
- Convert anonymous user to active user during signup instead of creating duplicate
- All report associations preserved through conversion
- Added conversion tracking (convertedAt timestamp)

**Technical Changes**:
- Updated `packages/database/prisma/schema.prisma` with UserStatus enum
- Modified `apps/api/src/services/auth.ts` for user conversion logic
- Updated `apps/api/src/services/reportStorage.ts` to use real emails
- Fixed `apps/web/src/pages/Onboarding.tsx` to update existing config

**PR**: #2 - Merged 2025-12-05

---

#### 2. Broken Page After Account Creation
**Status**: ✅ DONE
**Priority**: High
**Description**: After creating account (password + email), page shows broken state and asks user to return to dashboard.

**Solution Implemented**:
- Fixed login to use AuthContext instead of direct API call
- Added race condition handling with delayed navigation
- Fixed Dashboard redirect logic to check localStorage token
- Updated AuthResponse to include all required fields
- Improved loading state management

**Technical Changes**:
- Fixed `apps/web/src/pages/Login.tsx` to use useAuth hook
- Updated `apps/web/src/pages/Dashboard.tsx` redirect logic
- Enhanced auth state synchronization
- Added debug logging for troubleshooting

**PR**: #2 - Merged 2025-12-05

---

#### 3. Logo Selection UX Improvement
**Status**: ✅ DONE
**Priority**: Medium
**Description**: "Choose a different logo" option improved on the company confirmation page.

**Solution Implemented**:
- Added edit pencil icon positioned on top-right of logo
- Icon toggles logo options grid on click
- Removed redundant "Choose a different logo" button below
- Cleaner, more intuitive UX with tooltip support

**Technical Changes**:
- Updated `apps/web/src/pages/Onboarding.tsx` (Step 2: company verification)
- Added `.logo-with-edit`, `.logo-edit-btn` styles in `apps/web/src/styles/onboarding.css`
- Circular edit button with hover animation

**Completed**: 2025-12-05

---

#### 4. "This is not my company" Alternative Input
**Status**: ✅ DONE
**Priority**: Medium
**Description**: Added quick alternative options when company detection fails.

**Solution Implemented**:
- Added three input mode options with toggle buttons:
  1. **"Try different email"** - Re-runs detection with new email
  2. **"Enter website"** - Directly provide company URL
  3. **"Describe company"** - Original text description fallback
- Dynamic input field changes based on selected mode
- Email mode returns to verification step after re-detection

**Technical Changes**:
- Added `manualInputType` state in `apps/web/src/pages/Onboarding.tsx`
- Updated `handleManualSubmit` to handle different input types
- Added `.manual-input-type-selector`, `.input-type-btn` styles
- Conditional rendering for email input, URL input, or textarea

**Completed**: 2025-12-05

---

#### 5. Missing Back Button on Intelligence Selection
**Status**: ✅ DONE
**Priority**: Medium
**Description**: Added back button to intelligence selection page for consistency.

**Solution Implemented**:
- Added "Go back" button to focus step (intelligence selection)
- Consistent with other onboarding steps
- Returns user to company verification step
- Preserves state when navigating back

**Technical Changes**:
- Updated `apps/web/src/pages/Onboarding.tsx` (Step 3: focus)
- Added `.btn-text` back button with `onClick={() => setStep('verify')}`

**Completed**: 2025-12-05

---

#### 6. Selected Chip Visibility Issue
**Status**: ✅ DONE
**Priority**: Medium
**Description**: Fixed unreadable selected chips with proper contrast.

**Problem**:
- Selected chips had dark background (`var(--text-primary)` = #0B1120) with dark text (`var(--black)` = #020617)
- Resulted in invisible text - critical UX bug

**Solution Implemented**:
- Changed selected state to use accent blue (`var(--accent-primary)` = #2563EB) background
- White text (`var(--white)`) for high contrast
- Added font-weight: 600 for emphasis
- Applied fix to ALL selection patterns:
  - Competitor suggestion chips
  - Intelligence card checkboxes
  - Suggestion card checkboxes

**Technical Changes**:
- Updated `.competitor-chip.suggestion.selected` in `apps/web/src/styles/onboarding.css`
- Updated `.intelligence-card.selected .card-checkbox`
- Updated `.suggestion-card.selected .card-checkbox`
- All now use blue background with white text/icon

**Completed**: 2025-12-05

---

### 🔴 High Priority

---

### 🟡 Medium Priority

---

### 🟢 Low Priority

#### 7. Password Confirmation Field Missing
**Status**: ✅ DONE
**Priority**: Low
**Description**: Added password confirmation field to account creation form.

**Solution Implemented**:
- Added "Confirm Password" field after password field
- Validation checks passwords match before submission
- Shows error message if passwords don't match
- Submit button disabled until both password fields are filled

**Technical Changes**:
- Added `confirmPassword` state in `apps/web/src/pages/Onboarding.tsx:83`
- Updated `handleSignup` validation to check password match (line 205-207)
- Added confirm password input field (line 895-908)
- Updated submit button disabled condition (line 933)

**Completed**: 2025-12-05

---

#### 8. Create Stream Navigation Button Styling
**Status**: ✅ DONE
**Priority**: Low
**Description**: Fixed button alignment and styling consistency on Create Stream page.

**Solution Implemented**:
- Created `.btn-secondary` CSS class for consistent styling
- Both buttons now properly aligned horizontally with flexbox
- Consistent typography, padding, and spacing
- Added hover effects for better interactivity
- Clean, professional button group appearance

**Technical Changes**:
- Added `.btn-secondary` class in `apps/web/src/styles/login.css:206-232`
- Simplified `apps/web/src/pages/CreateStream.tsx:233-263` to use CSS classes
- Removed excessive inline styles
- Button group uses flex with 1:2 ratio (Cancel:Create)

**Completed**: 2025-12-05

---

## Summary

**Total Issues**: 8
- ✅ Completed: 8
- 🔴 High Priority: 0
- 🟡 Medium Priority: 0
- 🟢 Low Priority: 0

**🎉 All Backlog Items Completed!**

**Completed Items**:
1. ✅ Report Storage and Association (PR #2 - 2025-12-05)
2. ✅ Broken Page After Account Creation (PR #2 - 2025-12-05)
3. ✅ Logo Selection UX Improvement (2025-12-05)
4. ✅ "This is not my company" Alternative Input (2025-12-05)
5. ✅ Missing Back Button on Intelligence Selection (2025-12-05)
6. ✅ Selected Chip Visibility Issue (2025-12-05)
7. ✅ Password Confirmation Field Missing (2025-12-05)
8. ✅ Create Stream Navigation Button Styling (2025-12-05)

**Status**: Round 1 complete! New issues discovered during testing.

---

## 🔴 New High Priority Issues (Round 2)

#### 9. Edit Pencil Hover Background Color
**Status**: Bug
**Priority**: High
**Description**: Edit pencil on "Is this your company" page turns black background on hover, same issue as chips had.

**Solution Needed**:
- Standardize hover states to use accent blue (`var(--accent-primary)`)
- Document color standards to prevent recurrence

**Location**: `apps/web/src/styles/onboarding.css` (`.logo-edit-btn:hover`)

---

#### 10. Edit Pencil Tooltip Delay Too Long
**Status**: Bug
**Priority**: High
**Description**: Tooltip on edit pencil takes 2-3 seconds to appear, should be 1 second or less.

**Location**: `apps/web/src/pages/Onboarding.tsx:427-430`

---

#### 11. Empty Logo Blocks Showing Temporarily
**Status**: Bug
**Priority**: High
**Description**: When clicking edit pencil, shows 4 logo blocks that collapse to 2 when empty ones disappear.

**Expected Behavior**: Only show available logos from the start, no collapsing animation.

**Location**: `apps/web/src/pages/Onboarding.tsx:456-471`

---

#### 12. Black Box Below Logo Selection
**Status**: Bug
**Priority**: High
**Description**: Black box appears below one logo option, likely text with black background (invisible text issue again).

**Location**: Logo badge styling in `apps/web/src/styles/onboarding.css`

---

#### 13. Company Name Shows Long Description
**Status**: Bug
**Priority**: High
**Description**: Company badge shows full description instead of just name (e.g., "100 milhões de clientes. Nenhum deles na fila | Nubank" instead of "Nubank").

**Affects**:
- "Is this your company?" page
- "What intelligence do you need?" page
- "Let's personalize your first report" page

**Location**: `apps/web/src/pages/Onboarding.tsx` (company badge displays)

---

#### 14. Manual Input Text Improvements
**Status**: Enhancement
**Priority**: Medium
**Description**: Improve clarity of manual input option descriptions.

**Changes Needed**:
- "Try different email" hint: "Try a corporate email from your company"
- "Describe company" placeholder: Include example company name like "We're ABC Company, a B2B SaaS..."

**Location**: `apps/web/src/pages/Onboarding.tsx:550-582`

---

#### 15. Generation Time Text Inaccurate
**Status**: Bug
**Priority**: Medium
**Description**: Shows "20-30 seconds" but actually takes longer.

**Change**: Update to "30-60 seconds" for accuracy.

**Location**: `apps/web/src/pages/Onboarding.tsx:847-849`

---

#### 16. Password Visibility Toggle Missing
**Status**: Enhancement
**Priority**: Medium
**Description**: Signup form lacks password visibility toggle (eye icon).

**Location**: `apps/web/src/pages/Onboarding.tsx` (password fields)

---

#### 17. Null Report Redirect After Signup
**Status**: Critical Bug
**Priority**: Critical
**Description**: After account creation, redirects to `/report/null` instead of dashboard.

**Steps to Reproduce**:
1. Complete onboarding and generate report
2. Create account on "You're all set" page
3. Click "View Your Report"
4. Redirects to `/report/null` - "Report not found"
5. "Return to Onboarding" button causes infinite loading

**Expected Behavior**: After signup, redirect directly to dashboard.

**Location**: `apps/web/src/pages/Onboarding.tsx` (handleSignup, complete step)

---

#### 18. Edit Stream Page Not Loading
**Status**: Critical Bug
**Priority**: Critical
**Description**: Edit stream settings page doesn't load (404 or blank page).

**URL Pattern**: `/streams/{id}/settings`

**Location**: Route configuration and/or page component missing

---

## 🎉 Round 2 Complete!

### ✅ Completed Issues (#9-19 - All Fixed!)

**Summary**: All issues from testing feedback have been resolved.

**9. Edit Pencil Hover Background Color**
- ✅ DONE - Changed to accent blue
- **File**: `apps/web/src/styles/onboarding.css:328-332`

**10. Edit Pencil Tooltip Delay**
- ✅ DONE - Added instant CSS tooltip (0.15s transition)
- **Files**: `apps/web/src/styles/onboarding.css:307-326`

**11. Empty Logo Blocks Collapsing**
- ✅ DONE - Filter failed logos before rendering instead of hiding after
- Uses `failedLogos` state to track and exclude from render
- **Files**: `apps/web/src/pages/Onboarding.tsx:97,122-140,513-516`

**12. DETECTED Badge Below Logo**
- ✅ DONE - Removed the badge entirely
- **File**: `apps/web/src/pages/Onboarding.tsx:510-517`

**13. Company Name Shows Long Description**
- ✅ DONE - Added `getCleanCompanyName()` helper to extract company name
- Applied to all company displays including title
- **Files**: `apps/web/src/pages/Onboarding.tsx:99-107,486,645,699`

**14. Manual Input Text Improvements**
- ✅ DONE - Updated descriptions
- **Files**: `apps/web/src/pages/Onboarding.tsx:580-582,605`

**15. Generation Time Text**
- ✅ DONE - Updated to "30-60 seconds"
- **File**: `apps/web/src/pages/Onboarding.tsx:877-879`

**16. Password Visibility Toggle**
- ✅ DONE - Added Eye/EyeOff icons
- **Files**: `apps/web/src/pages/Onboarding.tsx:3,18-19,86-87,911-982`

**17. Null Report Redirect After Signup** (CRITICAL)
- ✅ DONE - Auto-login after signup and navigate directly to dashboard
- Removed intermediate "You're all set" page
- **Files**: `apps/web/src/pages/Onboarding.tsx:3,69,244-245,281,388-390`

**18. Edit Stream Page Not Loading** (CRITICAL)
- ✅ DONE - Created StreamSettings page
- Added route and updated navigation
- **Files**:
  - `apps/web/src/pages/StreamSettings.tsx` (new file)
  - `apps/web/src/App.tsx:12,26`
  - `apps/web/src/pages/Dashboard.tsx:340-348`

**19. Competitors Section Always Visible**
- ✅ DONE - Now always shows on "Let's personalize" page
- Removed conditional rendering based on intelligence types
- Valuable for all users regardless of report type selection
- **Files**: `apps/web/src/pages/Onboarding.tsx:716-803`

**Additional Fixes: Company Name Display**
- ✅ DONE - Created `getCleanCompanyName()` utility function
- Applied across all dashboard pages to extract clean company names
- Fixes display in:
  - Dashboard stream titles and descriptions
  - Stream history page
  - Stream settings page
  - New stream creation in onboarding
- **Files**:
  - `apps/web/src/lib/utils.ts` (new utility file)
  - `apps/web/src/pages/Dashboard.tsx:7,398,402`
  - `apps/web/src/pages/StreamHistory.tsx:7,353,354`
  - `apps/web/src/pages/Onboarding.tsx:264-276`

---

## 📊 Final Summary

**Total Issues Resolved**: 19
- Round 1: 8 issues ✅
- Round 2: 11 issues ✅

**All Critical Bugs Fixed**:
- ✅ Auto-login after signup working
- ✅ StreamSettings page created and functional
- ✅ Company names display correctly everywhere
- ✅ Competitors section always visible
- ✅ All color contrast issues resolved
- ✅ Logo selection UX improved
- ✅ Password visibility toggles added
- ✅ Text accuracy improved throughout

**Status**: Production ready! 🚀

---

*Last Updated*: 2025-12-05
