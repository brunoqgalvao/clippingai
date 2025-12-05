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

### 🔴 High Priority

---

### 🟡 Medium Priority

#### 3. Logo Selection UX Improvement
**Status**: Enhancement
**Priority**: Medium
**Description**: "Choose a different logo" option could be more intuitive on the company confirmation page.

**Current Behavior**:
- Separate "Choose a different logo" option below company info
- Could be confusing with company confirmation flow

**Proposed Solution**:
- Add edit pencil icon on or next to the logo
- Tooltip: "Choose a different logo"
- Clicking pencil shows logo options in a modal/dropdown
- Keeps confirmation flow clean and focused

**Technical Notes**:
- Location: `apps/web/src/pages/Onboarding.tsx` (Step 2: "Is this your company?")
- Update company detection component

---

#### 4. "This is not my company" Alternative Input
**Status**: Enhancement
**Priority**: Medium
**Description**: When user clicks "This is not my company", provide easier alternatives besides text description.

**Current Behavior**:
- Only shows text field to describe company

**Proposed Solution**:
- Add two quick options:
  1. **"Enter a different email"** - Try detection with new email
  2. **"Enter company website"** - Directly provide company URL
- Keep description field as fallback option

**Benefits**:
- Faster recovery from failed detection
- Better UX for common cases
- Less friction in onboarding

**Technical Notes**:
- Location: `apps/web/src/pages/Onboarding.tsx`
- Update manual company input flow
- May need API changes in `apps/api/src/routes/onboarding.ts`

---

#### 5. Missing Back Button on Intelligence Selection
**Status**: Bug
**Priority**: Medium
**Description**: "What intelligence do you need" page lacks a back button like other onboarding pages.

**Current Behavior**:
- User cannot go back after confirming company
- Inconsistent with other steps that have back navigation

**Expected Behavior**:
- Add "← Back" button consistent with other steps
- Allow user to revise company selection if needed

**Technical Notes**:
- Location: `apps/web/src/pages/Onboarding.tsx` (Step 3)
- Ensure state preservation when navigating back

---

#### 6. Selected Chip Visibility Issue
**Status**: Bug
**Priority**: Medium
**Description**: Selected suggestion chips on "Let's personalize your first report" page are unreadable.

**Current Behavior**:
- Selected chips: black background + black text = invisible text
- Impossible to see which chips are selected

**Expected Behavior**:
- High contrast between background and text when selected
- Clear visual distinction between selected/unselected states

**Proposed Solution**:
- Selected: Use accent color background (e.g., `#0066cc`) with white text
- Unselected: Light background with dark text

**Technical Notes**:
- Location: `apps/web/src/pages/Onboarding.tsx` (Step 4: "Let's personalize")
- Update chip component styles in `apps/web/src/styles/onboarding.css`

---

### 🟢 Low Priority

#### 7. Password Confirmation Field Missing
**Status**: Enhancement
**Priority**: Low
**Description**: Account creation form lacks password confirmation field (UX best practice).

**Current Behavior**:
- Single password field during signup
- Risk of typos without confirmation

**Expected Behavior**:
- Add "Confirm Password" field
- Validate passwords match before submission
- Show error if passwords don't match

**Technical Notes**:
- Location: `apps/web/src/pages/Onboarding.tsx` (Step 7: signup modal)
- Add validation in signup form
- Update API call if needed

---

#### 8. Create Stream Navigation Button Styling
**Status**: Bug
**Priority**: Low
**Description**: Back/Cancel button on "Create Stream" page has broken positioning and inconsistent styling.

**Current Behavior**:
- Back arrow/Cancel button misaligned
- Inconsistent color/size/formatting with "Create Stream" button

**Expected Behavior**:
- Both buttons aligned horizontally
- Consistent styling (color, size, typography)
- Professional button group appearance

**Technical Notes**:
- Location: `apps/web/src/pages/CreateStream.tsx`
- Update button styling in `apps/web/src/styles/dashboard.css`
- Ensure button group uses flexbox with proper alignment

---

## Summary

**Total Issues**: 9
- ✅ Completed: 2
- 🔴 High Priority: 0
- 🟡 Medium Priority: 5
- 🟢 Low Priority: 2

**Recent Completions**:
- ✅ Report Storage and Association (PR #2 - 2025-12-05)
- ✅ Broken Page After Account Creation (PR #2 - 2025-12-05)

**Next Priority**: Medium priority UX improvements (logo selection, back buttons, chip visibility)

---

*Last Updated*: 2025-12-05
