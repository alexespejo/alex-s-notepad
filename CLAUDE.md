# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev        # Start dev server (localhost:3000)
yarn build      # Production build
yarn lint       # Run ESLint
```

No test suite is configured.

## Architecture

**Alex's Notepad** is a Notion-like block editor: hierarchical pages with a block-based editor, auto-save, and drag-and-drop reordering.

**Stack:** Next.js (App Router) + TypeScript + BlockNote + Supabase (PostgreSQL + Storage) + Zustand + Tailwind CSS 4

### Route Groups

- `src/app/(auth)/` — login/signup pages (no sidebar)
- `src/app/(app)/` — protected app shell with sidebar; `app/[pageId]/page.tsx` is the main editor route
- `src/middleware.ts` — auth guard; refreshes Supabase session on every request

### Key Components

- **`Sidebar.tsx`** — loads the full page tree from Supabase, renders `PageTree`, handles new-page creation
- **`PageTree.tsx`** — recursive tree with `@dnd-kit` drag-and-drop and inline rename
- **`PageEditorImpl.tsx`** — the BlockNote editor instance (`"use client"`); handles auto-save (debounced 900ms), image uploads to Supabase Storage, and reconciles subpage link text when titles change
- **`PageEditor.tsx`** — thin RSC wrapper that fetches the page server-side and passes it to `PageEditorImpl`
- **`EditablePageTitle.tsx`** — large inline title above the editor; syncs through the Zustand store

### Data Layer (`src/lib/`)

- **`pages.ts`** — all page CRUD (browser Supabase client): `listPagesTree`, `getPageById`, `createPage`, `updatePageContent`, `movePage`, `deletePage`, `searchPagesForLink`
- **`pages-server.ts`** — same queries but using the server Supabase client (for RSC/SSR)
- **`page-titles-store.ts`** — Zustand store that caches `titlesByPageId`; the editor watches this to keep `[[subpage]]` link text in sync
- **`storage.ts`** — Supabase Storage helpers for image upload and signed URL generation
- **`subpage-link-sync.ts`** — logic to reconcile subpage link blocks in the editor when a page is renamed
- **`blockNoteSchema.ts`** — BlockNote schema config (custom equation block registered here)

### Database Schema

Single `pages` table in Supabase PostgreSQL:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → auth.users |
| `parent_id` | UUID | FK → pages.id, null for root pages |
| `title` | text | unique among siblings (enforced in app) |
| `content` | JSONB | BlockNote block array |
| `position` | int | sibling sort order |
| `icon`, `cover_image` | text | nullable |

SQL migrations are in `supabase/`. RLS policies restrict rows to `auth.users.id = user_id`.

Images are stored in Supabase Storage bucket `images` at path `{user_id}/pages/{pageId}/{uuid}.{ext}`.

### Important Notes

- **`reactStrictMode: false`** in `next.config.ts` — required for BlockNote compatibility; don't re-enable
- Use `@/*` path alias for all imports (resolves to `src/*`)
- BlockNote's custom equation block is in `src/components/blocks/EquationBlock.tsx` and registered in `blockNoteSchema.ts`
- Title uniqueness among siblings is enforced in `lib/page-titles.ts` (`resolveAndUpdatePageTitle`) — not a DB constraint
- Supabase clients: use `src/lib/supabase/client.ts` in client components, `src/lib/supabase/server.ts` in server components/route handlers
