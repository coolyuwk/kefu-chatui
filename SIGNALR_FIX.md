# SignalR Connection Fix

## Problem
The application was experiencing duplicate SignalR connections during startup, causing "AbortError: The connection was stopped during negotiation" errors. This occurred because React.StrictMode in development mode intentionally double-invokes effects to help detect side effects.

## Root Cause
- The `useSignalR` hook in `src/utils/signalRService.ts` was creating a new SignalR connection every time the effect ran
- React.StrictMode causes effects to run multiple times in development
- Multiple connections were created simultaneously, leading to connection conflicts and abortion errors

## Solution
Modified the `useSignalR` hook to prevent duplicate connections:

1. **Added Connection State Tracking**: Introduced `isConnectingRef` to track when a connection is being established
2. **Added Existence Check**: Added a check to prevent creating new connections if one already exists or is being created
3. **Enhanced Cleanup**: Improved the cleanup function to properly reset connection state
4. **Fixed Build Warnings**: Resolved ESLint warnings in App.tsx

## Key Changes

### signalRService.ts
- Added `isConnectingRef` flag to prevent duplicate connections
- Added early return if connection exists or is being created
- Enhanced cleanup to reset all connection states properly
- Added detailed logging for better debugging

### App.tsx
- Fixed unused variable warning by using the theme variable
- Moved URLSearchParams creation inside the callback to fix dependency array warning

## Testing
- Added comprehensive unit tests to verify no duplicate connections occur
- Tests simulate React.StrictMode behavior and verify single connection creation
- All tests pass and build completes successfully

## Result
- SignalR connections no longer duplicate during application startup
- "AbortError: The connection was stopped during negotiation" errors are eliminated
- Application works correctly in both development (StrictMode) and production modes
- Build warnings are resolved