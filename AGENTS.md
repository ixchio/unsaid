# unsaid — Repository Guide

## What It Is
Anonymous ephemeral expression platform for LPU campus. Posts start with 60min life, extended by reactions (+10m) and replies (+5m). Posts surviving 24h+ become "Campus Legends".

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **DB**: PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Real-time**: Ably (WebSocket)
- **Security**: Arcjet (rate limiting + bot detection)
- **Identity**: Cookie-based anonymous device IDs + FingerprintJS
- **Styling**: Tailwind CSS 4 + custom CSS vars (dark mode via `data-theme` attribute)
- **Animation**: Framer Motion
- **Deployment**: Vercel with daily cleanup cron

## Build & Run
```bash
npm install
npx prisma generate    # generates client to src/generated/prisma
npx prisma db push     # push schema to DB
npm run dev            # dev server
npm run build          # production build
```

## Key Architecture Decisions
- **Dark mode**: Uses `html[data-theme]` attribute + CSS custom properties in `@layer base` (required for Tailwind v4 compatibility)
- **Auth**: No traditional auth — anonymous device IDs via middleware cookie
- **Reactions**: 6 types (felt, dead, rage, pain, fire, real) — one per user per post
- **Pagination**: Cursor-based using post IDs
- **Real-time**: Ably channels per post for reactions + replies, global feed channel for new posts
- **Offline**: Posts queued in localStorage, flushed on reconnect
- **PWA**: Service worker in `public/sw.js`, manifest in `public/manifest.json`

## Important Files
- `prisma/schema.prisma` — data models (User, Post, FeltThis, Reply)
- `src/lib/constants.ts` — all magic numbers, reaction types, locations
- `src/lib/darkmode.tsx` — DarkModeProvider context
- `src/lib/auth.ts` — device-based anonymous auth
- `src/lib/ably.ts` — Ably client (browser singleton + server REST)
- `src/app/globals.css` — ALL styles (dark mode vars in `@layer base`)

## Env Variables
- `DATABASE_URL` — PostgreSQL connection string
- `DIRECT_URL` — Direct DB connection for migrations
- `NEXT_PUBLIC_ABLY_KEY` — Ably subscribe key (client)
- `ABLY_API_KEY` — Ably root key (server publish)
- `ARCJET_KEY` — Arcjet rate limiting
- `CLEANUP_SECRET` — Cron cleanup auth

## Known Patterns
- All API routes use `request as any` cast for Arcjet typing compatibility
- Tailwind v4 `@theme` block only for fonts; color vars go in `@layer base`
- Static pages (settings, verify) use client components; feed/compose use server+client split
