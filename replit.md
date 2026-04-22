# RedRose Online Care — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Educational platform for Bangladeshi students (SSC, HSC, Admission, BCS). Full-stack: React frontend + Express API + YouTube video player + AI tutor.

## Artifacts
- `artifacts/yt-player` — Student-facing React/Vite web app (preview path: `/`)
- `artifacts/api-server` — Express 5 API server (preview path: `/api`)
- `artifacts/mockup-sandbox` — Component preview sandbox (preview path: `/__mockup`)

## Key Features
- **Sequential Playlist**: VideoPage loads all videos in the same subject/chapter, shows a side playlist panel, auto-advances to next video on end, and shows prev/next navigation
- **Mobile Data Access**: IpGate detects OS/browser/device type/connection type (mobile data vs WiFi), includes info in admin inbox; admin can approve IP or create a personal login account for mobile data users via "Quick Create Account"
- **Content Request System**: Students can click "Request" on any subject in Courses to send an access request to admin inbox; admin sees content requests distinctly labeled
- **Admin Inbox**: Shows device info badges (OS, browser, device type, connection type), "📶 MOBILE DATA" badge, "📚 CONTENT REQUEST" badge, and inline Quick Create Account form per message
- **IP-based + Universal Access**: WiFi users can be approved by IP; mobile data users get a username/password account that works from any network
- **YouTube Playlist Import**: Bulk import preserves original playlist order for sequential playback
- **AI Tutor**: Gemini-powered chatbot with LaTeX/math support, Bangla+English, streaming responses
- **Gamification**: XP, levels, badges, streaks, leaderboard

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
