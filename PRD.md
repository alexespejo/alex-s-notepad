# Alex's Notepad (Notion Clone) — PRD

**Project Name:** Alex's Notepad (Notion Clone)  
**Target Platform:** Web (Locally Runnable, Cloud Deployable)  
**Primary Architecture:** Next.js App Router + Supabase + BlockNote  
**Package Manager:** **Yarn**

## 1. Project Overview
The objective of this project is to build a robust, block-based note-taking application inspired by Notion. The application will serve as a personal knowledge base, allowing users to create nested pages, format text using a block-centric editor, seamlessly handle media, and organize notes via a hierarchical directory tree.

## 2. Tech Stack Definition
- **Framework:** Next.js (App Router, strictly using `app/` directory).
- **Styling:** Tailwind CSS (utility-first, inline classes).
- **UI Components:** shadcn/ui & Lucide React icons.
- **Database & Auth:** Supabase (PostgreSQL for hierarchical pages, Auth for user management).
- **File Storage:** Supabase Storage (S3-compatible for image copy/paste).
- **Editor Core:** BlockNote (`@blocknote/react` and `@blocknote/core`) to bypass complex TipTap/ProseMirror boilerplate and achieve an immediate Notion-like block experience.
- **Language:** TypeScript (strict typing required for all DB calls and component props).
- **Package Manager:** Yarn (use `yarn add`, `yarn dev`, `yarn build`).

## 3. Core Functional Requirements

### 3.1. The Block Editor (BlockNote Integration)
- **Block-Based Architecture:** Every paragraph, heading, image, or table is a discrete block.
- **Slash Menu & Markdown:** Support for standard Markdown shortcuts (e.g., `#` for H1) and a `/` command menu to insert blocks.
- **Drag & Drop:** A handle (`⋮⋮`) allows users to drag blocks up or down.
- **Rich Content:**
  - Code Snippets with syntax highlighting.
  - LaTeX / Math Equations.
  - Tables with basic row/column management.

### 3.2. File Management & Media
- **Clipboard Integration:** Intercept `Ctrl+V` / `Cmd+V` for images. Auto-upload the blob to Supabase Storage, retrieve the public URL, and insert an Image Block automatically.

### 3.3. Organization & Navigation
- **Hierarchical Data Model:** Pages can be parents or children of other pages infinitely.
- **Sidebar Directory Tree:**
  - Visual representation of the page hierarchy (expandable/collapsible folders).
  - "Add new page" button at the root level and on hover at the folder level.
- **Internal Linking:** Ability to type `@` or `[[` to search for and link to other pages within the workspace.

## 4. Database Schema Strategy (Supabase)
To keep V1 performant and development fast, we will store the document structure as a single JSONB object rather than separate rows for every single block.

- **`pages` table:**
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to auth.users)
  - `parent_id` (UUID, Foreign Key to `pages.id` - nullable, allows nesting)
  - `title` (Text)
  - `icon` (Text/Emoji)
  - `cover_image` (Text URL)
  - `content` (JSONB) - *This will store the entire BlockNote document state.*
  - `created_at` & `updated_at` (Timestamps with time zone)

## 5. Cursor Working Protocol & System Instructions
We will build this iteratively. Do not attempt to build the entire app in one go. Treat each phase in Section 6 as a distinct, hard stop.

1. **Phase-by-Phase Execution:** Propose the files you will create/edit for the current phase. **STOP and wait for user approval** before writing the code.
2. **Component Isolation:** Keep React components small. Separate `Sidebar`, `Editor`, and `TopNav` into distinct files within a `components/` directory.
3. **Client vs. Server:** Use React Server Components (RSC) where possible. Only use `"use client"` when necessary (e.g., the BlockNote editor, interactive UI state).
4. **Database First:** Whenever a phase requires backend work, write the Supabase client logic and TypeScript types *first* before wiring them to the UI.

## 6. Implementation Phases

### Phase 1: Foundation & App Shell
1. Initialize Next.js app with Tailwind CSS and shadcn/ui.
2. Setup Supabase project, initialize the client, and implement basic Supabase Auth (GitHub OAuth).
3. Build the basic App shell layout (Sidebar layout on the left, main content area on the right).
4. **STOP for review.**

### Phase 2: Hierarchical Sidebar & Page Routing
1. Create the `pages` table in Supabase via SQL schema.
2. Implement CRUD operations for pages (Create, Read, Update Title, Delete).
3. Build the recursive Sidebar tree component to display nested pages.
4. Set up Next.js dynamic routing (e.g. `/app/[pageId]`) to load specific pages.
5. **STOP for review.**

### Phase 3: The Editor MVP
1. Install and integrate `@blocknote/react` and `@blocknote/core`.
2. Wrap the editor in a `"use client"` component.
3. Load the `content` JSONB from Supabase into the editor on page load.
4. Setup debounced auto-saving logic: whenever the editor state changes, push the updated JSONB back to the `pages.content` column in Supabase.
5. **STOP for review.**

### Phase 4: Rich Media & Advanced Blocks
1. Setup Supabase Storage buckets for `images`.
2. Hook into BlockNote's upload file mechanism. Implement image copy/paste and drag-and-drop upload handlers to push to Supabase Storage and return the public URL.
3. Enable Code Block, LaTeX, and Table extensions within the BlockNote configuration.
4. **STOP for review.**

### Phase 5: Polish & Interconnectivity
1. Build the internal page-linking feature (querying the `pages` table to populate a mention menu).
2. Refine UI/UX (fonts, spacing, hover states, ensuring dark mode works perfectly across the app and editor).
3. Final bug fixes and deployment prep.

