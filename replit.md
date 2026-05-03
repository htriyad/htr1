# RedRose Online Care — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Educational platform for Bangladeshi students (SSC, HSC, Admission, BCS). Full-stack: React frontend + Express API + YouTube video player + AI tutor.

## Artifacts
- `artifacts/yt-player` — Student-facing React/Vite web app (preview path: `/`)
- `artifacts/api-server` — Express 5 API server (preview path: `/api`)
- `artifacts/mockup-sandbox` — Component preview sandbox (preview path: `/__mockup`)

## Key Features

### Security
- **Bot/Flood Auto-Block**: Tracks request rate per IP. >60 requests/min → auto-blocked, logged as security alert in admin inbox
- **VPN/Proxy Detection**: Uses ip-api.com (proxy+hosting fields). Blocked users see a full-page VPN error. Results cached 24h per IP. Fails open on timeout
- **Ban System**: Users and IPs can be banned independently. Banned = instant 403 on every request; banned users are instantly logged out
- **One-Device Restriction**: First login fingerprints the device (hash of userAgent|screen|language|cores|timezone). Different device = "deviceLocked" error. Admin can reset device lock per-user
- **Rate Limit**: Max 2 access requests per IP per week (7 days sliding window) via POST /message
- **DevTools Detection**: Client-side, uses window dimension diff (>160px) + Image.id trick. Shows red fullscreen overlay, sends security alert to admin once per session
- **Security Alert Endpoint**: POST /api/security/alert receives alertType (devtools/extension/view-source), username, details → stored in msgs.json as type "security-alert"
- **Localhost Bypass**: 127.0.0.1 / ::1 always passes all security checks (dev environment)

### Access Control
- **IP-based Access**: WiFi users approved by IP. Admin can approve + set a real name. IP ban blocks them permanently
- **Universal User Accounts**: Students log in from any network with username+password. One account = one device (device-fingerprint locked)
- **Universal Access Flag**: Admin can toggle universalAccess per user (stored in users.json)
- **Name Sync**: POST /admin/msgs/:id/approve-ip approves the IP AND syncs the student's full name from the access request

### Revolutionary Study Tools (NEW)
- **Flashcard System** (`/flashcards`): Anki/Quizlet-style spaced repetition. Admin creates decks+cards (front/back/hint). Students study with 3D flip animation, Easy/Hard/Skip buttons, progress tracked in localStorage, completion screen with mastery %. Admin manages via Flashcards tab in `/admin`
- **Pomodoro Study Timer** (`/study-timer`): Circular SVG ring countdown, 25/5/15 min modes, 4-session cycles, session dots, Bangla+English motivational quotes, audio ding, stats saved in localStorage
- **Daily MCQ Challenge**: Dashboard widget shows one quiz question per day (date-seeded from quiz bank). Students pick answer inline, see ✅/❌ feedback + solution. State persisted per day in localStorage
- **Global Smart Search**: Search bar on dashboard searches videos, solve sheets, discussions via `/api/search?q=`. Debounced 300ms, live dropdown results grouped by type, navigate directly to results

### Content
- **Sequential Playlist**: VideoPage auto-advances, side playlist panel, prev/next navigation
- **Playlist Import**: POST /admin/playlist/fetch-import auto-saves all videos to DB in one step. POST /admin/playlist/fetch → POST /admin/videos/bulk for two-step workflow
- **Subjects & Chapters**: Full CRUD; videos assigned to subjects/chapters
- **Content Request**: Students request subject access, admin sees in Inbox

### Q&A / Ask a Teacher (/ask)
- **Hub page**: Two options — AI Teacher (Gemini) or Human Teacher
- **AI Teacher**: Embedded full AI chat (Gemini streaming via proxy → API server). Supports LaTeX, chemistry, Bangla+English
- **Human Teacher**: Students ask questions with text, voice recording (MediaRecorder API → base64 WebM), or image attachment. Questions stored in doubts.json
- **My Questions list**: Students see their own submitted questions + teacher replies
- **Teacher reply**: Admin replies with text or voice recording, student sees reply in their question list

### Admin Panel
- **Inbox**: Filterable by All / Access / Content / 🚨 Security. Security alerts shown in red. fullName prominently displayed per access request
- **Users Tab**: Ban/Unban toggle, Universal Access toggle, Reset Device button, device-lock badge, banned red borders
- **IPs Tab**: Name column, Ban IP toggle, banned badge, name field when manually adding IPs
- **Quick Create Account**: From inbox message, auto-fills note with student's fullName
- **Doubts Tab**: Full Q&A moderation — expand questions, see voice/image, reply with text + voice recording, reopen or delete

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: JSON files in `artifacts/api-server/data/` (ips.json, users.json, msgs.json, vids.json, subjects.json, quizzes.json, notifs.json, dashmenu.json)

## Admin Credentials
- Username: `htr`
- Password: `htr0`
- URL: `/admin`

## Data File Notes
- `ips.json`: `{ [ip]: { approvedAt, name?, banned? } }`
- `users.json`: `{ id, username, password, note?, banned?, universalAccess?, firstLoginDevice?, firstLoginAt? }`
- `msgs.json`: `{ id, ip, fullName?, message, timestamp, status, type (access-request|content-request|security-alert), alertType?, deviceInfo? }`
- `doubts.json`: `{ id, ip, username?, fullName?, question, audioData?, imageData?, timestamp, status (open|answered), reply?: { text?, audioData?, repliedAt } }`

## In-Memory Stores (API Server)
- `ADMIN_SESSIONS` — Set of active admin tokens
- `USER_SESSIONS` — Map of token → username
- `RATE_WINDOW` — Map of ip → request timestamps[] (last 60s)
- `BOT_BLOCKED` — Set of auto-blocked IPs (flood/bot)
- `VPN_CACHE` — Map of ip → { isVpn, checkedAt } (24h TTL)
