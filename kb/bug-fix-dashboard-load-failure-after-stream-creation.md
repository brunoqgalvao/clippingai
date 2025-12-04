# Bug Fix: Dashboard Load Failure After Stream Creation

## Problem
After creating a new stream via `/streams/create`, the dashboard would fail to load data and show "failed to load dashboard data" error. The user would lose access to all their streams.

## Root Cause
The Dashboard component (`apps/web/src/pages/Dashboard.tsx`) was:
1. Not using the AuthContext
2. Making duplicate API calls to `getCurrentUser()`
3. Creating a race condition with the AuthContext's user loading
4. Failing silently when API calls failed during navigation

The flow was:
1. User creates stream → navigates to `/dashboard`
2. Dashboard mounts and calls `getCurrentUser()`
3. AuthContext is also loading user separately
4. Race condition or API failure causes "failed to load dashboard data"
5. Streams never get populated

## Solution
Refactored Dashboard and CreateStream pages to use AuthContext:

1. **Dashboard.tsx** (apps/web/src/pages/Dashboard.tsx)
   - Removed local `user` state
   - Used `useAuth()` hook to get user from AuthContext
   - Removed duplicate `getCurrentUser()` call
   - Added proper auth loading checks
   - Updated logout to use AuthContext method

2. **CreateStream.tsx** (apps/web/src/pages/CreateStream.tsx)
   - Added auth check with redirect to login if not authenticated
   - Ensures user is loaded before allowing stream creation

## Benefits
- Eliminates duplicate API calls
- No race conditions
- Consistent auth state across app
- Proper loading states
- Better error handling

## Files Changed
- `apps/web/src/pages/Dashboard.tsx`
- `apps/web/src/pages/CreateStream.tsx`

## Testing
To verify the fix:
1. Login to the app
2. Go to "Create Stream"
3. Fill out the form and create a stream
4. Should navigate to dashboard and show the new stream
5. No "failed to load dashboard data" error
