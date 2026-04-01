# Phase 1 Test Plan (Foundation & App Shell)

## Scope
- Next.js app boots locally.
- App shell renders (Sidebar + main content).
- (Auth/OAuth removed for now.)

## Prerequisites
- Node + Yarn installed.

## Local smoke tests (commands)
Run from project root (`/Users/alex/code/alex-notepad`):

```bash
yarn install
yarn dev
```

Expected:
- Dev server starts without errors.
- Visiting `http://localhost:3000` loads the app (or redirects to `/login`).

## Auth & routing tests (manual)
### 1) Home renders
- **Step**: Open `http://localhost:3000/`.
- **Expected**: The app shell renders (Sidebar on left, main area on right).

## Failure triage checklist
- **Dev server crash**: If you see `uv_interface_addresses` errors, try Node `v22.13+` or `v20.19+` via nvm and rerun `yarn dev`.

## Phase 1 exit criteria (hard stop)
- All manual tests above pass once.
- No console errors in the browser after a refresh.

